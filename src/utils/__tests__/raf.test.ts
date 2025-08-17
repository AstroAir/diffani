import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { setRafInterval } from '../raf';

describe('RAF Utilities', () => {
  let mockRequestAnimationFrame: ReturnType<typeof vi.fn>;
  let mockCancelAnimationFrame: ReturnType<typeof vi.fn>;
  let mockPerformanceNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRequestAnimationFrame = vi.fn();
    mockCancelAnimationFrame = vi.fn();
    mockPerformanceNow = vi.fn();

    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    global.performance = { now: mockPerformanceNow } as any;

    // Reset call counts
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setRafInterval', () => {
    it('should call callback with delta time', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;

      mockPerformanceNow
        .mockReturnValueOnce(1000) // Initial time
        .mockReturnValueOnce(1000) // First call (0ms delta)
        .mockReturnValueOnce(1016); // Second call (16ms delta)

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      const cancel = setRafInterval(callback);

      // Initial call should happen immediately with 0 delta
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0); // First call always has 0 delta

      // Simulate next frame
      rafCallback!(1016);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(16); // 1016 - 1000

      expect(typeof cancel).toBe('function');
    });

    it('should schedule next frame after callback', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1016);

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      setRafInterval(callback);

      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);

      // Trigger the RAF callback
      rafCallback!(1016);

      // Should schedule next frame
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('should return cancel function that stops the interval', () => {
      const callback = vi.fn();
      mockPerformanceNow.mockReturnValue(1000);
      mockRequestAnimationFrame.mockReturnValue(123);

      const cancel = setRafInterval(callback);

      cancel();

      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(123);
    });

    it('should handle multiple intervals independently', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      mockPerformanceNow.mockReturnValue(1000);
      mockRequestAnimationFrame.mockReturnValueOnce(1).mockReturnValueOnce(2);

      const cancel1 = setRafInterval(callback1);
      const cancel2 = setRafInterval(callback2);

      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      cancel1();
      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(1);

      cancel2();
      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(2);
    });

    it('should handle zero delta time', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1000); // Same time = 0 delta

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      setRafInterval(callback);

      rafCallback!(1000);

      expect(callback).toHaveBeenCalledWith(0);
    });

    it('should handle negative delta time', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(990); // Time went backwards

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      setRafInterval(callback);

      rafCallback!(990);

      expect(callback).toHaveBeenCalledWith(-10);
    });

    it('should handle large delta times', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(2000); // 1 second delta

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      setRafInterval(callback);

      rafCallback!(2000);

      expect(callback).toHaveBeenCalledWith(1000);
    });

    it('should continue running until cancelled', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;
      let frameId = 1;

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1016)
        .mockReturnValueOnce(1032)
        .mockReturnValueOnce(1048);

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return frameId++;
        },
      );

      const cancel = setRafInterval(callback);

      // Initial call
      expect(callback).toHaveBeenCalledTimes(1);

      // First frame
      rafCallback!(1016);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);

      // Second frame
      rafCallback!(1032);
      expect(callback).toHaveBeenCalledTimes(3);
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(3);

      // Cancel before third frame
      cancel();
      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(3);
    });

    it('should handle callback errors gracefully', () => {
      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      let rafCallback: FrameRequestCallback;

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1016);

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      expect(() => {
        setRafInterval(callback);
      }).toThrow('Callback error');
    });

    it('should work with fractional timestamps', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;

      mockPerformanceNow
        .mockReturnValueOnce(1000.123) // Initial time
        .mockReturnValueOnce(1000.123) // First call (0 delta)
        .mockReturnValueOnce(1016.456); // Second call

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      setRafInterval(callback);

      rafCallback!(1016.456);

      expect(callback).toHaveBeenCalledWith(0); // First call
      expect(callback).toHaveBeenLastCalledWith(expect.closeTo(16.333, 2)); // Second call
    });

    it('should handle multiple cancellations safely', () => {
      const callback = vi.fn();
      mockPerformanceNow.mockReturnValue(1000);
      mockRequestAnimationFrame.mockReturnValue(1);

      const cancel = setRafInterval(callback);

      cancel();
      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(1);

      // Second cancellation should not cause issues
      cancel();
      expect(mockCancelAnimationFrame).toHaveBeenCalledTimes(2);
      expect(mockCancelAnimationFrame).toHaveBeenLastCalledWith(1);
    });

    it('should maintain correct timing across multiple frames', () => {
      const callback = vi.fn();
      const deltas: number[] = [];
      let rafCallback: FrameRequestCallback;

      callback.mockImplementation((delta: number) => {
        deltas.push(delta);
      });

      const timestamps = [1000, 1000, 1016, 1033, 1049, 1066]; // Added extra 1000 for first call
      let timestampIndex = 0;

      mockPerformanceNow.mockImplementation(() => timestamps[timestampIndex++]);

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      setRafInterval(callback);

      // Simulate several frames
      for (let i = 2; i < timestamps.length; i++) {
        // Start from index 2
        rafCallback!(timestamps[i]);
      }

      expect(deltas).toEqual([0, 16, 17, 16, 17]); // Expected deltas including initial 0
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle rapid start/stop cycles', () => {
      const callback = vi.fn();
      mockPerformanceNow.mockReturnValue(1000);
      mockRequestAnimationFrame.mockReturnValue(1);

      for (let i = 0; i < 100; i++) {
        const cancel = setRafInterval(callback);
        cancel();
      }

      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(100);
      expect(mockCancelAnimationFrame).toHaveBeenCalledTimes(100);
    });

    it('should work when performance.now returns very large numbers', () => {
      const callback = vi.fn();
      let rafCallback: FrameRequestCallback;

      const largeTime = Number.MAX_SAFE_INTEGER - 1000;
      mockPerformanceNow
        .mockReturnValueOnce(largeTime)
        .mockReturnValueOnce(largeTime + 16);

      mockRequestAnimationFrame.mockImplementation(
        (cb: FrameRequestCallback) => {
          rafCallback = cb;
          return 1;
        },
      );

      setRafInterval(callback);

      rafCallback!(largeTime + 16);

      expect(callback).toHaveBeenCalledWith(16);
    });
  });
});
