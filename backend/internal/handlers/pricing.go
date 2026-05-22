package handlers

import (
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

type breakdownDetail struct {
	BaseRate    float64 `json:"base_rate"`
	BagCharge   float64 `json:"bag_charge"`
	WeightCharge float64 `json:"weight_charge"`
	ExpressFee  float64 `json:"express_fee"`
}

type estimateResponse struct {
	EstimatedPriceUSD float64        `json:"estimated_price_usd"`
	Express           bool           `json:"express"`
	Breakdown         breakdownDetail `json:"breakdown"`
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
		EstimatedPriceUSD: total,
		Express:           req.Express,
		Breakdown: breakdownDetail{
			BaseRate:    basePricePerBag,
			BagCharge:   base,
			WeightCharge: surcharge,
			ExpressFee:  expressFee,
		},
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

