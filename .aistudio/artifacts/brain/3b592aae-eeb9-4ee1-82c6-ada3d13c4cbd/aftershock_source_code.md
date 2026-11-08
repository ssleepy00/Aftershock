# Aftershock — Standalone Source Code Reference

This separate file contains the core source code for **Aftershock**, kept completely outside the live investor-facing product UI.

---

## 1. Python Hazard & Unpriced Valuation Risk Engine (`aftershock_engine.py`)

```python
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class InfrastructureSite:
    ticker: str
    name: str
    city: str
    state: str
    category: str
    lat: float
    lng: float
    hazard: str          # 'Hurricane' | 'Earthquake' | 'Low'
    risk_level: str      # 'high' | 'moderate' | 'low'
    unpriced_impact_pct: float  # e.g., -0.9 means -0.9% fair value discount not priced in

@dataclass
class StockHolding:
    ticker: str
    company: str
    weight: float
    unpriced_risk_pct: float
    primary_hazard: str
    sites: List[InfrastructureSite]

def compute_portfolio_unpriced_risk(holdings: List[StockHolding]) -> Dict[str, float]:
    """
    Computes the portfolio-wide unpriced disaster valuation drag and
    generates risk-hedged portfolio weights.
    """
    total_weight = sum(h.weight for h in holdings) or 100.0
    normalized = [(h, (h.weight / total_weight) * 100.0) for h in holdings]

    current_unpriced_risk = sum(
        (w / 100.0) * h.unpriced_risk_pct for h, w in normalized
    )

    # Tilt weights away from severe unpriced tail risk (<-1.0%) toward resilient names
    raw_scores = []
    for h, w in normalized:
        severity = abs(h.unpriced_risk_pct)
        factor = 0.62 if severity >= 1.2 else (0.85 if severity >= 0.8 else 1.35)
        raw_scores.append(w * factor)

    score_sum = sum(raw_scores) or 100.0
    hedged_weights = [(s / score_sum) * 100.0 for s in raw_scores]

    hedged_unpriced_risk = sum(
        (hw / 100.0) * h.unpriced_risk_pct
        for (h, _), hw in zip(normalized, hedged_weights)
    )

    return {
        "current_unpriced_risk_pct": round(current_unpriced_risk, 2),
        "hedged_unpriced_risk_pct": round(hedged_unpriced_risk, 2),
        "protection_gain_pct": round(abs(current_unpriced_risk - hedged_unpriced_risk), 2),
    }
```

---

## 2. Application Entry & Navigation (`src/App.tsx`)

- Renders the cracked dark-brown circle logo and **Aftershock** wordmark.
- Provides a 2-tab pill switcher:
  1. **Portfolio (`src/components/PortfolioUploadTab.tsx`)**: Drag-and-drop any screenshot, pie chart, or CSV to extract holdings automatically, view the interactive allocation donut, and toggle 1-click **Risk-Hedged** weights.
  2. **US Infrastructure Map (`src/components/USInfrastructureMapTab.tsx`)**: Plots every stock's US data centers, wafer fabs, and grid hubs on a color-coded US hazard map alongside the **Stocks in Danger** list showing the exact `%` unpriced discount in red (e.g., `-1.4%`, `-1.1%`, `-0.9%`).
