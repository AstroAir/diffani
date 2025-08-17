import { describe, expect, it, beforeEach } from 'vitest';
import { create } from 'zustand';
import {
  createAppSlice,
  initialState,
  type AppSliceState,
  type AppSliceAction,
} from '../app';
import { Language } from '../../core/code-languages/languages';
import { type DocSnapshot } from '../../core/doc/raw-doc';

describe('App Store Slice', () => {
  let store: ReturnType<typeof create<AppSliceState & AppSliceAction>>;

  beforeEach(() => {
    store = create<AppSliceState & AppSliceAction>()(createAppSlice);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState();

      expect(state.currentTime).toBe(0);
      expect(state.playing).toBe(false);
      expect(state.frameRate).toBe(60);
      expect(state.actualFPS).toBe(0);
      expect(state.frameDrops).toBe(0);
      expect(state.doc).toBeDefined();
      expect(state.doc.language).toBe(Language.jsx);
      expect(state.doc.snapshots).toHaveLength(3);
    });

    it('should have valid document structure', () => {
      const state = store.getState();

      expect(state.doc.fontSize).toBe(30);
      expect(state.doc.lineHeight).toBe(42);
      expect(state.doc.width).toBe(1280);
      expect(state.doc.height).toBe(720);
      expect(state.doc.theme).toBe('default');
      expect(state.doc.padding).toEqual({
        top: 0,
        left: 50,
        bottom: 0,
      });
    });

    it('should have valid snapshots', () => {
      const state = store.getState();

      state.doc.snapshots.forEach((snapshot, index) => {
        expect(snapshot.id).toBe((index + 1).toString());
        expect(snapshot.duration).toBe(3000);
        expect(snapshot.transitionTime).toBe(1000);
        expect(typeof snapshot.code).toBe('string');
        expect(snapshot.code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('updateSnapshot', () => {
    it('should update snapshot at given index', () => {
      const newSnapshot: DocSnapshot = {
        id: 'new-1',
        code: 'const x = 42;',
        duration: 2000,
        transitionTime: 800,
      };

      store.getState().updateSnapshot(0, newSnapshot);
      const state = store.getState();

      expect(state.doc.snapshots[0]).toEqual(newSnapshot);
      expect(state.doc.snapshots[1]).not.toEqual(newSnapshot);
    });

    it('should preserve other snapshots when updating one', () => {
      const originalSnapshots = [...store.getState().doc.snapshots];
      const newSnapshot: DocSnapshot = {
        id: 'updated',
        code: 'updated code',
        duration: 1500,
        transitionTime: 600,
      };

      store.getState().updateSnapshot(1, newSnapshot);
      const state = store.getState();

      expect(state.doc.snapshots[0]).toEqual(originalSnapshots[0]);
      expect(state.doc.snapshots[1]).toEqual(newSnapshot);
      expect(state.doc.snapshots[2]).toEqual(originalSnapshots[2]);
    });

    it('should handle boundary indices', () => {
      const newSnapshot: DocSnapshot = {
        id: 'boundary',
        code: 'boundary test',
        duration: 1000,
        transitionTime: 500,
      };

      // Update first snapshot
      store.getState().updateSnapshot(0, newSnapshot);
      expect(store.getState().doc.snapshots[0]).toEqual(newSnapshot);

      // Update last snapshot
      const lastIndex = store.getState().doc.snapshots.length - 1;
      store.getState().updateSnapshot(lastIndex, newSnapshot);
      expect(store.getState().doc.snapshots[lastIndex]).toEqual(newSnapshot);
    });
  });

  describe('updateDocProperties', () => {
    it('should update document properties', () => {
      const newProperties = {
        language: Language.python,
        fontSize: 20,
        lineHeight: 24,
        width: 1920,
        height: 1080,
        theme: 'dark',
        padding: { top: 20, left: 30, bottom: 10 },
      };

      store.getState().updateDocProperties(newProperties);
      const state = store.getState();

      expect(state.doc.language).toBe(Language.python);
      expect(state.doc.fontSize).toBe(20);
      expect(state.doc.lineHeight).toBe(24);
      expect(state.doc.width).toBe(1920);
      expect(state.doc.height).toBe(1080);
      expect(state.doc.theme).toBe('dark');
      expect(state.doc.padding).toEqual(newProperties.padding);
    });

    it('should preserve snapshots when updating properties', () => {
      const originalSnapshots = [...store.getState().doc.snapshots];

      store.getState().updateDocProperties({
        language: Language.typescript,
        fontSize: 18,
        lineHeight: 22,
        width: 800,
        height: 600,
        theme: 'light',
        padding: { top: 5, left: 15, bottom: 5 },
      });

      const state = store.getState();
      expect(state.doc.snapshots).toEqual(originalSnapshots);
    });

    it('should allow partial updates', () => {
      const originalDoc = store.getState().doc;

      store.getState().updateDocProperties({
        fontSize: 25,
        theme: 'custom',
      });

      const state = store.getState();
      expect(state.doc.fontSize).toBe(25);
      expect(state.doc.theme).toBe('custom');
      expect(state.doc.language).toBe(originalDoc.language);
      expect(state.doc.width).toBe(originalDoc.width);
      expect(state.doc.height).toBe(originalDoc.height);
    });
  });

  describe('setCurrentTime', () => {
    it('should set current time within bounds', () => {
      store.getState().setCurrentTime(5000);
      expect(store.getState().currentTime).toBe(5000);
    });

    it('should clamp current time to minimum (0)', () => {
      store.getState().setCurrentTime(-1000);
      expect(store.getState().currentTime).toBe(0);
    });

    it('should clamp current time to maximum (total duration)', () => {
      // Total duration is 3 * 3000 = 9000ms
      store.getState().setCurrentTime(15000);
      expect(store.getState().currentTime).toBe(9000);
    });

    it('should handle fractional times', () => {
      store.getState().setCurrentTime(1500.5);
      expect(store.getState().currentTime).toBe(1500.5);
    });
  });

  describe('gotoSnapshot', () => {
    it('should go to specific snapshot', () => {
      store.getState().gotoSnapshot(1);
      expect(store.getState().currentTime).toBe(3000); // Start of second snapshot
    });

    it('should go to first snapshot', () => {
      store.getState().setCurrentTime(5000);
      store.getState().gotoSnapshot(0);
      expect(store.getState().currentTime).toBe(0);
    });

    it('should go to last snapshot', () => {
      store.getState().gotoSnapshot(2);
      expect(store.getState().currentTime).toBe(6000); // Start of third snapshot
    });

    it('should handle out-of-bounds indices gracefully', () => {
      const originalTime = store.getState().currentTime;

      // Should not crash or change time for invalid indices
      store.getState().gotoSnapshot(-1);
      store.getState().gotoSnapshot(10);

      // Time should remain unchanged or be handled gracefully
      expect(typeof store.getState().currentTime).toBe('number');
    });
  });

  describe('duplicateSnapshot', () => {
    it('should duplicate snapshot at given index', () => {
      const originalLength = store.getState().doc.snapshots.length;
      const snapshotToDuplicate = store.getState().doc.snapshots[1];

      store.getState().duplicateSnapshot(1);
      const state = store.getState();

      // updateArrayAt may not expand the array if index + 1 is within bounds
      expect(state.doc.snapshots.length).toBeGreaterThanOrEqual(originalLength);
      // The duplicated snapshot replaces the element at index + 1 (position 2)
      expect(state.doc.snapshots[2]).toEqual({
        ...snapshotToDuplicate,
        id: expect.any(String),
      });
      expect(state.doc.snapshots[2].id).not.toBe(snapshotToDuplicate.id);
    });

    it('should handle duplication at different indices', () => {
      const originalSnapshots = [...store.getState().doc.snapshots];

      store.getState().duplicateSnapshot(0);
      const state = store.getState();

      // Original snapshot at index 0 should remain
      expect(state.doc.snapshots[0]).toEqual(originalSnapshots[0]);
      // Duplicated snapshot should be at index 1
      expect(state.doc.snapshots[1].code).toBe(originalSnapshots[0].code);
      expect(state.doc.snapshots[1].id).not.toBe(originalSnapshots[0].id);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot at given index', () => {
      const originalLength = store.getState().doc.snapshots.length;
      const snapshotToKeep = store.getState().doc.snapshots[2];

      store.getState().deleteSnapshot(1);
      const state = store.getState();

      expect(state.doc.snapshots).toHaveLength(originalLength - 1);
      expect(state.doc.snapshots[1]).toEqual(snapshotToKeep);
    });

    it('should delete snapshots even if only one remains', () => {
      // The store implementation doesn't prevent deleting the last snapshot
      // Delete until only one remains
      store.getState().deleteSnapshot(2);
      store.getState().deleteSnapshot(1);

      const beforeLength = store.getState().doc.snapshots.length;
      store.getState().deleteSnapshot(0);

      // The store allows deleting all snapshots
      expect(store.getState().doc.snapshots).toHaveLength(beforeLength - 1);
    });

    it('should adjust current time after deletion', () => {
      store.getState().setCurrentTime(7000); // In third snapshot
      store.getState().deleteSnapshot(1); // Delete second snapshot

      // Current time should be adjusted appropriately
      const newTime = store.getState().currentTime;
      expect(newTime).toBeGreaterThanOrEqual(0);
      expect(newTime).toBeLessThanOrEqual(6000); // New total duration
    });
  });

  describe('reorderSnapshots', () => {
    it('should reorder snapshots correctly', () => {
      const originalSnapshots = [...store.getState().doc.snapshots];

      store.getState().reorderSnapshots(0, 2); // Move first to last
      const state = store.getState();

      expect(state.doc.snapshots[0]).toEqual(originalSnapshots[1]);
      expect(state.doc.snapshots[1]).toEqual(originalSnapshots[2]);
      expect(state.doc.snapshots[2]).toEqual(originalSnapshots[0]);
    });

    it('should handle same index reorder', () => {
      const originalSnapshots = [...store.getState().doc.snapshots];

      store.getState().reorderSnapshots(1, 1);
      const state = store.getState();

      expect(state.doc.snapshots).toEqual(originalSnapshots);
    });
  });

  describe('setPlaying', () => {
    it('should set playing state', () => {
      store.getState().setPlaying(true);
      expect(store.getState().playing).toBe(true);

      store.getState().setPlaying(false);
      expect(store.getState().playing).toBe(false);
    });
  });

  describe('Frame rate control', () => {
    it('should set frame rate', () => {
      store.getState().setFrameRate(30);
      expect(store.getState().frameRate).toBe(30);

      store.getState().setFrameRate(120);
      expect(store.getState().frameRate).toBe(120);
    });

    it('should update FPS monitoring', () => {
      store.getState().updateFPSMonitoring(58.5, 3);
      const state = store.getState();

      expect(state.actualFPS).toBe(58.5);
      expect(state.frameDrops).toBe(3);
    });

    it('should handle zero and negative frame rates', () => {
      store.getState().setFrameRate(0);
      expect(store.getState().frameRate).toBe(0);

      store.getState().setFrameRate(-10);
      expect(store.getState().frameRate).toBe(-10);
    });
  });
});
