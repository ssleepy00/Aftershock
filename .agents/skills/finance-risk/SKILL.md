---
name: finance-risk
description: Quantitative risk controls, position delta caps, turnover constraints, and transaction cost accounting.
---

# Finance-Risk Skill

## Core Mandate
1. **Single-Stock Rebalance Cap (`<= 5.0` pts)**: No stock's hedged weight may deviate from its initial normalized weight by more than `+/- 5.0` percentage points (`|w_hedged,i - w_initial,i| <= 5.0 + 1e-6`).
2. **One-Way Turnover Cap (`<= 15.0%`)**: One-way portfolio turnover `T = 0.5 * sum_i |w_hedged,i - w_initial,i|` must not exceed `15.0%`.
3. **Full Investment & Non-Negativity**: `w_hedged,i >= 0` for all `i`, and `sum_i w_hedged,i = 100.0%`.
4. **Transaction Cost Accounting**: Deduct one-way turnover cost from net expected return and net unpriced risk protection before computing net Sharpe and Sortino ratios.
