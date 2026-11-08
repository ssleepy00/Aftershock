/**
 * CSV Portfolio & Infrastructure Data Exporter
 *
 * This feature module renders comma-separated tabular data formats across portfolio summaries,
 * equity rebalancing allocations, and mapped physical infrastructure assets.
 *
 * Feature Overview & Use Cases:
 * 1. Spreadsheet Compatibility: Generates CSV structures effortlessly consumed by Microsoft Excel,
 *    Google Sheets, Python pandas, and R analytical workflows.
 * 2. Multi-Section Structured Exports:
 *    - Portfolio Summary: High-level risk metrics, Sharpe/Sortino ratios, and turnover costs.
 *    - Holdings Table: Current vs. hedged allocations, deltas, and exposure scores.
 *    - Infrastructure Inventory: Facility-level coordinates, power capacity, and hazard profiles.
 * 3. Text Sanitization: Safely quotes strings containing commas, quotation marks, or line breaks.
 */

import {
  StockRiskProfile,
  PortfolioMetricsComparison,
} from '../portfolio/types';
import { logFunctionCall } from '../../utils/logger';

/**
 * Generates a structured multi-section CSV string capturing all portfolio metrics,
 * equity allocations, and US physical infrastructure facilities.
 *
 * @param portfolioName Name or filename identifier for the portfolio.
 * @param profiles Array of stock risk profiles with individual site inventories.
 * @param metrics Comparative metrics across current and hedged allocation states.
 * @param isHedged Whether the active view reflects the risk-hedged weights.
 * @returns Fully formatted CSV document string.
 */
export function generatePortfolioCsv(
  portfolioName: string,
  profiles: StockRiskProfile[],
  metrics: PortfolioMetricsComparison,
  isHedged: boolean
): string {
  logFunctionCall('generatePortfolioCsv', {
    portfolioName,
    profilesCount: profiles.length,
    isHedged,
  });

  const lines: string[] = [];
  lines.push(`--- PORTFOLIO SUMMARY ---`);
  lines.push(`Portfolio Name,${portfolioName}`);
  lines.push(`Active Mode,${isHedged ? 'Risk-Hedged' : 'Current'}`);
  lines.push(`Current Exposure Score,${metrics.current.exposureScore}`);
  lines.push(`Hedged Exposure Score,${metrics.hedged.exposureScore}`);
  lines.push(`Current Unpriced Risk Pct,${metrics.current.unpricedRiskPct}%`);
  lines.push(`Hedged Unpriced Risk Pct,${metrics.hedged.unpricedRiskPct}%`);
  lines.push(`Current Sharpe Ratio,${metrics.current.sharpeRatio}`);
  lines.push(`Hedged Sharpe Ratio,${metrics.hedged.sharpeRatio}`);
  lines.push(`Current Max Drawdown Pct,${metrics.current.maxDrawdownPct}%`);
  lines.push(`Hedged Max Drawdown Pct,${metrics.hedged.maxDrawdownPct}%`);
  lines.push(`Rebalance Turnover Pct,${metrics.hedged.turnoverPct}%`);
  lines.push(`Transaction Cost Pct,${metrics.hedged.transactionCostPct}%`);
  lines.push(``);
  lines.push(`--- HOLDINGS ---`);
  lines.push(
    `Rank,Ticker,Company,CurrentWeightPct,HedgedWeightPct,DeltaPct,ExposureScore,UnpricedRiskPct,PrimaryHazard,RiskLevel,SiteCount`
  );
  profiles.forEach((p, i) => {
    const delta = Number((p.hedgedWeight - p.weight).toFixed(1));
    lines.push(
      `${i + 1},${p.ticker},"${p.company}",${p.weight},${p.hedgedWeight},${delta},${p.exposureScore},${p.unpricedRiskPct},${p.primaryHazard},${p.riskLevel},${p.sites.length}`
    );
  });
  lines.push(``);
  lines.push(`--- US CRITICAL INFRASTRUCTURE SITES ---`);
  lines.push(
    `Ticker,FacilityName,Category,City,State,Latitude,Longitude,Hazard,RiskLevel,UnpricedImpactPct,PowerCapacityMW,HazardDetail`
  );
  profiles.forEach((p) => {
    p.sites.forEach((s) => {
      lines.push(
        `${p.ticker},"${s.name}","${s.category}","${s.city}","${s.state}",${s.lat},${s.lng},${s.hazard},${s.riskLevel},${s.unpricedImpactPct},"${s.powerCapacityMW}","${s.hazardDetail.replace(/"/g, '""')}"`
      );
    });
  });

  return lines.join('\n');
}
