
import { Link } from 'react-router-dom';
import { MOCK_PROBLEMS } from '../api/mocks/problems';
import type { Difficulty } from '../api/types/problems';

const difficultyColor: Record<Difficulty, string> = {
  Easy: 'text-pass',
  Medium: 'text-graphite',
  Hard: 'text-fail',
};

export default function ProblemsPage() {
  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl text-ink mb-6">Problems</h1>

      <div className="font-mono text-xs text-graphite grid grid-cols-[1fr_auto_auto] gap-4 border-b border-graphite pb-2 mb-1">
        <span>title</span>
        <span>difficulty</span>
        <span>author</span>
      </div>

      <ul>
        {MOCK_PROBLEMS.map((p) => (
          <li key={p.id} className="border-b border-graphite">
            <Link
              to={`/problems/${p.id}`}
              className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-3 pl-2 pr-2 -ml-2 border-l-2 border-transparent hover:border-signal focus-visible:border-signal focus-visible:outline-none transition-colors"
            >
              <span className="font-body text-ink">{p.title}</span>
              <span className={`font-mono text-sm ${difficultyColor[p.difficulty]}`}>{p.difficulty}</span>
              <span className="font-mono text-sm text-graphite">{p.author}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
