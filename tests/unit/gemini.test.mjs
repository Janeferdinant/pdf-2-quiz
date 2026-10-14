// Unit tests for lib/gemini.mjs. A fake client stands in for the Google Gen AI SDK,
// so these tests never touch the network or the real Gemini API.
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_MODEL, MODELS, describeGeminiError, generateQuiz, redactKey } from '../../lib/gemini.mjs'
import { QuizResponseError } from '../../lib/quiz.mjs'

const FAKE_KEY = 'AIzaTEST-not-a-real-key-0123456789abcd'

function fakeClient(responseText) {
  const calls = []
  return {
    calls,
    models: {
      async generateContent(req) {
        calls.push(req)
        if (responseText instanceof Error) throw responseText
        return { text: responseText }
      },
    },
  }
}

const mockedGeminiReply = JSON.stringify({
  questions: [
    { id: 1, type: 'true_false', question: 'Photosynthesis releases oxygen.', answer: 0, explanation: 'Oxygen is a by-product.' },
    { id: 2, type: 'multiple_choice', question: 'Which pigment absorbs light?', options: ['Haemoglobin', 'Chlorophyll', 'Melanin', 'Keratin'], answer: 'Chlorophyll' },
    { id: 3, type: 'true_false', question: 'Roots make glucose.', answer: 'false' },
  ],
})

const settings = { numQuestions: 3, quizType: 'both', difficulty: 'hard' }

describe('generateQuiz with a mocked Gemini client', () => {
  let logged
  const originals = {}
  beforeEach(() => {
    logged = []
    for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
      originals[level] = console[level]
      console[level] = (...args) => logged.push(args.map(String).join(' '))
    }
  })
  afterEach(() => {
    for (const level of Object.keys(originals)) console[level] = originals[level]
  })

  test('sends the difficulty, the model and a JSON response config', async () => {
    const client = fakeClient(mockedGeminiReply)
    await generateQuiz({ apiKey: FAKE_KEY, model: 'gemini-3.5-flash-lite', settings, sourceText: 'Plants make food.', client })
    assert.equal(client.calls.length, 1)
    const req = client.calls[0]
    assert.equal(req.model, 'gemini-3.5-flash-lite')
    assert.match(req.contents, /Difficulty: hard/)
    assert.ok(req.contents.includes('Plants make food.'))
    assert.equal(req.config.responseMimeType, 'application/json')
    assert.ok(req.config.responseJsonSchema)
  })

  test('returns a correct answer key (True stays True; text answers resolve)', async () => {
    const { questions } = await generateQuiz({ apiKey: FAKE_KEY, settings, sourceText: 'Plants make food.', client: fakeClient(mockedGeminiReply) })
    const key = questions.map((q) => q.options[q.answer])
    assert.deepEqual(key, ['True', 'Chlorophyll', 'False'])
  })

  test('uses the default model when none is given', async () => {
    const client = fakeClient(mockedGeminiReply)
    await generateQuiz({ apiKey: FAKE_KEY, settings, sourceText: 'x', client })
    assert.equal(client.calls[0].model, DEFAULT_MODEL)
  })

  test('rejects a model that is not on the list', async () => {
    await assert.rejects(
      generateQuiz({ apiKey: FAKE_KEY, model: 'evil/../model', settings, sourceText: 'x', client: fakeClient(mockedGeminiReply) }),
      /model/i,
    )
  })

  test('rejects a missing key before calling Gemini', async () => {
    const client = fakeClient(mockedGeminiReply)
    await assert.rejects(generateQuiz({ apiKey: '   ', settings, sourceText: 'x', client }), /API key/)
    assert.equal(client.calls.length, 0)
  })

  test('rejects invalid settings before calling Gemini', async () => {
    const client = fakeClient(mockedGeminiReply)
    await assert.rejects(generateQuiz({ apiKey: FAKE_KEY, settings: { ...settings, numQuestions: 51 }, sourceText: 'x', client }), /between 1 and 50/)
    assert.equal(client.calls.length, 0)
  })

  test('a malformed mocked reply surfaces as a QuizResponseError', async () => {
    await assert.rejects(
      generateQuiz({ apiKey: FAKE_KEY, settings, sourceText: 'x', client: fakeClient('{"questions": [') }),
      (e) => e instanceof QuizResponseError && e.code === 'malformed_json',
    )
  })

  test('never logs the key, on success or on failure', async () => {
    await generateQuiz({ apiKey: FAKE_KEY, settings, sourceText: 'x', client: fakeClient(mockedGeminiReply) })
    await generateQuiz({ apiKey: FAKE_KEY, settings, sourceText: 'x', client: fakeClient(new Error(`bad key ${FAKE_KEY}`)) }).catch(() => {})
    assert.ok(logged.every((line) => !line.includes(FAKE_KEY)), 'key appeared in console output')
  })
})

describe('describeGeminiError', () => {
  test('redacts the key from any message it returns', () => {
    const msg = describeGeminiError(new Error(`request failed for key=${FAKE_KEY}`), FAKE_KEY)
    assert.ok(!msg.includes(FAKE_KEY))
  })
  test('explains a rejected key', () => {
    const err = Object.assign(new Error('API key not valid. Please pass a valid API key.'), { status: 400 })
    assert.match(describeGeminiError(err, FAKE_KEY), /rejected the API key/i)
  })
  test('explains quota or rate limits', () => {
    assert.match(describeGeminiError(Object.assign(new Error('Resource exhausted'), { status: 429 }), FAKE_KEY), /quota|rate limit/i)
  })
  test('explains an unavailable model', () => {
    assert.match(describeGeminiError(Object.assign(new Error('not found'), { status: 404 }), FAKE_KEY), /model/i)
  })
  test('explains a network failure', () => {
    assert.match(describeGeminiError(new TypeError('Failed to fetch'), FAKE_KEY), /could not reach/i)
  })
  test('explains a malformed reply', () => {
    assert.match(describeGeminiError(new QuizResponseError('malformed_json', 'x'), FAKE_KEY), /not valid quiz JSON|try again/i)
  })
  test('redactKey replaces every occurrence', () => {
    assert.equal(redactKey(`a ${FAKE_KEY} b ${FAKE_KEY}`, FAKE_KEY), 'a [redacted] b [redacted]')
    assert.equal(redactKey('nothing here', ''), 'nothing here')
  })
})

describe('model list', () => {
  test('the default model is on the list', () => {
    assert.ok(MODELS.some((m) => m.id === DEFAULT_MODEL))
  })
})
