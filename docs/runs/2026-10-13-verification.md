# Verification run, 2026-10-13

Node v22.20.0, npm 10.9.3, Windows 11. Branch `audit/2026-10`. **The real Gemini API was never called**: unit tests use hand-written mock replies and an injected fake client; the Playwright tests intercept the Gemini request and answer it with a mock, and abort every other external request.

## Before (origin/main 71cd65b, `npm audit --omit=dev` on the old lockfile)

18 vulnerabilities: 1 critical (`next@13.5.11`), 13 high, 3 moderate, 1 low.

## Original bugs, reproduced with a mocked reply before the fix

The `map()` body of the old `pages/api/generate-quiz.js` (lines 38-47) was run on a mocked reply:

```
Q1 answer=1 key="False"     <- model said answer 0 (True)
Q2 answer=null key=null     <- model said answer "Chlorophyll"
Q3 answer=1 key="False"     <- model said "false" (correct)
```

## After (this branch)

## npm ci

added 92 packages, and audited 93 packages in 27s

found 0 vulnerabilities
exit=0

## npm run build
  Collecting page data using 5 workers ...
  Generating static pages using 5 workers (0/3) ...
✓ Generating static pages using 5 workers (3/3) in 1947ms
  Finalizing page optimization ...
  Exporting using 15 workers (0/3) ...
✓ Exporting using 15 workers (3/3) in 961ms

Route (pages)
┌ ○ / (1229 ms)
├   /_app
└ ○ /404

○  (Static)  prerendered as static content


## npm test
# tests 100
# suites 12
# pass 100
# fail 0

## npm run test:e2e
  ok 1 [mobile-390] › tests\e2e\quiz.spec.mjs:78:1 › upload a PDF, generate questions, take the quiz and check the answer key (2.5s)
  ok 2 [desktop-1280] › tests\e2e\quiz.spec.mjs:78:1 › upload a PDF, generate questions, take the quiz and check the answer key (2.5s)
  ok 3 [mobile-390] › tests\e2e\quiz.spec.mjs:127:1 › "Remember for this tab" uses sessionStorage only (428ms)
  ok 4 [desktop-1280] › tests\e2e\quiz.spec.mjs:127:1 › "Remember for this tab" uses sessionStorage only (408ms)
  ok 5 [mobile-390] › tests\e2e\quiz.spec.mjs:139:1 › shows clear errors for a missing key, a non-PDF, an oversized PDF and a bad question count (2.5s)
  ok 6 [desktop-1280] › tests\e2e\quiz.spec.mjs:139:1 › shows clear errors for a missing key, a non-PDF, an oversized PDF and a bad question count (2.5s)
  6 passed (7.7s)

## npm audit --omit=dev
found 0 vulnerabilities

## npm audit (all)
found 0 vulnerabilities

## bundle checks (out/)
AIza matches: 0
GOOGLE_API_KEY matches: 0
localStorage.setItem of key: only 'theme' (see source)
1
console calls in lib/: 0
hosts referenced in lib/ and pages/:
https://ai.google.dev/gemini-api/docs/models
https://ai.google.dev/gemini-api/terms
https://aistudio.google.com/apikey

## Test-first evidence

`npm test` was run before `lib/quiz.mjs` and `lib/gemini.mjs` existed and failed (`ERR_MODULE_NOT_FOUND` for both modules, 0 tests passing). After implementing, one test caught a parser bug (an inner array being fished out of a broken object); it was fixed and all 100 pass.

## Not covered

No call to the real Gemini API was made, so the live request format, the model ids and the SDK's behaviour against Google's servers are checked only through the SDK's types, its source and the mocked tests. Model ids come from https://ai.google.dev/gemini-api/docs/models (read 2026-10-13).
