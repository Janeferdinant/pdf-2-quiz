import formidable from 'formidable'
import fs from 'fs'
import pdfParse from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Only POST' })

  const form = formidable({ multiples: false })

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err
      const { difficulty, numQuestions } = fields
      const pdfFile = files.pdf[0]
      const dataBuffer = fs.readFileSync(pdfFile.filepath)
      const pdfData = await pdfParse(dataBuffer)

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

      const prompt = `Generate a ${difficulty} quiz with ${numQuestions} questions from the following text. 
Return valid JSON only, no explanation, in the format: 
{ "questions": [ { "id": 1, "question": "...", "type": "multiple_choice" | "true_false", "options": ["A","B","C"], "answer": "B", "explanation": "..." } ] }.

Text:
${pdfData.text.slice(0, 4000)}`

      const result = await model.generateContent(prompt)
      let text = result.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return res.status(500).json({ error: 'No valid JSON returned from Gemini' })
      }
      const quiz = JSON.parse(jsonMatch[0])
      res.status(200).json(quiz)
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })
}
