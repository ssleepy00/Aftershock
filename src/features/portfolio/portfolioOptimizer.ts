/**
 * Constrained Portfolio Hedge Optimizer
 *
 * This feature module implements the institutional risk-hedging optimization algorithm
 * (Spec Layer 04) that computes defensive rebalances away from severe physical hazard
 * corridors without violating strict institutional turnover and position-change limits.
 *
 * Feature Overview & Use Cases:
 * 1. Multi-Hazard Exposure Profiling: Resolves incoming ticker holdings against the curated
 *    physical asset database or generates deterministic risk profiles for unknown symbols.
 * 2. Strict Risk-Hedging Guardrails:
 *    - Delta Cap: No single stock's weight may increase or decrease by more than +/- 5.0 percentage points.
 *    - Turnover Cap: Total one-way portfolio turnover (0.5 * sum(|w_hedged - w_current|)) is capped at 15.0%.
 *    - Exact Sum: Both original and hedged allocations strictly sum to exactly 100.0%.
 *    - Long-Only Invariant: No short positions; all final weights remain non-negative (>= 0%).
 * 3. Priority Waterfilling: Utilizes bounded proportional allocation (`allocateBounded`) to shift capital
 *    from equities with above-average unpriced physical disaster severity into lower-risk holdings.
 * 4. Sorting & Formatting: Sorts output profiles deterministically by unpriced risk severity.
 */

import type { StockRiskProfile } from './types.ts';
import { STOCK_DATABASE } from './stockDatabase.ts';
import { CONFIG } from '../../config/appConfig.ts';
import { logFunctionCall } from '../../utils/logger.ts';

/**
 * Runtime registry of dynamically resolved unseen equity profiles (populated via live Gemini grounding).
 */
export const DYNAMIC_TICKER_PROFILES: Record<
  string,
  Omit<StockRiskProfile, 'weight' | 'hedgedWeight'>
> = {};

/**
 * Registers a dynamically resolved unseen stock profile into the runtime database
 * so subsequent calls to `buildPortfolioProfiles` incorporate its real-world facilities and hazard metrics.
 *
 * @param profile Resolved stock risk profile (excluding portfolio-specific weights).
 */
export function registerDynamicStockProfile(
  profile: Omit<StockRiskProfile, 'weight' | 'hedgedWeight'>
): void {
  const cleanTicker = profile.ticker.toUpperCase().trim();
  logFunctionCall('registerDynamicStockProfile', {
    ticker: cleanTicker,
    company: profile.company,
    sitesCount: profile.sites.length,
  });
  DYNAMIC_TICKER_PROFILES[cleanTicker] = {
    ...profile,
    ticker: cleanTicker,
  };
}

/**
 * Waterfilling bounded allocator that distributes a target reallocation sum across
 * candidate items proportional to priority weights, respecting individual per-item caps.
 *
 * @param targetSum Total amount of weight to distribute across buckets.
 * @param priorities Relative urgency or priority weighting for each bucket.
 * @param caps Maximum ceiling that each bucket can absorb.
 * @returns Array of allocated amounts per bucket summing to targetSum (or max possible).
 */
export function allocateBounded(
  targetSum: number,
  priorities: number[],
  caps: number[]
): number[] {
  logFunctionCall('allocateBounded', { targetSum, prioritiesCount: priorities.length, capsCount: caps.length });

  const n = priorities.length;
  const alloc = new Array(n).fill(0);
  const locked = new Array(n).fill(false);
  let remaining = targetSum;

  for (let iter = 0; iter < n + 2; iter++) {
    if (remaining <= 1e-9) break;
    let prioSum = 0;
    for (let i = 0; i < n; i++) {
      if (!locked[i]) prioSum += priorities[i];
    }
    if (prioSum <= 1e-9) break;

    let anyClamped = false;
    for (let i = 0; i < n; i++) {
      if (locked[i]) continue;
      const share = (remaining * priorities[i]) / prioSum;
      if (alloc[i] + share >= caps[i] - 1e-9) {
        remaining -= caps[i] - alloc[i];
        alloc[i] = caps[i];
        locked[i] = true;
        anyClamped = true;
      }
    }
    if (!anyClamped) {
      for (let i = 0; i < n; i++) {
        if (!locked[i]) {
          alloc[i] += (remaining * priorities[i]) / prioSum;
        }
      }
      remaining = 0;
      break;
    }
  }
  return alloc;
}

/**
 * Constructs complete stock risk profiles and calculates hedged allocations
 * under institutional turnover and delta constraints.
 *
 * @param rawItems Array of raw ticker and weight pairs from user input or parser.
 * @returns Fully populated array of StockRiskProfile objects with hedged allocations.
 */
export function buildPortfolioProfiles(
  rawItems: { ticker: string; weight: number }[]
): StockRiskProfile[] {
  logFunctionCall('buildPortfolioProfiles', { rawItemsCount: rawItems.length });

  const validItems = rawItems.filter((item) => Number(item.weight) > 0);
  const sourceItems = validItems.length > 0 ? validItems : rawItems;

  // Aggregate duplicate ticker symbols while preserving first-seen order
  const mergedMap = new Map<string, number>();
  for (const item of sourceItems) {
    const clean = item.ticker.toUpperCase().trim();
    if (!clean) continue;
    mergedMap.set(clean, (mergedMap.get(clean) || 0) + (Number(item.weight) || 0));
  }
  const mergedItems = Array.from(mergedMap.entries()).map(([ticker, weight]) => ({
    ticker,
    weight,
  }));

  const total =
    mergedItems.reduce((acc, item) => acc + (Number(item.weight) || 0), 0) || 100;

  // Normalize initial weights and ensure exact 100.0% sum
  const normalized = mergedItems.map((item) => ({
    ticker: item.ticker,
    weight: Number(((Number(item.weight) / total) * 100).toFixed(1)),
  }));
  if (normalized.length > 0) {
    let normSum = Number(
      normalized.reduce((s, x) => s + x.weight, 0).toFixed(1)
    );
    let steps = Math.round((100.0 - normSum) * 10);
    let idx = 0;
    while (steps !== 0 && idx < normalized.length * 4) {
      const target = normalized[idx % normalized.length];
      const stepVal = steps > 0 ? 0.1 : -0.1;
      if (target.weight + stepVal >= 0.1) {
        target.weight = Number((target.weight + stepVal).toFixed(1));
        steps += steps > 0 ? -1 : 1;
      }
      idx++;
    }
  }

  const profiles: StockRiskProfile[] = normalized.map((item, idx) => {
    const known =
      STOCK_DATABASE[item.ticker] || DYNAMIC_TICKER_PROFILES[item.ticker];
    if (known) {
      return {
        ...known,
        weight: item.weight,
        hedgedWeight: item.weight,
      };
    }

    const fallbackColors = ['#E57A54', '#F4A261', '#E9C46A', '#52B788', '#A8DADC'];
    const isEven = idx % 2 === 0;
    return {
      ticker: item.ticker,
      company: `${item.ticker} Corp`,
      weight: item.weight,
      hedgedWeight: item.weight,
      exposureScore: isEven ? 68 : 52,
      unpricedRiskPct: isEven ? -0.6 : -0.3,
      expectedReturnPct: 16.0,
      annualVolPct: 24.0,
      maxEventDrawdownPct: isEven ? -16.5 : -13.0,
      primaryHazard: isEven ? 'Hurricane' : 'Earthquake',
      riskLevel: isEven ? 'moderate' : 'low',
      color: fallbackColors[idx % fallbackColors.length],
      sites: [
        {
          id: `${item.ticker.toLowerCase()}-hq`,
          ticker: item.ticker,
          company: `${item.ticker} Corp`,
          name: `${item.ticker} Corporate HQ`,
          city: 'Santa Clara',
          state: 'CA',
          category: 'Corporate HQ',
          lat: 37.37 + (idx % 3) * 0.12,
          lng: -121.96 - (idx % 3) * 0.12,
          hazard: 'Earthquake',
          riskLevel: 'moderate',
          unpricedImpactPct: -0.2,
          hazardDetail: 'Silicon Valley Seismic Zone',
          powerCapacityMW: '110 MW Campus Grid',
        },
        {
          id: `${item.ticker.toLowerCase()}-dc`,
          ticker: item.ticker,
          company: `${item.ticker} Corp`,
          name: `${item.ticker} Northern Virginia Data Center`,
          city: 'Ashburn',
          state: 'VA',
          category: 'Data Center',
          lat: 39.04 + (idx % 3) * 0.15,
          lng: -77.48 - (idx % 3) * 0.15,
          hazard: 'Hurricane',
          riskLevel: isEven ? 'moderate' : 'low',
          unpricedImpactPct: isEven ? -0.2 : -0.1,
          hazardDetail: 'East Coast Cloud & Grid Corridor',
          powerCapacityMW: '280 MW PJM Substation',
        },
        {
          id: `${item.ticker.toLowerCase()}-pwr`,
          ticker: item.ticker,
          company: `${item.ticker} Corp`,
          name: `${item.ticker} Gulf Power Substation`,
          city: 'Houston',
          state: 'TX',
          category: 'Power Supply',
          lat: 29.85 + (idx % 3) * 0.12,
          lng: -95.32 - (idx % 3) * 0.12,
          hazard: 'Hurricane',
          riskLevel: isEven ? 'high' : 'moderate',
          unpricedImpactPct: isEven ? -0.2 : 0.0,
          hazardDetail: 'Gulf Coast Storm Track',
          powerCapacityMW: '350 MW Dedicated Tie',
        },
      ],
    };
  });

  // Spec Layer 04 Constrained Hedge Optimizer:
  // 1) |hedgedWeight_i - weight_i| <= CONFIG.RISK_GUARDRAILS.MAX_DELTA_PER_STOCK (5.0 pts)
  // 2) One-way turnover 0.5 * sum(|hedgedWeight_i - weight_i|) <= CONFIG.RISK_GUARDRAILS.MAX_ONE_WAY_TURNOVER (15.0%)
  // 3) hedgedWeight_i >= 0 and sum(hedgedWeight_i) == 100.0%
  const MAX_DELTA_PER_STOCK = CONFIG.RISK_GUARDRAILS.MAX_DELTA_PER_STOCK;
  const MAX_ONE_WAY_TURNOVER = CONFIG.RISK_GUARDRAILS.MAX_ONE_WAY_TURNOVER;

  const severities = profiles.map((p) => Math.abs(p.unpricedRiskPct));
  const rawMean =
    severities.reduce((a, b) => a + b, 0) / (severities.length || 1);
  const minSev = severities.length > 0 ? Math.min(...severities) : 0;
  const maxSev = severities.length > 0 ? Math.max(...severities) : 0;
  const meanSeverity = 0.5 * (rawMean + 0.5 * (minSev + maxSev));

  const highIdx: number[] = [];
  const lowIdx: number[] = [];
  profiles.forEach((_, i) => {
    if (severities[i] > meanSeverity + 1e-6) highIdx.push(i);
    else if (severities[i] < meanSeverity - 1e-6) lowIdx.push(i);
  });

  if (highIdx.length > 0 && lowIdx.length > 0) {
    const highCaps = highIdx.map((i) =>
      Math.min(MAX_DELTA_PER_STOCK, profiles[i].weight)
    );
    const lowCaps = lowIdx.map((i) =>
      Math.min(MAX_DELTA_PER_STOCK, 100.0 - profiles[i].weight)
    );

    const maxReductionSum = highCaps.reduce((a, b) => a + b, 0);
    const maxIncreaseSum = lowCaps.reduce((a, b) => a + b, 0);
    const targetTurnover = Math.min(
      MAX_ONE_WAY_TURNOVER,
      maxReductionSum,
      maxIncreaseSum
    );

    const highPrios = highIdx.map((i) => severities[i] - meanSeverity);
    const lowPrios = lowIdx.map((i) => meanSeverity - severities[i]);

    const reductions = allocateBounded(targetTurnover, highPrios, highCaps);
    const increases = allocateBounded(targetTurnover, lowPrios, lowCaps);

    highIdx.forEach((idx, k) => {
      profiles[idx].hedgedWeight = Number(
        Math.max(0, profiles[idx].weight - reductions[k]).toFixed(1)
      );
    });
    lowIdx.forEach((idx, k) => {
      profiles[idx].hedgedWeight = Number(
        Math.min(100, profiles[idx].weight + increases[k]).toFixed(1)
      );
    });

    // Reconcile 0.1% rounding drift so sum(hedgedWeight) == 100.0% and turnover <= 15.0%
    let hedgedSum = Number(
      profiles.reduce((s, p) => s + p.hedgedWeight, 0).toFixed(1)
    );
    let residualSteps = Math.round((100.0 - hedgedSum) * 10);
    let guardIter = 0;
    while (residualSteps !== 0 && guardIter < profiles.length * 6) {
      const stepVal = residualSteps > 0 ? 0.1 : -0.1;
      let adjusted = false;
      for (const p of profiles) {
        const candidate = Number((p.hedgedWeight + stepVal).toFixed(1));
        const currentDelta = Math.abs(p.hedgedWeight - p.weight);
        const newDelta = Math.abs(candidate - p.weight);
        if (
          candidate >= 0 &&
          candidate <= 100 &&
          newDelta <= MAX_DELTA_PER_STOCK + 1e-6 &&
          newDelta <= currentDelta + 1e-6
        ) {
          p.hedgedWeight = candidate;
          residualSteps += residualSteps > 0 ? -1 : 1;
          adjusted = true;
          break;
        }
      }
      if (!adjusted) {
        for (const p of profiles) {
          const candidate = Number((p.hedgedWeight + stepVal).toFixed(1));
          const newDelta = Math.abs(candidate - p.weight);
          if (
            candidate >= 0 &&
            candidate <= 100 &&
            newDelta <= MAX_DELTA_PER_STOCK + 1e-6
          ) {
            p.hedgedWeight = candidate;
            residualSteps += residualSteps > 0 ? -1 : 1;
            break;
          }
        }
      }
      guardIter++;
    }

    // Ensure 1-decimal rounding never pushes one-way turnover above MAX_ONE_WAY_TURNOVER
    let currentTurnover = Number(
      (
        0.5 *
        profiles.reduce((sum, x) => sum + Math.abs(x.hedgedWeight - x.weight), 0)
      ).toFixed(1)
    );
    let trimIter = 0;
    while (currentTurnover > MAX_ONE_WAY_TURNOVER + 1e-6 && trimIter < 10) {
      const trimmedStock = profiles.find((p) => p.hedgedWeight < p.weight - 0.05);
      const addedStock = profiles.find((p) => p.hedgedWeight > p.weight + 0.05);
      if (!trimmedStock || !addedStock) break;
      trimmedStock.hedgedWeight = Number((trimmedStock.hedgedWeight + 0.1).toFixed(1));
      addedStock.hedgedWeight = Number((addedStock.hedgedWeight - 0.1).toFixed(1));
      currentTurnover = Number(
        (
          0.5 *
          profiles.reduce((sum, x) => sum + Math.abs(x.hedgedWeight - x.weight), 0)
        ).toFixed(1)
      );
      trimIter++;
    }
  }

  // Sort by highest exposure / most negative unpriced risk first
  const sorted = profiles.sort((a, b) => a.unpricedRiskPct - b.unpricedRiskPct);

  logFunctionCall('buildPortfolioProfiles:result', {
    count: sorted.length,
    tickers: sorted.map((p) => p.ticker),
  });

  return sorted;
}

/**
 * Result of deterministic mathematical verification on a proposed portfolio rebalance.
 */
export interface GuardrailVerificationResult {
  maxSingleStockDeltaPts: number;
  maxAllowedDeltaPts: number;
  passedDeltaCap: boolean;
  oneWayTurnoverPct: number;
  maxAllowedTurnoverPct: number;
  passedTurnoverCap: boolean;
  hedgedWeightSumPct: number;
  passedWeightSum: boolean;
  passedLongOnly: boolean;
  allChecksPassed: boolean;
}

/**
 * Deterministically verifies that a proposed risk-hedged portfolio allocation strictly
 * satisfies all institutional mathematical guardrails before human review/approval.
 *
 * @param profiles Array of stock risk profiles containing current and hedged weights.
 * @returns Structured verification report detailing each mathematical invariant check.
 */
export function verifyPortfolioGuardrails(
  profiles: StockRiskProfile[]
): GuardrailVerificationResult {
  const maxAllowedDeltaPts = CONFIG.RISK_GUARDRAILS.MAX_DELTA_PER_STOCK;
  const maxAllowedTurnoverPct = CONFIG.RISK_GUARDRAILS.MAX_ONE_WAY_TURNOVER;

  const maxSingleStockDeltaPts = Number(
    profiles
      .reduce((max, p) => Math.max(max, Math.abs(p.hedgedWeight - p.weight)), 0)
      .toFixed(1)
  );
  const oneWayTurnoverPct = Number(
    (
      0.5 *
      profiles.reduce((sum, p) => sum + Math.abs(p.hedgedWeight - p.weight), 0)
    ).toFixed(1)
  );
  const hedgedWeightSumPct = Number(
    profiles.reduce((sum, p) => sum + p.hedgedWeight, 0).toFixed(1)
  );
  const passedLongOnly = profiles.every((p) => p.hedgedWeight >= -1e-6);
  const passedDeltaCap = maxSingleStockDeltaPts <= maxAllowedDeltaPts + 1e-6;
  const passedTurnoverCap = oneWayTurnoverPct <= maxAllowedTurnoverPct + 1e-6;
  const passedWeightSum =
    profiles.length === 0 || Math.abs(hedgedWeightSumPct - 100.0) <= 0.2;

  const allChecksPassed =
    passedDeltaCap && passedTurnoverCap && passedWeightSum && passedLongOnly;

  const result: GuardrailVerificationResult = {
    maxSingleStockDeltaPts,
    maxAllowedDeltaPts,
    passedDeltaCap,
    oneWayTurnoverPct,
    maxAllowedTurnoverPct,
    passedTurnoverCap,
    hedgedWeightSumPct,
    passedWeightSum,
    passedLongOnly,
    allChecksPassed,
  };

  logFunctionCall('verifyPortfolioGuardrails', result);
  return result;
}

