# Aftershock — System Design & Architecture Specification

## 1. Executive Overview

**Aftershock** is an institutional-grade physical climate risk evaluation engine and portfolio hedging platform. It bridges SEC EDGAR Form 10-K corporate disclosures with authoritative US federal hazard data to compute unpriced disaster exposure across technology, semiconductor, and energy equities.

Traditional financial risk models price liquidity, volatility, and credit risk, but treat physical real estate, semiconductor fabs, data centers, and power grids as abstracted balance sheet assets. When major natural disasters strike—such as Gulf hurricanes or California fault line earthquakes—concentrated physical assets suffer localized operational shutdowns, liquid cooling failures, or grid severance that were completely invisible in standard equity betas.

Aftershock solves this by mapping verified corporate physical assets against high-resolution federal hazard baselines and executing a mathematically constrained defensive hedge under strict institutional portfolio turnover caps.

---

## 2. System Architecture & Modular File Hierarchy

Adhering strictly to modern software engineering guidelines, Aftershock follows a modular single-feature-per-file architecture:

```
/
├── Design.md                                # Comprehensive system specification (this document)
├── README.md                                # Deployment, running, and testing documentation
├── server.ts                                # Express 4 + Vite full-stack server & Gemini Vision API
├── src/
│   ├── config/
│   │   └── appConfig.ts                     # Centralized application constants, models, and guardrails
│   ├── utils/
│   │   ├── logger.ts                        # Centralized logger (function tracing & sanitized GenAI logs)
│   │   └── spatialProjection.ts             # 2D cartographic SVG projection & collision offset engine
│   ├── features/
│   │   ├── agent/
│   │   │   └── stockResearchAgent.ts        # 5-step Agentic Stock Research & Verification Loop
│   │   ├── portfolio/
│   │   │   ├── types.ts                     # Domain interfaces, hazard types, and metric models
│   │   │   ├── stockDatabase.ts             # 38 verified facilities, stock database, and portfolio presets
│   │   │   ├── portfolioParser.ts           # Resilient CSV, TSV, and text ingestion parser
│   │   │   ├── portfolioOptimizer.ts        # Constrained hedge optimizer & deterministic guardrail verifier
│   │   │   └── metricsCalculator.ts         # Dual-state physical risk and financial performance metrics
│   │   ├── audit/
│   │   │   └── traceableMathEngine.ts       # Per-stock math traces, declared benchmarks & stress simulator
│   │   └── export/
│   │       ├── markdownExporter.ts          # Institutional Markdown report generator
│   │       ├── csvExporter.ts               # Multi-section tabular CSV report generator
│   │       ├── jsonExporter.ts              # Machine-readable structured JSON serializer
│   │       └── fileDownloader.ts            # Client-side blob provisioning and download trigger
│   ├── components/
│   │   ├── PortfolioUploadTab.tsx           # Dropzone, live unseen ticker input, stress bar & Trace Math UI
│   │   ├── USInfrastructureMapTab.tsx       # Interactive US SVG hazard map & facility deep-dive
│   │   ├── JudgeAuditAndGovernanceTab.tsx   # Declared benchmarks, live hold-out runner & governance matrix
│   │   └── PortfolioExportModal.tsx         # Multi-format report preview, copy, and export dialog
│   ├── data/
│   │   └── aftershockData.ts                # Central re-export hub for backward compatibility
│   ├── App.tsx                              # Main navigation shell and global state coordinator
│   └── main.tsx                             # Client application bootstrap and Concurrent React mount
```

---

## 3. Centralized Configuration (`src/config/appConfig.ts`)

All system-wide configurable parameters, model identifiers, physical bounds, and quantitative guardrails reside in a single immutable configuration object (`CONFIG`):

- **Server & AI Model**:
  - `DEFAULT_PORT`: `3000` (overridden by `process.env.PORT` when deployed).
  - `GEMINI_VISION_MODEL`: `'gemini-3.8-flash'` for multimodal image & screenshot extraction and unseen ticker resolution.
  - `BODY_LIMIT`: `'15mb'` to accommodate high-resolution brokerage screenshots.
- **Risk & Optimization Guardrails (Spec Layer 04)**:
  - `MAX_DELTA_PER_STOCK`: `5.0` percentage points (maximum position change per equity).
  - `MAX_ONE_WAY_TURNOVER`: `15.0%` (maximum portfolio capital reallocated).
  - `RISK_FREE_RATE_PCT`: `4.2%` (10-Year US Treasury benchmark).
  - `DIVERSIFICATION_FACTOR`: `0.76` (cross-asset equity correlation dampener).
  - `TRANSACTION_COST_BPS_PER_TURNOVER`: `0.18` (18 bps institutional execution drag per 100% turnover).
- **Spatial Cartographic Projection**:
  - Longitudinal Bounds: `[-125.5° W, -66.5° W]`.
  - Latitudinal Bounds: `[24.2° N, 49.5° N]`.
  - SVG Canvas Dimensions: `960 x 540`.

---

## 4. Structured Observability, Governance & Data Privacy (`src/utils/logger.ts`)

Aftershock enforces strict observability and risk controls proportionate to institutional portfolio management:
1. **Function Call Tracing (`logFunctionCall`)**:
   - Emits structured info logs containing the function name and caller-supplied parameters.
   - Detects piped execution environments (`process.stdout.isTTY === undefined`) and automatically redirects logs to `process.stderr` so machine-to-machine JSON pipelines (such as `agentverse/finance/bench.py`) remain unpolluted.
2. **Generative AI Call Tracing (`logGenAiCall`)**:
   - Captures target model, generation configuration, prompt text, and responses.
   - Strips inline binary data (`inlineData.data` base64 strings) via `sanitizePromptPartsForLogging` to prevent log bloating and protect uploaded visual snapshots.
3. **Autonomy Boundaries, Model Execution Locations & Data Egress**:
   - **What the Agent May Do Alone (Read-Only Scope)**: Extract tickers/weights from uploaded snapshots, map corporate facilities against federal hazard datasets, and compute candidate bounded waterfilling allocations.
   - **What Requires Human Approval (Human Gate)**: Every risk-hedged portfolio recommendation is verified deterministically via `verifyPortfolioGuardrails` and requires explicit analyst sign-off via the **Human Approval Gate**. Aftershock has zero autonomous brokerage order-routing or trade execution capability.
   - **Where Each Model & Engine Runs**:
     - *In-Browser Client (100% Local TypeScript)*: CSV/text parsing (`parsePortfolioText`), bounded waterfilling optimization (`buildPortfolioProfiles`), risk/Sharpe/Sortino/CVaR calculation (`computePortfolioMetrics`), traceable math derivations (`computeHoldingReasoningTraces`), and catastrophe stress simulations (`evaluateStressScenario`).
     - *Server-Side Cloud API (`gemini-3.8-flash`)*: Invoked strictly for multimodal screenshot extraction (`/api/portfolio/extract-upload`) and the multi-step Agentic Stock Infrastructure Research Loop (`/api/portfolio/resolve-unseen-ticker`).
   - **What User Data Leaves the Device**: Preset selections, map interactions, stress tests, and report exports never leave the client browser. Uploaded screenshots/files are transmitted over HTTPS for ephemeral extraction with zero persistent disk or database storage.

---

## 5. Core Application Features

### 5.1 Multimodal Ingestion, Vision Extraction & 5-Step Agentic Stock Research Loop
- **Drag-and-Drop Zone**: Accepts PNG/JPG brokerage screenshots, pie charts, and tabular files.
- **Live Gemini Vision Extractor (`gemini-3.8-flash`)**: Translates visual pie slices or brokerage tables into standard US tickers and weights via structured JSON schema enforcement. Never returns mocked or hardcoded JSON fallback payloads—if `GEMINI_API_KEY` is missing or an image contains no valid holdings, the server returns explicit HTTP `422`/`502`/`503` errors surfaced directly in the UI.
- **5-Step Agentic Stock Infrastructure Research & Verification Loop (`src/features/agent/stockResearchAgent.ts`)**: Resolves arbitrary unseen US tickers (e.g., `TSM`, `ASML`, `PLD`, `VST`, `DUK`) through a traceable 5-step workflow:
  1. `lookup_sec_edgar_company`: Queries the live US SEC EDGAR company registry (`sec.gov/files/company_tickers.json` and `data.sec.gov/submissions/CIK...`) for CIK, legal name, SIC industry classification, and headquarters state.
  2. `ground_company_us_facilities`: Invokes Gemini (`gemini-3.8-flash`) with function-calling tool declarations to formulate an investigation plan and identify 3 physical US facilities (Corporate HQ, Data Center, Power Supply, or Wafer Fab).
  3. `query_fema_usgs_county_hazard`: Cross-references each facility's city/state against `agentverse/finance/public_data_reference.json` and state FEMA NRI v1.19 / USGS NSHM 2023 baselines (FIPS code, coordinates, Peak Ground Acceleration in g, and hurricane/seismic rating).
  4. `calculate_deterministic_stock_risk`: Computes facility-level `unpricedImpactPct`, composite `exposureScore` (/100), `unpricedRiskPct`, and `maxEventDrawdownPct` deterministically in TypeScript (never trusting LLM-generated arithmetic).
  5. `verify_profile_guardrails`: Runs a deterministic verification gate confirming continental US coordinate bounds and the exact rollup invariant (`sum(site.unpricedImpactPct) === stock.unpricedRiskPct`).
- **Deterministic Text Parser (`parsePortfolioText`)**: Resilient regex engine handling CSV, TSV, colon/equals syntax, stripping numbered list prefixes, and ignoring standard financial headers.

### 5.2 Curated Federal Infrastructure Roster (`STOCK_DATABASE`)
- 38 physical facilities spanning 14 major equities (`NVDA`, `MSFT`, `AMZN`, `META`, `GOOGL`, `AAPL`, `TSLA`, `INTC`, `AMD`, `AVGO`, `ORCL`, `NEE`, `EQIX`, `XOM`).
- Physical classifications across four tiers:
  1. **Data Centers**: High-density AI computing clusters and hyperscale cloud nodes.
  2. **Power Supplies**: Dedicated nuclear stations, high-voltage ERCOT/PJM substations.
  3. **Corporate HQs**: Executive leadership campuses and core engineering hubs.
  4. **Wafer Fabs**: Semiconductor cleanrooms and fabrication plants.

### 5.3 Interactive Geographic Map (`USInfrastructureMapTab`)
- High-clarity SVG map of the continental United States.
- Deterministic radial spacing for co-located campuses (e.g. Santa Clara, CA or Ashburn, VA) preventing pin occlusion.
- Transparent atmospheric hazard overlays for the **Atlantic/Gulf Hurricane Corridor** and **California Hayward/San Andreas Fault Belt**.
- Real-time filtering by natural hazard type and facility asset category.

### 5.4 Constrained Risk Hedge Optimizer & Traceable Reasoning (`portfolioOptimizer.ts`, `traceableMathEngine.ts`)
- Evaluates individual equity unpriced risk severity (`|s_i|`) against the portfolio severity threshold (`s_threshold`).
- Uses bounded proportional waterfilling (`allocateBounded`) to shift weight from over-exposed equities to defensive holdings.
- **Per-Holding "Trace Math" Audit Drawer (`computeHoldingReasoningTraces`)**: Shows the exact facility-level rollup equation, severity spread, waterfilling priority share %, individual ±5.0 pt cap check, and final weight adjustment alongside every holding.
- **Deterministic Guardrail Verification (`verifyPortfolioGuardrails`)**:
  - Single-stock weight shift `|w_hedged - w_current| ≤ 5.0` percentage points (`passedDeltaCap`).
  - One-way portfolio turnover `0.5 × sum(|w_hedged - w_current|) ≤ 15.0%` (`passedTurnoverCap`).
  - All weights `≥ 0%` (`passedLongOnly`) and total portfolio weight `= 100.0%` (`passedWeightSum`).
- **Physical Catastrophe Stress Simulator (`evaluateStressScenario`)**: Deterministically simulates **USGS M7.1 Hayward Fault Rupture**, **NOAA Cat-4 Gulf/Atlantic Hurricane Landfall**, and **EIA ERCOT/PJM Dual-Grid Mega-Outage** scenarios across all mapped corporate facilities.

### 5.5 Institutional Risk Metrics & Declared Benchmarks (`metricsCalculator.ts`, `JudgeAuditAndGovernanceTab.tsx`)
- **Exposure Score (0-100)**: Points aggregated from facility types plus regional corridor clustering penalties.
- **Unpriced Risk Drag**: Projected equity discount due to unpriced physical hazard vulnerability.
- **Sharpe & Sortino Ratios**: Risk-adjusted returns net of institutional turnover transaction costs (18 bps per 100% turnover).
- **99% Tail CVaR & Max Event Drawdown**: Simulated 1-in-100 year disaster portfolio losses.
- **Declared Benchmark Suite (`computeDeclaredBenchmarks`)**: Compares (1) Current Baseline, (2) Aftershock Constrained Hedge, (3) Equal-Weight (1/N) Naive Benchmark, and (4) Unconstrained Inverse-Hazard Rebalance.

### 5.6 Comprehensive Export Subsystem (`src/features/export/*`)
- **Markdown (.md)**: Executive report with comparative metric tables, exposure score justifications, and citations.
- **CSV (.csv)**: Multi-section tabular format for Excel, Python pandas, and R workflows.
- **JSON (.json)**: Machine-readable payload for enterprise quantitative pipelines.

---

## 6. Authoritative Open Data Provenance

All facility hazards, coordinates, and power capacities are verified against official free public datasets:

| Data Source | Authority / Agency | Public Domain / License | Application Scope |
| :--- | :--- | :--- | :--- |
| **FEMA National Risk Index (NRI v1.19)** | Federal Emergency Management Agency | Public Domain (17 U.S.C. § 105) | County hurricane and earthquake annualized hazard ratings |
| **USGS National Seismic Hazard Model (NSHM 2023)** | US Geological Survey | Public Domain (17 U.S.C. § 105) | 2% in 50-year peak ground acceleration (PGA) fault models |
| **NOAA HURDAT2** | National Oceanic & Atmospheric Administration | Public Domain (17 U.S.C. § 105) | Atlantic & Gulf tropical cyclone best-track historical paths |
| **Epoch AI Frontier Data Centers** | Epoch AI Research | CC BY 4.0 | Hyperscale data center cluster geolocations & capacities |
| **PNNL IM3 Open Source Data Center Atlas** | Pacific Northwest National Laboratory | Open Database License (ODbL) | National grid interconnected compute facilities |
| **Form EIA-860** | US Energy Information Administration | Public Domain | Utility substations and electric generator interconnects |
| **SEC EDGAR Form 10-K (Item 2 Properties)** | US Securities & Exchange Commission | Public Domain | Physical corporate headquarters, wafer fabs, and campuses |

---

## 7. Verification & Benchmarking Workflow

The codebase undergoes automated verification via `agentverse/finance/bench.py` (accessible both via CLI and live in the UI via `GET /api/audit/run-benchmark` in the **Benchmarks & Governance** tab):
- **Real-Data Audit**: Verifies all 38 facilities against public data reference benchmarks.
- **Logic Suite**: Tests 25 hand-calculated calibration cases and 100 unseen out-of-sample hold-out scenarios (`H01`–`H100`), validating parser resilience, unseen ticker generalization, hedge bounds, and metrics integrity.
- **Linting & Compilation**: Monitored via TypeScript compiler checks (`tsc -b`) and ESLint.
