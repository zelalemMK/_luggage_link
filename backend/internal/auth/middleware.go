package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/zelalemmk/luggage-link/backend/internal/models"
)

const (
	// ContextKeyUserID is the gin context key for the authenticated user's UUID.
	ContextKeyUserID = "user_id"
	// ContextKeyEmail is the gin context key for the authenticated user's email.
	ContextKeyEmail = "email"
	// ContextKeyRole is the gin context key for the authenticated user's role.
	ContextKeyRole = "role"
)

// RequireAuth returns a Gin middleware that validates a Bearer JWT token.
// On success it sets user_id, email, and role in the request context.
// On failure it aborts with 401 Unauthorized.
func RequireAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header is required",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header must be in 'Bearer <token>' format",
			})
			return
		}

		claims, err := ValidateToken(parts[1], jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or expired token",
			})
			return
		}

		// Store claims in context for downstream handlers.
		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeyEmail, claims.Email)
		c.Set(ContextKeyRole, string(claims.Role))
		c.Next()
	}
}

// RequireAdmin returns a Gin middleware that ensures the authenticated user
// has the admin role. It must be used after RequireAuth.
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get(ContextKeyRole)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authentication required",
			})
			return
		}
		if role != string(models.RoleAdmin) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "admin access required",
			})
			return
		}
		c.Next()
	}
}

// GetUserID extracts the authenticated user's UUID from the Gin context.
// Returns uuid.Nil and false if the value is absent or cannot be cast.
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(ContextKeyUserID)
	if !exists {
		return uuid.Nil, false
	}
	id, ok := val.(uuid.UUID)
	return id, ok
}

// GetRole extracts the authenticated user's role string from the Gin context.
func GetRole(c *gin.Context) (string, bool) {
	val, exists := c.Get(ContextKeyRole)
	if !exists {
		return "", false
	}
	role, ok := val.(string)
	return role, ok
}
