
import { useEffect, useState, useRef } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import QuizCard from '../components/QuizCard'
import ResultScreen from '../components/ResultScreen'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [stage, setStage] = useState('landing') // landing | setup | quiz | results
  const [file, setFile] = useState(null)
  const [quizType, setQuizType] = useState('both')
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(5)
  const [quiz, setQuiz] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [times, setTimes] = useState([])
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (stage !== 'quiz' || !quiz) return
    const q = quiz.questions[current]
    if (!q) return
    setTimeLeft(q.timeLimitSeconds || (difficulty==='easy'?30: difficulty==='hard'?60:45))
    clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          recordTimeAndProceed(start)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [stage, quiz, current, difficulty])

  const recordTimeAndProceed = (start) => {
    const taken = Math.round((Date.now() - start) / 1000)
    setTimes(prev => { const c = [...prev]; c[current] = taken; return c })
    setAnswers(prev => { const c=[...prev]; if (c[current] == null) c[current] = null; return c })
    if (current + 1 < quiz.questions.length) setCurrent(c => c+1)
    else setStage('results')
  }

  const startSetup = () => setStage('setup')
  const startQuiz = async (e) => {
    e && e.preventDefault()
    if (!file) return alert('Please upload a PDF')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('quizType', quizType)
    fd.append('difficulty', difficulty)
    fd.append('numQuestions', String(numQuestions))
    const res = await fetch('/api/generate-quiz', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.error) return alert(data.error)
    setQuiz(data)
    setStage('quiz')
    setCurrent(0)
    setAnswers([])
    setTimes([])
  }

  const handleAnswer = (idx) => {
    const timeTaken = (quiz.questions[current].timeLimitSeconds || (difficulty==='easy'?30: difficulty==='hard'?60:45)) - (timeLeft || 0)
    setTimes(prev => { const c=[...prev]; c[current] = timeTaken; return c })
    setAnswers(prev => { const c=[...prev]; c[current] = idx; return c })
    if (current + 1 < quiz.questions.length) setCurrent(c => c+1)
    else setStage('results')
  }

  const handleSkip = () => {
    setTimes(prev => { const c=[...prev]; c[current] = null; return c })
    setAnswers(prev => { const c=[...prev]; c[current] = null; return c })
    if (current + 1 < quiz.questions.length) setCurrent(c => c+1)
    else setStage('results')
  }

  const restart = () => {
    setStage('setup'); setQuiz(null); setFile(null); setAnswers([]); setTimes([]); setCurrent(0)
  }

  if (stage === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center p-6">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="max-w-xl w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">PDF → Quiz Generator</h1>
          <p className="mb-6 text-gray-700 dark:text-gray-300">Turn your study material into interactive quizzes</p>
          <button onClick={startSetup} className="pill bg-primary text-white hover:scale-105 transform transition">Start Quiz</button>
        </div>
      </div>
    )
  }

  if (stage === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="max-w-2xl mx-auto card">
          <h2 className="text-2xl font-bold mb-4">Quiz Setup</h2>
          <form onSubmit={startQuiz} className="space-y-4">
            <div>
              <label className="block mb-1">Upload PDF</label>
              <input type="file" accept="application/pdf" onChange={(e)=>setFile(e.target.files[0])} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select value={quizType} onChange={(e)=>setQuizType(e.target.value)} className="border rounded p-2">
                <option value="both">Both (MCQ + True/False)</option>
                <option value="mcq">Multiple Choice</option>
                <option value="true_false">True/False</option>
              </select>
              <select value={difficulty} onChange={(e)=>setDifficulty(e.target.value)} className="border rounded p-2">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input type="number" min="1" max="30" value={numQuestions} onChange={(e)=>setNumQuestions(Number(e.target.value))} className="border rounded p-2" />
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="pill bg-primary text-white">Generate Quiz</button>
              <button type="button" onClick={()=>setStage('landing')} className="pill bg-gray-200 dark:bg-gray-700">Back</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (stage === 'quiz' && quiz) {
    const q = quiz.questions[current]
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>Question {current+1} / {quiz.questions.length}</div>
            <div className="text-sm">Time left: <strong>{timeLeft}s</strong></div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <QuizCard q={q} onAnswer={handleAnswer} />
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center mt-4">
            <button onClick={handleSkip} className="pill bg-gray-200 dark:bg-gray-700">Skip</button>
            <div className="text-sm text-gray-600 dark:text-gray-300">{current+1} of {quiz.questions.length}</div>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'results' || (stage === 'quiz' && !quiz)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="max-w-3xl mx-auto">
          <ResultScreen quiz={quiz} answers={answers} times={times} onRestart={restart} />
        </div>
      </div>
    )
  }

  return null
}
