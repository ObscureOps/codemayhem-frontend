import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, bracketMatching, syntaxHighlighting } from '@codemirror/language';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { sql } from '@codemirror/lang-sql';
import type { Language } from '../../api/types/problems';
import {
  buildEditorTheme,
  ciscodeHighlightStyleDark,
  ciscodeHighlightStyleLight,
  type EditorThemeName,
} from './editorTheme';

function languageExtension(language: Language) {
  switch (language) {
    case 'c':
      return cpp(); // C is close enough to the C++ grammar for our purposes
    case 'java':
      return java();
    case 'sql':
      return sql();
  }
}

function buildThemeExtensions(theme: EditorThemeName, fontSize: number) {
  return [
    buildEditorTheme(theme, fontSize),
    syntaxHighlighting(theme === 'ink' ? ciscodeHighlightStyleDark : ciscodeHighlightStyleLight),
  ];
}

const themeCompartment = new Compartment();
const wordWrapCompartment = new Compartment();

interface CodeEditorProps {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  theme: EditorThemeName;
  fontSize: number;
  wordWrap: boolean;
  // Changing this forces a full remount (new document) — used when
  // switching between multi-file tabs or language/variant, where we
  // intentionally don't try to preserve cursor/undo across a document
  // swap. Theme/fontSize/wordWrap do NOT trigger a remount — they
  // reconfigure live via compartments below, so a settings change never
  // costs the user their cursor position or undo history.
  editorKey: string;
}

export function CodeEditor({ language, value, onChange, theme, fontSize, wordWrap, editorKey }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        indentOnInput(),
        bracketMatching(),
        languageExtension(language),
        themeCompartment.of(buildThemeExtensions(theme, fontSize)),
        wordWrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey, language]);

  // Live-reconfigure theme + font size without remounting.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.reconfigure(buildThemeExtensions(theme, fontSize)),
    });
  }, [theme, fontSize]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: wordWrapCompartment.reconfigure(wordWrap ? EditorView.lineWrapping : []),
    });
  }, [wordWrap]);

  return (
    <div
      ref={hostRef}
      className="h-full overflow-auto"
      role="textbox"
      aria-label="Code editor"
      aria-multiline="true"
    />
  );
}
