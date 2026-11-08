#!/usr/bin/env python3
"""
Agentverse 2026 Finance Track — Benchmark & Public-Data Audit Runner (bench.py)
Executes:
1. Real Public Data Audit against src/data/aftershockData.ts using pre-declared rules
   in agentverse/finance/public_data_reference.json.
2. Logic Suite (25 practice cases or 15 unseen hold-out cases) by invoking the live
   TypeScript functions in src/data/aftershockData.ts via tsx.
"""

import argparse
import json
import math
import os
import subprocess
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REF_PATH = os.path.join(os.path.dirname(__file__), "public_data_reference.json")
PRACTICE_PATH = os.path.join(os.path.dirname(__file__), "practice_tests.json")
HOLDOUT_PATH = os.path.join(os.path.dirname(__file__), "holdout_tests.json")


def run_ts_bridge(payload: dict) -> dict:
    """
    Runs a small inline TypeScript snippet via npx tsx to call the live functions
    exported by src/data/aftershockData.ts and server.ts CSV parser logic.
    """
    ts_code = """
import * as mod from './src/data/aftershockData.ts';
import fs from 'fs';

const input = JSON.parse(fs.readFileSync(0, 'utf-8'));

// Fallback regex from server.ts if parsePortfolioText is not exported yet
function fallbackServerRegex(textContent: string) {
  const regex = /\\b([A-Z]{2,5})\\b[^0-9\\n]*([0-9]+(?:\\.[0-9]+)?)/g;
  const extracted: { ticker: string; weight: number }[] = [];
  let match;
  while ((match = regex.exec(textContent.toUpperCase())) !== null) {
    const ticker = match[1];
    const weight = parseFloat(match[2]);
    if (weight > 0 && weight <= 100 && !['CSV', 'USD', 'PCT', 'SUM'].includes(ticker)) {
      extracted.push({ ticker, weight });
    }
  }
  return extracted;
}

const parseFn = (mod as any).parsePortfolioText || fallbackServerRegex;

const results: any = {
  hasExportedParser: Boolean((mod as any).parsePortfolioText),
  stockDatabase: mod.STOCK_DATABASE,
  caseOutputs: [],
};

for (const tc of input.cases || []) {
  if (tc.type === 'csv_parser') {
    const out = parseFn(tc.input);
    results.caseOutputs.push({ id: tc.id, output: out });
  } else if (tc.type === 'portfolio_logic') {
    const profiles = mod.buildPortfolioProfiles(tc.input);
    const metrics = mod.computePortfolioMetrics(profiles);
    results.caseOutputs.push({ id: tc.id, profiles, metrics });
  }
}

process.stdout.write(JSON.stringify(results));
"""
    proc = subprocess.run(
        ["npx", "tsx", "-e", ts_code],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        cwd=ROOT_DIR,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"TS execution failed:\n{proc.stderr}")
    return json.loads(proc.stdout)


def audit_real_data(stock_db: dict, ref_data: dict) -> dict:
    county_ref = ref_data["county_reference"]
    fac_ref = ref_data["facility_verification"]

    passed = []
    failed = []
    not_verified = []

    for ticker, stock in stock_db.items():
        for site in stock.get("sites", []):
            sid = site["id"]
            city_norm = site["city"].strip().title()
            state_norm = site["state"].strip().upper()
            county_key = f"{city_norm}|{state_norm}"

            f_info = fac_ref.get(sid)
            if not f_info or f_info.get("status") == "NOT_VERIFIED":
                not_verified.append({
                    "site_id": sid,
                    "ticker": ticker,
                    "name": site["name"],
                    "location": f"{site['city']}, {site['state']}",
                    "source": f_info.get("source", "N/A") if f_info else "N/A",
                    "reason": f_info.get("note", "Site not covered by open public datasets") if f_info else "Site ID not found in public registry",
                })
                continue

            # 1. Check city/state & coordinates against public record
            exp_city = f_info["expected_city"]
            exp_state = f_info["expected_state"]
            if city_norm != exp_city or state_norm != exp_state or ("Susquehanna" in site["name"] and state_norm == "VA"):
                failed.append({
                    "site_id": sid,
                    "ticker": ticker,
                    "input": f"{sid} ({site['name']}) at {site['city']}, {site['state']}",
                    "expected": f"Verified plant in {exp_city}, {exp_state} (Susquehanna is in Salem Township, PA; Louisa/Mineral VA is Dominion North Anna)",
                    "actual": f"{site['name']} placed in {site['city']}, {site['state']}",
                    "requirement": f"Real-Data Location Accuracy ({f_info['source']})",
                })
                continue

            if abs(site["lat"] - f_info["lat"]) > 0.25 or abs(site["lng"] - f_info["lng"]) > 0.25:
                failed.append({
                    "site_id": sid,
                    "ticker": ticker,
                    "input": f"{sid} coordinates ({site['lat']}, {site['lng']})",
                    "expected": f"({f_info['lat']}, {f_info['lng']}) +/- 0.25 deg",
                    "actual": f"({site['lat']}, {site['lng']})",
                    "requirement": f"Real-Data Coordinate Accuracy ({f_info['source']})",
                })
                continue

            # 2. Check county hazard label & risk level against FEMA NRI v1.19 & USGS NSHM
            c_info = county_ref.get(county_key)
            if not c_info:
                not_verified.append({
                    "site_id": sid,
                    "ticker": ticker,
                    "name": site["name"],
                    "location": f"{site['city']}, {site['state']}",
                    "source": "FEMA_NRI",
                    "reason": f"County {county_key} not in reference table",
                })
                continue

            if site["hazard"] != c_info["expected_hazard"]:
                failed.append({
                    "site_id": sid,
                    "ticker": ticker,
                    "input": f"{sid} ({site['city']}, {site['state']} — FIPS {c_info['fips']})",
                    "expected": f"hazard='{c_info['expected_hazard']}' (FEMA NRI Hurricane={c_info['fema_hurricane']}, Earthquake={c_info['fema_earthquake']}, USGS PGA={c_info['usgs_pga_g']}g)",
                    "actual": f"hazard='{site['hazard']}', riskLevel='{site['riskLevel']}'",
                    "requirement": "FEMA NRI v1.19 & USGS 2023 NSHM County Hazard Classification Rule",
                })
                continue

            if site["riskLevel"] not in c_info["allowed_risk_levels"]:
                failed.append({
                    "site_id": sid,
                    "ticker": ticker,
                    "input": f"{sid} ({site['city']}, {site['state']} — FIPS {c_info['fips']})",
                    "expected": f"riskLevel in {c_info['allowed_risk_levels']} for hazard '{c_info['expected_hazard']}'",
                    "actual": f"riskLevel='{site['riskLevel']}'",
                    "requirement": "FEMA NRI v1.19 Risk Level Consistency Rule",
                })
                continue

            passed.append({
                "site_id": sid,
                "ticker": ticker,
                "name": site["name"],
                "location": f"{city_norm}, {state_norm}",
                "fips": c_info["fips"],
                "hazard": site["hazard"],
                "riskLevel": site["riskLevel"],
                "source": f_info["source"],
            })

    return {"passed": passed, "failed": failed, "not_verified": not_verified}


def evaluate_logic_cases(cases: list, outputs_by_id: dict) -> dict:
    passed = []
    failed = []

    for tc in cases:
        cid = tc["id"]
        out_obj = outputs_by_id.get(cid, {})

        if tc["type"] == "csv_parser":
            actual = out_obj.get("output", [])
            expected = tc["expected"]
            # Compare length and ticker/weight pairs
            ok = len(actual) == len(expected) and all(
                a.get("ticker") == e["ticker"] and abs(float(a.get("weight", 0)) - float(e["weight"])) < 1e-2
                for a, e in zip(actual, expected)
            )
            if ok:
                passed.append({"id": cid, "description": tc["description"]})
            else:
                failed.append({
                    "id": cid,
                    "input": repr(tc["input"]),
                    "expected": json.dumps(expected),
                    "actual": json.dumps(actual),
                    "requirement": tc["requirement"],
                })

        elif tc["type"] == "portfolio_logic":
            profiles = out_obj.get("profiles", [])
            metrics = out_obj.get("metrics", {})
            check = tc["check"]
            exp = tc["expected"]

            if check == "normalize_weights":
                actual_map = {p["ticker"]: p["weight"] for p in profiles}
                ok = all(abs(actual_map.get(k, -999) - v) <= 0.1 for k, v in exp.items())
                if ok:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": json.dumps(exp),
                        "actual": json.dumps(actual_map),
                        "requirement": tc["requirement"],
                    })

            elif check == "sorted_order":
                actual_order = [p["ticker"] for p in profiles]
                if actual_order == exp:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": json.dumps(exp),
                        "actual": json.dumps(actual_order),
                        "requirement": tc["requirement"],
                    })

            elif check == "max_delta_and_turnover":
                deltas = [round(abs(p["hedgedWeight"] - p["weight"]), 2) for p in profiles]
                max_delta = max(deltas) if deltas else 0.0
                turnover = round(0.5 * sum(abs(p["hedgedWeight"] - p["weight"]) for p in profiles), 2)
                sum_hedged = round(sum(p["hedgedWeight"] for p in profiles), 1)
                ok = (
                    max_delta <= exp["max_abs_delta_lte"] + 0.05
                    and turnover <= exp["turnover_lte"] + 0.05
                    and abs(sum_hedged - 100.0) <= 0.15
                )
                if ok:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": f"max_abs_delta <= {exp['max_abs_delta_lte']} pts, turnover <= {exp['turnover_lte']}%, sum == 100.0%",
                        "actual": f"max_abs_delta = {max_delta} pts, turnover = {turnover}%, sum = {sum_hedged}%, weights = {[(p['ticker'], p['weight'], p['hedgedWeight']) for p in profiles]}",
                        "requirement": tc["requirement"],
                    })

            elif check == "exact_hedged_weights":
                actual_map = {p["ticker"]: p["hedgedWeight"] for p in profiles}
                ok = all(abs(actual_map.get(k, -999) - v) <= 0.15 for k, v in exp.items())
                if ok:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": json.dumps(exp),
                        "actual": json.dumps(actual_map),
                        "requirement": tc["requirement"],
                    })

            elif check == "hedged_sum_100":
                sum_hedged = round(sum(p["hedgedWeight"] for p in profiles), 2)
                if abs(sum_hedged - exp) <= 0.15:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": f"sum(hedgedWeight) == {exp}%",
                        "actual": f"sum(hedgedWeight) == {sum_hedged}%",
                        "requirement": tc["requirement"],
                    })

            elif check == "directional_tilt":
                by_t = {p["ticker"]: p for p in profiles}
                dec_p = by_t.get(exp["decrease"])
                inc_p = by_t.get(exp["increase"])
                ok = (
                    dec_p is not None
                    and inc_p is not None
                    and dec_p["hedgedWeight"] < dec_p["weight"]
                    and inc_p["hedgedWeight"] > inc_p["weight"]
                )
                if ok:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": f"{exp['decrease']} hedgedWeight < weight AND {exp['increase']} hedgedWeight > weight",
                        "actual": json.dumps({k: (v["weight"], v["hedgedWeight"]) for k, v in by_t.items()}),
                        "requirement": tc["requirement"],
                    })

            elif check == "metrics_improvement":
                cur = metrics.get("current", {})
                hdg = metrics.get("hedged", {})
                ok = (
                    hdg.get("unpricedRiskPct", -99) > cur.get("unpricedRiskPct", 0)
                    and hdg.get("sharpeRatio", -99) >= cur.get("sharpeRatio", 0)
                    and hdg.get("maxDrawdownPct", -99) > cur.get("maxDrawdownPct", 0)
                )
                if ok:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": "hedged unpricedRiskPct, sharpeRatio, and maxDrawdownPct strictly better than current",
                        "actual": json.dumps({"current": cur, "hedged": hdg}),
                        "requirement": tc["requirement"],
                    })

            elif check == "exact_turnover_tx":
                hdg = metrics.get("hedged", {})
                ok = (
                    abs(hdg.get("turnoverPct", -99) - exp["turnoverPct"]) <= 0.15
                    and abs(hdg.get("transactionCostPct", -99) - exp["transactionCostPct"]) <= 0.01
                )
                if ok:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": json.dumps(exp),
                        "actual": json.dumps({
                            "turnoverPct": hdg.get("turnoverPct"),
                            "transactionCostPct": hdg.get("transactionCostPct"),
                        }),
                        "requirement": tc["requirement"],
                    })

            elif check == "exposure_score_decreases":
                cur_s = metrics.get("current", {}).get("exposureScore", 100)
                hdg_s = metrics.get("hedged", {}).get("exposureScore", 100)
                if hdg_s < cur_s:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": f"hedged.exposureScore < current.exposureScore ({cur_s})",
                        "actual": f"hedged.exposureScore == {hdg_s}",
                        "requirement": tc["requirement"],
                    })

            elif check == "non_negative_and_caps":
                min_w = min(p["hedgedWeight"] for p in profiles)
                max_d = max(abs(p["hedgedWeight"] - p["weight"]) for p in profiles)
                turnover = 0.5 * sum(abs(p["hedgedWeight"] - p["weight"]) for p in profiles)
                ok = (
                    min_w >= exp["min_weight_gte"] - 1e-6
                    and max_d <= exp["max_abs_delta_lte"] + 0.05
                    and turnover <= exp["turnover_lte"] + 0.05
                )
                if ok:
                    passed.append({"id": cid, "description": tc["description"]})
                else:
                    failed.append({
                        "id": cid,
                        "input": json.dumps(tc["input"]),
                        "expected": json.dumps(exp),
                        "actual": f"min_weight={min_w}, max_delta={max_d:.2f}, turnover={turnover:.2f}",
                        "requirement": tc["requirement"],
                    })

    return {"passed": passed, "failed": failed}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--suite", choices=["practice", "holdout"], default="practice")
    args = parser.parse_args()

    suite_path = PRACTICE_PATH if args.suite == "practice" else HOLDOUT_PATH
    if not os.path.exists(suite_path):
        print(f"Suite file not found: {suite_path}", file=sys.stderr)
        sys.exit(1)

    with open(REF_PATH, "r", encoding="utf-8") as f:
        ref_data = json.load(f)
    with open(suite_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    ts_res = run_ts_bridge({"cases": cases})
    outputs_by_id = {item["id"]: item for item in ts_res["caseOutputs"]}

    data_audit = audit_real_data(ts_res["stockDatabase"], ref_data)
    logic_eval = evaluate_logic_cases(cases, outputs_by_id)

    summary = {
        "suite": args.suite,
        "hasExportedParser": ts_res["hasExportedParser"],
        "real_data_audit": {
            "passed_count": len(data_audit["passed"]),
            "failed_count": len(data_audit["failed"]),
            "not_verified_count": len(data_audit["not_verified"]),
            "failed": data_audit["failed"],
            "not_verified": data_audit["not_verified"],
        },
        "logic_suite": {
            "total": len(cases),
            "passed_count": len(logic_eval["passed"]),
            "failed_count": len(logic_eval["failed"]),
            "failed": logic_eval["failed"],
        },
    }

    print(json.dumps(summary, indent=2))
    if data_audit["failed"] or logic_eval["failed"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
