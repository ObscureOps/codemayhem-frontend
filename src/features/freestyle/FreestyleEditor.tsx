import { useEffect, useRef } from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
  insertTab,
} from '@codemirror/commands'
import {
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language'
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { sql } from '@codemirror/lang-sql'
import type { Language } from '../../api/types/problems'
import {
  buildEditorHighlightStyle,
  buildEditorTheme,
  type EditorFontName,
  type EditorThemeName,
} from './editorTheme'
import {
  createEditorCompletionSource,
  type WorkspaceFile,
} from './editorCompletions'

function languageExtension(language: Language) {
  switch (language) {
    case 'c':
      return cpp()
    case 'java':
      return java()
    case 'sql':
      return sql()
  }
}

function buildThemeExtensions(
  theme: EditorThemeName,
  fontSize: number,
  fontFamily: EditorFontName
) {
  return [
    buildEditorTheme(theme, fontSize, fontFamily),
    syntaxHighlighting(buildEditorHighlightStyle(theme)),
  ]
}

function smartTab(view: EditorView): boolean {
  const { state, dispatch } = view

  if (
    state.selection.ranges.some(
      (range) => !range.empty
    )
  ) {
    return indentMore({ state, dispatch })
  }

  const range = state.selection.main
  const line = state.doc.lineAt(range.from)
  const beforeCursor = state.doc.sliceString(
    line.from,
    range.from
  )

  if (/^\s*$/.test(beforeCursor)) {
    return indentMore({ state, dispatch })
  }

  return insertTab({ state, dispatch })
}

function smartShiftTab(view: EditorView): boolean {
  const { state, dispatch } = view
  return indentLess({ state, dispatch })
}

const C_FUNCTION_PATTERN = /(?:^|[;{}\n]\s*)(?:(?:static|extern|inline|const|volatile|unsigned|signed|long|short|void|char|int|float|double|_Bool|size_t|struct\s+[A-Za-z_]\w*|enum\s+[A-Za-z_]\w*|union\s+[A-Za-z_]\w*|[A-Za-z_]\w*)\s+)+\**\s*([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:\{|;)/g

function extractCFunctionNames(
  workspaceFiles: readonly WorkspaceFile[]
): string[] {
  const names = new Set<string>()

  for (const file of workspaceFiles) {
    for (const match of file.content.matchAll(C_FUNCTION_PATTERN)) {
      const name = match[1]
      if (name) {
        names.add(name)
      }
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right))
}

function createCFunctionCompletionSource(
  workspaceFiles: readonly WorkspaceFile[]
) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[A-Za-z_]\w*/)

    if (!word && !context.explicit) {
      return null
    }

    const from = word?.from ?? context.pos
    const typed = word?.text.toLowerCase() ?? ''
    const functions = extractCFunctionNames(workspaceFiles)

    const options = functions
      .filter((name) =>
        typed.length === 0 || name.toLowerCase().startsWith(typed)
      )
      .map((name) => ({
        label: `${name}()`,
        type: 'function',
        apply: `${name}()`,
        boost: 100,
      }))

    if (options.length === 0) {
      return null
    }

    return {
      from,
      options,
      validFor: /^[A-Za-z_]\w*$/,
    }
  }
}

interface CodeEditorProps {
  language: Language
  value: string
  onChange: (value: string) => void
  theme: EditorThemeName
  fontSize: number
  fontFamily?: EditorFontName
  wordWrap: boolean
  workspaceFiles?: readonly WorkspaceFile[]
  editorKey: string
}

export function CodeEditor({
  language,
  value,
  onChange,
  theme,
  fontSize,
  fontFamily = 'ibm-plex-mono',
  wordWrap,
  workspaceFiles = [],
  editorKey,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const compartmentsRef = useRef<{
    theme: Compartment
    wordWrap: Compartment
  } | null>(null)

  const onChangeRef = useRef(onChange)

  const completionSourceRef = useRef(
    createEditorCompletionSource(
      language,
      workspaceFiles
    )
  )

  const functionCompletionSourceRef = useRef(
    createCFunctionCompletionSource(workspaceFiles)
  )

  onChangeRef.current = onChange

  completionSourceRef.current =
    createEditorCompletionSource(
      language,
      workspaceFiles
    )

  functionCompletionSourceRef.current =
    createCFunctionCompletionSource(workspaceFiles)

  useEffect(() => {
    if (!hostRef.current) return

    const themeCompartment = new Compartment()
    const wordWrapCompartment = new Compartment()

    compartmentsRef.current = {
      theme: themeCompartment,
      wordWrap: wordWrapCompartment,
    }

    const completionSource = (
      context: Parameters<
        ReturnType<
          typeof createEditorCompletionSource
        >
      >[0]
    ) =>
      completionSourceRef.current(context)

    const functionCompletionSource = (
      context: CompletionContext
    ) =>
      language === 'c'
        ? functionCompletionSourceRef.current(context)
        : null

    const state = EditorState.create({
      doc: value,

      extensions: [
        lineNumbers(),
        history(),

        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap,
        ]),

        keymap.of([
          {
            key: 'Tab',
            preventDefault: true,
            run: smartTab,
          },
          {
            key: 'Shift-Tab',
            preventDefault: true,
            run: smartShiftTab,
          },
        ]),

        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightActiveLineGutter(),

        languageExtension(language),

        autocompletion({
          override: [
            completionSource,
            functionCompletionSource,
          ],
          activateOnTyping: true,
          maxRenderedOptions: 80,
          closeOnBlur: true,
        }),

        themeCompartment.of(
          buildThemeExtensions(
            theme,
            fontSize,
            fontFamily
          )
        ),

        wordWrapCompartment.of(
          wordWrap
            ? EditorView.lineWrapping
            : []
        ),

        EditorView.updateListener.of(
          (update) => {
            if (update.docChanged) {
              onChangeRef.current(
                update.state.doc.toString()
              )
            }
          }
        ),
      ],
    })

    const view = new EditorView({
      state,
      parent: hostRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
      compartmentsRef.current = null
    }

    // The document itself is intentionally keyed by
    // editorKey/language. Settings and workspace
    // completions update live without resetting the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey, language])

  useEffect(() => {
    const compartments =
      compartmentsRef.current

    if (!compartments || !viewRef.current) {
      return
    }

    viewRef.current.dispatch({
      effects:
        compartments.theme.reconfigure(
          buildThemeExtensions(
            theme,
            fontSize,
            fontFamily
          )
        ),
    })
  }, [
    theme,
    fontSize,
    fontFamily,
  ])

  useEffect(() => {
    const compartments =
      compartmentsRef.current

    if (!compartments || !viewRef.current) {
      return
    }

    viewRef.current.dispatch({
      effects:
        compartments.wordWrap.reconfigure(
          wordWrap
            ? EditorView.lineWrapping
            : []
        ),
    })
  }, [wordWrap])

  return (
    <div
      ref={hostRef}
      className="h-full min-h-0 overflow-hidden"
      role="textbox"
      aria-label="Code editor"
      aria-multiline="true"
    />
  )
}
