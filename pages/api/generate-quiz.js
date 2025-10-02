import formidable from 'formidable'
import fs from 'fs'
import pdfParse from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' })

  const form = formidable({ multiples: false })
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err
      const difficulty = (fields.difficulty && fields.difficulty[0]) || 'medium'
      const numQuestions = Number((fields.numQuestions && fields.numQuestions[0]) || 5)
      const quizType = (fields.quizType && fields.quizType[0]) || 'both'
      const file = files.file && files.file[0]
      if (!file) return res.status(400).json({ error: 'No file uploaded' })

      const buffer = fs.readFileSync(file.filepath)
      const pdfData = await pdfParse(buffer)
      const text = pdfData.text || ''

      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite' })

      const prompt = `You are an expert quiz generator. Create exactly ${numQuestions} questions of type ${quizType} from the following text. Return ONLY valid JSON with shape: { "questions": [ { "id": number, "type": "multiple_choice"|"true_false", "question": string, "options": string[], "answer": number, "explanation": string, "timeLimitSeconds": number } ] }.\n\nSource text:\n"""\n${text}\n"""`

      const result = await model.generateContent(prompt)
      const out = result.response.candidates?.[0]?.content?.parts?.[0]?.text || result.response.text?.() || ''

      const m = out.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'server_busy' })
      let parsed
      try { parsed = JSON.parse(m[0]) } catch(e) { return res.status(500).json({ error: 'server_busy' }) }

      parsed.questions = parsed.questions.map((q, idx) => {
        if (q.type === 'true_false' || (!q.options || q.options.length === 0)) {
          const ans = q.answer === true || String(q.answer).toLowerCase().startsWith('t') ? 0 : 1
          return { id: q.id || idx+1, type: 'true_false', question: q.question, options: ['True','False'], answer: Number(ans), explanation: q.explanation || '', timeLimitSeconds: q.timeLimitSeconds || (difficulty==='easy'?30: difficulty==='hard'?60:45) }
        }
        let ans = q.answer
        if (typeof ans === 'string' && /^[A-D]$/i.test(ans)) ans = 'ABCD'.indexOf(ans.toUpperCase())
        if (typeof ans === 'string' && !isNaN(Number(ans))) ans = Number(ans)
        return { id: q.id || idx+1, type: 'multiple_choice', question: q.question, options: q.options || [], answer: Number(ans), explanation: q.explanation || '', timeLimitSeconds: q.timeLimitSeconds || (difficulty==='easy'?30: difficulty==='hard'?60:45) }
      })

      res.status(200).json(parsed)
    } catch (e) {
      console.error('GenAI error', e)
      // Do not expose details to client — return friendly server busy error
      res.status(500).json({ error: 'server_busy' })
    }
  })
}
