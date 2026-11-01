"""Tests for statistical metrics: Wilson score confidence intervals and Cohen's Kappa."""

from __future__ import annotations

import pytest

from quiz_eval.metrics import cohens_kappa, interpret_kappa, wilson_score_interval


def test_wilson_score_interval_symmetry_and_bounds() -> None:
    # 50 out of 100
    low, high = wilson_score_interval(50, 100)
    assert low < 0.5 < high
    assert round(0.5 - low, 3) == round(high - 0.5, 3)

    # 0 out of 100 (boundary test)
    low_0, high_0 = wilson_score_interval(0, 100)
    assert low_0 == 0.0
    assert 0.0 < high_0 < 0.05

    # 100 out of 100 (boundary test)
    low_100, high_100 = wilson_score_interval(100, 100)
    assert 0.95 < low_100 < 1.0
    assert high_100 == 1.0


def test_wilson_score_interval_errors() -> None:
    assert wilson_score_interval(0, 0) == (0.0, 0.0)

    with pytest.raises(ValueError):
        wilson_score_interval(-1, 10)

    with pytest.raises(ValueError):
        wilson_score_interval(11, 10)


def test_cohens_kappa_perfect_agreement() -> None:
    a = [1, 1, 0, 1, 0, 1, 0, 0, 1, 1]
    b = [1, 1, 0, 1, 0, 1, 0, 0, 1, 1]
    kappa = cohens_kappa(a, b)
    assert kappa == 1.0
    assert interpret_kappa(kappa) == "Almost perfect agreement"


def test_cohens_kappa_partial_agreement() -> None:
    # 8 matches, 2 mismatches out of 10
    a = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
    b = [1, 1, 1, 1, 1, 0, 1, 0, 0, 0]
    kappa = cohens_kappa(a, b)
    assert 0.4 < kappa < 1.0
    assert interpret_kappa(kappa) in ("Substantial agreement", "Moderate agreement")


def test_cohens_kappa_length_mismatch() -> None:
    with pytest.raises(ValueError):
        cohens_kappa([1, 0], [1])


def test_cohens_kappa_empty() -> None:
    assert cohens_kappa([], []) == 0.0


def test_interpret_kappa_categories() -> None:
    assert interpret_kappa(0.95) == "Almost perfect agreement"
    assert interpret_kappa(0.75) == "Substantial agreement"
    assert interpret_kappa(0.50) == "Moderate agreement"
    assert interpret_kappa(0.30) == "Fair agreement"
    assert interpret_kappa(0.10) == "Slight agreement"
    assert interpret_kappa(-0.1) == "Poor agreement (less than chance)"
