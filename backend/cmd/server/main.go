package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/zelalemmk/luggage-link/backend/internal/auth"
	"github.com/zelalemmk/luggage-link/backend/internal/config"
	"github.com/zelalemmk/luggage-link/backend/internal/database"
	"github.com/zelalemmk/luggage-link/backend/internal/handlers"
	"github.com/zelalemmk/luggage-link/backend/internal/services"
)

func main() {
	// ── Configuration ────────────────────────────────────────────────────────
	cfg := config.Load()

	// ── Database ─────────────────────────────────────────────────────────────
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	if err := database.Migrate(); err != nil {
		log.Fatalf("database migration failed: %v", err)
	}
	if err := database.ClearCustomerUsers(); err != nil {
		log.Fatalf("database clear failed: %v", err)
	}
	if err := database.SeedAdmin(cfg.AdminEmail, cfg.AdminPassword); err != nil {
		log.Fatalf("admin seed failed: %v", err)
	}

	// ── Services ─────────────────────────────────────────────────────────────
	notifier := services.NewNotificationService()

	// ── Handlers ─────────────────────────────────────────────────────────────
	authHandler := handlers.NewAuthHandler(cfg.JWTSecret)
	shipmentHandler := handlers.NewShipmentHandler(notifier)
	adminHandler := handlers.NewAdminHandler(notifier)
	pricingHandler := handlers.NewPricingHandler()

	// ── Router ───────────────────────────────────────────────────────────────
	router := gin.Default()

	// CORS — allow configured origin (use "*" in dev via CORS_ORIGIN env).
	corsConfig := cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}
	// If wildcard origin is requested, disable AllowCredentials (browsers forbid it).
	if cfg.CORSOrigin == "*" {
		corsConfig.AllowAllOrigins = true
		corsConfig.AllowOrigins = nil
		corsConfig.AllowCredentials = false
	}
	router.Use(cors.New(corsConfig))

	// ── Health check ─────────────────────────────────────────────────────────
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "luggage-link-backend"})
	})

	// ── Public: Auth routes ───────────────────────────────────────────────────
	apiAuth := router.Group("/api/auth")
	{
		apiAuth.POST("/register", authHandler.Register)
		apiAuth.POST("/login", authHandler.Login)
		apiAuth.POST("/forgot-password", authHandler.ForgotPassword)

		// Protected auth routes
		authRequired := apiAuth.Group("", auth.RequireAuth(cfg.JWTSecret))
		{
			authRequired.GET("/me", authHandler.Me)
			authRequired.PUT("/me", authHandler.UpdateMe)
			authRequired.PUT("/me/password", authHandler.ChangePassword)
		}
	}

	// ── Public: Pricing routes ────────────────────────────────────────────────
	apiPricing := router.Group("/api/pricing")
	{
		apiPricing.POST("/estimate", pricingHandler.Estimate)
	}

	// ── Public: Shipment tracking (no auth) ──────────────────────────────────
	router.GET("/api/shipments/track/:tracking_number", shipmentHandler.Track)

	// ── Protected: Customer shipment routes ───────────────────────────────────
	apiShipments := router.Group("/api/shipments", auth.RequireAuth(cfg.JWTSecret))
	{
		apiShipments.GET("/", shipmentHandler.List)
		apiShipments.POST("/", shipmentHandler.Create)
		apiShipments.GET("/:id", shipmentHandler.Get)
		apiShipments.DELETE("/:id", shipmentHandler.Cancel)
	}

	// ── Protected: Admin routes ───────────────────────────────────────────────
	apiAdmin := router.Group("/api/admin",
		auth.RequireAuth(cfg.JWTSecret),
		auth.RequireAdmin(),
	)
	{
		apiAdmin.GET("/shipments", adminHandler.ListShipments)
		apiAdmin.GET("/shipments/:id", adminHandler.GetShipment)
		apiAdmin.PUT("/shipments/:id", adminHandler.UpdateShipment)
		apiAdmin.POST("/shipments/:id/tracking-event", adminHandler.AddTrackingEvent)

		apiAdmin.GET("/users", adminHandler.ListUsers)
		apiAdmin.GET("/users/:id", adminHandler.GetUser)

		apiAdmin.GET("/stats", adminHandler.Stats)
	}

	// ── Start server ─────────────────────────────────────────────────────────
	addr := ":" + cfg.Port
	log.Printf("Luggage Link backend starting on %s\n", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
