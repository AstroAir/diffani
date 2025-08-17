import { describe, expect, it } from 'vitest';
import { assert, assertNonNull } from '../assert';

describe('Assert Utility', () => {
  describe('assert function', () => {
    it('should not throw when value is not null or undefined', () => {
      expect(() => assert(true, 'Should not throw')).not.toThrow();
      expect(() => assert(false, 'False is not null')).not.toThrow();
      expect(() => assert(1, 'Truthy value')).not.toThrow();
      expect(() => assert(0, 'Zero is not null')).not.toThrow();
      expect(() => assert('non-empty', 'Non-empty string')).not.toThrow();
      expect(() => assert('', 'Empty string is not null')).not.toThrow();
      expect(() => assert({}, 'Object')).not.toThrow();
      expect(() => assert([], 'Array')).not.toThrow();
      expect(() => assert(NaN, 'NaN is not null')).not.toThrow();
    });

    it('should throw TypeError when value is null', () => {
      expect(() => assert(null, 'Should throw')).toThrow(TypeError);
      expect(() => assert(null, 'Should throw')).toThrow('Should throw');
    });

    it('should throw TypeError when value is undefined', () => {
      expect(() => assert(undefined, 'Should throw')).toThrow(TypeError);
      expect(() => assert(undefined, 'Should throw')).toThrow('Should throw');
    });

    it('should throw TypeError with correct message', () => {
      const message = 'Custom error message';

      try {
        assert(null, message);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect((error as Error).message).toBe(message);
      }
    });

    it('should handle objects and arrays', () => {
      const obj = { prop: 'value' };
      const arr = [1, 2, 3];
      const date = new Date();
      const error = new Error();

      expect(() => assert(obj, 'Object should exist')).not.toThrow();
      expect(() => assert(arr, 'Array should exist')).not.toThrow();
      expect(() => assert(date, 'Date should exist')).not.toThrow();
      expect(() => assert(error, 'Error should exist')).not.toThrow();
    });

    it('should handle empty message', () => {
      expect(() => assert(null, '')).toThrow('');
    });

    it('should handle message with special characters', () => {
      const specialMessage = 'Error: "value" is null/undefined! @#$%^&*()';
      expect(() => assert(null, specialMessage)).toThrow(specialMessage);
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      expect(() => assert(null, longMessage)).toThrow(longMessage);
    });

    it('should maintain stack trace information', () => {
      try {
        assert(null, 'Test error');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect((error as Error).stack).toBeDefined();
        expect((error as Error).stack).toContain('assert.test.ts');
      }
    });
  });

  describe('assertNonNull function', () => {
    it('should return value when not null or undefined', () => {
      expect(assertNonNull(true, 'Should not throw')).toBe(true);
      expect(assertNonNull(false, 'False is not null')).toBe(false);
      expect(assertNonNull(1, 'Truthy value')).toBe(1);
      expect(assertNonNull(0, 'Zero is not null')).toBe(0);
      expect(assertNonNull('test', 'String')).toBe('test');
      expect(assertNonNull('', 'Empty string')).toBe('');

      const obj = { key: 'value' };
      expect(assertNonNull(obj, 'Object')).toBe(obj);

      const arr = [1, 2, 3];
      expect(assertNonNull(arr, 'Array')).toBe(arr);
    });

    it('should throw TypeError when value is null', () => {
      expect(() => assertNonNull(null, 'Should throw')).toThrow(TypeError);
      expect(() => assertNonNull(null, 'Should throw')).toThrow('Should throw');
    });

    it('should throw TypeError when value is undefined', () => {
      expect(() => assertNonNull(undefined, 'Should throw')).toThrow(TypeError);
      expect(() => assertNonNull(undefined, 'Should throw')).toThrow(
        'Should throw',
      );
    });

    it('should use default message when none provided', () => {
      expect(() => assertNonNull(null)).toThrow('object should not be null');
    });

    it('should throw TypeError with correct message', () => {
      const message = 'Custom error message';

      try {
        assertNonNull(null, message);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect((error as Error).message).toBe(message);
      }
    });
  });

  describe('Performance considerations', () => {
    it('should be fast for non-null values', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        assert(true, 'Performance test');
        assertNonNull(i, 'Performance test');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should be very fast
    });
  });
});
