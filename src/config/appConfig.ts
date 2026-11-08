/**
 * Centralized Application Configuration
 *
 * This file serves as the single source of truth for all configurable constants,
 * model names, runtime limits, financial risk parameters, and external service options
 * across the Aftershock application.
 *
 * Feature Overview & Use Cases:
 * 1. AI Model Selection: Configures the Gemini model used for vision/multimodal portfolio extraction.
 * 2. Risk & Rebalance Parameters: Centralizes portfolio optimization caps including maximum
 *    single-stock weight change (+/- 5.0 percentage points) and maximum one-way turnover (15.0%).
 * 3. Financial Assumptions: Sets the baseline risk-free interest rate (10-Yr US Treasury) and
 *    institutional transaction costs per unit turnover.
 * 4. Spatial Hazard Geometry: Stores projection parameters for mapping latitude/longitude coordinates
 *    to SVG canvas coordinates for the continental United States.
 */

export const CONFIG = {
  // Server & AI Models
  SERVER: {
    DEFAULT_PORT: 3000,
    GEMINI_VISION_MODEL: 'gemini-3.8-flash',
    BODY_LIMIT: '15mb',
  },

  // Financial & Risk Optimization Guardrails (Spec Layer 04)
  RISK_GUARDRAILS: {
    MAX_DELTA_PER_STOCK: 5.0, // Maximum +/- 5.0 percentage points per stock
    MAX_ONE_WAY_TURNOVER: 15.0, // Maximum 15.0% one-way portfolio turnover
    RISK_FREE_RATE_PCT: 4.2, // Baseline 10-Yr Treasury yield (%)
    DIVERSIFICATION_FACTOR: 0.76, // Correlation parameter across equity holdings
    TRANSACTION_COST_BPS_PER_TURNOVER: 0.18, // 18 bps institutional transaction cost per 100% turnover
  },

  // Spatial Projection Bounds (US Lower 48)
  SPATIAL_PROJECTION: {
    MIN_LNG: -125.5,
    MAX_LNG: -66.5,
    MIN_LAT: 24.2,
    MAX_LAT: 49.5,
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 540,
    OFFSET_X: 65,
    SCALE_X: 830,
    OFFSET_Y: 45,
    SCALE_Y: 465,
  },
} as const;
