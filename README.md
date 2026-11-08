# Aftershock

**Aftershock** is an institutional-grade physical climate risk analytics engine that evaluates equity portfolios against facility-level natural disaster exposure (hurricanes, earthquakes, and co-located infrastructure failure). It models corporate exposure across critical infrastructure assets—including data centers, power supply substations, corporate headquarters, and wafer fabrication facilities—using open federal and research data (FEMA National Risk Index, USGS National Seismic Hazard Model, NOAA HURDAT2, Epoch AI, PNNL, EIA-860, and SEC Form 10-K).

# URL
https://aftershock.ai.studio
---

## Prerequisites

- **Node.js**: `>= 22.18.0`
- **npm**: `>= 10.0.0`
- **Python**: `>= 3.10` (for benchmark and validation harness)

---

## Getting Started

### 1. Installation

Install all project dependencies:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key environment variables:
- `PORT`: Port for the Express server (defaults to `3000`).
- `GEMINI_API_KEY`: Optional Gemini AI API key for multimodal portfolio image extraction (fallback regex/heuristics are enabled when unconfigured).
- `NODE_ENV`: Set to `production` in production environments.

### 3. Development Mode

Start the development server with Hot Module Replacement and live TypeScript execution:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Testing & Quality Assurance

### Linting & Type Checking

Validate TypeScript types without emitting build artifacts:

```bash
npm run lint
```

### Benchmark & Risk Audit Suites

The project includes an adversarial verification and data audit harness in `agentverse/finance/bench.py`:

1. **Practice Benchmark Suite (25 hand-worked cases + Real Public Data Audit)**:
   ```bash
   python3 agentverse/finance/bench.py --suite practice
   ```
   Verifies:
   - CSV and plain-text ticker and weight parsing.
   - Maximum weight change per stock (`<= 5.0` percentage points).
   - Maximum portfolio one-way turnover (`<= 15.0%`).
   - Transaction cost deduction and risk metric monotonicity.
   - Public-data verification of all 38 mapped infrastructure sites against FEMA NRI v1.19, USGS NSHM, NOAA HURDAT2, EIA-860, and SEC 10-K filings.

2. **Hold-Out Benchmark Suite (100 unseen out-of-sample hold-out cases)**:
   ```bash
   python3 agentverse/finance/bench.py --suite holdout
   ```

---

## Production Build & Deployment

### 1. Build the Frontend

Compile the React frontend into static assets in `dist/`:

```bash
npm run build
```

### 2. Start the Production Server

Run the server with production environment variables:

```bash
NODE_ENV=production npm start
```

Or customize the port:

```bash
PORT=8080 NODE_ENV=production npm start
```

In production mode:
- Express serves static production assets from `dist/`.
- Single-page application client routing is handled by the `*` catch-all route.
- API endpoints (`/api/portfolio/extract-upload`, `/api/source-files`) remain active.

---

## Architecture & Design Documentation

For complete mathematical definitions, architectural design, and data provenance, see **[Design.md](./Design.md)**.

- `Design.md`: Comprehensive system specification, guardrails, and data provenance.
- `server.ts`: Express 4 backend handling multimodal Gemini Vision API extractions, live unseen ticker resolution, benchmark execution, static production serving, and source auditing.
- `src/config/appConfig.ts`: Centralized application constants, AI models, and financial risk guardrails.
- `src/utils/logger.ts`: Centralized telemetry logging all function calls and sanitized GenAI requests.
- `src/features/portfolio/`: Modular domain engines for parsing (`portfolioParser.ts`), stock database (`stockDatabase.ts`), optimization (`portfolioOptimizer.ts`), and risk metrics (`metricsCalculator.ts`).
- `src/features/audit/traceableMathEngine.ts`: Per-holding traceable reasoning formulas, declared benchmark comparisons, and federal catastrophe stress simulator.
- `src/features/export/`: Modular exporters for Markdown (`markdownExporter.ts`), CSV (`csvExporter.ts`), JSON (`jsonExporter.ts`), and browser downloads (`fileDownloader.ts`).
- `src/components/PortfolioUploadTab.tsx`: Portfolio dropzone, live unseen ticker tester, catastrophe stress simulator, Trace Math drawers, and current vs. risk-hedged comparison.
- `src/components/USInfrastructureMapTab.tsx`: Interactive SVG map of US data centers, power supply, HQs, and wafer fabs with hazard overlays.
- `src/components/JudgeAuditAndGovernanceTab.tsx`: Declared benchmark comparison matrix, live 125-case hold-out runner, interactive guardrail intercept demo, live telemetry log, and dataset licence registry.
- `src/components/PortfolioExportModal.tsx`: Multi-format export dialog with instant copy and file download.
- `src/data/aftershockData.ts`: Central re-export hub ensuring backward compatibility for internal imports and automated test runners.

---

## Institutional Validation, Benchmarks & Governance

1. **Traceable Quantitative Attribution (Deterministic Math Engine)**:
   - Gemini (`gemini-3.8-flash`) is used strictly for structured entity extraction from screenshots and agentic facility discovery for unseen tickers. All portfolio weights, waterfilling deltas, Exposure Scores, and risk ratios are computed deterministically in TypeScript (`src/features/portfolio/` and `src/features/audit/traceableMathEngine.ts`).
   - Clicking **Trace Math** on any holding displays the exact facility hazard rollup equation and bounded waterfilling formula alongside the recommendation.
2. **Out-of-Sample Hold-Out Validation, Execution Costs & Uncertainty Bounds**:
   - **Validation Suite**: Passes **25/25 Calibration Cases** + **100/100 Out-of-Sample Hold-Out Cases (125/125 = 100%)** + **35/35 Federal Facility Provenance Checks** (`agentverse/finance/bench.py`).
   - **Institutional Execution Costs**: Deducts **18 bps (0.18%) per 100% one-way turnover** across all hedged Sharpe, Sortino, and net risk protection calculations.
   - **Declared Benchmarks**: Compares Aftershock Constrained Hedge against (1) Unhedged Baseline, (2) Equal-Weight (1/N) Naive Benchmark, and (3) Unconstrained Inverse-Hazard Rebalance.
   - **Model Uncertainty Bounds**: Reports **±0.35%** 95% confidence bounds on Unpriced Disaster Drag and **±4 pts (/100)** on Exposure Score from county-level FEMA NRI discretization and USGS 2%-in-50-yr PGA variance.
3. **Pre-Trade Mandate Controls & Operational Governance**:
   - Code-enforced guardrails (`verifyPortfolioGuardrails`): Max Weight Shift ≤ 5.0 pts per stock, One-Way Turnover ≤ 15.0%, Total Portfolio Weight = 100.0%, and Long-Only weights (≥ 0%).
   - Every function call and GenAI call is logged via `src/utils/logger.ts` (with base64 binary images stripped) and inspectable live in the **Benchmarks & Governance** tab.
   - **Advisory Simulation Only**: Requires explicit sign-off via the **Human Approval Gate**; never connects to brokerage order routers or live financial accounts.
4. **Data Provenance, Open Licenses & Modeled Scenario Disclosure**:
   - Empirical facility coordinates and hazard ratings are sourced from **FEMA NRI v1.19**, **USGS NSHM 2023**, **NOAA HURDAT2**, **SEC EDGAR Form 10-K**, and **EIA-860** (*Public Domain, 17 U.S.C. § 105*), plus **PNNL IM3 Atlas** (*ODbL v1.0*) and **Epoch AI** (*CC BY 4.0*).
   - Equity-level `unpricedRiskPct` and 1-in-100 year `maxEventDrawdownPct` are explicitly labeled as **Modeled Scenario Projections** rather than historical trading backtests.



