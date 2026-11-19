import type { DiffLine, DiffResult } from './diff';

const statusStyles: Record<DiffLine['status'], string> = {
  okay: 'text-pass',
  excess: 'text-graphite',
  lacking: 'text-fail',
};

interface DiffViewProps {
  result: DiffResult;
  onClose: () => void;
}

// "See what's wrong" — a line-level diff between actual and expected
// output. Structurally the same Okay/Excess/Lacking legend as the
// CodeChum reference, rebuilt entirely from CISCODE's own tokens:
// `pass`/`fail` for the two definite states, plain `graphite` (not a new
// hue) for "excess" — `signal` stays reserved for the submit control and
// isn't spent here. Opened from the Wrong Answer verdict.
export function DiffView({ result, onClose }: DiffViewProps) {
  return (
    <div className="font-mono text-sm">
      <div className="flex items-center justify-between p-3 border-b border-graphite">
        <button
          onClick={onClose}
          className="text-graphite hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          &larr; hide diff
        </button>
        <div className="flex gap-4 text-xs">
          <span className="text-pass">● okay</span>
          <span className="text-graphite">● excess</span>
          <span className="text-fail">● lacking</span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-graphite">
        <div>
          <p className="px-3 py-2 text-xs text-graphite border-b border-graphite">Your Output</p>
          <div className="p-3 space-y-0.5">
            {result.actual.map((line) => (
              <div key={line.lineNumber} className={`whitespace-pre-wrap ${statusStyles[line.status]}`}>
                <span className="text-graphite/60 mr-2 select-none">{line.lineNumber}</span>
                {line.content || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="px-3 py-2 text-xs text-graphite border-b border-graphite">Expected Output</p>
          <div className="p-3 space-y-0.5">
            {result.expected.map((line) => (
              <div key={line.lineNumber} className={`whitespace-pre-wrap ${statusStyles[line.status]}`}>
                <span className="text-graphite/60 mr-2 select-none">{line.lineNumber}</span>
                {line.content || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
