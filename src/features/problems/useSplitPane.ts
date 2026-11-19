import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface Options {
  axis: 'x' | 'y';
  // 'start' = the sized pane is first (left/top), 'end' = last (right/bottom).
  side: 'start' | 'end';
  defaultSize: number;
  min: number;
  max: number;
  // Space that must stay free for the other pane.
  reserve: number;
}

export function useSplitPane({ axis, side, defaultSize, min, max, reserve }: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(0);
  const [size, setSize] = useState(defaultSize);
  const sign = side === 'start' ? 1 : -1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setContainerSize(axis === 'x' ? rect.width : rect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [axis]);

  const clamp = useCallback(
    (value: number) => {
      const ceiling =
        containerSize > 0 ? Math.min(max, Math.max(min, containerSize - reserve)) : max;
      return Math.min(Math.max(value, min), ceiling);
    },
    [containerSize, max, min, reserve],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      const start = axis === 'x' ? event.clientX : event.clientY;
      const startSize = size;

      const onMove = (move: PointerEvent) => {
        const pos = axis === 'x' ? move.clientX : move.clientY;
        setSize(clamp(startSize + (pos - start) * sign));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [axis, clamp, sign, size],
  );

  // Positive delta always grows the sized pane.
  const nudge = useCallback((delta: number) => setSize((s) => clamp(s + delta)), [clamp]);

  return { containerRef, size, onPointerDown, nudge };
}
