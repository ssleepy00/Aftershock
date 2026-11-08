/**
 * JSON Portfolio Risk & Infrastructure Serializer
 *
 * This feature module renders structured, machine-readable JSON payloads containing full
 * quantitative risk metrics, holdings comparisons, infrastructure asset locations, and data citations.
 *
 * Feature Overview & Use Cases:
 * 1. Programmatic API Integration: Provides clean JSON formatted outputs for downstream risk systems,
 *    quantitative hedge fund backtesting pipelines, and compliance databases.
 * 2. Complete State Serialization: Includes timestamps, active hedging mode, dual-state portfolio metrics,
 *    individual equity risk profiles, facility inventories, and federal data sources.
 * 3. Infrastructure Aggregations: Computes site counts broken down by category (Data Center, Power Supply,
 *    Corporate HQ, Wafer Fab).
 */

import {
  StockRiskProfile,
  PortfolioMetricsComparison,
} from '../portfolio/types';
import { logFunctionCall } from '../../utils/logger';

/**
 * Serializes portfolio evaluation, holdings, infrastructure sites, and metadata into a formatted JSON string.
 *
 * @param portfolioName Name or filename identifier for the portfolio.
 * @param profiles Array of stock risk profiles with individual site inventories.
 * @param metrics Comparative metrics across current and hedged allocation states.
 * @param isHedged Whether the active view reflects the risk-hedged weights.
 * @returns Pretty-printed JSON string (2-space indentation).
 */
export function generatePortfolioJson(
  portfolioName: string,
  profiles: StockRiskProfile[],
  metrics: PortfolioMetricsComparison,
  isHedged: boolean
): string {
  logFunctionCall('generatePortfolioJson', {
    portfolioName,
    profilesCount: profiles.length,
    isHedged,
  });

  const payload = {
    report: 'Aftershock Portfolio Risk Evaluation',
    generatedAt: new Date().toISOString(),
    portfolioName,
    activeMode: isHedged ? 'Risk-Hedged' : 'Current',
    portfolioMetrics: metrics,
    holdings: profiles.map((p, idx) => ({
      rank: idx + 1,
      ticker: p.ticker,
      company: p.company,
      currentWeightPct: p.weight,
      hedgedWeightPct: p.hedgedWeight,
      weightDeltaPct: Number((p.hedgedWeight - p.weight).toFixed(1)),
      exposureScore: p.exposureScore,
      unpricedRiskPct: p.unpricedRiskPct,
      expectedReturnPct: p.expectedReturnPct,
      annualVolPct: p.annualVolPct,
      maxEventDrawdownPct: p.maxEventDrawdownPct,
      primaryHazard: p.primaryHazard,
      riskLevel: p.riskLevel,
      sites: p.sites,
    })),
    infrastructureSitesSummary: {
      totalSites: profiles.reduce((acc, p) => acc + p.sites.length, 0),
      dataCenters: profiles
        .flatMap((p) => p.sites)
        .filter((s) => s.category === 'Data Center').length,
      powerSupply: profiles
        .flatMap((p) => p.sites)
        .filter((s) => s.category === 'Power Supply').length,
      corporateHQ: profiles
        .flatMap((p) => p.sites)
        .filter((s) => s.category === 'Corporate HQ').length,
      waferFabs: profiles
        .flatMap((p) => p.sites)
        .filter((s) => s.category === 'Wafer Fab').length,
    },
    dataSources: [
      'FEMA National Risk Index (NRI v1.19)',
      'USGS 2023 National Seismic Hazard Model',
      'NOAA NHC HURDAT2',
      'Epoch AI Frontier Data Centers Hub',
      'PNNL IM3 Open Source Data Center Atlas',
      'US EIA Form EIA-860',
      'SEC EDGAR Form 10-K Item 2',
    ],
  };

  return JSON.stringify(payload, null, 2);
}
