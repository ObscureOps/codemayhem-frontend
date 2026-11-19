import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  ChangeEvent as ReactChangeEvent,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useMultiFileEditor } from '../features/problems/useMultiFileEditor'
import { CodeEditor } from '../features/problems/CodeEditor'
import { ResizableDivider } from '../features/problems/ResizableDivider'
import {
  EDITOR_FONTS,
  EDITOR_THEMES,
  type EditorFontName,
  type EditorThemeName,
} from '../features/problems/editorTheme'
import type { WorkspaceFile } from '../features/problems/editorCompletions'
import { FreestyleEditorSettings } from '../features/freestyle/FreestyleEditorSettings'
import { useFreestyleRun } from '../features/freestyle/useFreestyleRun'
import { parseSqlOutput } from '../api/types/freestyle'
import type {
  FreestyleLanguage,
  GCCRequest,
  JavaRequest,
  SQLite3tmpRequest,
  SqlStatementResult,
} from '../api/types/freestyle'

const DEFAULT_C_CODE = `#include <stdio.h>

int main(void) {
  printf("hello, world\\n");
  return 0;
}
`

const DEFAULT_JAVA_CODE = `public class Main {
  public static void main(String[] args) {
    System.out.println("hello, world");
  }
}
`

const DEFAULT_SQL_CODE = `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO users (name) VALUES ('ada'), ('grace');
SELECT * FROM users;
`

const JAVA_ENTRY_FILENAME = 'Main.java'
const DEFAULT_THEME: EditorThemeName = 'ink'
const DEFAULT_FONT: EditorFontName = 'ibm-plex-mono'
const DEFAULT_FONT_SIZE = 14
const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 20
const MIN_OUTPUT_WIDTH = 300
const DEFAULT_OUTPUT_WIDTH = 430
const MAX_OUTPUT_FRACTION = 0.58
const MIN_SPLIT_RATIO = 30
const MAX_SPLIT_RATIO = 70

type Pane = 'left' | 'right'
type ContextMenuKind = 'folder' | 'file'

interface CFolder {
  id: string
  name: string
  fileNames: string[]
  collapsed: boolean
}

interface ContextMenuState {
  kind: ContextMenuKind
  id: string
  name: string
  x: number
  y: number
}

interface DeleteTarget {
  kind: ContextMenuKind
  id: string
  name: string
}

const DEFAULT_C_FOLDER: CFolder = {
  id: 'main-folder',
  name: 'main',
  fileNames: ['main.c'],
  collapsed: false,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type DroppedEntry = {
  isFile: boolean
  isDirectory: boolean
  file?: (callback: (file: File) => void, onError?: () => void) => void
  createReader?: () => {
    readEntries: (callback: (entries: DroppedEntry[]) => void, onError?: () => void) => void
  }
}

async function readDroppedEntry(entry: DroppedEntry): Promise<File[]> {
  if (entry.isFile && entry.file) {
    return new Promise((resolve) => {
      entry.file?.((file) => resolve([file]), () => resolve([]))
    })
  }

  if (!entry.isDirectory || !entry.createReader) {
    return []
  }

  const reader = entry.createReader()
  const files: File[] = []

  while (true) {
    const batch = await new Promise<DroppedEntry[]>((resolve) => {
      reader.readEntries(resolve, () => resolve([]))
    })

    if (batch.length === 0) {
      break
    }

    const nested = await Promise.all(batch.map(readDroppedEntry))
    for (const group of nested) {
      files.push(...group)
    }
  }

  return files
}

async function filesFromDrop(event: ReactDragEvent<HTMLDivElement>): Promise<File[]> {
  const entryFiles: File[] = []

  for (const item of Array.from(event.dataTransfer.items)) {
    const candidate = item as DataTransferItem & {
      webkitGetAsEntry?: () => DroppedEntry | null
    }
    const entry = candidate.webkitGetAsEntry?.()

    if (entry) {
      entryFiles.push(...(await readDroppedEntry(entry)))
    }
  }

  return entryFiles.length > 0
    ? entryFiles
    : Array.from(event.dataTransfer.files)
}

function Icon({
  name,
  className = 'h-4 w-4',
}: {
  name: string
  className?: string
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.45,
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
    >
      {name === 'folder' && (
        <>
          <path
            {...common}
            d="M3.5 6.5h6l1.7 2h9.3v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"
          />
          <path
            {...common}
            d="M3.5 8.5h17"
          />
        </>
      )}

      {name === 'folder-plus' && (
        <>
          <path
            {...common}
            d="M3.5 7.5h6l1.6 2h9.4v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"
          />
          <path
            {...common}
            d="M12 12v5M9.5 14.5h5"
          />
        </>
      )}

      {name === 'file' && (
        <>
          <path
            {...common}
            d="M6.5 3.5h7l4 4v13h-11z"
          />
          <path
            {...common}
            d="M13.5 3.5v4h4"
          />
          <path
            {...common}
            d="M9 13h6"
          />
          <path
            {...common}
            d="M9 16h6"
          />
        </>
      )}

      {name === 'git-file' && (
        <>
          <path
            {...common}
            d="M6.5 3.5h7l4 4v13h-11z"
          />
          <path
            {...common}
            d="M13.5 3.5v4h4"
          />
          <path
            {...common}
            d="M9 17.5v-4.2M9 13.3h4.2M13.2 13.3v-2.1"
          />
          <circle
            cx="9"
            cy="17.5"
            r="1.35"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="9"
            cy="13.3"
            r="1.35"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="13.2"
            cy="11.2"
            r="1.35"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}

      {name === 'upload' && (
        <>
          <path
            {...common}
            d="M12 15V4"
          />
          <path
            {...common}
            d="m8 8 4-4 4 4"
          />
          <path
            {...common}
            d="M5 15.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
          />
        </>
      )}

      {name === 'rename' && (
        <>
          <path
            {...common}
            d="m4.5 19.5 1.1-4.1L15.8 5.2a2.1 2.1 0 0 1 3 3l-10.2 10.2z"
          />
          <path
            {...common}
            d="m13.9 7.1 3 3"
          />
          <path
            {...common}
            d="M4.5 19.5h4"
          />
        </>
      )}

      {name === 'download' && (
        <>
          <path
            {...common}
            d="M12 4v10"
          />
          <path
            {...common}
            d="m8 10 4 4 4-4"
          />
          <path
            {...common}
            d="M5 18.5h14"
          />
        </>
      )}

      {name === 'trash' && (
        <>
          <path
            {...common}
            d="M5.5 7h13"
          />
          <path
            {...common}
            d="M9 7V4.5h6V7"
          />
          <path
            {...common}
            d="m7.5 7 .8 12h7.4l.8-12"
          />
          <path
            {...common}
            d="M10 10.5v5M14 10.5v5"
          />
        </>
      )}

      {name === 'archive' && (
        <>
          <path
            {...common}
            d="M4 7.5h16v12H4z"
          />
          <path
            {...common}
            d="M3 4.5h18v3H3z"
          />
          <path
            {...common}
            d="M9.5 12h5"
          />
        </>
      )}

      {name === 'plus' && (
        <path
          {...common}
          d="M12 5v14M5 12h14"
        />
      )}

      {name === 'close' && (
        <path
          {...common}
          d="m7 7 10 10M17 7 7 17"
        />
      )}

      {name === 'split' && (
        <>
          <rect
            {...common}
            x="4"
            y="5"
            width="16"
            height="14"
            rx="1"
          />
          <path
            {...common}
            d="M12 5v14"
          />
        </>
      )}

      {name === 'swap' && (
        <path
          {...common}
          d="M7 7h10l-2.5-2.5M17 17H7l2.5 2.5"
        />
      )}

      {name === 'collapse' && (
        <>
          <rect
            {...common}
            x="4"
            y="5"
            width="16"
            height="14"
            rx="1.5"
          />
          <path
            {...common}
            d="m11 9-3 3 3 3"
          />
        </>
      )}

      {name === 'expand' && (
        <>
          <rect
            {...common}
            x="4"
            y="5"
            width="16"
            height="14"
            rx="1.5"
          />
          <path
            {...common}
            d="m13 9 3 3-3 3"
          />
        </>
      )}

      {name === 'chevron' && (
        <path
          {...common}
          d="m9 6 6 6-6 6"
        />
      )}

      {name === 'run' && (
        <path
          fill="currentColor"
          d="m8 5 11 7-11 7z"
        />
      )}

      {name === 'terminal' && (
        <>
          <path
            {...common}
            d="M4 5.5h16v13H4z"
          />
          <path
            {...common}
            d="m7 9 2.5 2L7 13M11.5 13H15"
          />
        </>
      )}
    </svg>
  )
}

function rewriteImportedCSource(source: string): string {
  const functionDeclarationPattern =
    /^(\s*)((?:(?:(?:static|extern|inline|const|volatile|unsigned|signed|long|short|void|char|int|float|double|_Bool|size_t|struct\s+[A-Za-z_]\w*|enum\s+[A-Za-z_]\w*|union\s+[A-Za-z_]\w*|[A-Za-z_]\w*)\s+)+))(\**\s*[A-Za-z_]\w*)\s*\(([^)]*)\)(\s*(?:\{|;)?\s*)$/

  return source
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(functionDeclarationPattern)

      if (!match) {
        return line
      }

      const [
        ,
        indentation,
        declaration,
        rawFunctionName,
        rawParameters,
        suffix,
      ] = match

      const normalizedDeclaration = declaration.trim().replace(/\s+/g, ' ')
      const functionName = rawFunctionName.replace(/\s+/g, '')
      const parameters = rawParameters.trim()

      // Do not rewrite typedef declarations or function-pointer declarations.
      if (
        /(?:^|\s)typedef(?:\s|$)/.test(normalizedDeclaration) ||
        functionName.startsWith('(') ||
        functionName.includes('*') && functionName.includes(')')
      ) {
        return line
      }

      const hasStatic = /(?:^|\s)static(?:\s|$)/.test(normalizedDeclaration)
      const hasExtern = /(?:^|\s)extern(?:\s|$)/.test(normalizedDeclaration)
      const storageDeclaration =
        hasStatic || hasExtern
          ? normalizedDeclaration
          : `static ${normalizedDeclaration}`

      const normalizedParameters = parameters.length === 0 ? 'void' : parameters

      return `${indentation}${storageDeclaration} ${functionName}(${normalizedParameters})${suffix}`
    })
    .join('\n')
}

function MountainBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_5%,rgba(38,128,255,0.13),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(255,177,0,0.08),transparent_26%)]" />

      <svg
        viewBox="0 0 1000 560"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 h-[52%] w-[64%] opacity-80"
      >
        <defs>
          <linearGradient
            id="cmMountain"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0"
              stopColor="#19314d"
              stopOpacity=".95"
            />
            <stop
              offset="1"
              stopColor="#050a12"
              stopOpacity=".15"
            />
          </linearGradient>
        </defs>

        <path
          d="M0 470 115 365 190 420 315 235 410 365 500 290 625 420 740 335 865 440 1000 315V560H0Z"
          fill="url(#cmMountain)"
        />

        <path
          d="M0 470 115 365 190 420 315 235 410 365 500 290 625 420 740 335 865 440 1000 315"
          fill="none"
          stroke="#315a82"
          strokeWidth="2"
          opacity=".7"
        />

        <path
          d="M305 246 315 235 326 251M491 301 500 290 511 303M731 347 740 335 752 349"
          fill="none"
          stroke="#ffb100"
          strokeWidth="2.5"
          opacity=".75"
        />

        <path
          d="M95 514 175 454 235 480 315 410 382 442 455 395"
          fill="none"
          stroke="#ffb100"
          strokeWidth="1.2"
          opacity=".3"
        />
      </svg>

      <div className="absolute bottom-[17%] left-[4%] h-px w-[26%] bg-gradient-to-r from-transparent via-signal/70 to-transparent motion-safe:animate-pulse" />
    </div>
  )
}

function SqlResultTables({
  results,
}: {
  results: SqlStatementResult[]
}) {
  if (results.length === 0) {
    return (
      <p className="font-mono text-[9px] leading-5 text-[#9aa9bb]">
        no result sets — script ran with no SELECT output.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {results.map((result, index) => (
        <div
          key={index}
          className="overflow-hidden border border-[#2d435b]"
        >
          <div className="flex items-center justify-between border-b border-[#2d435b] bg-[#0b1725] px-3 py-2">
            <span className="font-mono text-[8px] uppercase tracking-[.1em] text-[#9aa9bb]">
              statement {index + 1}
            </span>

            <span className="font-mono text-[7px] uppercase tracking-[.1em] text-[#748aa2]">
              {result.rows.length} row
              {result.rows.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {result.columns.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-[#2d435b] bg-[#07111d] px-3 py-2 font-mono text-[8px] uppercase tracking-[.08em] text-[#9baec1]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {result.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-[#1d2b3a] last:border-b-0"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-[#d8e2ec]"
                      >
                        {cell === null ? (
                          <span className="text-[#7389a0]">
                            null
                          </span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function Pane({
  fileName,
  pane,
  canClose,
  onClose,
  onFocus,
  editor,
  theme,
  fontSize,
  fontFamily,
  wordWrap,
  workspaceFiles,
}: {
  fileName: string
  pane: Pane
  canClose: boolean
  onClose: () => void
  onFocus: () => void
  editor: ReturnType<typeof useMultiFileEditor>
  theme: EditorThemeName
  fontSize: number
  fontFamily: EditorFontName
  wordWrap: boolean
  workspaceFiles: readonly WorkspaceFile[]
}) {
  const file = editor.files.find(
    (item) => item.name === fileName
  )

  if (!file) {
    return null
  }

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      onMouseDown={onFocus}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#263b55] bg-[#0b1725] px-3">
        <button
          type="button"
          onClick={onFocus}
          className="flex min-w-0 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
        >
          <Icon
            name={
              file.name.endsWith('.h')
                ? 'git-file'
                : 'file'
            }
            className="h-4 w-4 text-signal"
          />

          <span className="truncate font-mono text-[9px] text-[#e4edf6]">
            {file.name}
          </span>

          <span className="font-mono text-[6px] uppercase tracking-[.12em] text-[#7188a1]">
            {pane}
          </span>
        </button>

        {canClose && (
          <button
            type="button"
            onClick={onClose}
            title={`Close ${file.name} pane`}
            aria-label={`Close ${file.name} pane`}
            className="flex h-7 w-7 items-center justify-center text-[#91a4b8] hover:text-[#f1f6fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
          >
            <Icon
              name="close"
              className="h-3.5 w-3.5"
            />
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#060d16]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(92,145,202,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(92,145,202,.025) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <CodeEditor
          language="c"
          value={file.content}
          onChange={(content) =>
            editor.updateFileContent(
              file.name,
              content
            )
          }
          theme={theme}
          fontSize={fontSize}
          fontFamily={fontFamily}
          wordWrap={wordWrap}
          workspaceFiles={workspaceFiles}
          editorKey={`freestyle-c-${pane}-${file.name}`}
        />
      </div>
    </div>
  )
}

function EmptyFolderState({
  folderName,
  onAddFile,
}: {
  folderName: string
  onAddFile: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-[#060d16] p-8">
      <div className="relative w-full max-w-[340px] border border-[#29445f] bg-[#091522] px-6 py-7 text-center">
        <span className="absolute left-0 top-0 h-px w-20 bg-signal" />

        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center border border-[#355573] bg-[#0d1b2b] text-signal">
          <Icon name="folder" />
        </div>

        <div className="font-display text-[12px] font-semibold text-[#edf5ff]">
          {folderName}
        </div>

        <p className="mt-2 font-mono text-[8px] leading-5 text-[#8fa5bb]">
          This C folder has no source files yet. Add a file here and only this folder will be compiled on Run.
        </p>

        <button
          type="button"
          onClick={onAddFile}
          className="mt-5 border border-[#466581] bg-[#0d1b2b] px-4 py-2 font-mono text-[8px] font-semibold uppercase tracking-[.1em] text-[#dce9f6] transition-colors hover:border-signal hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal motion-reduce:transition-none"
        >
          + Add file
        </button>
      </div>
    </div>
  )
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index]

    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        (crc >>> 1) ^
        (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(
  view: DataView,
  offset: number,
  value: number
) {
  view.setUint16(offset, value, true)
}

function writeUint32(
  view: DataView,
  offset: number,
  value: number
) {
  view.setUint32(offset, value >>> 0, true)
}

function buildZip(
  folderName: string,
  files: Array<{
    name: string
    content: string
  }>
) {
  const encoder = new TextEncoder()

  const entries = files.map((file) => {
    const path = `${folderName}/${file.name}`
    const nameBytes = encoder.encode(path)
    const contentBytes = encoder.encode(file.content)

    return {
      path,
      nameBytes,
      contentBytes,
      crc: crc32(contentBytes),
    }
  })

  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []

  let offset = 0

  for (const entry of entries) {
    const local = new Uint8Array(
      30 + entry.nameBytes.length
    )

    const localView = new DataView(
      local.buffer
    )

    writeUint32(localView, 0, 0x04034b50)
    writeUint16(localView, 4, 20)
    writeUint16(localView, 6, 0x0800)
    writeUint16(localView, 8, 0)
    writeUint16(localView, 10, 0)
    writeUint16(localView, 12, 0)
    writeUint32(localView, 14, entry.crc)
    writeUint32(
      localView,
      18,
      entry.contentBytes.length
    )
    writeUint32(
      localView,
      22,
      entry.contentBytes.length
    )
    writeUint16(
      localView,
      26,
      entry.nameBytes.length
    )
    writeUint16(localView, 28, 0)

    local.set(entry.nameBytes, 30)

    localParts.push(local)
    localParts.push(entry.contentBytes)

    const central = new Uint8Array(
      46 + entry.nameBytes.length
    )

    const centralView = new DataView(
      central.buffer
    )

    writeUint32(
      centralView,
      0,
      0x02014b50
    )
    writeUint16(centralView, 4, 20)
    writeUint16(centralView, 6, 20)
    writeUint16(centralView, 8, 0x0800)
    writeUint16(centralView, 10, 0)
    writeUint16(centralView, 12, 0)
    writeUint16(centralView, 14, 0)
    writeUint32(centralView, 16, entry.crc)
    writeUint32(
      centralView,
      20,
      entry.contentBytes.length
    )
    writeUint32(
      centralView,
      24,
      entry.contentBytes.length
    )
    writeUint16(
      centralView,
      28,
      entry.nameBytes.length
    )
    writeUint16(centralView, 30, 0)
    writeUint16(centralView, 32, 0)
    writeUint16(centralView, 34, 0)
    writeUint16(centralView, 36, 0)
    writeUint32(centralView, 38, 0)
    writeUint32(
      centralView,
      42,
      offset
    )

    central.set(entry.nameBytes, 46)

    centralParts.push(central)

    offset += local.length + entry.contentBytes.length
  }

  const centralSize = centralParts.reduce(
    (total, part) => total + part.length,
    0
  )

  const centralOffset = offset

  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)

  writeUint32(endView, 0, 0x06054b50)
  writeUint16(endView, 4, 0)
  writeUint16(endView, 6, 0)
  writeUint16(
    endView,
    8,
    entries.length
  )
  writeUint16(
    endView,
    10,
    entries.length
  )
  writeUint32(
    endView,
    12,
    centralSize
  )
  writeUint32(
    endView,
    16,
    centralOffset
  )
  writeUint16(endView, 20, 0)

  const totalSize =
    localParts.reduce((total, part) => total + part.byteLength, 0) +
    centralParts.reduce((total, part) => total + part.byteLength, 0) +
    end.byteLength

  const zipBuffer = new ArrayBuffer(totalSize)
  const zipBytes = new Uint8Array(zipBuffer)
  let writeOffset = 0

  for (const part of localParts) {
    zipBytes.set(part, writeOffset)
    writeOffset += part.byteLength
  }

  for (const part of centralParts) {
    zipBytes.set(part, writeOffset)
    writeOffset += part.byteLength
  }

  zipBytes.set(end, writeOffset)

  return new Blob([zipBuffer], {
    type: 'application/zip',
  })
}

function downloadBlob(
  blob: Blob,
  filename: string
) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  )
}

function downloadTextFile(
  filename: string,
  content: string
) {
  downloadBlob(
    new Blob([content], {
      type: 'text/plain;charset=utf-8',
    }),
    filename
  )
}

export default function FreestylePage() {
  const [language, setLanguage] =
    useState<FreestyleLanguage>('c')

  const [stdin, setStdin] = useState('')
  const [javaCode, setJavaCode] =
    useState(DEFAULT_JAVA_CODE)
  const [sqlCode, setSqlCode] =
    useState(DEFAULT_SQL_CODE)

  const [theme, setTheme] =
    useState<EditorThemeName>(DEFAULT_THEME)
  const [fontFamily, setFontFamily] =
    useState<EditorFontName>(DEFAULT_FONT)
  const [fontSize, setFontSize] =
    useState(DEFAULT_FONT_SIZE)
  const [wordWrap, setWordWrap] =
    useState(false)

  const [folders, setFolders] =
    useState<CFolder[]>([DEFAULT_C_FOLDER])
  const [activeFolderId, setActiveFolderId] =
    useState(DEFAULT_C_FOLDER.id)
  const [filesRailCollapsed, setFilesRailCollapsed] =
    useState(false)

  const [showAddFile, setShowAddFile] =
    useState(false)
  const [showAddFolder, setShowAddFolder] =
    useState(false)

  const [newFileName, setNewFileName] =
    useState('')
  const [newFolderName, setNewFolderName] =
    useState('')

  const [addFileError, setAddFileError] =
    useState<string | null>(null)
  const [folderError, setFolderError] =
    useState<string | null>(null)
  const [importError, setImportError] =
    useState<string | null>(null)

  const [leftFileName, setLeftFileName] =
    useState('main.c')
  const [rightFileName, setRightFileName] =
    useState<string | null>(null)

  const [focusedPane, setFocusedPane] =
    useState<Pane>('left')

  const [splitRatio, setSplitRatio] =
    useState(50)

  const [outputWidth, setOutputWidth] =
    useState(DEFAULT_OUTPUT_WIDTH)

  const [outputCollapsed, setOutputCollapsed] =
    useState(false)

  const [contextMenu, setContextMenu] =
    useState<ContextMenuState | null>(null)

  const [renameTarget, setRenameTarget] =
    useState<{ kind: ContextMenuKind; id: string; name: string } | null>(null)
  const [renameName, setRenameName] =
    useState('')
  const [renameError, setRenameError] =
    useState<string | null>(null)
  const [isDropActive, setIsDropActive] =
    useState(false)
  const [isAddFileDropActive, setIsAddFileDropActive] =
    useState(false)

  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget | null>(null)

  const [deleteConfirmation, setDeleteConfirmation] =
    useState('')

  const workspaceRef =
    useRef<HTMLDivElement>(null)

  const splitRef =
    useRef<HTMLDivElement>(null)

  const editor =
    useMultiFileEditor(DEFAULT_C_CODE)

  const { phase, run, reset } =
    useFreestyleRun()

  const isBusy =
    phase.kind === 'submitted' ||
    phase.kind === 'running'

  const activeFolder =
    folders.find(
      (folder) => folder.id === activeFolderId
    ) ?? folders[0]

  const activeFolderFiles =
    activeFolder?.fileNames ?? []

  const activeWorkspaceFiles = useMemo<WorkspaceFile[]>(
    () =>
      editor.files.map((file) => ({
        name: file.name,
        content: file.content,
      })),
    [editor.files]
  )

  const selectedTheme = useMemo(
    () =>
      EDITOR_THEMES.find(
        (item) => item.id === theme
      ) ?? EDITOR_THEMES[0],
    [theme]
  )

  const selectedFont = useMemo(
    () =>
      EDITOR_FONTS.find(
        (item) => item.id === fontFamily
      ) ?? EDITOR_FONTS[0],
    [fontFamily]
  )

  const isSuccessfulResult =
    phase.kind === 'result' &&
    phase.response.status === 0 &&
    !phase.response.reason

  const sqlResults =
    language === 'sql' &&
    phase.kind === 'result'
      ? parseSqlOutput(
          phase.response.output
        )
      : null

  useEffect(() => {
    const closeContextMenu = () => {
      setContextMenu(null)
    }

    window.addEventListener(
      'click',
      closeContextMenu
    )

    window.addEventListener(
      'scroll',
      closeContextMenu,
      true
    )

    return () => {
      window.removeEventListener(
        'click',
        closeContextMenu
      )

      window.removeEventListener(
        'scroll',
        closeContextMenu,
        true
      )
    }
  }, [])

  useEffect(() => {
    if (!contextMenu && !deleteTarget) {
      return
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        event.preventDefault()

        if (deleteTarget) {
          setDeleteTarget(null)
          setDeleteConfirmation('')
        } else {
          setContextMenu(null)
        }
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [contextMenu, deleteTarget])

  const openContextMenu = (
    event: ReactMouseEvent<HTMLElement>,
    kind: ContextMenuKind,
    id: string,
    name: string
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const menuWidth = 190
    const menuHeight = 112

    const x = clamp(
      event.clientX,
      8,
      Math.max(
        8,
        window.innerWidth -
          menuWidth -
          8
      )
    )

    const y = clamp(
      event.clientY,
      8,
      Math.max(
        8,
        window.innerHeight -
          menuHeight -
          8
      )
    )

    setContextMenu({
      kind,
      id,
      name,
      x,
      y,
    })
  }

  const startRename = (kind: ContextMenuKind, id: string, name: string) => {
    setContextMenu(null)
    setRenameTarget({ kind, id, name })
    setRenameName(name)
    setRenameError(null)
  }

  const renameItem = () => {
    if (!renameTarget) {
      return
    }

    const next = renameName.trim()

    if (!next) {
      setRenameError('name is required')
      return
    }

    if (renameTarget.kind === 'folder') {
      if (!/^[a-zA-Z0-9._ -]+$/.test(next)) {
        setRenameError('use letters, numbers, spaces, dot, dash, or underscore')
        return
      }

      if (folders.some((folder) =>
        folder.id !== renameTarget.id &&
        folder.name.toLowerCase() === next.toLowerCase()
      )) {
        setRenameError('a folder with that name already exists')
        return
      }

      setFolders((current) =>
        current.map((folder) =>
          folder.id === renameTarget.id
            ? { ...folder, name: next }
            : folder
        )
      )
    } else {
      const error = editor.renameFile(renameTarget.name, next)

      if (error) {
        setRenameError(error)
        return
      }

      setFolders((current) =>
        current.map((folder) => ({
          ...folder,
          fileNames: folder.fileNames.map((name) =>
            name === renameTarget.name ? next : name
          ),
        }))
      )

      if (leftFileName === renameTarget.name) {
        setLeftFileName(next)
      }

      if (rightFileName === renameTarget.name) {
        setRightFileName(next)
      }

      editor.setActiveFileName(next)
    }

    setRenameTarget(null)
    setRenameName('')
    setRenameError(null)
  }

  const cancelRename = () => {
    setRenameTarget(null)
    setRenameName('')
    setRenameError(null)
  }

  const requestDelete = (
    kind: ContextMenuKind,
    id: string,
    name: string
  ) => {
    setContextMenu(null)
    setDeleteConfirmation('')

    setDeleteTarget({
      kind,
      id,
      name,
    })
  }

  const downloadFile = (
    fileName: string
  ) => {
    const file = editor.files.find(
      (item) => item.name === fileName
    )

    if (!file) {
      return
    }

    downloadTextFile(
      file.name,
      file.content
    )
  }

  const downloadFolder = (
    folder: CFolder
  ) => {
    const folderFiles = editor.files.filter(
      (file) =>
        folder.fileNames.includes(
          file.name
        )
    )

    if (folderFiles.length === 0) {
      return
    }

    const zip = buildZip(
      folder.name,
      folderFiles.map((file) => ({
        name: file.name,
        content: file.content,
      }))
    )

    downloadBlob(
      zip,
      `${folder.name}.zip`
    )
  }

  const selectSafeFile = (
    availableFileNames: string[]
  ) => {
    const first =
      availableFileNames[0] ?? ''

    setLeftFileName(first)
    setRightFileName(null)
    setFocusedPane('left')

    if (first) {
      editor.setActiveFileName(first)
    }
  }

  const deleteConfirmedTarget = () => {
    if (!deleteTarget) {
      return
    }

    if (
      deleteConfirmation !==
      deleteTarget.name
    ) {
      return
    }

    if (deleteTarget.kind === 'file') {
      const fileName = deleteTarget.name

      const containingFolder =
        folders.find((folder) =>
          folder.fileNames.includes(
            fileName
          )
        )

      if (!containingFolder) {
        setDeleteTarget(null)
        setDeleteConfirmation('')
        return
      }

      const remainingFiles =
        containingFolder.fileNames.filter(
          (name) => name !== fileName
        )

      setFolders((current) =>
        current.map((folder) =>
          folder.id ===
          containingFolder.id
            ? {
                ...folder,
                fileNames:
                  remainingFiles,
              }
            : folder
        )
      )

      editor.deleteFile(fileName)

      if (
        leftFileName === fileName
      ) {
        const replacement =
          remainingFiles[0] ?? ''

        setLeftFileName(
          replacement
        )

        if (replacement) {
          editor.setActiveFileName(
            replacement
          )
        }
      }

      if (
        rightFileName === fileName
      ) {
        setRightFileName(null)
        setFocusedPane('left')

        const replacement =
          leftFileName === fileName
            ? remainingFiles[0] ?? ''
            : leftFileName

        if (replacement) {
          setLeftFileName(
            replacement
          )
          editor.setActiveFileName(
            replacement
          )
        }
      }
    } else {
      const folder =
        folders.find(
          (item) =>
            item.id ===
            deleteTarget.id
        )

      if (!folder) {
        setDeleteTarget(null)
        setDeleteConfirmation('')
        return
      }

      const deletingFiles =
        new Set(folder.fileNames)

      for (const fileName of folder.fileNames) {
        editor.deleteFile(fileName)
      }

      const remainingFolders =
        folders.filter(
          (item) =>
            item.id !== folder.id
        )

      setFolders(
        remainingFolders
      )

      const nextFolder =
        remainingFolders[0]

      if (nextFolder) {
        setActiveFolderId(
          nextFolder.id
        )

        selectSafeFile(
          nextFolder.fileNames
        )
      } else {
        setActiveFolderId('')
        setLeftFileName('')
        setRightFileName(null)
        setFocusedPane('left')
      }

      if (
        deletingFiles.has(
          leftFileName
        ) ||
        deletingFiles.has(
          rightFileName ?? ''
        )
      ) {
        setRightFileName(null)
      }
    }

    setDeleteTarget(null)
    setDeleteConfirmation('')
  }

  const openFile = (
    fileName: string,
    pane: Pane = 'left'
  ) => {
    if (
      !editor.files.some(
        (file) => file.name === fileName
      )
    ) {
      return
    }

    if (pane === 'left') {
      if (fileName === rightFileName) {
        setRightFileName(leftFileName)
      }

      setLeftFileName(fileName)
      setFocusedPane('left')
    } else {
      if (fileName === leftFileName) {
        return
      }

      setRightFileName(fileName)
      setFocusedPane('right')
    }

    editor.setActiveFileName(fileName)
  }

  const openSplit = () => {
    if (rightFileName) {
      setFocusedPane('right')
      return
    }

    const next =
      editor.files.find(
        (file) =>
          activeFolderFiles.includes(file.name) &&
          file.name !== leftFileName
      )

    if (!next) {
      setNewFileName('utils.h')
      setAddFileError(null)
      setShowAddFile(true)
      return
    }

    openFile(next.name, 'right')
  }

  const handleLanguageChange = (
    next: FreestyleLanguage
  ) => {
    if (next === language) {
      return
    }

    setLanguage(next)
    reset()

    setShowAddFile(false)
    setShowAddFolder(false)
    setNewFileName('')
    setNewFolderName('')
    setAddFileError(null)
    setFolderError(null)
    setContextMenu(null)
    setRenameTarget(null)
    setRenameName('')
    setRenameError(null)
    setImportError(null)
    setDeleteTarget(null)
    setDeleteConfirmation('')
    setIsDropActive(false)

    if (next === 'c') {
      editor.resetFiles(
        DEFAULT_C_CODE
      )

      setFolders([DEFAULT_C_FOLDER])
      setActiveFolderId(
        DEFAULT_C_FOLDER.id
      )
      setFilesRailCollapsed(false)
      setLeftFileName('main.c')
      setRightFileName(null)
      setFocusedPane('left')
    }
  }

  const addFolder = () => {
    const name = newFolderName.trim()

    if (!name) {
      setFolderError('enter a folder name')
      return
    }

    if (!/^[a-zA-Z0-9._ -]+$/.test(name)) {
      setFolderError('use letters, numbers, spaces, dot, dash, or underscore')
      return
    }

    if (folders.some((folder) =>
      folder.name.toLowerCase() === name.toLowerCase()
    )) {
      setFolderError('a folder with that name already exists')
      return
    }

    const slug =
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      'folder'

    let fileName =
      editor.files.some((file) => file.name.toLowerCase() === 'main.c')
        ? `main-${slug}.c`
        : 'main.c'

    let suffix = 2
    while (editor.files.some((file) => file.name.toLowerCase() === fileName.toLowerCase())) {
      fileName = `main-${slug}-${suffix}.c`
      suffix += 1
    }

    const boilerplate = DEFAULT_C_CODE
    editor.restoreFiles([
      ...editor.files,
      { name: fileName, content: boilerplate },
    ])

    const id = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    setFolders((current) => [
      ...current,
      {
        id,
        name,
        fileNames: [fileName],
        collapsed: false,
      },
    ])

    setActiveFolderId(id)
    setLeftFileName(fileName)
    setRightFileName(null)
    setFocusedPane('left')
    editor.setActiveFileName(fileName)
    setShowAddFolder(false)
    setNewFolderName('')
    setFolderError(null)
  }

  const addFile = () => {
    const name = newFileName.trim()

    if (!name) {
      setAddFileError('enter a filename')
      return
    }

    if (!activeFolder) {
      setAddFileError('create or select a C folder first')
      return
    }

    if (!/^[^\\/:*?"<>|]+\.(?:c|h)$/i.test(name)) {
      setAddFileError('filename must end in .c or .h')
      return
    }

    if (activeFolder.fileNames.some((fileName) => fileName.toLowerCase() === name.toLowerCase())) {
      setAddFileError('a file with that name already exists in this folder')
      return
    }

    const existing = editor.files.find(
      (file) => file.name.toLowerCase() === name.toLowerCase()
    )

    if (!existing) {
      const error = editor.addFile(name)
      if (error) {
        setAddFileError(error)
        return
      }
    }

    setFolders((current) =>
      current.map((folder) =>
        folder.id === activeFolder.id
          ? { ...folder, fileNames: [...folder.fileNames, name] }
          : folder
      )
    )

    setLeftFileName(name)
    setRightFileName(null)
    setFocusedPane('left')
    editor.setActiveFileName(name)
    setShowAddFile(false)
    setNewFileName('')
    setAddFileError(null)
  }

  const importFiles = async (files: File[], targetFolderId = activeFolderId) => {
    if (language !== 'c') {
      return
    }

    const targetFolder = folders.find((folder) => folder.id === targetFolderId)

    if (!targetFolder) {
      setFolderError('create or select a C folder first')
      return
    }

    const existing = new Set(
      editor.files.map((file) => file.name.toLowerCase())
    )
    const pendingNames = new Set<string>()
    const imported: { name: string; content: string }[] = []
    let skipped = 0

    for (const file of files) {
      const lower = file.name.toLowerCase()

      if (!lower.endsWith('.c') && !lower.endsWith('.h')) {
        skipped += 1
        continue
      }

      if (pendingNames.has(lower)) {
        skipped += 1
        continue
      }

      if (existing.has(lower)) {
        if (targetFolder.fileNames.some((name) => name.toLowerCase() === lower)) {
          skipped += 1
        } else {
          imported.push({
            name: file.name,
            content: '',
          })
          pendingNames.add(lower)
        }
        continue
      }

      try {
        imported.push({
          name: file.name,
          content: rewriteImportedCSource(await file.text()),
        })
        pendingNames.add(lower)
      } catch {
        skipped += 1
      }
    }

    if (imported.length > 0) {
      const newEditorFiles = imported.filter((file) => file.content !== '')
      if (newEditorFiles.length > 0) {
        editor.restoreFiles([
          ...editor.files,
          ...newEditorFiles,
        ])
      }

      setFolders((current) =>
        current.map((folder) =>
          folder.id === targetFolder.id
            ? {
                ...folder,
                fileNames: [
                  ...folder.fileNames,
                  ...imported.map((file) => file.name),
                ],
              }
            : folder
        )
      )

      const first = imported[0].name
      setActiveFolderId(targetFolder.id)
      setLeftFileName(first)
      setRightFileName(null)
      setFocusedPane('left')
      editor.setActiveFileName(first)
    }

    if (skipped > 0) {
      setImportError(
        `${skipped} file${skipped === 1 ? '' : 's'} skipped — unsupported type, duplicate name, or unreadable file`
      )
    } else {
      setImportError(null)
    }
  }

  const handleImportInput = async (event: ReactChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length > 0) {
      await importFiles(files)
    }
  }

  const handleAddFileDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsAddFileDropActive(false)

    if (language !== 'c') {
      return
    }

    const files = await filesFromDrop(event)
    if (files.length === 0) {
      return
    }

    await importFiles(files, activeFolderId)
    setShowAddFile(false)
  }


  const handleDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (language !== 'c') {
      return
    }

    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault()
      setIsDropActive(true)
    }
  }

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (language !== 'c') {
      return
    }

    const isExternal = event.dataTransfer.types.includes('Files')
    const isInternalFile = event.dataTransfer.types.includes('text/ciscode-file')

    if (isExternal && !isInternalFile) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setIsDropActive(true)
    }
  }

  const handleDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDropActive(false)
    }
  }

  const moveFileToFolder = (fileName: string, targetFolderId: string) => {
    const sourceFolder = folders.find((folder) =>
      folder.fileNames.includes(fileName)
    )

    if (!sourceFolder || sourceFolder.id === targetFolderId) {
      return
    }

    setFolders((current) =>
      current.map((folder) => {
        if (folder.id === sourceFolder.id) {
          return {
            ...folder,
            fileNames: folder.fileNames.filter((name) => name !== fileName),
          }
        }

        if (folder.id === targetFolderId) {
          return {
            ...folder,
            fileNames: folder.fileNames.includes(fileName)
              ? folder.fileNames
              : [...folder.fileNames, fileName],
          }
        }

        return folder
      })
    )

    setActiveFolderId(targetFolderId)
    setLeftFileName(fileName)
    setRightFileName(null)
    setFocusedPane('left')
    editor.setActiveFileName(fileName)
  }

  const handleFolderDrop = async (
    event: ReactDragEvent<HTMLDivElement>,
    targetFolderId: string
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDropActive(false)

    const internalFile = event.dataTransfer.getData('text/ciscode-file')

    if (internalFile) {
      moveFileToFolder(internalFile, targetFolderId)
      return
    }

    const files = await filesFromDrop(event)

    if (files.length > 0) {
      await importFiles(files, targetFolderId)
    }
  }

  const handleDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDropActive(false)

    if (language !== 'c') {
      return
    }

    if (event.dataTransfer.types.includes('text/ciscode-file')) {
      return
    }

    const files = await filesFromDrop(event)

    if (files.length > 0) {
      await importFiles(files)
    }
  }

  const runCode = () => {
    if (language === 'c') {
      const sources: Record<
        string,
        string
      > = {}

      const headers: Record<
        string,
        string
      > = {}

      for (const file of editor.files) {
        if (
          !activeFolderFiles.includes(
            file.name
          )
        ) {
          continue
        }

        if (file.name.endsWith('.h')) {
          headers[file.name] =
            file.content
        } else {
          sources[file.name] =
            file.content
        }
      }

      if (
        !Object.keys(sources).length
      ) {
        return
      }

      const request: GCCRequest = {
        sources,
        headers:
          Object.keys(headers).length
            ? headers
            : undefined,
        stdin:
          stdin || undefined,
      }

      run('c', request)
      return
    }

    if (language === 'java') {
      const request: JavaRequest = {
        sources: {
          [JAVA_ENTRY_FILENAME]:
            javaCode,
        },
        stdin:
          stdin || undefined,
      }

      run('java', request)
      return
    }

    const request: SQLite3tmpRequest = {
      stdin: sqlCode,
    }

    run('sql', request)
  }

  const resizeOutput = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!workspaceRef.current) {
      return
    }

    event.preventDefault()

    const startX =
      event.clientX
    const startWidth =
      outputWidth

    const move = (
      moveEvent: PointerEvent
    ) => {
      const width =
        workspaceRef.current?.getBoundingClientRect()
          .width ?? 0

      const max = Math.max(
        MIN_OUTPUT_WIDTH,
        width * MAX_OUTPUT_FRACTION
      )

      setOutputWidth(
        clamp(
          startWidth -
            (moveEvent.clientX -
              startX),
          MIN_OUTPUT_WIDTH,
          max
        )
      )
    }

    const up = () => {
      window.removeEventListener(
        'pointermove',
        move
      )
      window.removeEventListener(
        'pointerup',
        up
      )
    }

    window.addEventListener(
      'pointermove',
      move
    )

    window.addEventListener(
      'pointerup',
      up
    )
  }

  const nudgeOutput = (
    delta: number
  ) => {
    const width =
      workspaceRef.current?.getBoundingClientRect()
        .width ?? 0

    const max = Math.max(
      MIN_OUTPUT_WIDTH,
      width * MAX_OUTPUT_FRACTION
    )

    setOutputWidth((current) =>
      clamp(
        current - delta,
        MIN_OUTPUT_WIDTH,
        max
      )
    )
  }

  const resizeSplit = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!splitRef.current) {
      return
    }

    event.preventDefault()

    const rect =
      splitRef.current.getBoundingClientRect()

    const startX =
      event.clientX

    const startRatio =
      splitRatio

    const move = (
      moveEvent: PointerEvent
    ) =>
      setSplitRatio(
        clamp(
          startRatio +
            ((moveEvent.clientX -
              startX) /
              rect.width) *
              100,
          MIN_SPLIT_RATIO,
          MAX_SPLIT_RATIO
        )
      )

    const up = () => {
      window.removeEventListener(
        'pointermove',
        move
      )
      window.removeEventListener(
        'pointerup',
        up
      )
    }

    window.addEventListener(
      'pointermove',
      move
    )

    window.addEventListener(
      'pointerup',
      up
    )
  }

  const nudgeSplit = (
    delta: number
  ) => {
    const width =
      splitRef.current?.getBoundingClientRect()
        .width ?? 0

    if (!width) {
      return
    }

    setSplitRatio((current) =>
      clamp(
        current +
          (delta / width) * 100,
        MIN_SPLIT_RATIO,
        MAX_SPLIT_RATIO
      )
    )
  }

  const canRunC =
    activeFolderFiles.some(
      (fileName) =>
        !fileName.endsWith('.h')
    )

  const deleteNameMatches =
    deleteTarget !== null &&
    deleteConfirmation ===
      deleteTarget.name

  return (
    <>
      <main className="fixed inset-x-0 bottom-16 top-0 z-10 flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#050b13] text-chalk md:bottom-0 md:left-56">
        <MountainBackdrop />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(rgba(80,130,180,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(80,130,180,.025) 1px, transparent 1px)',
            backgroundSize:
              '28px 28px',
          }}
        />

        <header className="relative z-20 flex min-h-[72px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#263b55] bg-[#08111d]/95 px-4 py-3 backdrop-blur-sm lg:min-h-[78px] lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-signal/70 bg-signal/[.06] text-signal">
              <Icon
                name="terminal"
                className="h-5 w-5"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate font-display text-[16px] font-semibold text-[#edf5ff]">
                  Freestyle
                </h1>

                <span className="hidden border border-[#38526c] px-2 py-1 font-mono text-[8px] uppercase tracking-[.14em] text-[#9badc0] sm:inline">
                  playground
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 font-mono text-[7px] uppercase tracking-[.1em] text-[#7e95ad]">
                <span>
                  CREATE / BUILD / SOLVE / REPEAT
                </span>

                {language === 'c' &&
                  activeFolder && (
                    <>
                      <span className="text-[#3f5a75]">
                        ·
                      </span>

                      <span className="text-[#a0b5ca]">
                        folder:{' '}
                        {activeFolder.name}
                      </span>
                    </>
                  )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex border border-[#35506c]"
              role="radiogroup"
              aria-label="Programming language"
            >
              {(
                ['c', 'java', 'sql'] as const
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={
                    language === item
                  }
                  onClick={() =>
                    handleLanguageChange(
                      item
                    )
                  }
                  className={`h-9 min-w-[50px] px-3 font-mono text-[9px] uppercase tracking-[.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal sm:h-10 sm:min-w-[58px] ${
                    language === item
                      ? 'bg-signal text-ink'
                      : 'bg-[#08111d] text-[#a4b8cc] hover:bg-[#0e1d2e] hover:text-[#f1f7fd]'
                  }`}
                >
                  {item === 'java'
                    ? 'JAVA'
                    : item.toUpperCase()}
                </button>
              ))}
            </div>

            <FreestyleEditorSettings
              theme={theme}
              onThemeChange={setTheme}
              fontFamily={fontFamily}
              onFontFamilyChange={
                setFontFamily
              }
              fontSize={fontSize}
              onFontSizeChange={(value) =>
                setFontSize(
                  clamp(
                    value,
                    MIN_FONT_SIZE,
                    MAX_FONT_SIZE
                  )
                )
              }
              wordWrap={wordWrap}
              onWordWrapChange={
                setWordWrap
              }
            />

            <button
              type="button"
              disabled={
                isBusy ||
                (language === 'c' &&
                  !canRunC)
              }
              onClick={runCode}
              className="flex h-9 min-w-[84px] items-center justify-center gap-2 bg-signal px-4 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-ink transition-[filter,opacity] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal sm:h-10 sm:min-w-[92px] motion-reduce:transition-none"
            >
              <Icon
                name="run"
                className="h-3 w-3"
              />

              {isBusy
                ? 'RUNNING'
                : 'RUN'}
            </button>
          </div>
        </header>

        <div
          ref={workspaceRef}
          className={`relative z-10 flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row ${
            isDropActive ? 'ring-1 ring-inset ring-signal/70' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#07101a]">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
              {language === 'c' && (
                <aside
                  className={`shrink-0 border-[#263b55] bg-[#08111d] transition-[width,height] duration-200 motion-reduce:transition-none lg:border-r ${
                    filesRailCollapsed
                      ? 'h-11 w-full border-b lg:h-full lg:w-[48px] lg:border-b-0'
                      : 'h-[230px] w-full border-b lg:h-full lg:w-[236px] lg:border-b-0'
                  }`}
                  aria-label="C workspace folders"
                >
                  <div className="flex h-11 items-center justify-between border-b border-[#263b55] px-3 lg:h-[50px]">
                    {!filesRailCollapsed && (
                      <div className="flex items-center gap-2">
                        <span className="text-signal">
                          <Icon name="folder" />
                        </span>

                        <span className="font-display text-[10px] font-semibold uppercase tracking-[.14em] text-[#e1edf8]">
                          C Workspace
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex items-center gap-1 ${
                        filesRailCollapsed
                          ? 'mx-auto'
                          : 'ml-auto'
                      }`}
                    >
                      {!filesRailCollapsed && (
                        <>
                          <label
                            title="Import C/C++ files"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center border border-[#31506d] text-[#a4b7ca] hover:border-signal/70 hover:text-signal focus-within:outline focus-within:outline-2 focus-within:outline-signal"
                          >
                            <Icon
                              name="upload"
                              className="h-3.5 w-3.5"
                            />
                            <input
                              type="file"
                              multiple
                              accept=".c,.h,text/x-c,text/x-chdr"
                              className="sr-only"
                              onChange={handleImportInput}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                            setNewFolderName(
                              ''
                            )
                            setFolderError(
                              null
                            )
                            setShowAddFolder(
                              true
                            )
                          }}
                          title="Add C folder"
                          aria-label="Add C folder"
                          className="flex h-7 w-7 items-center justify-center border border-[#31506d] text-[#a4b7ca] hover:border-signal/70 hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                        >
                          <Icon
                            name="folder-plus"
                            className="h-4 w-4"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewFileName('')
                            setAddFileError(null)
                            setShowAddFile(true)
                          }}
                          title="Add C file or import files"
                          aria-label="Add C file or import files"
                          className="flex h-7 w-7 items-center justify-center border border-[#31506d] text-[#a4b7ca] hover:border-signal/70 hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                        >
                          <Icon
                            name="plus"
                            className="h-4 w-4"
                          />
                        </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setFilesRailCollapsed(
                            (value) =>
                              !value
                          )
                        }
                        aria-pressed={
                          filesRailCollapsed
                        }
                        title={
                          filesRailCollapsed
                            ? 'Expand C folders'
                            : 'Minimize C folders'
                        }
                        aria-label={
                          filesRailCollapsed
                            ? 'Expand C folders'
                            : 'Minimize C folders'
                        }
                        className="flex h-7 w-7 items-center justify-center border border-[#31506d] text-[#a4b7ca] hover:border-signal/70 hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                      >
                        <Icon
                          name={
                            filesRailCollapsed
                              ? 'expand'
                              : 'collapse'
                          }
                          className="h-4 w-4"
                        />
                      </button>
                    </div>
                  </div>

                  {!filesRailCollapsed && (
                    <div className="flex h-[calc(100%-44px)] min-h-0 flex-col overflow-y-auto px-2 py-2 lg:h-[calc(100%-50px)]">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="font-mono text-[7px] uppercase tracking-[.14em] text-[#728aa3]">
                          workspace folders
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setNewFolderName(
                              ''
                            )
                            setFolderError(
                              null
                            )
                            setShowAddFolder(
                              true
                            )
                          }}
                          className="font-mono text-[7px] uppercase tracking-[.08em] text-[#8ea4ba] hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                        >
                          + folder
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewFileName('')
                            setAddFileError(null)
                            setShowAddFile(true)
                          }}
                          className="font-mono text-[7px] uppercase tracking-[.08em] text-[#8ea4ba] hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                        >
                          + file
                        </button>
                      </div>

                      <div className="space-y-1">
                        {folders.map(
                          (folder) => {
                            const selected =
                              folder.id ===
                              activeFolderId

                            return (
                              <div
                                key={
                                  folder.id
                                }
                                className={`overflow-hidden ${
                                  isDropActive ? 'relative' : ''
                                }`}
                                onDragOver={(event) => {
                                  if (event.dataTransfer.types.includes('text/ciscode-file') || event.dataTransfer.types.includes('Files')) {
                                    event.preventDefault()
                                    event.dataTransfer.dropEffect = event.dataTransfer.types.includes('text/ciscode-file') ? 'move' : 'copy'
                                  }
                                }}
                                onDrop={(event) => void handleFolderDrop(event, folder.id)}
                                onContextMenu={(
                                  event
                                ) =>
                                  openContextMenu(
                                    event,
                                    'folder',
                                    folder.id,
                                    folder.name
                                  )
                                }
                              >
                                <div
                                  className={`flex min-h-9 items-center gap-1 border px-1 ${
                                    selected
                                      ? 'border-[#355777] bg-[#0d1b2b]'
                                      : 'border-transparent hover:border-[#263b55] hover:bg-[#0b1725]'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFolders(
                                        (
                                          current
                                        ) =>
                                          current.map(
                                            (
                                              item
                                            ) =>
                                              item.id ===
                                              folder.id
                                                ? {
                                                    ...item,
                                                    collapsed:
                                                      !item.collapsed,
                                                  }
                                                : item
                                          )
                                      )
                                    }
                                    aria-expanded={
                                      !folder.collapsed
                                    }
                                    aria-label={`${folder.collapsed ? 'Expand' : 'Collapse'} ${folder.name} folder`}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center text-[#879db3] hover:text-[#e4eef7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                                  >
                                    <Icon
                                      name="chevron"
                                      className={`h-3 w-3 transition-transform motion-reduce:transition-none ${
                                        folder.collapsed
                                          ? ''
                                          : 'rotate-90'
                                      }`}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveFolderId(
                                        folder.id
                                      )

                                      const first =
                                        folder
                                          .fileNames[0]

                                      if (first) {
                                        setLeftFileName(
                                          first
                                        )
                                        setRightFileName(
                                          null
                                        )
                                        setFocusedPane(
                                          'left'
                                        )
                                        editor.setActiveFileName(
                                          first
                                        )
                                      }
                                    }}
                                    className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                                  >
                                    <Icon
                                      name="folder"
                                      className={`h-4 w-4 ${
                                        selected
                                          ? 'text-signal'
                                          : 'text-[#8ea3b9]'
                                      }`}
                                    />

                                    <span
                                      className={`truncate font-body text-[11px] font-medium ${
                                        selected
                                          ? 'text-[#edf5ff]'
                                          : 'text-[#b0c1d2]'
                                      }`}
                                    >
                                      {folder.name}
                                    </span>

                                    <span className="ml-auto pr-1 font-mono text-[7px] text-[#6f87a0]">
                                      {
                                        folder
                                          .fileNames
                                          .length
                                      }
                                    </span>
                                  </button>

                                  {selected && (
                                    <span className="mr-1 h-1.5 w-1.5 rounded-full bg-signal" />
                                  )}
                                </div>

                                {!folder.collapsed && (
                                  <div className="ml-4 border-l border-[#263b55] py-1 pl-2">
                                    {folder
                                      .fileNames
                                      .length ===
                                    0 ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveFolderId(
                                            folder.id
                                          )
                                          setNewFileName(
                                            ''
                                          )
                                          setAddFileError(
                                            null
                                          )
                                          setShowAddFile(
                                            true
                                          )
                                        }}
                                        className="block w-full px-2 py-2 text-left font-mono text-[8px] text-[#7189a2] hover:text-[#dce8f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                                      >
                                        + add first
                                        file
                                      </button>
                                    ) : (
                                      folder
                                        .fileNames
                                        .map(
                                          (
                                            fileName
                                          ) => {
                                            const focused =
                                              selected &&
                                              fileName ===
                                                (focusedPane ===
                                                'right'
                                                  ? rightFileName
                                                  : leftFileName)

                                            return (
                                              <button
                                                key={
                                                  fileName
                                                }
                                                type="button"
                                                draggable
                                                onDragStart={(event) => {
                                                  event.dataTransfer.effectAllowed = 'move'
                                                  event.dataTransfer.setData('text/ciscode-file', fileName)
                                                }}
                                                onContextMenu={(
                                                  event
                                                ) =>
                                                  openContextMenu(
                                                    event,
                                                    'file',
                                                    `${folder.id}:${fileName}`,
                                                    fileName
                                                  )
                                                }
                                                onClick={() => {
                                                  setActiveFolderId(
                                                    folder.id
                                                  )

                                                  openFile(
                                                    fileName,
                                                    rightFileName
                                                      ? focusedPane
                                                      : 'left'
                                                  )
                                                }}
                                                className={`relative flex min-h-9 w-full items-center gap-2 border-l-2 px-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${
                                                  focused
                                                    ? 'border-signal bg-signal/[.08] text-[#f4f8fd]'
                                                    : 'border-transparent text-[#a4b7ca] hover:bg-white/[.025] hover:text-[#edf4fa]'
                                                }`}
                                              >
                                                <Icon
                                                  name={
                                                    fileName.endsWith(
                                                      '.h'
                                                    )
                                                      ? 'git-file'
                                                      : 'file'
                                                  }
                                                  className={`h-4 w-4 ${
                                                    focused
                                                      ? 'text-signal'
                                                      : 'text-[#839ab1]'
                                                  }`}
                                                />

                                                <span className="min-w-0 truncate font-mono text-[9px]">
                                                  {
                                                    fileName
                                                  }
                                                </span>
                                              </button>
                                            )
                                          }
                                        )
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  )}
                </aside>
              )}

              <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#060d16]">
                {language === 'c' ? (
                  <div className="flex h-10 shrink-0 items-center border-b border-[#263b55] bg-[#0b1725] px-2">
                    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                      {activeFolderFiles.map(
                        (fileName) => {
                          const active =
                            fileName ===
                              leftFileName ||
                            fileName ===
                              rightFileName

                          const focused =
                            fileName ===
                            (focusedPane ===
                            'right'
                              ? rightFileName
                              : leftFileName)

                          return (
                            <button
                              key={fileName}
                              type="button"
                              onClick={() =>
                                openFile(
                                  fileName,
                                  rightFileName
                                    ? focusedPane
                                    : 'left'
                                )
                              }
                              className={`group relative flex h-8 max-w-[180px] shrink-0 items-center gap-2 border px-3 font-mono text-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${
                                active
                                  ? 'border-[#3a536d] bg-[#060d16] text-[#edf5ff]'
                                  : 'border-transparent text-[#879db3] hover:bg-white/[.025] hover:text-[#e6eef6]'
                              }`}
                            >
                              <Icon
                                name={
                                  fileName.endsWith(
                                    '.h'
                                  )
                                    ? 'git-file'
                                    : 'file'
                                }
                                className={`h-3.5 w-3.5 ${
                                  focused
                                    ? 'text-signal'
                                    : 'text-[#7890a8]'
                                }`}
                              />

                              <span className="truncate">
                                {fileName}
                              </span>

                              {active && (
                                <span
                                  className={`absolute bottom-0 left-0 right-0 h-px ${
                                    focused
                                      ? 'bg-signal'
                                      : 'bg-[#6d8299]'
                                  }`}
                                />
                              )}
                            </button>
                          )
                        }
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setNewFileName(
                            ''
                          )
                          setAddFileError(
                            null
                          )
                          setShowAddFile(
                            true
                          )
                        }}
                        title="Add file to active C folder"
                        aria-label="Add file to active C folder"
                        className="flex h-8 w-8 shrink-0 items-center justify-center text-[#8da3ba] hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                      >
                        <Icon
                          name="plus"
                          className="h-4 w-4"
                        />
                      </button>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
                      <button
                        type="button"
                        onClick={openSplit}
                        disabled={
                          activeFolderFiles.length <
                          2
                        }
                        title="Split editor"
                        aria-label="Split editor"
                        className="flex h-7 w-7 items-center justify-center border border-[#35506c] text-[#8fa5bb] hover:border-[#7892aa] hover:text-[#eef5fb] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                      >
                        <Icon
                          name="split"
                          className="h-3.5 w-3.5"
                        />
                      </button>

                      {rightFileName && (
                        <button
                          type="button"
                          onClick={() => {
                            const left =
                              leftFileName

                            setLeftFileName(
                              rightFileName
                            )
                            setRightFileName(
                              left
                            )

                            setFocusedPane(
                              (current) =>
                                current ===
                                'left'
                                  ? 'right'
                                  : 'left'
                            )
                          }}
                          title="Swap editor panes"
                          aria-label="Swap editor panes"
                          className="flex h-7 w-7 items-center justify-center border border-[#35506c] text-[#8fa5bb] hover:text-[#eef5fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                        >
                          <Icon
                            name="swap"
                            className="h-3.5 w-3.5"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#263b55] bg-[#0b1725] px-3">
                    <div className="flex items-center gap-2">
                      <Icon
                        name="file"
                        className="h-4 w-4 text-signal"
                      />

                      <span className="font-mono text-[9px] text-[#e3edf6]">
                        {language === 'java'
                          ? JAVA_ENTRY_FILENAME
                          : 'script.sql'}
                      </span>
                    </div>

                    <span className="font-mono text-[6px] uppercase tracking-[.12em] text-[#7890a8]">
                      {selectedFont.label}
                    </span>
                  </div>
                )}

                {language === 'c' ? (
                  activeFolderFiles.length ===
                  0 ? (
                    <EmptyFolderState
                      folderName={
                        activeFolder?.name ??
                        'C folder'
                      }
                      onAddFile={() => {
                        setNewFileName('')
                        setAddFileError(null)
                        setShowAddFile(
                          true
                        )
                      }}
                    />
                  ) : rightFileName ? (
                    <div
                      ref={splitRef}
                      className="flex min-h-0 min-w-0 flex-1"
                    >
                      <div
                        className="flex min-w-0 flex-col"
                        style={{
                          width: `${splitRatio}%`,
                        }}
                      >
                        <Pane
                          fileName={
                            leftFileName
                          }
                          pane="left"
                          canClose={false}
                          onClose={() =>
                            undefined
                          }
                          onFocus={() => {
                            setFocusedPane(
                              'left'
                            )
                            editor.setActiveFileName(
                              leftFileName
                            )
                          }}
                          editor={editor}
                          theme={theme}
                          fontSize={
                            fontSize
                          }
                          fontFamily={
                            fontFamily
                          }
                          wordWrap={
                            wordWrap
                          }
                          workspaceFiles={
                            activeWorkspaceFiles
                          }
                        />
                      </div>

                      <ResizableDivider
                        ariaLabel="Resize C editor split"
                        onPointerDown={
                          resizeSplit
                        }
                        onKeyNudge={
                          nudgeSplit
                        }
                        onDoubleClick={() =>
                          setSplitRatio(
                            50
                          )
                        }
                      />

                      <div
                        className="flex min-w-0 flex-col"
                        style={{
                          width: `${
                            100 -
                            splitRatio
                          }%`,
                        }}
                      >
                        <Pane
                          fileName={
                            rightFileName
                          }
                          pane="right"
                          canClose
                          onClose={() => {
                            setRightFileName(
                              null
                            )
                            setFocusedPane(
                              'left'
                            )
                            editor.setActiveFileName(
                              leftFileName
                            )
                          }}
                          onFocus={() => {
                            if (!rightFileName) {
                              return
                            }

                            setFocusedPane(
                              'right'
                            )
                            editor.setActiveFileName(
                              rightFileName
                            )
                          }}
                          editor={editor}
                          theme={theme}
                          fontSize={
                            fontSize
                          }
                          fontFamily={
                            fontFamily
                          }
                          wordWrap={
                            wordWrap
                          }
                          workspaceFiles={
                            activeWorkspaceFiles
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <Pane
                      fileName={
                        leftFileName
                      }
                      pane="left"
                      canClose={false}
                      onClose={() =>
                        undefined
                      }
                      onFocus={() => {
                        setFocusedPane(
                          'left'
                        )
                        editor.setActiveFileName(
                          leftFileName
                        )
                      }}
                      editor={editor}
                      theme={theme}
                      fontSize={
                        fontSize
                      }
                      fontFamily={
                        fontFamily
                      }
                      wordWrap={
                        wordWrap
                      }
                      workspaceFiles={
                        activeWorkspaceFiles
                      }
                    />
                  )
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="relative min-h-0 flex-1 overflow-hidden bg-[#060d16]">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-25"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(92,145,202,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(92,145,202,.025) 1px, transparent 1px)',
                          backgroundSize:
                            '28px 28px',
                        }}
                      />

                      {language ===
                      'java' ? (
                        <CodeEditor
                          language="java"
                          value={javaCode}
                          onChange={
                            setJavaCode
                          }
                          theme={theme}
                          fontSize={
                            fontSize
                          }
                          fontFamily={
                            fontFamily
                          }
                          wordWrap={
                            wordWrap
                          }
                          editorKey="freestyle-java-main"
                        />
                      ) : (
                        <CodeEditor
                          language="sql"
                          value={sqlCode}
                          onChange={
                            setSqlCode
                          }
                          theme={theme}
                          fontSize={
                            fontSize
                          }
                          fontFamily={
                            fontFamily
                          }
                          wordWrap={
                            wordWrap
                          }
                          editorKey="freestyle-sql-script"
                        />
                      )}
                    </div>

                    <div className="flex h-7 shrink-0 items-center justify-between border-t border-[#263b55] bg-[#0b1420] px-4">
                      <span className="font-mono text-[7px] text-[#7b92a9]">
                        {language ===
                        'java'
                          ? JAVA_ENTRY_FILENAME
                          : 'script.sql'}
                      </span>

                      <span className="font-mono text-[7px] text-[#71889f]">
                        {selectedTheme.label}{' '}
                        · {fontSize}px · LF ·
                        UTF-8
                      </span>
                    </div>
                  </div>
                )}

                {language !== 'sql' && (
                  <div className="shrink-0 border-t border-[#263b55] bg-[#0b1725] px-4 py-3 lg:h-[137px]">
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="freestyle-stdin"
                        className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[.14em] text-[#9eafc1]"
                      >
                        <span className="text-signal">
                          &gt;_
                        </span>
                        stdin
                      </label>

                      <span className="font-mono text-[7px] uppercase tracking-[.12em] text-[#7289a1]">
                        optional
                      </span>
                    </div>

                    <textarea
                      id="freestyle-stdin"
                      value={stdin}
                      onChange={(event) =>
                        setStdin(
                          event.target.value
                        )
                      }
                      spellCheck={false}
                      className="block h-[62px] w-full resize-none border border-[#35506c] bg-[#060d16] px-3 py-2 font-mono text-[10px] leading-5 text-[#d8e3ed] caret-signal outline-none placeholder:text-[#607991] focus:border-signal/60 focus:ring-1 focus:ring-signal"
                      placeholder="Input passed to the program..."
                      aria-label="Program standard input"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {!outputCollapsed && (
            <div className="hidden lg:block">
              <ResizableDivider
                ariaLabel="Resize output panel"
                onPointerDown={
                  resizeOutput
                }
                onKeyNudge={
                  nudgeOutput
                }
                onDoubleClick={() =>
                  setOutputWidth(
                    DEFAULT_OUTPUT_WIDTH
                  )
                }
              />
            </div>
          )}

          {outputCollapsed ? (
            <button
              type="button"
              onClick={() =>
                setOutputCollapsed(false)
              }
              title="Expand output panel"
              aria-label="Expand output panel"
              className="flex h-10 shrink-0 items-center justify-center border-l border-[#263b55] bg-[#0b1725] text-[#8da3b9] hover:text-[#f0f6fc] lg:h-auto lg:w-9 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
            >
              <Icon name="expand" />
            </button>
          ) : (
            <section
              className="flex min-h-[240px] min-w-0 flex-1 flex-col border-t border-[#263b55] bg-[#060d16] lg:min-h-0 lg:flex-none lg:border-t-0 lg:w-[var(--output-width)]"
              style={
                {
                  '--output-width': `${outputWidth}px`,
                } as CSSProperties
              }
            >
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#263b55] bg-[#0b1725] px-4">
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" />

                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[11px] font-medium text-[#edf5ff]">
                      Output
                    </span>

                    <span className="font-mono text-[7px] uppercase tracking-[.13em] text-[#7890a8]">
                      {language === 'sql'
                        ? 'Result set'
                        : 'Console'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOutputCollapsed(true)
                  }
                  title="Collapse output panel"
                  aria-label="Collapse output panel"
                  className="flex h-7 w-7 items-center justify-center border border-[#35506c] text-[#8da3b9] hover:border-[#7892aa] hover:text-[#edf5fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                >
                  <Icon name="collapse" />
                </button>
              </div>

              <div className="relative min-h-0 flex-1 overflow-auto">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(92,145,202,.035) 1px, transparent 1px)',
                    backgroundSize:
                      '100% 28px',
                  }}
                />

                <div className="relative min-h-full p-5 font-mono text-[10px] leading-6">
                  {phase.kind ===
                    'idle' && (
                    <div className="pt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[#7890a8]">
                          $
                        </span>

                        <span className="text-[#9eafc1]">
                          waiting to run...
                        </span>
                      </div>

                      <p className="ml-5 mt-1 max-w-[340px] text-[8px] leading-5 text-[#607991]">
                        {language ===
                        'sql'
                          ? 'Run your script to see query results here.'
                          : 'Execute your source to see program output here.'}
                      </p>
                    </div>
                  )}

                  {(phase.kind ===
                    'submitted' ||
                    phase.kind ===
                      'running') && (
                    <div className="pt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-signal">
                          $
                        </span>

                        <span className="motion-safe:animate-pulse text-[#d0dbe5]">
                          {language ===
                          'sql'
                            ? 'running script...'
                            : 'compiling...'}
                        </span>
                      </div>
                    </div>
                  )}

                  {phase.kind ===
                    'result' && (
                    <div>
                      <div className="mb-5 flex items-center justify-between border-b border-[#263b55] pb-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-1.5 w-1.5 ${
                              isSuccessfulResult
                                ? 'bg-pass'
                                : 'bg-fail'
                            }`}
                          />

                          <span
                            className={`font-mono text-[8px] uppercase tracking-[.12em] ${
                              isSuccessfulResult
                                ? 'text-pass'
                                : 'text-fail'
                            }`}
                          >
                            {isSuccessfulResult
                              ? 'process completed'
                              : 'process exited'}
                          </span>
                        </div>

                        <span className="font-mono text-[7px] uppercase tracking-[.1em] text-[#748aa2]">
                          result
                        </span>
                      </div>

                      {language ===
                      'sql' ? (
                        sqlResults !==
                        null ? (
                          <SqlResultTables
                            results={
                              sqlResults
                            }
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-mono text-[10px] leading-6 text-[#d8e3ed]">
                            {
                              phase
                                .response
                                .output
                            }
                          </pre>
                        )
                      ) : (
                        <pre className="whitespace-pre-wrap font-mono text-[10px] leading-6 text-[#d8e3ed]">
                          {
                            phase.response
                              .output
                          }
                        </pre>
                      )}

                      <div className="mt-6 border-t border-[#263b55] pt-3">
                        <span className="text-[#7890a8]">
                          exit status{' '}
                        </span>

                        <span
                          className={
                            isSuccessfulResult
                              ? 'text-pass'
                              : 'text-fail'
                          }
                        >
                          {
                            phase.response
                              .status
                          }

                          {phase.response
                            .reason
                            ? ` (${phase.response.reason})`
                            : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {phase.kind ===
                    'error' && (
                    <div className="border-l-2 border-fail bg-fail/[.05] px-4 py-3">
                      <div className="mb-1 font-mono text-[8px] uppercase tracking-[.12em] text-fail">
                        execution error
                      </div>

                      <span className="font-mono text-[10px] leading-5 text-fail">
                        error:{' '}
                        {phase.message}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative flex h-7 shrink-0 items-center justify-between border-t border-[#263b55] bg-[#0b1420] px-5">
                <span className="font-mono text-[7px] uppercase tracking-[.08em] text-[#7890a8]">
                  {language === 'c'
                    ? 'C / GCC'
                    : language ===
                        'java'
                      ? 'JAVA / MAIN'
                      : 'SQL / SQLITE3'}
                </span>

                <span className="font-mono text-[7px] uppercase tracking-[.1em] text-[#7890a8]">
                  {phase.kind ===
                  'idle'
                    ? 'IDLE'
                    : phase.kind ===
                        'error'
                      ? 'ERROR'
                      : phase.kind ===
                          'result'
                        ? 'RESULT'
                        : 'RUNNING'}
                </span>

                <span className="absolute left-0 top-0 h-px w-[24%] bg-signal/50" />
              </div>
            </section>
          )}
        </div>
      </main>

      {contextMenu && (
        <div
          className="fixed z-[140] w-[190px] overflow-hidden border border-[#3b5874] bg-[#08111d] shadow-[0_18px_50px_rgba(0,0,0,.45)]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          role="menu"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <div className="border-b border-[#263b55] bg-[#0b1725] px-3 py-2">
            <div className="font-mono text-[7px] uppercase tracking-[.13em] text-[#7189a2]">
              {contextMenu.kind ===
              'folder'
                ? 'folder'
                : 'source file'}
            </div>

            <div className="mt-0.5 truncate font-mono text-[9px] text-[#e6eef6]">
              {contextMenu.name}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() =>
              startRename(
                contextMenu.kind,
                contextMenu.id,
                contextMenu.name
              )
            }
            className="flex h-10 w-full items-center gap-3 px-3 text-left font-mono text-[8px] uppercase tracking-[.08em] text-[#c4d3e1] hover:bg-[#102238] hover:text-[#f2f7fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
          >
            <Icon
              name="rename"
              className="h-4 w-4 text-[#8fa8c0]"
            />
            <span>
              Rename {contextMenu.kind === 'folder' ? 'folder' : 'file'}
            </span>
          </button>

          <div className="mx-3 h-px bg-[#263b55]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (
                contextMenu.kind ===
                'folder'
              ) {
                const folder =
                  folders.find(
                    (item) =>
                      item.id ===
                      contextMenu.id
                  )

                if (folder) {
                  downloadFolder(
                    folder
                  )
                }
              } else {
                const fileName =
                  contextMenu.name

                downloadFile(
                  fileName
                )
              }

              setContextMenu(null)
            }}
            className="flex h-10 w-full items-center gap-3 px-3 text-left font-mono text-[8px] uppercase tracking-[.08em] text-[#c4d3e1] hover:bg-[#102238] hover:text-[#f2f7fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
          >
            <Icon
              name={
                contextMenu.kind ===
                'folder'
                  ? 'archive'
                  : 'download'
              }
              className="h-4 w-4 text-[#8fa8c0]"
            />

            <span>
              {contextMenu.kind ===
              'folder'
                ? 'Download folder'
                : 'Download file'}
            </span>
          </button>

          <div className="mx-3 h-px bg-[#263b55]" />

          <button
            type="button"
            role="menuitem"
            onClick={() =>
              requestDelete(
                contextMenu.kind,
                contextMenu.id,
                contextMenu.name
              )
            }
            className="flex h-10 w-full items-center gap-3 px-3 text-left font-mono text-[8px] uppercase tracking-[.08em] text-[#c4574a] hover:bg-[#2a1517] hover:text-[#ff8074] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
          >
            <Icon
              name="trash"
              className="h-4 w-4"
            />

            <span>
              Delete{' '}
              {contextMenu.kind ===
              'folder'
                ? 'folder'
                : 'file'}
            </span>
          </button>
        </div>
      )}

      {importError && (
        <div className="fixed bottom-5 left-1/2 z-[160] -translate-x-1/2 border border-[#5c3032] bg-[#07111d] px-4 py-3" role="status">
          <span className="font-mono text-[9px] text-fail">
            {importError}
          </span>
          <button
            type="button"
            className="ml-4 font-mono text-[8px] uppercase text-[#9aaec0] hover:text-[#eef5fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
            onClick={() => setImportError(null)}
          >
            dismiss
          </button>
        </div>
      )}

      {renameTarget && (
        <div
          className="fixed inset-0 z-[145] flex items-center justify-center bg-[#02060c]/82 px-4 backdrop-blur-[4px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-item-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelRename()
            }
          }}
        >
          <div className="relative w-full max-w-[430px] overflow-hidden border border-[#345270] bg-[#07111d]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent" />
            <div className="flex items-center justify-between border-b border-[#263b55] bg-[#0b1725] px-5 py-4">
              <div>
                <div className="font-mono text-[7px] uppercase tracking-[.13em] text-[#7189a2]">
                  rename {renameTarget.kind}
                </div>
                <h2 id="rename-item-title" className="mt-1 font-display text-[14px] font-semibold text-[#edf5ff]">
                  Rename {renameTarget.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={cancelRename}
                aria-label="Close rename dialog"
                className="flex h-8 w-8 items-center justify-center text-[#8da0b5] hover:text-[#f0f6fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="p-5">
              <label htmlFor="rename-freestyle-item" className="mb-2 block font-mono text-[8px] uppercase tracking-[.12em] text-[#9aabbd]">
                new name
              </label>
              <input
                id="rename-freestyle-item"
                autoFocus
                value={renameName}
                onChange={(event) => {
                  setRenameName(event.target.value)
                  setRenameError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    renameItem()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelRename()
                  }
                }}
                spellCheck={false}
                className="h-11 w-full border border-[#35506d] bg-[#050c15] px-3 font-mono text-[11px] text-[#e8f1fa] outline-none focus:border-signal/70 focus:ring-1 focus:ring-signal/25"
              />
              {renameError && (
                <p className="mt-2 font-mono text-[9px] text-fail">
                  error: {renameError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#263b55] bg-[#0b1725] px-5 py-3">
              <button type="button" onClick={cancelRename} className="h-9 border border-[#35506d] px-4 font-mono text-[9px] uppercase tracking-[.08em] text-[#9aabbd] hover:border-[#6b86a0] hover:text-[#e5eef7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">
                Cancel
              </button>
              <button type="button" onClick={renameItem} className="h-9 bg-signal px-5 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-ink hover:bg-[#ffc12c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#02060c]/82 px-4 backdrop-blur-[4px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirmation-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDeleteTarget(null)
              setDeleteConfirmation('')
            }
          }}
        >
          <div className="relative w-full max-w-[460px] overflow-hidden border border-[#5c3032] bg-[#07111d] shadow-[0_24px_80px_rgba(0,0,0,.55)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c4574a] to-transparent" />

            <div className="border-b border-[#3b292d] bg-[#0b1725] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#63363a] bg-[#291519] text-[#e36b5e]">
                  <Icon
                    name="trash"
                    className="h-5 w-5"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      id="delete-confirmation-title"
                      className="font-display text-[14px] font-semibold text-[#f2f6fa]"
                    >
                      Delete{' '}
                      {deleteTarget.kind ===
                      'folder'
                        ? 'folder'
                        : 'file'}
                      ?
                    </h2>

                    <span className="font-mono text-[7px] uppercase tracking-[.13em] text-[#bd675f]">
                      destructive
                    </span>
                  </div>

                  <p className="mt-1 font-mono text-[8px] leading-5 text-[#8da0b4]">
                    {deleteTarget.kind ===
                    'folder'
                      ? 'This removes the folder and every C/H file inside it.'
                      : 'This removes this source file from the workspace.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="border border-[#3a4e62] bg-[#050c15] px-4 py-3">
                <div className="font-mono text-[7px] uppercase tracking-[.14em] text-[#7189a1]">
                  target
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <Icon
                    name={
                      deleteTarget.kind ===
                      'folder'
                        ? 'folder'
                        : deleteTarget.name.endsWith(
                            '.h'
                          )
                          ? 'git-file'
                          : 'file'
                    }
                    className="h-4 w-4 text-[#e36b5e]"
                  />

                  <span className="break-all font-mono text-[11px] font-medium text-[#e8f0f7]">
                    {deleteTarget.name}
                  </span>
                </div>
              </div>

              <label
                htmlFor="delete-confirmation-input"
                className="mt-5 mb-2 block font-mono text-[8px] uppercase tracking-[.12em] text-[#a5b5c5]"
              >
                type the exact name to confirm
              </label>

              <input
                id="delete-confirmation-input"
                autoFocus
                value={deleteConfirmation}
                onChange={(event) =>
                  setDeleteConfirmation(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter' &&
                    deleteNameMatches
                  ) {
                    event.preventDefault()
                    deleteConfirmedTarget()
                  }

                  if (
                    event.key ===
                    'Escape'
                  ) {
                    event.preventDefault()
                    setDeleteTarget(null)
                    setDeleteConfirmation('')
                  }
                }}
                spellCheck={false}
                placeholder={
                  deleteTarget.name
                }
                className={`h-11 w-full border bg-[#050c15] px-3 font-mono text-[11px] text-[#edf4fa] caret-signal outline-none placeholder:text-[#536b83] focus:ring-1 ${
                  deleteConfirmation.length > 0 &&
                  !deleteNameMatches
                    ? 'border-[#7b3b3d] focus:border-[#c4574a] focus:ring-[#c4574a]/20'
                    : deleteNameMatches
                      ? 'border-pass focus:border-pass focus:ring-pass/20'
                      : 'border-[#35506d] focus:border-[#c4574a]/70 focus:ring-[#c4574a]/20'
                }`}
              />

              <div className="mt-3 flex items-start gap-2">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 ${
                    deleteNameMatches
                      ? 'bg-pass'
                      : 'bg-[#647b91]'
                  }`}
                />

                <p className="font-mono text-[8px] leading-5 text-[#8298ae]">
                  {deleteNameMatches
                    ? 'Name verified. The delete action is unlocked.'
                    : 'This extra confirmation prevents an accidental right-click deletion.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#26313d] bg-[#0b1725] px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirmation('')
                }}
                className="h-9 border border-[#35506d] px-4 font-mono text-[9px] uppercase tracking-[.08em] text-[#9aabbd] hover:border-[#6b86a0] hover:text-[#e5eef7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                Keep it
              </button>

              <button
                type="button"
                disabled={
                  !deleteNameMatches
                }
                onClick={
                  deleteConfirmedTarget
                }
                className="flex h-9 items-center gap-2 bg-[#9f3f38] px-5 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-white transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal motion-reduce:transition-none"
              >
                <Icon
                  name="trash"
                  className="h-3.5 w-3.5"
                />

                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddFolder && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#02060c]/80 px-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-folder-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowAddFolder(false)
            }
          }}
        >
          <div className="relative w-full max-w-[430px] overflow-hidden border border-[#345270] bg-[#07111d]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent" />

            <div className="flex items-center justify-between border-b border-[#263b55] bg-[#0b1725] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-signal">
                    <Icon name="folder" />
                  </span>

                  <h2
                    id="add-folder-title"
                    className="font-display text-[14px] font-semibold text-[#edf5ff]"
                  >
                    New C folder
                  </h2>
                </div>

                <p className="mt-1 font-mono text-[8px] uppercase tracking-[.1em] text-[#8298af]">
                  isolated run workspace
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddFolder(false)
                }
                aria-label="Close add folder dialog"
                className="flex h-8 w-8 items-center justify-center text-[#8da0b5] hover:text-[#f0f6fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="bg-[#07111d] p-5">
              <label
                htmlFor="new-freestyle-folder"
                className="mb-2 block font-mono text-[8px] uppercase tracking-[.12em] text-[#9aabbd]"
              >
                folder name
              </label>

              <input
                id="new-freestyle-folder"
                autoFocus
                value={newFolderName}
                onChange={(event) => {
                  setNewFolderName(
                    event.target.value
                  )
                  setFolderError(null)
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                  ) {
                    event.preventDefault()
                    addFolder()
                  }

                  if (
                    event.key === 'Escape'
                  ) {
                    event.preventDefault()
                    setShowAddFolder(false)
                  }
                }}
                spellCheck={false}
                placeholder="utilities"
                className="h-11 w-full border border-[#35506d] bg-[#050c15] px-3 font-mono text-[11px] text-[#e8f1fa] caret-signal outline-none placeholder:text-[#61778f] focus:border-signal/70 focus:ring-1 focus:ring-signal/25"
              />

              <div className="mt-3 border-l border-signal/60 bg-signal/[.035] px-3 py-2">
                <p className="font-mono text-[8px] leading-5 text-[#8da1b6]">
                  A new <span className="text-[#d9e6f2]">main*.c</span> file is created with the C hello-world boilerplate.
                  <br />
                  Drop C/H files or a folder onto the workspace to import multiple files at once.
                </p>
              </div>

              {folderError && (
                <p className="mt-3 font-mono text-[9px] text-fail">
                  error: {folderError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#263b55] bg-[#0b1725] px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  setShowAddFolder(false)
                }
                className="h-9 border border-[#35506d] px-4 font-mono text-[9px] uppercase tracking-[.08em] text-[#9aabbd] hover:border-[#6b86a0] hover:text-[#e5eef7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addFolder}
                className="h-9 bg-signal px-5 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-ink hover:bg-[#ffc12c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                Create folder
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddFile && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02060c]/80 px-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-file-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowAddFile(false)
            }
          }}
        >
          <div className="relative w-full max-w-[430px] overflow-hidden border border-[#345270] bg-[#07111d]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent" />

            <div className="flex items-center justify-between border-b border-[#263b55] bg-[#0b1725] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-signal">
                    &gt;_
                  </span>

                  <h2
                    id="add-file-title"
                    className="font-display text-[14px] font-semibold text-[#edf5ff]"
                  >
                    New C file
                  </h2>
                </div>

                <p className="mt-1 font-mono text-[8px] uppercase tracking-[.1em] text-[#8298af]">
                  inside{' '}
                  {activeFolder?.name ??
                    'selected folder'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddFile(false)
                }
                aria-label="Close add file dialog"
                className="flex h-8 w-8 items-center justify-center text-[#8da0b5] hover:text-[#f0f6fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="bg-[#07111d] p-5">
              <label
                htmlFor="new-freestyle-file"
                className="mb-2 block font-mono text-[8px] uppercase tracking-[.12em] text-[#9aabbd]"
              >
                filename
              </label>

              <input
                id="new-freestyle-file"
                autoFocus
                value={newFileName}
                onChange={(event) => {
                  setNewFileName(
                    event.target.value
                  )
                  setAddFileError(null)
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                  ) {
                    event.preventDefault()
                    addFile()
                  }

                  if (
                    event.key === 'Escape'
                  ) {
                    event.preventDefault()
                    setShowAddFile(false)
                  }
                }}
                spellCheck={false}
                placeholder="utils.h"
                className="h-11 w-full border border-[#35506d] bg-[#050c15] px-3 font-mono text-[11px] text-[#e8f1fa] caret-signal outline-none placeholder:text-[#61778f] focus:border-signal/70 focus:ring-1 focus:ring-signal/25"
              />

              <div className="mt-3 border-l border-signal/60 bg-signal/[.035] px-3 py-2">
                <p className="font-mono text-[8px] leading-5 text-[#8fa3b8]">
                  allowed:{' '}
                  <span className="text-[#d9e6f2]">
                    .c
                  </span>{' '}
                  and{' '}
                  <span className="text-[#d9e6f2]">
                    .h
                  </span>{' '}
                  files only.
                  <br />
                  The file is added to the selected C folder and stays inside its run boundary.
                </p>
              </div>

              <div
                onDragEnter={(event) => {
                  event.preventDefault()
                  setIsAddFileDropActive(true)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'copy'
                  setIsAddFileDropActive(true)
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsAddFileDropActive(false)
                  }
                }}
                onDrop={(event) => void handleAddFileDrop(event)}
                className={`mt-4 flex min-h-[96px] cursor-copy flex-col items-center justify-center border border-dashed px-4 py-4 text-center transition-colors motion-reduce:transition-none ${
                  isAddFileDropActive
                    ? 'border-signal bg-signal/[.08] text-[#edf5ff]'
                    : 'border-[#35506d] bg-[#050c15] text-[#8197ad] hover:border-[#5b7691] hover:text-[#c9d7e4]'
                }`}
              >
                <Icon name="upload" className="mb-2 h-5 w-5" />
                <span className="font-mono text-[9px] uppercase tracking-[.1em]">
                  {isAddFileDropActive ? 'release to import' : 'or drag .c / .h files here'}
                </span>
                <span className="mt-1 font-mono text-[7px] text-[#647b92]">
                  multiple files and folders are supported
                </span>
              </div>

              {addFileError && (
                <p className="mt-3 font-mono text-[9px] text-fail">
                  error: {addFileError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#263b55] bg-[#0b1725] px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  setShowAddFile(false)
                }
                className="h-9 border border-[#35506d] px-4 font-mono text-[9px] uppercase tracking-[.08em] text-[#9aabbd] hover:border-[#6b86a0] hover:text-[#e5eef7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addFile}
                className="h-9 bg-signal px-5 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-ink hover:bg-[#ffc12c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                Create file
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
