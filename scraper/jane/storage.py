from __future__ import annotations

import json
import os
from typing import Dict, Any, List

from loguru import logger

from .models import Puzzle


def load_existing(file_path: str) -> Dict[str, Dict[str, Any]]:
    """
    Load existing puzzles from disk and index them by key to allow cheap lookups.
    """
    if not os.path.exists(file_path):
        return {}

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            puzzles_list = json.load(f)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning(f"Failed to load existing puzzles from {file_path}: {exc}")
        return {}

    puzzles_dict: Dict[str, Dict[str, Any]] = {}
    for puzzle in puzzles_list:
        key = f"{puzzle.get('date_text')}_{puzzle.get('name')}"
        puzzles_dict[key] = puzzle

    logger.info(f"Loaded {len(puzzles_dict)} existing puzzles from {file_path}")
    return puzzles_dict


def save_puzzles(file_path: str, puzzles: List[Puzzle]) -> None:
    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump([p.to_dict() for p in puzzles], f, indent=2, default=str)
    logger.info(f"Saved {len(puzzles)} puzzles to {file_path}")


