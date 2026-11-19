import { EditorView } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const INK = '#15181F';
const CHALK = '#EDEBE4';
const GRAPHITE = '#4A4E58';
const PASS = '#4C9A6A';
const FAIL = '#C4574A';

export type EditorThemeName =
  | 'ink'
  | 'chalk'
  | 'dracula'
  | 'hack'
  | 'night-owl'
  | 'omni'
  | 'lunar-pink'
  | 'rose-pine-moon'
  | 'tokyo-night'
  | 'nord';

export type EditorFontName =
  | 'ibm-plex-mono'
  | 'jetbrains-mono'
  | 'cascadia-code'
  | 'source-code-pro'
  | 'fira-code'
  | 'hack'
  | 'inconsolata'
  | 'ubuntu-mono'
  | 'system-mono';

export interface EditorThemeOption {
  id: EditorThemeName;
  label: string;
  description: string;
  dark: boolean;
  background: string;
  foreground: string;
  accent: string;
}

export interface EditorFontOption {
  id: EditorFontName;
  label: string;
  stack: string;
}

interface Palette {
  background: string;
  foreground: string;
  gutter: string;
  border: string;
  selection: string;
  activeLine: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
  operator: string;
  type: string;
  variable: string;
  invalid: string;
  dark: boolean;
}

export const EDITOR_THEMES: readonly EditorThemeOption[] = [
  {
    id: 'ink',
    label: 'Ink',
    description: 'CISCODE dark',
    dark: true,
    background: INK,
    foreground: CHALK,
    accent: '#D7D2C8',
  },
  {
    id: 'chalk',
    label: 'Chalk',
    description: 'CISCODE light',
    dark: false,
    background: CHALK,
    foreground: INK,
    accent: '#15181F',
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'violet / neon',
    dark: true,
    background: '#282A36',
    foreground: '#F8F8F2',
    accent: '#FF79C6',
  },
  {
    id: 'hack',
    label: 'Hack',
    description: 'amber terminal',
    dark: true,
    background: '#0B0F14',
    foreground: '#D7DEE8',
    accent: '#FFB100',
  },
  {
    id: 'night-owl',
    label: 'Night Owl',
    description: 'deep blue',
    dark: true,
    background: '#011627',
    foreground: '#D6DEEB',
    accent: '#82AAFF',
  },
  {
    id: 'omni',
    label: 'Omni',
    description: 'purple studio',
    dark: true,
    background: '#191622',
    foreground: '#E2E2E2',
    accent: '#A277FF',
  },
  {
    id: 'lunar-pink',
    label: 'Lunar Pink',
    description: 'midnight rose',
    dark: true,
    background: '#1A0F17',
    foreground: '#F4DCE8',
    accent: '#FF6EA8',
  },
  {
    id: 'rose-pine-moon',
    label: 'Rosé Pine Moon',
    description: 'soft nocturne',
    dark: true,
    background: '#232136',
    foreground: '#E0DEF4',
    accent: '#C4A7E7',
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    description: 'electric night',
    dark: true,
    background: '#1A1B26',
    foreground: '#C0CAF5',
    accent: '#7AA2F7',
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'arctic blue',
    dark: true,
    background: '#2E3440',
    foreground: '#D8DEE9',
    accent: '#88C0D0',
  },
];

export const EDITOR_FONTS: readonly EditorFontOption[] = [
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    stack: '"IBM Plex Mono", monospace',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: '"JetBrains Mono", monospace',
  },
  {
    id: 'cascadia-code',
    label: 'Cascadia Code',
    stack: '"Cascadia Code", "Cascadia Mono", monospace',
  },
  {
    id: 'source-code-pro',
    label: 'Source Code Pro',
    stack: '"Source Code Pro", monospace',
  },
  {
    id: 'fira-code',
    label: 'Fira Code',
    stack: '"Fira Code", monospace',
  },
  {
    id: 'hack',
    label: 'Hack',
    stack: 'Hack, monospace',
  },
  {
    id: 'inconsolata',
    label: 'Inconsolata',
    stack: 'Inconsolata, monospace',
  },
  {
    id: 'ubuntu-mono',
    label: 'Ubuntu Mono',
    stack: '"Ubuntu Mono", monospace',
  },
  {
    id: 'system-mono',
    label: 'System Mono',
    stack:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
];

const PALETTES: Record<EditorThemeName, Palette> = {
  ink: {
    background: INK,
    foreground: CHALK,
    gutter: '#59616C',
    border: GRAPHITE,
    selection: 'rgba(237, 235, 228, 0.15)',
    activeLine: 'rgba(237, 235, 228, 0.045)',
    keyword: '#EDEBE4',
    string: PASS,
    comment: '#737984',
    number: '#EDEBE4',
    function: '#EDEBE4',
    operator: '#9BA0A8',
    type: '#D7D2C8',
    variable: '#D0CEC8',
    invalid: FAIL,
    dark: true,
  },
  chalk: {
    background: CHALK,
    foreground: INK,
    gutter: '#73777E',
    border: '#B6B2AA',
    selection: 'rgba(21, 24, 31, 0.10)',
    activeLine: 'rgba(21, 24, 31, 0.045)',
    keyword: '#15181F',
    string: PASS,
    comment: '#6B6F77',
    number: '#15181F',
    function: '#15181F',
    operator: '#4A4E58',
    type: '#30343B',
    variable: '#24282F',
    invalid: FAIL,
    dark: false,
  },
  dracula: {
    background: '#282A36',
    foreground: '#F8F8F2',
    gutter: '#6272A4',
    border: '#44475A',
    selection: 'rgba(68, 71, 90, 0.70)',
    activeLine: 'rgba(68, 71, 90, 0.34)',
    keyword: '#FF79C6',
    string: '#F1FA8C',
    comment: '#6272A4',
    number: '#BD93F9',
    function: '#50FA7B',
    operator: '#FF79C6',
    type: '#8BE9FD',
    variable: '#F8F8F2',
    invalid: '#FF5555',
    dark: true,
  },
  hack: {
    background: '#0B0F14',
    foreground: '#D7DEE8',
    gutter: '#66717F',
    border: '#2D3743',
    selection: 'rgba(255, 177, 0, 0.18)',
    activeLine: 'rgba(255, 177, 0, 0.055)',
    keyword: '#FFB100',
    string: '#A7D46F',
    comment: '#687484',
    number: '#D8B4FE',
    function: '#8ED0FF',
    operator: '#FFB100',
    type: '#FFCC70',
    variable: '#D7DEE8',
    invalid: '#FF6B5E',
    dark: true,
  },
  'night-owl': {
    background: '#011627',
    foreground: '#D6DEEB',
    gutter: '#4B6475',
    border: '#17324D',
    selection: 'rgba(91, 143, 185, 0.30)',
    activeLine: 'rgba(214, 222, 235, 0.035)',
    keyword: '#C792EA',
    string: '#ECC48D',
    comment: '#637777',
    number: '#F78C6C',
    function: '#82AAFF',
    operator: '#7FDBCA',
    type: '#FFCB8B',
    variable: '#D6DEEB',
    invalid: '#EF5350',
    dark: true,
  },
  omni: {
    background: '#191622',
    foreground: '#E2E2E2',
    gutter: '#6D6A78',
    border: '#302B3B',
    selection: 'rgba(162, 119, 255, 0.18)',
    activeLine: 'rgba(226, 226, 226, 0.035)',
    keyword: '#A277FF',
    string: '#F3CA86',
    comment: '#6D6A78',
    number: '#FFCA85',
    function: '#61E2E2',
    operator: '#A277FF',
    type: '#EFAFDF',
    variable: '#E2E2E2',
    invalid: '#FF6767',
    dark: true,
  },
  'lunar-pink': {
    background: '#1A0F17',
    foreground: '#F4DCE8',
    gutter: '#8E6B7D',
    border: '#3C2634',
    selection: 'rgba(255, 110, 168, 0.17)',
    activeLine: 'rgba(244, 220, 232, 0.035)',
    keyword: '#FF6EA8',
    string: '#F5D0A9',
    comment: '#8E6B7D',
    number: '#C5A3FF',
    function: '#8ED8FF',
    operator: '#FF6EA8',
    type: '#E8A8D1',
    variable: '#F4DCE8',
    invalid: '#FF5C8A',
    dark: true,
  },
  'rose-pine-moon': {
    background: '#232136',
    foreground: '#E0DEF4',
    gutter: '#6E6A86',
    border: '#393552',
    selection: 'rgba(196, 167, 231, 0.18)',
    activeLine: 'rgba(224, 222, 244, 0.035)',
    keyword: '#C4A7E7',
    string: '#F6C177',
    comment: '#6E6A86',
    number: '#9CCFD8',
    function: '#EBBCBA',
    operator: '#C4A7E7',
    type: '#9CCFD8',
    variable: '#E0DEF4',
    invalid: '#EB6F92',
    dark: true,
  },
  'tokyo-night': {
    background: '#1A1B26',
    foreground: '#C0CAF5',
    gutter: '#565F89',
    border: '#292E42',
    selection: 'rgba(122, 162, 247, 0.17)',
    activeLine: 'rgba(192, 202, 245, 0.035)',
    keyword: '#BB9AF7',
    string: '#9ECE6A',
    comment: '#565F89',
    number: '#FF9E64',
    function: '#7AA2F7',
    operator: '#89DDFF',
    type: '#2AC3DE',
    variable: '#C0CAF5',
    invalid: '#F7768E',
    dark: true,
  },
  nord: {
    background: '#2E3440',
    foreground: '#D8DEE9',
    gutter: '#616E88',
    border: '#434C5E',
    selection: 'rgba(136, 192, 208, 0.18)',
    activeLine: 'rgba(216, 222, 233, 0.035)',
    keyword: '#81A1C1',
    string: '#A3BE8C',
    comment: '#616E88',
    number: '#B48EAD',
    function: '#88C0D0',
    operator: '#81A1C1',
    type: '#8FBCBB',
    variable: '#D8DEE9',
    invalid: '#BF616A',
    dark: true,
  },
};

function buildHighlightStyle(palette: Palette) {
  return HighlightStyle.define([
    { tag: t.keyword, color: palette.keyword, fontWeight: '600' },
    {
      tag: [t.string, t.special(t.string)],
      color: palette.string,
    },
    {
      tag: t.comment,
      color: palette.comment,
      fontStyle: 'italic',
    },
    {
      tag: [t.number, t.bool, t.null],
      color: palette.number,
    },
    {
      tag: [
        t.function(t.variableName),
        t.function(t.propertyName),
      ],
      color: palette.function,
      fontWeight: '600',
    },
    {
      tag: [t.typeName, t.className, t.namespace],
      color: palette.type,
    },
    {
      tag: t.variableName,
      color: palette.variable,
    },
    {
      tag: t.operator,
      color: palette.operator,
    },
    {
      tag: t.invalid,
      color: palette.invalid,
    },
  ]);
}

const HIGHLIGHT_STYLES = Object.fromEntries(
  Object.entries(PALETTES).map(([name, palette]) => [
    name,
    buildHighlightStyle(palette),
  ])
) as Record<EditorThemeName, HighlightStyle>;

export function getEditorThemeOption(theme: EditorThemeName) {
  return (
    EDITOR_THEMES.find((option) => option.id === theme) ??
    EDITOR_THEMES[0]
  );
}

export function getEditorFontStack(font: EditorFontName) {
  return (
    EDITOR_FONTS.find((option) => option.id === font)?.stack ??
    EDITOR_FONTS[0].stack
  );
}

export function buildEditorTheme(
  theme: EditorThemeName,
  fontSize: number,
  fontFamily: EditorFontName = 'ibm-plex-mono'
) {
  const palette = PALETTES[theme];
  const fontStack = getEditorFontStack(fontFamily);

  return EditorView.theme(
    {
      '&': {
        backgroundColor: palette.background,
        color: palette.foreground,
        fontSize: `${fontSize}px`,
        height: '100%',
      },
      '.cm-scroller': {
        fontFamily: fontStack,
        overflow: 'auto',
      },
      '.cm-content': {
        fontFamily: fontStack,
        caretColor: palette.foreground,
        padding: '14px 0 28px',
        minHeight: '100%',
      },
      '.cm-line': {
        lineHeight: '1.65',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: palette.foreground,
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: palette.selection,
      },
      '.cm-gutters': {
        backgroundColor: palette.background,
        color: palette.gutter,
        border: 'none',
        borderRight: `1px solid ${palette.border}`,
        minWidth: '48px',
      },
      '.cm-gutterElement': {
        fontFamily: fontStack,
        padding: '0 10px 0 8px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: palette.activeLine,
        color: palette.foreground,
      },
      '.cm-activeLine': {
        backgroundColor: palette.activeLine,
      },
      '.cm-matchingBracket': {
        backgroundColor: palette.selection,
        outline: `1px solid ${palette.border}`,
      },
      '.cm-panels': {
        backgroundColor: palette.background,
        color: palette.foreground,
      },
      '&.cm-focused': {
        outline: 'none',
      },
    },
    { dark: palette.dark }
  );
}

export function buildEditorHighlightStyle(theme: EditorThemeName) {
  return HIGHLIGHT_STYLES[theme];
}

export const ciscodeHighlightStyleDark = HIGHLIGHT_STYLES.ink;
export const ciscodeHighlightStyleLight = HIGHLIGHT_STYLES.chalk;
