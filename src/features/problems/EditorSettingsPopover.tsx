import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import {
  EDITOR_FONTS,
  EDITOR_THEMES,
  type EditorFontName,
  type EditorThemeName,
} from './editorTheme';

interface EditorSettingsPopoverProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  wordWrap: boolean;
  onWordWrapChange: (wrap: boolean) => void;
  theme: EditorThemeName;
  onThemeChange: (theme: EditorThemeName) => void;
  fontFamily: EditorFontName;
  onFontFamilyChange: (font: EditorFontName) => void;
}

const FONT_SIZES = [12, 14, 16, 18];

const selectClass =
  'w-full border border-graphite bg-ink px-2 py-1.5 text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal';

export function EditorSettingsPopover({
  fontSize,
  onFontSizeChange,
  wordWrap,
  onWordWrapChange,
  theme,
  onThemeChange,
  fontFamily,
  onFontFamilyChange,
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
        className="p-1.5 text-graphite hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 space-y-4 border border-graphite bg-ink p-4 font-mono text-sm text-chalk">
          <label className="block">
            <span className="mb-1.5 block text-xs text-graphite">theme</span>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as EditorThemeName)}
              className={selectClass}
            >
              {EDITOR_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.description})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-graphite">font</span>
            <select
              value={fontFamily}
              onChange={(e) => onFontFamilyChange(e.target.value as EditorFontName)}
              className={selectClass}
            >
              {EDITOR_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-1.5 text-xs text-graphite">font size</p>
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

          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-graphite">word-wrap</span>
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={(e) => onWordWrapChange(e.target.checked)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
