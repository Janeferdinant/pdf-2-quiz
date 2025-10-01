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
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">PDF Quiz Generator</h1>
        <form onSubmit={startQuiz} className="space-y-4">
          <input type="file" name="file" accept="application/pdf" required className="block w-full" />
          <div>
            <label className="block mb-1">Difficulty</label>
            <select name="difficulty" className="w-full border p-2 rounded">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Number of Questions</label>
            <input type="number" name="numQuestions" defaultValue="5" className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block mb-1">Question Types</label>
            <select name="types" className="w-full border p-2 rounded">
              <option value="both">Both</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Generate Quiz</button>
        </form>
      </div>
    );
  }

  if (isFinished) {
    const score = answers.filter((a) => a.userAnswer === a.correctAnswer).length;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
        <p className="mb-4">Your Score: {score} / {quiz.questions.length}</p>

        <div className="space-y-4">
          {answers.map((a, i) => (
            <div key={i} className="p-4 border rounded-lg shadow-sm">
              <p className="font-semibold">{a.question}</p>
              <p>Your Answer: <span className={a.userAnswer === a.correctAnswer ? "text-green-600" : "text-red-600"}>{a.userAnswer.toString()}</span></p>
              <p>Correct Answer: <span className="text-green-700">{a.correctAnswer.toString()}</span></p>
              <p className="text-sm text-gray-600">Explanation: {a.explanation}</p>
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
    );
  }

  const question = quiz.questions[currentQuestion];

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">
        Question {currentQuestion + 1} of {quiz.questions.length}
      </h2>
      <p className="mb-4">{question.question}</p>

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "true_false" && (
        <div className="space-y-2">
          <button
            onClick={() => handleAnswer(true)}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            True
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            False
          </button>
        </div>
      )}
    </div>
  );
}
