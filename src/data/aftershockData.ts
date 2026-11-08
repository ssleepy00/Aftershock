/**
 * Central Data & Feature Re-export Hub
 *
 * This module serves as the centralized interface connecting all modularized feature
 * domains (portfolio types, physical asset database, parser, optimizer, and metrics calculator)
 * to client UI components, server routes, and automated benchmarking test runners.
 *
 * Feature Overview & Use Cases:
 * 1. Backwards Compatibility: Preserves full contract compatibility for existing internal imports
 *    and automated benchmark suites (such as agentverse/finance/bench.py).
 * 2. Unified Domain Surface: Re-exports domain models, curated facility assets, and calculation
 *    engines from their respective focused feature files.
 * 3. Architectural Boundary: Shields high-level presentation layers from low-level implementation details.
 */

export type {
  HazardType,
  RiskLevel,
  InfraCategory,
  InfraSite,
  StockRiskProfile,
  ScoreBreakdown,
  PortfolioMetricsSnapshot,
  PortfolioMetricsComparison,
  PortfolioPreset,
} from '../features/portfolio/types.ts';

export {
  STOCK_DATABASE,
  PRESET_PORTFOLIOS,
  PORTFOLIO_PRESETS,
  getStockRiskProfile,
  getPresetPortfolios,
} from '../features/portfolio/stockDatabase.ts';

export {
  parsePortfolioText,
  RESERVED_CSV_WORDS,
  type ParsedPortfolioHolding,
} from '../features/portfolio/portfolioParser.ts';

export {
  buildPortfolioProfiles,
  allocateBounded,
  verifyPortfolioGuardrails,
  registerDynamicStockProfile,
  DYNAMIC_TICKER_PROFILES,
  type GuardrailVerificationResult,
} from '../features/portfolio/portfolioOptimizer.ts';

export {
  computePortfolioMetrics,
} from '../features/portfolio/metricsCalculator.ts';

export {
  computeHoldingReasoningTraces,
  computeDeclaredBenchmarks,
  evaluateStressScenario,
  STRESS_SCENARIOS,
  type HoldingReasoningTrace,
  type DeclaredBenchmarkRow,
  type StressScenarioDefinition,
  type StressScenarioEvaluation,
} from '../features/audit/traceableMathEngine.ts';

export type {
  AgentStepTrace,
  AgenticStockResearchResult,
} from '../features/agent/stockResearchAgent.ts';

