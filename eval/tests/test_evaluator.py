"""Unit tests for the 4-tier rubric evaluator and calibrated judge."""

from __future__ import annotations

from quiz_eval.evaluator import CalibratedJudge
from quiz_eval.schema import QuestionItem

SAMPLE_SOURCE = """
Photosynthesis takes place primarily in leaves within specialized structures known as chloroplasts.
Within the chloroplast, chlorophyll absorbs sunlight, converting solar energy into chemical energy.
The process converts carbon dioxide and water into glucose and oxygen gas.
The overall chemical equation is 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2.
"""


def test_valid_question_passes_all_rubric_dimensions() -> None:
    q = QuestionItem(
        id="test_01",
        source_id="src_bio",
        type="multiple_choice",
        difficulty="easy",
        question="Where in plant leaves does photosynthesis primarily take place?",
        options=["Chloroplasts", "Mitochondria", "Ribosomes", "Vacuoles"],
        answer=0,
        explanation="Photosynthesis takes place within specialized structures known as chloroplasts.",
        evidence="Photosynthesis takes place primarily in leaves within specialized structures known as chloroplasts.",
    )

    rating = CalibratedJudge.evaluate(q, SAMPLE_SOURCE)
    assert rating.answerable_from_pdf == 1
    assert rating.exactly_one_correct == 1
    assert rating.plausible_distractors == 1
    assert rating.no_ambiguity == 1
    assert rating.passed_all is True


def test_hallucinated_evidence_fails_answerable() -> None:
    q = QuestionItem(
        id="test_02",
        source_id="src_bio",
        type="multiple_choice",
        difficulty="easy",
        question="What enzyme is the primary catalyst in the Krebs cycle?",
        options=["Citrate synthase", "ATP synthase", "DNA polymerase", "Amylase"],
        answer=0,
        explanation="Citrate synthase catalyzes the first reaction of the Krebs cycle.",
        evidence="Citrate synthase catalyzes oxaloacetate condensation in the Krebs cycle.",
    )

    rating = CalibratedJudge.evaluate(q, SAMPLE_SOURCE)
    assert rating.answerable_from_pdf == 0
    assert "Evidence quote not found" in rating.rationale
    assert rating.passed_all is False


def test_duplicate_options_fails_exactly_one_correct() -> None:
    q = QuestionItem(
        id="test_03",
        source_id="src_bio",
        type="multiple_choice",
        difficulty="easy",
        question="Which organelle absorbs light energy during photosynthesis?",
        options=["Chloroplast", "chloroplast", "Mitochondria", "Ribosome"],
        answer=0,
        explanation="Chloroplasts absorb sunlight.",
        evidence="Within the chloroplast, chlorophyll absorbs sunlight",
    )

    rating = CalibratedJudge.evaluate(q, SAMPLE_SOURCE)
    assert rating.exactly_one_correct == 0
    assert "Duplicate options detected" in rating.rationale
    assert rating.passed_all is False


def test_lazy_distractor_fails_plausible_distractors() -> None:
    q = QuestionItem(
        id="test_04",
        source_id="src_bio",
        type="multiple_choice",
        difficulty="medium",
        question="What gas is released as a byproduct during photosynthesis?",
        options=["Oxygen gas", "All of the above", "Nitrogen gas", "Carbon monoxide"],
        answer=0,
        explanation="Oxygen gas is produced as a byproduct.",
        evidence="The process converts carbon dioxide and water into glucose and oxygen gas.",
    )

    rating = CalibratedJudge.evaluate(q, SAMPLE_SOURCE)
    assert rating.plausible_distractors == 0
    assert "relies on lazy pattern" in rating.rationale
    assert rating.passed_all is False


def test_double_negative_fails_no_ambiguity() -> None:
    q = QuestionItem(
        id="test_05",
        source_id="src_bio",
        type="true_false",
        difficulty="easy",
        question="Which of the following is not false regarding chloroplast function?",
        options=["True", "False"],
        answer=0,
        explanation="Chloroplasts carry out photosynthesis.",
        evidence="Photosynthesis takes place primarily in leaves within specialized structures known as chloroplasts.",
    )

    rating = CalibratedJudge.evaluate(q, SAMPLE_SOURCE)
    assert rating.no_ambiguity == 0
    assert "Confusing double negative" in rating.rationale
    assert rating.passed_all is False
