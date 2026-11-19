import { useEffect, useRef, useState } from 'react';
import {
  EDITOR_FONTS,
  EDITOR_THEMES,
  type EditorFontName,
  type EditorThemeName,
} from '../problems/editorTheme';

interface FreestyleEditorSettingsProps {
  theme: EditorThemeName;
  onThemeChange: (theme: EditorThemeName) => void;
  fontFamily: EditorFontName;
  onFontFamilyChange: (
    font: EditorFontName
  ) => void;
  fontSize: number;
  onFontSizeChange: (fontSize: number) => void;
  wordWrap: boolean;
  onWordWrapChange: (enabled: boolean) => void;
}

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;
const FONT_SIZE_STEP = 1;

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="m19.1 13.6 1.2.9-1.8 3.1-1.4-.5a8 8 0 0 1-1.8 1l-.2 1.5h-3.6l-.2-1.5a8 8 0 0 1-1.8-1l-1.4.5-1.8-3.1 1.2-.9a7.7 7.7 0 0 1 0-2.1l-1.2-.9 1.8-3.1 1.4.5a8 8 0 0 1 1.8-1l.2-1.5h3.6l.2 1.5a8 8 0 0 1 1.8 1l1.4-.5 1.8 3.1-1.2.9a7.7 7.7 0 0 1 0 2.1Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
    >
      <path
        d="M6 12h12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
    >
      <path
        d="M12 6v12M6 12h12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
    >
      <path
        d="m6.5 12.5 3.3 3.2 7.7-7.7"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function FreestyleEditorSettings({
  theme,
  onThemeChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  wordWrap,
  onWordWrapChange,
}: FreestyleEditorSettingsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (
      event: PointerEvent
    ) => {
      if (
        !rootRef.current?.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener(
      'pointerdown',
      handlePointerDown
    );

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown
      );

      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [open]);

  const selectedTheme =
    EDITOR_THEMES.find(
      (item) => item.id === theme
    ) ?? EDITOR_THEMES[0];

  const selectedFont =
    EDITOR_FONTS.find(
      (item) => item.id === fontFamily
    ) ?? EDITOR_FONTS[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Editor settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() =>
          setOpen((current) => !current)
        }
        className={`flex h-9 items-center gap-2 border px-3 font-mono text-[8px] uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1 ${
          open
            ? 'border-[#65707d] bg-white/[0.045] text-[#e4e1d9]'
            : 'border-[#3b4652] bg-[#080c12] text-[#707a86] hover:border-[#56616d] hover:text-[#d8d5ce]'
        }`}
      >
        <SettingsIcon />
        <span className="hidden sm:inline">
          Editor
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Editor settings"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(360px,calc(100vw-24px))] border border-[#3a4551] bg-[#0b1016] text-[#ddd9d0] shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
        >
          <div className="border-b border-[#303945] bg-[#0d131a] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-[11px] font-medium">
                  Editor settings
                </p>

                <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-[#59636e]">
                  live · document state preserved
                </p>
              </div>

              <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#69727d]">
                {selectedTheme.label}
              </span>
            </div>
          </div>

          <div className="space-y-5 p-4">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <label className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#6f7985]">
                  Theme
                </label>

                <span className="font-mono text-[7px] text-[#4e5864]">
                  {selectedTheme.description}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {EDITOR_THEMES.map((item) => {
                  const active = item.id === theme;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onThemeChange(item.id)
                      }
                      aria-pressed={active}
                      className={`group flex min-h-[50px] items-center gap-2 border px-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1 ${
                        active
                          ? 'border-[#69737f] bg-white/[0.055]'
                          : 'border-[#303945] bg-[#080c11] hover:border-[#505b67] hover:bg-white/[0.025]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 shrink-0 items-center justify-center border border-white/10"
                        style={{
                          backgroundColor:
                            item.background,
                        }}
                      >
                        <span
                          className="h-2 w-2"
                          style={{
                            backgroundColor:
                              item.accent,
                          }}
                        />
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[8px] uppercase tracking-[0.04em] text-[#c9c6bf]">
                          {item.label}
                        </span>

                        <span className="mt-0.5 block truncate font-mono text-[6px] uppercase tracking-[0.08em] text-[#555f6a]">
                          {item.description}
                        </span>
                      </span>

                      {active && (
                        <span className="ml-auto shrink-0 text-signal">
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <label
                htmlFor="freestyle-font-family"
                className="mb-2 block font-mono text-[8px] uppercase tracking-[0.13em] text-[#6f7985]"
              >
                Font
              </label>

              <select
                id="freestyle-font-family"
                value={fontFamily}
                onChange={(event) =>
                  onFontFamilyChange(
                    event.target.value as EditorFontName
                  )
                }
                className="h-10 w-full border border-[#38424d] bg-[#080c11] px-3 font-mono text-[9px] text-[#d5d2ca] outline-none focus:border-signal/70 focus:ring-1 focus:ring-signal/30"
              >
                {EDITOR_FONTS.map((font) => (
                  <option
                    key={font.id}
                    value={font.id}
                  >
                    {font.label}
                  </option>
                ))}
              </select>

              <p className="mt-1.5 font-mono text-[7px] text-[#4f5964]">
                {selectedFont.label} · uses the installed
                system font when available
              </p>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#6f7985]">
                  Font size
                </span>

                <span className="font-mono text-[9px] tabular-nums text-[#d5d2ca]">
                  {fontSize}px
                </span>
              </div>

              <div className="flex items-center border border-[#38424d] bg-[#080c11]">
                <button
                  type="button"
                  aria-label="Decrease font size"
                  disabled={fontSize <= MIN_FONT_SIZE}
                  onClick={() =>
                    onFontSizeChange(
                      Math.max(
                        MIN_FONT_SIZE,
                        fontSize - FONT_SIZE_STEP
                      )
                    )
                  }
                  className="flex h-9 w-10 items-center justify-center border-r border-[#303945] text-[#77818c] hover:bg-white/[0.03] hover:text-[#e4e1d9] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-inset"
                >
                  <MinusIcon />
                </button>

                <div className="flex-1 text-center font-mono text-[9px] text-[#bdb9b0]">
                  {fontSize}
                </div>

                <button
                  type="button"
                  aria-label="Increase font size"
                  disabled={fontSize >= MAX_FONT_SIZE}
                  onClick={() =>
                    onFontSizeChange(
                      Math.min(
                        MAX_FONT_SIZE,
                        fontSize + FONT_SIZE_STEP
                      )
                    )
                  }
                  className="flex h-9 w-10 items-center justify-center border-l border-[#303945] text-[#77818c] hover:bg-white/[0.03] hover:text-[#e4e1d9] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-inset"
                >
                  <PlusIcon />
                </button>
              </div>

              <input
                aria-label="Font size"
                type="range"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={fontSize}
                onChange={(event) =>
                  onFontSizeChange(
                    Number(event.target.value)
                  )
                }
                className="mt-2 w-full accent-signal"
              />
            </section>

            <label className="flex cursor-pointer items-center justify-between border-t border-[#303945] pt-4">
              <span>
                <span className="block font-mono text-[8px] uppercase tracking-[0.13em] text-[#6f7985]">
                  Word wrap
                </span>

                <span className="mt-1 block font-mono text-[7px] text-[#4f5964]">
                  Wrap long lines inside the editor.
                </span>
              </span>

              <span className="relative ml-4 shrink-0">
                <input
                  type="checkbox"
                  checked={wordWrap}
                  onChange={(event) =>
                    onWordWrapChange(
                      event.target.checked
                    )
                  }
                  className="peer sr-only"
                />

                <span
                  className={`flex h-5 w-9 items-center border p-[2px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-signal peer-focus-visible:outline-offset-2 ${
                    wordWrap
                      ? 'border-signal/70 bg-signal/[0.05]'
                      : 'border-[#4b5662] bg-[#080c11]'
                  }`}
                >
                  <span
                    className={`h-3.5 w-3.5 transition-transform ${
                      wordWrap
                        ? 'translate-x-4 bg-signal'
                        : 'translate-x-0 bg-[#606a75]'
                    }`}
                  />
                </span>
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
