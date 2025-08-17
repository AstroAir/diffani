import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSumDuration } from '../core/doc/raw-doc';
import { setRafInterval } from '../utils/raf';
import { type AppSliceState, type AppSliceAction, createAppSlice } from './app';
import {
  type EncodeSliceAction,
  type EncodeSliceState,
  createEncodeSlice,
} from './encode-task';
import {
  type ImportExportSliceState,
  type ImportExportSliceAction,
  createImportExportSlice,
} from './import-export';

export function createStore() {
  const useStore = create<
    AppSliceState &
      AppSliceAction &
      EncodeSliceState &
      EncodeSliceAction &
      ImportExportSliceState &
      ImportExportSliceAction
  >()(
    persist(
      (...args) => ({
        ...createAppSlice(...args),
        ...createEncodeSlice(...args),
        ...createImportExportSlice(...args),
      }),
      {
        name: 'app-store',
        version: 1, // Increment version for new slice
        partialize: (state) => ({
          doc: state.doc,
          currentTime: 0,
          playing: false,
          frameRate: state.frameRate,
          // Persist import/export preferences
          importPreferences: state.importPreferences,
          exportPreferences: state.exportPreferences,
          autoBackupEnabled: state.autoBackupEnabled,
        }),
      },
    ),
  );

  /**
   * Initialize import/export manager
   */
  const initializeImportExport = () => {
    const { initializeManager } = useStore.getState();
    initializeManager();
  };

  // Initialize import/export manager on store creation
  setTimeout(initializeImportExport, 0);

  /**
   * Optimized RAF interval that only runs when playing
   */
  let frameCount = 0;
  let lastFPSUpdate = performance.now();
  let frameDrops = 0;
  let rafCancelFn: (() => void) | null = null;

  const startAnimation = () => {
    if (rafCancelFn) return; // Already running

    rafCancelFn = setRafInterval((delta) => {
      const {
        doc,
        currentTime,
        playing,
        frameRate,
        setCurrentTime,
        updateFPSMonitoring,
      } = useStore.getState();

      if (!playing) {
        stopAnimation();
        return;
      }

      frameCount++;
      const now = performance.now();
      const targetFrameTime = 1000 / frameRate;

      // Check for frame drops (if delta is significantly larger than target)
      if (delta > targetFrameTime * 1.5) {
        frameDrops++;
      }

      // Update FPS monitoring every 500ms
      if (now - lastFPSUpdate > 500) {
        const actualFPS = frameCount / ((now - lastFPSUpdate) / 1000);
        updateFPSMonitoring(actualFPS, frameDrops);
        frameCount = 0;
        frameDrops = 0;
        lastFPSUpdate = now;
      }

      const totalDuration = getSumDuration(doc);
      const newCurrentTime = (currentTime + delta) % totalDuration;

      setCurrentTime(newCurrentTime);
    });
  };

  const stopAnimation = () => {
    if (rafCancelFn) {
      rafCancelFn();
      rafCancelFn = null;
    }
  };

  // Subscribe to playing state changes
  useStore.subscribe(
    (state) => state.playing,
    (playing) => {
      if (playing) {
        startAnimation();
      } else {
        stopAnimation();
      }
    },
  );

  return useStore;
}

export const useStore = createStore();

Object.assign(window, {
  __useStore: useStore,
});
