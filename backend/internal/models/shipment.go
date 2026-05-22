package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ShipmentStatus represents the lifecycle stage of a shipment.
type ShipmentStatus string

const (
	StatusPending          ShipmentStatus = "PENDING"
	StatusConfirmed        ShipmentStatus = "CONFIRMED"
	StatusPickedUp         ShipmentStatus = "PICKED_UP"
	StatusInTransitUS      ShipmentStatus = "IN_TRANSIT_US"
	StatusCustomsClearance ShipmentStatus = "CUSTOMS_CLEARANCE"
	StatusInTransitET      ShipmentStatus = "IN_TRANSIT_ET"
	StatusArrivedEthiopia  ShipmentStatus = "ARRIVED_ETHIOPIA"
	StatusOutForDelivery   ShipmentStatus = "OUT_FOR_DELIVERY"
	StatusDelivered        ShipmentStatus = "DELIVERED"
	StatusCancelled        ShipmentStatus = "CANCELLED"
)

// StatusOrder maps each status to its numeric position in the workflow.
// Higher numbers are later in the pipeline.
var StatusOrder = map[ShipmentStatus]int{
	StatusPending:          0,
	StatusConfirmed:        1,
	StatusPickedUp:         2,
	StatusInTransitUS:      3,
	StatusCustomsClearance: 4,
	StatusInTransitET:      5,
	StatusArrivedEthiopia:  6,
	StatusOutForDelivery:   7,
	StatusDelivered:        8,
	StatusCancelled:        9,
}

// IsValidStatus returns true if s is a recognised ShipmentStatus value.
func IsValidStatus(s ShipmentStatus) bool {
	_, ok := StatusOrder[s]
	return ok
}

// Shipment represents a luggage shipping booking made by a customer.
type Shipment struct {
	ID              uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	TrackingNumber  string         `gorm:"uniqueIndex;not null" json:"tracking_number"`
	UserID          uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Status          ShipmentStatus `gorm:"type:varchar(30);not null;default:'PENDING'" json:"status"`
	PickupAddress   string         `gorm:"not null" json:"pickup_address"`
	DeliveryAddress string         `gorm:"not null;default:'Addis Ababa, Ethiopia'" json:"delivery_address"`
	NumBags         int            `gorm:"not null" json:"num_bags"`
	TotalWeightLbs  float64        `gorm:"not null" json:"total_weight_lbs"`
	EstimatedPrice  float64        `gorm:"column:estimated_price_usd" json:"estimated_price_usd"`
	ActualPrice     float64        `gorm:"column:actual_price_usd" json:"actual_price_usd"`
	Notes           string         `gorm:"type:text" json:"notes"`
	PickupScheduled *time.Time     `json:"pickup_scheduled_at,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	User           User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TrackingEvents []TrackingEvent `gorm:"foreignKey:ShipmentID;order:created_at desc" json:"tracking_events,omitempty"`
}

// BeforeCreate sets a new UUID on Shipment if one has not been assigned yet.
func (s *Shipment) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.DeliveryAddress == "" {
		s.DeliveryAddress = "Addis Ababa, Ethiopia"
	}
	return nil
}
