import { vi } from 'vitest';

// Mock browser APIs
global.window = global.window || {};
global.document = global.document || {};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock FileReader
global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null;
  error: any = null;
  readyState: number = 0;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onabort: ((event: any) => void) | null = null;
  onloadstart: ((event: any) => void) | null = null;
  onloadend: ((event: any) => void) | null = null;
  onprogress: ((event: any) => void) | null = null;

  readAsText(file: Blob) {
    // Make it synchronous for testing
    if (file.size === 0) {
      this.result = '';
    } else {
      // Try to get the content from the Blob
      try {
        // Check if it's our mock Blob with _content property
        if ((file as any)._content !== undefined) {
          this.result = (file as any)._content;
        } else {
          // Fallback to mock content
          this.result = 'mock file content';
        }
      } catch (error) {
        this.result = 'mock file content';
      }
    }
    this.readyState = 2;

    // Use setTimeout to make it async but immediate
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  }

  readAsArrayBuffer(file: Blob) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  }

  abort() {
    this.readyState = 2;
    if (this.onabort) {
      this.onabort({ target: this });
    }
  }
};

// Mock File and Blob
global.Blob = class Blob {
  size: number;
  type: string;
  private _parts: BlobPart[];
  _content: string; // Add this for FileReader access

  constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
    this.type = options?.type || '';
    this._parts = blobParts || [];

    // Calculate content and size
    let content = '';
    let size = 0;

    if (blobParts) {
      for (const part of blobParts) {
        if (typeof part === 'string') {
          content += part;
          size += part.length;
        } else if (part instanceof ArrayBuffer) {
          const decoded = new TextDecoder().decode(part);
          content += decoded;
          size += part.byteLength;
        } else if (part instanceof Blob) {
          // For nested blobs, we'll just use their content if available
          if ((part as any)._content) {
            content += (part as any)._content;
          }
          size += part.size;
        }
      }
    }

    this._content = content;
    this.size = size;
  }

  async text(): Promise<string> {
    return this._content;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const text = await this.text();
    return new TextEncoder().encode(text).buffer;
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    return new Blob([], { type: contentType });
  }
};

// Mock File that extends our custom Blob
global.File = class File extends global.Blob {
  name: string;
  lastModified: number;
  webkitRelativePath: string;

  constructor(
    fileBits: BlobPart[],
    fileName: string,
    options?: FilePropertyBag,
  ) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = options?.lastModified || Date.now();
    this.webkitRelativePath = '';
  }
};

// Mock URL
global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn(),
} as any;

// Mock document methods
const mockElement = {
  href: '',
  download: '',
  style: { display: '' },
  click: vi.fn(),
  draggable: true,
  ondragstart: null,
  ondrop: null,
};

global.document = {
  createElement: vi.fn(() => mockElement),
  getElementsByTagName: vi.fn(() => []),
  querySelectorAll: vi.fn(() => []),
  querySelector: vi.fn(() => null),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  },
} as any;

// Mock code languages to avoid CodeMirror/PrismJS dependencies
vi.mock('../src/core/code-languages/languages', () => ({
  Language: {
    JAVASCRIPT: 'javascript',
    TYPESCRIPT: 'typescript',
    PYTHON: 'python',
    JAVA: 'java',
    CSHARP: 'csharp',
    CPP: 'cpp',
    C: 'c',
    GO: 'go',
    RUST: 'rust',
    PHP: 'php',
    RUBY: 'ruby',
    SWIFT: 'swift',
    KOTLIN: 'kotlin',
    SCALA: 'scala',
    HTML: 'html',
    CSS: 'css',
    JSON: 'json',
    XML: 'xml',
    YAML: 'yaml',
    MARKDOWN: 'markdown',
    SQL: 'sql',
    BASH: 'bash',
    POWERSHELL: 'powershell',
  },
  getLanguageExtensions: vi.fn(() => ['.js', '.ts', '.py']),
  isValidLanguage: vi.fn(
    (lang: string) => typeof lang === 'string' && lang.length > 0,
  ),
  getLanguageFromExtension: vi.fn((ext: string) => 'javascript'),
  getSupportedLanguages: vi.fn(() => ['javascript', 'typescript', 'python']),
}));

// Mock DOMParser for XML parsing
global.DOMParser = class DOMParser {
  parseFromString(str: string, type: string): Document {
    // Check for parser errors first
    if (str.includes('<invalid>') || !str.includes('<')) {
      return {
        documentElement: {
          nodeName: 'parsererror',
        },
      } as any;
    }

    // Create a more comprehensive mock that supports the XML structure
    const mockDoc = {
      documentElement: {
        tagName: 'project',
        nodeName: 'project',
        children: [],
        textContent: str,
        getAttribute: vi.fn(),
        getElementsByTagName: vi.fn(() => []),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        attributes: [],
      },
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
    };

    // Mock querySelector for the document level
    mockDoc.querySelector = vi.fn((selector) => {
      if (selector === 'metadata') {
        // Parse the actual XML content to extract values
        const idMatch = str.match(/<id>([^<]+)<\/id>/);
        const nameMatch = str.match(/<name>([^<]+)<\/name>/);
        const languageMatch = str.match(/<language>([^<]+)<\/language>/);
        const fileSizeMatch = str.match(/<fileSize>([^<]+)<\/fileSize>/);
        const snapshotCountMatch = str.match(
          /<snapshotCount>([^<]+)<\/snapshotCount>/,
        );

        return {
          attributes: [],
          children: [
            {
              tagName: 'id',
              textContent: idMatch ? idMatch[1] : 'test-project',
              children: [],
              attributes: [],
            },
            {
              tagName: 'name',
              textContent: nameMatch ? nameMatch[1] : 'Test Project',
              children: [],
              attributes: [],
            },
            {
              tagName: 'language',
              textContent: languageMatch ? languageMatch[1] : 'javascript',
              children: [],
              attributes: [],
            },
            {
              tagName: 'fileSize',
              textContent: fileSizeMatch ? fileSizeMatch[1] : '1024',
              children: [],
              attributes: [],
            },
            {
              tagName: 'snapshotCount',
              textContent: snapshotCountMatch ? snapshotCountMatch[1] : '5',
              children: [],
              attributes: [],
            },
          ],
        };
      }

      if (selector === 'document') {
        return {
          attributes: [],
          children: [],
          querySelector: vi.fn((subSelector) => {
            if (subSelector === 'snapshots') {
              return {
                querySelectorAll: vi.fn((snapshotSelector) => {
                  if (snapshotSelector === 'snapshot') {
                    return [
                      {
                        attributes: [],
                        children: [
                          {
                            tagName: 'id',
                            textContent: 'snap-1',
                            children: [],
                            attributes: [],
                          },
                          {
                            tagName: 'code',
                            textContent: 'console.log("hello");',
                            children: [],
                            attributes: [],
                          },
                          {
                            tagName: 'duration',
                            textContent: '1000',
                            children: [],
                            attributes: [],
                          },
                          {
                            tagName: 'transitionTime',
                            textContent: '500',
                            children: [],
                            attributes: [],
                          },
                        ],
                      },
                    ];
                  }
                  return [];
                }),
              };
            }
            return null;
          }),
        };
      }

      return null;
    });

    return mockDoc as any;
  }
};

// Mock AbortController
global.AbortController = class AbortController {
  signal: AbortSignal;

  constructor() {
    this.signal = new AbortSignal();
  }

  abort() {
    (this.signal as any).aborted = true;
  }
};

global.AbortSignal = class AbortSignal extends EventTarget {
  aborted: boolean = false;
  reason: any = undefined;

  static abort(reason?: any): AbortSignal {
    const signal = new AbortSignal();
    (signal as any).aborted = true;
    (signal as any).reason = reason;
    return signal;
  }

  throwIfAborted() {
    if (this.aborted) {
      throw new Error('Operation was aborted');
    }
  }
};

// Mock performance
global.performance = {
  now: vi.fn(() => Date.now()),
} as any;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};

// Export mocks for use in tests
export { localStorageMock, mockElement };
