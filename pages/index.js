import { useState } from 'react';

export default function Home() {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  const startQuiz = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch('/api/generate-quiz', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setQuiz(data);
    setCurrentQuestion(0);
    setAnswers([]);
    setIsFinished(false);
  };

  const handleAnswer = (answer) => {
    const question = quiz.questions[currentQuestion];
    const correctAnswer = question.answer;

    setAnswers((prev) => [
      ...prev,
      {
        id: question.id,
        question: question.question,
        userAnswer: answer,
        correctAnswer,
        explanation: question.explanation,
      },
    ]);

    if (currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsFinished(true);
    }
  };

  const restartQuiz = () => {
    setQuiz(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setIsFinished(false);
  };

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">PDF Quiz Generator</h1>
          <form onSubmit={startQuiz} className="space-y-4">
            <input type="file" name="file" accept="application/pdf" required className="block w-full border border-gray-300 p-2 rounded-lg" />
            <div>
              <label className="block mb-1 font-medium">Difficulty</label>
              <select name="difficulty" className="w-full border p-2 rounded-lg">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Number of Questions</label>
              <input type="number" name="numQuestions" defaultValue="5" className="w-full border p-2 rounded-lg" />
            </div>
            <div>
              <label className="block mb-1 font-medium">Question Types</label>
              <select name="types" className="w-full border p-2 rounded-lg">
                <option value="both">Both</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
              </select>
            </div>
            <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Generate Quiz</button>
          </form>
        </div>
      </div>
    );
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">No questions generated 😢</h2>
          <p className="mb-4 text-gray-600">Try uploading a different PDF or lowering the number of questions.</p>
          <button
            onClick={restartQuiz}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const score = answers.filter((a) => a.userAnswer === a.correctAnswer).length;
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <h2 className="text-3xl font-bold mb-4 text-center">Quiz Complete!</h2>
          <p className="mb-6 text-lg text-center">
            Your Score: <span className="font-bold">{score} / {quiz.questions.length}</span> ({percentage}%)
          </p>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {answers.map((a, i) => (
              <div key={i} className="p-4 border rounded-lg shadow-sm bg-gray-50">
                <p className="font-semibold mb-2">{a.question}</p>
                <p>Your Answer: <span className={a.userAnswer === a.correctAnswer ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{a.userAnswer.toString()}</span></p>
                <p>Correct Answer: <span className="text-green-700 font-semibold">{a.correctAnswer.toString()}</span></p>
                <p className="text-sm text-gray-600 mt-1">Explanation: {a.explanation}</p>
              </div>
            ))}
          </div>

          <button
            onClick={restartQuiz}
            className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full">
        <h2 className="text-xl font-bold mb-4 text-blue-700">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </h2>
        <p className="mb-6 text-lg">{question.question}</p>

        {question.type === "multiple_choice" && (
          <div className="space-y-3">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.type === "true_false" && (
          <div className="space-y-3">
            <button
              onClick={() => handleAnswer(true)}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
            >
              True
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
            >
              False
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
