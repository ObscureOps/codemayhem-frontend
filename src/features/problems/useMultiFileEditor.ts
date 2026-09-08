
import { useCallback, useState } from 'react';

export interface EditorFile {
  name: string;
  content: string;
}

const VALID_EXTENSIONS = ['.c', '.h'];

function validateFileName(name: string, existing: EditorFile[]): string | null {
  if (!VALID_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'must end in .c or .h';
  }
  if (existing.some((f) => f.name === name)) {
    return 'a file with that name already exists';
  }
  return null;
}

// Plain useState — this is UI/layout state (which files are open, which
// is active), not an async operation, per the Milestone 4 spec. Rename
// isn't built here: not explicitly requested, and it adds real UI
// complexity (inline-editable tabs, conflict checks against other open
// files) that can be added later if it turns out to be needed.
export function useMultiFileEditor(initialBoilerplate: string) {
  const [files, setFiles] = useState<EditorFile[]>([{ name: 'main.c', content: initialBoilerplate }]);
  const [activeFileName, setActiveFileName] = useState('main.c');

  const resetFiles = useCallback((boilerplate: string) => {
    setFiles([{ name: 'main.c', content: boilerplate }]);
    setActiveFileName('main.c');
  }, []);

  const updateActiveFileContent = useCallback(
    (content: string) => {
      setFiles((prev) => prev.map((f) => (f.name === activeFileName ? { ...f, content } : f)));
    },
    [activeFileName]
  );

  const addFile = useCallback(
    (name: string): string | null => {
      const error = validateFileName(name, files);
      if (error) return error;
      setFiles((prev) => [...prev, { name, content: '' }]);
      setActiveFileName(name);
      return null;
    },
    [files]
  );

  const closeFile = useCallback((name: string) => {
    if (name === 'main.c') return; // locked, can't be closed
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setActiveFileName((current) => (current === name ? 'main.c' : current));
  }, []);

  return {
    files,
    activeFileName,
    setActiveFileName,
    updateActiveFileContent,
    addFile,
    closeFile,
    resetFiles,
  };
}
