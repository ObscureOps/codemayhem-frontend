import { useState } from 'react';
import type { CommunityState } from './useCommunity';

interface CommunityPanelProps {
  state: CommunityState;
  usernames: Record<string, string>;
  problemHash: string;
  // True once the user has a solved record, so answers are not spoiled early.
  canView: boolean;
  onUse: (solution: string) => void;
}

export function CommunityPanel({ state, usernames, problemHash, canView, onUse }: CommunityPanelProps) {
  const [revealed, setRevealed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!canView && !revealed) {
    return (
      <div className="space-y-3 font-mono text-sm text-graphite">
        <p>Public solutions from other users are listed here. Solve the problem first to avoid spoilers.</p>
        <button
          onClick={() => setRevealed(true)}
          className="underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          show them anyway
        </button>
      </div>
    );
  }

  if (state.status === 'idle' || state.status === 'loading') {
    return <p className="font-mono text-sm text-graphite">loading solutions...</p>;
  }

  if (state.status === 'error') {
    return <p className="font-mono text-sm text-fail">Could not load solutions: {state.message}</p>;
  }

  if (state.data.length === 0) {
    return <p className="font-mono text-sm text-graphite">Nobody has shared a solution yet.</p>;
  }

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  };

  return (
    <ul className="space-y-4">
      {state.data.map((entry) => (
        <li key={entry.id} className="border border-graphite">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-graphite px-3 py-2 font-mono text-xs">
            <span className="text-ink">{usernames[entry.userId] ?? 'user'}</span>
            <span className="text-graphite">
              {entry.problemHash !== problemHash && 'older version · '}
              {new Date(entry.createdAt).toLocaleDateString()}
            </span>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre p-3 font-mono text-xs text-ink">{entry.solution}</pre>
          <div className="flex gap-4 border-t border-graphite px-3 py-2 font-mono text-xs">
            <button
              onClick={() => void copy(entry.id, entry.solution)}
              className="text-graphite underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
            >
              {copiedId === entry.id ? 'copied' : 'copy'}
            </button>
            <button
              onClick={() => onUse(entry.solution)}
              className="text-graphite underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
            >
              load into editor
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
