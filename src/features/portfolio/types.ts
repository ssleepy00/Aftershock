/**
 * Portfolio & Infrastructure Risk Data Types
 *
 * This module defines the comprehensive type contracts, domain models, and interfaces
 * underpinning the Aftershock physical climate risk evaluation engine.
 *
 * Feature Overview & Use Cases:
 * 1. Physical Hazard Classifications: Encapsulates specific natural hazard threats (Hurricanes,
 *    Earthquakes, and low-exposure baselines) alongside standardized risk severity levels (high, moderate, low).
 * 2. Critical Infrastructure Taxonomy: Categorizes physical facilities across four mission-critical
 *    tiers: Data Centers, Power Supplies (substations, nuclear plants, grid interconnects), Corporate HQs,
 *    and Semiconductor Wafer Fabs.
 * 3. Spatial & Exposure Representation: Models individual infrastructure sites (InfraSite) with precise
 *    geospatial coordinates (latitude/longitude), facility names, power capacities in MW, and unpriced
 *    asset risk contributions.
 * 4. Multi-Asset Portfolio Modeling: Defines stock risk profiles (StockRiskProfile) containing baseline
 *    and hedged portfolio allocations, composite exposure scores (0-100), volatility metrics, and
 *    historical disaster event drawdowns.
 * 5. Institutional Portfolio Metrics: Structures comparative risk analytics (PortfolioMetricsComparison),
 *    including Sharpe ratios, Sortino downside ratios, Tail CVaR 99%, portfolio turnover, and transaction costs.
 * 6. Interactive Portfolio Presets: Models predefined institutional portfolios for rapid benchmarking.
 */

export type HazardType = 'Hurricane' | 'Earthquake' | 'Low';
export type RiskLevel = 'high' | 'moderate' | 'low';
export type InfraCategory = 'Data Center' | 'Power Supply' | 'Corporate HQ' | 'Wafer Fab';

/**
 * Represents a single physical asset or facility tied to a publicly traded corporation.
 */
export interface InfraSite {
  id: string;
  ticker: string;
  company: string;
  name: string;
  city: string;
  state: string;
  category: InfraCategory;
  lat: number;
  lng: number;
  hazard: HazardType;
  riskLevel: RiskLevel;
  unpricedImpactPct: number; // e.g. -0.6 means -0.6% unpriced risk from this site
  hazardDetail: string;
  powerCapacityMW: string;
}

/**
 * Comprehensive risk and financial profile for an individual equity holding.
 */
export interface StockRiskProfile {
  ticker: string;
  company: string;
  weight: number; // portfolio weight % (0 - 100)
  hedgedWeight: number; // suggested rebalanced weight %
  exposureScore: number; // 0 - 100 risk score across HQ, Power Supply, Data Centers, Fabs
  unpricedRiskPct: number; // e.g. -1.4 means stock is overpriced by 1.4% due to unpriced disaster exposure
  expectedReturnPct: number; // annualized expected return %
  annualVolPct: number; // annualized volatility %
  maxEventDrawdownPct: number; // historical/simulated disaster max drawdown %
  primaryHazard: HazardType;
  riskLevel: RiskLevel;
  color: string;
  sites: InfraSite[];
}

/**
 * Granular breakdown of exposure score points across physical asset categories.
 */
export interface ScoreBreakdown {
  totalScore: number; // 0 - 100
  dataCenterPts: number;
  powerSupplyPts: number;
  hqPts: number;
  fabPts: number;
  corridorPenaltyPts: number;
  topDrivers: string[];
}

/**
 * Snapshot of institutional portfolio risk, return, and hedge transaction metrics.
 */
export interface PortfolioMetricsSnapshot {
  exposureScore: number;
  scoreBreakdown: ScoreBreakdown;
  unpricedRiskPct: number; // Net of transaction costs when hedged
  sharpeRatio: number; // Net of transaction costs when hedged
  sortinoRatio: number; // Net of transaction costs when hedged
  maxDrawdownPct: number;
  tailCvar99Pct: number;
  annualReturnPct: number;
  annualVolPct: number;
  turnoverPct: number;
  transactionCostPct: number;
}

/**
 * Comparative dual-state metrics structure contrasting current vs hedged portfolios.
 */
export interface PortfolioMetricsComparison {
  current: PortfolioMetricsSnapshot;
  hedged: PortfolioMetricsSnapshot;
}

/**
 * Predefined portfolio allocation for rapid one-click testing and demonstration.
 */
export interface PortfolioPreset {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  items: { ticker: string; weight: number }[];
}
