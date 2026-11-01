"""Statistical metrics for evaluation: Wilson score intervals and Cohen's Kappa."""

from __future__ import annotations

import math
from collections.abc import Sequence


def wilson_score_interval(
    k: int,
    n: int,
    confidence: float = 0.95,
) -> tuple[float, float]:
    """Calculate the Wilson score confidence interval for a binomial proportion.

    Args:
        k: Number of successes (non-negative integer <= n)
        n: Total number of trials (positive integer)
        confidence: Confidence level (default 0.95 -> z = 1.95996)

    Returns:
        tuple (lower, upper) bounded in [0.0, 1.0].
    """
    if n <= 0:
        return (0.0, 0.0)
    if k < 0 or k > n:
        raise ValueError(f"Successes k={k} must satisfy 0 <= k <= n={n}")

    # Standard normal quantile approximations
    z_map = {
        0.90: 1.644853,
        0.95: 1.959964,
        0.99: 2.575829,
    }
    z = z_map.get(round(confidence, 2), 1.959964)

    p = k / n
    z2 = z * z
    denom = 1.0 + z2 / n
    center = p + z2 / (2.0 * n)
    spread = z * math.sqrt((p * (1.0 - p)) / n + z2 / (4.0 * n * n))

    lower = max(0.0, (center - spread) / denom)
    upper = min(1.0, (center + spread) / denom)
    return (round(lower, 4), round(upper, 4))


def cohens_kappa(
    rater_a: Sequence[int],
    rater_b: Sequence[int],
) -> float:
    """Calculate Cohen's Kappa coefficient between two binary raters (values in {0, 1}).

    Args:
        rater_a: Ratings from annotator A (list of 0 or 1)
        rater_b: Ratings from annotator B (list of 0 or 1)

    Returns:
        Cohen's Kappa float rounded to 4 decimals.
    """
    if len(rater_a) != len(rater_b):
        raise ValueError("Rater sequences must have equal length")
    n = len(rater_a)
    if n == 0:
        return 0.0

    # Confusion matrix
    # a: both 1, b: rater_a=1 & rater_b=0, c: rater_a=0 & rater_b=1, d: both 0
    a = sum(1 for x, y in zip(rater_a, rater_b) if x == 1 and y == 1)
    b = sum(1 for x, y in zip(rater_a, rater_b) if x == 1 and y == 0)
    c = sum(1 for x, y in zip(rater_a, rater_b) if x == 0 and y == 1)
    d = sum(1 for x, y in zip(rater_a, rater_b) if x == 0 and y == 0)

    p_observed = (a + d) / n

    p_a1 = (a + b) / n
    p_a0 = (c + d) / n
    p_b1 = (a + c) / n
    p_b0 = (b + d) / n

    p_expected = (p_a1 * p_b1) + (p_a0 * p_b0)

    if math.isclose(p_expected, 1.0):
        return 1.0 if math.isclose(p_observed, 1.0) else 0.0

    kappa = (p_observed - p_expected) / (1.0 - p_expected)
    return round(kappa, 4)


def interpret_kappa(kappa: float) -> str:
    """Interpret Cohen's Kappa score using Landis & Koch (1977) benchmark guidelines."""
    if kappa >= 0.81:
        return "Almost perfect agreement"
    if kappa >= 0.61:
        return "Substantial agreement"
    if kappa >= 0.41:
        return "Moderate agreement"
    if kappa >= 0.21:
        return "Fair agreement"
    if kappa >= 0.0:
        return "Slight agreement"
    return "Poor agreement (less than chance)"
