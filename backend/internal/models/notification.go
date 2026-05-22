package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NotificationType describes the delivery mechanism used for a notification.
type NotificationType string

const (
	NotificationEmail NotificationType = "email"
	NotificationSMS   NotificationType = "sms"
)

// NotificationChannel describes the purpose / trigger of a notification.
type NotificationChannel string

const (
	ChannelStatusUpdate  NotificationChannel = "status_update"
	ChannelConfirmation  NotificationChannel = "confirmation"
	ChannelReminder      NotificationChannel = "reminder"
)

// Notification records an outbound message sent (or to be sent) to a user.
type Notification struct {
	ID         uuid.UUID           `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID           `gorm:"type:uuid;not null;index" json:"user_id"`
	ShipmentID *uuid.UUID          `gorm:"type:uuid;index" json:"shipment_id,omitempty"`
	Type       NotificationType    `gorm:"type:varchar(10);not null" json:"type"`
	Channel    NotificationChannel `gorm:"type:varchar(20);not null" json:"channel"`
	Message    string              `gorm:"type:text;not null" json:"message"`
	SentAt     *time.Time          `json:"sent_at,omitempty"`
	CreatedAt  time.Time           `json:"created_at"`
	DeletedAt  gorm.DeletedAt      `gorm:"index" json:"-"`

	// Associations
	User     User      `gorm:"foreignKey:UserID" json:"-"`
	Shipment *Shipment `gorm:"foreignKey:ShipmentID" json:"-"`
}

// BeforeCreate sets a new UUID on Notification if one has not been assigned.
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}
