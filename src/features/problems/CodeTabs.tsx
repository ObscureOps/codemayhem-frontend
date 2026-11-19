import { useState } from 'react';
import type { Language } from '../../api/types/problems';
import { CodeEditor } from './CodeEditor';

export interface CodeTab {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

interface CodeTabsProps {
  tabs: CodeTab[];
  language: Language;
  // Change this to replace every document (for example after loading a template).
  version?: number;
}

export function CodeTabs({ tabs, language, version = 0 }: CodeTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (!active) return null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink text-chalk">
      <div role="tablist" aria-label="Code files" className="flex border-b border-graphite">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active.id}
            onClick={() => setActiveId(tab.id)}
            className={`border-r border-graphite px-4 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal ${
              tab.id === active.id ? 'bg-chalk text-ink' : 'text-graphite hover:text-chalk'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active.hint && (
        <p className="border-b border-graphite px-3 py-2 font-mono text-xs text-graphite">{active.hint}</p>
      )}

      <div className="min-h-0 flex-1">
        <CodeEditor
          language={language}
          value={active.value}
          onChange={active.onChange}
          theme="ink"
          fontSize={14}
          wordWrap={false}
          editorKey={`${active.id}:${version}`}
        />
      </div>
    </div>
  );
}
