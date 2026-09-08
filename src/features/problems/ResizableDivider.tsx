import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

interface ResizableDividerProps {
  ariaLabel: string;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyNudge: (deltaPx: number) => void;
}

const NUDGE_STEP = 16;

// The grip-dot handle is a functional resize affordance, not a styling
// choice borrowed from the reference screenshots — flat graphite dots on
// a graphite hairline, no shadow, no color spend. `signal` stays reserved
// for SubmissionPanel; this divider never touches it except for the
// standard keyboard-focus ring, same as every other focusable control.
export function ResizableDivider({ ariaLabel, onPointerDown, onKeyNudge }: ResizableDividerProps) {
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onKeyNudge(NUDGE_STEP);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onKeyNudge(-NUDGE_STEP);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={handleKeyDown}
      className="relative w-2 shrink-0 cursor-col-resize select-none hover:bg-graphite/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-graphite" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
        <span className="block w-1 h-1 rounded-full bg-graphite" />
        <span className="block w-1 h-1 rounded-full bg-graphite" />
        <span className="block w-1 h-1 rounded-full bg-graphite" />
      </div>
    </div>
  );
}
