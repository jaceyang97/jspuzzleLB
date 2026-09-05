"""Supplementary checks for an already frozen Rising Stars shortlist.

No configuration is selected or retuned here. An expected final input hash is
required before evaluating the holdout; --self-test reads no archive/results.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from study import Archive, GRID, HORIZON, PERIODS, ROOT, TOP_K, eligible, month, month_name, selected_weights


SEED = 20260906
TIE_SEEDS = 100
BOOTSTRAP_SAMPLES = 4000
BLOCK_LENGTHS = (3, 6)


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def persistent_selection(ids, scores, solves, priorities, capacity=TOP_K):
    """One fixed independent priority per identity, reused across every origin."""
    order = np.lexsort((priorities[ids], -solves[ids], -np.round(scores[ids], 12)))
    return ids[order[:capacity]]


def circular_blocks(origin_count, block_length, samples, rng):
    starts = rng.integers(0, origin_count, size=(samples, int(np.ceil(origin_count / block_length))))
    indices = (starts[:, :, None] + np.arange(block_length)) % origin_count
    return indices.reshape(samples, -1)[:, :origin_count]


def ratio(numerator, denominator):
    return float(numerator / denominator) if denominator else 0.0


def summarize(observations, identity_count, calendar_months):
    slots = sum(row["slots"] for row in observations)
    not_reached = np.ones(identity_count)
    for row in observations:
        not_reached[row["chosen"]] *= 1 - row["weights"]
    reach = float((1 - not_reached).sum())
    return {
        "origin_count": len(observations),
        "future_quality_h6": ratio(sum(row["future6"] for row in observations), slots),
        "future_quality_h3": ratio(sum(row["future3"] for row in observations), slots),
        "average_post_debut_exposure": ratio(sum(row["age"] for row in observations), slots),
        "list_fill": ratio(slots, TOP_K * len(observations)),
        "expected_display_slots": float(slots),
        "expected_unique_reach": reach,
        "annualized_unique_reach": reach * 12 / calendar_months,
        "annualization_calendar_months": calendar_months,
    }


def distribution(values):
    return {"mean": float(np.mean(values)), "minimum": float(np.min(values)), "maximum": float(np.max(values))}


def self_test():
    ids = np.arange(4)
    priorities = np.array([.8, .1, .6, .3])
    assert np.array_equal(persistent_selection(ids, np.ones(4), np.ones(4), priorities, 2), [1, 3])
    assert np.array_equal(persistent_selection(ids, np.ones(4), np.array([3, 2, 2, 2]), priorities, 2), [0, 1])
    # Repeated identical boundary ties: stable priority reaches two names;
    # independent redraws reach three in expectation, despite equal marginals.
    chosen, weights = selected_weights(ids, np.ones(4), np.ones(4), 2)
    assert float((1 - (1 - weights) ** 2).sum()) == 3
    assert len(set(persistent_selection(ids, np.ones(4), np.ones(4), priorities, 2))) == 2
    draws = circular_blocks(14, 3, 100, np.random.default_rng(SEED))
    assert draws.shape == (100, 14) and draws.min() >= 0 and draws.max() < 14
    for start in range(0, 14, 3):
        piece = draws[:, start:min(start + 3, 14)]
        assert np.all(np.diff(piece, axis=1) % 14 == 1)
    assert np.allclose((np.arange(14)[draws].sum(axis=1) / 14) - (np.arange(14)[draws].sum(axis=1) / 14), 0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "public/data/data.json")
    parser.add_argument("--selection", type=Path, default=Path(__file__).with_name("selection.json"))
    parser.add_argument("--expected-input-sha256", help="Hash confirmed after all independently verified data repairs")
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "results" / "sensitivity.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    self_test()
    if args.self_test:
        print("Synthetic sensitivity checks passed; no archive or results read.")
        return
    if not args.expected_input_sha256:
        parser.error("--expected-input-sha256 is required; wait for final data-repair confirmation")

    selection_bytes = args.selection.read_bytes()
    selection = json.loads(selection_bytes.decode("utf-8-sig"))
    selected_ids = selection["selected_config_ids"]
    recommended = selection["recommended_config_id"]
    assert selection.get("selection_reason") and selection.get("frozen_date"), "A written frozen rationale is required"
    assert selected_ids and len(selected_ids) == len(set(selected_ids)) and recommended in selected_ids
    mapping = {config.id: config for config in GRID}
    assert set(selected_ids) <= mapping.keys()
    configs = [mapping[key] for key in selected_ids]
    input_hash = digest(args.input.read_bytes())
    assert input_hash.lower() == args.expected_input_sha256.lower(), "Input changed after repair confirmation"
    archive = Archive(args.input)
    assert archive.input_hash == input_hash
    start, stop = map(month, PERIODS["holdout"])
    origins = [int(value) for value in archive.months if start <= value <= stop]
    assert origins == list(range(start, stop + 1)), "Calendar block bootstrap requires consecutive monthly origins"
    assert len(origins) == 14 and origins[-1] == month("2026-02")
    snapshots = [archive.snapshot(origin, "holdout") for origin in origins]
    assert HORIZON == 6
    for snapshot in snapshots:
        end = snapshot["end"]
        snapshot["future3"] = (archive.cumulative[end + 3] - archive.cumulative[end]) / 3

    observations = {}
    candidate_ids = {}
    for config in configs:
        rows = []
        candidate_ids[config.id] = []
        for snapshot in snapshots:
            ids = eligible(archive, snapshot, config)
            candidate_ids[config.id].append(ids)
            chosen, weights = selected_weights(ids, snapshot["scores"][config.ranking], snapshot["solves"])
            slots = float(weights.sum())
            assert abs(slots - min(TOP_K, len(ids))) < 1e-9
            rows.append({
                "chosen": chosen, "weights": weights, "slots": slots,
                "future6": float(np.dot(weights, snapshot["future"][chosen])),
                "future3": float(np.dot(weights, snapshot["future3"][chosen])),
                "age": float(np.dot(weights, snapshot["exposure"][chosen] - 1)),
            })
        observations[config.id] = rows
    baseline = [{"config_id": key, **summarize(observations[key], len(archive.names), len(origins))} for key in selected_ids]

    # Common independent identity priorities across configurations make the
    # seed comparisons paired; identities keep priorities across all origins.
    seed_metrics = {key: {"quality": [], "unique_reach": [], "annualized_reach": []} for key in selected_ids}
    for seed_number in range(TIE_SEEDS):
        priorities = np.random.default_rng(np.random.SeedSequence([SEED, seed_number])).random(len(archive.names))
        for config in configs:
            seen = set()
            future_sum = slots = 0.0
            for snapshot, ids in zip(snapshots, candidate_ids[config.id]):
                chosen = persistent_selection(ids, snapshot["scores"][config.ranking], snapshot["solves"], priorities)
                seen.update(chosen.tolist())
                slots += len(chosen)
                future_sum += float(snapshot["future"][chosen].sum())
            seed_metrics[config.id]["quality"].append(ratio(future_sum, slots))
            seed_metrics[config.id]["unique_reach"].append(len(seen))
            seed_metrics[config.id]["annualized_reach"].append(len(seen) * 12 / len(origins))
    persistent = [{
        "config_id": key,
        "future_quality_h6": distribution(seed_metrics[key]["quality"]),
        "distinct_names_reached": distribution(seed_metrics[key]["unique_reach"]),
        "annualized_unique_reach": distribution(seed_metrics[key]["annualized_reach"]),
    } for key in selected_ids]

    bootstrap = []
    recommended_rows = observations[recommended]
    for block_length in BLOCK_LENGTHS:
        indices = circular_blocks(len(origins), block_length, BOOTSTRAP_SAMPLES, np.random.default_rng(np.random.SeedSequence([SEED, block_length, 1])))
        reference_numerator = np.array([row["future6"] for row in recommended_rows])
        reference_slots = np.array([row["slots"] for row in recommended_rows])
        reference_draws = reference_numerator[indices].sum(axis=1) / reference_slots[indices].sum(axis=1)
        comparisons = []
        for key in selected_ids:
            numerator = np.array([row["future6"] for row in observations[key]])
            slots = np.array([row["slots"] for row in observations[key]])
            assert np.all(slots > 0), "Zero-occupancy origins need an explicit resampling policy"
            sampled = numerator[indices].sum(axis=1) / slots[indices].sum(axis=1)
            differences_pp = (sampled - reference_draws) * 100
            lower, upper = np.quantile(differences_pp, [.025, .975])
            comparisons.append({
                "config_id": key,
                "difference_vs_recommended_percentage_points": (ratio(numerator.sum(), slots.sum()) - ratio(reference_numerator.sum(), reference_slots.sum())) * 100,
                "resampling_mean_difference_percentage_points": float(differences_pp.mean()),
                "exploratory_2_5_to_97_5_percentile_range_pp": [float(lower), float(upper)],
            })
        bootstrap.append({"block_length_calendar_months": block_length, "resamples": BOOTSTRAP_SAMPLES, "comparisons": comparisons})

    result = {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "input_sha256": input_hash, "selection_sha256": digest(selection_bytes),
            "study_script_sha256": digest(Path(__file__).with_name("study.py").read_bytes()),
            "sensitivity_script_sha256": digest(Path(__file__).read_bytes()),
            "python": platform.python_version(), "numpy": np.__version__,
            "selected_config_ids": selected_ids, "recommended_config_id_frozen": recommended,
            "selection_unchanged": True, "base_seed": SEED, "persistent_tie_seeds": TIE_SEEDS,
            "origin_months": [month_name(value) for value in origins], "frozen_beta_prior": archive.frozen_prior,
            "quality_definition": "Inclusion-weighted future solved fraction, pooled over displayed slots across origins.",
            "persistent_tie_rule": "Score rounded to 12 decimals, then solve count, then a fixed independent uniform priority per name. Priorities persist across origins and are shared across configurations within each seed.",
            "seed_range_meaning": "Monte Carlo variation in persistent tie resolution on this fixed dataset, not sampling uncertainty or a population confidence interval.",
            "bootstrap_rule": "Paired circular moving blocks of consecutive calendar origins, with replacement; concatenate blocks and truncate to 14 origins. Recompute each pooled ratio on the same sampled origins before subtracting the frozen reference.",
            "bootstrap_interval_meaning": "Exploratory 2.5th–97.5th resampling percentiles, not a claim of rigorous population coverage or a significance test.",
            "limitations": [
                "Only 14 monthly origins; overlapping six-puzzle horizons and recurring identities create dependence, and few effective blocks remain at length 6.",
                "Circular resampling connects the final origin to the first and assumes local stability; trends and cross-solver dependencies are not fully modeled.",
                "Stable identity tie priorities are a hypothetical production policy; the primary reach convention independently redraws tied identities each origin.",
                "All checks use retrospective lists; unpublished late additions and identity ambiguity remain unobserved.",
                "Dropping the final origin addresses the least mature August 2026 outcome list, not all retrospective revision bias.",
                "These supplementary test results do not select, reorder, or retune the frozen shortlist/recommendation.",
            ],
        },
        "fractional_independent_baseline": baseline,
        "persistent_seeded_ties": persistent,
        "paired_calendar_block_bootstrap": bootstrap,
        "drop_last_origin": {
            "excluded_origin": snapshots[-1]["origin"], "excluded_origin_month": month_name(origins[-1]),
            "excluded_origin_future_end": snapshots[-1]["future_end"],
            "rows": [{"config_id": key, **summarize(observations[key][:-1], len(archive.names), len(origins) - 1)} for key in selected_ids],
        },
        "horizon_comparison": {
            "same_origins_and_selection": True,
            "rows": [{"config_id": row["config_id"], "future_quality_h3": row["future_quality_h3"], "future_quality_h6": row["future_quality_h6"]} for row in baseline],
        },
    }
    assert digest(args.input.read_bytes()) == input_hash, "Input changed while evaluating; discard the run"
    assert args.selection.read_bytes() == selection_bytes, "Frozen selection changed while evaluating"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(args.output), "input_sha256": input_hash, "configurations": len(configs), "recommendation_unchanged": recommended}))


if __name__ == "__main__":
    main()
