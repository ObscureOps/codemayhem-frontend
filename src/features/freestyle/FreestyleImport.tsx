
import type {
  Dispatch,
  SetStateAction,
} from 'react'
import { Icon } from './FreestyleEditor'

export interface FreestyleImportProps {
  showAddFile: boolean
  setShowAddFile:
    Dispatch<SetStateAction<boolean>>
  activeFolder:
    | {
        name: string
      }
    | undefined
  newFileName: string
  setNewFileName:
    Dispatch<SetStateAction<string>>
  setAddFileError:
    Dispatch<
      SetStateAction<string | null>
    >
  addFile: () => void
  addFileError: string | null
}

export function FreestyleImport({
  showAddFile,
  setShowAddFile,
  activeFolder,
  newFileName,
  setNewFileName,
  setAddFileError,
  addFile,
  addFileError,
}: FreestyleImportProps) {
  if (!showAddFile) {
    return null
  }

  return (
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

          {addFileError && (
            <p className="mt-3 font-mono text-[9px] text-fail">
              error:{' '}
              {addFileError}
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
  )
}
