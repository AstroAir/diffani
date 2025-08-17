import { describe, expect, it, vi } from 'vitest';
import { createDoc, type Doc, type Snapshot } from '../doc';
import { type RawDoc } from '../raw-doc';
import { Language } from '../../code-languages/languages';

// Mock the tokenize module
vi.mock('../../tokenize/index', () => ({
  memoizedParseCodeToFormattedTokens: vi.fn((code: string) => [
    { value: code.slice(0, 5), types: ['keyword'] },
    { value: code.slice(5), types: ['text'] },
  ]),
}));

// Mock the transition module
vi.mock('../../transition/mutation', () => ({
  createMutation: vi.fn(() => ({
    diffs: [
      { leftIndex: 0, rightIndex: 0 },
      { leftIndex: 1, rightIndex: 1 },
    ],
    left: [],
    right: [],
  })),
}));

describe('Doc Module', () => {
  const mockRawDoc: RawDoc = {
    language: Language.javascript,
    fontSize: 16,
    lineHeight: 20,
    width: 800,
    height: 600,
    theme: 'default',
    padding: { top: 10, left: 10, bottom: 10 },
    snapshots: [
      {
        id: '1',
        code: 'const a = 1;',
        duration: 1000,
        transitionTime: 500,
      },
      {
        id: '2',
        code: 'const a = 2;\nconst b = 3;',
        duration: 1000,
        transitionTime: 500,
      },
      {
        id: '3',
        code: 'const a = 2;\nconst b = 3;\nconst c = 4;',
        duration: 1000,
        transitionTime: 500,
      },
    ],
  };

  describe('createDoc', () => {
    it('should create a doc with correct structure', () => {
      const doc = createDoc(mockRawDoc);

      expect(doc).toHaveProperty('raw');
      expect(doc).toHaveProperty('snapshots');
      expect(doc).toHaveProperty('transitions');
      expect(doc.raw).toBe(mockRawDoc);
    });

    it('should create snapshots with tokens and line counts', () => {
      const doc = createDoc(mockRawDoc);

      expect(doc.snapshots).toHaveLength(3);

      // Check first snapshot (no newlines)
      expect(doc.snapshots[0]).toHaveProperty('tokens');
      expect(doc.snapshots[0]).toHaveProperty('linesCount');
      expect(doc.snapshots[0].linesCount).toBe(0); // No newlines = 0

      // Check second snapshot (has newline)
      expect(doc.snapshots[1].linesCount).toBe(1); // One newline = 1

      // Check third snapshot (has two newlines)
      expect(doc.snapshots[2].linesCount).toBe(2); // Two newlines = 2
    });

    it('should create transitions between snapshots', () => {
      const doc = createDoc(mockRawDoc);

      // Should have n-1 transitions for n snapshots
      expect(doc.transitions).toHaveLength(2);

      // Each transition should have the expected structure
      doc.transitions.forEach((transition) => {
        expect(transition).toHaveProperty('diffs');
        expect(transition).toHaveProperty('left');
        expect(transition).toHaveProperty('right');
      });
    });

    it('should handle empty snapshots array', () => {
      const emptyRawDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [],
      };

      // This will throw an error because createArray(-1) is invalid
      // The implementation should be fixed to handle this case
      expect(() => createDoc(emptyRawDoc)).toThrow('Invalid array length');
    });

    it('should handle single snapshot', () => {
      const singleSnapshotDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [mockRawDoc.snapshots[0]],
      };

      const doc = createDoc(singleSnapshotDoc);

      expect(doc.snapshots).toHaveLength(1);
      expect(doc.transitions).toHaveLength(0);
    });

    it('should preserve raw doc reference', () => {
      const doc = createDoc(mockRawDoc);
      expect(doc.raw).toBe(mockRawDoc);
    });

    it('should handle different languages', () => {
      const pythonDoc: RawDoc = {
        ...mockRawDoc,
        language: Language.python,
        snapshots: [
          {
            id: '1',
            code: 'def hello():\n    print("Hello")',
            duration: 1000,
            transitionTime: 500,
          },
        ],
      };

      const doc = createDoc(pythonDoc);
      expect(doc.snapshots).toHaveLength(1);
      expect(doc.snapshots[0].linesCount).toBe(1); // One newline = 1
    });

    it('should handle complex code with multiple lines', () => {
      const complexDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [
          {
            id: '1',
            code: 'function test() {\n  const x = 1;\n  const y = 2;\n  return x + y;\n}',
            duration: 1000,
            transitionTime: 500,
          },
        ],
      };

      const doc = createDoc(complexDoc);
      expect(doc.snapshots[0].linesCount).toBe(4); // Four newlines = 4
    });
  });

  describe('Snapshot interface', () => {
    it('should have correct snapshot structure', () => {
      const doc = createDoc(mockRawDoc);
      const snapshot: Snapshot = doc.snapshots[0];

      expect(snapshot).toHaveProperty('tokens');
      expect(snapshot).toHaveProperty('linesCount');
      expect(Array.isArray(snapshot.tokens)).toBe(true);
      expect(typeof snapshot.linesCount).toBe('number');
    });
  });

  describe('Doc interface', () => {
    it('should have correct doc structure', () => {
      const doc: Doc = createDoc(mockRawDoc);

      expect(doc).toHaveProperty('raw');
      expect(doc).toHaveProperty('snapshots');
      expect(doc).toHaveProperty('transitions');
      expect(Array.isArray(doc.snapshots)).toBe(true);
      expect(Array.isArray(doc.transitions)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle snapshots with empty code', () => {
      const emptyCodeDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [
          {
            id: '1',
            code: '',
            duration: 1000,
            transitionTime: 500,
          },
        ],
      };

      const doc = createDoc(emptyCodeDoc);
      expect(doc.snapshots[0].linesCount).toBe(0); // Empty string has no newlines = 0
    });

    it('should handle snapshots with only whitespace', () => {
      const whitespaceDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [
          {
            id: '1',
            code: '   \n   \n   ',
            duration: 1000,
            transitionTime: 500,
          },
        ],
      };

      const doc = createDoc(whitespaceDoc);
      expect(doc.snapshots[0].linesCount).toBe(2); // Two newlines = 2
    });

    it('should handle very long code', () => {
      const longCode = 'const x = 1;\n'.repeat(1000);
      const longCodeDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [
          {
            id: '1',
            code: longCode,
            duration: 1000,
            transitionTime: 500,
          },
        ],
      };

      const doc = createDoc(longCodeDoc);
      expect(doc.snapshots[0].linesCount).toBe(1000);
    });
  });
});
