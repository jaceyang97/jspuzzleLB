"""Current records for review options; does not change live leaderboard data."""
import argparse
import json
from pathlib import Path

import numpy as np

import sweep


DEFAULT = ["W12-S3-E3-raw", "W12-S3-E3-wilson", "W12-S2-E2-wilson", "W12-S1-E1-wilson",
           "W12-S1-E1-beta", "W12-S1-E3-wilson", "W18-S2-E2-raw",
           "W18-S2-E3-raw", "W18-S3-E3-raw", "W20-S2-E3-raw"]


def parse(identifier):
    window, solves, exposure, method = identifier.split("-")
    return sweep.old.Config(int(window[1:]), int(solves[1:]), int(exposure[1:]), method)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", action="append")
    args = parser.parse_args()
    archive = sweep.old.Archive(sweep.old.ROOT / "public/data/data.json")
    sweep.all_past_prior_records(archive)
    origin = int(archive.months[-1])
    snapshot = archive.snapshot(origin, "train", with_future=False)
    result = {"as_of_completed_month": sweep.old.month_name(origin), "future_outcomes_evaluated": False,
              "input_sha256": archive.input_hash, "beta_prior": snapshot["prior"], "configurations": []}
    for identifier in args.config or DEFAULT:
        config = parse(identifier)
        ids = sweep.old.eligible(archive, snapshot, config)
        selected, weights = sweep.old.selected_weights(ids, snapshot["scores"][config.ranking], snapshot["solves"])
        groups = []
        rank = 1
        for index, weight in zip(selected, weights):
            score = round(float(snapshot["scores"][config.ranking][index]), 12)
            solves = int(snapshot["solves"][index])
            key = (score, solves)
            if not groups or key != groups[-1]["key"]:
                groups.append({"key": key, "score": score, "solves": solves, "rank": rank,
                               "inclusion_probability": float(weight), "members": []})
            groups[-1]["members"].append({"name": archive.names[index],
                "debut": sweep.old.month_name(int(archive.first_month[index])),
                "opportunities": int(snapshot["exposure"][index]), "solve_rate": float(snapshot["scores"]["raw"][index])})
            rank += 1
        for group in groups:
            group.pop("key")
            group["tie_size"] = len(group["members"])
            group["members"].sort(key=lambda person: person["name"])
        result["configurations"].append({"config_id": config.id, "eligible_count": len(ids),
            "displayed_people_including_full_boundary_tie": len(selected), "groups": groups})
    sweep.write_json(Path(__file__).parent / "results/current_options.json", result)
    print(json.dumps({"as_of": result["as_of_completed_month"], "options": [
        {"config_id": r["config_id"], "eligible": r["eligible_count"], "first_place_names": [p["name"] for p in r["groups"][0]["members"]],
         "first_place_record": str(r["groups"][0]["solves"]) + "/" + str(r["groups"][0]["members"][0]["opportunities"])} for r in result["configurations"]]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
