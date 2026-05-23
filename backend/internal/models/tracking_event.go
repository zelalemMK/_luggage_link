package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TrackingEvent records a single state-change or location update for a shipment.
type TrackingEvent struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ShipmentID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"shipment_id"`
	Status      ShipmentStatus `gorm:"type:varchar(30);not null" json:"status"`
	Location    string         `json:"location"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Shipment Shipment `gorm:"foreignKey:ShipmentID" json:"-"`
}

// BeforeCreate sets a new UUID on TrackingEvent if one has not been assigned.
func (t *TrackingEvent) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

// DefaultDescriptionForStatus returns a human-readable description for a given status.
func DefaultDescriptionForStatus(status ShipmentStatus) string {
	descriptions := map[ShipmentStatus]string{
		StatusPending:          "Booking received and awaiting confirmation.",
		StatusConfirmed:        "Booking confirmed. Please drop off your bags at the departure airport.",
		StatusPickedUp:         "Bags checked in at the departure airport.",
		StatusInTransitUS:      "Bags are at the departure airport, awaiting the flight.",
		StatusCustomsClearance: "Shipment is undergoing customs clearance.",
		StatusInTransitET:      "Bags are in transit within Ethiopia.",
		StatusArrivedEthiopia:  "Bags have arrived at the destination airport in Ethiopia.",
		StatusOutForDelivery:   "Bags are ready for collection at the airport.",
		StatusDelivered:        "Bags have been collected.",
		StatusCancelled:        "Booking has been cancelled.",
	}
	if desc, ok := descriptions[status]; ok {
		return desc
	}
	return "Status updated."
}
