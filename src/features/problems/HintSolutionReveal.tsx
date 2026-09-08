import { useState } from 'react';

interface HintSolutionRevealProps {
  hints?: string[];
  solution?: string;
}

// Plain useState counter — this isn't async, so no reducer per the
// Milestone 4 spec. Hints reveal cumulatively (already-shown hints stay
// visible); once every hint has been shown (or immediately, if there are
// none), the button flips to "View Solution".
export function HintSolutionReveal({ hints, solution }: HintSolutionRevealProps) {
  const hintList = hints ?? [];
  const [revealedCount, setRevealedCount] = useState(0);
  const [solutionRevealed, setSolutionRevealed] = useState(false);

  const allHintsShown = revealedCount >= hintList.length;

  const handleClick = () => {
    if (!allHintsShown) {
      setRevealedCount((c) => c + 1);
    } else {
      setSolutionRevealed(true);
    }
  };

  return (
    <div className="mt-6 pt-4 border-t border-graphite">
      {hintList.slice(0, revealedCount).map((hint, i) => (
        <p key={i} className="font-body text-sm text-graphite mb-2">
          <span className="font-mono text-xs text-ink mr-2">hint {i + 1}</span>
          {hint}
        </p>
      ))}

      {solutionRevealed ? (
        <>
          <p className="font-mono text-xs text-ink mt-3 mb-1">solution</p>
          <pre className="font-mono text-sm text-ink border border-graphite p-3 whitespace-pre-wrap">
            {solution ?? 'No solution available yet.'}
          </pre>
        </>
      ) : (
        <button
          onClick={handleClick}
          className="font-mono text-sm text-graphite border border-graphite px-3 py-1.5 hover:text-ink hover:border-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          {allHintsShown ? 'View Solution' : `View Hint ${revealedCount + 1} of ${hintList.length}`}
        </button>
      )}
    </div>
  );
}
