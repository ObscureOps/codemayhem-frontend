import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { DIFFICULTIES, EDITOR_LANGUAGE, type Difficulty, type Problem } from '../api/types/problems';
import { AuthoringNotice } from '../features/problems/AuthoringNotice';
import { classifyUpdate, type AuthoringResult } from '../features/problems/authoring';
import { CodeTabs, type CodeTab } from '../features/problems/CodeTabs';
import { useProblem } from '../features/problems/useProblemData';

type Phase =
  | { kind: 'idle' }
  | { kind: 'saving'; startedAt: number }
  | { kind: 'done'; result: AuthoringResult };

type Message = { kind: 'ok' | 'error'; text: string } | null;

const fieldClass =
  'w-full border border-graphite bg-transparent px-3 py-2 font-mono text-sm text-chalk placeholder:text-graphite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal';

const primaryButton =
  'border border-signal px-5 py-2 font-mono text-sm text-signal transition-colors hover:bg-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal';

export default function EditProblemPage() {
  const { id } = useParams<{ id: string }>();
  return <EditLoader key={id} id={id ?? ''} />;
}

function EditLoader({ id }: { id: string }) {
  const load = useProblem(id);

  if (load.status === 'loading') {
    return <p className="font-mono text-sm text-graphite">loading problem...</p>;
  }

  if (load.status === 'error') {
    return <p className="font-mono text-fail">Could not load this problem: {load.message}</p>;
  }

  const problem = load.data.problem;

  if (!problem) {
    return (
      <div>
        <p className="font-mono text-fail">Problem not found.</p>
        <Link to="/problems" className="font-mono text-graphite underline">back to problems</Link>
      </div>
    );
  }

  // The server only sends harness and solution to the author.
  if (problem.harness === undefined || problem.solution === undefined) {
    return (
      <div>
        <p className="font-mono text-fail">Only the author can edit this problem.</p>
        <Link to={`/problems/${problem.id}`} className="font-mono text-graphite underline">back to the problem</Link>
      </div>
    );
  }

  return <Editor problem={problem} initialHarness={problem.harness} initialSolution={problem.solution} />;
}

function Editor({
  problem,
  initialHarness,
  initialSolution,
}: {
  problem: Problem;
  initialHarness: string;
  initialSolution: string;
}) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(problem.title);
  const [difficulty, setDifficulty] = useState<Difficulty>(problem.difficulty);
  const [body, setBody] = useState(problem.body);
  const [boilerplate, setBoilerplate] = useState(problem.boilerplate);
  const [harness, setHarness] = useState(initialHarness);
  const [solution, setSolution] = useState(initialSolution);

  // What the server currently holds, used to detect unsaved changes.
  const [savedMeta, setSavedMeta] = useState({
    title: problem.title,
    difficulty: problem.difficulty,
    body: problem.body,
    boilerplate: problem.boilerplate,
  });
  const [savedJudge, setSavedJudge] = useState({ harness: initialHarness, solution: initialSolution });

  const [metaBusy, setMetaBusy] = useState(false);
  const [metaMessage, setMetaMessage] = useState<Message>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (phase.kind !== 'saving') return;
    const timer = window.setInterval(() => setElapsed(Date.now() - phase.startedAt), 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  const metaDirty =
    title !== savedMeta.title ||
    difficulty !== savedMeta.difficulty ||
    body !== savedMeta.body ||
    boilerplate !== savedMeta.boilerplate;
  const judgeDirty = harness !== savedJudge.harness || solution !== savedJudge.solution;
  const saving = phase.kind === 'saving';

  const tabs: CodeTab[] = [
    {
      id: 'boilerplate',
      label: 'starter code',
      hint: 'What students see in the editor. Saved with the details above.',
      value: boilerplate,
      onChange: setBoilerplate,
    },
    {
      id: 'harness',
      label: 'harness (hidden)',
      hint: 'The judge program. It is run with your reference solution on save, and that run must succeed.',
      value: harness,
      onChange: setHarness,
    },
    {
      id: 'solution',
      label: 'reference solution (hidden)',
      hint: 'What every submission is compared against.',
      value: solution,
      onChange: setSolution,
    },
  ];

  // Title, description, difficulty and starter code are written straight to
  // the table. They do not feed problem_hash, so no one's solve is outdated.
  const handleSaveMeta = async () => {
    if (metaBusy || !metaDirty) return;

    if (!title.trim() || !body.trim() || !boilerplate.trim()) {
      setMetaMessage({ kind: 'error', text: 'Title, description and starter code cannot be empty.' });
      return;
    }

    setMetaBusy(true);
    setMetaMessage(null);

    try {
      const next = { title: title.trim(), difficulty, body, boilerplate };
      await apiClient.problems.updateMeta(problem.id, next);

      // The update returns no rows, so read the problem back to be sure.
      const fresh = await apiClient.problems.get(problem.id);
      const stored =
        fresh?.title === next.title &&
        fresh?.difficulty === next.difficulty &&
        fresh?.body === next.body &&
        fresh?.boilerplate === next.boilerplate;

      if (stored) {
        setTitle(next.title);
        setSavedMeta(next);
        setMetaMessage({ kind: 'ok', text: 'Details saved.' });
      } else {
        setMetaMessage({
          kind: 'error',
          text: 'The server accepted the update but the stored details did not change. The problems table may block this edit.',
        });
      }
    } catch (e) {
      setMetaMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setMetaBusy(false);
    }
  };

  const handleSaveJudge = async () => {
    if (inFlight.current || !judgeDirty) return;
    inFlight.current = true;
    setElapsed(0);
    setPhase({ kind: 'saving', startedAt: Date.now() });

    let result: AuthoringResult;
    try {
      const res = await apiClient.problems.update(problem.id, { harness, solution });
      result = classifyUpdate(res.status, res.body);

      // A 204 only says the request was accepted. Read the problem back to
      // make sure the new harness and solution were really stored.
      if (result.kind === 'ok') {
        const fresh = await apiClient.problems.get(problem.id);
        if (fresh?.harness === harness && fresh?.solution === solution) {
          setSavedJudge({ harness, solution });
        } else {
          result = { kind: 'not_applied' };
        }
      }
    } catch {
      result = { kind: 'network_error' };
    }

    inFlight.current = false;
    setPhase({ kind: 'done', result });
  };

  const handleDelete = async () => {
    if (deleteBusy) return;
    const confirmed = window.confirm(
      `Delete "${problem.title}"?\n\nThis removes the problem for everyone and cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      await apiClient.problems.remove(problem.id);

      // The delete returns no rows, so check that the problem is really gone.
      const stillThere = await apiClient.problems.get(problem.id);
      if (stillThere) {
        setDeleteError('The server accepted the delete but the problem still exists.');
        return;
      }

      navigate('/problems');
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/problems/${problem.id}`} className="font-mono text-xs text-graphite hover:text-chalk">
          &larr; back to the problem
        </Link>
        <h1 className="mt-2 font-display text-2xl text-chalk">Edit: {problem.title}</h1>
        <p className="mt-1 font-mono text-sm text-graphite">{problem.language}</p>
      </div>

      <p className="max-w-2xl border border-graphite px-4 py-3 font-body text-sm text-graphite">
        Two kinds of change. Title, description, difficulty and starter code save straight away and do not affect
        anyone's solved status. The harness and reference solution are re-run by the server before saving, and
        changing them marks earlier solves as "solved on an older version". The language cannot be changed.
      </p>

      <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
        <label className="block">
          <span className="mb-1 block font-mono text-xs text-graphite">title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
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
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => void handleSaveMeta()} disabled={metaBusy || !metaDirty} className={primaryButton}>
          {metaBusy ? '[ saving... ]' : '[ save details and starter code ]'}
        </button>
        {metaDirty && !metaBusy && <span className="font-mono text-xs text-graphite">unsaved details</span>}
      </div>

      {metaMessage && (
        <p
          role={metaMessage.kind === 'ok' ? 'status' : 'alert'}
          className={`break-words border px-4 py-3 font-mono text-sm ${
            metaMessage.kind === 'ok' ? 'border-pass text-pass' : 'border-fail text-fail'
          }`}
        >
          {metaMessage.text}
        </p>
      )}

      <div className="h-[480px] border border-graphite">
        <CodeTabs tabs={tabs} language={EDITOR_LANGUAGE[problem.language]} />
      </div>

      {phase.kind === 'done' && (
        <AuthoringNotice result={phase.result} okMessage="Saved. The new harness and solution are stored." />
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => void handleSaveJudge()} disabled={saving || !judgeDirty} className={primaryButton}>
          {saving ? `[ checking solution ${(elapsed / 1000).toFixed(1)}s ]` : '[ save harness and solution ]'}
        </button>
        {judgeDirty && !saving && <span className="font-mono text-xs text-graphite">unsaved harness or solution</span>}
      </div>

      <div className="space-y-3 border border-fail px-4 py-4">
        <p className="font-mono text-sm text-fail">Danger zone</p>
        <p className="max-w-2xl font-body text-sm text-graphite">
          Deleting removes this problem for everyone. Solved records, likes and bookmarks that point to it may be
          removed with it.
        </p>
        <button
          onClick={() => void handleDelete()}
          disabled={deleteBusy}
          className="border border-fail px-4 py-2 font-mono text-sm text-fail transition-colors hover:bg-fail hover:text-chalk disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fail"
        >
          {deleteBusy ? '[ deleting... ]' : '[ delete problem ]'}
        </button>
        {deleteError && <p className="break-words font-mono text-xs text-fail">{deleteError}</p>}
      </div>
    </div>
  );
}
