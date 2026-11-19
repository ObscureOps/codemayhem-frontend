import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

interface ResizableDividerProps {
  ariaLabel: string;
  onPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
  onKeyNudge: (deltaPx: number) => void;
  onDoubleClick?: () => void;
}

const NUDGE_STEP = 16;

export function ResizableDivider({
  ariaLabel,
  onPointerDown,
  onKeyNudge,
  onDoubleClick,
}: ResizableDividerProps) {
  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onKeyNudge(NUDGE_STEP);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
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
      onDoubleClick={onDoubleClick}
      className="relative w-2 shrink-0 cursor-col-resize select-none touch-none hover:bg-graphite/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-graphite" />

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1">
        <span className="block h-1 w-1 rounded-full bg-graphite" />
        <span className="block h-1 w-1 rounded-full bg-graphite" />
        <span className="block h-1 w-1 rounded-full bg-graphite" />
      </div>
    </div>
  );
}
