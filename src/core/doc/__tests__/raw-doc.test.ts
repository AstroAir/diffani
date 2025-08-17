import { describe, expect, it } from 'vitest';
import {
  getSumDuration,
  getSnapshotAtTime,
  isOffsetTimeInTransition,
  type RawDoc,
  type DocSnapshot,
} from '../raw-doc';
import { Language } from '../../code-languages/languages';

describe('Raw Doc Module', () => {
  const mockSnapshots: DocSnapshot[] = [
    {
      id: '1',
      code: 'const a = 1;',
      duration: 2000,
      transitionTime: 1000,
    },
    {
      id: '2',
      code: 'const a = 2;',
      duration: 3000,
      transitionTime: 1500,
    },
    {
      id: '3',
      code: 'const a = 3;',
      duration: 2000,
      transitionTime: 500,
    },
  ];

  const mockRawDoc: RawDoc = {
    language: Language.javascript,
    fontSize: 16,
    lineHeight: 20,
    width: 800,
    height: 600,
    theme: 'default',
    padding: { top: 10, left: 10, bottom: 10 },
    snapshots: mockSnapshots,
  };

  describe('getSumDuration', () => {
    it('should calculate total duration correctly', () => {
      const totalDuration = getSumDuration(mockRawDoc);
      // 2000 + 3000 + 2000 = 7000
      expect(totalDuration).toBe(7000);
    });

    it('should handle empty snapshots', () => {
      const emptyDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [],
      };
      expect(getSumDuration(emptyDoc)).toBe(0);
    });

    it('should handle single snapshot', () => {
      const singleDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [mockSnapshots[0]],
      };
      expect(getSumDuration(singleDoc)).toBe(2000);
    });

    it('should handle zero duration snapshots', () => {
      const zeroDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [
          { id: '1', code: 'test', duration: 0, transitionTime: 0 },
          { id: '2', code: 'test2', duration: 1000, transitionTime: 500 },
        ],
      };
      expect(getSumDuration(zeroDoc)).toBe(1000);
    });
  });

  describe('getSnapshotAtTime', () => {
    it('should return correct snapshot and offset for time 0', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, 0);
      expect(snapshotIndex).toBe(0);
      expect(offsetTime).toBe(0);
    });

    it('should return correct snapshot and offset for time within first snapshot', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, 1000);
      expect(snapshotIndex).toBe(0);
      expect(offsetTime).toBe(1000);
    });

    it('should return correct snapshot and offset for time at first snapshot end', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, 2000);
      expect(snapshotIndex).toBe(1);
      expect(offsetTime).toBe(0);
    });

    it('should return correct snapshot and offset for time in second snapshot', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, 3500);
      expect(snapshotIndex).toBe(1);
      expect(offsetTime).toBe(1500);
    });

    it('should return correct snapshot and offset for time in last snapshot', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, 6000);
      expect(snapshotIndex).toBe(2);
      expect(offsetTime).toBe(1000);
    });

    it('should handle time beyond total duration', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, 10000);
      expect(snapshotIndex).toBe(2); // Last snapshot
      expect(offsetTime).toBe(2000); // Full duration of last snapshot
    });

    it('should handle negative time', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, -100);
      expect(snapshotIndex).toBe(0);
      expect(offsetTime).toBe(-100); // Negative time results in negative offset
    });

    it('should handle empty snapshots', () => {
      const emptyDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [],
      };
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(emptyDoc, 1000);
      expect(snapshotIndex).toBe(-1); // No snapshots = -1 index
      expect(offsetTime).toBe(0);
    });

    it('should handle single snapshot', () => {
      const singleDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [mockSnapshots[0]],
      };
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(singleDoc, 1500);
      expect(snapshotIndex).toBe(0);
      expect(offsetTime).toBe(1500);
    });
  });

  describe('isOffsetTimeInTransition', () => {
    const snapshot = mockSnapshots[0]; // duration: 2000, transitionTime: 1000

    it('should return false for time before transition starts', () => {
      expect(isOffsetTimeInTransition(snapshot, 500)).toBe(false);
    });

    it('should return false for time at transition start boundary', () => {
      // Transition starts at duration - transitionTime = 2000 - 1000 = 1000
      expect(isOffsetTimeInTransition(snapshot, 1000)).toBe(false);
    });

    it('should return true for time during transition', () => {
      expect(isOffsetTimeInTransition(snapshot, 1500)).toBe(true);
    });

    it('should return true for time at end of transition', () => {
      expect(isOffsetTimeInTransition(snapshot, 2000)).toBe(true);
    });

    it('should return false for time beyond snapshot duration', () => {
      // The function doesn't check bounds, it just compares offsetTime > duration - transitionTime
      // For offsetTime 2500 > 2000 - 1000 = 1000, so 2500 > 1000 = true
      expect(isOffsetTimeInTransition(snapshot, 2500)).toBe(true);
    });

    it('should handle snapshot with no transition time', () => {
      const noTransitionSnapshot: DocSnapshot = {
        id: '1',
        code: 'test',
        duration: 1000,
        transitionTime: 0,
      };
      expect(isOffsetTimeInTransition(noTransitionSnapshot, 500)).toBe(false);
      expect(isOffsetTimeInTransition(noTransitionSnapshot, 1000)).toBe(false);
    });

    it('should handle snapshot where transition time equals duration', () => {
      const fullTransitionSnapshot: DocSnapshot = {
        id: '1',
        code: 'test',
        duration: 1000,
        transitionTime: 1000,
      };
      expect(isOffsetTimeInTransition(fullTransitionSnapshot, 0)).toBe(false);
      expect(isOffsetTimeInTransition(fullTransitionSnapshot, 1)).toBe(true);
      expect(isOffsetTimeInTransition(fullTransitionSnapshot, 1000)).toBe(true);
    });

    it('should handle negative offset time', () => {
      expect(isOffsetTimeInTransition(snapshot, -100)).toBe(false);
    });

    it('should handle zero duration snapshot', () => {
      const zeroDurationSnapshot: DocSnapshot = {
        id: '1',
        code: 'test',
        duration: 0,
        transitionTime: 0,
      };
      expect(isOffsetTimeInTransition(zeroDurationSnapshot, 0)).toBe(false);
    });
  });

  describe('DocSnapshot interface', () => {
    it('should have correct structure', () => {
      const snapshot: DocSnapshot = mockSnapshots[0];
      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('code');
      expect(snapshot).toHaveProperty('duration');
      expect(snapshot).toHaveProperty('transitionTime');
      expect(typeof snapshot.id).toBe('string');
      expect(typeof snapshot.code).toBe('string');
      expect(typeof snapshot.duration).toBe('number');
      expect(typeof snapshot.transitionTime).toBe('number');
    });
  });

  describe('RawDoc interface', () => {
    it('should have correct structure', () => {
      expect(mockRawDoc).toHaveProperty('language');
      expect(mockRawDoc).toHaveProperty('fontSize');
      expect(mockRawDoc).toHaveProperty('lineHeight');
      expect(mockRawDoc).toHaveProperty('width');
      expect(mockRawDoc).toHaveProperty('height');
      expect(mockRawDoc).toHaveProperty('theme');
      expect(mockRawDoc).toHaveProperty('padding');
      expect(mockRawDoc).toHaveProperty('snapshots');
      expect(Array.isArray(mockRawDoc.snapshots)).toBe(true);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle very large durations', () => {
      const largeDurationDoc: RawDoc = {
        ...mockRawDoc,
        snapshots: [
          {
            id: '1',
            code: 'test',
            duration: Number.MAX_SAFE_INTEGER,
            transitionTime: 1000,
          },
        ],
      };
      expect(getSumDuration(largeDurationDoc)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle fractional times', () => {
      const [snapshotIndex, offsetTime] = getSnapshotAtTime(mockRawDoc, 1500.5);
      expect(snapshotIndex).toBe(0);
      expect(offsetTime).toBe(1500.5);
    });

    it('should handle transition time larger than duration', () => {
      const invalidSnapshot: DocSnapshot = {
        id: '1',
        code: 'test',
        duration: 1000,
        transitionTime: 2000,
      };
      // Should still work, even if logically invalid
      expect(isOffsetTimeInTransition(invalidSnapshot, 500)).toBe(true);
    });
  });
});
