# Aftershock

**Aftershock** is an institutional-grade physical climate risk analytics engine that evaluates equity portfolios against facility-level natural disaster exposure (hurricanes, earthquakes, and co-located infrastructure failure). It models corporate exposure across critical infrastructure assets—including data centers, power supply substations, corporate headquarters, and wafer fabrication facilities—using open federal and research data (FEMA National Risk Index, USGS National Seismic Hazard Model, NOAA HURDAT2, Epoch AI, PNNL, EIA-860, and SEC Form 10-K).

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

2. **Hold-Out Benchmark Suite (15 unseen hold-out cases)**:
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

## Architecture Overview

- `server.ts`: Express backend handling API requests, file uploads, and Vite middleware / static asset serving.
- `src/App.tsx`: Main layout with cracked-circle logo, navigation tabs, and portfolio score badge.
- `src/components/PortfolioUploadTab.tsx`: Portfolio dropzone, donut visualization, exposure score breakdown, and current vs. risk-hedged comparison.
- `src/components/USInfrastructureMapTab.tsx`: Interactive SVG map of US data centers, power supply, HQs, and wafer fabs with hazard overlays.
- `src/data/aftershockData.ts`: Deterministic calculation engine for exposure scores, risk-hedging optimization, turnover constraints, and facility database.
