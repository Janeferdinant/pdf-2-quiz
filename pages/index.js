import { useState } from 'react'

export default function Home() {
  const [quiz, setQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState([])
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const startQuiz = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.target)
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setQuiz(data)
      setCurrentQuestion(0)
      setAnswers([])
      setIsFinished(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (answer) => {
    const question = quiz.questions[currentQuestion]
    const correctAnswer = question.answer

    setAnswers((prev) => [
      ...prev,
      {
        id: question.id,
        question: question.question,
        userAnswer: answer,
        correctAnswer,
        explanation: question.explanation || '',
      },
    ])

    if (currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setIsFinished(true)
    }
  }

  const restartQuiz = () => {
    setQuiz(null)
    setCurrentQuestion(0)
    setAnswers([])
    setIsFinished(false)
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form
          onSubmit={startQuiz}
          className="bg-white shadow-lg rounded-xl p-6 max-w-lg w-full space-y-4"
        >
          <h1 className="text-2xl font-bold">PDF → Quiz Generator</h1>

          {error && <p className="text-red-600">{error}</p>}

          <div>
            <label className="block font-medium">Upload PDF</label>
            <input type="file" name="pdf" accept="application/pdf" required />
          </div>

          <div>
            <label className="block font-medium">Difficulty</label>
            <select name="difficulty" className="border rounded p-2 w-full">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">Number of Questions</label>
            <input
              type="number"
              name="numQuestions"
              min="1"
              max="20"
              defaultValue="5"
              className="border rounded p-2 w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Start Quiz'}
          </button>
        </form>
      </div>
    )
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">No questions generated 😢</h2>
        <button
          onClick={restartQuiz}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Restart Quiz
        </button>
      </div>
    )
  }

  if (isFinished) {
    const score = answers.filter((a) => a.userAnswer === a.correctAnswer).length
    const percent = Math.round((score / quiz.questions.length) * 100)
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
        <p className="mb-4 text-lg">
          Your Score: <span className="font-bold">{score}</span> /{' '}
          {quiz.questions.length} ({percent}%)
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {answers.map((a, i) => (
            <div key={i} className="p-4 border rounded-lg shadow-sm bg-white">
              <p className="font-semibold">{a.question}</p>
              <p>
                Your Answer:{' '}
                <span
                  className={
                    a.userAnswer === a.correctAnswer
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {a.userAnswer.toString()}
                </span>
              </p>
              <p>
                Correct Answer:{' '}
                <span className="text-green-700">{a.correctAnswer.toString()}</span>
              </p>
              {a.explanation && (
                <p className="text-sm text-gray-600">
                  Explanation: {a.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={restartQuiz}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Restart Quiz
        </button>
      </div>
    )
  }

  const question = quiz.questions[currentQuestion]

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">
        Question {currentQuestion + 1} of {quiz.questions.length}
      </h2>
      <p className="mb-4">{question.question}</p>

      {question.type === 'multiple_choice' && (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100 bg-white"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="space-y-2">
          <button
            onClick={() => handleAnswer(true)}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100 bg-white"
          >
            True
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100 bg-white"
          >
            False
          </button>
        </div>
      )}
    </div>
  )
}
