package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	DatabaseURL   string
	JWTSecret     string
	Port          string
	CORSOrigin    string
	AdminEmail    string
	AdminPassword string
}

// Load reads the .env file (if present) and populates a Config struct.
// Missing required values will cause a fatal log.
func Load() *Config {
	// Attempt to load .env — not fatal if absent (e.g. in production containers).
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading configuration from environment")
	}

	cfg := &Config{
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		Port:          getEnv("PORT", "8080"),
		CORSOrigin:    getEnv("CORS_ORIGIN", "*"),
		AdminEmail:    getEnv("ADMIN_EMAIL", "admin@luggagelink.com"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),
	}

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	return cfg
}

// getEnv returns the value of the named environment variable, or fallback if unset.
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
