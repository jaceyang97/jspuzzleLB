"""Exploratory robustness checks for a named Rising stars shortlist.

Uses the already examined archive. These are sensitivity checks, not an untouched
test or post-selection confirmation. No production policy or old output changes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

DIRECTORY = Path(__file__).resolve().parent
sys.path.insert(0, str(DIRECTORY.parent))
from study import Archive, Config, HORIZON, ROOT, TOP_K, eligible, month, month_name, selected_weights

SEED = 20260906
DEFAULT_CONFIGS = (
    "W12-S3-E3-raw", "W18-S2-E3-raw", "W18-S3-E3-raw",
    "W12-S2-E2-raw", "W12-S4-E4-raw", "W12-S3-E3-wilson", "W12-S3-E3-beta",
)
PERIODS = {
    "all": ("2018-01", "2026-02"),
    "early": ("2018-01", "2020-12"),
    "middle": ("2021-01", "2023-12"),
    "later": ("2024-01", "2026-02"),
    "recent": ("2023-01", "2026-02"),
    "drop_last": ("2018-01", "2026-01"),
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_config(value: str) -> Config:
    match = re.fullmatch(r"W(\d+)-S(\d+)-E(\d+)-(raw|count|wilson|beta)", value)
    if not match:
        raise ValueError(f"Invalid configuration: {value}")
    window, solves, exposure = map(int, match.group(1, 2, 3))
    exposure = max(solves, exposure)
    if not 1 <= solves <= exposure <= window <= 24:
        raise ValueError(f"Outside declared family: {value}")
    return Config(window, solves, exposure, match.group(4))


def rolling_archive(path: Path) -> Archive:
    """Remove the original prior's June 2022 debut ceiling, not its time guard."""
    archive = Archive(path)
    records = []
    for identity, debut in enumerate(archive.first_index):
        debut = int(debut)
        first = int(archive.first_month[identity])
        end = debut + HORIZON + 1
        if first >= month("2016-01") and end <= len(archive.rows):
            completed = int(archive.months[end - 1])
            successes = int(archive.cumulative[end, identity] - archive.cumulative[debut + 1, identity])
            records.append((identity, first, completed, successes))
    archive.prior_records = records
    return archive


def make_snapshots(archive: Archive):
    start, stop = map(month, PERIODS["all"])
    origins = [int(value) for value in archive.months if start <= value <= stop]
    assert len(origins) == 96, "Review the declared origin sample if archive coverage changes"
    snapshots = [archive.snapshot(origin, "train") for origin in origins]
    assert all(month(snapshot["prior"]["latest_outcome_month"]) <= snapshot["origin"] for snapshot in snapshots)
    return origins, snapshots


def ratio(numerator, denominator):
    return float(numerator / denominator) if denominator else None


def summarize(rows, identity_count, calendar_months):
    slots = sum(row["slots"] for row in rows)
    not_reached = np.ones(identity_count)
    for row in rows:
        not_reached[row["chosen"]] *= 1 - row["weights"]
    reach = float((1 - not_reached).sum())
    fills = [min(row["slots"], TOP_K) / TOP_K for row in rows]
    return {
        "origin_count": len(rows), "calendar_months": calendar_months,
        "future_quality": ratio(sum(row["future"] for row in rows), slots),
        "average_post_debut_exposure": ratio(sum(row["age"] for row in rows), slots),
        "expected_unique_reach": reach, "annualized_unique_reach": reach * 12 / calendar_months,
        "display_slots": float(slots), "average_display_slots": ratio(slots, len(rows)),
        "mean_fill_capped_at_20": float(np.mean(fills)),
        "minimum_fill_capped_at_20": float(min(fills)),
        "full_list_origin_fraction": sum(row["slots"] >= TOP_K - 1e-9 for row in rows) / len(rows),
        "minimum_eligible_count": min(row["eligible_count"] for row in rows),
    }


def distribution(values):
    values = np.asarray(values, dtype=float)
    values = values[np.isfinite(values)]
    if not len(values):
        return {"mean": None, "minimum": None, "maximum": None, "valid_values": 0}
    return {"mean": float(values.mean()), "minimum": float(values.min()), "maximum": float(values.max()), "valid_values": len(values)}


def persistent_selection(ids, scores, solves, priorities):
    order = np.lexsort((priorities[ids], -solves[ids], -np.round(scores[ids], 12)))
    return ids[order[:TOP_K]]


def circular_blocks(calendar_count, length, samples, rng):
    starts = rng.integers(0, calendar_count, size=(samples, int(np.ceil(calendar_count / length))))
    return ((starts[:, :, None] + np.arange(length)) % calendar_count).reshape(samples, -1)[:, :calendar_count]


def observe(chosen, weights, snapshot, eligible_count):
    return {
        "chosen": chosen, "weights": weights, "slots": float(weights.sum()),
        "future": float(np.dot(weights, snapshot["future"][chosen])),
        "age": float(np.dot(weights, snapshot["exposure"][chosen] - 1)),
        "eligible_count": eligible_count,
    }


def period_indices(origins):
    result = {}
    for name, (first, last) in PERIODS.items():
        start, stop = month(first), month(last)
        result[name] = {"indices": [i for i, value in enumerate(origins) if start <= value <= stop],
                        "start": start, "stop": stop, "calendar_months": stop - start + 1}
    return result


def summaries(observations, periods, identity_count):
    return {period: [{"config_id": key, **summarize([rows[i] for i in details["indices"]], identity_count, details["calendar_months"])}
                     for key, rows in observations.items()] for period, details in periods.items()}


def bootstrap(observations, origins, periods, baseline, samples):
    results = []
    for period_name in ("all", "recent"):
        period = periods[period_name]
        vectors = {}
        for key, rows in observations.items():
            values = np.zeros((3, period["calendar_months"]))
            for index in period["indices"]:
                offset = origins[index] - period["start"]
                values[:, offset] = [rows[index]["future"], rows[index]["age"], rows[index]["slots"]]
            vectors[key] = values
        for length in (6, 12):
            indices = circular_blocks(period["calendar_months"], length, samples,
                                      np.random.default_rng(np.random.SeedSequence([SEED, length, period["start"], 1])))
            totals = {key: value[:, indices].sum(axis=2) for key, value in vectors.items()}
            reference = totals[baseline]
            comparisons = []
            for key, value in totals.items():
                valid = (value[2] > 0) & (reference[2] > 0)
                quality = (value[0, valid] / value[2, valid] - reference[0, valid] / reference[2, valid]) * 100
                age = value[1, valid] / value[2, valid] - reference[1, valid] / reference[2, valid]
                full, base = vectors[key].sum(axis=1), vectors[baseline].sum(axis=1)
                comparisons.append({
                    "config_id": key,
                    "observed_quality_difference_pp": (full[0] / full[2] - base[0] / base[2]) * 100 if full[2] and base[2] else None,
                    "quality_difference_exploratory_percentiles_2_5_97_5_pp": np.quantile(quality, [.025, .975]).tolist() if valid.any() else None,
                    "observed_record_age_difference": full[1] / full[2] - base[1] / base[2] if full[2] and base[2] else None,
                    "record_age_difference_exploratory_percentiles_2_5_97_5": np.quantile(age, [.025, .975]).tolist() if valid.any() else None,
                    "valid_resamples": int(valid.sum()),
                })
            results.append({"period": period_name, "calendar_months": period["calendar_months"],
                            "block_length_calendar_months": length, "resamples": samples, "comparisons": comparisons})
    return results


def self_test():
    assert parse_config("W12-S3-E1-raw").id == "W12-S3-E3-raw"
    ids, scores, solves = np.arange(4), np.ones(4), np.ones(4)
    chosen, weights = selected_weights(ids, scores, solves, 2)
    assert len(chosen) == 4 and np.all(weights == .5)
    priorities = np.array([.8, .1, .6, .3])
    assert np.array_equal(persistent_selection(ids, scores, solves, priorities), [1, 3, 2, 0])
    draws = circular_blocks(98, 6, 20, np.random.default_rng(SEED))
    assert draws.shape == (20, 98)
    assert np.all(np.diff(draws[:, :6], axis=1) % 98 == 1)
    # Keep missing calendar months as zero-weight cells, not adjacent-month compression.
    calendar = np.zeros(5)
    calendar[[0, 1, 3, 4]] = [1, 1, 1, 1]
    assert calendar[1:4].sum() == 2
    tied_ids = np.arange(25)
    chosen, weights = selected_weights(tied_ids, np.ones(25), np.ones(25))
    assert len(chosen) == 25 and np.isclose(weights.sum(), 20)
    assert len(persistent_selection(tied_ids, np.ones(25), np.ones(25), np.arange(25))) == 20
    assert distribution([None, None])["valid_values"] == 0
    assert distribution([None, .5])["mean"] == .5


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", action="append", help="Repeat for each rule; original redundant thresholds are canonicalized")
    parser.add_argument("--selection", type=Path, help="JSON list or object with config_ids / selected_config_ids")
    parser.add_argument("--baseline", default="W12-S3-E3-raw")
    parser.add_argument("--input", type=Path, default=ROOT / "public/data/data.json")
    parser.add_argument("--output", type=Path, default=DIRECTORY / "robustness-results.json")
    parser.add_argument("--resamples", type=int, default=2000)
    parser.add_argument("--tie-seeds", type=int, default=100)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    self_test()
    if args.self_test:
        print("Synthetic robustness checks passed; no archive or results read.")
        return
    if args.resamples < 1 or args.tie_seeds < 1:
        parser.error("Resamples and tie seeds must be positive")
    requested = list(args.config or [])
    if args.selection:
        selection = json.loads(args.selection.read_text(encoding="utf-8-sig"))
        requested.extend(selection if isinstance(selection, list) else selection.get("config_ids", selection.get("selected_config_ids", [])))
    baseline = parse_config(args.baseline).id
    configs = list({config.id: config for config in map(parse_config, [baseline, *(requested or DEFAULT_CONFIGS)])}.values())
    input_hash = digest(args.input)
    archive = rolling_archive(args.input)
    origins, snapshots = make_snapshots(archive)
    periods = period_indices(origins)
    candidates = {config.id: [eligible(archive, snapshot, config) for snapshot in snapshots] for config in configs}
    primary, whole = {}, {}
    for config in configs:
        primary[config.id], whole[config.id] = [], []
        for snapshot, ids in zip(snapshots, candidates[config.id]):
            chosen, weights = selected_weights(ids, snapshot["scores"][config.ranking], snapshot["solves"])
            primary[config.id].append(observe(chosen, weights, snapshot, len(ids)))
            whole[config.id].append(observe(chosen, np.ones(len(chosen)), snapshot, len(ids)))
    persistent_metrics = {period: {config.id: {field: [] for field in ("future_quality", "average_post_debut_exposure", "annualized_unique_reach", "average_display_slots")}
                                   for config in configs} for period in periods}
    for seed in range(args.tie_seeds):
        priorities = np.random.default_rng(np.random.SeedSequence([SEED, seed])).random(len(archive.names))
        for config in configs:
            rows = []
            for snapshot, ids in zip(snapshots, candidates[config.id]):
                chosen = persistent_selection(ids, snapshot["scores"][config.ranking], snapshot["solves"], priorities)
                rows.append(observe(chosen, np.ones(len(chosen)), snapshot, len(ids)))
            for period, details in periods.items():
                metrics = summarize([rows[i] for i in details["indices"]], len(archive.names), details["calendar_months"])
                for field in persistent_metrics[period][config.id]:
                    persistent_metrics[period][config.id][field].append(metrics[field])
    persistent = {}
    for period, configurations in persistent_metrics.items():
        reference = np.array(configurations[baseline]["future_quality"], dtype=float)
        persistent[period] = [{"config_id": key, **{field: distribution(values) for field, values in metrics.items()},
                               "paired_quality_difference_vs_baseline_pp": distribution((np.array(metrics["future_quality"], dtype=float) - reference) * 100)}
                              for key, metrics in configurations.items()]
    result = {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(), "input_sha256": input_hash,
            "script_sha256": digest(Path(__file__)), "original_study_script_sha256": digest(DIRECTORY.parent / "study.py"),
            "python": platform.python_version(), "numpy": np.__version__, "base_seed": SEED,
            "config_ids": [config.id for config in configs], "baseline_config_id": baseline,
            "origin_months": [month_name(value) for value in origins],
            "missing_origin_months": [month_name(value) for value in range(origins[0], origins[-1] + 1) if value not in origins],
            "periods": {key: {"start": month_name(value["start"]), "stop": month_name(value["stop"]), "calendar_months": value["calendar_months"], "origins": len(value["indices"])} for key, value in periods.items()},
            "prior_policy": "At each origin, refit the original beta-binomial moments method using all debut cohorts from January 2016 whose next six puzzle outcomes are complete by that origin; no June 2022 cohort ceiling and no future outcomes.",
            "prior_by_origin": [{"origin": month_name(snapshot["origin"]), **snapshot["prior"]} for snapshot in snapshots],
            "quality_definition": "Pooled selected-slot-weighted share of the next six published puzzles solved.",
            "primary_ties": "Fractional slots across the score-and-solve-count boundary tie; reach assumes independent selection per origin.",
            "persistent_tie_policy": "100 by default; common seeded independent identity priorities persist across origins and are paired across rules. Score rounded to 12 decimals, then more solves, then priority; at most 20 slots.",
            "persistent_tie_seeds": args.tie_seeds,
            "whole_boundary_policy": "Include every name in the tie that contains position 20. Display slots can exceed 20. Report slots; do not treat expanded capacity as an equal-budget frontier comparison.",
            "bootstrap_policy": "Paired circular calendar blocks, sampled with replacement, concatenated and truncated to the original calendar span. Missing March/November 2020 are zero-weight cells. Recompute pooled ratios on common resampled months.",
            "bootstrap_range_meaning": "Exploratory 2.5th-97.5th resampling percentiles; not a significance test, population coverage guarantee, or correction for searching many configurations.",
            "limitations": ["All archive data have already been examined; this is exploratory reanalysis, not untouched confirmation.",
                            "Repeated identities, overlapping future horizons and long-term changes create dependence not fully captured by calendar blocks.",
                            "Circular blocks join the last calendar month to the first; era results show sensitivity to temporal change.",
                            "Reach is an analysis convention; the website keeps all eligible names accessible, so actual exposure differs.",
                            "Retrospective published lists may contain revisions and ambiguous identities.",
                            "Dropping February 2026 removes the origin whose outcome ends in the latest August 2026 list; it does not remove all hindsight."]
        },
        "fractional_primary": summaries(primary, periods, len(archive.names)),
        "whole_boundary_ties": summaries(whole, periods, len(archive.names)),
        "persistent_seeded_ties": persistent,
        "paired_calendar_block_bootstrap": bootstrap(primary, origins, periods, baseline, args.resamples),
    }
    assert digest(args.input) == input_hash, "Archive changed during robustness checks"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(args.output), "configurations": len(configs), "origin_count": len(origins), "input_sha256": input_hash}))


if __name__ == "__main__":
    main()
