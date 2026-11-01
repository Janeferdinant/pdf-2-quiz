"""Integration test for the benchmark evaluation runner."""

from __future__ import annotations

import json
from pathlib import Path

from quiz_eval.runner import run_benchmark


def test_run_benchmark_end_to_end(tmp_path: Path) -> None:
    out_file = tmp_path / "test_report.json"
    report = run_benchmark(out_file)

    assert report.total_questions == 100
    assert report.sources_count == 10
    assert report.overall_pass_rate >= 0.80
    assert report.overall_ci_lower <= report.overall_pass_rate <= report.overall_ci_upper

    # Check Cohen's Kappa exceeds standard threshold
    assert report.cohens_kappa >= 0.70
    assert report.kappa_interpretation in ("Substantial agreement", "Almost perfect agreement")

    # Check 4 dimensions
    for dim_name in (
        "answerable_from_pdf",
        "exactly_one_correct",
        "plausible_distractors",
        "no_ambiguity",
    ):
        assert dim_name in report.rubric_metrics
        m = report.rubric_metrics[dim_name]
        assert m.n == 100
        assert m.passed >= 80
        assert m.rate >= 0.80
        assert m.ci_lower < m.rate < m.ci_upper

    # Verify JSON file
    assert out_file.is_file()
    saved = json.loads(out_file.read_text(encoding="utf-8"))
    assert saved["total_questions"] == 100
    assert "methodology" in saved
    assert saved["methodology"]["ci_method"] == "Wilson score interval"
