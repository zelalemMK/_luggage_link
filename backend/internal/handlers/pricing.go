package handlers

import (
	"fmt"
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
)

// PricingHandler handles price estimation requests.
type PricingHandler struct{}

// NewPricingHandler creates a new PricingHandler.
func NewPricingHandler() *PricingHandler {
	return &PricingHandler{}
}

// ─── Pricing constants ────────────────────────────────────────────────────────

const (
	basePricePerBag   = 50.0 // USD per bag
	weightThresholdLb = 50.0 // lbs per bag before surcharge kicks in
	surchargePerLb    = 2.0  // USD per lb over the threshold
	expressFlatFee    = 75.0 // USD flat fee for express service
)

// ─── Request / Response types ─────────────────────────────────────────────────

type estimateRequest struct {
	NumBags        int     `json:"num_bags"         binding:"required,min=1"`
	TotalWeightLbs float64 `json:"total_weight_lbs" binding:"required,min=0"`
	Express        bool    `json:"express"`
}

type estimateResponse struct {
	NumBags         int     `json:"num_bags"`
	TotalWeightLbs  float64 `json:"total_weight_lbs"`
	BasePrice       float64 `json:"base_price_usd"`
	WeightSurcharge float64 `json:"weight_surcharge_usd"`
	ExpressFee      float64 `json:"express_fee_usd"`
	TotalPrice      float64 `json:"total_price_usd"`
	Express         bool    `json:"express"`
	Breakdown       string  `json:"breakdown"`
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// Estimate returns a price estimate for a proposed shipment.
// POST /api/pricing/estimate  (public — no auth required)
func (h *PricingHandler) Estimate(c *gin.Context) {
	var req estimateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	base, surcharge, expressFee, total := calculatePrice(req.NumBags, req.TotalWeightLbs, req.Express)

	c.JSON(http.StatusOK, estimateResponse{
		NumBags:         req.NumBags,
		TotalWeightLbs:  req.TotalWeightLbs,
		BasePrice:       base,
		WeightSurcharge: surcharge,
		ExpressFee:      expressFee,
		TotalPrice:      total,
		Express:         req.Express,
		Breakdown:       buildBreakdown(req.NumBags, req.TotalWeightLbs, base, surcharge, expressFee, total),
	})
}

// ─── Pricing logic ────────────────────────────────────────────────────────────

// calculatePrice returns the base price, weight surcharge, express fee, and
// total for a shipment with the given parameters.
//
// Rules:
//   - Base: $50 per bag
//   - Weight surcharge: $2/lb over 50 lbs on a per-bag average basis
//   - Express fee: +$75 flat
func calculatePrice(numBags int, totalWeightLbs float64, express bool) (base, surcharge, expressFee, total float64) {
	base = float64(numBags) * basePricePerBag

	avgWeightPerBag := totalWeightLbs / float64(numBags)
	overageLbsPerBag := math.Max(0, avgWeightPerBag-weightThresholdLb)
	surcharge = math.Round(float64(numBags)*overageLbsPerBag*surchargePerLb*100) / 100

	if express {
		expressFee = expressFlatFee
	}

	total = math.Round((base+surcharge+expressFee)*100) / 100
	return base, surcharge, expressFee, total
}

// buildBreakdown returns a human-readable explanation of the pricing.
func buildBreakdown(numBags int, totalWeightLbs, base, surcharge, expressFee, total float64) string {
	avgWeight := totalWeightLbs / float64(numBags)
	s := fmt.Sprintf("Base price: $%.2f (%d bag(s) × $%.2f)", base, numBags, basePricePerBag)
	if surcharge > 0 {
		overage := math.Max(0, avgWeight-weightThresholdLb)
		s += fmt.Sprintf("; Weight surcharge: $%.2f (avg %.2f lbs/bag, %.2f lbs over threshold × $%.2f × %d bag(s))",
			surcharge, avgWeight, overage, surchargePerLb, numBags)
	}
	if expressFee > 0 {
		s += fmt.Sprintf("; Express fee: $%.2f", expressFee)
	}
	s += fmt.Sprintf("; Total: $%.2f", total)
	return s
}
