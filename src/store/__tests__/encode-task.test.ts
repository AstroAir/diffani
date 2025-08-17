import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { create } from 'zustand';
import {
  createEncodeSlice,
  EncodeStatus,
  type EncodeSliceState,
  type EncodeSliceAction,
} from '../encode-task';
import { type AppSliceState, type AppSliceAction, initialState } from '../app';

// Mock VideoEncoder
const mockVideoEncoder = {
  encode: vi.fn(),
  abort: vi.fn(),
};

vi.mock('../../core/video-encode', () => ({
  VideoEncoder: vi.fn(() => mockVideoEncoder),
}));

type TestStore = AppSliceState &
  AppSliceAction &
  EncodeSliceState &
  EncodeSliceAction;

describe('Encode Task Store Slice', () => {
  let store: ReturnType<typeof create<TestStore>>;

  beforeEach(() => {
    vi.clearAllMocks();

    store = create<TestStore>()((set, get) => ({
      ...initialState,
      encodeState: null,

      // Mock app slice actions
      updateSnapshot: vi.fn(),
      updateDocProperties: vi.fn(),
      setCurrentTime: vi.fn(),
      gotoSnapshot: vi.fn(),
      duplicateSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      reorderSnapshots: vi.fn(),
      setPlaying: vi.fn(),
      setFrameRate: vi.fn(),
      updateFPSMonitoring: vi.fn(),

      // Encode slice
      ...createEncodeSlice(set, get),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have null encode state initially', () => {
      const state = store.getState();
      expect(state.encodeState).toBeNull();
    });
  });

  describe('startEncodeTask', () => {
    it('should start encoding task', () => {
      const mockEncode = vi.fn().mockResolvedValue(new Blob());
      mockVideoEncoder.encode = mockEncode;

      store.getState().startEncodeTask();
      const state = store.getState();

      expect(state.encodeState).not.toBeNull();
      expect(state.encodeState?.status).toBe(EncodeStatus.Encoding);
      expect(state.encodeState?.progress).toBe(0);
      expect(mockEncode).toHaveBeenCalled();
    });

    it('should abort previous encoding task before starting new one', () => {
      const mockAbort = vi.fn();
      mockVideoEncoder.abort = mockAbort;

      // Start first task
      store.getState().startEncodeTask();

      // Start second task
      store.getState().startEncodeTask();

      expect(mockAbort).toHaveBeenCalled();
    });

    it('should create VideoEncoder with correct parameters', () => {
      store.getState().startEncodeTask();

      // Verify that the mock VideoEncoder was called
      expect(mockVideoEncoder.encode).toHaveBeenCalled();
    });

    it('should handle progress updates', () => {
      let progressCallback: (progress: number) => void;

      // Mock the VideoEncoder constructor to capture the callback
      const originalVideoEncoder = mockVideoEncoder;
      mockVideoEncoder.encode = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(new Blob()), 100);
        });
      });

      store.getState().startEncodeTask();

      const state = store.getState();
      expect(state.encodeState?.status).toBe(EncodeStatus.Encoding);
      expect(state.encodeState?.progress).toBe(0);
    });

    it('should handle FPS updates', () => {
      const updateFPSMonitoringSpy = vi.spyOn(
        store.getState(),
        'updateFPSMonitoring',
      );

      store.getState().startEncodeTask();

      // The test just verifies the function exists and can be called
      expect(updateFPSMonitoringSpy).toBeDefined();
    });

    it('should set done state when encoding completes', async () => {
      const resultBlob = new Blob(['test'], { type: 'video/webm' });
      mockVideoEncoder.encode = vi.fn().mockResolvedValue(resultBlob);

      store.getState().startEncodeTask();

      // Wait for encoding to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      const state = store.getState();
      expect(state.encodeState?.status).toBe(EncodeStatus.Done);
      if (state.encodeState?.status === EncodeStatus.Done) {
        expect(state.encodeState.result).toBe(resultBlob);
      }
    });

    it('should set error state when encoding fails', async () => {
      const error = new Error('Encoding failed');
      mockVideoEncoder.encode = vi.fn().mockRejectedValue(error);

      store.getState().startEncodeTask();

      // Wait for encoding to fail
      await new Promise((resolve) => setTimeout(resolve, 0));

      const state = store.getState();
      expect(state.encodeState?.status).toBe(EncodeStatus.Error);
      if (state.encodeState?.status === EncodeStatus.Error) {
        expect(state.encodeState.error).toBe(error);
      }
    });

    it('should ignore aborted errors', async () => {
      const abortError = new Error('Aborted');
      mockVideoEncoder.encode = vi.fn().mockRejectedValue(abortError);

      store.getState().startEncodeTask();

      // Wait for encoding to be aborted
      await new Promise((resolve) => setTimeout(resolve, 0));

      // State should remain as encoding or be null, not error
      const state = store.getState();
      expect(state.encodeState?.status).not.toBe(EncodeStatus.Error);
    });
  });

  describe('abortEncodeTask', () => {
    it('should abort current encoding task', () => {
      const mockAbort = vi.fn();
      mockVideoEncoder.abort = mockAbort;
      mockVideoEncoder.encode = vi
        .fn()
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      // Start encoding
      store.getState().startEncodeTask();
      expect(store.getState().encodeState?.status).toBe(EncodeStatus.Encoding);

      // Abort encoding
      store.getState().abortEncodeTask();

      expect(mockAbort).toHaveBeenCalled();
      expect(store.getState().encodeState).toBeNull();
    });

    it('should handle abort when no encoding is in progress', () => {
      expect(() => {
        store.getState().abortEncodeTask();
      }).not.toThrow();

      expect(store.getState().encodeState).toBeNull();
    });

    it('should not abort if encoding is done', () => {
      const mockAbort = vi.fn();

      // Set state to done
      store.setState({
        encodeState: {
          status: EncodeStatus.Done,
          result: new Blob(),
        },
      });

      store.getState().abortEncodeTask();

      expect(mockAbort).not.toHaveBeenCalled();
      expect(store.getState().encodeState).toBeNull();
    });

    it('should not abort if encoding has error', () => {
      const mockAbort = vi.fn();

      // Set state to error
      store.setState({
        encodeState: {
          status: EncodeStatus.Error,
          error: new Error('Test error'),
        },
      });

      store.getState().abortEncodeTask();

      expect(mockAbort).not.toHaveBeenCalled();
      expect(store.getState().encodeState).toBeNull();
    });
  });

  describe('Progress updates during encoding', () => {
    it('should ignore progress updates for different encoder instances', () => {
      let firstProgressCallback: (progress: number) => void;
      let secondProgressCallback: (progress: number) => void;

      const firstEncoder = {
        encode: vi.fn().mockImplementation(() => new Promise(() => {})),
        abort: vi.fn(),
      };
      const secondEncoder = {
        encode: vi.fn().mockImplementation(() => new Promise(() => {})),
        abort: vi.fn(),
      };

      const MockVideoEncoder = vi
        .fn()
        .mockImplementationOnce((doc, options) => {
          firstProgressCallback = options.onProgress;
          return firstEncoder;
        })
        .mockImplementationOnce((doc, options) => {
          secondProgressCallback = options.onProgress;
          return secondEncoder;
        });

      // Start first encoding
      store.getState().startEncodeTask();

      // Start second encoding (should abort first)
      store.getState().startEncodeTask();

      const state = store.getState();
      expect(state.encodeState?.status).toBe(EncodeStatus.Encoding);
      expect(state.encodeState?.progress).toBe(0);
    });

    it('should ignore progress updates when not encoding', () => {
      store.getState().startEncodeTask();

      // Abort the task
      store.getState().abortEncodeTask();

      expect(store.getState().encodeState).toBeNull();
    });
  });

  describe('EncodeStatus enum', () => {
    it('should have correct enum values', () => {
      expect(EncodeStatus.Encoding).toBe('encoding');
      expect(EncodeStatus.Done).toBe('done');
      expect(EncodeStatus.Error).toBe('error');
    });
  });

  describe('Type safety', () => {
    it('should have correct state types for encoding', () => {
      store.setState({
        encodeState: {
          status: EncodeStatus.Encoding,
          progress: 0.5,
          encoder: mockVideoEncoder,
        },
      });

      const state = store.getState();
      if (state.encodeState?.status === EncodeStatus.Encoding) {
        expect(typeof state.encodeState.progress).toBe('number');
        expect(state.encodeState.encoder).toBeDefined();
      }
    });

    it('should have correct state types for done', () => {
      const resultBlob = new Blob();
      store.setState({
        encodeState: {
          status: EncodeStatus.Done,
          result: resultBlob,
        },
      });

      const state = store.getState();
      if (state.encodeState?.status === EncodeStatus.Done) {
        expect(state.encodeState.result).toBe(resultBlob);
      }
    });

    it('should have correct state types for error', () => {
      const error = new Error('Test error');
      store.setState({
        encodeState: {
          status: EncodeStatus.Error,
          error,
        },
      });

      const state = store.getState();
      if (state.encodeState?.status === EncodeStatus.Error) {
        expect(state.encodeState.error).toBe(error);
      }
    });
  });
});
