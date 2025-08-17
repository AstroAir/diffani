export interface CodeTheme {
  id: string;
  name: string;
  type: 'light' | 'dark' | 'high-contrast';
  author?: string;
  description?: string;
  version?: string;

  // Base colors
  colors: {
    // Editor colors
    'editor.background': string;
    'editor.foreground': string;
    'editor.lineHighlightBackground'?: string;
    'editor.selectionBackground'?: string;
    'editor.selectionForeground'?: string;
    'editor.inactiveSelectionBackground'?: string;
    'editor.wordHighlightBackground'?: string;
    'editor.wordHighlightStrongBackground'?: string;
    'editor.findMatchBackground'?: string;
    'editor.findMatchHighlightBackground'?: string;
    'editor.hoverHighlightBackground'?: string;
    'editor.lineHighlightBorder'?: string;
    'editor.rangeHighlightBackground'?: string;
    'editor.symbolHighlightBackground'?: string;

    // Line number colors
    'editorLineNumber.foreground'?: string;
    'editorLineNumber.activeForeground'?: string;

    // Cursor colors
    'editorCursor.foreground'?: string;
    'editorCursor.background'?: string;

    // Whitespace colors
    'editorWhitespace.foreground'?: string;

    // Indent guide colors
    'editorIndentGuide.background'?: string;
    'editorIndentGuide.activeBackground'?: string;

    // Ruler colors
    'editorRuler.foreground'?: string;

    // Code lens colors
    'editorCodeLens.foreground'?: string;

    // Bracket match colors
    'editorBracketMatch.background'?: string;
    'editorBracketMatch.border'?: string;

    // Overview ruler colors
    'editorOverviewRuler.border'?: string;
    'editorOverviewRuler.findMatchForeground'?: string;
    'editorOverviewRuler.rangeHighlightForeground'?: string;
    'editorOverviewRuler.selectionHighlightForeground'?: string;
    'editorOverviewRuler.wordHighlightForeground'?: string;
    'editorOverviewRuler.wordHighlightStrongForeground'?: string;
    'editorOverviewRuler.modifiedForeground'?: string;
    'editorOverviewRuler.addedForeground'?: string;
    'editorOverviewRuler.deletedForeground'?: string;
    'editorOverviewRuler.errorForeground'?: string;
    'editorOverviewRuler.warningForeground'?: string;
    'editorOverviewRuler.infoForeground'?: string;

    // Error colors
    'editorError.foreground'?: string;
    'editorError.background'?: string;
    'editorError.border'?: string;
    'editorWarning.foreground'?: string;
    'editorWarning.background'?: string;
    'editorWarning.border'?: string;
    'editorInfo.foreground'?: string;
    'editorInfo.background'?: string;
    'editorInfo.border'?: string;
    'editorHint.foreground'?: string;
    'editorHint.border'?: string;

    // Gutter colors
    'editorGutter.background'?: string;
    'editorGutter.modifiedBackground'?: string;
    'editorGutter.addedBackground'?: string;
    'editorGutter.deletedBackground'?: string;

    // Diff colors
    'diffEditor.insertedTextBackground'?: string;
    'diffEditor.insertedTextBorder'?: string;
    'diffEditor.removedTextBackground'?: string;
    'diffEditor.removedTextBorder'?: string;

    // Widget colors
    'editorWidget.background'?: string;
    'editorWidget.foreground'?: string;
    'editorWidget.border'?: string;
    'editorWidget.resizeBorder'?: string;

    // Suggest widget colors
    'editorSuggestWidget.background'?: string;
    'editorSuggestWidget.border'?: string;
    'editorSuggestWidget.foreground'?: string;
    'editorSuggestWidget.highlightForeground'?: string;
    'editorSuggestWidget.selectedBackground'?: string;

    // Hover widget colors
    'editorHoverWidget.background'?: string;
    'editorHoverWidget.border'?: string;
    'editorHoverWidget.foreground'?: string;
    'editorHoverWidget.statusBarBackground'?: string;

    // Debug colors
    'editor.stackFrameHighlightBackground'?: string;
    'editor.focusedStackFrameHighlightBackground'?: string;

    // Merge conflict colors
    'merge.currentHeaderBackground'?: string;
    'merge.currentContentBackground'?: string;
    'merge.incomingHeaderBackground'?: string;
    'merge.incomingContentBackground'?: string;
    'merge.border'?: string;
    'merge.commonContentBackground'?: string;
    'merge.commonHeaderBackground'?: string;
    'editorOverviewRuler.currentContentForeground'?: string;
    'editorOverviewRuler.incomingContentForeground'?: string;
    'editorOverviewRuler.commonContentForeground'?: string;
  };

  // Token colors for syntax highlighting
  tokenColors: TokenColor[];

  // Semantic token colors
  semanticTokenColors?: Record<string, string>;

  // Additional metadata
  metadata?: {
    source?: 'vscode' | 'custom' | 'builtin';
    originalFile?: string;
    importedAt?: Date;
    tags?: string[];
  };
}

export interface TokenColor {
  name?: string;
  scope: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string; // 'italic', 'bold', 'underline', 'strikethrough'
  };
}

export interface VSCodeTheme {
  name: string;
  type: 'light' | 'dark' | 'hc-black' | 'hc-light';
  colors: Record<string, string>;
  tokenColors: TokenColor[];
  semanticTokenColors?: Record<string, string>;
  semanticHighlighting?: boolean;
}

export interface ThemeManager {
  themes: Map<string, CodeTheme>;
  currentTheme: string;
  defaultTheme: string;
}

export interface ThemeImportResult {
  success: boolean;
  theme?: CodeTheme;
  error?: string;
  warnings?: string[];
}

/* Built-in theme definitions */
export const BUILTIN_THEMES: Record<string, Partial<CodeTheme>> = {
  'dark-plus': {
    name: 'Dark+ (default dark)',
    type: 'dark',
    author: 'Microsoft',
    description: 'Default dark theme from Visual Studio Code',
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editor.selectionBackground': '#264f78',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
    },
    tokenColors: [
      {
        scope: 'comment',
        settings: { foreground: '#6A9955', fontStyle: 'italic' },
      },
      {
        scope: ['keyword', 'storage.type', 'storage.modifier'],
        settings: { foreground: '#569CD6' },
      },
      {
        scope: ['string', 'string.quoted'],
        settings: { foreground: '#CE9178' },
      },
      {
        scope: ['constant.numeric', 'constant.language'],
        settings: { foreground: '#B5CEA8' },
      },
      {
        scope: ['entity.name.function', 'support.function'],
        settings: { foreground: '#DCDCAA' },
      },
      {
        scope: ['entity.name.type', 'entity.name.class'],
        settings: { foreground: '#4EC9B0' },
      },
      {
        scope: ['variable', 'variable.other'],
        settings: { foreground: '#9CDCFE' },
      },
    ],
  },

  'light-plus': {
    name: 'Light+ (default light)',
    type: 'light',
    author: 'Microsoft',
    description: 'Default light theme from Visual Studio Code',
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      'editor.lineHighlightBackground': '#f0f0f0',
      'editor.selectionBackground': '#add6ff',
      'editorLineNumber.foreground': '#237893',
      'editorLineNumber.activeForeground': '#0b216f',
      'editorCursor.foreground': '#000000',
    },
    tokenColors: [
      {
        scope: 'comment',
        settings: { foreground: '#008000', fontStyle: 'italic' },
      },
      {
        scope: ['keyword', 'storage.type', 'storage.modifier'],
        settings: { foreground: '#0000ff' },
      },
      {
        scope: ['string', 'string.quoted'],
        settings: { foreground: '#a31515' },
      },
      {
        scope: ['constant.numeric', 'constant.language'],
        settings: { foreground: '#09885a' },
      },
      {
        scope: ['entity.name.function', 'support.function'],
        settings: { foreground: '#795e26' },
      },
      {
        scope: ['entity.name.type', 'entity.name.class'],
        settings: { foreground: '#267f99' },
      },
      {
        scope: ['variable', 'variable.other'],
        settings: { foreground: '#001080' },
      },
    ],
  },

  monokai: {
    name: 'Monokai',
    type: 'dark',
    author: 'Wimer Hazenberg',
    description: 'Popular dark theme with vibrant colors',
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorLineNumber.foreground': '#90908a',
      'editorLineNumber.activeForeground': '#c2c2bf',
      'editorCursor.foreground': '#f8f8f0',
    },
    tokenColors: [
      {
        scope: 'comment',
        settings: { foreground: '#75715e', fontStyle: 'italic' },
      },
      {
        scope: ['keyword', 'storage.type', 'storage.modifier'],
        settings: { foreground: '#f92672' },
      },
      {
        scope: ['string', 'string.quoted'],
        settings: { foreground: '#e6db74' },
      },
      {
        scope: ['constant.numeric', 'constant.language'],
        settings: { foreground: '#ae81ff' },
      },
      {
        scope: ['entity.name.function', 'support.function'],
        settings: { foreground: '#a6e22e' },
      },
      {
        scope: ['entity.name.type', 'entity.name.class'],
        settings: { foreground: '#66d9ef' },
      },
      {
        scope: ['variable', 'variable.other'],
        settings: { foreground: '#f8f8f2' },
      },
    ],
  },
} as const;

/* Common token scopes for syntax highlighting */
export const TOKEN_SCOPES = {
  COMMENT: ['comment', 'comment.line', 'comment.block'],
  KEYWORD: ['keyword', 'storage.type', 'storage.modifier', 'keyword.control'],
  STRING: ['string', 'string.quoted', 'string.template'],
  NUMBER: [
    'constant.numeric',
    'constant.language.boolean',
    'constant.language.null',
  ],
  FUNCTION: ['entity.name.function', 'support.function', 'meta.function-call'],
  CLASS: ['entity.name.type', 'entity.name.class', 'support.class'],
  VARIABLE: ['variable', 'variable.other', 'variable.parameter'],
  OPERATOR: ['keyword.operator', 'punctuation.operator'],
  PUNCTUATION: [
    'punctuation',
    'punctuation.separator',
    'punctuation.terminator',
  ],
  PROPERTY: ['variable.other.property', 'support.type.property-name'],
  ATTRIBUTE: ['entity.other.attribute-name', 'meta.attribute'],
  TAG: ['entity.name.tag', 'meta.tag'],
  CONSTANT: ['constant', 'constant.other', 'support.constant'],
  ESCAPE: ['constant.character.escape', 'string.regexp'],
} as const;
