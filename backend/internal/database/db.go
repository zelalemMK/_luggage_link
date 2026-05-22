package database

import (
	"fmt"
	"log"

	"github.com/zelalemmk/luggage-link/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the package-level database handle.
var DB *gorm.DB

// Connect opens a connection to PostgreSQL using the provided DSN and stores it
// in the package-level DB variable.
func Connect(dsn string) error {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	DB = db
	return nil
}

// Migrate runs GORM AutoMigrate for all application models.
func Migrate() error {
	if err := DB.AutoMigrate(
		&models.User{},
		&models.Shipment{},
		&models.TrackingEvent{},
		&models.Notification{},
	); err != nil {
		return fmt.Errorf("auto-migration failed: %w", err)
	}
	log.Println("Database migration completed successfully")
	return nil
}

// ClearCustomerUsers deletes all customer (non-admin) users and their data.
// Called on startup to give a clean slate.
func ClearCustomerUsers() error {
	if err := DB.Exec("DELETE FROM tracking_events WHERE shipment_id IN (SELECT id FROM shipments WHERE user_id IN (SELECT id FROM users WHERE role = 'customer'))").Error; err != nil {
		return fmt.Errorf("failed to clear tracking events: %w", err)
	}
	if err := DB.Exec("DELETE FROM shipments WHERE user_id IN (SELECT id FROM users WHERE role = 'customer')").Error; err != nil {
		return fmt.Errorf("failed to clear shipments: %w", err)
	}
	if err := DB.Exec("DELETE FROM users WHERE role = 'customer'").Error; err != nil {
		return fmt.Errorf("failed to clear customer users: %w", err)
	}
	log.Println("Cleared all customer users and their data")
	return nil
}
// adminEmail and adminPassword are sourced from application config.
func SeedAdmin(adminEmail, adminPassword string) error {
	var count int64
	if err := DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to query admin users: %w", err)
	}
	if count > 0 {
		log.Println("Admin user already exists, skipping seed")
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	admin := &models.User{
		Email:        adminEmail,
		PasswordHash: string(hash),
		FirstName:    "Admin",
		LastName:     "User",
		Role:         models.RoleAdmin,
	}

	if err := DB.Create(admin).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	log.Printf("Admin user seeded with email: %s\n", adminEmail)
	return nil
}
