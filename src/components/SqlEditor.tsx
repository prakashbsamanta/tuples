import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { useMemo } from 'react';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  schema: Record<string, string[]>;
  placeholder?: string;
}

export function SqlEditor({ value, onChange, onSubmit, schema, placeholder }: SqlEditorProps) {
  const extensions = useMemo(() => [
    sql({ dialect: SQLite, schema, upperCaseKeywords: true }),
    // High precedence so Mod-Enter submits instead of inserting a newline.
    Prec.highest(
      keymap.of([
        { key: 'Mod-Enter', run: () => { onSubmit(); return true; } },
      ])
    ),
  ], [schema, onSubmit]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="dark"
      placeholder={placeholder}
      height="100%"
      style={{ height: '100%', fontSize: '13px' }}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
    />
  );
}

// Default export enables React.lazy() code-splitting of the CodeMirror bundle.
export default SqlEditor;
