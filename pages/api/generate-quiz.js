import { formidable } from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const form = formidable({});
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      const difficulty = fields.difficulty?.[0] || 'medium';
      const numQuestions = parseInt(fields.numQuestions?.[0] || '5');
      const types = fields.types?.[0] || 'both';

      const file = files.file?.[0];
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const dataBuffer = fs.readFileSync(file.filepath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;

      // Call Gemini API
      const prompt = `Generate a ${difficulty} quiz with ${numQuestions} ${types} questions based on the following content:\n${text}\nReturn JSON in the format: {questions:[{id,question,type,options,answer,explanation}]}`;

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
          (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite") +
          ":generateContent?key=" +
          process.env.GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );

      const result = await response.json();
      const rawText =
        result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      let quiz;
      try {
        quiz = JSON.parse(rawText);
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse quiz JSON", raw: rawText });
      }

      res.status(200).json({ questions: quiz.questions || [] });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}
