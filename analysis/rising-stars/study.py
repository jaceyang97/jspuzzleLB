"""Reproducible, event-time Rising Stars study; the holdout is closed by default.

Run with the bundled Python (numpy required): python analysis/rising-stars/study.py
Only an explicit --holdout-selected JSON file evaluates the frozen shortlist.
The input is a retrospective archive, not historical publication-time snapshots.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
HORIZON = 6
TOP_K = 20
W_GRID = (6, 9, 12, 18)
S_GRID = (2, 3, 4, 5, 6)
E_GRID = (1, 3, 6)
METHODS = ("raw", "count", "wilson", "beta")
Z = 1.64
FILL_FLOOR = 0.95
FIRST_COHORT = "2015-11"
PERIODS = {
    "train": ("2018-01", "2022-06"),
    "validation": ("2023-01", "2024-06"),
    "holdout": ("2025-01", "2026-02"),
}


def month(value: str) -> int:
    if len(value) == 7 and value[4] == "-":
        year, number = map(int, value.split("-"))
        return year * 12 + number - 1
    for fmt in ("%B %Y", "%b %Y"):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.year * 12 + parsed.month - 1
        except ValueError:
            pass
    raise ValueError(f"Invalid month: {value!r}")


def month_name(value: int) -> str:
    return f"{value // 12:04d}-{value % 12 + 1:02d}"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8", newline="\n")


@dataclass(frozen=True)
class Config:
    window_months: int
    min_solves: int
    min_opportunities: int
    ranking: str

    @property
    def id(self) -> str:
        return f"W{self.window_months}-S{self.min_solves}-E{self.min_opportunities}-{self.ranking}"


GRID = [Config(w, s, e, method) for w in W_GRID for s in S_GRID for e in E_GRID for method in METHODS]


class Archive:
    def __init__(self, path: Path):
        source = path.read_bytes()
        self.input_hash = sha(source)
        rows = json.loads(source.decode("utf-8-sig"))
        self.input_count = len(rows)
        closed = [row for row in rows if row.get("solution_url") and row.get("solvers")]
        closed.sort(key=lambda row: (month(row["date_text"]), row.get("name", ""), row["solution_url"]))
        if not closed:
            raise ValueError("No published closed puzzles")
        self.rows = closed
        self.months = np.array([month(row["date_text"]) for row in closed], dtype=np.int32)
        unique_months, counts = np.unique(self.months, return_counts=True)
        self.multi_months = {month_name(int(m)): int(c) for m, c in zip(unique_months, counts) if c > 1}
        self.missing_months = [month_name(value) for value in range(int(self.months[0]), int(self.months[-1]) + 1) if value not in set(unique_months)]
        assert not self.multi_months, "Multiple puzzles per month require an explicit debut/order protocol"
        assert all(isinstance(name, str) for row in closed for name in row["solvers"])
        self.blank_entries_removed = sum(not name.strip() for row in closed for name in row["solvers"])
        solver_sets = [{name for name in row["solvers"] if name.strip()} for row in closed]
        assert all(solver_sets), "A published puzzle has no valid nonblank solver identities"
        self.duplicates_removed = sum(sum(bool(name.strip()) for name in row["solvers"]) - len(group) for row, group in zip(closed, solver_sets))
        self.names = sorted(set().union(*solver_sets))
        name_index = {name: index for index, name in enumerate(self.names)}
        self.matrix = np.zeros((len(closed), len(self.names)), dtype=np.int8)
        for index, group in enumerate(solver_sets):
            self.matrix[index, [name_index[name] for name in group]] = 1
        self.cumulative = np.vstack((np.zeros((1, len(self.names)), dtype=np.int32), np.cumsum(self.matrix, axis=0, dtype=np.int32)))
        self.first_index = self.matrix.argmax(axis=0)
        self.first_month = self.months[self.first_index]
        assert int(self.months[0]) == month(FIRST_COHORT), "Review the left-censoring policy if archive coverage changes"
        self.not_left_censored = self.first_month != month(FIRST_COHORT)
        self.prior_records = []
        for index in range(len(self.names)):
            debut = int(self.first_index[index])
            first = int(self.first_month[index])
            end = debut + HORIZON + 1
            if month("2016-01") <= first <= month("2022-06") and end <= len(closed):
                completed = int(self.months[end - 1])
                if completed <= month("2022-12"):
                    successes = int(self.cumulative[end, index] - self.cumulative[debut + 1, index])
                    self.prior_records.append((index, first, completed, successes))
        self.frozen_prior = self.fit_prior(month("2022-12"))
        self.audits = {
            "multi_puzzle_months": self.multi_months,
            "multi_puzzle_month_count": len(self.multi_months),
            "duplicate_names_within_puzzles_removed": self.duplicates_removed,
            "blank_solver_entries_removed": self.blank_entries_removed,
            "left_censored_first_cohort": FIRST_COHORT,
            "left_censored_solver_count": int((~self.not_left_censored).sum()),
            "raw_rate_max": 0.0,
            "all_success_counts_le_opportunities": True,
            "all_feature_months_le_origin": True,
            "all_future_months_gt_origin": True,
            "all_training_prior_outcomes_available_by_origin": True,
            "all_validation_prior_outcomes_available_before_period": True,
        }

    def fit_prior(self, cutoff: int) -> dict:
        records = [record for record in self.prior_records if record[2] <= cutoff]
        if len(records) < 2:
            raise ValueError(f"Too few prior cohorts at {month_name(cutoff)}")
        rates = np.array([record[3] / HORIZON for record in records], dtype=float)
        mean = float(rates.mean())
        variance = float(rates.var(ddof=1))
        assert 0 < mean < 1
        raw_rho = (HORIZON * variance / (mean * (1 - mean)) - 1) / (HORIZON - 1)
        rho = float(np.clip(raw_rho, 1e-6, 1 - 1e-6))
        concentration = 1 / rho - 1
        return {
            "alpha": mean * concentration,
            "beta": (1 - mean) * concentration,
            "mean": mean,
            "concentration": concentration,
            "rate_sample_variance_ddof1": variance,
            "raw_intraclass_correlation": raw_rho,
            "used_intraclass_correlation": rho,
            "numerical_clip_applied": rho != raw_rho,
            "solver_count": len(records),
            "outcomes_per_solver": HORIZON,
            "debut_min": month_name(min(record[1] for record in records)),
            "debut_max": month_name(max(record[1] for record in records)),
            "latest_outcome_month": month_name(max(record[2] for record in records)),
            "fit_cutoff": month_name(cutoff),
        }

    def snapshot(self, origin: int, period: str, with_future: bool = True) -> dict:
        end = int(np.searchsorted(self.months, origin, side="right"))
        assert end and int(self.months[end - 1]) <= origin
        if with_future:
            assert end + HORIZON <= len(self.months), "Incomplete future horizon"
            assert int(self.months[end]) > origin
        solves = self.cumulative[end]
        exposure = end - self.first_index
        seen = exposure > 0
        assert np.all(solves[seen] <= exposure[seen])
        raw = np.zeros(len(self.names))
        raw[seen] = solves[seen] / exposure[seen]
        self.audits["raw_rate_max"] = max(self.audits["raw_rate_max"], float(raw.max()))
        assert raw.max() <= 1
        post_s = np.maximum(0, solves - 1)
        post_e = np.maximum(0, exposure - 1)
        prior = self.fit_prior(origin) if period == "train" else self.frozen_prior
        assert month(prior["latest_outcome_month"]) <= origin, "Beta prior looks ahead"
        p = np.divide(post_s, post_e, out=np.zeros(len(self.names)), where=post_e > 0)
        safe_n = np.maximum(post_e, 1)
        wilson = (p + Z * Z / (2 * safe_n) - Z * np.sqrt(p * (1 - p) / safe_n + Z * Z / (4 * safe_n * safe_n))) / (1 + Z * Z / safe_n)
        wilson[post_e == 0] = 0
        beta = (post_s + prior["alpha"]) / (post_e + prior["alpha"] + prior["beta"])
        future = (self.cumulative[end + HORIZON] - self.cumulative[end]) / HORIZON if with_future else None
        return {
            "origin": origin, "end": end, "solves": solves, "exposure": exposure,
            "scores": {"raw": raw, "count": solves.astype(float), "wilson": wilson, "beta": beta},
            "future": future, "prior": prior,
            "feature_end": month_name(int(self.months[end - 1])),
            "future_start": month_name(int(self.months[end])) if with_future else None,
            "future_end": month_name(int(self.months[end + HORIZON - 1])) if with_future else None,
        }


def selected_weights(ids: np.ndarray, scores: np.ndarray, solves: np.ndarray, capacity: int = TOP_K):
    """All ties at the final slot get equal marginal inclusion probability."""
    if not len(ids):
        return ids, np.zeros(0)
    rounded = np.round(scores[ids], 12)
    order = np.lexsort((-solves[ids], -rounded))
    ordered = ids[order]
    sorted_score = rounded[order]
    weights = np.zeros(len(ordered))
    slots = capacity
    index = 0
    while index < len(ordered) and slots > 0:
        last = index + 1
        while last < len(ordered) and sorted_score[last] == sorted_score[index] and solves[ordered[last]] == solves[ordered[index]]:
            last += 1
        weight = min(1.0, slots / (last - index))
        weights[index:last] = weight
        slots -= weight * (last - index)
        index = last
    kept = weights > 0
    return ordered[kept], weights[kept]


def eligible(archive: Archive, snapshot: dict, config: Config) -> np.ndarray:
    return np.flatnonzero(
        archive.not_left_censored
        & (archive.first_month >= snapshot["origin"] - config.window_months + 1)
        & (archive.first_month <= snapshot["origin"])
        & (snapshot["solves"] >= config.min_solves)
        & (snapshot["exposure"] >= config.min_opportunities)
    )


def grid_period(archive: Archive, period: str, configs: list[Config]) -> tuple[list[dict], list[dict]]:
    start, stop = map(month, PERIODS[period])
    origins = [int(value) for value in archive.months if start <= value <= stop]
    assert origins, f"No origins for {period}"
    snapshots = [archive.snapshot(origin, period) for origin in origins]
    rows = []
    for config in configs:
        not_reached = np.ones(len(archive.names))
        signature = hashlib.sha256()
        slots_sum = future_sum = exposure_sum = 0.0
        quality_macro = []
        eligible_sizes = []
        for snapshot in snapshots:
            ids = eligible(archive, snapshot, config)
            chosen, weights = selected_weights(ids, snapshot["scores"][config.ranking], snapshot["solves"])
            used = float(weights.sum())
            assert abs(used - min(TOP_K, len(ids))) < 1e-9
            slots_sum += used
            future = float(np.dot(weights, snapshot["future"][chosen]))
            future_sum += future
            exposure_sum += float(np.dot(weights, snapshot["exposure"][chosen] - 1))
            quality_macro.append(future / used if used else 0.0)
            eligible_sizes.append(len(ids))
            not_reached[chosen] *= 1 - weights
            # Inclusion behavior, not tie-breaking names or within-top-K ordering.
            sort = np.argsort(chosen)
            signature.update(np.array([snapshot["origin"], len(chosen)], dtype="<i4").tobytes())
            signature.update(chosen[sort].astype("<i4").tobytes())
            signature.update(np.round(weights[sort], 12).astype("<f8").tobytes())
        reach = float((1 - not_reached).sum())
        fill = slots_sum / (TOP_K * len(snapshots))
        rows.append({
            "config_id": config.id, **asdict(config),
            "origin_count": len(snapshots),
            "future_quality": future_sum / slots_sum if slots_sum else 0.0,
            "future_quality_macro_origin": float(np.mean(quality_macro)),
            "list_fill": fill, "meets_95pct_fill": fill >= FILL_FLOOR,
            "average_post_debut_exposure": exposure_sum / slots_sum if slots_sum else 0.0,
            "expected_unique_reach": reach,
            "annualized_unique_reach": reach * 12 / (stop - start + 1),
            "annualization_calendar_months": stop - start + 1,
            "expected_display_slots": slots_sum,
            "mean_eligible_count": float(np.mean(eligible_sizes)),
            "minimum_eligible_count": min(eligible_sizes),
            "behavior_hash": signature.hexdigest(),
        })
    snapshots_metadata = [{
        "origin": month_name(s["origin"]), "feature_end": s["feature_end"],
        "future_start": s["future_start"], "future_end": s["future_end"], "beta_prior": s["prior"],
    } for s in snapshots]
    return rows, snapshots_metadata


def add_frontier(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    groups = {}
    for row in rows:
        groups.setdefault(row["behavior_hash"], []).append(row)
    representatives = [group[0] for group in groups.values() if group[0]["meets_95pct_fill"]]
    frontier_hashes = set()
    for candidate in representatives:
        value = np.array([candidate["future_quality"], -candidate["average_post_debut_exposure"], candidate["annualized_unique_reach"]])
        dominated = False
        for other in representatives:
            alternative = np.array([other["future_quality"], -other["average_post_debut_exposure"], other["annualized_unique_reach"]])
            if np.all(alternative >= value - 1e-12) and np.any(alternative > value + 1e-12):
                dominated = True
                break
        if not dominated:
            frontier_hashes.add(candidate["behavior_hash"])
    equivalences = []
    for behavior, group in groups.items():
        ids = [row["config_id"] for row in group]
        equivalences.append({"behavior_hash": behavior, "representative": ids[0], "config_ids": ids})
        for row in group:
            row["pareto"] = behavior in frontier_hashes
            row["equivalent_config_ids"] = ids
            row["equivalence_representative"] = ids[0]
    frontier = [group[0] for behavior, group in groups.items() if behavior in frontier_hashes]
    frontier.sort(key=lambda row: (-row["future_quality"], row["average_post_debut_exposure"], -row["annualized_unique_reach"]))
    return frontier, equivalences


def write_csv(path: Path, rows: list[dict]):
    if not rows:
        path.write_text("", encoding="utf-8", newline="\n")
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows({key: "|".join(value) if isinstance(value, list) else value for key, value in row.items()} for row in rows)


def current_groups(archive: Archive) -> dict:
    origin = int(archive.months[-1])
    snapshot = archive.snapshot(origin, "current", with_future=False)
    result = {"as_of_closed_month": month_name(origin), "future_outcomes_evaluated": False, "configurations": []}
    for config in [Config(12, 3, 1, "raw"), Config(12, 4, 1, "raw"), Config(12, 3, 1, "wilson"), Config(12, 3, 1, "beta")]:
        ids = eligible(archive, snapshot, config)
        selected, weights = selected_weights(ids, snapshot["scores"][config.ranking], snapshot["solves"])
        groups = []
        for index, weight in zip(selected, weights):
            score = round(float(snapshot["scores"][config.ranking][index]), 12)
            solves = int(snapshot["solves"][index])
            key = (score, solves)
            if not groups or groups[-1]["key"] != key:
                groups.append({"key": key, "score": score, "solves": solves, "inclusion_probability": float(weight), "members": []})
            groups[-1]["members"].append({
                "name": archive.names[index], "debut": month_name(int(archive.first_month[index])),
                "opportunities": int(snapshot["exposure"][index]), "raw_rate": float(snapshot["scores"]["raw"][index]),
            })
        rank = 1
        for group in groups:
            group.pop("key")
            group["rank_start"] = rank
            group["tie_size"] = len(group["members"])
            group["expected_slots"] = group["tie_size"] * group["inclusion_probability"]
            group["members"].sort(key=lambda row: row["name"])
            rank += group["tie_size"]
        result["configurations"].append({"config_id": config.id, **asdict(config), "eligible_count": len(ids), "groups": groups})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "public/data/data.json")
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "results")
    parser.add_argument("--holdout-selected", type=Path, help="Explicit frozen JSON shortlist: {selected_config_ids:[...], selection_reason:...}")
    args = parser.parse_args()
    archive = Archive(args.input)
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    # Boundary-tie audit: two slots, four exactly tied people, no name advantage.
    chosen, weights = selected_weights(np.arange(4), np.ones(4), np.ones(4), 2)
    assert len(chosen) == 4 and np.all(weights == 0.5)
    assert abs(float((1 - (1 - weights) ** 2).sum()) - 3.0) < 1e-12
    metadata = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "input_path": str(args.input.resolve()), "input_sha256": archive.input_hash,
        "script_sha256": sha(Path(__file__).read_bytes()), "python": platform.python_version(), "numpy": np.__version__,
        "input_puzzle_count": archive.input_count, "published_closed_puzzle_count": len(archive.rows),
        "published_closed_solver_count": len(archive.names),
        "first_closed_month": month_name(int(archive.months[0])), "last_closed_month": month_name(int(archive.months[-1])),
        "unknown_months_inside_closed_range": archive.missing_months,
        "published_filter": "Nonempty solution_url AND nonempty solver list; nonblank names preserved exactly and deduplicated inside each puzzle. Blank entries excluded as invalid identities.",
        "unknown_months": "Absent/unpublished/empty-list months are unknown, excluded from exposure and future opportunity counts.",
        "debut_definition": "First appearance in the closed, published archive; first 2015-11 cohort excluded as left-censored.",
        "opportunity_definition": "Closed published puzzles from debut month through origin, both inclusive. Current archive asserts one puzzle per month.",
        "grid": {"window_months": W_GRID, "min_solves": S_GRID, "min_opportunities": E_GRID, "ranking": METHODS, "configuration_count": len(GRID)},
        "window_rule": "origin_month - debut_month + 1 <= W (calendar months)",
        "periods": PERIODS, "top_k": TOP_K, "future_horizon_puzzles": HORIZON,
        "future_quality": "Sum of inclusion probability times next-six-puzzle solve fraction / sum of inclusion probabilities across all origins.",
        "macro_quality_alternative": "Mean origin-level weighted future quality; empty lists score zero in this secondary diagnostic.",
        "exposure_objective": "Inclusion-weighted mean E-1, minimized. This is age of displayed records, NOT time-to-first-detection.",
        "reach_objective": "Sum_i(1-product_t(1-w_it)), annualized over inclusive calendar months in the evaluation period.",
        "reach_assumption": "Boundary ties independently draw a uniformly random subset at each origin. Reach is expected exposure under that hypothetical policy, not deterministic UI reach.",
        "tie_rule": "Rank by score (rounded to 12 decimals), then observed solve count. Fractional weights split top-K boundary ties; names do not select winners.",
        "pareto": "Maximize future_quality and annualized_unique_reach; minimize average_post_debut_exposure; require mean list_fill >= 0.95.",
        "equivalence": "Same per-origin name inclusion probabilities across the entire period; within-list order is not compared.",
        "scores": {
            "raw": "S/E, inclusive published opportunities",
            "count": "S; identical ranking to S/W for a fixed cohort window W",
            "wilson": f"Wilson lower bound, z={Z}, post-debut successes S-1 / opportunities E-1; zero if E-1=0",
            "beta": "(S-1+alpha)/(E-1+alpha+beta); guaranteed debut success excluded",
        },
        "beta_prior_fit": "Fixed-n=6 beta-binomial method of moments on first six post-debut outcomes; sample variance ddof=1; rho numerically clipped to [1e-6,1-1e-6] if needed.",
        "beta_prior_cohorts": "Debut Jan2016-Jun2022, all six subsequent published outcomes complete by Dec2022; first month success excluded.",
        "training_prior_policy": "Refit at every training origin using only qualifying six-outcome records complete by that origin.",
        "validation_holdout_prior_policy": "Fixed Dec2022 prior, unchanged during validation/holdout/current comparison.",
        "frozen_beta_prior": archive.frozen_prior,
        "holdout_evaluated": bool(args.holdout_selected),
        "limitations": [
            "Retrospective event-month reconstruction; solver lists may contain later publication-time revisions.",
            "Absence from a published list measures no recorded solve, not observed failed attempts or intrinsic ability.",
            "Exact public names may merge distinct people or split one person; no inferred identity matching.",
            "Outcomes overlap across origins and solvers recur, so observations are dependent; point estimates have no independent-observation confidence claim.",
            "Future quality, reach and record age are explicit proxies, not ground truth for strong newcomers or a unique optimum.",
        ],
    }
    if args.holdout_selected:
        selection_bytes = args.holdout_selected.read_bytes()
        selection = json.loads(selection_bytes)
        ids = selection.get("selected_config_ids", [])
        assert ids and len(ids) == len(set(ids)), "Supply a nonempty frozen shortlist, without duplicates"
        mapping = {config.id: config for config in GRID}
        assert set(ids) <= mapping.keys(), "Unknown configuration in frozen shortlist"
        rows, origins = grid_period(archive, "holdout", [mapping[key] for key in ids])
        write_json(output / "holdout_selected.json", {"selected_config_ids": ids, "selection": selection, "selection_sha256": sha(selection_bytes), "rows": rows, "origins": origins})
        write_csv(output / "holdout_selected.csv", rows)
        metadata["selection_sha256"] = sha(selection_bytes)
        metadata["audits"] = archive.audits
        write_json(output / "holdout_metadata.json", metadata)
        print(json.dumps({"holdout_selected_written": ids, "input_sha256": archive.input_hash}))
        return
    for period in ("train", "validation"):
        rows, origins = grid_period(archive, period, GRID)
        frontier, equivalents = add_frontier(rows)
        write_json(output / f"{period}.json", {"period": period, "rows": rows, "pareto": frontier, "equivalence_groups": equivalents, "origins": origins})
        write_json(output / f"{period}_grid.json", rows)
        write_json(output / f"{period}_pareto.json", frontier)
        write_csv(output / f"{period}_grid.csv", rows)
        write_csv(output / f"{period}_pareto.csv", frontier)
        print(json.dumps({"period": period, "origins": len(origins), "configurations": len(rows), "distinct_selection_behaviors": len(equivalents), "fill_qualified": sum(row["meets_95pct_fill"] for row in rows), "pareto_behaviors": len(frontier)}))
    write_json(output / "current_top_groups.json", current_groups(archive))
    metadata["audits"] = archive.audits
    write_json(output / "metadata.json", metadata)
    print(json.dumps({"input_sha256": archive.input_hash, "frozen_prior": archive.frozen_prior, "audits": archive.audits, "holdout_evaluated": False}))


if __name__ == "__main__":
    main()
