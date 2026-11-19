import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  DIFFICULTIES,
  EDITOR_LANGUAGE,
  PROBLEM_LANGUAGES,
  type Difficulty,
  type ProblemLanguage,
} from '../api/types/problems';
import { AuthoringNotice } from '../features/problems/AuthoringNotice';
import { classifyCreate, type AuthoringResult } from '../features/problems/authoring';
import { CodeTabs, type CodeTab } from '../features/problems/CodeTabs';
import { TEMPLATES, type ProblemTemplate } from '../features/problems/templates';

type Phase =
  | { kind: 'idle' }
  | { kind: 'submitting'; startedAt: number }
  | { kind: 'done'; result: AuthoringResult };

// Authoring is C only for now. Java and SQLite stay visible but disabled.
const ENABLED: ProblemLanguage[] = ['C'];

const fieldClass =
  'w-full border border-graphite bg-transparent px-3 py-2 font-mono text-sm text-chalk placeholder:text-graphite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal';

const sameAsTemplate = (code: ProblemTemplate, template: ProblemTemplate) =>
  code.boilerplate === template.boilerplate &&
  code.harness === template.harness &&
  code.solution === template.solution;

export default function CreateProblemPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<ProblemLanguage>('C');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [code, setCode] = useState<ProblemTemplate>(TEMPLATES.C);
  const [version, setVersion] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [formError, setFormError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (phase.kind !== 'submitting') return;
    const timer = window.setInterval(() => setElapsed(Date.now() - phase.startedAt), 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  const applyTemplate = (next: ProblemLanguage) => {
    setCode(TEMPLATES[next]);
    setVersion((v) => v + 1);
  };

  const changeLanguage = (next: ProblemLanguage) => {
    // Swap templates automatically only when nothing has been edited yet.
    const untouched = sameAsTemplate(code, TEMPLATES[language]);
    setLanguage(next);
    if (untouched) applyTemplate(next);
  };

  const loadTemplate = () => {
    if (window.confirm(`Replace the starter code, harness and solution with the ${language} template?`)) {
      applyTemplate(language);
    }
  };

  const hints = TEMPLATES[language].hints;
  const tabs: CodeTab[] = [
    { id: 'boilerplate', label: 'starter code', hint: hints.boilerplate, value: code.boilerplate, onChange: (v) => setCode((c) => ({ ...c, boilerplate: v })) },
    { id: 'harness', label: 'harness (hidden)', hint: hints.harness, value: code.harness, onChange: (v) => setCode((c) => ({ ...c, harness: v })) },
    { id: 'solution', label: 'reference solution (hidden)', hint: hints.solution, value: code.solution, onChange: (v) => setCode((c) => ({ ...c, solution: v })) },
  ];

  const submitting = phase.kind === 'submitting';

  const handleCreate = async () => {
    if (inFlight.current) return;
    setFormError(null);

    const complete =
      title.trim() && body.trim() && code.boilerplate.trim() && code.harness.trim() && code.solution.trim();
    if (!complete) {
      setPhase({ kind: 'done', result: { kind: 'incomplete' } });
      return;
    }

    // A C harness that never includes the student's file would accept every
    // submission, because it would always run the same code.
    if (language === 'C' && !/#\s*include\s*"solution\.c"/.test(code.harness)) {
      setPhase({ kind: 'idle' });
      setFormError(
        'The harness must contain #include "solution.c". Without it, the harness never runs the student\'s code and every submission would be accepted.',
      );
      return;
    }

    inFlight.current = true;
    setElapsed(0);
    setPhase({ kind: 'submitting', startedAt: Date.now() });

    let result: AuthoringResult;
    try {
      const res = await apiClient.problems.create({
        title: title.trim(),
        difficulty,
        language,
        body,
        boilerplate: code.boilerplate,
        harness: code.harness,
        solution: code.solution,
      });
      result = classifyCreate(res.status, res.body);
    } catch {
      result = { kind: 'network_error' };
    }

    inFlight.current = false;
    setPhase({ kind: 'done', result });

    if (result.kind === 'ok' && result.id) navigate(`/problems/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/problems" className="font-mono text-xs text-graphite hover:text-chalk">
          &larr; back to problems
        </Link>
        <h1 className="mt-2 font-display text-2xl text-chalk">New problem</h1>
        <p className="mt-2 max-w-2xl font-body text-sm text-graphite">
          Students see the title, description and starter code. The harness and reference solution stay hidden. On
          save, the server runs the harness with your reference solution, and the problem is only published if that
          run succeeds. Title and language together must be unique.
        </p>
        <p className="mt-2 max-w-2xl font-body text-sm text-graphite">
          How a C problem works: students write functions, not <code className="font-mono">main</code>. Your harness
          has the <code className="font-mono">main</code>, includes their file with{' '}
          <code className="font-mono">#include "solution.c"</code>, calls their functions and prints results. A
          submission is accepted when its printed output matches the reference solution's output exactly.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_10rem_10rem]">
        <label className="block">
          <span className="mb-1 block font-mono text-xs text-graphite">title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} placeholder="Add Two Numbers" />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-xs text-graphite">language</span>
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value as ProblemLanguage)}
            className={`${fieldClass} bg-[#070a0f]`}
          >
            {PROBLEM_LANGUAGES.map((l) => (
              <option key={l} value={l} disabled={!ENABLED.includes(l)}>
                {ENABLED.includes(l) ? l : `${l} (soon)`}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-xs text-graphite">difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className={`${fieldClass} bg-[#070a0f]`}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-xs text-graphite">description (shown to students)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          className={`${fieldClass} font-body`}
          placeholder="Explain the task, the function students must write, and an example."
        />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs text-graphite">code</span>
          <button
            onClick={loadTemplate}
            className="font-mono text-xs text-graphite underline hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            load {language} template
          </button>
        </div>
        <div className="h-[460px] border border-graphite">
          <CodeTabs tabs={tabs} language={EDITOR_LANGUAGE[language]} version={version} />
        </div>
      </div>

      {formError && (
        <p role="alert" className="border border-fail px-4 py-3 font-mono text-sm text-fail">
          {formError}
        </p>
      )}

      {phase.kind === 'done' && <AuthoringNotice result={phase.result} okMessage="Published. Opening the problem..." />}

      <button
        onClick={() => void handleCreate()}
        disabled={submitting}
        className="border border-signal px-5 py-2 font-mono text-sm text-signal transition-colors hover:bg-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        {submitting ? `[ checking solution ${(elapsed / 1000).toFixed(1)}s ]` : '[ publish problem ]'}
      </button>
    </div>
  );
}
