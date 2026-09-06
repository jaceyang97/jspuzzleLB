"""Complete declared integer-family descriptive audit; original results stay intact."""
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import json
import platform
import sys
import time
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
OLD_PATH = HERE.parent / "study.py"
spec = importlib.util.spec_from_file_location("rising_original_study", OLD_PATH)
old = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = old
spec.loader.exec_module(old)

PERIODS = {
    "pooled": ("2018-01", "2026-02"),
    "era_2018_2020": ("2018-01", "2020-12"),
    "era_2021_2023": ("2021-01", "2023-12"),
    "era_2024_2026": ("2024-01", "2026-02"),
    "late_2023_2026": ("2023-01", "2026-02"),
}
SCOPES = {"exact12": lambda w: w == 12, "up_to12": lambda w: w <= 12,
          "up_to18": lambda w: w <= 18, "up_to24": lambda w: w <= 24}
FIELDS = ("used_slots", "future_sum", "post_debut_exposure_sum", "eligible_count")


def write_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8", newline="\n")


def prepare_snapshot(archive, origin, period="train", windows=range(1, 25)):
    snapshot = archive.snapshot(origin, period)
    snapshot["rounded"] = {key: np.round(value, 12) for key, value in snapshot["scores"].items()}
    snapshot["orders"] = {}
    for window in windows:
        ids = np.flatnonzero(archive.not_left_censored & (archive.first_month >= origin - window + 1) & (archive.first_month <= origin))
        for method in old.METHODS:
            order = np.lexsort((-snapshot["solves"][ids], -snapshot["rounded"][method][ids]))
            snapshot["orders"][window, method] = ids[order]
    return snapshot


def choose(snapshot, config):
    ids = snapshot["orders"][config.window_months, config.ranking]
    ids = ids[(snapshot["solves"][ids] >= config.min_solves) & (snapshot["exposure"][ids] >= config.min_opportunities)]
    count = len(ids)
    if count <= old.TOP_K:
        return ids, np.ones(count), count
    score = snapshot["rounded"][config.ranking]
    boundary = ids[old.TOP_K - 1]
    scores, solves = score[ids], snapshot["solves"][ids]
    cutoff_score, cutoff_solves = score[boundary], snapshot["solves"][boundary]
    tied = (scores == cutoff_score) & (solves == cutoff_solves)
    last = int(np.flatnonzero(tied)[-1]) + 1
    selected = ids[:last]
    boundary_ties = tied[:last]
    weights = np.ones(last)
    weights[boundary_ties] = (old.TOP_K - (last - int(boundary_ties.sum()))) / int(boundary_ties.sum())
    return selected, weights, count


def signature_part(origin, ids, weights):
    order = np.argsort(ids)
    return (np.array([origin, len(ids)], dtype="<i4").tobytes()
            + ids[order].astype("<i4").tobytes()
            + np.round(weights[order], 12).astype("<f8").tobytes())


def evaluate(archive, snapshots, config, periods):
    period_ranges = [(old.month(start), old.month(stop)) for start, stop in periods.values()]
    memberships = [[index for index, (start, stop) in enumerate(period_ranges) if start <= snap["origin"] <= stop] for snap in snapshots]
    signatures = [hashlib.sha256() for _ in periods]
    not_reached = np.ones((len(periods), len(archive.names)))
    metrics = np.zeros((len(snapshots), len(FIELDS)))
    for index, snapshot in enumerate(snapshots):
        ids, weights, eligible_count = choose(snapshot, config)
        used = float(weights.sum())
        assert abs(used - min(old.TOP_K, eligible_count)) < 1e-9
        metrics[index] = (used, float(np.dot(weights, snapshot["future"][ids])),
                          float(np.dot(weights, snapshot["exposure"][ids] - 1)), eligible_count)
        part = signature_part(snapshot["origin"], ids, weights)
        for group in memberships[index]:
            not_reached[group, ids] *= 1 - weights
            signatures[group].update(part)
    rows = {}
    for group, (label, (start, stop)) in enumerate(zip(periods, period_ranges)):
        selected_origins = np.array([start <= snap["origin"] <= stop for snap in snapshots])
        values = metrics[selected_origins]
        used = values[:, 0]
        slots = float(used.sum())
        reach = float((1 - not_reached[group]).sum())
        fill = slots / (old.TOP_K * len(values))
        rows[label] = {"config_id": config.id, **asdict(config), "origin_count": len(values),
                       "future_quality": float(values[:, 1].sum()) / slots if slots else 0.0,
                       "future_quality_macro_origin": float(np.divide(values[:, 1], used, out=np.zeros(len(values)), where=used > 0).mean()),
                       "list_fill": fill, "meets_95pct_fill": fill >= old.FILL_FLOOR,
                       "average_post_debut_exposure": float(values[:, 2].sum()) / slots if slots else 0.0,
                       "expected_unique_reach": reach, "annualized_unique_reach": reach * 12 / (stop - start + 1),
                       "annualization_calendar_months": stop - start + 1, "expected_display_slots": slots,
                       "mean_eligible_count": float(values[:, 3].mean()), "minimum_eligible_count": int(values[:, 3].min()),
                       "minimum_list_fill": float(used.min() / old.TOP_K),
                       "proportion_full_origins": float(np.mean(used >= old.TOP_K - 1e-9)),
                       "behavior_hash": signatures[group].hexdigest()}
    return rows, metrics


def nondominated(values):
    """Three maximization objectives; original 1e-12 weak/strict dominance."""
    count = len(values)
    result = np.ones(count, dtype=bool)
    for start in range(0, count, 128):
        candidates = values[start:start + 128]
        at_least = np.all(values[None, :, :] >= candidates[:, None, :] - 1e-12, axis=2)
        better = np.any(values[None, :, :] > candidates[:, None, :] + 1e-12, axis=2)
        result[start:start + len(candidates)] = ~np.any(at_least & better, axis=1)
    return result


def add_frontiers(rows, extra_eligible=None):
    summary = {}
    for scope, accepts in SCOPES.items():
        candidates = [row for row in rows if accepts(row["window_months"]) and row["meets_95pct_fill"] and (extra_eligible is None or row["config_id"] in extra_eligible)]
        groups = {}
        for row in candidates:
            groups.setdefault(row["behavior_hash"], []).append(row)
        representatives = [group[0] for group in groups.values()]
        values = np.array([[r["future_quality"], -r["average_post_debut_exposure"], r["annualized_unique_reach"]] for r in representatives])
        mask = nondominated(values) if len(values) else []
        hashes = {row["behavior_hash"] for row, keep in zip(representatives, mask) if keep}
        frontier = [row.copy() for row in representatives if row["behavior_hash"] in hashes]
        for row in rows:
            row[("robust_pareto_" if extra_eligible is not None else "pareto_") + scope] = (accepts(row["window_months"]) and row["meets_95pct_fill"] and row["behavior_hash"] in hashes and (extra_eligible is None or row["config_id"] in extra_eligible))
        frontier.sort(key=lambda row: (-row["future_quality"], row["average_post_debut_exposure"], -row["annualized_unique_reach"]))
        summary[scope] = {"configuration_count": sum(accepts(row["window_months"]) for row in rows), "qualified_configurations": len(candidates),
                          "qualified_behaviors": len(groups), "frontier_behaviors": len(frontier),
                          "frontier_configurations": sum(len(groups[value]) for value in hashes), "rows": frontier}
    return summary


def parity(archive, output):
    snapshots = [prepare_snapshot(archive, int(origin), "validation", old.W_GRID) for origin in archive.months if old.month("2023-01") <= origin <= old.month("2024-06")]
    saved = {row["config_id"]: row for row in json.loads((HERE.parent / "results/validation_grid.json").read_text(encoding="utf-8"))}
    max_error = 0.0
    canonical_pairs = 0
    for config in old.GRID:
        rows, _ = evaluate(archive, snapshots, config, {"validation": old.PERIODS["validation"]})
        row = rows["validation"]
        expected = saved[config.id]
        for field in ("future_quality", "future_quality_macro_origin", "list_fill", "average_post_debut_exposure", "expected_unique_reach", "annualized_unique_reach", "mean_eligible_count"):
            error = abs(row[field] - expected[field])
            max_error = max(max_error, error)
            assert error < 1e-10, (config.id, field, error)
        assert row["behavior_hash"] == expected["behavior_hash"], config.id
        canonical = old.Config(config.window_months, config.min_solves, max(config.min_solves, config.min_opportunities), config.ranking)
        for snapshot in snapshots:
            ids, weights, count = choose(snapshot, config)
            other_ids, other_weights, other_count = choose(snapshot, canonical)
            assert count == other_count and np.array_equal(ids, other_ids) and np.array_equal(weights, other_weights)
            canonical_pairs += 1
    rng = np.random.default_rng(420)
    points = np.vstack((rng.normal(size=(200, 3)), np.zeros((3, 3)), [[1e-13, 0, 0]]))
    fast = nondominated(points)
    slow = np.array([not any(np.all(other >= value - 1e-12) and np.any(other > value + 1e-12) for other in points) for value in points])
    assert np.array_equal(fast, slow)
    report = {"original_configurations": len(old.GRID), "original_origins": len(snapshots), "all_behavior_hashes_equal": True,
              "maximum_numeric_error": max_error, "canonical_threshold_checks": canonical_pairs,
              "vectorized_dominance_matches_original": True, "prior_policy": "Original frozen prior for parity only"}
    write_json(output / "parity_audit.json", report)
    print(json.dumps({"parity": report}), flush=True)


def all_past_prior_records(archive):
    records = []
    for index in range(len(archive.names)):
        debut = int(archive.first_index[index])
        first = int(archive.first_month[index])
        end = debut + old.HORIZON + 1
        if first >= old.month("2016-01") and end <= len(archive.rows):
            successes = int(archive.cumulative[end, index] - archive.cumulative[debut + 1, index])
            records.append((index, first, int(archive.months[end - 1]), successes))
    archive.prior_records = records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity-only", action="store_true")
    args = parser.parse_args()
    started = time.monotonic()
    output = HERE / "results"
    output.mkdir(exist_ok=True)
    archive = old.Archive(old.ROOT / "public/data/data.json")
    parity(archive, output)
    if args.parity_only:
        return
    all_past_prior_records(archive)
    origins = [int(origin) for origin in archive.months if old.month("2018-01") <= origin <= old.month("2026-02") and np.searchsorted(archive.months, origin, side="right") + old.HORIZON <= len(archive.months)]
    snapshots = [prepare_snapshot(archive, origin) for origin in origins]
    configs = [old.Config(w, s, e, method) for w in range(1, 25) for e in range(1, w + 1) for s in range(1, e + 1) for method in old.METHODS]
    assert len(configs) == 10400
    all_rows = {period: [] for period in PERIODS}
    origin_metrics = np.zeros((len(configs), len(origins), len(FIELDS)))
    for index, config in enumerate(configs):
        rows, metrics = evaluate(archive, snapshots, config, PERIODS)
        for period in PERIODS:
            all_rows[period].append(rows[period])
        origin_metrics[index] = metrics
        if index == len(configs) - 1 or configs[index + 1].window_months != config.window_months:
            print(json.dumps({"completed_window": config.window_months, "configurations": index + 1, "elapsed_seconds": round(time.monotonic() - started, 1)}), flush=True)
    write_json(output / "origin_metadata.json", {"config_ids": [config.id for config in configs], "fields": FIELDS,
               "origins": [{"origin": old.month_name(snapshot["origin"]), "feature_end": snapshot["feature_end"], "future_start": snapshot["future_start"], "future_end": snapshot["future_end"], "beta_prior": snapshot["prior"]} for snapshot in snapshots]})
    np.savez_compressed(output / "origin_metrics.npz", metrics=origin_metrics)
    summaries = {}
    for period, rows in all_rows.items():
        frontiers = add_frontiers(rows)
        summaries[period] = {key: {field: value for field, value in summary.items() if field != "rows"} for key, summary in frontiers.items()}
        write_json(output / f"{period}_frontiers.json", frontiers)
        print(json.dumps({"period": period, "frontiers": summaries[period]}), flush=True)
    robust_eligible = {config.id for index, config in enumerate(configs) if all(all_rows[era][index]["meets_95pct_fill"] for era in ("era_2018_2020", "era_2021_2023", "era_2024_2026"))}
    robust = add_frontiers(all_rows["pooled"], robust_eligible)
    write_json(output / "pooled_era_robust_frontiers.json", robust)
    for period, rows in all_rows.items():
        write_json(output / f"{period}_grid.json", rows)
        with (output / f"{period}_grid.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
    metadata = {"generated_at_utc": datetime.now(timezone.utc).isoformat(), "protocol_sha256": old.sha((HERE / "protocol.md").read_bytes()),
                "script_sha256": old.sha(Path(__file__).read_bytes()), "original_script_sha256": old.sha(OLD_PATH.read_bytes()),
                "input_sha256": archive.input_hash, "python": platform.python_version(), "numpy": np.__version__,
                "configuration_count": len(configs), "origin_count": len(origins), "periods": PERIODS,
                "observed_first_month": old.month_name(int(archive.months[0])), "observed_last_month": old.month_name(int(archive.months[-1])),
                "unknown_months_inside_closed_range": archive.missing_months, "closed_puzzle_count": len(archive.rows), "solver_count": len(archive.names),
                "grid": {"window_months": "1..24", "min_opportunities": "1..W", "min_solves": "1..E", "methods": old.METHODS},
                "prior_policy": "All Jan2016 onward uncensored debut cohorts with six post-debut outcomes complete at each origin; rolling past-only refit",
                "prior_record_count_before_origin_filter": len(archive.prior_records), "descriptive_reuse_not_fresh_holdout": True,
                "frontier_summary": summaries, "every_era_95pct_fill_configurations": len(robust_eligible),
                "unique_behaviors": {period: len({row["behavior_hash"] for row in rows}) for period, rows in all_rows.items()},
                "elapsed_seconds": time.monotonic() - started}
    write_json(output / "metadata.json", metadata)
    print(json.dumps({"done": True, "elapsed_seconds": round(time.monotonic() - started, 1), "metadata": str(output / "metadata.json")}), flush=True)


if __name__ == "__main__":
    main()
