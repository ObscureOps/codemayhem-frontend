import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Heart, Plus } from 'lucide-react';
import type { Difficulty, ProblemLanguage, ProblemSummary, SolvedInfo } from '../api/types/problems';
import { useProblemList, useUsernames } from '../features/problems/useProblemData';

const difficultyColor: Record<Difficulty, string> = {
  Easy: 'text-pass',
  Medium: 'text-chalk',
  Hard: 'text-fail',
};

const fieldClass =
  'border border-graphite bg-transparent px-3 py-2 font-mono text-sm text-chalk placeholder:text-graphite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal';

const NO_PROBLEMS: ProblemSummary[] = [];
const NO_SOLVED: Record<string, SolvedInfo> = {};
const COLUMNS = 'grid-cols-[1fr_7rem_4rem_5rem_7rem_3rem]';

export default function ProblemsPage() {
  const list = useProblemList();
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [language, setLanguage] = useState<ProblemLanguage | 'all'>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const all = list.status === 'ready' ? list.data.problems : NO_PROBLEMS;
  const solved = list.status === 'ready' ? list.data.solved : NO_SOLVED;
  const liked = list.status === 'ready' ? list.data.liked : null;
  const bookmarked = list.status === 'ready' ? list.data.bookmarked : null;
  const usernames = useUsernames(all.map((p) => p.authorId));

  const filtered = useMemo(
    () =>
      all.filter(
        (p) =>
          (difficulty === 'all' || p.difficulty === difficulty) &&
          (language === 'all' || p.language === language) &&
          (!onlyBookmarked || bookmarked?.has(p.id)) &&
          p.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [all, bookmarked, difficulty, language, onlyBookmarked, query],
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-chalk">Problems</h1>
        <Link
          to="/problems/new"
          className="flex items-center gap-1.5 border border-signal px-3 py-1.5 font-mono text-sm text-signal transition-colors hover:bg-signal hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <Plus size={14} />
          new problem
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search title"
          aria-label="Search problems"
          className={`${fieldClass} min-w-48 flex-1`}
        />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as ProblemLanguage | 'all')}
          aria-label="Filter by language"
          className={`${fieldClass} bg-[#070a0f]`}
        >
          <option value="all">all languages</option>
          <option value="C">C</option>
          <option value="Java">Java</option>
          <option value="SQLite">SQLite</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | 'all')}
          aria-label="Filter by difficulty"
          className={`${fieldClass} bg-[#070a0f]`}
        >
          <option value="all">all difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <button
          onClick={() => setOnlyBookmarked((v) => !v)}
          aria-pressed={onlyBookmarked}
          className={`${fieldClass} flex items-center gap-1.5 ${onlyBookmarked ? 'border-signal text-signal' : ''}`}
        >
          <Bookmark size={14} />
          bookmarked
        </button>
      </div>

      {list.status === 'loading' && <p className="font-mono text-sm text-graphite">loading problems...</p>}
      {list.status === 'error' && <p className="font-mono text-sm text-fail">Could not load problems: {list.message}</p>}

      {list.status === 'ready' && (
        <>
          <div className={`mb-1 grid ${COLUMNS} gap-4 border-b border-graphite pb-2 font-mono text-xs text-graphite`}>
            <span>title</span>
            <span>author</span>
            <span>language</span>
            <span>difficulty</span>
            <span>status</span>
            <span />
          </div>

          {filtered.length === 0 ? (
            <p className="py-6 font-mono text-sm text-graphite">No problems match.</p>
          ) : (
            <ul>
              {filtered.map((p) => {
                const info = solved[p.id];
                const status = !info ? '' : info.hash === p.problemHash ? 'solved' : 'older version';
                return (
                  <li key={p.id} className="border-b border-graphite/60">
                    <Link
                      to={`/problems/${p.id}`}
                      className={`-ml-2 grid ${COLUMNS} items-center gap-4 border-l-2 border-transparent py-3 pl-2 pr-2 transition-colors hover:border-signal focus-visible:border-signal focus-visible:outline-none`}
                    >
                      <span className="truncate font-body text-chalk">{p.title}</span>
                      <span className="truncate font-mono text-xs text-graphite">
                        {p.authorId ? (usernames[p.authorId] ?? '') : ''}
                      </span>
                      <span className="font-mono text-sm text-graphite">{p.language}</span>
                      <span className={`font-mono text-sm ${difficultyColor[p.difficulty]}`}>{p.difficulty}</span>
                      <span className={`font-mono text-xs ${status === 'solved' ? 'text-pass' : 'text-graphite'}`}>
                        {status}
                      </span>
                      <span className="flex gap-1">
                        {liked?.has(p.id) && <Heart size={13} className="text-fail" aria-label="liked" />}
                        {bookmarked?.has(p.id) && <Bookmark size={13} className="text-signal" aria-label="bookmarked" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
