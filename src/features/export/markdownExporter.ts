/**
 * Markdown Portfolio Risk Report Generator
 *
 * This feature module renders institutional-grade Markdown reports summarizing the
 * comprehensive physical disaster risks, performance metrics, and infrastructure assets
 * evaluated by Aftershock.
 *
 * Feature Overview & Use Cases:
 * 1. Executive Metric Benchmarking: Generates side-by-side comparative Markdown tables
 *    displaying exposure scores, unpriced risk drag, Sharpe ratios, Sortino downside metrics,
 *    maximum catastrophe drawdowns, and 99% Tail CVaR.
 * 2. Exposure Score Justification: Itemizes the point contribution from Data Centers, Power
 *    Supplies, Corporate HQs, Wafer Fabs, and regional hazard corridor penalties.
 * 3. Granular Holdings Breakdown: Details per-stock current weights, hedged weights, deltas,
 *    and primary natural hazard exposures.
 * 4. Critical US Infrastructure Inventory: Tabulates all mapped physical sites with categories,
 *    power capacities, and geological hazard details.
 * 5. Open Data Citations: Documents official public provenance (FEMA NRI, USGS NSHM, NOAA HURDAT2,
 *    Epoch AI, PNNL, EIA-860, and SEC Form 10-K).
 */

import {
  StockRiskProfile,
  PortfolioMetricsComparison,
} from '../portfolio/types';
import { logFunctionCall } from '../../utils/logger';

/**
 * Generates a comprehensive, human-readable Markdown report for an evaluated portfolio.
 *
 * @param portfolioName Display label or uploaded filename for the portfolio.
 * @param profiles Array of stock risk profiles with individual site inventories.
 * @param metrics Comparative metrics across current and hedged allocation states.
 * @param isHedged Whether the active view reflects the risk-hedged weights.
 * @returns Fully formatted Markdown document string ready for clipboard or file export.
 */
export function generatePortfolioMarkdownReport(
  portfolioName: string,
  profiles: StockRiskProfile[],
  metrics: PortfolioMetricsComparison,
  isHedged: boolean
): string {
  logFunctionCall('generatePortfolioMarkdownReport', {
    portfolioName,
    profilesCount: profiles.length,
    isHedged,
  });

  const cur = metrics.current;
  const hdg = metrics.hedged;
  const dateStr = new Date().toISOString().split('T')[0];

  const lines: string[] = [];
  lines.push(`# Aftershock — Portfolio Risk & Infrastructure Evaluation Report`);
  lines.push(`**Portfolio Name:** ${portfolioName}`);
  lines.push(`**Evaluation Date:** ${dateStr}`);
  lines.push(`**Active Mode:** ${isHedged ? 'Risk-Hedged Weights' : 'Current Weights'}`);
  lines.push(`**Total Mapped US Facilities:** ${profiles.reduce((acc, p) => acc + p.sites.length, 0)} sites`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 1. Executive Portfolio Risk & Metric Comparison`);
  lines.push(``);
  lines.push(`| Metric | Current Weights | Risk-Hedged Weights | Delta / Improvement |`);
  lines.push(`| :--- | :--- | :--- | :--- |`);
  lines.push(
    `| **Exposure Score (/100)** | ${cur.exposureScore} / 100 | ${hdg.exposureScore} / 100 | -${cur.exposureScore - hdg.exposureScore} pts risk |`
  );
  lines.push(
    `| **Unpriced Disaster Risk** | ${cur.unpricedRiskPct.toFixed(2)}% | ${hdg.unpricedRiskPct.toFixed(2)}% (net) | +${Math.abs(cur.unpricedRiskPct - hdg.unpricedRiskPct).toFixed(2)}% net protected |`
  );
  lines.push(
    `| **Sharpe Ratio** | ${cur.sharpeRatio.toFixed(2)} | ${hdg.sharpeRatio.toFixed(2)} (net) | +${(hdg.sharpeRatio - cur.sharpeRatio).toFixed(2)} |`
  );
  lines.push(
    `| **Sortino Ratio (Downside-adj)** | ${cur.sortinoRatio.toFixed(2)} | ${hdg.sortinoRatio.toFixed(2)} (net) | +${(hdg.sortinoRatio - cur.sortinoRatio).toFixed(2)} |`
  );
  lines.push(
    `| **Max Catastrophe Drawdown** | ${cur.maxDrawdownPct.toFixed(1)}% | ${hdg.maxDrawdownPct.toFixed(1)}% | +${Math.abs(cur.maxDrawdownPct - hdg.maxDrawdownPct).toFixed(1)}% less drawdown |`
  );
  lines.push(
    `| **99% Tail CVaR (1-in-100 Yr)** | ${cur.tailCvar99Pct.toFixed(1)}% | ${hdg.tailCvar99Pct.toFixed(1)}% | +${Math.abs(cur.tailCvar99Pct - hdg.tailCvar99Pct).toFixed(1)}% tail buffer |`
  );
  lines.push(
    `| **Annualized Volatility** | ${cur.annualVolPct.toFixed(1)}% | ${hdg.annualVolPct.toFixed(1)}% | -${(cur.annualVolPct - hdg.annualVolPct).toFixed(1)}% lower vol |`
  );
  lines.push(
    `| **Rebalance One-Way Turnover** | 0.0% | ${hdg.turnoverPct.toFixed(1)}% | Capped at <= 15.0% |`
  );
  lines.push(
    `| **Transaction Cost Deducted** | 0.00% | -${hdg.transactionCostPct.toFixed(2)}% | Deducted from net metrics |`
  );
  lines.push(``);
  lines.push(`### Exposure Score Justification Breakdown (Current: ${cur.exposureScore}/100)`);
  lines.push(`- **Data Centers & Cloud Compute:** +${cur.scoreBreakdown.dataCenterPts} pts`);
  lines.push(`- **Power Supply & Grid Substations:** +${cur.scoreBreakdown.powerSupplyPts} pts`);
  lines.push(`- **Corporate HQ & Executive Operations:** +${cur.scoreBreakdown.hqPts} pts`);
  lines.push(`- **Wafer Fabs & Manufacturing Plants:** +${cur.scoreBreakdown.fabPts} pts`);
  lines.push(`- **Fault & Storm Corridor Overlap:** +${cur.scoreBreakdown.corridorPenaltyPts} pts`);
  lines.push(`- **Top Vulnerability Drivers:** ${cur.scoreBreakdown.topDrivers.join(' · ')}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 2. Holdings Risk & Rebalance Breakdown`);
  lines.push(``);
  lines.push(`| Rank | Ticker | Company | Current Wgt | Hedged Wgt | Delta | Exposure Score | Unpriced Risk | Primary Hazard | Mapped Sites |`);
  lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
  profiles.forEach((p, idx) => {
    const delta = Number((p.hedgedWeight - p.weight).toFixed(1));
    const deltaStr = delta > 0 ? `+${delta}%` : `${delta}%`;
    lines.push(
      `| #${idx + 1} | **${p.ticker}** | ${p.company} | ${p.weight.toFixed(1)}% | ${p.hedgedWeight.toFixed(1)}% | ${deltaStr} | ${p.exposureScore}/100 | ${p.unpricedRiskPct.toFixed(1)}% | ${p.primaryHazard} (${p.riskLevel}) | ${p.sites.length} sites |`
    );
  });
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 3. Critical US Infrastructure & Facility Inventory`);
  lines.push(``);
  lines.push(`| Ticker | Facility Name | Category | City, State | Lat, Lng | Hazard | Risk Level | Unpriced Drag | Power Feed | Hazard / Geological Details |`);
  lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
  profiles.forEach((p) => {
    p.sites.forEach((site) => {
      lines.push(
        `| ${p.ticker} | ${site.name} | ${site.category} | ${site.city}, ${site.state} | ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)} | ${site.hazard} | ${site.riskLevel} | ${site.unpricedImpactPct.toFixed(1)}% | ${site.powerCapacityMW} | ${site.hazardDetail} |`
      );
    });
  });
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 4. Open Federal & Public Data Provenance`);
  lines.push(`- **FEMA National Risk Index (NRI v1.19):** County Hurricane & Earthquake Annual Loss Ratings (Public Domain, 17 U.S.C. § 105).`);
  lines.push(`- **USGS 2023 National Seismic Hazard Model:** Peak Ground Acceleration (PGA 2% in 50-year) (Public Domain).`);
  lines.push(`- **NOAA NHC HURDAT2:** Atlantic/Gulf tropical cyclone best-track database (Public Domain).`);
  lines.push(`- **Epoch AI & PNNL IM3 Atlas:** Geolocation and MW capacity of data center clusters (CC BY 4.0 / ODbL).`);
  lines.push(`- **US EIA Form EIA-860:** Annual Electric Generator Report for substations and generation (Public Domain).`);
  lines.push(`- **SEC EDGAR Form 10-K (Item 2 Properties):** Corporate HQs, wafer fabs, and campuses (Public Domain).`);

  return lines.join('\n');
}
