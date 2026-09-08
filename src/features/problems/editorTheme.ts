import { EditorView } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Custom CodeMirror 6 themes built from CISCODE's own design tokens.
// Deliberately not a default third-party theme — per the master prompt's
// re-skin rule. Two variants: "ink" (dark, default) and "chalk" (light) —
// both built from the exact same token set, nothing new introduced.
// `signal` is intentionally NOT used in either — it's reserved for
// SubmissionPanel, this screen's one signature element.
const INK = '#15181F';
const CHALK = '#EDEBE4';
const GRAPHITE = '#4A4E58';
const PASS = '#4C9A6A';
const FAIL = '#C4574A';

export type EditorThemeName = 'ink' | 'chalk';

export function buildEditorTheme(theme: EditorThemeName, fontSize: number) {
  const bg = theme === 'ink' ? INK : CHALK;
  const fg = theme === 'ink' ? CHALK : INK;
  const selection = theme === 'ink' ? 'rgba(237, 235, 228, 0.15)' : 'rgba(21, 24, 31, 0.10)';
  const activeLine = theme === 'ink' ? 'rgba(237, 235, 228, 0.04)' : 'rgba(21, 24, 31, 0.04)';

  return EditorView.theme(
    {
      '&': {
        backgroundColor: bg,
        color: fg,
        fontSize: `${fontSize}px`,
        height: '100%',
      },
      '.cm-content': {
        fontFamily: '"IBM Plex Mono", monospace',
        caretColor: fg,
        padding: '12px 0',
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: fg },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: selection,
      },
      '.cm-gutters': {
        backgroundColor: bg,
        color: GRAPHITE,
        border: 'none',
        borderRight: `1px solid ${GRAPHITE}`,
      },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: fg },
      '.cm-activeLine': { backgroundColor: activeLine },
      '&.cm-focused': { outline: 'none' },
    },
    { dark: theme === 'ink' }
  );
}

export const ciscodeHighlightStyleDark = HighlightStyle.define([
  { tag: t.keyword, color: CHALK, fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: PASS },
  { tag: t.comment, color: GRAPHITE, fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.null], color: CHALK },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: CHALK, fontWeight: '600' },
  { tag: t.operator, color: GRAPHITE },
  { tag: t.invalid, color: FAIL },
]);

export const ciscodeHighlightStyleLight = HighlightStyle.define([
  { tag: t.keyword, color: INK, fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: PASS },
  { tag: t.comment, color: GRAPHITE, fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.null], color: INK },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: INK, fontWeight: '600' },
  { tag: t.operator, color: GRAPHITE },
  { tag: t.invalid, color: FAIL },
]);
