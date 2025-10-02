# 📘 PDF → Quiz Generator (Gemini-powered)

An interactive quiz webapp that takes a PDF as input and generates **Multiple Choice** and **True/False** quizzes using Google Gemini AI.  
Built with **Next.js**, **TailwindCSS**, and **Framer Motion** for a smooth and modern UI.

---

## ✨ Features

- 📂 Upload a PDF and auto-generate quizzes  
- 🎯 Choose difficulty, number of questions, and quiz type (MCQ, T/F, or both)  
- ⏳ Per-question timer, tracked individually  
- 📊 Results screen: **score, correct answers, and time per question**  
- 🌙 Light/Dark mode toggle  
- 🎨 Gradient landing page with pill-shaped buttons and smooth animations  
- ⚠️ Friendly error handling (shows *“Server busy”* + Retry button if Gemini fails)  
- 🔒 Reproducible installs with `package-lock.json`  

---

## 📋 Requirements

- Node.js **18+**  
- npm (comes with Node.js)  
- A free **Google Gemini API key**  

---

## 🔑 Get a Free Gemini API Key

1. Go to **[Google AI Studio](https://aistudio.google.com/)**  
2. Sign in with your Google account.  
3. Navigate to **API Keys → Create API Key**.  
4. Copy your key. It will look like:  

   ```
   AIzaSyD...yourkey
   ```

---

## ⚙️ Environment Setup

Create a `.env.local` file in the project root (already included in this repo template).  

```
GOOGLE_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```

Replace `your_api_key_here` with the key you copied from Google AI Studio.  

---

## 🚀 Run Locally

1. Clone or unzip this project:  
   ```bash
   git clone https://github.com/your-repo/pdf-quiz-gemini.git
   cd pdf-quiz-gemini
   ```

2. Install dependencies:  
   ```bash
   npm install
   ```

3. Start the dev server:  
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)  

---

## 🌐 Deploy to Vercel

This app is **Vercel-ready**.  

1. Push your repo to GitHub.  
2. Go to [vercel.com](https://vercel.com/), import the repo.  
3. Add `GOOGLE_API_KEY` as an **Environment Variable** in Vercel dashboard.  
4. Deploy 🎉  

---

## 🛠 Tech Stack

- **Next.js 13.5.11**  
- **TailwindCSS** (custom colors + gradients)  
- **Framer Motion** (animations)  
- **Google Generative AI SDK**  
- **Formidable** (for file uploads)  
- **pdf-parse** (for extracting text from PDFs)  

---

## ⚠️ Troubleshooting

- If you see **Server Busy**:  
  - Either Gemini API is down, or your key is invalid/expired.  
  - Get a fresh key from [AI Studio](https://aistudio.google.com/).  

- If `npm install` fails:  
  - Make sure you’re on Node.js 18+  
  - Try deleting `node_modules` + `package-lock.json` then reinstall:  
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    ```

---

## 📜 License

MIT License. Free to use and modify.
