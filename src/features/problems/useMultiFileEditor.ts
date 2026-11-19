import { useCallback, useState } from 'react'

export interface EditorFile {
  name: string
  content: string
  folderId?: string
}

const VALID_EXTENSIONS = ['.c', '.h']

function validateFileName(
  name: string,
  existing: EditorFile[],
  folderId: string | undefined,
  currentName?: string
): string | null {
  if (
    !VALID_EXTENSIONS.some((extension) =>
      name.toLowerCase().endsWith(extension)
    )
  ) {
    return 'must end in .c or .h'
  }

  const duplicate = existing.some(
    (file) =>
      file.folderId === folderId &&
      file.name !== currentName &&
      file.name.toLowerCase() === name.toLowerCase()
  )

  if (duplicate) {
    return 'a file with that name already exists in this folder'
  }

  return null
}

function scopeFiles(
  files: EditorFile[],
  folderId: string | undefined
) {
  if (!folderId) {
    return files
  }

  return [
    ...files.filter(
      (file) => file.folderId === folderId
    ),
    ...files.filter(
      (file) => file.folderId !== folderId
    ),
  ]
}

export function useMultiFileEditor(
  initialBoilerplate: string
) {
  const [files, setFiles] = useState<EditorFile[]>([
    {
      name: 'main.c',
      content: initialBoilerplate,
    },
  ])

  const [activeFileName, setActiveFileName] =
    useState('main.c')

  const [
    activeFolderId,
    setActiveFolderIdState,
  ] = useState<string | undefined>()

  const setFileScope = useCallback(
    (folderId: string | undefined) => {
      setActiveFolderIdState(folderId)

      setFiles((previous) => {
        const scoped = previous.some(
          (file) =>
            file.folderId === folderId
        )

        const tagged = scoped
          ? previous
          : previous.map((file) =>
              file.folderId === undefined
                ? {
                    ...file,
                    folderId,
                  }
                : file
            )

        return scopeFiles(
          tagged,
          folderId
        )
      })
    },
    []
  )

  const resetFiles = useCallback(
    (
      boilerplate: string,
      folderId?: string
    ) => {
      setActiveFolderIdState(folderId)

      setFiles([
        {
          name: 'main.c',
          content: boilerplate,
          folderId,
        },
      ])

      setActiveFileName('main.c')
    },
    []
  )

  const restoreFiles = useCallback(
    (restored: EditorFile[]) => {
      if (restored.length === 0) {
        return
      }

      setFiles(restored)

      setActiveFileName(
        restored.some(
          (file) =>
            file.name === 'main.c'
        )
          ? 'main.c'
          : restored[0].name
      )
    },
    []
  )

  const updateActiveFileContent =
    useCallback(
      (content: string) => {
        setFiles((previous) =>
          previous.map((file) =>
            file.name === activeFileName &&
            file.folderId === activeFolderId
              ? {
                  ...file,
                  content,
                }
              : file
          )
        )
      },
      [
        activeFileName,
        activeFolderId,
      ]
    )

  const updateFileContent = useCallback(
    (
      name: string,
      content: string,
      folderId?: string
    ) => {
      const scope =
        folderId ?? activeFolderId

      setFiles((previous) =>
        previous.map((file) =>
          file.name === name &&
          file.folderId === scope
            ? {
                ...file,
                content,
              }
            : file
        )
      )
    },
    [activeFolderId]
  )

  const addFile = useCallback(
    (
      name: string,
      folderId?: string
    ): string | null => {
      const normalized = name.trim()

      const scope =
        folderId ?? activeFolderId

      const error =
        validateFileName(
          normalized,
          files,
          scope
        )

      if (error) {
        return error
      }

      setFiles((previous) =>
        scopeFiles(
          [
            ...previous,
            {
              name: normalized,
              content: '',
              folderId: scope,
            },
          ],
          scope
        )
      )

      setActiveFileName(normalized)

      if (folderId !== undefined) {
        setActiveFolderIdState(
          folderId
        )
      }

      return null
    },
    [
      files,
      activeFolderId,
    ]
  )

  const renameFile = useCallback(
    (
      currentName: string,
      nextName: string,
      folderId?: string
    ): string | null => {
      const normalized =
        nextName.trim()

      const scope =
        folderId ?? activeFolderId

      const error =
        validateFileName(
          normalized,
          files,
          scope,
          currentName
        )

      if (error) {
        return error
      }

      setFiles((previous) =>
        previous.map((file) =>
          file.name === currentName &&
          file.folderId === scope
            ? {
                ...file,
                name: normalized,
              }
            : file
        )
      )

      setActiveFileName(
        (current) =>
          current === currentName
            ? normalized
            : current
      )

      return null
    },
    [
      files,
      activeFolderId,
    ]
  )

  const closeFile = useCallback(
    (
      name: string,
      folderId?: string
    ) => {
      const scope =
        folderId ?? activeFolderId

      if (name === 'main.c') {
        return
      }

      setFiles((previous) =>
        previous.filter(
          (file) =>
            !(
              file.name === name &&
              file.folderId === scope
            )
        )
      )

      setActiveFileName(
        (current) =>
          current === name
            ? 'main.c'
            : current
      )
    },
    [activeFolderId]
  )

  const deleteFile = useCallback(
    (
      name: string,
      folderId?: string
    ) => {
      const scope =
        folderId ?? activeFolderId

      setFiles((previous) =>
        previous.filter(
          (file) =>
            !(
              file.name === name &&
              file.folderId === scope
            )
        )
      )

      setActiveFileName(
        (current) =>
          current === name
            ? 'main.c'
            : current
      )
    },
    [activeFolderId]
  )

  return {
    files,
    activeFileName,
    activeFolderId,
    setActiveFileName,
    setFileScope,
    updateActiveFileContent,
    updateFileContent,
    addFile,
    renameFile,
    closeFile,
    deleteFile,
    resetFiles,
    restoreFiles,
  }
}
