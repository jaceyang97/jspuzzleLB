from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict, Any


@dataclass
class Puzzle:
    date_text: str
    name: str
    solution_url: str
    solvers: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PuzzleMeta:
    date_text: str
    name: str
    solution_url: str
    date: datetime


