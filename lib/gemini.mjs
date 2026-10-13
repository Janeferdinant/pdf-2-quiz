// Calls Gemini from the browser with the visitor's own API key.
// The key is passed in by the caller, used for this one request, and never stored or logged here.
// The only network destination is Google's Gemini API (generativelanguage.googleapis.com), via the official SDK.
import { QUIZ_RESPONSE_SCHEMA, QuizResponseError, buildPrompt, parseQuizResponse, validateSettings } from './quiz.mjs'

// Model ids from https://ai.google.dev/gemini-api/docs/models (checked 2026-10-13).
export const MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (fastest, lowest cost)' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (stronger, costs more)' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (only keys that used it before)' },
]
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

export function redactKey(text, apiKey) {
  const s = String(text ?? '')
  return apiKey ? s.split(apiKey).join('[redacted]') : s
}

export async function createGeminiClient(apiKey) {
  const { GoogleGenAI } = await import('@google/genai')
  return new GoogleGenAI({ apiKey })
}

/**
 * Ask Gemini for a quiz and return { questions, dropped } with a normalised answer key.
 * `client` can be injected (tests pass a fake); otherwise the Google Gen AI SDK is loaded on demand.
 */
export async function generateQuiz({ apiKey, model = DEFAULT_MODEL, settings, sourceText, client, signal }) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : ''
  if (!key) throw new Error('Paste your Gemini API key first.')
  if (!MODELS.some((m) => m.id === model)) throw new Error('Choose a model from the list.')
  const checked = validateSettings(settings)
  if (!checked.ok) throw new Error(checked.error)

  const ai = client ?? (await createGeminiClient(key))
  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt({ ...checked.settings, text: sourceText }),
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: QUIZ_RESPONSE_SCHEMA,
      ...(signal ? { abortSignal: signal } : {}),
    },
  })
  return parseQuizResponse(response?.text ?? '', checked.settings)
}

/** Turn any failure into a short message for the visitor. The key is always redacted. */
export function describeGeminiError(err, apiKey) {
  if (err instanceof QuizResponseError) {
    return err.code === 'no_questions'
      ? 'Gemini returned no usable questions. Try again, or try a different PDF.'
      : 'Gemini replied, but not with valid quiz JSON. Please try again.'
  }
  if (err?.name === 'AbortError') return 'Cancelled.'
  const status = Number(err?.status)
  const message = redactKey(typeof err?.message === 'string' ? err.message : String(err ?? ''), apiKey)
  if (status === 401 || (status === 400 && /api[ _-]?key/i.test(message))) {
    return 'Google rejected the API key. Check that you pasted the whole key from Google AI Studio.'
  }
  if (status === 403) return 'This key is not allowed to use the Gemini API (403). Check the key in Google AI Studio.'
  if (status === 404) return 'That model is not available to your key. Choose another model.'
  if (status === 429) return 'Your key hit a quota or rate limit (429). Wait a minute and try again, or check your quota in Google AI Studio.'
  if (status >= 500) return 'Gemini is busy or unavailable right now. Please try again in a moment.'
  if (err instanceof TypeError || /failed to fetch|network/i.test(message)) {
    return "Could not reach Google's Gemini API. Check your connection and try again."
  }
  return `Something went wrong: ${message.slice(0, 200)}`
}
