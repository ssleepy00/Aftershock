# Agentverse 2026 Finance Track Kit — START HERE

Welcome to the Agentverse 2026 Finance Track evaluation and engineering kit.

## 1. Installing the Four Core Skills
Install all four skills into `.agents/skills/` before creating custom subagents:
1. `.agents/skills/finance-test/SKILL.md` — Adversarial & hand-worked verification, public-data auditing, practice vs. unseen hold-out split, and failure reporting format.
2. `.agents/skills/finance-build/SKILL.md` — Deterministic financial engineering, pure testable calculation functions, and one-at-a-time defect remediation.
3. `.agents/skills/finance-data/SKILL.md` — Point-in-time public data verification using free open datasets (FEMA NRI, USGS NSHM, NOAA HURDAT2, SEC EDGAR 10-K, Epoch AI, PNNL, EIA-860) with explicit provenance and license tracking.
4. `.agents/skills/finance-risk/SKILL.md` — Hard risk controls, position delta caps (`<= 5.0` percentage points per stock), one-way turnover caps (`<= 15.0%`), transaction cost deduction, and unknown-site coverage safety gates.

## 2. Subagent Separation of Duties
Create two strictly separated subagents in `.agents/agents/`:
- **Tester (`aftershock-tester.md`)**: Follows `finance-test`, `finance-data`, and `finance-risk`. Writes pre-declared validation rules, hand-worked practice cases (25), unseen hold-out cases (15), audits facility data against public sources, and runs `python3 agentverse/finance/bench.py`. Never modifies application code.
- **Fixer (`aftershock-fixer.md`)**: Follows `finance-build` and `finance-risk`. Fixes one reported failure at a time in plain, exported functions callable by the test runner. Never edits tests, answer keys, or files inside `agentverse/`.

## 3. Running the Benchmark Harness
Run `python3 agentverse/finance/bench.py --suite practice` during iterative fixing, and `python3 agentverse/finance/bench.py --suite holdout` exactly once after all practice and data checks pass.
