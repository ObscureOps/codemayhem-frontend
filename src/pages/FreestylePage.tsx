import { useState } from 'react'
import { useMultiFileEditor } from '../features/problems/useMultiFileEditor'
import { useFreestyleRun } from '../features/freestyle/useFreestyleRun'
import type {
  FreestyleLanguage,
  GCCRequest,
  JavaRequest,
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

// Backend/sandbox constraint:
// Java freestyle is single-file and the entry class must remain Main.
const JAVA_ENTRY_FILENAME = 'Main.java'

function TerminalMark() {
  return (
    <div className="cyber-terminal-mark">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-[19px] w-[19px]"
      >
        <path
          d="M4 5.5h16v13H4z"
          stroke="currentColor"
          strokeWidth="1.35"
        />
        <path
          d="m7 9 2.5 2L7 13M11.5 13H15"
          stroke="currentColor"
          strokeWidth="1.35"
        />
      </svg>
    </div>
  )
}

function FileIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={`h-[17px] w-[17px] shrink-0 ${
        active ? 'text-signal' : 'text-graphite'
      }`}
    >
      <path
        d="M6.5 3.5h7l4 4v13h-11z"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M13.5 3.5v4h4"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M9 12h6M9 15.5h6"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
    >
      <path
        d="M3.5 6.5h6l1.7 2h9.3v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M3.5 8.5h17"
        stroke="currentColor"
        strokeWidth="1.35"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function RunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-[11px] w-[11px]"
    >
      <path d="m8 5 11 7-11 7z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[11px] w-[11px]"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function FreestylePage() {
  const [language, setLanguage] =
    useState<FreestyleLanguage>('c')

  const [stdin, setStdin] = useState('')
  const [javaCode, setJavaCode] =
    useState(DEFAULT_JAVA_CODE)

  /*
   * Existing frontend editor logic.
   * DO NOT replace with another file-management system.
   */
  const editor =
    useMultiFileEditor(DEFAULT_C_CODE)

  /*
   * Existing execution state machine.
   * Backend behavior remains untouched.
   */
  const { phase, run, reset } =
    useFreestyleRun()

  /*
   * UI-only state used to collect the filename
   * before calling editor.addFile(name).
   */
  const [showAddFile, setShowAddFile] =
    useState(false)

  const [newFileName, setNewFileName] =
    useState('')

  const [addFileError, setAddFileError] =
    useState<string | null>(null)

  const activeCFile =
    editor.files.find(
      (file) =>
        file.name === editor.activeFileName,
    ) ?? editor.files[0]

  const isBusy =
    phase.kind === 'submitted' ||
    phase.kind === 'running'

  /*
   * Switching language is UI state.
   * Existing execution behavior remains untouched.
   */
  const handleLanguageChange = (
    next: FreestyleLanguage,
  ) => {
    if (next === language) return

    setLanguage(next)

    if (next === 'c') {
      editor.resetFiles(DEFAULT_C_CODE)
    }

    reset()

    setShowAddFile(false)
    setNewFileName('')
    setAddFileError(null)
  }

  /*
   * Open the Add File UI.
   */
  const handleOpenAddFile = () => {
    setNewFileName('')
    setAddFileError(null)
    setShowAddFile(true)
  }

  /*
   * Close the Add File UI.
   */
  const handleCloseAddFile = () => {
    setShowAddFile(false)
    setNewFileName('')
    setAddFileError(null)
  }

  /*
   * IMPORTANT:
   *
   * useMultiFileEditor expects:
   *
   * addFile(name: string)
   *
   * The old UI incorrectly passed the click event
   * directly into addFile.
   *
   * We now collect the filename and pass the string.
   *
   * Validation itself remains inside useMultiFileEditor.
   */
  const handleConfirmAddFile = () => {
    const name = newFileName.trim()

    if (!name) {
      setAddFileError('enter a filename')
      return
    }

    const error = editor.addFile(name)

    if (error) {
      setAddFileError(error)
      return
    }

    setShowAddFile(false)
    setNewFileName('')
    setAddFileError(null)
  }

  /*
   * Existing backend request construction.
   * No API behavior has been changed.
   */
  const handleRun = () => {
    if (language === 'c') {
      const sources: Record<string, string> = {}
      const headers: Record<string, string> = {}

      for (const file of editor.files) {
        if (file.name.endsWith('.h')) {
          headers[file.name] = file.content
        } else {
          sources[file.name] = file.content
        }
      }

      const req: GCCRequest = {
        sources,
        headers:
          Object.keys(headers).length > 0
            ? headers
            : undefined,
        stdin: stdin || undefined,
      }

      run('c', req)
      return
    }

    /*
     * Java backend expects Main.java.
     */
    const req: JavaRequest = {
      sources: {
        [JAVA_ENTRY_FILENAME]: javaCode,
      },
      stdin: stdin || undefined,
    }

    run('java', req)
  }

  const isSuccessfulResult =
    phase.kind === 'result' &&
    phase.response.status === 0 &&
    !phase.response.reason

  return (
    <>
      {/*
       * Freestyle intentionally fills the available page area.
       *
       * md:left-56 corresponds to the existing navigation rail.
       * This does not modify AppShell or any other page.
       */}
      <main
        className="
          fixed
          inset-x-0
          top-0
          bottom-16
          z-10
          flex
          min-h-0
          min-w-0
          flex-col
          overflow-hidden
          bg-[#070a0f]
          text-chalk
          md:bottom-0
          md:left-56
        "
      >
        {/* =====================================================
            BACKGROUND
            ===================================================== */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 82% 0%, rgba(255,177,0,0.07), transparent 23%), radial-gradient(circle at 8% 100%, rgba(255,177,0,0.035), transparent 22%)',
          }}
        />

        {/* =====================================================
            TOP COMMAND BAR
            ===================================================== */}

        <header className="cyber-topbar relative z-20 flex h-[78px] shrink-0 items-center justify-between overflow-hidden border-b border-[#303945] bg-[#080c12] px-5 lg:px-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[34%] top-0 h-full w-px bg-[#27313d]/50"
          />

          <div className="relative flex min-w-0 items-center gap-4">
            <TerminalMark />

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate font-display text-[17px] font-semibold tracking-[0.01em] text-[#e8e5dd]">
                  Freestyle
                </h1>

                <span className="border border-[#46505d] px-2 py-[4px] font-mono text-[8px] uppercase tracking-[0.14em] text-[#69727d]">
                  playground
                </span>
              </div>

              <p className="mt-[3px] font-mono text-[8px] uppercase tracking-[0.1em] text-[#515b67]">
                write / execute / inspect
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {/* LANGUAGE */}

            <div
              className="flex border border-[#39434f]"
              role="radiogroup"
              aria-label="Programming language"
            >
              <button
                type="button"
                role="radio"
                aria-checked={language === 'c'}
                onClick={() =>
                  handleLanguageChange('c')
                }
                className={`h-[40px] min-w-[58px] px-4 font-mono text-[10px] uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1 ${
                  language === 'c'
                    ? 'bg-signal text-ink'
                    : 'bg-[#080c12] text-[#7a838e] hover:bg-white/[0.025] hover:text-[#e8e5dd]'
                }`}
              >
                C
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={language === 'java'}
                onClick={() =>
                  handleLanguageChange('java')
                }
                className={`h-[40px] min-w-[58px] px-4 font-mono text-[10px] uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1 ${
                  language === 'java'
                    ? 'bg-signal text-ink'
                    : 'bg-[#080c12] text-[#7a838e] hover:bg-white/[0.025] hover:text-[#e8e5dd]'
                }`}
              >
                JAVA
              </button>
            </div>

            {/* RUN */}

            <button
              type="button"
              disabled={isBusy}
              onClick={handleRun}
              className="flex h-[40px] min-w-[91px] items-center justify-center gap-2 bg-signal px-5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1"
            >
              <RunIcon />

              {isBusy
                ? 'RUNNING'
                : 'Run'}
            </button>
          </div>
        </header>

        {/* =====================================================
            WORKSPACE
            ===================================================== */}

        <div className="relative z-10 grid min-h-0 min-w-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(380px,1fr)]">
          {/* ===================================================
              LEFT SOURCE WORKSPACE
              =================================================== */}

          <section className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_137px] bg-[#080c11]">
            {/* =================================================
                EDITOR AREA
                ================================================= */}

            <div className="flex min-h-0 min-w-0">
              {/* FILE RAIL */}

              <aside className="hidden w-[68px] shrink-0 flex-col border-r border-[#303945] bg-[#0b1016] sm:flex">
                <div className="flex h-[49px] items-center justify-center border-b border-[#303945] text-[#626b76]">
                  <FolderIcon />
                </div>

                <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto py-2">
                  {language === 'c' &&
                    editor.files.map(
                      (file) => {
                        const active =
                          file.name ===
                          editor.activeFileName

                        return (
                          <button
                            key={file.name}
                            type="button"
                            title={file.name}
                            aria-label={`Open ${file.name}`}
                            onClick={() =>
                              editor.setActiveFileName(
                                file.name,
                              )
                            }
                            className={`relative flex h-[52px] w-full items-center justify-center border-y border-transparent focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${
                              active
                                ? 'bg-signal/[0.055] text-signal'
                                : 'text-[#59636e] hover:bg-white/[0.025] hover:text-[#c6c9c8]'
                            }`}
                          >
                            {active && (
                              <span className="absolute bottom-[7px] left-0 top-[7px] w-[2px] bg-signal shadow-[0_0_9px_rgba(255,177,0,0.45)]" />
                            )}

                            <FileIcon
                              active={active}
                            />
                          </button>
                        )
                      },
                    )}

                  {language === 'java' && (
                    <div className="relative flex h-[52px] w-full items-center justify-center bg-signal/[0.055] text-signal">
                      <span className="absolute bottom-[7px] left-0 top-[7px] w-[2px] bg-signal shadow-[0_0_9px_rgba(255,177,0,0.45)]" />

                      <FileIcon active />
                    </div>
                  )}
                </div>

                {/* ADD FILE */}

                {language === 'c' && (
                  <button
                    type="button"
                    title="Add C or header file"
                    aria-label="Add C or header file"
                    onClick={handleOpenAddFile}
                    className="mx-auto mb-4 flex h-[36px] w-[36px] cursor-pointer items-center justify-center border border-[#46505c] bg-transparent text-[#6b747f] hover:border-signal/70 hover:bg-signal/[0.04] hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                  >
                    <PlusIcon />
                  </button>
                )}
              </aside>

              {/* DOCUMENT */}

              <div className="flex min-w-0 flex-1 flex-col bg-[#070a0f]">
                {/* FILE TABS */}

                <div className="flex h-[49px] shrink-0 border-b border-[#303945] bg-[#0c1117]">
                  {language === 'c' ? (
                    <>
                      {editor.files.map(
                        (file) => {
                          const active =
                            file.name ===
                            editor.activeFileName

                          return (
                            <div
                              key={file.name}
                              className={`group relative flex h-full min-w-[137px] max-w-[205px] items-center border-r border-[#303945] ${
                                active
                                  ? 'bg-[#070a0f]'
                                  : 'bg-[#0c1117]'
                              }`}
                            >
                              {active && (
                                <span className="absolute bottom-0 left-0 right-0 h-px bg-signal shadow-[0_0_7px_rgba(255,177,0,0.3)]" />
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  editor.setActiveFileName(
                                    file.name,
                                  )
                                }
                                className="flex min-w-0 flex-1 items-center gap-2 px-4 text-left font-mono text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-inset"
                              >
                                <FileIcon
                                  active={active}
                                />

                                <span
                                  className={`truncate ${
                                    active
                                      ? 'text-[#ddd9d0]'
                                      : 'text-[#68717c]'
                                  }`}
                                >
                                  {file.name}
                                </span>
                              </button>

                              {file.name !==
                                'main.c' && (
                                <button
                                  type="button"
                                  title={`Close ${file.name}`}
                                  aria-label={`Close ${file.name}`}
                                  onClick={() =>
                                    editor.closeFile(
                                      file.name,
                                    )
                                  }
                                  className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center text-[#58616c] opacity-0 hover:bg-white/[0.035] hover:text-[#d7d5ce] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
                                >
                                  <CloseIcon />
                                </button>
                              )}
                            </div>
                          )
                        },
                      )}

                      {/* ADD FILE */}

                      <button
                        type="button"
                        title="New file"
                        aria-label="New file"
                        onClick={handleOpenAddFile}
                        className="flex h-full w-[48px] shrink-0 cursor-pointer items-center justify-center border-r border-[#303945] text-[#626c77] hover:bg-white/[0.025] hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-inset"
                      >
                        <PlusIcon />
                      </button>
                    </>
                  ) : (
                    <div className="relative flex h-full min-w-[154px] items-center gap-2 border-r border-[#303945] bg-[#070a0f] px-4">
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-signal shadow-[0_0_7px_rgba(255,177,0,0.3)]" />

                      <FileIcon active />

                      <span className="font-mono text-[10px] text-[#ddd9d0]">
                        {JAVA_ENTRY_FILENAME}
                      </span>
                    </div>
                  )}

                  <div className="ml-auto hidden items-center px-5 font-mono text-[7px] uppercase tracking-[0.15em] text-[#4c5662] md:flex">
                    {language === 'c'
                      ? 'C / GCC WORKSPACE'
                      : 'JAVA / MAIN'}
                  </div>
                </div>

                {/* CODE EDITOR */}

                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.22]"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
                      backgroundSize:
                        '28px 28px',
                    }}
                  />

                  <div className="pointer-events-none absolute left-0 top-0 h-[13px] w-[13px] border-l border-t border-signal/45" />

                  <div className="pointer-events-none absolute bottom-0 right-0 h-[13px] w-[13px] border-b border-r border-signal/30" />

                  <span className="pointer-events-none absolute right-5 top-4 z-10 font-mono text-[8px] uppercase tracking-[0.12em] text-[#343c46]">
                    {language === 'c'
                      ? 'C'
                      : 'JAVA'}
                  </span>

                  {language === 'c' ? (
                    <textarea
                      value={
                        activeCFile?.content ??
                        ''
                      }
                      onChange={(event) =>
                        editor.updateActiveFileContent(
                          event.target.value,
                        )
                      }
                      spellCheck={false}
                      className="relative z-[1] block h-full min-h-[300px] w-full resize-none bg-transparent px-5 py-5 font-mono text-[13px] leading-[1.85] text-[#d8d5ce] caret-signal outline-none selection:bg-signal/20 placeholder:text-[#424a54] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-signal"
                      aria-label={`${activeCFile?.name ?? 'main.c'} source`}
                    />
                  ) : (
                    <textarea
                      value={javaCode}
                      onChange={(event) =>
                        setJavaCode(
                          event.target.value,
                        )
                      }
                      spellCheck={false}
                      className="relative z-[1] block h-full min-h-[300px] w-full resize-none bg-transparent px-5 py-5 font-mono text-[13px] leading-[1.85] text-[#d8d5ce] caret-signal outline-none selection:bg-signal/20 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-signal"
                      aria-label="Main.java source"
                    />
                  )}
                </div>

                {/* EDITOR STATUS */}

                <div className="flex h-[28px] shrink-0 items-center justify-between border-t border-[#303945] bg-[#0b0f14] px-4">
                  <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[#505a66]">
                    {language === 'c'
                      ? activeCFile?.name ??
                        'main.c'
                      : JAVA_ENTRY_FILENAME}
                  </span>

                  <span className="font-mono text-[7px] text-[#3c444e]">
                    LF · UTF-8
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                STDIN
                ================================================= */}

            <div className="border-t border-[#303945] bg-[#0c1117] px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="freestyle-stdin"
                  className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#66717d]"
                >
                  <span className="text-signal">
                    &gt;_
                  </span>

                  stdin
                </label>

                <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#414a55]">
                  optional
                </span>
              </div>

              <textarea
                id="freestyle-stdin"
                value={stdin}
                onChange={(event) =>
                  setStdin(event.target.value)
                }
                spellCheck={false}
                className="block h-[62px] w-full resize-none border border-[#38424d] bg-[#080c11] px-3 py-2 font-mono text-[10px] leading-5 text-[#d2d0c9] caret-signal outline-none placeholder:text-[#3d4651] focus:border-signal/60 focus:ring-1 focus:ring-signal"
                placeholder="Input passed to the program..."
                aria-label="Program standard input"
              />
            </div>
          </section>

          {/* ===================================================
              RIGHT OUTPUT
              =================================================== */}

          <section className="flex min-h-0 min-w-0 flex-col border-l border-[#303945] bg-[#070a0f]">
            {/* OUTPUT HEADER */}

            <div className="flex h-[49px] shrink-0 items-center justify-between border-b border-[#303945] bg-[#0c1117] px-5">
              <div className="flex items-center gap-3">
                <span className="cyber-output-mark">
                  <span />
                </span>

                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[11px] font-medium text-[#e4e1d9]">
                    Output
                  </span>

                  <span className="font-mono text-[7px] uppercase tracking-[0.13em] text-[#555f6a]">
                    Console
                  </span>
                </div>
              </div>

              <span className="font-mono text-[7px] uppercase tracking-[0.13em] text-[#535d68]">
                STDOUT
              </span>
            </div>

            {/* OUTPUT */}

            <div className="relative min-h-0 flex-1 overflow-auto">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)',
                  backgroundSize:
                    '100% 28px',
                }}
              />

              <div className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r border-t border-signal/35" />

              <div className="relative min-h-full p-5 font-mono text-[10px] leading-6">
                {/* IDLE */}

                {phase.kind === 'idle' && (
                  <div className="pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[#535d68]">
                        $
                      </span>

                      <span className="text-[#69727d]">
                        waiting to run...
                      </span>
                    </div>

                    <p className="ml-5 mt-1 max-w-[340px] font-mono text-[8px] leading-5 text-[#39424c]">
                      Execute your source to see
                      program output here.
                    </p>
                  </div>
                )}

                {/* RUNNING */}

                {(phase.kind ===
                  'submitted' ||
                  phase.kind ===
                    'running') && (
                  <div className="pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-signal">
                        $
                      </span>

                      <span className="motion-safe:animate-pulse text-[#bcbab3]">
                        compiling...
                      </span>
                    </div>
                  </div>
                )}

                {/* RESULT */}

                {phase.kind === 'result' && (
                  <div>
                    <div className="mb-5 flex items-center justify-between border-b border-[#303945] pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-[5px] w-[5px] ${
                            isSuccessfulResult
                              ? 'bg-pass shadow-[0_0_6px_rgba(76,154,106,0.35)]'
                              : 'bg-fail shadow-[0_0_6px_rgba(196,87,74,0.35)]'
                          }`}
                        />

                        <span
                          className={`font-mono text-[8px] uppercase tracking-[0.12em] ${
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

                      <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#454e58]">
                        result
                      </span>
                    </div>

                    <pre className="whitespace-pre-wrap font-mono text-[10px] leading-6 text-[#d4d2ca]">
                      {phase.response.output}
                    </pre>

                    <div className="mt-6 border-t border-[#303945] pt-3">
                      <span className="text-[#505964]">
                        exit status{' '}
                      </span>

                      <span
                        className={
                          isSuccessfulResult
                            ? 'text-pass'
                            : 'text-fail'
                        }
                      >
                        {phase.response.status}

                        {phase.response.reason
                          ? ` (${phase.response.reason})`
                          : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* ERROR */}

                {phase.kind === 'error' && (
                  <div className="border-l-2 border-fail bg-fail/[0.045] px-4 py-3">
                    <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fail">
                      execution error
                    </div>

                    <span className="font-mono text-[10px] leading-5 text-fail">
                      error: {phase.message}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* OUTPUT STATUS */}

            <div className="relative flex h-[29px] shrink-0 items-center justify-between border-t border-[#303945] bg-[#0b0f14] px-5">
              <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[#515b66]">
                {language === 'c'
                  ? 'C / GCC'
                  : 'JAVA / MAIN'}
              </span>

              <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#515b66]">
                {phase.kind === 'idle'
                  ? 'IDLE'
                  : phase.kind === 'error'
                    ? 'ERROR'
                    : phase.kind === 'result'
                      ? 'RESULT'
                      : 'RUNNING'}
              </span>

              <span className="absolute left-0 top-0 h-px w-[24%] bg-signal/40" />
            </div>
          </section>
        </div>
      </main>

      {/* =======================================================
          ADD FILE DIALOG
          ======================================================= */}

      {showAddFile && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-file-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseAddFile()
            }
          }}
        >
          <div className="cyber-modal cyber-frame relative w-full max-w-[430px]">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#303945] bg-[#0c1117] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-signal">
                    &gt;_
                  </span>

                  <h2
                    id="add-file-title"
                    className="font-display text-[13px] font-medium text-[#e4e1d9]"
                  >
                    New source file
                  </h2>
                </div>

                <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.1em] text-[#4f5964]">
                  C workspace
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseAddFile}
                aria-label="Close add file dialog"
                className="flex h-7 w-7 items-center justify-center text-[#626c77] hover:bg-white/[0.035] hover:text-[#e2dfd7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                <CloseIcon />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="bg-[#080c11] p-5">
              <label
                htmlFor="new-freestyle-file"
                className="mb-2 block font-mono text-[8px] uppercase tracking-[0.12em] text-[#69727d]"
              >
                filename
              </label>

              <input
                id="new-freestyle-file"
                autoFocus
                value={newFileName}
                onChange={(event) => {
                  setNewFileName(
                    event.target.value,
                  )

                  if (addFileError) {
                    setAddFileError(null)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleConfirmAddFile()
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault()
                    handleCloseAddFile()
                  }
                }}
                spellCheck={false}
                placeholder="utils.c"
                className="h-11 w-full border border-[#414b57] bg-[#070a0f] px-3 font-mono text-[11px] text-[#ddd9d0] caret-signal outline-none placeholder:text-[#3c4550] focus:border-signal/70 focus:ring-1 focus:ring-signal/30"
              />

              <div className="mt-3 border-l border-signal/50 bg-signal/[0.025] px-3 py-2">
                <p className="font-mono text-[8px] leading-5 text-[#68727d]">
                  accepts{' '}
                  <span className="text-[#bdb9af]">
                    .c
                  </span>{' '}
                  and{' '}
                  <span className="text-[#bdb9af]">
                    .h
                  </span>{' '}
                  files only.
                  <br />
                  filenames must be flat — no folders.
                </p>
              </div>

              {addFileError && (
                <p className="mt-3 font-mono text-[9px] text-fail">
                  error: {addFileError}
                </p>
              )}
            </div>

            {/* MODAL ACTIONS */}

            <div className="flex justify-end gap-2 border-t border-[#303945] bg-[#0c1117] px-5 py-3">
              <button
                type="button"
                onClick={handleCloseAddFile}
                className="h-9 border border-[#3d4651] px-4 font-mono text-[9px] uppercase tracking-[0.08em] text-[#68727d] hover:border-[#59636e] hover:text-[#d7d4cc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAddFile}
                className="h-9 bg-signal px-5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ink hover:bg-[#ffc02e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1"
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
