import { describe, expect, it } from 'vitest';
import { clamp, clamp01 } from '../number';

describe('Number Utilities', () => {
  describe('clamp', () => {
    it('should return value when within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should clamp to minimum when value is below', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, -50, 50)).toBe(-50);
    });

    it('should clamp to maximum when value is above', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, -50, 50)).toBe(50);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-25, -30, -20)).toBe(-25);
      expect(clamp(-35, -30, -20)).toBe(-30);
      expect(clamp(-15, -30, -20)).toBe(-20);
    });

    it('should handle fractional numbers', () => {
      expect(clamp(2.5, 0, 5)).toBe(2.5);
      expect(clamp(-0.5, 0, 5)).toBe(0);
      expect(clamp(5.5, 0, 5)).toBe(5);
    });

    it('should handle zero bounds', () => {
      expect(clamp(5, 0, 0)).toBe(0);
      expect(clamp(-5, 0, 0)).toBe(0);
      expect(clamp(0, 0, 0)).toBe(0);
    });

    it('should handle equal min and max', () => {
      expect(clamp(5, 10, 10)).toBe(10);
      expect(clamp(15, 10, 10)).toBe(10);
      expect(clamp(10, 10, 10)).toBe(10);
    });

    it('should handle very large numbers', () => {
      expect(clamp(Number.MAX_VALUE, 0, 100)).toBe(100);
      expect(clamp(Number.MIN_VALUE, 10, 20)).toBe(10);
    });

    it('should handle infinity', () => {
      expect(clamp(Infinity, 0, 100)).toBe(100);
      expect(clamp(-Infinity, 0, 100)).toBe(0);
      expect(clamp(50, -Infinity, Infinity)).toBe(50);
    });

    it('should handle NaN', () => {
      // NaN comparisons always return false, so behavior may vary
      const result = clamp(NaN, 0, 10);
      expect(isNaN(result) || result === 0 || result === 10).toBe(true);
    });

    it('should handle inverted bounds (min > max)', () => {
      // This is technically invalid input, but test the behavior
      expect(clamp(5, 10, 0)).toBe(0); // Math.min(Math.max(5, 10), 0) = Math.min(10, 0) = 0
    });
  });

  describe('clamp01', () => {
    it('should clamp values to 0-1 range', () => {
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(1)).toBe(1);
    });

    it('should clamp negative values to 0', () => {
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(-10)).toBe(0);
      expect(clamp01(-0.001)).toBe(0);
    });

    it('should clamp values above 1 to 1', () => {
      expect(clamp01(1.5)).toBe(1);
      expect(clamp01(10)).toBe(1);
      expect(clamp01(1.001)).toBe(1);
    });

    it('should handle very small positive numbers', () => {
      expect(clamp01(0.0001)).toBe(0.0001);
      expect(clamp01(Number.MIN_VALUE)).toBe(Number.MIN_VALUE);
    });

    it('should handle numbers very close to 1', () => {
      expect(clamp01(0.9999)).toBe(0.9999);
      expect(clamp01(1 - Number.EPSILON)).toBe(1 - Number.EPSILON);
    });

    it('should handle infinity', () => {
      expect(clamp01(Infinity)).toBe(1);
      expect(clamp01(-Infinity)).toBe(0);
    });

    it('should handle NaN', () => {
      const result = clamp01(NaN);
      expect(isNaN(result) || result === 0 || result === 1).toBe(true);
    });

    it('should be equivalent to clamp(value, 0, 1)', () => {
      const testValues = [-5, -0.5, 0, 0.25, 0.5, 0.75, 1, 1.5, 10];
      
      testValues.forEach(value => {
        expect(clamp01(value)).toBe(clamp(value, 0, 1));
      });
    });

    it('should handle edge cases around boundaries', () => {
      expect(clamp01(-Number.EPSILON)).toBe(0);
      expect(clamp01(1 + Number.EPSILON)).toBe(1);
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid successive calls', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        clamp(Math.random() * 20 - 10, 0, 10);
        clamp01(Math.random() * 2 - 0.5);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete in reasonable time
    });
  });

  describe('Type safety and edge cases', () => {
    it('should maintain precision for floating point operations', () => {
      const value = 0.1 + 0.2; // Known floating point precision issue
      const clamped = clamp01(value);
      expect(clamped).toBeCloseTo(0.3, 10);
    });

    it('should handle very precise decimal values', () => {
      const preciseValue = 0.123456789012345;
      expect(clamp01(preciseValue)).toBe(preciseValue);
      expect(clamp(preciseValue, 0, 1)).toBe(preciseValue);
    });

    it('should handle scientific notation', () => {
      expect(clamp01(1e-10)).toBe(1e-10);
      expect(clamp01(1e10)).toBe(1);
      expect(clamp(1e5, 0, 1e6)).toBe(1e5);
    });
  });
});
