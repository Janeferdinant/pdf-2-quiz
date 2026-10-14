import { motion } from 'framer-motion'

export default function QuizCard({ q, onAnswer }) {
  const isTrueFalse = q.type === 'true_false'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {isTrueFalse ? 'True or false' : 'Multiple choice'}
      </p>
      <h2 className="mb-4 text-lg font-semibold">{q.question}</h2>
      <div className={isTrueFalse ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onAnswer(i)}
            className="w-full rounded-xl bg-primary px-4 py-3 text-left font-medium text-white transition hover:bg-primary-dark"
          >
            {opt}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
