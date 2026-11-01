"""Tests asserting prompt synchronization between JS app and Python eval harness."""

from __future__ import annotations

from quiz_eval.prompt import PROMPT_PATH, build_prompt, load_prompt_config


def test_eval_reads_same_prompt() -> None:
    assert PROMPT_PATH.is_file(), f"Expected prompt file at {PROMPT_PATH}"
    cfg = load_prompt_config()

    assert cfg["name"] == "pdf-2-quiz-generation"
    assert "system_role" in cfg
    assert "rules" in cfg
    assert len(cfg["rules"]) == 5
    assert "difficulty_text" in cfg
    assert "type_text" in cfg
    assert "response_schema" in cfg


def test_build_prompt_structure() -> None:
    text = "Photosynthesis occurs in chloroplasts."
    prompt = build_prompt(text, num_questions=4, quiz_type="mcq", difficulty="easy")

    cfg = load_prompt_config()
    assert cfg["system_role"] in prompt
    assert "Write exactly 4 questions: multiple-choice questions only." in prompt
    assert cfg["difficulty_text"]["easy"] in prompt
    for rule in cfg["rules"]:
        assert f"- {rule}" in prompt
    assert "<source_text>\n" + text + "\n</source_text>" in prompt
