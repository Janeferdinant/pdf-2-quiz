import { useState, useEffect, useRef } from 'react'

export default function Home() {
  const [file, setFile] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(10)
  const [types, setTypes] = useState('both')
  const [loading, setLoading] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [error, setError] = useState(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!quiz) return
    const q = quiz.questions[currentIndex]
    if (!q) return
    setTimeLeft(q.timeLimitSeconds || (difficulty === 'easy' ? 30 : difficulty === 'hard' ? 60 : 45))
    return () => clearInterval(timerRef.current)
  }, [quiz, currentIndex])

  useEffect(() => {
    if (timeLeft == null) return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setCurrentIndex(i => Math.min(i + 1, quiz.questions.length - 1))
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft])

  function handleFile(e) { setFile(e.target.files[0]) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!file) return setError('Please choose a PDF file')
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('difficulty', difficulty)
    fd.append('numQuestions', String(numQuestions))
    fd.append('types', types)

    try {
      const res = await fetch('/api/generate-quiz', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      if (!data.quiz) throw new Error('No quiz returned')
      setQuiz(data.quiz)
      setCurrentIndex(0)
      setAnswers({})
    } catch (err) {
      setError(err.message || 'Error')
    } finally { setLoading(false) }
  }

  function selectOption(qIndex, optIndex) {
    setAnswers(a => ({ ...a, [qIndex]: optIndex }))
    setTimeout(() => setCurrentIndex(i => Math.min(i + 1, quiz.questions.length - 1)), 300)
  }

  if (!quiz) {
    return (<div className="container"><div className="card">
      <div className="h1">PDF → Quiz (Gemini)</div>
      <form onSubmit={handleSubmit}>
        <div className="form-row"><label className="small">PDF file</label>
          <input className="input" type="file" accept="application/pdf" onChange={handleFile} />
        </div>
        <div className="form-row"><label className="small">Difficulty</label>
          <select className="input" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select></div>
        <div className="form-row"><label className="small">Number of questions</label>
          <input className="input" type="number" min={1} max={100} value={numQuestions} onChange={e=>setNumQuestions(Number(e.target.value))} />
        </div>
        <div className="form-row"><label className="small">Question types</label>
          <select className="input" value={types} onChange={e=>setTypes(e.target.value)}>
            <option value="both">Both</option><option value="mcq">MCQ</option><option value="tf">True/False</option>
          </select></div>
        <button className="button" disabled={loading}>{loading? 'Generating...' : 'Generate Quiz'}</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </form>
    </div></div>)
  }

  const q = quiz.questions[currentIndex]
  const total = quiz.questions.length
  const userAnswer = answers[currentIndex]
  const finished = currentIndex >= total - 1 && userAnswer != null && Object.keys(answers).length >= total

  if (finished) {
    let correct = 0
    quiz.questions.forEach((qq, i)=>{
      const ua = answers[i]
      if (ua == null) return
      if (qq.type === 'true_false') { if ((ua===1) === !!qq.answer) correct++ }
      else { const idx = 'ABCD'.indexOf(String(qq.answer).toUpperCase()); if (idx===ua) correct++ }
    })
    return (<div className="container"><div className="card">
      <h2>Results</h2><div className="small">Score: {correct}/{total}</div>
      {quiz.questions.map((qq,i)=>(<div key={i}><strong>Q{i+1}</strong> {qq.question}</div>))}
      <button className="button" onClick={()=>{setQuiz(null);setAnswers({});setCurrentIndex(0)}}>Restart</button>
    </div></div>)
  }

  return (<div className="container"><div className="card">
    <div>Question {currentIndex+1}/{total} <span className="timer">({timeLeft}s)</span></div>
    <div>{q.question}</div>
    {q.type==='true_false'? (<div>
      {[{label:'True',idx:1},{label:'False',idx:0}].map(o=>(<div key={o.idx} className={`option ${answers[currentIndex]===o.idx?'selected':''}`} onClick={()=>selectOption(currentIndex,o.idx)}>{o.label}</div>))}
    </div>) : (<div>
      {(q.options||[]).map((opt,i)=>(<div key={i} className={`option ${answers[currentIndex]===i?'selected':''}`} onClick={()=>selectOption(currentIndex,i)}><strong>{'ABCD'[i]}.</strong> {opt}</div>))}
    </div>)}
  </div></div>)
}