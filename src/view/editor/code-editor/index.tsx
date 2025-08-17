import { useEffect, useMemo, useRef, useState } from 'react';
import { minimalSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
// import { oneDarkTheme } from '@codemirror/theme-one-dark'; // Replaced with custom theme system
import { assertNonNull } from '../../../utils/assert';
import { ThemeManager } from '../../../core/themes/theme-manager';
import { type CodeTheme } from '../../../core/themes/types';
import {
  codeMirrorLanguageMap,
  type Language,
} from '../../../core/code-languages/languages';

interface CodeEditorProps {
  value: string;
  language: Language;
  className?: string;
  onChange: (value: string) => void;
}

const theme = EditorView.theme(
  {
    '&': {
      padding: '0.5rem',
      background: 'none',
    },
    '.cm-scroller': {
      font: `16px 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Source Code Pro', 'source-code-pro', monospace`,
    },
  },
  {
    dark: true,
  },
);
const extensionsCompartment = new Compartment();
const themeCompartment = new Compartment();

export default function CodeEditor({
  value,
  language,
  className,
  onChange,
}: CodeEditorProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView>();
  const [themeManager] = useState(() => new ThemeManager());
  const [currentTheme, setCurrentTheme] = useState<CodeTheme>(() =>
    themeManager.getCurrentTheme(),
  );
  const latestDocRef = useRef(value);

  // Create CodeMirror theme from our theme system
  const createCodeMirrorTheme = (theme: CodeTheme) => {
    return EditorView.theme(
      {
        '&': {
          color: theme.colors['editor.foreground'] || '#d4d4d4',
          backgroundColor: theme.colors['editor.background'] || '#1e1e1e',
        },
        '.cm-content': {
          padding: '16px',
          caretColor: theme.colors['editorCursor.foreground'] || '#aeafad',
        },
        '.cm-focused .cm-cursor': {
          borderLeftColor: theme.colors['editorCursor.foreground'] || '#aeafad',
        },
        '.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
          {
            backgroundColor:
              theme.colors['editor.selectionBackground'] || '#264f78',
          },
        '.cm-activeLine': {
          backgroundColor:
            theme.colors['editor.lineHighlightBackground'] || '#2a2d2e',
        },
        '.cm-gutters': {
          backgroundColor: theme.colors['editor.background'] || '#1e1e1e',
          color: theme.colors['editorLineNumber.foreground'] || '#858585',
          border: 'none',
        },
        '.cm-activeLineGutter': {
          backgroundColor:
            theme.colors['editor.lineHighlightBackground'] || '#2a2d2e',
          color: theme.colors['editorLineNumber.activeForeground'] || '#c6c6c6',
        },
        '.cm-lineNumbers .cm-gutterElement': {
          color: theme.colors['editorLineNumber.foreground'] || '#858585',
        },
        '.cm-foldPlaceholder': {
          backgroundColor: 'transparent',
          border: 'none',
          color: theme.colors['editor.foreground'] || '#d4d4d4',
        },
      },
      { dark: theme.type === 'dark' },
    );
  };

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setCurrentTheme(event.detail.theme);
    };

    window.addEventListener('themeChanged', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener(
        'themeChanged',
        handleThemeChange as EventListener,
      );
    };
  }, []);

  const updateListener = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          if (newValue === latestDocRef.current) return;
          latestDocRef.current = newValue;
          onChange(newValue);
        }
      }),
    [onChange],
  );

  // create editor
  useEffect(() => {
    if (editorRef.current != null) return;
    const editorView = new EditorView({
      state: EditorState.create({
        doc: latestDocRef.current,
        extensions: [
          minimalSetup,
          theme,
          themeCompartment.of(createCodeMirrorTheme(currentTheme)),
          keymap.of([indentWithTab]),
          extensionsCompartment.of([]),
        ],
      }),
      parent: assertNonNull(elRef.current),
    });
    editorRef.current = editorView;
  }, [currentTheme]);

  // update theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.dispatch({
        effects: themeCompartment.reconfigure(
          createCodeMirrorTheme(currentTheme),
        ),
      });
    }
  }, [currentTheme]);

  // update configs
  useEffect(() => {
    editorRef.current?.dispatch({
      effects: extensionsCompartment.reconfigure([
        updateListener,
        codeMirrorLanguageMap[language],
      ]),
    });
  }, [language, updateListener]);

  // update doc
  useEffect(() => {
    const editor = assertNonNull(editorRef.current);
    if (value !== latestDocRef.current) {
      const transaction = editor.state.update({
        changes: [
          {
            from: 0,
            to: editor.state.doc.length,
            insert: value,
          },
        ],
      });
      editor.dispatch(transaction);
      latestDocRef.current = value;
    }
  }, [value]);

  return <div ref={elRef} className={className}></div>;
}
