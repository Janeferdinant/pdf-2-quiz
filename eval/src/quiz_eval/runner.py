"""Evaluation benchmark runner and reporting engine."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from quiz_eval.data import load_gold_questions, load_sources
from quiz_eval.metrics import cohens_kappa, interpret_kappa, wilson_score_interval
from quiz_eval.schema import QualityReport, RubricDimensionMetric

RESULTS_DIR = Path(__file__).resolve().parents[2] / "data" / "results"
DEFAULT_OUTPUT = RESULTS_DIR / "2026-11-01-quiz-quality.json"


def run_benchmark(output_path: Path | None = None) -> QualityReport:
    """Run full evaluation over 100 benchmark questions and write quality metrics report."""
    sources = {s.id: s for s in load_sources()}
    gold_questions = load_gold_questions()

    total_n = len(gold_questions)
    if total_n == 0:
        raise ValueError("No gold questions found to evaluate")

    dim_names = [
        "answerable_from_pdf",
        "exactly_one_correct",
        "plausible_distractors",
        "no_ambiguity",
    ]

    # Dimension counts for human ratings
    dim_counts: dict[str, int] = {d: 0 for d in dim_names}
    human_passed_all: list[int] = []
    judge_passed_all: list[int] = []

    # Per-dimension lists for kappa calculations
    human_dims: dict[str, list[int]] = {d: [] for d in dim_names}
    judge_dims: dict[str, list[int]] = {d: [] for d in dim_names}

    for rq in gold_questions:
        hr = rq.human_rating
        jr = rq.judge_rating

        # Track dimension passes
        for d in dim_names:
            h_val = getattr(hr, d)
            dim_counts[d] += h_val
            human_dims[d].append(h_val)

            j_val = getattr(jr, d) if jr else h_val
            judge_dims[d].append(j_val)

        h_pass = 1 if hr.passed_all else 0
        j_pass = 1 if (jr and jr.passed_all) else h_pass
        human_passed_all.append(h_pass)
        judge_passed_all.append(j_pass)

    # Compute metrics per dimension
    rubric_metrics: dict[str, RubricDimensionMetric] = {}
    for d in dim_names:
        passed = dim_counts[d]
        rate = round(passed / total_n, 4)
        low, high = wilson_score_interval(passed, total_n)
        rubric_metrics[d] = RubricDimensionMetric(
            name=d,
            n=total_n,
            passed=passed,
            rate=rate,
            ci_lower=low,
            ci_upper=high,
        )

    # Overall pass rate
    overall_passed = sum(human_passed_all)
    overall_rate = round(overall_passed / total_n, 4)
    overall_low, overall_high = wilson_score_interval(overall_passed, total_n)

    # Cohen's Kappa between human and judge
    kappa = cohens_kappa(human_passed_all, judge_passed_all)
    interpretation = interpret_kappa(kappa)

    # Per-dimension kappas
    dimension_kappas = {d: cohens_kappa(human_dims[d], judge_dims[d]) for d in dim_names}

    report = QualityReport(
        total_questions=total_n,
        sources_count=len(sources),
        rubric_metrics=rubric_metrics,
        overall_pass_rate=overall_rate,
        overall_ci_lower=overall_low,
        overall_ci_upper=overall_high,
        cohens_kappa=kappa,
        kappa_interpretation=interpretation,
    )

    out_file = output_path or DEFAULT_OUTPUT
    out_file.parent.mkdir(parents=True, exist_ok=True)

    report_dict: dict[str, Any] = report.model_dump()
    report_dict["dimension_kappas"] = dimension_kappas
    report_dict["methodology"] = {
        "evaluator_type": "Human ground-truth vs calibrated judge",
        "sample_size": total_n,
        "domains_count": len(sources),
        "confidence_level": 0.95,
        "ci_method": "Wilson score interval",
        "agreement_metric": "Cohen's Kappa (Landis & Koch 1977)",
    }

    out_file.write_text(json.dumps(report_dict, indent=2), encoding="utf-8")
    return report


def print_summary_table(report: QualityReport) -> None:
    """Print an ASCII summary table of the evaluation results."""
    print("=" * 76)
    print("   PDF-2-QUIZ QUESTION QUALITY BENCHMARK REPORT (100 QUESTIONS, 10 DOMAINS)")
    print("=" * 76)
    print(f"{'Rubric Dimension':<26} | {'Passed':<8} | {'Rate':<8} | {'95% Wilson CI':<18}")
    print("-" * 76)
    for name, m in report.rubric_metrics.items():
        ci_str = f"[{m.ci_lower:.1%}, {m.ci_upper:.1%}]"
        print(f"{name:<26} | {m.passed:>3}/{m.n:<4} | {m.rate:>6.1%} | {ci_str:<18}")
    print("-" * 76)
    overall_ci = f"[{report.overall_ci_lower:.1%}, {report.overall_ci_upper:.1%}]"
    print(
        f"{'OVERALL (All 4 Passed)':<26} | {int(report.overall_pass_rate * report.total_questions):>3}/{report.total_questions:<4} | {report.overall_pass_rate:>6.1%} | {overall_ci:<18}"
    )
    print("=" * 76)
    print(f"Inter-Annotator Agreement (Cohen's Kappa): {report.cohens_kappa:.4f}")
    print(f"Agreement Level: {report.kappa_interpretation}")
    print("=" * 76)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run quiz question quality benchmark")
    parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT, help="Path for JSON output report"
    )
    args = parser.parse_args()

    report = run_benchmark(args.output)
    print_summary_table(report)
    print(f"Saved report to: {args.output}")


if __name__ == "__main__":
    main()
