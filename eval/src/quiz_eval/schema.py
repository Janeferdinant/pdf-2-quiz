"""Pydantic schemas for quiz question quality evaluation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class QuestionItem(BaseModel):
    id: str = Field(description="Unique question identifier, e.g. q001")
    source_id: str = Field(description="Source document identifier")
    type: Literal["multiple_choice", "true_false"]
    difficulty: Literal["easy", "medium", "hard"]
    question: str
    options: list[str]
    answer: int
    explanation: str
    evidence: str = Field(description="Extract from source text supporting the ground truth")


class RubricEvaluation(BaseModel):
    answerable_from_pdf: int = Field(
        ge=0, le=1, description="1 if fully supported by source text, 0 if hallucinatory"
    )
    exactly_one_correct: int = Field(
        ge=0, le=1, description="1 if exactly one key is unequivocally correct, 0 otherwise"
    )
    plausible_distractors: int = Field(
        ge=0, le=1, description="1 if wrong options are plausible/meaningful, 0 if trivial/nonsense"
    )
    no_ambiguity: int = Field(
        ge=0, le=1, description="1 if question and options are clear and unambiguous, 0 otherwise"
    )
    rationale: str = Field(default="", description="Justification for rubric scores")

    @property
    def passed_all(self) -> bool:
        return (
            self.answerable_from_pdf == 1
            and self.exactly_one_correct == 1
            and self.plausible_distractors == 1
            and self.no_ambiguity == 1
        )


class RatedQuestion(BaseModel):
    question: QuestionItem
    human_rating: RubricEvaluation
    judge_rating: RubricEvaluation | None = None


class RubricDimensionMetric(BaseModel):
    name: str
    n: int
    passed: int
    rate: float
    ci_lower: float
    ci_upper: float


class QualityReport(BaseModel):
    total_questions: int
    sources_count: int
    rubric_metrics: dict[str, RubricDimensionMetric]
    overall_pass_rate: float
    overall_ci_lower: float
    overall_ci_upper: float
    cohens_kappa: float
    kappa_interpretation: str


class SourceExcerpt(BaseModel):
    id: str = Field(description="Source excerpt identifier, e.g. src01_cellular_respiration")
    title: str = Field(description="Document title")
    discipline: str = Field(description="Academic field / discipline")
    license: str = Field(default="OpenStax CC BY 4.0", description="Open educational license")
    text: str = Field(description="Full text excerpt from OpenStax textbook")
    word_count: int = Field(description="Total word count of excerpt")
