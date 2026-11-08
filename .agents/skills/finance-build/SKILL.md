---
name: finance-build
description: Deterministic financial calculation engineering, pure functions, and single-defect remediation.
---

# Finance-Build Skill

## Core Mandate
1. **Maths in Plain Functions**: Keep all parsing, weight normalization, risk-hedging, turnover capping, exposure scoring, and portfolio metric calculations in plain, deterministic, exported functions that automated tests can call directly without a browser or LLM.
2. **One Defect at a Time**: Fix one reported failure (or one atomic requirement failure) per step, then ask the tester to re-run `agentverse/finance/bench.py`.
3. **Enforce Spec Guardrails in Code**:
   - Per-stock hedge delta cap: `|hedgedWeight - weight| <= 5.0` percentage points.
   - Portfolio one-way turnover cap: `0.5 * sum(|hedgedWeight - weight|) <= 15.0%`.
   - Weights must sum to `100.0%` (within `+/- 0.1%` rounding tolerance) and never be negative.
4. **Strict Boundary**: Never edit test files, answer keys, or anything inside `agentverse/`.
