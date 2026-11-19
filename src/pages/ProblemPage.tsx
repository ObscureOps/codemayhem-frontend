import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Heart, Pencil } from 'lucide-react';
import { apiClient } from '../api/client';
import { EDITOR_LANGUAGE, type Difficulty, type Problem } from '../api/types/problems';
import { CodeEditor } from '../features/problems/CodeEditor';
import { CommunityPanel } from '../features/problems/CommunityPanel';
import { EditorSettingsPopover } from '../features/problems/EditorSettingsPopover';
import type { EditorFontName, EditorThemeName } from '../features/problems/editorTheme';
import { ResizableDivider } from '../features/problems/ResizableDivider';
import { useCommunity } from '../features/problems/useCommunity';
import { useMark } from '../features/problems/useMark';
import { useProblem, useUsernames, type ProblemDetailData } from '../features/problems/useProblemData';
import { useProblemSubmissionFlow } from '../features/problems/useProblemSubmissionFlow';
import { useSplitPane } from '../features/problems/useSplitPane';
import { VERDICT_LABEL } from '../features/problems/verdict';
import { VerdictPanel } from '../features/problems/VerdictPanel';

const difficultyColor: Record<Difficulty, string> = {
  Easy: 'text-pass',
  Medium: 'text-graphite',
  Hard: 'text-fail',
};

const RESET_CONFIRM =
  'Reset your solved status for this problem?\n\nYour solved record and any publicly shared solution will be removed. You will count as unsolved until a new submission is accepted.';

const draftKey = (id: string) => `ciscode.draft.${id}`;

function loadDraft(id: string): string | null {
  try {
    return localStorage.getItem(draftKey(id));
  } catch {
    return null;
  }
}

function saveDraft(id: string, value: string) {
  try {
    localStorage.setItem(draftKey(id), value);
  } catch {
    // Storage can be unavailable (private mode, quota). Drafts are a convenience only.
  }
}

const chipClass =
  'flex items-center gap-1.5 border px-2.5 py-1 font-mono text-xs transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal';

function Chip({
  active,
  busy,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  busy: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      className={`${chipClass} ${active ? 'border-ink bg-ink text-chalk' : 'border-graphite text-graphite hover:text-ink'}`}
    >
      {icon}
      {children}
    </button>
  );
}

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  // Keyed so every problem gets fresh loading and editor state.
  return <ProblemLoader key={id} id={id ?? ''} />;
}

function ProblemLoader({ id }: { id: string }) {
  const load = useProblem(id);

  if (load.status === 'loading') {
    return <p className="p-10 font-mono text-sm text-graphite">loading problem...</p>;
  }

  if (load.status === 'error') {
    return (
      <div className="p-10">
        <p className="font-mono text-fail">Could not load this problem: {load.message}</p>
        <Link to="/problems" className="font-mono text-graphite underline">back to problems</Link>
      </div>
    );
  }

  if (!load.data.problem) {
    return (
      <div className="p-10">
        <p className="font-mono text-fail">Problem not found.</p>
        <Link to="/problems" className="font-mono text-graphite underline">back to problems</Link>
      </div>
    );
  }

  return <Workbench problem={load.data.problem} initial={load.data} />;
}

type LeftTab = 'description' | 'submissions' | 'community';

function Workbench({ problem, initial }: { problem: Problem; initial: ProblemDetailData }) {
  // Starting code: local draft first, then the last submitted attempt saved
  // on the server (for another device), then the author's boilerplate.
  const [code, setCode] = useState(() => loadDraft(problem.id) ?? initial.attempt ?? problem.boilerplate);
  // CodeEditor only reads `value` on mount, so replacing the document
  // (restore, reset, load a community solution) means changing its key.
  const [docVersion, setDocVersion] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState<EditorFontName>('ibm-plex-mono');
  const [wordWrap, setWordWrap] = useState(false);
  const [theme, setTheme] = useState<EditorThemeName>('ink');
  const [leftTab, setLeftTab] = useState<LeftTab>('description');
  const [shared, setShared] = useState(initial.solved?.isPublic ?? false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Solved-state reset: `cleared` ignores the solved record read at page load,
  // and `boundary` ignores session history from before the reset.
  const [cleared, setCleared] = useState(false);
  const [boundary, setBoundary] = useState(0);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const { state, elapsed, history, submit, isSubmitting } = useProblemSubmissionFlow(problem.id);
  const like = useMark('liked', problem.id, initial.liked);
  const bookmark = useMark('bookmarked', problem.id, initial.bookmarked);

  const horizontal = useSplitPane({ axis: 'x', side: 'start', defaultSize: 380, min: 280, max: 560, reserve: 420 });
  const vertical = useSplitPane({ axis: 'y', side: 'end', defaultSize: 260, min: 120, max: 560, reserve: 200 });

  const isAuthor = problem.harness !== undefined;
  const solvedHash = cleared ? null : (initial.solved?.hash ?? null);
  // A 409 "already solved" also proves a solved record exists, even when it
  // is private and cannot be read back.
  const solvedThisSession = history.some(
    (entry) => entry.id > boundary && (entry.verdict.kind === 'accepted' || entry.verdict.kind === 'already_solved'),
  );
  const status =
    solvedThisSession || (solvedHash !== null && solvedHash === problem.problemHash)
      ? 'solved'
      : solvedHash !== null
        ? 'older'
        : 'unsolved';
  const hasSolvedRecord = status !== 'unsolved';

  // After a reset the judge should run again. A fresh 409 means the delete
  // did not actually remove the record.
  const resetIneffective =
    cleared && history.some((entry) => entry.id > boundary && entry.verdict.kind === 'already_solved');
  const resetNotice =
    resetError ??
    (resetIneffective
      ? 'The server still reports this problem as solved, so the reset did not take effect. The solved table may not allow deleting your own record. Ask the backend team to check its delete permission.'
      : null);

  const community = useCommunity(problem.id, leftTab === 'community');
  const usernames = useUsernames(
    community.status === 'ready' ? community.data.map((entry) => entry.userId) : [],
  );

  const handleChange = useCallback(
    (value: string) => {
      setCode(value);
      saveDraft(problem.id, value);
    },
    [problem.id],
  );

  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;
    // Best effort: remember this attempt on the server for other devices.
    apiClient.problems.saveAttempt(problem.id, code).catch(() => {});
    void submit(code);
  }, [code, isSubmitting, problem.id, submit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSubmit]);

  const resetSolved = useCallback(
    async (thenSubmit: boolean) => {
      if (resetBusy || isSubmitting) return;
      if (!window.confirm(RESET_CONFIRM)) return;

      setResetBusy(true);
      setResetError(null);

      try {
        await apiClient.problems.resetSolved(problem.id);
      } catch (e) {
        setResetError(`Could not reset: ${(e as Error).message}`);
        setResetBusy(false);
        return;
      }

      setCleared(true);
      setBoundary(history[0]?.id ?? 0);
      setShared(false);
      setResetBusy(false);

      if (thenSubmit) {
        apiClient.problems.saveAttempt(problem.id, code).catch(() => {});
        void submit(code);
      }
    },
    [code, history, isSubmitting, problem.id, resetBusy, submit],
  );

  const replaceCode = (value: string) => {
    setCode(value);
    saveDraft(problem.id, value);
    setDocVersion((v) => v + 1);
  };

  const toggleShare = async () => {
    if (shareBusy) return;
    const next = !shared;
    setShareBusy(true);
    setShareError(null);
    try {
      await apiClient.problems.setPublic(problem.id, next);
      setShared(next);
    } catch (e) {
      setShareError((e as Error).message);
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div ref={horizontal.containerRef} className="flex h-[calc(100vh-4rem)] min-h-[560px] md:h-full">
      {/* Left: problem, submissions, community */}
      <section
        style={{ width: horizontal.size }}
        className="flex shrink-0 flex-col overflow-hidden bg-chalk text-ink"
      >
        <div className="flex items-center border-b border-graphite" role="tablist" aria-label="Problem panel">
          {(['description', 'submissions', 'community'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={leftTab === tab}
              onClick={() => setLeftTab(tab)}
              className={`border-r border-graphite px-4 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal ${
                leftTab === tab ? 'bg-ink text-chalk' : 'text-graphite hover:text-ink'
              }`}
            >
              {tab}
              {tab === 'submissions' && history.length > 0 && ` (${history.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {leftTab === 'description' && (
            <>
              <Link to="/problems" className="font-mono text-xs text-graphite hover:text-ink">
                &larr; back to problems
              </Link>
              <h1 className="mt-2 font-display text-2xl">{problem.title}</h1>
              <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-sm">
                <span className={difficultyColor[problem.difficulty]}>{problem.difficulty}</span>
                <span className="text-graphite">{problem.language}</span>
                {isAuthor && <span className="text-graphite">you are the author</span>}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Chip active={like.on} busy={like.busy} onClick={() => void like.toggle()} icon={<Heart size={13} />}>
                  {like.on ? 'liked' : 'like'}
                </Chip>
                <Chip
                  active={bookmark.on}
                  busy={bookmark.busy}
                  onClick={() => void bookmark.toggle()}
                  icon={<Bookmark size={13} />}
                >
                  {bookmark.on ? 'bookmarked' : 'bookmark'}
                </Chip>
                {isAuthor && (
                  <Link
                    to={`/problems/${problem.id}/edit`}
                    className={`${chipClass} border-graphite text-graphite hover:text-ink`}
                  >
                    <Pencil size={13} />
                    edit
                  </Link>
                )}
              </div>
              {(like.error || bookmark.error) && (
                <p className="mt-2 break-words font-mono text-xs text-fail">{like.error ?? bookmark.error}</p>
              )}

              <div className="mt-6 whitespace-pre-wrap font-body leading-relaxed">{problem.body}</div>

              <details className="mt-8 border border-graphite p-3">
                <summary className="cursor-pointer font-mono text-xs text-graphite">how this is judged</summary>
                <ul className="mt-2 space-y-1 font-body text-sm text-graphite">
                  <li>Your code is run through a hidden judge program, and so is the author's reference solution.</li>
                  <li>Your output must match the reference exactly, including spacing and order.</li>
                  <li>You get one verdict for the whole run, not a result per test case.</li>
                  <li>Compile warnings count as errors. Time limit is 3 seconds, output is capped at 4096 bytes.</li>
                  <li>Once solved, the judge skips the problem. Use "reset solved status" to be judged again.</li>
                </ul>
              </details>
            </>
          )}

          {leftTab === 'submissions' &&
            (history.length === 0 ? (
              <p className="font-mono text-sm text-graphite">No submissions yet in this session.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 border border-graphite p-3">
                    <div className="font-mono text-xs">
                      <p
                        className={
                          entry.verdict.kind === 'accepted'
                            ? 'text-pass'
                            : entry.verdict.kind === 'already_solved'
                              ? 'text-graphite'
                              : 'text-fail'
                        }
                      >
                        {VERDICT_LABEL[entry.verdict.kind]}
                      </p>
                      <p className="text-graphite">
                        {new Date(entry.at).toLocaleTimeString()} · {(entry.durationMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <button
                      onClick={() => replaceCode(entry.solution)}
                      className="font-mono text-xs text-graphite underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
                    >
                      restore
                    </button>
                  </li>
                ))}
              </ul>
            ))}

          {leftTab === 'community' && (
            <CommunityPanel
              state={community}
              usernames={usernames}
              problemHash={problem.problemHash}
              canView={hasSolvedRecord}
              onUse={replaceCode}
            />
          )}
        </div>
      </section>

      <ResizableDivider
        ariaLabel="Resize problem panel"
        onPointerDown={horizontal.onPointerDown}
        onKeyNudge={horizontal.nudge}
      />

      {/* Right: editor and verdict */}
      <section className="flex min-w-0 flex-1 flex-col bg-ink text-chalk">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite px-3 py-2">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="border border-graphite px-2 py-0.5 text-chalk">{problem.language}</span>
            {status === 'solved' && <span className="text-pass">solved</span>}
            {status === 'older' && (
              <span className="text-graphite" title="The author changed this problem after you solved it.">
                solved on an older version
              </span>
            )}
            {hasSolvedRecord && (
              <button
                onClick={() => void toggleShare()}
                disabled={shareBusy}
                aria-pressed={shared}
                title="Shared solutions appear in the Community tab for everyone."
                className="text-graphite underline hover:text-chalk disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                {shared ? 'solution shared publicly (click to hide)' : 'share my solution'}
              </button>
            )}
            {hasSolvedRecord && (
              <button
                onClick={() => void resetSolved(false)}
                disabled={resetBusy || isSubmitting}
                title="Deletes your solved record so the judge runs your next submission."
                className="text-graphite underline hover:text-chalk disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                reset solved status
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthor && problem.solution !== undefined && (
              <button
                onClick={() => replaceCode(problem.solution ?? '')}
                title="Only the author sees this. Load it, then submit to check the problem end to end."
                className="font-mono text-xs text-graphite underline hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                load reference solution
              </button>
            )}
            <button
              onClick={() => replaceCode(problem.boilerplate)}
              className="font-mono text-xs text-graphite underline hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
            >
              reset code
            </button>
            <EditorSettingsPopover
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
              wordWrap={wordWrap}
              onWordWrapChange={setWordWrap}
              theme={theme}
              onThemeChange={setTheme}
              fontFamily={fontFamily}
              onFontFamilyChange={setFontFamily}
            />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              title="Ctrl/Cmd + Enter"
              className="border border-signal px-4 py-1.5 font-mono text-sm text-signal transition-colors hover:bg-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {isSubmitting ? `[ judging ${(elapsed / 1000).toFixed(1)}s ]` : '[ submit ]'}
            </button>
          </div>
        </div>

        {shareError && (
          <p className="break-words border-b border-graphite px-3 py-1.5 font-mono text-xs text-fail">
            Could not change sharing: {shareError}
          </p>
        )}

        <div ref={vertical.containerRef} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <CodeEditor
              language={EDITOR_LANGUAGE[problem.language]}
              value={code}
              onChange={handleChange}
              theme={theme}
              fontSize={fontSize}
              fontFamily={fontFamily}
              wordWrap={wordWrap}
              editorKey={`${problem.id}:${docVersion}`}
            />
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize verdict panel"
            tabIndex={0}
            onPointerDown={vertical.onPointerDown}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                vertical.nudge(16);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                vertical.nudge(-16);
              }
            }}
            className="h-2 shrink-0 cursor-row-resize touch-none select-none border-t border-graphite hover:bg-graphite/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          />

          <div style={{ height: vertical.size }} className="shrink-0 overflow-y-auto">
            <VerdictPanel
              state={state}
              elapsed={elapsed}
              language={problem.language}
              onSolveAgain={() => void resetSolved(true)}
              solveAgainBusy={resetBusy}
              notice={resetNotice}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
