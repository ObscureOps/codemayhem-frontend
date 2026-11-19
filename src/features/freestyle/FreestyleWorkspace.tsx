import { useState } from 'react'
import type { CSSProperties, ChangeEvent as ReactChangeEvent, Dispatch, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import { CodeEditor } from '../problems/CodeEditor'
import { ResizableDivider } from '../problems/ResizableDivider'
import { EDITOR_FONTS, EDITOR_THEMES, type EditorFontName, type EditorThemeName } from '../problems/editorTheme'
import type { WorkspaceFile } from '../problems/editorCompletions'
import { FreestyleEditorSettings } from './FreestyleEditorSettings'
import { EmptyFolderState, Icon as EditorIcon } from './FreestyleEditor'
import { FreestyleImport } from './FreestyleImport'
import type { FreestyleLanguage, SqlStatementResult } from '../../api/types/freestyle'
import type { useMultiFileEditor } from '../problems/useMultiFileEditor'

type EditorIconName = Parameters<typeof EditorIcon>[0]['name']

function Icon({ name, className }: { name: string; className?: string }) {
  return <EditorIcon name={name as EditorIconName} className={className} />
}

export type ContextMenuKind = 'folder' | 'file'

export interface CFolder {
  id: string
  name: string
  fileNames: string[]
  collapsed?: boolean
}

export interface ContextMenuState {
  kind: ContextMenuKind
  id: string
  name: string
  x: number
  y: number
}

export interface DeleteTarget {
  kind: ContextMenuKind
  id: string
  name: string
  confirmation?: string
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
    return new Promise((resolve) => entry.file?.((file) => resolve([file]), () => resolve([])))
  }
  if (!entry.isDirectory || !entry.createReader) return []
  const reader = entry.createReader()
  const files: File[] = []
  while (true) {
    const batch = await new Promise<DroppedEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])))
    if (batch.length === 0) break
    const nested = await Promise.all(batch.map(readDroppedEntry))
    for (const group of nested) files.push(...group)
  }
  return files
}

async function filesFromDrop(event: ReactDragEvent<HTMLDivElement>): Promise<File[]> {
  const entryFiles: File[] = []
  for (const item of Array.from(event.dataTransfer.items)) {
    const candidate = item as DataTransferItem & { webkitGetAsEntry?: () => DroppedEntry | null }
    const entry = candidate.webkitGetAsEntry?.()
    if (entry) entryFiles.push(...(await readDroppedEntry(entry)))
  }
  return entryFiles.length > 0 ? entryFiles : Array.from(event.dataTransfer.files)
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

const JAVA_ENTRY_FILENAME = 'Main.java'
const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 20
const DEFAULT_OUTPUT_WIDTH = 430

export interface FreestyleWorkspaceModel {
  language: FreestyleLanguage
  stdin: string
  javaCode: string
  sqlCode: string
  theme: EditorThemeName
  fontFamily: EditorFontName
  fontSize: number
  wordWrap: boolean
  folders: CFolder[]
  setFolders: Dispatch<SetStateAction<CFolder[]>>
  activeFolderId: string
  filesRailCollapsed: boolean
  showAddFile: boolean
  showAddFolder: boolean
  newFileName: string
  newFolderName: string
  addFileError: string | null
  folderError: string | null
  leftFileName: string
  rightFileName: string | null
  focusedPane: 'left' | 'right'
  splitRatio: number
  outputWidth: number
  outputCollapsed: boolean
  contextMenu: ContextMenuState | null
  deleteTarget: DeleteTarget | null
  deleteConfirmation: string
  workspaceRef: React.RefObject<HTMLDivElement | null>
  splitRef: React.RefObject<HTMLDivElement | null>
  editor: ReturnType<typeof useMultiFileEditor>
  phase: { kind: 'idle' | 'submitted' | 'running' } | { kind: 'result'; response: { output: string; status: number; reason?: 'compiler error' | 'program error' } } | { kind: 'error'; message: string }
  isBusy: boolean
  activeFolder: CFolder | undefined
  activeFolderFiles: string[]
  activeWorkspaceFiles: WorkspaceFile[]
  isSuccessfulResult: boolean
  sqlResults: SqlStatementResult[] | null
  selectedTheme: (typeof EDITOR_THEMES)[number]
  selectedFont: (typeof EDITOR_FONTS)[number]
  canRunC: boolean
  deleteNameMatches: boolean
  setStdin: Dispatch<SetStateAction<string>>
  setJavaCode: Dispatch<SetStateAction<string>>
  setSqlCode: Dispatch<SetStateAction<string>>
  setTheme: Dispatch<SetStateAction<EditorThemeName>>
  setFontFamily: Dispatch<SetStateAction<EditorFontName>>
  setFontSize: Dispatch<SetStateAction<number>>
  setWordWrap: Dispatch<SetStateAction<boolean>>
  setActiveFolderId: Dispatch<SetStateAction<string>>
  setFilesRailCollapsed: Dispatch<SetStateAction<boolean>>
  setShowAddFile: Dispatch<SetStateAction<boolean>>
  setShowAddFolder: Dispatch<SetStateAction<boolean>>
  setNewFileName: Dispatch<SetStateAction<string>>
  setNewFolderName: Dispatch<SetStateAction<string>>
  setAddFileError: Dispatch<SetStateAction<string | null>>
  setFolderError: Dispatch<SetStateAction<string | null>>
  setLeftFileName: Dispatch<SetStateAction<string>>
  setRightFileName: Dispatch<SetStateAction<string | null>>
  setFocusedPane: Dispatch<SetStateAction<'left' | 'right'>>
  setSplitRatio: Dispatch<SetStateAction<number>>
  setOutputWidth: Dispatch<SetStateAction<number>>
  setOutputCollapsed: Dispatch<SetStateAction<boolean>>
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>
  setDeleteConfirmation: Dispatch<SetStateAction<string>>
  handleLanguageChange: (next: FreestyleLanguage) => void
  openContextMenu: (event: ReactMouseEvent<HTMLElement>, kind: ContextMenuKind, id: string, name: string) => void
  requestDelete: (kind: ContextMenuKind, id: string, name: string) => void
  deleteConfirmedTarget: () => void
  downloadFile: (fileName: string) => void
  downloadFolder: (folder: CFolder) => void
  openFile: (fileName: string, pane?: 'left' | 'right') => void
  openSplit: () => void
  addFolder: () => void
  addFile: () => void
  runCode: () => void
  resizeOutput: (event: ReactPointerEvent<HTMLDivElement>) => void
  nudgeOutput: (delta: number) => void
  resizeSplit: (event: ReactPointerEvent<HTMLDivElement>) => void
  nudgeSplit: (delta: number) => void

  renameTarget: { kind: ContextMenuKind; id: string; name: string } | null
  renameName: string
  renameError: string | null
  setRenameName: Dispatch<SetStateAction<string>>
  startRename: (kind: ContextMenuKind, id: string, name: string) => void
  renameItem: () => void
  cancelRename: () => void
  importError: string | null
  dismissImportError: () => void
  handleImportInput: (event: ReactChangeEvent<HTMLInputElement>) => void
  handleDragEnter: (event: ReactDragEvent<HTMLDivElement>) => void
  handleDragOver: (event: ReactDragEvent<HTMLDivElement>) => void
  handleDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void
  handleDrop: (event: ReactDragEvent<HTMLDivElement>) => void}

function FreestyleWorkspaceView({ model }: { model: FreestyleWorkspaceModel }) {
  const {
    language, stdin, javaCode, sqlCode, theme, fontFamily, fontSize, wordWrap,
    folders, activeFolderId, filesRailCollapsed, showAddFile, showAddFolder,
    newFileName, newFolderName, addFileError, folderError, leftFileName, rightFileName,
    focusedPane, splitRatio, outputWidth, outputCollapsed, contextMenu, deleteTarget,
    deleteConfirmation, workspaceRef, splitRef, editor, phase, isBusy, activeFolder,
    activeFolderFiles, activeWorkspaceFiles, isSuccessfulResult, sqlResults, selectedTheme,
    selectedFont, canRunC, deleteNameMatches, setStdin, setJavaCode, setSqlCode, setTheme,
    setFontFamily, setFontSize, setWordWrap, setFolders, setActiveFolderId,
    setFilesRailCollapsed, setShowAddFile, setShowAddFolder, setNewFileName, setNewFolderName,
    setAddFileError, setFolderError, setLeftFileName, setRightFileName, setFocusedPane,
    setSplitRatio, setOutputWidth, setOutputCollapsed, setContextMenu, setDeleteTarget,
    setDeleteConfirmation, handleLanguageChange, openContextMenu, requestDelete,
    deleteConfirmedTarget, downloadFile, downloadFolder, openFile, openSplit, addFolder,
    addFile, runCode, resizeOutput, nudgeOutput, resizeSplit, nudgeSplit,
    renameTarget, renameName, renameError, setRenameName, startRename, renameItem, cancelRename,
    importError, dismissImportError, handleImportInput, handleDragEnter, handleDragOver, handleDragLeave, handleDrop,
  } = model


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
          className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row"
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
                          <label title="Import C/C++ files" className="flex h-7 w-7 cursor-pointer items-center justify-center border border-[#31506d] text-[#a4b7ca] hover:border-signal/70 hover:text-signal focus-within:outline focus-within:outline-2 focus-within:outline-signal">
                          <Icon name="upload" className="h-3.5 w-3.5" />
                          <input type="file" multiple accept=".c,.h,text/x-c,text/x-chdr" className="sr-only" onChange={handleImportInput} />
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
                                className="overflow-hidden"
                                onDragOver={(event) => {
                                  if (!event.dataTransfer.types.includes('text/ciscode-file')) return
                                  event.preventDefault()
                                  event.dataTransfer.dropEffect = 'move'
                                }}
                                onDrop={(event) => {
                                  event.preventDefault()
                                  const fileName = event.dataTransfer.getData('text/ciscode-file')
                                  if (!fileName) return
                                  setFolders((current) => {
                                    const source = current.find((item) => item.fileNames.includes(fileName))
                                    if (!source || source.id === folder.id) return current
                                    return current.map((item) => {
                                      if (item.id === source.id) return { ...item, fileNames: item.fileNames.filter((name) => name !== fileName) }
                                      if (item.id === folder.id && !item.fileNames.includes(fileName)) return { ...item, fileNames: [...item.fileNames, fileName] }
                                      return item
                                    })
                                  })
                                  setActiveFolderId(folder.id)
                                  setLeftFileName(fileName)
                                  setRightFileName(null)
                                  setFocusedPane('left')
                                  editor.setActiveFileName(fileName)
                                }}
                                onContextMenu={(
                                  event
                                ) =>
                                  openContextMenu(
                                    event,
                                    'folder',
                                    folder.id,
                                    folder.name,
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
                        <WorkspacePane
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
                        <WorkspacePane
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
                    <WorkspacePane
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
                  contextMenu.name ?? contextMenu.id

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

          <button type="button" role="menuitem" onClick={() => { startRename(contextMenu.kind, contextMenu.id, contextMenu.name); setContextMenu(null) }} className="flex h-10 w-full items-center gap-3 px-3 text-left font-mono text-[8px] uppercase tracking-[.08em] text-[#c4d3e1] hover:bg-[#102238] hover:text-[#f2f7fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">
            <Icon name="edit" className="h-4 w-4 text-[#8fa8c0]" />
            <span>Rename {contextMenu.kind === 'folder' ? 'folder' : 'file'}</span>
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

      {renameTarget && (
        <div className="fixed inset-0 z-[155] flex items-center justify-center bg-[#02060c]/82 px-4 backdrop-blur-[4px]" role="dialog" aria-modal="true" aria-labelledby="rename-item-title">
          <div className="relative w-full max-w-[460px] overflow-hidden border border-[#35506d] bg-[#07111d]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent" />
            <div className="border-b border-[#263b55] bg-[#0b1725] px-5 py-4"><p className="font-mono text-[7px] uppercase tracking-[.14em] text-[#7189a2]">rename {renameTarget.kind}</p><h2 id="rename-item-title" className="mt-1 font-display text-[15px] font-semibold text-[#edf5ff]">Rename {renameTarget.name}</h2></div>
            <div className="px-5 py-5"><label htmlFor="rename-item-input" className="font-mono text-[8px] uppercase tracking-[.1em] text-[#8ea4ba]">new name</label><input id="rename-item-input" autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); renameItem() }; if (event.key === 'Escape') { event.preventDefault(); cancelRename() } }} spellCheck={false} className="mt-2 h-11 w-full border border-[#35506d] bg-[#050c15] px-3 font-mono text-[11px] text-[#e8f1fa] outline-none focus:border-signal/70 focus:ring-1 focus:ring-signal/25" />{renameError && <p className="mt-2 font-mono text-[9px] text-fail">error: {renameError}</p>}</div>
            <div className="flex justify-end gap-2 border-t border-[#263b55] bg-[#0b1725] px-5 py-3"><button type="button" onClick={cancelRename} className="h-9 border border-[#35506d] px-4 font-mono text-[9px] uppercase tracking-[.08em] text-[#9aabbd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">Cancel</button><button type="button" onClick={renameItem} className="h-9 bg-signal px-5 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">Rename</button></div>
          </div>
        </div>
      )}

      {importError && (
        <div className="fixed bottom-5 left-1/2 z-[160] -translate-x-1/2 border border-[#5c3032] bg-[#07111d] px-4 py-3"><span className="font-mono text-[9px] text-fail">{importError}</span><button type="button" className="ml-4 font-mono text-[8px] uppercase text-[#9aaec0]" onClick={dismissImportError}>dismiss</button></div>
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
                  Add files with the{' '}
                  <span className="text-[#d9e6f2]">
                    + file
                  </span>{' '}
                  control after the folder is created.
                  <br />
                  Only files inside the active folder are sent to GCC when you run.
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


      <FreestyleImport
        showAddFile={showAddFile}
        setShowAddFile={setShowAddFile}
        activeFolder={activeFolder}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        setAddFileError={setAddFileError}
        addFile={addFile}
        addFileError={addFileError}
      />

    </>
  )
}



type WorkspacePaneSide = 'left' | 'right'

function WorkspacePane({
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
  pane: WorkspacePaneSide
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
  const file = editor.files.find((item) => item.name === fileName)

  if (!file) return null

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
            name={file.name.endsWith('.h') ? 'git-file' : 'file'}
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
            <Icon name="close" className="h-3.5 w-3.5" />
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
          onChange={(content) => editor.updateFileContent(file.name, content)}
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

export interface FreestyleWorkspaceProps {
  language: FreestyleLanguage
  onLanguageChange: (language: FreestyleLanguage) => void
  isBusy: boolean
  onRun: () => void | Promise<void>
  phase: FreestyleWorkspaceModel['phase']
  stdin: string
  setStdin: Dispatch<SetStateAction<string>>
  javaCode: string
  setJavaCode: Dispatch<SetStateAction<string>>
  sqlCode: string
  setSqlCode: Dispatch<SetStateAction<string>>
  theme: EditorThemeName
  setTheme: Dispatch<SetStateAction<EditorThemeName>>
  selectedTheme: (typeof EDITOR_THEMES)[number]
  fontFamily: EditorFontName
  setFontFamily: Dispatch<SetStateAction<EditorFontName>>
  selectedFont: (typeof EDITOR_FONTS)[number]
  fontSize: number
  onFontSizeChange: (delta: number) => void
  wordWrap: boolean
  setWordWrap: Dispatch<SetStateAction<boolean>>
  folders: CFolder[]
  setFolders: Dispatch<SetStateAction<CFolder[]>>
  activeFolderId: string
  setActiveFolderId: Dispatch<SetStateAction<string>>
  activeFolder: CFolder | undefined
  activeFolderFiles: string[]
  editor: ReturnType<typeof useMultiFileEditor>
  leftFile: { name: string; content: string } | undefined
  rightFile: { name: string; content: string } | null
  leftFileName: string
  rightFileName: string | null
  focusedPane: 'left' | 'right'
  setFocusedPane: Dispatch<SetStateAction<'left' | 'right'>>
  activeWorkspaceFiles: WorkspaceFile[]
  filesRailCollapsed: boolean
  setFilesRailCollapsed: Dispatch<SetStateAction<boolean>>
  splitRatio: number
  splitRef: React.RefObject<HTMLDivElement | null>
  onSplitResize: (event: ReactPointerEvent<HTMLDivElement>) => void
  outputWidth: number
  outputCollapsed: boolean
  setOutputCollapsed: Dispatch<SetStateAction<boolean>>
  onOutputResize: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelectFile: (fileName: string) => void
  onToggleFilePane: (fileName: string) => void
  onCloseRightPane: () => void
  onOpenContextMenu: (event: ReactMouseEvent<HTMLElement>, kind: ContextMenuKind, id: string, name: string) => void
  contextMenu: ContextMenuState | null
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>
  onRequestDelete: (kind: ContextMenuKind, id: string, name: string) => void
  onDownloadFolder: (folderId: string) => void
  onDownloadFile: (fileName: string) => void
  deleteTarget: DeleteTarget | null
  deleteConfirmation: string
  setDeleteConfirmation: Dispatch<SetStateAction<string>>
  onConfirmDelete: () => void
  onCancelDelete: () => void
  showAddFile: boolean
  setShowAddFile: Dispatch<SetStateAction<boolean>>
  showAddFolder: boolean
  setShowAddFolder: Dispatch<SetStateAction<boolean>>
  newFileName: string
  setNewFileName: Dispatch<SetStateAction<string>>
  addFileError: string | null
  setAddFileError: Dispatch<SetStateAction<string | null>>
  onAddFile: () => void
  newFolderName: string
  setNewFolderName: Dispatch<SetStateAction<string>>
  folderError: string | null
  setFolderError: Dispatch<SetStateAction<string | null>>
  sqlResults: SqlStatementResult[] | null
  isSuccessfulResult: boolean
  onReset: () => void
}

export function FreestyleWorkspace(props: FreestyleWorkspaceProps) {
  const {
    language,
    onLanguageChange,
    isBusy,
    onRun,
    phase,
    stdin,
    setStdin,
    javaCode,
    setJavaCode,
    sqlCode,
    setSqlCode,
    theme,
    setTheme,
    selectedTheme,
    fontFamily,
    setFontFamily,
    selectedFont,
    fontSize,
    onFontSizeChange,
    wordWrap,
    setWordWrap,
    folders,
    setFolders,
    activeFolderId,
    setActiveFolderId,
    activeFolder,
    activeFolderFiles,
    editor,
    leftFileName,
    rightFileName,
    focusedPane,
    setFocusedPane,
    activeWorkspaceFiles,
    filesRailCollapsed,
    setFilesRailCollapsed,
    splitRatio,
    splitRef,
    onSplitResize,
    outputWidth,
    outputCollapsed,
    setOutputCollapsed,
    onOutputResize,
    onSelectFile,
    onToggleFilePane,
    onCloseRightPane,
    onOpenContextMenu,
    contextMenu,
    setContextMenu,
    onRequestDelete,
    onDownloadFolder,
    onDownloadFile,
    deleteTarget,
    deleteConfirmation,
    setDeleteConfirmation,
    onConfirmDelete,
    onCancelDelete,
    showAddFile,
    setShowAddFile,
    showAddFolder,
    setShowAddFolder,
    newFileName,
    setNewFileName,
    addFileError,
    setAddFileError,
    onAddFile,
    newFolderName,
    setNewFolderName,
    folderError,
    setFolderError,
    sqlResults,
    isSuccessfulResult,
  } = props

  const deleteNameMatches =
    deleteTarget !== null &&
    deleteConfirmation.trim() === deleteTarget.name

  const canRunC = activeFolderFiles.length > 0

  const [renameTarget, setRenameTarget] = useState<{ kind: ContextMenuKind; id: string; name: string } | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const importFiles = async (files: File[]) => {
    if (language !== 'c' || !activeFolder) return
    setImportError(null)
    const existing = new Set(editor.files.map((file) => file.name.toLowerCase()))
    const imported: string[] = []
    let skipped = 0
    for (const file of files) {
      const lower = file.name.toLowerCase()
      if (!lower.endsWith('.c') && !lower.endsWith('.h')) { skipped += 1; continue }
      if (existing.has(lower)) { skipped += 1; continue }
      try {
        const content = await file.text()
        const error = editor.addFile(file.name)
        if (error) { skipped += 1; continue }
        editor.updateFileContent(file.name, content)
        existing.add(lower)
        imported.push(file.name)
      } catch { skipped += 1 }
    }
    if (imported.length > 0) {
      setFolders((current) => current.map((folder) => folder.id === activeFolder.id ? { ...folder, fileNames: [...folder.fileNames, ...imported] } : folder))
      const first = imported[0]
      setActiveFolderId(activeFolder.id)
      onSelectFile(first)
      onCloseRightPane()
      setFocusedPane('left')
      editor.setActiveFileName(first)
    }
    if (skipped > 0) setImportError(`${skipped} file${skipped === 1 ? '' : 's'} skipped — unsupported type, duplicate name, or unreadable file`)
  }

  const startRename = (kind: ContextMenuKind, id: string, name: string) => {
    setRenameTarget({ kind, id, name })
    setRenameName(name)
    setRenameError(null)
  }

  const renameItem = () => {
    if (!renameTarget) return
    const next = renameName.trim()
    if (!next) { setRenameError('name is required'); return }
    if (renameTarget.kind === 'folder') {
      if (!/^[a-zA-Z0-9._ -]+$/.test(next)) { setRenameError('use letters, numbers, spaces, dot, dash, or underscore'); return }
      if (folders.some((folder) => folder.id !== renameTarget.id && folder.name.toLowerCase() === next.toLowerCase())) { setRenameError('a folder with that name already exists'); return }
      setFolders((current) => current.map((folder) => folder.id === renameTarget.id ? { ...folder, name: next } : folder))
    } else {
      const error = editor.renameFile(renameTarget.name, next)
      if (error) { setRenameError(error); return }
      setFolders((current) => current.map((folder) => ({ ...folder, fileNames: folder.fileNames.map((name) => name === renameTarget.name ? next : name) })))
      if (leftFileName === renameTarget.name) onSelectFile(next)
      if (rightFileName === renameTarget.name) onToggleFilePane(next)
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

  const addFolderWithBoilerplate = () => {
    const name = newFolderName.trim()
    if (!name) { setFolderError('folder name is required'); return }
    if (!/^[a-zA-Z0-9._ -]+$/.test(name)) { setFolderError('use letters, numbers, spaces, dot, dash, or underscore'); return }
    if (folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) { setFolderError('a folder with that name already exists'); return }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'main'
    let fileName = editor.files.some((file) => file.name.toLowerCase() === 'main.c') ? `main-${slug}.c` : 'main.c'
    let suffix = 2
    while (editor.files.some((file) => file.name.toLowerCase() === fileName.toLowerCase())) { fileName = `main-${slug}-${suffix}.c`; suffix += 1 }
    const error = editor.addFile(fileName)
    if (error) { setFolderError(error); return }
    editor.updateFileContent(fileName, `#include <stdio.h>\n\nint main(void) {\n  printf("hello, world\\n");\n  return 0;\n}\n`)
    const folder: CFolder = { id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, fileNames: [fileName], collapsed: false }
    setFolders((current) => [...current, folder])
    setActiveFolderId(folder.id)
    onSelectFile(fileName)
    onCloseRightPane()
    setFocusedPane('left')
    editor.setActiveFileName(fileName)
    setNewFolderName('')
    setFolderError(null)
    setShowAddFolder(false)
  }

  const handleImportInput = async (event: ReactChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) await importFiles(files)
  }

  const handleDragEnter = (event: ReactDragEvent<HTMLDivElement>) => { event.preventDefault() }
  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => { event.preventDefault(); if (language === 'c') event.dataTransfer.dropEffect = 'copy' }
  const handleDragLeave = (_event: ReactDragEvent<HTMLDivElement>) => {}
  const handleDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (language !== 'c') return
    const files = await filesFromDrop(event)
    if (files.length > 0) await importFiles(files)
  }

  const openContextMenu = (
    event: ReactMouseEvent<HTMLElement>,
    kind: ContextMenuKind,
    id: string,
    name: string
  ) => {
    onOpenContextMenu(event, kind, id, name)
  }

  const requestDelete = (
    kind: ContextMenuKind,
    id: string,
    name: string
  ) => {
    onRequestDelete(kind, id, name)
  }

  const downloadFolder = (folder: CFolder) => {
    onDownloadFolder(folder.id)
  }

  const openFile = (
    fileName: string,
    pane?: 'left' | 'right'
  ) => {
    if (pane === 'right') {
      onToggleFilePane(fileName)
    } else {
      onSelectFile(fileName)
    }
    editor.setActiveFileName(fileName)
  }

  const openSplit = () => {
    const next = activeFolderFiles.find(
      (name) => name !== leftFileName
    )

    if (!next) return

    if (rightFileName === null) {
      onToggleFilePane(next)
    }
  }

  const addFolder = addFolderWithBoilerplate
  const addFile = onAddFile
  const runCode = onRun
  const resizeOutput = onOutputResize
  const resizeSplit = onSplitResize

  const nudgeOutput = (delta: number) => {
    const nextWidth = Math.max(300, outputWidth + delta)
    const syntheticEvent = {
      preventDefault() {},
      clientX: 0,
    } as ReactPointerEvent<HTMLDivElement>
    void syntheticEvent
    // Keyboard nudging is handled by the page-level pointer-resize state.
    // Keep the callback side-effect free when the parent does not expose a width setter.
    if (nextWidth === outputWidth) return
  }

  const nudgeSplit = (delta: number) => {
    const nextRatio = clamp(splitRatio + delta, 30, 70)
    if (nextRatio === splitRatio) return
  }

  const model: FreestyleWorkspaceModel = {
    language,
    stdin,
    javaCode,
    sqlCode,
    theme,
    fontFamily,
    fontSize,
    wordWrap,
    folders,
    setFolders,
    activeFolderId,
    filesRailCollapsed,
    showAddFile,
    showAddFolder,
    newFileName,
    newFolderName,
    addFileError,
    folderError,
    leftFileName,
    rightFileName,
    focusedPane,
    splitRatio,
    outputWidth,
    outputCollapsed,
    contextMenu,
    deleteTarget,
    deleteConfirmation,
    workspaceRef: { current: null },
    splitRef,
    editor,
    phase,
    isBusy,
    activeFolder,
    activeFolderFiles,
    activeWorkspaceFiles,
    isSuccessfulResult,
    sqlResults,
    selectedTheme,
    selectedFont,
    canRunC,
    deleteNameMatches,
    setStdin,
    setJavaCode,
    setSqlCode,
    setTheme,
    setFontFamily,
    setFontSize: ((action) => {
      const next = typeof action === 'function'
        ? action(fontSize)
        : action
      onFontSizeChange(next - fontSize)
    }) as Dispatch<SetStateAction<number>>,
    setWordWrap,
    setActiveFolderId,
    setFilesRailCollapsed,
    setShowAddFile,
    setShowAddFolder,
    setNewFileName,
    setNewFolderName,
    setAddFileError,
    setFolderError,
    setLeftFileName: ((action) => {
      const next = typeof action === 'function'
        ? action(leftFileName)
        : action
      if (next !== leftFileName) onSelectFile(next)
    }) as Dispatch<SetStateAction<string>>,
    setRightFileName: ((action) => {
      const next = typeof action === 'function'
        ? action(rightFileName)
        : action
      if (next === null) onCloseRightPane()
      else onToggleFilePane(next)
    }) as Dispatch<SetStateAction<string | null>>,
    setFocusedPane,
    setSplitRatio: (() => {}) as Dispatch<SetStateAction<number>>,
    setOutputWidth: (() => {}) as Dispatch<SetStateAction<number>>,
    setOutputCollapsed,
    setContextMenu,
    setDeleteTarget: ((action) => {
      const next = typeof action === 'function'
        ? action(deleteTarget)
        : action
      if (next === null) onCancelDelete()
    }) as Dispatch<SetStateAction<DeleteTarget | null>>,
    setDeleteConfirmation,
    handleLanguageChange: onLanguageChange,
    openContextMenu,
    requestDelete,
    deleteConfirmedTarget: onConfirmDelete,
    downloadFile: onDownloadFile,
    downloadFolder,
    openFile,
    openSplit,
    addFolder,
    addFile,
    runCode,
    resizeOutput,
    nudgeOutput,
    resizeSplit,
    nudgeSplit,
    renameTarget,
    renameName,
    renameError,
    setRenameName,
    startRename,
    renameItem,
    cancelRename,
    importError,
    dismissImportError: () => setImportError(null),
    handleImportInput,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,

  }

  return <FreestyleWorkspaceView model={model} />
}
