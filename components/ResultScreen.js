import { scoreQuiz } from '../lib/quiz.mjs'

export default function ResultScreen({ quiz, answers, times, onRestart }) {
  if (!quiz) return null
  const total = quiz.questions.length
  const correct = scoreQuiz(quiz.questions, answers)

  return (
    <div className="card">
      <h2 className="mb-2 text-2xl font-bold">Quiz complete</h2>
      <p className="mb-4">
        Score: <strong data-testid="score">{correct}</strong> / {total}
      </p>

      <ol className="space-y-3" aria-label="Answer key">
        {quiz.questions.map((q, i) => {
          const given = answers[i]
          const isCorrect = given === q.answer
          return (
            <li key={q.id} data-testid="result-item" className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div className="font-semibold">
                Q{i + 1}. {q.question}
              </div>
              <div className="mt-1">
                Your answer:{' '}
                <strong className={isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                  {given == null ? 'Skipped' : q.options[given]}
                </strong>
              </div>
              <div>
                Correct answer: <strong data-testid="correct-answer">{q.options[q.answer]}</strong>
              </div>
              {q.explanation && <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Explanation: {q.explanation}</div>}
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Time: {times[i] != null ? `${times[i]}s` : '—'}</div>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onRestart} className="pill bg-primary text-white">
          Make another quiz
        </button>
      </div>
    </div>
  )
}
