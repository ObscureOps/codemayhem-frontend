import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete'
import type { Language } from '../../api/types/problems'

export interface WorkspaceFile {
  name: string
  content: string
}

const C_KEYWORDS = [
  'auto',
  'break',
  'case',
  'char',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extern',
  'float',
  'for',
  'goto',
  'if',
  'inline',
  'int',
  'long',
  'register',
  'restrict',
  'return',
  'short',
  'signed',
  'sizeof',
  'static',
  'struct',
  'switch',
  'typedef',
  'union',
  'unsigned',
  'void',
  'volatile',
  'while',
]

const C_STDLIB = [
  'printf',
  'scanf',
  'fprintf',
  'sprintf',
  'snprintf',
  'strlen',
  'strcpy',
  'strncpy',
  'strcmp',
  'strcat',
  'memcpy',
  'memset',
  'malloc',
  'calloc',
  'realloc',
  'free',
  'fopen',
  'fclose',
  'fread',
  'fwrite',
  'exit',
]

const JAVA_KEYWORDS = [
  'abstract',
  'assert',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extends',
  'final',
  'finally',
  'float',
  'for',
  'if',
  'implements',
  'import',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'try',
  'void',
  'volatile',
  'while',
]

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'TABLE',
  'ALTER',
  'DROP',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'OUTER JOIN',
  'ON',
  'AS',
  'DISTINCT',
  'UNION',
  'AND',
  'OR',
  'NOT',
  'NULL',
  'PRIMARY KEY',
  'FOREIGN KEY',
]

interface WorkspaceSymbols {
  variables: Set<string>
  macros: Set<string>
  structs: Set<string>
  functions: Set<string>
  types: Set<string>
}

function unique(
  values: Iterable<string>
) {
  return [...new Set(values)]
}

function addMatches(
  target: Set<string>,
  content: string,
  expression: RegExp
) {
  for (const match of content.matchAll(
    expression
  )) {
    if (match[1]) {
      target.add(match[1])
    }
  }
}

function identifiersFromWorkspace(
  files: readonly WorkspaceFile[]
): WorkspaceSymbols {
  const variables =
    new Set<string>()

  const macros =
    new Set<string>()

  const structs =
    new Set<string>()

  const functions =
    new Set<string>()

  const types =
    new Set<string>()

  for (const file of files) {
    const content = file.content

    addMatches(
      macros,
      content,
      /^\s*#\s*define\s+([A-Za-z_][A-Za-z0-9_]*)/gm
    )

    addMatches(
      structs,
      content,
      /\bstruct\s+([A-Za-z_][A-Za-z0-9_]*)/g
    )

    addMatches(
      types,
      content,
      /\btypedef\s+(?:struct\s+[A-Za-z_][A-Za-z0-9_]*\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*;/g
    )

    addMatches(
      functions,
      content,
      /\b(?:[A-Za-z_][A-Za-z0-9_]*\s+)+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;{}]*\)\s*(?:\{|;)/g
    )

    addMatches(
      variables,
      content,
      /\b(?:const\s+|static\s+|extern\s+|unsigned\s+|signed\s+|long\s+|short\s+)*(?:void|char|short|int|long|float|double|size_t|bool|struct\s+[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)\s+\*?\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|;|,|\[)/g
    )
  }

  return {
    variables,
    macros,
    structs,
    functions,
    types,
  }
}

function cCompletions(
  files: readonly WorkspaceFile[]
): Completion[] {
  const workspace =
    identifiersFromWorkspace(files)

  return [
    ...C_KEYWORDS.map(
      (label) => ({
        label,
        type: 'keyword' as const,
      })
    ),

    ...C_STDLIB.map(
      (label) => ({
        label,
        type: 'function' as const,
      })
    ),

    ...unique(
      workspace.macros
    ).map((label) => ({
      label,
      type: 'constant' as const,
      detail: 'macro · workspace',
    })),

    ...unique(
      workspace.structs
    ).map((label) => ({
      label,
      type: 'type' as const,
      detail: 'struct · workspace',
    })),

    ...unique(
      workspace.types
    ).map((label) => ({
      label,
      type: 'type' as const,
      detail: 'typedef · workspace',
    })),

    ...unique(
      workspace.functions
    ).map((label) => ({
      label,
      type: 'function' as const,
      detail: 'function · workspace',
    })),

    ...unique(
      workspace.variables
    ).map((label) => ({
      label,
      type: 'variable' as const,
      detail: 'variable · workspace',
    })),
  ]
}

function javaCompletions(
  files: readonly WorkspaceFile[]
): Completion[] {
  const workspace =
    identifiersFromWorkspace(files)

  return [
    ...JAVA_KEYWORDS.map(
      (label) => ({
        label,
        type: 'keyword' as const,
      })
    ),

    ...unique([
      ...workspace.variables,
      ...workspace.functions,
      ...workspace.types,
    ])
      .filter(
        (label) =>
          !JAVA_KEYWORDS.includes(
            label
          )
      )
      .map((label) => ({
        label,
        type: 'variable' as const,
        detail: 'symbol · workspace',
      })),
  ]
}

function sqlCompletions(
  files: readonly WorkspaceFile[]
): Completion[] {
  const workspace =
    identifiersFromWorkspace(files)

  return [
    ...SQL_KEYWORDS.map(
      (label) => ({
        label,
        type: 'keyword' as const,
      })
    ),

    ...unique([
      ...workspace.variables,
      ...workspace.functions,
      ...workspace.types,
    ]).map((label) => ({
      label,
      type: 'variable' as const,
      detail: 'identifier · workspace',
    })),
  ]
}

export function createEditorCompletionSource(
  language: Language,
  workspaceFiles: readonly WorkspaceFile[] = []
) {
  return (
    context: CompletionContext
  ): CompletionResult | null => {
    const word =
      context.matchBefore(
        /[A-Za-z_][A-Za-z0-9_]*/
      )

    if (
      !word &&
      !context.explicit
    ) {
      return null
    }

    const from =
      word?.from ?? context.pos

    const options =
      language === 'c'
        ? cCompletions(
            workspaceFiles
          )
        : language === 'java'
          ? javaCompletions(
              workspaceFiles
            )
          : sqlCompletions(
              workspaceFiles
            )

    return {
      from,
      options,
      validFor:
        /[A-Za-z_][A-Za-z0-9_]*/,
    }
  }
}
