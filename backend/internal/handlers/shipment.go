package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/zelalemmk/luggage-link/backend/internal/auth"
	"github.com/zelalemmk/luggage-link/backend/internal/database"
	"github.com/zelalemmk/luggage-link/backend/internal/models"
	"github.com/zelalemmk/luggage-link/backend/internal/services"
)

// ShipmentHandler handles customer-facing shipment endpoints.
type ShipmentHandler struct {
	notifier *services.NotificationService
}

// NewShipmentHandler creates a ShipmentHandler with the given notification service.
func NewShipmentHandler(notifier *services.NotificationService) *ShipmentHandler {
	return &ShipmentHandler{notifier: notifier}
}

// ─── Request types ────────────────────────────────────────────────────────────

type addressInput struct {
	Street string `json:"street"`
	City   string `json:"city"`
	State  string `json:"state"`
	Zip    string `json:"zip"`
}

// formatAddressInput converts an address object to a single-line string for storage.
func formatAddressInput(a addressInput) string {
	s := a.Street
	if a.City != "" {
		s += ", " + a.City
	}
	if a.State != "" {
		s += ", " + a.State
	}
	if a.Zip != "" {
		s += " " + a.Zip
	}
	return s
}

type createShipmentRequest struct {
	PickupAddress   addressInput `json:"pickup_address"    binding:"required"`
	DeliveryAddress addressInput `json:"delivery_address"`
	NumBags         int          `json:"num_bags"          binding:"required,min=1"`
	TotalWeightLbs  float64      `json:"total_weight_lbs"  binding:"required,min=0"`
	Notes           string       `json:"notes"`
	Express         bool         `json:"express"`
	PickupScheduled *time.Time   `json:"pickup_scheduled_at"`
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// List returns a paginated list of shipments for the authenticated user.
// GET /api/shipments
func (h *ShipmentHandler) List(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	page, limit := parsePagination(c)

	var shipments []models.Shipment
	var total int64

	query := database.DB.Model(&models.Shipment{}).Where("user_id = ?", userID)
	query.Count(&total)
	if err := query.Preload("TrackingEvents").
		Order("created_at DESC").
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

// Create books a new shipment for the authenticated user.
// POST /api/shipments
func (h *ShipmentHandler) Create(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var req createShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pickupAddress := formatAddressInput(req.PickupAddress)
	deliveryAddress := formatAddressInput(req.DeliveryAddress)
	if deliveryAddress == "" {
		deliveryAddress = "Addis Ababa, Ethiopia"
	}

	_, _, _, estimatedPrice := calculatePrice(req.NumBags, req.TotalWeightLbs, req.Express)

	trackingNumber := generateTrackingNumber()

	shipment := &models.Shipment{
		TrackingNumber:  trackingNumber,
		UserID:          userID,
		Status:          models.StatusPending,
		PickupAddress:   pickupAddress,
		DeliveryAddress: deliveryAddress,
		NumBags:         req.NumBags,
		TotalWeightLbs:  req.TotalWeightLbs,
		EstimatedPrice:  estimatedPrice,
		Notes:           req.Notes,
		PickupScheduled: req.PickupScheduled,
	}

	if err := database.DB.Create(shipment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create shipment"})
		return
	}

	// Create the initial PENDING tracking event.
	createTrackingEvent(shipment.ID, models.StatusPending, "United States", "")

	// Send confirmation notification (non-fatal on failure).
	_ = h.notifier.SendConfirmation(userID, shipment)

	c.JSON(http.StatusCreated, shipment)
}

// Get returns a single shipment (with tracking history) owned by the auth user.
// GET /api/shipments/:id
func (h *ShipmentHandler) Get(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	shipmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment ID"})
		return
	}

	var shipment models.Shipment
	if err := database.DB.
		Preload("TrackingEvents").
		Where("id = ? AND user_id = ?", shipmentID, userID).
		First(&shipment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	c.JSON(http.StatusOK, shipment)
}

// Track allows public tracking by tracking number (no auth required).
// GET /api/shipments/track/:tracking_number
func (h *ShipmentHandler) Track(c *gin.Context) {
	trackingNumber := c.Param("tracking_number")
	if trackingNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tracking number is required"})
		return
	}

	var shipment models.Shipment
	if err := database.DB.
		Preload("TrackingEvents").
		Where("tracking_number = ?", trackingNumber).
		First(&shipment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	// For public tracking, omit user personal details — return a safe subset.
	c.JSON(http.StatusOK, gin.H{
		"tracking_number":    shipment.TrackingNumber,
		"status":             shipment.Status,
		"delivery_address":   shipment.DeliveryAddress,
		"num_bags":           shipment.NumBags,
		"pickup_scheduled_at": shipment.PickupScheduled,
		"created_at":         shipment.CreatedAt,
		"updated_at":         shipment.UpdatedAt,
		"tracking_events":    shipment.TrackingEvents,
	})
}

// Cancel cancels a shipment that is still in PENDING status.
// DELETE /api/shipments/:id
func (h *ShipmentHandler) Cancel(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	shipmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment ID"})
		return
	}

	var shipment models.Shipment
	if err := database.DB.
		Where("id = ? AND user_id = ?", shipmentID, userID).
		First(&shipment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	if shipment.Status != models.StatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only PENDING shipments can be cancelled"})
		return
	}

	if err := database.DB.Model(&shipment).Update("status", models.StatusCancelled).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cancel shipment"})
		return
	}

	createTrackingEvent(shipment.ID, models.StatusCancelled, "", "")
	_ = h.notifier.SendStatusUpdate(userID, &shipment, models.StatusCancelled)

	c.JSON(http.StatusOK, gin.H{"message": "shipment cancelled successfully"})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// generateTrackingNumber creates a unique tracking number in the format
// "LL-<YEAR>-<6 random uppercase alphanumeric chars>".
func generateTrackingNumber() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	year := time.Now().Year()
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return fmt.Sprintf("LL-%d-%s", year, string(b))
}

// createTrackingEvent inserts a TrackingEvent row for the given shipment.
// Errors are logged but not propagated to keep the main flow clean.
func createTrackingEvent(shipmentID uuid.UUID, status models.ShipmentStatus, location, description string) {
	if description == "" {
		description = models.DefaultDescriptionForStatus(status)
	}
	event := &models.TrackingEvent{
		ShipmentID:  shipmentID,
		Status:      status,
		Location:    location,
		Description: description,
	}
	_ = database.DB.Create(event).Error
}

// parsePagination extracts and validates page/limit query params.
func parsePagination(c *gin.Context) (page, limit int) {
	page = 1
	limit = 20

	if p, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil && l > 0 {
		if l > 100 {
			l = 100
		}
		limit = l
	}
	return page, limit
}

// totalPages returns the number of pages for the given total record count and limit.
func totalPages(total int64, limit int) int64 {
	if limit <= 0 {
		return 0
	}
	pages := total / int64(limit)
	if total%int64(limit) != 0 {
		pages++
	}
	return pages
}
