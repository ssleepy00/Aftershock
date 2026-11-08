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
│   │   ├── portfolio/
│   │   │   ├── types.ts                     # Domain interfaces, hazard types, and metric models
│   │   │   ├── stockDatabase.ts             # 38 verified facilities, stock database, and portfolio presets
│   │   │   ├── portfolioParser.ts           # Resilient CSV, TSV, and text ingestion parser
│   │   │   ├── portfolioOptimizer.ts        # Constrained hedge optimizer (delta and turnover caps)
│   │   │   └── metricsCalculator.ts         # Dual-state physical risk and financial performance metrics
│   │   └── export/
│   │       ├── markdownExporter.ts          # Institutional Markdown report generator
│   │       ├── csvExporter.ts               # Multi-section tabular CSV report generator
│   │       ├── jsonExporter.ts              # Machine-readable structured JSON serializer
│   │       └── fileDownloader.ts            # Client-side blob provisioning and download trigger
│   ├── components/
│   │   ├── PortfolioUploadTab.tsx           # Dropzone, multimodal upload, and executive risk metrics
│   │   ├── USInfrastructureMapTab.tsx       # Interactive US SVG hazard map & facility deep-dive
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
  - `GEMINI_VISION_MODEL`: `'gemini-3.8-flash'` for multimodal image & screenshot extraction.
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

## 4. Structured Observability & Telemetry (`src/utils/logger.ts`)

Aftershock implements enterprise-grade observability:
1. **Function Call Tracing (`logFunctionCall`)**:
   - Emits structured info logs containing the function name and caller-supplied parameters.
   - Detects piped execution environments (`process.stdout.isTTY === undefined`) and automatically redirects logs to `process.stderr` so machine-to-machine JSON pipelines (such as `agentverse/finance/bench.py`) remain completely unpolluted.
2. **Generative AI Call Tracing (`logGenAiCall`)**:
   - Captures target model, generation configuration, prompt text, and responses.
   - Strips inline binary data (`inlineData.data` base64 strings) via `sanitizePromptPartsForLogging` to prevent log bloating while preserving prompt auditing.

---

## 5. Core Application Features

### 5.1 Multimodal Ingestion & Vision Extraction
- **Drag-and-Drop Zone**: Accepts PNG/JPG brokerage screenshots, pie charts, and tabular files.
- **Live Gemini Vision Extractor (`gemini-3.8-flash`)**: Translates visual pie slices or brokerage tables into standard US tickers and weights via structured JSON schema enforcement. Never returns mocked or hardcoded JSON fallback payloads—if `GEMINI_API_KEY` is missing or an image contains no valid holdings, the server returns explicit HTTP `422`/`502`/`503` errors surfaced directly in the UI.
- **Deterministic Text Parser (`parsePortfolioText`)**: Resilient regex engine handling CSV, TSV, colon/equals syntax, stripping numbered list prefixes, and ignoring standard financial headers.


### 5.2 Curated Federal Infrastructure Roster (`STOCK_DATABASE`)
- 38 physical facilities spanning 13 major equities (`NVDA`, `MSFT`, `AMZN`, `META`, `GOOGL`, `AAPL`, `TSLA`, `INTC`, `AMD`, `AVGO`, `ORCL`, `NEE`, `EQIX`, `XOM`).
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

### 5.4 Constrained Risk Hedge Optimizer & Deterministic Guardrail Verification (`buildPortfolioProfiles`, `verifyPortfolioGuardrails`)
- Evaluates individual equity unpriced risk severity ($|s_i|$) against the portfolio mean severity ($\bar{s}$).
- Uses bounded proportional waterfilling (`allocateBounded`) to shift weight from over-exposed equities to defensive holdings.
- **Deterministic Guardrail Verification (`verifyPortfolioGuardrails`)**:
  - $|w_{\text{hedged}, i} - w_{\text{current}, i}| \le 5.0$ percentage points (`passedDeltaCap`).
  - $0.5 \times \sum |w_{\text{hedged}, i} - w_{\text{current}, i}| \le 15.0\%$ (`passedTurnoverCap`).
  - All weights $\ge 0\%$ (`passedLongOnly`) and $\sum w_i = 100.0\%$ (`passedWeightSum`).
- **Human Approval Gate (Advisory Only)**:
  - All risk-hedged portfolio proposals are strictly advisory decision-support outputs with zero autonomous trading execution, gated by an explicit human analyst approval check in the UI.

### 5.5 Institutional Risk & Performance Metrics (`computePortfolioMetrics`)
- **Exposure Score (0-100)**: Points aggregated from facility types plus regional corridor clustering penalties.
- **Unpriced Risk Drag**: Projected equity discount due to unpriced physical hazard vulnerability.
- **Sharpe & Sortino Ratios**: Risk-adjusted returns net of institutional turnover transaction costs.
- **99% Tail CVaR & Max Event Drawdown**: Simulated 1-in-100 year disaster portfolio losses.

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

The codebase undergoes automated verification via the `agentverse/finance/bench.py` test suite:
- **Real-Data Audit**: Verifies all 38 facilities against public data reference benchmarks.
- **Logic Suite**: Tests 25 hand-calculated practice cases and 15 unseen hold-out scenarios, validating parser resilience, hedge bounds, and metrics integrity.
- **Linting & Compilation**: Monitored via TypeScript compiler checks (`tsc -b`) and ESLint.
