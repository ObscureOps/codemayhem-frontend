
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { EditorFile } from './useMultiFileEditor';

interface FileTabsProps {
  files: EditorFile[];
  activeFileName: string;
  onSelect: (name: string) => void;
  onAdd: (name: string) => string | null; // returns an error message, or null on success
  onClose: (name: string) => void;
}

// Multi-file tabs for the C editor — a frontend-only convenience per the
// Milestone 4 spec (backend doesn't need boilerplate for header files,
// they start empty). main.c can't be closed.
export function FileTabs({ files, activeFileName, onSelect, onAdd, onClose }: FileTabsProps) {
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commitAdd = () => {
    const name = draftName.trim();
    if (!name) {
      setAdding(false);
      setError(null);
      return;
    }
    const result = onAdd(name);
    if (result) {
      setError(result);
      return;
    }
    setAdding(false);
    setDraftName('');
    setError(null);
  };

  return (
    <div className="flex items-center border-b border-graphite overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.name}
          className={`flex items-center border-r border-graphite font-mono text-sm ${
            file.name === activeFileName ? 'bg-chalk text-ink' : 'text-graphite hover:text-chalk'
          }`}
        >
          <button
            onClick={() => onSelect(file.name)}
            className="px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            {file.name}
          </button>
          {file.name !== 'main.c' && (
            <button
              onClick={() => onClose(file.name)}
              aria-label={`Close ${file.name}`}
              className="pr-2 hover:text-fail focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      {adding ? (
        <div className="flex items-center px-2">
          <input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') {
                setAdding(false);
                setDraftName('');
                setError(null);
              }
            }}
            placeholder="filename.c"
            className="w-28 bg-ink text-chalk font-mono text-sm px-1 py-1 border border-graphite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          aria-label="Add file"
          className="px-2 py-2 text-graphite hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          <Plus size={14} />
        </button>
      )}

      {error && <span className="px-2 font-mono text-xs text-fail self-center">{error}</span>}
    </div>
  );
}
