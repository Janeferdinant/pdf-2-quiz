import { motion } from 'framer-motion';

export default function QuizCard({ q, onAnswer }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="mb-4 font-semibold">{q.question}</div>
      <div className="space-y-3">
        {q.options && q.options.map((opt, i) => (
          <button key={i} onClick={() => onAnswer(i)} className="w-full pill bg-primary text-white hover:scale-105 transform transition">{opt}</button>
        ))}
        {!q.options && (
          <div className="flex gap-3">
            <button onClick={() => onAnswer(0)} className="flex-1 pill bg-primary text-white">True</button>
            <button onClick={() => onAnswer(1)} className="flex-1 pill bg-gray-200 dark:bg-gray-700">False</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
