import formidable from 'formidable'
import fs from 'fs'
import pdfParse from 'pdf-parse'
import { GoogleGenAI } from '@google/genai'

export const config = { api: { bodyParser: false } }

function extractJsonBlock(text) {
  const start = text.indexOf('{')
  const arrStart = text.indexOf('[')
  const startIdx = (arrStart !== -1 && arrStart < start) ? arrStart : start
  if (startIdx === -1) return null
  const lastBrace = text.lastIndexOf('}')
  const lastBracket = text.lastIndexOf(']')
  const endIdx = Math.max(lastBrace, lastBracket)
  if (endIdx === -1) return null
  return text.slice(startIdx, endIdx + 1)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' })
  const form = new formidable.IncomingForm()
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err
      const f = files.file
      if (!f) return res.status(400).json({ error: 'No file uploaded' })
      const buffer = fs.readFileSync(f.filepath || f.path)
      const pdfData = await pdfParse(buffer)
      const text = pdfData.text || ''
      const difficulty = fields.difficulty || 'medium'
      const numQuestions = parseInt(fields.numQuestions || '10', 10)
      const types = fields.types || 'both'
      const truncated = text.length > 200000 ? text.slice(0, 200000) : text
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
      const prompt = `You are an expert quiz author. Based on the source text below, produce JSON: { "title": string, "questions": [...] }
Requirements:
- Exactly ${numQuestions} questions (${types}).
- Format multiple_choice {id,type,question,options,answer,explanation,timeLimitSeconds}
- Format true_false {id,type,question,answer,explanation,timeLimitSeconds}
- Difficulty=${difficulty}. easy=30s, medium=45s, hard=60s.
- JSON only.
Source:\n"""${truncated}"""`
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      const response = await client.models.generateContent({ model, contents: prompt })
      const out = response?.text || JSON.stringify(response)
      let block = extractJsonBlock(out) || out
      let parsed = JSON.parse(block)
      if (!parsed.questions) return res.status(500).json({ error: 'Bad JSON', raw: out })
      res.status(200).json({ quiz: parsed })
    } catch (e) { res.status(500).json({ error: e.message }) }
  })
}
