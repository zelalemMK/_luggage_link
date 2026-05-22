package services

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/zelalemmk/luggage-link/backend/internal/database"
	"github.com/zelalemmk/luggage-link/backend/internal/models"
)

// NotificationService handles creation and (stub) delivery of notifications.
type NotificationService struct{}

// NewNotificationService creates a new NotificationService.
func NewNotificationService() *NotificationService {
	return &NotificationService{}
}

// SendStatusUpdate creates a status_update notification for the given shipment
// and marks it as sent immediately (stub delivery — no real email/SMS transport).
func (s *NotificationService) SendStatusUpdate(userID uuid.UUID, shipment *models.Shipment, status models.ShipmentStatus) error {
	message := fmt.Sprintf(
		"Your shipment %s status has been updated to: %s. %s",
		shipment.TrackingNumber,
		status,
		models.DefaultDescriptionForStatus(status),
	)
	return s.createAndSend(userID, &shipment.ID, models.ChannelStatusUpdate, message)
}

// SendConfirmation creates a confirmation notification when a shipment is first created.
func (s *NotificationService) SendConfirmation(userID uuid.UUID, shipment *models.Shipment) error {
	message := fmt.Sprintf(
		"Your shipment has been booked! Tracking number: %s. "+
			"Number of bags: %d. Estimated price: $%.2f. "+
			"We will contact you shortly to schedule pickup.",
		shipment.TrackingNumber,
		shipment.NumBags,
		shipment.EstimatedPrice,
	)
	return s.createAndSend(userID, &shipment.ID, models.ChannelConfirmation, message)
}

// SendReminder creates a reminder notification for an upcoming pickup.
func (s *NotificationService) SendReminder(userID uuid.UUID, shipment *models.Shipment) error {
	message := fmt.Sprintf(
		"Reminder: Your luggage pickup for shipment %s is scheduled soon. "+
			"Please have your %d bag(s) ready.",
		shipment.TrackingNumber,
		shipment.NumBags,
	)
	return s.createAndSend(userID, &shipment.ID, models.ChannelReminder, message)
}

// createAndSend inserts a Notification record and marks it sent (stub transport).
func (s *NotificationService) createAndSend(
	userID uuid.UUID,
	shipmentID *uuid.UUID,
	channel models.NotificationChannel,
	message string,
) error {
	now := time.Now()
	n := &models.Notification{
		UserID:     userID,
		ShipmentID: shipmentID,
		Type:       models.NotificationEmail, // default to email; extend as needed
		Channel:    channel,
		Message:    message,
		SentAt:     &now,
	}

	if err := database.DB.Create(n).Error; err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	// Stub: in production, dispatch to an email/SMS provider here.
	log.Printf("[notification] channel=%s user=%s message=%q\n", channel, userID, message)
	return nil
}
