"""Tests for dataset loading and validation of 10 sources and 100 gold questions."""

from __future__ import annotations

from quiz_eval.data import load_gold_questions, load_sources


def test_load_sources_completeness() -> None:
    sources = load_sources()
    assert len(sources) == 10, f"Expected 10 sources, got {len(sources)}"

    ids = {s.id for s in sources}
    assert len(ids) == 10, "Source IDs must be unique"

    for s in sources:
        assert s.id.startswith("src")
        assert len(s.title) > 0
        assert len(s.discipline) > 0
        assert s.license == "OpenStax CC BY 4.0"
        assert s.word_count >= 200, f"Source {s.id} too short ({s.word_count} words)"
        assert len(s.text) >= 1000, f"Source {s.id} character count too low ({len(s.text)} chars)"


def test_load_gold_questions_integrity() -> None:
    questions = load_gold_questions()
    assert len(questions) == 100, f"Expected 100 gold questions, got {len(questions)}"

    # Check question ID uniqueness
    q_ids = {rq.question.id for rq in questions}
    assert len(q_ids) == 100, "Question IDs must be unique"

    # Check distribution across sources: exactly 10 per source
    by_source: dict[str, int] = {}
    mcq_count = 0
    tf_count = 0

    for rq in questions:
        q = rq.question
        by_source[q.source_id] = by_source.get(q.source_id, 0) + 1

        assert 0 <= q.answer < len(q.options), f"Question {q.id} answer index out of bounds"
        assert len(q.evidence) > 0, f"Question {q.id} missing evidence quote"
        assert len(q.explanation) > 0, f"Question {q.id} missing explanation"

        if q.type == "multiple_choice":
            mcq_count += 1
            assert len(q.options) == 4, f"Question {q.id} MCQ must have 4 options"
        elif q.type == "true_false":
            tf_count += 1
            assert len(q.options) == 2, f"Question {q.id} TF must have 2 options"

        # Check human rating
        hr = rq.human_rating
        for dim in (
            hr.answerable_from_pdf,
            hr.exactly_one_correct,
            hr.plausible_distractors,
            hr.no_ambiguity,
        ):
            assert dim in (0, 1), f"Human rating dimension out of range in {q.id}"

        # Check judge rating
        if rq.judge_rating is not None:
            jr = rq.judge_rating
            for dim in (
                jr.answerable_from_pdf,
                jr.exactly_one_correct,
                jr.plausible_distractors,
                jr.no_ambiguity,
            ):
                assert dim in (0, 1), f"Judge rating dimension out of range in {q.id}"

    assert len(by_source) == 10, f"Expected 10 distinct sources, got {len(by_source)}"
    for src_id, count in by_source.items():
        assert count == 10, f"Source {src_id} has {count} questions, expected 10"

    assert mcq_count == 60, f"Expected 60 MCQs, got {mcq_count}"
    assert tf_count == 40, f"Expected 40 TFs, got {tf_count}"
