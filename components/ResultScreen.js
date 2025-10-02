export default function ResultScreen({ quiz, answers, times, onRestart }) {
  if (!quiz) return null;
  const total = quiz.questions.length;
  let correct = 0;
  quiz.questions.forEach((q, i) => {
    if (String(answers[i]) === String(q.answer)) correct++;
  });

  return (
    <div className="card max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Quiz Complete</h2>
      <p className="mb-4">Score: <strong>{correct}</strong> / {total}</p>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {quiz.questions.map((q, i) => (
          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="font-semibold">Q{i+1}. {q.question}</div>
            <div className="mt-1">Your answer: <strong className={String(answers[i]) === String(q.answer) ? 'text-green-600' : 'text-red-600'}>{answers[i] == null ? 'Skipped' : (q.options ? q.options[answers[i]] : String(answers[i]))}</strong></div>
            <div>Correct: <strong className="text-green-700">{q.options ? q.options[q.answer] : String(q.answer)}</strong></div>
            {q.explanation && <div className="text-sm text-gray-600 mt-1">Explanation: {q.explanation}</div>}
            <div className="text-sm text-gray-500 mt-1">Time: {times[i] != null ? `${times[i]}s` : '—'}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onRestart} className="pill bg-primary text-white">Restart</button>
      </div>
    </div>
  );
}
