package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/zelalemmk/luggage-link/backend/internal/database"
	"github.com/zelalemmk/luggage-link/backend/internal/models"
	"github.com/zelalemmk/luggage-link/backend/internal/services"
)

// AdminHandler handles admin-only endpoints.
type AdminHandler struct {
	notifier *services.NotificationService
}

// NewAdminHandler creates an AdminHandler.
func NewAdminHandler(notifier *services.NotificationService) *AdminHandler {
	return &AdminHandler{notifier: notifier}
}

// ─── Request types ────────────────────────────────────────────────────────────

type updateShipmentRequest struct {
	Status          *models.ShipmentStatus `json:"status"`
	ActualPrice     *float64               `json:"actual_price_usd"`
	EstimatedPrice  *float64               `json:"estimated_price_usd"`
	Notes           *string                `json:"notes"`
	PickupScheduled *time.Time             `json:"pickup_scheduled_at"`
	DeliveryAddress *string                `json:"delivery_address"`
}

type addTrackingEventRequest struct {
	Status      models.ShipmentStatus `json:"status"      binding:"required"`
	Location    string                `json:"location"`
	Description string                `json:"description"`
}

// ─── Shipment admin endpoints ─────────────────────────────────────────────────

// ListShipments lists all shipments with optional filters.
// GET /api/admin/shipments
func (h *AdminHandler) ListShipments(c *gin.Context) {
	page, limit := parsePagination(c)

	query := database.DB.Model(&models.Shipment{}).Preload("User")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by date range
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse(time.RFC3339, from); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse(time.RFC3339, to); err == nil {
			query = query.Where("created_at <= ?", t)
		}
	}

	// Search by name or tracking number
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where(
			"tracking_number ILIKE ? OR "+
				"EXISTS (SELECT 1 FROM users u WHERE u.id = shipments.user_id AND (u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.email ILIKE ?))",
			like, like, like, like,
		)
	}

	var total int64
	query.Count(&total)

	var shipments []models.Shipment
	if err := query.Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&shipments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch shipments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     shipments,
		"total":    total,
		"page":     page,
		"per_page": limit,
	})
}

// GetShipment returns full details of any shipment including tracking history.
// GET /api/admin/shipments/:id
func (h *AdminHandler) GetShipment(c *gin.Context) {
	shipmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment ID"})
		return
	}

	var shipment models.Shipment
	if err := database.DB.
		Preload("User").
		Preload("TrackingEvents").
		First(&shipment, "id = ?", shipmentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	c.JSON(http.StatusOK, shipment)
}

// UpdateShipment updates mutable fields on any shipment.
// PUT /api/admin/shipments/:id
func (h *AdminHandler) UpdateShipment(c *gin.Context) {
	shipmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment ID"})
		return
	}

	var req updateShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var shipment models.Shipment
	if err := database.DB.First(&shipment, "id = ?", shipmentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	updates := map[string]interface{}{}
	statusChanged := false
	var newStatus models.ShipmentStatus

	if req.Status != nil {
		if !models.IsValidStatus(*req.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status value"})
			return
		}
		if *req.Status != shipment.Status {
			updates["status"] = *req.Status
			statusChanged = true
			newStatus = *req.Status
		}
	}
	if req.ActualPrice != nil {
		updates["actual_price_usd"] = *req.ActualPrice
	}
	if req.EstimatedPrice != nil {
		updates["estimated_price_usd"] = *req.EstimatedPrice
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}
	if req.PickupScheduled != nil {
		updates["pickup_scheduled"] = *req.PickupScheduled
	}
	if req.DeliveryAddress != nil {
		updates["delivery_address"] = *req.DeliveryAddress
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := database.DB.Model(&shipment).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update shipment"})
		return
	}

	// Auto-create a tracking event and send a notification when status changes.
	if statusChanged {
		createTrackingEvent(shipment.ID, newStatus, "", "")
		_ = h.notifier.SendStatusUpdate(shipment.UserID, &shipment, newStatus)
	}

	// Reload with associations.
	if err := database.DB.
		Preload("User").
		Preload("TrackingEvents").
		First(&shipment, "id = ?", shipmentID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reload shipment"})
		return
	}

	c.JSON(http.StatusOK, shipment)
}

// AddTrackingEvent manually appends a tracking event to a shipment.
// POST /api/admin/shipments/:id/tracking-event
func (h *AdminHandler) AddTrackingEvent(c *gin.Context) {
	shipmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment ID"})
		return
	}

	var req addTrackingEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !models.IsValidStatus(req.Status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status value"})
		return
	}

	// Verify the shipment exists.
	var shipment models.Shipment
	if err := database.DB.First(&shipment, "id = ?", shipmentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	description := req.Description
	if description == "" {
		description = models.DefaultDescriptionForStatus(req.Status)
	}

	event := &models.TrackingEvent{
		ShipmentID:  shipmentID,
		Status:      req.Status,
		Location:    req.Location,
		Description: description,
	}
	if err := database.DB.Create(event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create tracking event"})
		return
	}

	c.JSON(http.StatusCreated, event)
}

// ─── User admin endpoints ─────────────────────────────────────────────────────

// ListUsers returns a paginated list of all customers.
// GET /api/admin/users
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, limit := parsePagination(c)

	query := database.DB.Model(&models.User{}).Where("role = ?", models.RoleCustomer)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?", like, like, like)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	if err := query.Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}

	safeUsers := make([]models.SafeUser, len(users))
	for i, u := range users {
		safeUsers[i] = u.ToSafe()
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     safeUsers,
		"total":    total,
		"page":     page,
		"per_page": limit,
	})
}

// GetUser returns a customer profile along with their shipment history.
// GET /api/admin/users/:id
func (h *AdminHandler) GetUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var user models.User
	if err := database.DB.
		Preload("Shipments").
		First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":      user.ToSafe(),
		"shipments": user.Shipments,
	})
}

// Stats returns dashboard statistics for the admin panel.
// GET /api/admin/stats
func (h *AdminHandler) Stats(c *gin.Context) {
	// Shipment counts by status
	type statusCount struct {
		Status models.ShipmentStatus `json:"status"`
		Count  int64                 `json:"count"`
	}
	var statusCounts []statusCount
	database.DB.Model(&models.Shipment{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Find(&statusCounts)

	// Total and by-status map
	statusMap := map[models.ShipmentStatus]int64{}
	var totalShipments int64
	for _, sc := range statusCounts {
		statusMap[sc.Status] = sc.Count
		totalShipments += sc.Count
	}

	// Revenue
	type revenueResult struct {
		TotalRevenue    float64
		EstimatedRevenue float64
	}
	var rev revenueResult
	database.DB.Model(&models.Shipment{}).
		Select("COALESCE(SUM(actual_price_usd),0) as total_revenue, COALESCE(SUM(estimated_price_usd),0) as estimated_revenue").
		Scan(&rev)

	// Total customers
	var totalCustomers int64
	database.DB.Model(&models.User{}).Where("role = ?", models.RoleCustomer).Count(&totalCustomers)

	// Recent activity: last 10 shipments
	var recentShipments []models.Shipment
	database.DB.Preload("User").Order("created_at DESC").Limit(10).Find(&recentShipments)

	// Active shipments (not delivered or cancelled)
	var activeShipments int64
	database.DB.Model(&models.Shipment{}).
		Where("status NOT IN ?", []models.ShipmentStatus{models.StatusDelivered, models.StatusCancelled}).
		Count(&activeShipments)

	c.JSON(http.StatusOK, gin.H{
		"total_shipments":   totalShipments,
		"active_shipments":  activeShipments,
		"total_customers":   totalCustomers,
		"shipments_by_status": statusMap,
		"revenue": gin.H{
			"actual_usd":    rev.TotalRevenue,
			"estimated_usd": rev.EstimatedRevenue,
		},
		"recent_activity": recentShipments,
	})
}
