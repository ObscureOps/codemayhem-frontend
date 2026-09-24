
import { useState } from 'react';
import type { ExecutionCheckpoint } from './useExecutions';
import type { EditorFile } from './useMultiFileEditor';

interface ExecutionsTabProps {
  checkpoints: ExecutionCheckpoint[];
  onRestore: (files: EditorFile[]) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// View is non-destructive (shows a saved checkpoint's score/files without
// touching the current editor). Restore overwrites the editor, so it's
// the only action gated behind an inline confirm step, per the spec.
export function ExecutionsTab({ checkpoints, onRestore }: ExecutionsTabProps) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (checkpoints.length === 0) {
    return (
      <div className="p-4 font-mono text-sm text-graphite">
        No checks run yet. Run "Check code" to save your first checkpoint here.
      </div>
    );
  }

  const viewing = checkpoints.find((c) => c.id === viewingId);
  if (viewing) {
    return (
      <div className="p-4">
        <button
          onClick={() => setViewingId(null)}
          className="font-mono text-xs text-graphite hover:text-ink mb-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          &larr; back to executions
        </button>
        <p className="font-mono text-sm mb-2">{formatTimestamp(viewing.timestamp)}</p>
        <p className={`font-mono text-sm mb-4 ${viewing.passed ? 'text-pass' : 'text-fail'}`}>
          Score: {viewing.score}
        </p>
        <p className="font-mono text-xs text-graphite mb-1">files at this checkpoint</p>
        <ul className="space-y-1">
          {viewing.files.map((f) => (
            <li key={f.name} className="font-mono text-xs text-ink border border-graphite px-2 py-1">
              {f.name}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-graphite">
      {checkpoints.map((cp) => (
        <li key={cp.id} className="p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-graphite">{formatTimestamp(cp.timestamp)}</span>
            <span className={`font-mono text-xs ${cp.passed ? 'text-pass' : 'text-fail'}`}>{cp.score}</span>
          </div>

          {confirmingId === cp.id ? (
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-xs text-fail">Overwrite editor with this checkpoint?</span>
              <button
                onClick={() => {
                  onRestore(cp.files);
                  setConfirmingId(null);
                }}
                className="font-mono text-xs text-fail underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                confirm
              </button>
              <button
                onClick={() => setConfirmingId(null)}
                className="font-mono text-xs text-graphite underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => setViewingId(cp.id)}
                className="font-mono text-xs text-graphite underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                View
              </button>
              <button
                onClick={() => setConfirmingId(cp.id)}
                className="font-mono text-xs text-graphite underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
              >
                Restore
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
