# Question Quality Evaluation Run, 2026-11-01

Evaluation run for `pdf-2-quiz` question quality benchmark using a 4-tier evaluation rubric, 10 open-source textbook excerpts, and a calibrated LLM-as-a-judge evaluated against 100 human ground-truth labels.

## Benchmark Summary

- **Date:** 2026-11-01
- **Target Prompt:** Externalized single source-of-truth prompt schema in `src/prompts/quiz.json` (mirrored by `lib/quiz.mjs` and `eval/src/quiz_eval/prompt.py`).
- **Dataset:** 10 OpenStax textbook chapters across 10 disciplines (Biology, Physics, Chemistry, Classical Mechanics, Economics, Psychology, Astronomy, Political Science, Anatomy/Physiology, Sociology). License: Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Questions:** 100 questions (10 per source document; 60 multiple-choice, 40 true/false).
- **Evaluation Engine:** `eval/src/quiz_eval` (Python 3.11, Pydantic v2).
- **Statistical Framework:** 95% Wilson score confidence intervals for binomial pass rates; Cohen's Kappa ($\kappa$) for inter-annotator agreement (Landis & Koch, 1977).

## 4-Tier Evaluation Rubric

Every generated question is evaluated across four distinct binary dimensions:

1. **`answerable_from_pdf` (Groundedness / Faithfulness):**
   The question must be factually supported by and answerable exclusively from the provided source excerpt. The question must provide an authentic verbatim evidence quote directly traceable to the text. Hallucinated facts, unsupported claims, or external prerequisites score 0.
2. **`exactly_one_correct` (Key Unambiguity):**
   There must be unequivocally one correct answer key. Answer indices must be in bounds; multiple choice questions must feature exactly 4 distinct options; true/false questions must feature exactly 2 distinct options; no duplicate or synonymous options are permitted.
3. **`plausible_distractors` (Distractor Quality):**
   Incorrect options must be plausible, topical, and domain-appropriate. Distractors must avoid trivial giveaways, such as "None of the above", "All of the above", empty placeholders, single-character strings, or extreme length disparities that telegraph the correct answer.
4. **`no_ambiguity` (Clarity & Readability):**
   The prompt stem and option phrasing must be grammatically coherent, concise, and free from confusing ambiguity or double negatives (e.g. "Which of the following is not untrue...").

A question achieves an overall pass only if it satisfies all four dimensions (`passed_all = 1`).

## Benchmark Results

Evaluation conducted across all 100 gold questions:

| Rubric Dimension | Passed / Total | Pass Rate | 95% Wilson Score CI |
|---|:---:|:---:|:---:|
| **Answerable from Source (`answerable_from_pdf`)** | 99 / 100 | **99.0%** | [94.5%, 99.8%] |
| **Exactly One Correct Key (`exactly_one_correct`)** | 99 / 100 | **99.0%** | [94.5%, 99.8%] |
| **Plausible Distractors (`plausible_distractors`)** | 97 / 100 | **97.0%** | [91.5%, 99.0%] |
| **No Ambiguity / Clear Stem (`no_ambiguity`)** | 97 / 100 | **97.0%** | [91.5%, 99.0%] |
| **OVERALL (Passes All 4 Dimensions)** | **92 / 100** | **92.0%** | **[85.0%, 95.9%]** |

## Judge Calibration & Inter-Annotator Agreement

To ensure evaluation rigor without human bottlenecking, an automated judge (`CalibratedJudge`) was calibrated against the 100 human ground-truth labels:

- **Observed Agreement:** 99.0% (99 of 100 questions evaluated identically).
- **Cohen's Kappa ($\kappa$):** **0.9280**
- **Interpretation:** **Almost perfect agreement** (Landis & Koch standard: $\kappa \ge 0.81$).

### Failure Modes & Edge Case Analysis

The benchmark identified 8 failure modes across the 100 questions, reflecting realistic model challenges:

1. **Repetitive distractor permutations (`q006`):** In cellular respiration, minor variations of NADH counts in distractors created repetitive options.
2. **Boundary ambiguity in stem (`q020`):** Phrasing regarding universe entropy change at equilibrium caused potential ambiguity regarding isolated vs open system boundaries.
3. **Multiple mathematically valid equations (`q035`):** In Newton's Second Law, an option containing $p = mv$ was also a valid physical relation in mechanics, introducing slight key ambiguity.
4. **Synthetic distractor formula (`q044`):** A distractor formula in GDP deflator calculations was synthetically contrived rather than a natural student misconception.
5. **Double negative stem (`q068`):** True/false prompt with negative phrasing created minor reading ambiguity.
6. **Outside knowledge required (`q080`):** An Article V amendment ratification question required external institutional knowledge not fully detailed in the excerpt text.
7. **Biologically implausible distractor (`q085`):** Distractor in pulmonary circulation described blood flowing backwards through veins.
8. **Subtle wording divergence (`q099`):** Human reviewer noted word "inherently" was not verbatim in text, while calibrated judge evaluated functionalist stance as conceptually supported (the single human-judge divergence case).

## Parity & Synchronisation

The prompt definition is maintained as a single JSON file:
- `src/prompts/quiz.json` is imported by the Next.js frontend (`lib/quiz.mjs`) during runtime quiz generation.
- The Python evaluation harness reads `src/prompts/quiz.json` via `eval/src/quiz_eval/prompt.py`.
- Automated test `tests/unit/shared_prompt.test.mjs` and `eval/tests/test_prompt_sync.py` enforce character-for-character prompt synchronization across JS and Python test suites.

## Reproduction Instructions

To reproduce the benchmark evaluation and verify all metrics:

```bash
# 1. Run full Python evaluation test suite (17 unit & integration tests)
pytest eval/tests

# 2. Run benchmark runner and display summary table
python -m quiz_eval.runner

# 3. Verify JavaScript test suite (102 tests)
npm test

# 4. Verify Next.js production build export
npm run build
```
