import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MOCK_PROBLEMS, getVariantsForProblem } from '../api/mocks/problems';
import type { Difficulty } from '../api/types/problems';
import { CodeEditor } from '../features/problems/CodeEditor';
import { SubmissionPanel } from '../features/problems/SubmissionPanel';
import { useProblemSubmissionFlow } from '../features/problems/useProblemSubmissionFlow';
import { useResizablePanes } from '../features/problems/useResizablePanes';
import { ResizableDivider } from '../features/problems/ResizableDivider';
import { HintSolutionReveal } from '../features/problems/HintSolutionReveal';
import { useMultiFileEditor } from '../features/problems/useMultiFileEditor';
import { FileTabs } from '../features/problems/FileTabs';
import { EditorSettingsPopover } from '../features/problems/EditorSettingsPopover';
import type { EditorThemeName } from '../features/problems/editorTheme';

const difficultyColor: Record<Difficulty, string> = {
  Easy: 'text-pass',
  Medium: 'text-graphite',
  Hard: 'text-fail',
};

const ALL_LANGUAGES = ['c', 'java', 'sql'] as const;

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const problem = MOCK_PROBLEMS.find((p) => p.id === id);
  const variants = id ? getVariantsForProblem(id) : [];

  // Only C is enabled this milestone — the judge service only compiles C
  // right now. java/sql tabs still render (per contract, the Language
  // type keeps all three) but are permanently disabled with a "(soon)"
  // label, regardless of whether a mock variant exists for them.
  const cVariant = variants.find((v) => v.language === 'c');

  const { state, submit, reset } = useProblemSubmissionFlow();
  const { files, activeFileName, setActiveFileName, updateActiveFileContent, addFile, closeFile, resetFiles } =
    useMultiFileEditor(cVariant?.boilerplate ?? '');
  const activeFile = files.find((f) => f.name === activeFileName);

  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(false);
  const [editorTheme, setEditorTheme] = useState<EditorThemeName>('ink');

  const {
    containerRef,
    leftWidth,
    rightWidth,
    leftCollapsed,
    rightCollapsed,
    toggleLeft,
    toggleRight,
    onDragLeft,
    onDragRight,
    nudgeLeft,
    nudgeRight,
  } = useResizablePanes({
    left: { defaultWidth: 340, minWidth: 260, maxWidth: 520 },
    right: { defaultWidth: 320, minWidth: 240, maxWidth: 480 },
    centerMinWidth: 360,
  });

  // Reset files + submission state whenever the C variant changes (i.e.
  // navigating to a different problem).
  useEffect(() => {
    resetFiles(cVariant?.boilerplate ?? '');
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cVariant?.id]);

  if (!problem) {
    return (
      <div className="p-10">
        <p className="font-mono text-fail">Problem not found.</p>
        <Link to="/problems" className="font-mono text-graphite underline">
          back to problems
        </Link>
      </div>
    );
  }

  // For the left-pane statement/samples, prefer the C variant; fall back
  // to whatever variant exists (java/sql) so the statement itself is
  // still readable even though the editor for it isn't enabled yet.
  const displayVariant = cVariant ?? variants[0];

  return (
    // NOTE: no mobile layout yet — desktop-only by explicit decision, see PROGRESS.md.
    <div ref={containerRef} className="flex h-[80vh] min-h-[600px] overflow-hidden">
      {/* Left pane: problem statement, tags, samples, hints/solution */}
      {leftCollapsed ? (
        <button
          onClick={toggleLeft}
          aria-label="Expand problem panel"
          className="shrink-0 w-6 bg-chalk border-r border-graphite flex items-start justify-center pt-4 hover:bg-graphite/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          <ChevronRight size={14} className="text-graphite" />
        </button>
      ) : (
        <>
          <section style={{ width: leftWidth }} className="shrink-0 bg-chalk text-ink overflow-y-auto">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <Link to="/problems" className="font-mono text-xs text-graphite hover:text-ink">
                  &larr; back to problems
                </Link>
                <button
                  onClick={toggleLeft}
                  aria-label="Collapse problem panel"
                  className="shrink-0 text-graphite hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <h1 className="font-display text-2xl mt-2">{problem.title}</h1>
              <p className={`font-mono text-sm mt-1 ${difficultyColor[problem.difficulty]}`}>
                {problem.difficulty}
              </p>
              <p className="font-body text-sm text-graphite mt-1">by {problem.author}</p>

              {problem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {problem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-xs text-graphite border border-graphite px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {displayVariant && (
                <div className="font-body text-ink mt-6 leading-relaxed whitespace-pre-wrap">
                  {displayVariant.body}
                </div>
              )}

              {displayVariant?.sampleOutputs && displayVariant.sampleOutputs.length > 0 && (
                <div className="mt-6 space-y-4">
                  {displayVariant.sampleOutputs.map((sample) => (
                    <div key={sample.label}>
                      <p className="font-mono text-xs text-graphite mb-1">{sample.label}</p>
                      <pre className="font-mono text-sm text-ink border border-graphite p-3 whitespace-pre-wrap">
                        {sample.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              <HintSolutionReveal key={problem.id} hints={problem.hints} solution={problem.solution} />
            </div>
          </section>

          <ResizableDivider
            ariaLabel="Resize problem panel"
            onPointerDown={onDragLeft}
            onKeyNudge={(d) => nudgeLeft(d)}
          />
        </>
      )}

      {/* Center pane: editor */}
      <section className="flex-1 min-w-0 bg-ink text-chalk flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-graphite">
          <div className="flex" role="tablist" aria-label="Language">
            {ALL_LANGUAGES.map((lang) => {
              const enabled = lang === 'c' && !!cVariant;
              return (
                <button
                  key={lang}
                  role="tab"
                  aria-selected={enabled}
                  disabled={!enabled}
                  title={enabled ? undefined : 'coming soon'}
                  className={`font-mono text-sm px-4 py-2 border-r border-graphite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal ${
                    enabled ? 'bg-chalk text-ink' : 'text-graphite/40 cursor-not-allowed'
                  }`}
                >
                  {lang}
                  {!enabled && <span className="ml-1.5 text-[10px]">(soon)</span>}
                </button>
              );
            })}
          </div>
          {cVariant && (
            <div className="pr-2">
              <EditorSettingsPopover
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                wordWrap={wordWrap}
                onWordWrapChange={setWordWrap}
                theme={editorTheme}
                onThemeChange={setEditorTheme}
              />
            </div>
          )}
        </div>

        {cVariant && activeFile ? (
          <>
            <FileTabs
              files={files}
              activeFileName={activeFileName}
              onSelect={setActiveFileName}
              onAdd={addFile}
              onClose={closeFile}
            />
            <div className="flex-1 min-h-[240px]">
              <CodeEditor
                language="c"
                value={activeFile.content}
                onChange={updateActiveFileContent}
                theme={editorTheme}
                fontSize={fontSize}
                wordWrap={wordWrap}
                editorKey={`${cVariant.id}:${activeFileName}`}
              />
            </div>
            <SubmissionPanel
              status={state.status}
              result={state.result}
              onSubmit={() => submit('c', files, cVariant.id)}
              onReset={reset}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="font-mono text-sm text-graphite text-center">
              This problem's language isn't supported by the judge yet.
              <br />
              Only C submissions are enabled right now.
            </p>
          </div>
        )}
      </section>

      {/* Right pane: placeholder — Test Cases / Executions land in 4d–4f */}
      {rightCollapsed ? (
        <button
          onClick={toggleRight}
          aria-label="Expand test panel"
          className="shrink-0 w-6 bg-chalk border-l border-graphite flex items-start justify-center pt-4 hover:bg-graphite/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          <ChevronLeft size={14} className="text-graphite" />
        </button>
      ) : (
        <>
          <ResizableDivider
            ariaLabel="Resize test panel"
            onPointerDown={onDragRight}
            onKeyNudge={(d) => nudgeRight(-d)}
          />

          <section style={{ width: rightWidth }} className="shrink-0 bg-chalk text-ink overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-graphite">
              <button
                onClick={toggleRight}
                aria-label="Collapse test panel"
                className="text-graphite hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                <ChevronRight size={16} />
              </button>
              <span className="font-mono text-xs text-graphite">tests</span>
            </div>
            <div className="p-4 font-mono text-sm text-graphite">
              Test cases and executions land here in 4d–4f.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
