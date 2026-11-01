"""4-tier rubric evaluation engine and calibrated judge for quiz questions."""

from __future__ import annotations

import re

from quiz_eval.schema import QuestionItem, RubricEvaluation

FORBIDDEN_DISTRACTOR_PATTERNS = [
    r"^none of the above[.]?$",
    r"^all of the above[.]?$",
    r"^both [a-d] and [a-d][.]?$",
    r"^neither [a-d] nor [a-d][.]?$",
    r"^n/?a$",
    r"^unknown$",
    r"^\?+$",
]

DOUBLE_NEGATIVE_PATTERNS = [
    r"not\s+un[a-z]+",
    r"neither\s+.*\s+nor",
    r"which of the following is not false",
    r"which of the following is not untrue",
]


def normalize_text(text: str) -> str:
    """Normalize text for lexical matching: lowercase, strip punctuation and whitespace."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return " ".join(text.split())


class CalibratedJudge:
    """Rule-calibrated judge evaluating questions against the 4-tier quality rubric."""

    @classmethod
    def evaluate(cls, item: QuestionItem, source_text: str) -> RubricEvaluation:
        """Evaluate a single question against the 4 rubric dimensions using the source text."""
        ans_score, ans_reason = cls.check_answerable(item, source_text)
        key_score, key_reason = cls.check_exactly_one_correct(item)
        dist_score, dist_reason = cls.check_plausible_distractors(item)
        amb_score, amb_reason = cls.check_no_ambiguity(item)

        reasons = [r for r in [ans_reason, key_reason, dist_reason, amb_reason] if r]
        rationale = "; ".join(reasons) if reasons else "Fully satisfies all quality criteria."

        return RubricEvaluation(
            answerable_from_pdf=ans_score,
            exactly_one_correct=key_score,
            plausible_distractors=dist_score,
            no_ambiguity=amb_score,
            rationale=rationale,
        )

    @classmethod
    def check_answerable(cls, item: QuestionItem, source_text: str) -> tuple[int, str]:
        """Dimension 1: Is the question factually supported by and answerable from the text?"""
        norm_source = normalize_text(source_text)
        norm_ev = normalize_text(item.evidence)

        if not norm_ev or len(norm_ev.split()) < 3:
            return 0, "Missing or insufficient evidence quote from source"

        # Check if evidence snippet is grounded in source
        if norm_ev in norm_source:
            return 1, ""

        # Check partial overlap of key phrases
        ev_words = set(norm_ev.split())
        source_words = set(norm_source.split())
        overlap = len(ev_words & source_words) / max(len(ev_words), 1)

        if overlap >= 0.85:
            return 1, ""

        return 0, f"Evidence quote not found in source text (lexical overlap {overlap:.1%})"

    @classmethod
    def check_exactly_one_correct(cls, item: QuestionItem) -> tuple[int, str]:
        """Dimension 2: Is there unequivocally exactly one correct answer key?"""
        if item.answer < 0 or item.answer >= len(item.options):
            return 0, f"Answer index {item.answer} is out of options bounds"

        # Check for duplicate options
        norm_options = [normalize_text(opt) for opt in item.options]
        if len(norm_options) != len(set(norm_options)):
            return 0, "Duplicate options detected; key is ambiguous"

        if item.type == "true_false":
            if len(item.options) != 2:
                return 0, f"True/false question must have 2 options, found {len(item.options)}"
            return 1, ""

        if item.type == "multiple_choice":
            if len(item.options) != 4:
                return 0, f"Multiple choice question must have 4 options, found {len(item.options)}"
            return 1, ""

        return 0, f"Unknown question type: {item.type}"

    @classmethod
    def check_plausible_distractors(cls, item: QuestionItem) -> tuple[int, str]:
        """Dimension 3: Are incorrect options plausible, domain-appropriate, and non-trivial?"""
        if item.type == "true_false":
            # True/False options are standard binary opposites
            return 1, ""

        correct_opt = item.options[item.answer]
        distractors = [opt for i, opt in enumerate(item.options) if i != item.answer]

        for d in distractors:
            # Check forbidden giveaways
            for pat in FORBIDDEN_DISTRACTOR_PATTERNS:
                if re.search(pat, d.strip(), re.IGNORECASE):
                    return 0, f"Distractor '{d}' relies on lazy pattern '{pat}'"

            # Check for empty or trivial distractors
            if len(d.strip()) < 2:
                return 0, f"Trivially short distractor: '{d}'"

        # Check extreme length imbalance (distractors should not be vastly shorter than answer)
        correct_len = len(correct_opt.split())
        dist_lens = [len(d.split()) for d in distractors]
        avg_dist_len = sum(dist_lens) / max(len(dist_lens), 1)

        # If answer is 15 words and all distractors are 1 word, it's an obvious tell
        if correct_len >= 12 and avg_dist_len <= 2:
            return (
                0,
                f"Severe length bias: answer is {correct_len} words but distractors avg {avg_dist_len:.1f}",
            )

        return 1, ""

    @classmethod
    def check_no_ambiguity(cls, item: QuestionItem) -> tuple[int, str]:
        """Dimension 4: Is the question and options phrasing clear and free of confusing ambiguity?"""
        q = item.question.strip()
        if len(q) < 15:
            return 0, f"Question too short ({len(q)} chars)"

        # Check for confusing double negatives
        for pat in DOUBLE_NEGATIVE_PATTERNS:
            if re.search(pat, q, re.IGNORECASE):
                return 0, f"Confusing double negative phrasing detected: '{pat}'"

        # Check each option for non-empty string
        for i, opt in enumerate(item.options):
            if not opt.strip():
                return 0, f"Option {i} is empty"

        return 1, ""
