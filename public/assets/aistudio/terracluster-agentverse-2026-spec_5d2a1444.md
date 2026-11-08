# TerraCluster — US AI Data-Centre Physical Risk & Correlated Tail-Loss Auditor
**One-Line Pitch:** "How much of your portfolio depends on a few AI campuses not being hit by the same storm or quake?"
**Track:** Agentverse 2026 Finance Track
**Target User:** Risk Analyst / Portfolio Manager at an AI-Infrastructure Equity Fund

---

## 1. Executive Project Specification & Rubric Alignment

### 1.1 Core Problem & Differentiation
Standard physical-risk tools (MSCI Climate VaR, BlackRock Aladdin Climate, and the 2022 State Street Russell 1000 study) suffer from three critical flaws when applied to concentrated equity portfolios:
1. **Look-Ahead Bias:** Applying present-day physical risk scores backward across historical test windows invalidates backtest metrics.
2. **Additive Tail-Risk Fallacy:** Computing portfolio risk as a weighted sum of stock scores ignores shared-geography concentration (e.g., when Digital Realty, Equinix, and colocation tenants share Loudoun County, VA or Santa Clara, CA).
3. **Opaque Scoring & Unmapped Assets:** Ready-made vendor scores correlate at -0.10 to 0.49, and naive pipelines treat companies with vague 10-K disclosures as having zero exposure.

### 1.2 Reported Headline Metrics
For every holding and for the portfolio as a whole, TerraCluster reports:
- **Expected Annual Loss (EAL % of value)** with a 90% uncertainty band.
- **1-in-100-Year Tail Loss (VaR_99 % of value)** with a 90% uncertainty band.
- **Site Coverage Ratio (%)** (geocoded MW capacity / total disclosed MW capacity) paired with a hard **Unknown-Site Safety Lock**.

---

## 2. Four-Layer Technical Architecture (Maths Kept Strictly Out of the LLM)

### Layer 01: Point-in-Time Corpus & Spatial Hazard Ingestion (Deterministic Code)
- Harvests SEC EDGAR 10-K filings (Item 1, Item 1A, Item 2 Properties) filtered strictly by `acceptance_datetime <= evaluation_date`.
- Ingests open US data-centre registries: **Epoch AI Frontier Data Centers Hub** (CC BY 4.0), **PNNL IM3 Open Source Data Center Atlas** (ODbL), and **FracTracker US Data Centers Tracker** (>1,500 sites).
- Pre-joins facility polygons/centroids to **USGS 2023 National Seismic Hazard Model (PGA 2% in 50-year)**, **NOAA HURDAT2 historical hurricane wind swaths**, and **FEMA National Risk Index (NRI) / Hazus 6.1** fragility curves.

### Layer 02: Agentic Facility Attribution & Ownership Disambiguation (LLM Extraction)
- Resolves unstructured entity links between listed equities and physical campuses using 10-Ks, municipal permits, and announcements.
- Classifies the exact contractual risk role:
  - `OWNER_LANDLORD` (REITs: DLR, EQIX — bears shell/chiller capex + rent abatement)
  - `ANCHOR_TENANT` / `NEO_CLOUD` (CORZ, APLD, IREN — bears immediate GPU SLA downtime)
  - `HYPERSCALE_SELF` (GOOGL, MSFT, AMZN — high regional failover mitigation \phi ~ 0.88)
- Attaches verbatim character-span quotes and confidence scores `c_{i,s} in [0, 1]`.

### Layer 03: Deterministic Vulnerability & Shared-Geography Event Simulator (Pure Code)
- Computes site-level loss `L_{i,s}(e) = V_{role}(I(e, x_s)) * (1 - \phi_i) * \omega_{i,s}`.
- Penalizes unmapped capacity `(1 - c_i)` with the 90th-percentile US hazard prior so missing disclosures never score as safe.
- Simulates joint spatial catastrophe footprints (e.g., USGS M7.1 Hayward Fault earthquake, Category 4 Ashburn VA hurricane track) across all holdings simultaneously.

### Layer 04: Code-Enforced Risk Controls & Paper Approval Gate (Hard Policy Engine)
- **Paper-Only Mandate:** Human analyst reviews and approves all weight adjustments on paper.
- **Unknown-Site Safety Lock:** Blocks low risk scores and prohibits weight increases when `site_coverage < 60%`.
- **Position & Turnover Caps:** Enforces `+/-5.0%` maximum weight delta per stock and `15.0%` maximum one-way turnover in code.
- **Immutable Audit Trail:** Logs SHA-256 hash of inputs, triggered blocks, and human sign-off.

---

## 3. Data Collection & Validation Workflows
1. **Hand-Labelled Extraction Benchmark:** Evaluate agentic recall and Owner/Tenant precision on a hand-labelled gold set of 25 US companies before running portfolio backtests.
2. **Hotspot Baseline Sanity Check:** Confirm mapped US data centres reproduce the empirical **34% Hurricane Hotspot** and **29% Earthquake Hotspot** distribution.
3. **Out-of-Sample Event Validation:** Freeze physical Hazus priors upfront; test on held-back hurricane seasons net of 10 bps trading costs against (1) Original Weights and (2) State Street-style Sector-Neutral Exclusion Screen. Report Drawdown, Expected Shortfall, and Ledoit-Wolf Sharpe confidence intervals honestly.

---

## 4. User Interface Design Components
- **Component 01:** Exposure Ranking Leaderboard with 90% Uncertainty Bands, Site Coverage %, and Unknown-Site Safety Lock indicators.
- **Component 02:** Shared-Geography Correlated Event Simulator contrasting Naive Independent Sum vs. Joint Metro Footprint Loss.
- **Component 03:** Point-in-Time 10-K Attribution Drawer with verbatim Item 2 quotes, bitemporal cutoff verification, and Owner/Tenant tags.
- **Component 04:** Human-in-the-Loop Paper Rebalance Gate with live stress-test triggers (e.g. blocking a -30% shift or unmapped stock overweight).
