---
name: finance-test
description: Adversarial verification, hand-worked test cases, real public data auditing, and hold-out evaluation for financial applications.
---

# Finance-Test Skill

## Core Mandate
1. **Write Rules First**: Before inspecting any facility or running any code, write down the exact falsifiable rule for what counts as a `PASS`, `FAIL`, or `NOT_VERIFIED`.
2. **Hand-Worked Expected Answers**: Every test case must have its expected numerical or structural answer worked out by hand from the specification before seeing the code's output.
3. **Real Public Data Only**: Verify corporate facilities against free public datasets (FEMA National Risk Index v1.19, USGS 2023 National Seismic Hazard Model, NOAA HURDAT2, SEC EDGAR Form 10-K Item 2, Epoch AI Frontier Data Centers Hub, PNNL Data Center Atlas, and US EIA-860). If a facility is not covered by public open datasets, mark it `NOT_VERIFIED` — never count unverified data as a pass.
4. **Practice vs. Hold-Out Split**:
   - Write 25 practice test cases covering CSV/text parsing, weight normalization, risk-hedged weight limits (`<= 5.0` pts per stock, `<= 15.0%` one-way turnover), transaction costs, and portfolio metrics.
   - Only after all 25 practice cases pass, write 15 unseen hold-out cases and execute them once with no subsequent code edits.
5. **Failure Reporting Format**: Report every failure with:
   - `Test ID & Input`
   - `Expected Result` (worked out by hand)
   - `Actual Result`
   - `Broken Requirement`
6. **Strict Boundary**: Never edit application source code (`src/` or `server.ts`).
