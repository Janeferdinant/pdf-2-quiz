// Unit test verifying that the app uses the shared prompt file in src/prompts/quiz.json.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import quizPrompt from '../../src/prompts/quiz.json' with { type: 'json' }
import {
  buildPrompt,
  QUIZ_RESPONSE_SCHEMA,
  TYPE_TEXT,
  DIFFICULTY_TEXT,
} from '../../lib/quiz.mjs'

describe('shared prompt file used by app', () => {
  test('test_prompt_file_used_by_app: exports match quiz.json', () => {
    assert.deepEqual(QUIZ_RESPONSE_SCHEMA, quizPrompt.response_schema)
    assert.deepEqual(TYPE_TEXT, quizPrompt.type_text)
    assert.deepEqual(DIFFICULTY_TEXT, quizPrompt.difficulty_text)
  })

  test('buildPrompt incorporates schema, system role, and rules from quiz.json', () => {
    const text = 'The mitochondria is the powerhouse of the cell.'
    const prompt = buildPrompt({
      text,
      numQuestions: 5,
      quizType: 'both',
      difficulty: 'medium',
    })

    assert.ok(prompt.includes(quizPrompt.system_role))
    assert.ok(prompt.includes(quizPrompt.json_shape))
    for (const rule of quizPrompt.rules) {
      assert.ok(prompt.includes(rule), `Prompt missing rule: ${rule}`)
    }
    assert.ok(prompt.includes(text))
  })
})
