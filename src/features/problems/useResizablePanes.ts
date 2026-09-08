
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface PaneConfig {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}

interface UseResizablePanesOptions {
  left: PaneConfig;
  right: PaneConfig;
  centerMinWidth: number;
  dividerWidth?: number;
}

// Plain useState, not a reducer — per the Milestone 4 spec, this is
// layout interaction, not an async operation. Session-only state, no
// persistence across reloads (also per spec for this sub-milestone).
export function useResizablePanes({
  left,
  right,
  centerMinWidth,
  dividerWidth = 8,
}: UseResizablePanesOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [leftWidth, setLeftWidth] = useState(left.defaultWidth);
  const [rightWidth, setRightWidth] = useState(right.defaultWidth);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeDividers = (leftCollapsed ? 0 : 1) + (rightCollapsed ? 0 : 1);

  // Clamp a candidate left width to [minWidth, maxWidth], and additionally
  // never let it grow past the point where the center pane would drop
  // below centerMinWidth. Before the first ResizeObserver tick
  // (containerWidth === 0) we only apply the pane's own min/max — this
  // avoids a flash where the pane snaps to its floor before layout settles.
  const clampLeft = useCallback(
    (candidate: number) => {
      const floor = left.minWidth;
      if (containerWidth === 0) {
        return Math.min(Math.max(candidate, floor), left.maxWidth);
      }
      const effectiveRight = rightCollapsed ? 0 : rightWidth;
      const ceilingForCenter =
        containerWidth - effectiveRight - centerMinWidth - activeDividers * dividerWidth;
      const ceiling = Math.min(left.maxWidth, Math.max(floor, ceilingForCenter));
      return Math.min(Math.max(candidate, floor), ceiling);
    },
    [containerWidth, rightCollapsed, rightWidth, centerMinWidth, activeDividers, dividerWidth, left.maxWidth, left.minWidth]
  );

  const clampRight = useCallback(
    (candidate: number) => {
      const floor = right.minWidth;
      if (containerWidth === 0) {
        return Math.min(Math.max(candidate, floor), right.maxWidth);
      }
      const effectiveLeft = leftCollapsed ? 0 : leftWidth;
      const ceilingForCenter =
        containerWidth - effectiveLeft - centerMinWidth - activeDividers * dividerWidth;
      const ceiling = Math.min(right.maxWidth, Math.max(floor, ceilingForCenter));
      return Math.min(Math.max(candidate, floor), ceiling);
    },
    [containerWidth, leftCollapsed, leftWidth, centerMinWidth, activeDividers, dividerWidth, right.maxWidth, right.minWidth]
  );

  const startDrag = useCallback(
    (pane: 'left' | 'right') => (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = pane === 'left' ? leftWidth : rightWidth;
      // Dragging right grows the left pane but shrinks the right pane —
      // opposite signs since they sit on opposite sides of the center.
      const sign = pane === 'left' ? 1 : -1;
      const setWidth = pane === 'left' ? setLeftWidth : setRightWidth;
      const clamp = pane === 'left' ? clampLeft : clampRight;

      const onMove = (moveEvent: PointerEvent) => {
        const delta = (moveEvent.clientX - startX) * sign;
        setWidth(clamp(startWidth + delta));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [leftWidth, rightWidth, clampLeft, clampRight]
  );

  // Keyboard equivalent of dragging — arrow keys nudge by a fixed step.
  // Callers pass the delta already sign-adjusted for which divider it is.
  const nudgeLeft = useCallback(
    (delta: number) => setLeftWidth((w) => clampLeft(w + delta)),
    [clampLeft]
  );
  const nudgeRight = useCallback(
    (delta: number) => setRightWidth((w) => clampRight(w + delta)),
    [clampRight]
  );

  return {
    containerRef,
    leftWidth,
    rightWidth,
    leftCollapsed,
    rightCollapsed,
    toggleLeft: () => setLeftCollapsed((c) => !c),
    toggleRight: () => setRightCollapsed((c) => !c),
    onDragLeft: startDrag('left'),
    onDragRight: startDrag('right'),
    nudgeLeft,
    nudgeRight,
  };
}
