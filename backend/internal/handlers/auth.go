package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/zelalemmk/luggage-link/backend/internal/auth"
	"github.com/zelalemmk/luggage-link/backend/internal/database"
	"github.com/zelalemmk/luggage-link/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler holds dependencies for authentication endpoints.
type AuthHandler struct {
	jwtSecret string
}

// NewAuthHandler creates an AuthHandler with the given JWT secret.
func NewAuthHandler(jwtSecret string) *AuthHandler {
	return &AuthHandler{jwtSecret: jwtSecret}
}

// ─── Request / Response types ─────────────────────────────────────────────────

type registerRequest struct {
	Email     string `json:"email"      binding:"required,email"`
	Password  string `json:"password"   binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name"  binding:"required"`
	Phone     string `json:"phone"`
}

type loginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type loginResponse struct {
	Token string          `json:"token"`
	User  models.SafeUser `json:"user"`
}

type updateProfileRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password"     binding:"required,min=8"`
}

type forgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// Register creates a new customer account.
// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Normalise email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check for duplicate email
	var existing models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        req.Phone,
		Role:         models.RoleCustomer,
	}

	if err := database.DB.Create(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	token, err := auth.GenerateToken(user, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, loginResponse{Token: token, User: user.ToSafe()})
}

// Login authenticates a user and returns a JWT token.
// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token, err := auth.GenerateToken(&user, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, loginResponse{Token: token, User: user.ToSafe()})
}

// Me returns the currently authenticated user's profile.
// GET /api/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user.ToSafe())
}

// UpdateMe updates the currently authenticated user's profile fields.
// PUT /api/auth/me
func (h *AuthHandler) UpdateMe(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Only update fields that were provided
	updates := map[string]interface{}{}
	if req.FirstName != "" {
		updates["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		updates["last_name"] = req.LastName
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	// Reload updated record
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reload user"})
		return
	}

	c.JSON(http.StatusOK, user.ToSafe())
}

// ChangePassword updates the current user's password after verifying the old one.
// PUT /api/auth/me/password
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	if err := database.DB.Model(&user).Update("password_hash", string(hash)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated successfully"})
}

// ForgotPassword accepts an email and responds the same way whether or not the
// account exists (prevents email enumeration). Real reset emails would be sent
// here via an email service.
// POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Always return the same response to prevent email enumeration.
	c.JSON(http.StatusOK, gin.H{"message": "If an account with that email exists, you'll receive reset instructions shortly."})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// getUserByID is a shared helper used by other handler packages.
func getUserByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
