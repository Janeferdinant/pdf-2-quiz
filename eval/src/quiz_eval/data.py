"""Dataset loading utilities for 10-source benchmark and 100 gold evaluated questions."""

from __future__ import annotations

import json
from pathlib import Path

from quiz_eval.schema import RatedQuestion, SourceExcerpt

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SOURCES_DIR = DATA_DIR / "sources"
GOLD_FILE = DATA_DIR / "gold_100_questions.json"

SOURCE_METADATA: dict[str, tuple[str, str]] = {
    "src01_cellular_respiration": ("Cellular Respiration and Metabolism", "Biology"),
    "src02_thermodynamics": ("Fundamental Laws of Thermodynamics", "Physics"),
    "src03_chemical_bonding": ("Chemical Bonding and Molecular Structure", "Chemistry"),
    "src04_classical_mechanics": ("Newton's Laws and Momentum", "Physics"),
    "src05_macroeconomics_gdp": ("Measuring National Output", "Economics"),
    "src06_cognitive_psychology": ("Memory Processes and Encoding", "Psychology"),
    "src07_stellar_evolution": ("The Life and Death of Stars", "Astronomy"),
    "src08_us_constitution": ("Constitutional Foundations and Federalism", "Political Science"),
    "src09_human_circulatory_system": ("The Cardiovascular System", "Anatomy & Physiology"),
    "src10_social_stratification": ("Social Stratification and Class", "Sociology"),
}


def load_sources() -> list[SourceExcerpt]:
    """Load all 10 OpenStax textbook source excerpts."""
    if not SOURCES_DIR.is_dir():
        raise FileNotFoundError(f"Sources directory not found at {SOURCES_DIR}")

    sources: list[SourceExcerpt] = []
    for path in sorted(SOURCES_DIR.glob("*.txt")):
        source_id = path.stem
        meta = SOURCE_METADATA.get(source_id, (source_id.replace("_", " ").title(), "General"))
        text = path.read_text(encoding="utf-8").strip()
        word_count = len(text.split())
        sources.append(
            SourceExcerpt(
                id=source_id,
                title=meta[0],
                discipline=meta[1],
                license="OpenStax CC BY 4.0",
                text=text,
                word_count=word_count,
            )
        )
    return sources


def load_gold_questions() -> list[RatedQuestion]:
    """Load 100 calibrated gold questions with human and judge ratings."""
    if not GOLD_FILE.is_file():
        raise FileNotFoundError(f"Gold questions dataset not found at {GOLD_FILE}")

    raw = json.loads(GOLD_FILE.read_text(encoding="utf-8"))
    return [RatedQuestion.model_validate(item) for item in raw]
