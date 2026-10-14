import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { AnimatePresence, motion } from 'framer-motion'
import ThemeToggle from '../components/ThemeToggle'
import ApiKeyPanel from '../components/ApiKeyPanel'
import QuizCard from '../components/QuizCard'
import ResultScreen from '../components/ResultScreen'
import { MAX_QUESTIONS, MIN_QUESTIONS, prepareSourceText, validatePdfFile, validateSettings } from '../lib/quiz.mjs'
import { DEFAULT_MODEL, MODELS, describeGeminiError, generateQuiz } from '../lib/gemini.mjs'
import { forgetKey, readRememberedKey, rememberKey } from '../lib/keyStore.mjs'

export default function Home() {
  const [stage, setStage] = useState('landing') // landing | setup | quiz | results
  const [apiKey, setApiKey] = useState('') // in memory only, unless "Remember for this tab" is ticked
  const [remember, setRemember] = useState(false)
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [file, setFile] = useState(null)
  const [quizType, setQuizType] = useState('both')
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState('5')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [times, setTimes] = useState([])
  const [timeLeft, setTimeLeft] = useState(null)
  const startRef = useRef(0)
  const abortRef = useRef(null)

  // Restore a key only if the visitor chose "Remember for this tab" earlier in this tab.
  useEffect(() => {
    const saved = readRememberedKey()
    if (saved) {
      setApiKey(saved)
      setRemember(true)
    }
  }, [])

  const handleKeyChange = (value) => {
    setApiKey(value)
    if (remember) rememberKey(value.trim())
  }

  const handleRememberChange = (checked) => {
    setRemember(checked)
    if (checked) rememberKey(apiKey.trim())
    else forgetKey()
  }

  const handleFileChange = (e) => {
    const chosen = e.target.files && e.target.files[0]
    setFile(chosen || null)
    const check = validatePdfFile(chosen)
    setError(check.ok ? '' : check.error)
  }

  // Per-question timer.
  useEffect(() => {
    if (stage !== 'quiz' || !quiz) return undefined
    const q = quiz.questions[current]
    if (!q) return undefined
    setTimeLeft(q.timeLimitSeconds)
    startRef.current = Date.now()
    const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [stage, quiz, current])

  const advance = (answerIndex) => {
    const q = quiz.questions[current]
    const taken = Math.min(q.timeLimitSeconds, Math.round((Date.now() - startRef.current) / 1000))
    setAnswers((prev) => {
      const next = [...prev]
      next[current] = answerIndex
      return next
    })
    setTimes((prev) => {
      const next = [...prev]
      next[current] = answerIndex == null ? null : taken
      return next
    })
    if (current + 1 < quiz.questions.length) setCurrent((c) => c + 1)
    else setStage('results')
  }

  // Time ran out: record no answer and move on.
  useEffect(() => {
    if (stage === 'quiz' && timeLeft === 0) advance(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, stage])

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setNote('')
    const key = apiKey.trim()
    if (!key) return setError('Paste your Gemini API key first.')
    const fileCheck = validatePdfFile(file)
    if (!fileCheck.ok) return setError(fileCheck.error)
    const checked = validateSettings({ numQuestions, quizType, difficulty })
    if (!checked.ok) return setError(checked.error)

    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    let PdfReadError = null
    try {
      setStatus('Reading the PDF in your browser…')
      const pdf = await import('../lib/pdf.mjs')
      PdfReadError = pdf.PdfReadError
      const { text } = await pdf.extractPdfText(file)
      const source = prepareSourceText(text)
      if (!source.ok) return setError(source.error)

      setStatus('Asking Gemini to write your questions…')
      const result = await generateQuiz({
        apiKey: key,
        model,
        settings: checked.settings,
        sourceText: source.text,
        signal: controller.signal,
      })

      const notes = []
      if (source.truncated) notes.push('The PDF is long, so only its first part was used.')
      if (result.questions.length < checked.settings.numQuestions) {
        notes.push(`Gemini returned ${result.questions.length} usable question(s) of the ${checked.settings.numQuestions} requested.`)
      }
      setNote(notes.join(' '))
      setQuiz(result)
      setAnswers([])
      setTimes([])
      setCurrent(0)
      setStage('quiz')
    } catch (err) {
      setError(PdfReadError && err instanceof PdfReadError ? err.message : describeGeminiError(err, key))
    } finally {
      setBusy(false)
      setStatus('')
      abortRef.current = null
    }
  }

  const restart = () => {
    setStage('setup')
    setQuiz(null)
    setAnswers([])
    setTimes([])
    setCurrent(0)
    setNote('')
  }

  const page = (children) => (
    <>
      <Head>
        <title>PDF → Quiz Generator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Turn a PDF into a multiple-choice and true/false quiz with Google Gemini, using your own API key." />
      </Head>
      {children}
    </>
  )

  if (stage === 'landing') {
    return page(
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 p-4 sm:p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-xl rounded-2xl bg-white/80 p-6 text-center shadow-xl backdrop-blur sm:p-8 dark:bg-gray-800/80">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">PDF → Quiz Generator</h1>
          <p className="mb-2 text-gray-700 dark:text-gray-300">Turn your study material into interactive quizzes.</p>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Runs in your browser with your own Gemini API key.</p>
          <button type="button" onClick={() => setStage('setup')} className="pill transform bg-primary text-white transition hover:scale-105">
            Start
          </button>
        </div>
      </main>,
    )
  }

  if (stage === 'setup') {
    return page(
      <main className="min-h-screen p-4 sm:p-6">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="card mx-auto max-w-2xl">
          <h1 className="mb-4 text-2xl font-bold">Quiz setup</h1>
          <form onSubmit={handleGenerate} className="space-y-5" noValidate>
            <ApiKeyPanel apiKey={apiKey} onKeyChange={handleKeyChange} remember={remember} onRememberChange={handleRememberChange} />

            <div>
              <label htmlFor="pdf-file" className="mb-1 block font-medium">
                PDF (up to 10 MB, with selectable text)
              </label>
              <input id="pdf-file" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="block w-full text-sm" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="quiz-type" className="mb-1 block text-sm font-medium">
                  Question type
                </label>
                <select id="quiz-type" value={quizType} onChange={(e) => setQuizType(e.target.value)} className="field">
                  <option value="both">Both (MCQ + True/False)</option>
                  <option value="mcq">Multiple choice</option>
                  <option value="true_false">True/False</option>
                </select>
              </div>
              <div>
                <label htmlFor="difficulty" className="mb-1 block text-sm font-medium">
                  Difficulty
                </label>
                <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="field">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label htmlFor="num-questions" className="mb-1 block text-sm font-medium">
                  Questions ({MIN_QUESTIONS}–{MAX_QUESTIONS})
                </label>
                <input
                  id="num-questions"
                  type="number"
                  inputMode="numeric"
                  min={MIN_QUESTIONS}
                  max={MAX_QUESTIONS}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="model" className="mb-1 block text-sm font-medium">
                Gemini model
              </label>
              <select id="model" value={model} onChange={(e) => setModel(e.target.value)} className="field">
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </p>
            )}
            {busy && (
              <p role="status" className="text-sm text-gray-700 dark:text-gray-300">
                {status}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy} className="pill bg-primary text-white">
                {busy ? 'Working…' : 'Generate quiz'}
              </button>
              {busy ? (
                <button type="button" onClick={() => abortRef.current?.abort()} className="pill bg-gray-200 dark:bg-gray-700">
                  Cancel
                </button>
              ) : (
                <button type="button" onClick={() => setStage('landing')} className="pill bg-gray-200 dark:bg-gray-700">
                  Back
                </button>
              )}
            </div>
          </form>
        </div>
      </main>,
    )
  }

  if (stage === 'quiz' && quiz) {
    const q = quiz.questions[current]
    return page(
      <main className="min-h-screen p-4 sm:p-6">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-3xl">
          {note && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{note}</p>}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              Question {current + 1} / {quiz.questions.length}
            </div>
            <div className="text-sm" aria-live="off">
              Time left: <strong>{timeLeft}s</strong>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <QuizCard q={q} onAnswer={advance} />
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={() => advance(null)} className="pill bg-gray-200 dark:bg-gray-700">
              Skip
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {current + 1} of {quiz.questions.length}
            </div>
          </div>
        </div>
      </main>,
    )
  }

  if (stage === 'results' && quiz) {
    return page(
      <main className="min-h-screen p-4 sm:p-6">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-3xl">
          <ResultScreen quiz={quiz} answers={answers} times={times} onRestart={restart} />
        </div>
      </main>,
    )
  }

  return null
}
