"""Shared prompt loader and builder in Python, ensuring exact parity with lib/quiz.mjs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
PROMPT_PATH = ROOT / "src" / "prompts" / "quiz.json"


def load_prompt_config() -> dict[str, Any]:
    """Load the single source-of-truth quiz generation prompt specification."""
    if not PROMPT_PATH.is_file():
        raise FileNotFoundError(f"Shared prompt file not found at {PROMPT_PATH}")
    return json.loads(PROMPT_PATH.read_text(encoding="utf-8"))


def build_prompt(
    text: str,
    num_questions: int,
    quiz_type: str = "both",
    difficulty: str = "medium",
) -> str:
    """Build the exact generation prompt sent to Gemini, matching lib/quiz.mjs character-for-character."""
    cfg = load_prompt_config()
    safe_text = str(text).replace("<source_text>", "").replace("</source_text>", "")

    type_text = cfg["type_text"].get(quiz_type, cfg["type_text"]["both"])
    difficulty_text = cfg["difficulty_text"].get(difficulty, cfg["difficulty_text"]["medium"])

    lines = [
        cfg["system_role"],
        f"Write exactly {num_questions} questions: {type_text}.",
        difficulty_text,
        "Rules:",
    ]
    for rule in cfg["rules"]:
        lines.append(f"- {rule}")
    lines.append(f"Return only JSON of this shape: {cfg['json_shape']}")
    lines.append("")
    lines.append("<source_text>")
    lines.append(safe_text)
    lines.append("</source_text>")

    return "\n".join(lines)
