
import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import type { EditorThemeName } from './editorTheme';

interface EditorSettingsPopoverProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  wordWrap: boolean;
  onWordWrapChange: (wrap: boolean) => void;
  theme: EditorThemeName;
  onThemeChange: (theme: EditorThemeName) => void;
}

const FONT_SIZES = [12, 14, 16, 18];

// Settings are frontend-only editor preferences — plain useState, session
// only, no persistence, no CONTRACT.md entry (nothing backend-facing
// here). Font family stays locked to IBM Plex Mono regardless of these
// settings — that's a design-token boundary, not a user preference, per
// the Milestone 4 spec.
export function EditorSettingsPopover({
  fontSize,
  onFontSizeChange,
  wordWrap,
  onWordWrapChange,
  theme,
  onThemeChange,
}: EditorSettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Editor settings"
        aria-expanded={open}
        className="text-graphite hover:text-chalk p-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-ink border border-graphite p-4 font-mono text-sm text-chalk">
          <div className="mb-4">
            <p className="text-xs text-graphite mb-1.5">theme</p>
            <div className="flex border border-graphite">
              {(['ink', 'chalk'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onThemeChange(t)}
                  aria-pressed={theme === t}
                  className={`flex-1 py-1.5 capitalize focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal ${
                    theme === t ? 'bg-chalk text-ink' : 'text-graphite hover:text-chalk'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-graphite mb-1.5">font size</p>
            <div className="flex border border-graphite">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => onFontSizeChange(size)}
                  aria-pressed={fontSize === size}
                  className={`flex-1 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal ${
                    fontSize === size ? 'bg-chalk text-ink' : 'text-graphite hover:text-chalk'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-graphite">word-wrap</span>
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={(e) => onWordWrapChange(e.target.checked)}
              className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
            />
          </label>
        </div>
      )}
    </div>
  );
}
