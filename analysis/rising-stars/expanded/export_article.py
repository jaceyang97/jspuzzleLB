"""Export saved pooled results for the article; no rescoring or rule selection.

Run with --check to verify the committed JSON. Supports plain or gzip research
grids. Source hashes always refer to logical, decompressed UTF-8 bytes.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
STUDY = ROOT / "analysis/rising-stars/expanded"
OUTPUT = ROOT / "src/features/rising-stars/data/pareto-study.json"
CHOSEN = "W18-S2-E3-raw"
EPSILON = 1e-12
METRICS = ("future_quality", "average_post_debut_exposure", "annualized_unique_reach", "list_fill")


def logical_bytes(path: Path) -> bytes:
    return path.read_bytes() if path.exists() else gzip.decompress(path.with_suffix(path.suffix + ".gz").read_bytes())


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def dominates(other: dict, point: dict) -> bool:
    gains = (other[METRICS[0]] - point[METRICS[0]], point[METRICS[1]] - other[METRICS[1]], other[METRICS[2]] - point[METRICS[2]])
    return all(gain >= -EPSILON for gain in gains) and any(gain > EPSILON for gain in gains)


def build_export() -> dict:
    paths = {name: STUDY / "results" / filename for name, filename in {
        "grid": "pooled_grid.json", "frontier": "pooled_frontiers.json", "metadata": "metadata.json",
    }.items()}
    blobs = {key: logical_bytes(path) for key, path in paths.items()}
    sources = {key: json.loads(value) for key, value in blobs.items()}
    rows, protocol = sources["grid"], sources["metadata"]
    assert len(rows) == protocol["configuration_count"] == 10400
    assert len({row["config_id"] for row in rows}) == len(rows)
    assert protocol["periods"]["pooled"] == ["2018-01", "2026-02"]
    assert {row["origin_count"] for row in rows} == {96}
    groups = defaultdict(list)
    for row in rows:
        assert row["meets_95pct_fill"] == (row["list_fill"] >= .95)
        assert 0 <= row[METRICS[0]] <= 1
        assert all(row[field] >= 0 for field in METRICS[1:])
        groups[row["behavior_hash"]].append(row)
    # Use the approved configuration to represent its equivalent result group.
    representatives = [next((row for row in group if row["config_id"] == CHOSEN), group[0]) for group in groups.values()]
    qualified = [row for row in representatives if row["meets_95pct_fill"]]
    frontier_hashes = {row["behavior_hash"] for row in qualified if not any(dominates(other, row) for other in qualified)}
    assert frontier_hashes == {row["behavior_hash"] for row in sources["frontier"]["up_to24"]["rows"]}
    assert all(row["pareto_up_to24"] == (row["behavior_hash"] in frontier_hashes) for row in rows)
    assert next(row for row in rows if row["config_id"] == CHOSEN)["behavior_hash"] in frontier_hashes

    points = []
    for representative in representatives:
        group = groups[representative["behavior_hash"]]
        for row in group:
            assert row["meets_95pct_fill"] == representative["meets_95pct_fill"]
            assert all(abs(row[field] - representative[field]) <= EPSILON for field in METRICS)
        points.append([representative["config_id"], *[representative[field] for field in METRICS],
                       representative["behavior_hash"] in frontier_hashes, [row["config_id"] for row in group]])
    counts = {"configurations": len(rows), "distinct_behaviors": len(points),
              "fill_qualified_configurations": sum(row["meets_95pct_fill"] for row in rows),
              "fill_qualified_behaviors": len(qualified), "full_frontier_behaviors": len(frontier_hashes),
              "full_frontier_configurations": sum(row["pareto_up_to24"] for row in rows)}
    assert list(counts.values()) == [10400, 6079, 3264, 2104, 97, 158]
    return {"metadata": {
        "schema_version": 2, "chosen_config_id": CHOSEN, "counts": counts,
        "snapshot_start": "2018-01", "snapshot_end": "2026-02", "snapshot_count": 96,
        "top_k": 20, "fill_floor": .95, "future_horizon_puzzles": 6, "dominance_tolerance": EPSILON,
        "point_fields": ["representative_id", *METRICS, "pareto_3d", "equivalent_config_ids"],
        "grid": protocol["grid"], "source_input_sha256": protocol["input_sha256"],
        "source_study_sha256": protocol["script_sha256"], "generator_sha256": sha(Path(__file__).read_bytes()),
        "source_files": {key: {"path": path.relative_to(ROOT).as_posix(), "logical_sha256": sha(blobs[key])} for key, path in paths.items()},
        "definition": "Each point is one distinct selection history. All configuration IDs and full-precision saved metrics are retained; equivalent configurations share one point.",
        "frontier_definition": "Among rules filling at least 95% of 20 places on average: maximize later participation and distinct names per year; minimize puzzles after debut. Highlight the full three-goal frontier in both projections.",
        "reach_definition": "Expected distinct displayed names, annualized over 98 calendar months. Independent selection within boundary ties.",
        "scope": "Descriptive pooled historical study. Export of saved results only; no new scoring or selection is performed.",
    }, "points": points}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export = build_export()
    content = (json.dumps(export, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    if args.check:
        assert OUTPUT.read_bytes() == content, "Article export is stale; regenerate it"
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(content)
    print(json.dumps({"path": OUTPUT.relative_to(ROOT).as_posix(), "checked": args.check,
                      "bytes": len(content), "gzip_bytes": len(gzip.compress(content)), **export["metadata"]["counts"]}))


if __name__ == "__main__":
    main()
