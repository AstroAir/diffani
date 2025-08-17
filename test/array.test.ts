import { describe, expect, it } from 'vitest';
import {
  createArray,
  updateArrayAt,
  removeArrayAt,
  insertArrayAt,
} from '../src/utils/array';

describe('Array Utilities', () => {
  describe('createArray', () => {
    it('should create array with correct length and values', () => {
      expect(createArray(4, (i) => i * i)).toEqual([0, 1, 4, 9]);
    });

    it('should create empty array for length 0', () => {
      expect(createArray(0, (i) => i)).toEqual([]);
    });

    it('should create array with single element', () => {
      expect(createArray(1, (i) => `item-${i}`)).toEqual(['item-0']);
    });

    it('should pass correct index to init function', () => {
      const indices: number[] = [];
      createArray(3, (i) => {
        indices.push(i);
        return i;
      });
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should handle complex init functions', () => {
      const result = createArray(3, (i) => ({ id: i, value: i * 2 }));
      expect(result).toEqual([
        { id: 0, value: 0 },
        { id: 1, value: 2 },
        { id: 2, value: 4 },
      ]);
    });

    it('should handle large arrays', () => {
      const result = createArray(1000, (i) => i);
      expect(result).toHaveLength(1000);
      expect(result[0]).toBe(0);
      expect(result[999]).toBe(999);
    });
  });

  describe('updateArrayAt', () => {
    const originalArray = ['a', 'b', 'c', 'd'];

    it('should update element at given index', () => {
      const result = updateArrayAt(originalArray, 1, 'updated');
      expect(result).toEqual(['a', 'updated', 'c', 'd']);
    });

    it('should not mutate original array', () => {
      const result = updateArrayAt(originalArray, 1, 'updated');
      expect(originalArray).toEqual(['a', 'b', 'c', 'd']);
      expect(result).not.toBe(originalArray);
    });

    it('should update first element', () => {
      const result = updateArrayAt(originalArray, 0, 'first');
      expect(result).toEqual(['first', 'b', 'c', 'd']);
    });

    it('should update last element', () => {
      const result = updateArrayAt(originalArray, 3, 'last');
      expect(result).toEqual(['a', 'b', 'c', 'last']);
    });

    it('should handle empty array', () => {
      const result = updateArrayAt([], 0, 'new');
      expect(result).toEqual(['new']);
    });

    it('should handle out-of-bounds index', () => {
      const result = updateArrayAt(originalArray, 10, 'out-of-bounds');
      expect(result[10]).toBe('out-of-bounds');
      expect(result).toHaveLength(11);
    });
  });

  describe('removeArrayAt', () => {
    const originalArray = ['a', 'b', 'c', 'd'];

    it('should remove element at given index', () => {
      const result = removeArrayAt(originalArray, 1);
      expect(result).toEqual(['a', 'c', 'd']);
    });

    it('should not mutate original array', () => {
      const result = removeArrayAt(originalArray, 1);
      expect(originalArray).toEqual(['a', 'b', 'c', 'd']);
      expect(result).not.toBe(originalArray);
    });

    it('should remove first element', () => {
      const result = removeArrayAt(originalArray, 0);
      expect(result).toEqual(['b', 'c', 'd']);
    });

    it('should remove last element', () => {
      const result = removeArrayAt(originalArray, 3);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle single element array', () => {
      const result = removeArrayAt(['only'], 0);
      expect(result).toEqual([]);
    });

    it('should handle empty array gracefully', () => {
      const result = removeArrayAt([], 0);
      expect(result).toEqual([]);
    });

    it('should handle negative index', () => {
      const result = removeArrayAt(originalArray, -1);
      expect(result).toEqual(originalArray); // No change for negative index
    });

    it('should handle out-of-bounds index', () => {
      const result = removeArrayAt(originalArray, 10);
      expect(result).toEqual(originalArray); // No change for out-of-bounds
    });
  });

  describe('insertArrayAt', () => {
    const originalArray = ['a', 'b', 'c'];

    it('should insert element at given index', () => {
      const result = insertArrayAt(originalArray, 1, 'inserted');
      expect(result).toEqual(['a', 'inserted', 'b', 'c']);
    });

    it('should not mutate original array', () => {
      const result = insertArrayAt(originalArray, 1, 'inserted');
      expect(originalArray).toEqual(['a', 'b', 'c']);
      expect(result).not.toBe(originalArray);
    });

    it('should insert at beginning', () => {
      const result = insertArrayAt(originalArray, 0, 'first');
      expect(result).toEqual(['first', 'a', 'b', 'c']);
    });

    it('should insert at end', () => {
      const result = insertArrayAt(originalArray, 3, 'last');
      expect(result).toEqual(['a', 'b', 'c', 'last']);
    });

    it('should handle empty array', () => {
      const result = insertArrayAt([], 0, 'new');
      expect(result).toEqual(['new']);
    });

    it('should handle out-of-bounds index by appending', () => {
      const result = insertArrayAt(originalArray, 10, 'appended');
      expect(result).toEqual(['a', 'b', 'c', 'appended']);
    });

    it('should handle negative index by prepending', () => {
      const result = insertArrayAt(originalArray, -1, 'prepended');
      expect(result).toEqual(['prepended', 'a', 'b', 'c']);
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle arrays with different data types', () => {
      const mixedArray = [1, 'string', { key: 'value' }, null, undefined];

      const updated = updateArrayAt(mixedArray, 2, 'replaced');
      expect(updated[2]).toBe('replaced');

      const removed = removeArrayAt(mixedArray, 1);
      expect(removed).toEqual([1, { key: 'value' }, null, undefined]);

      const inserted = insertArrayAt(mixedArray, 1, 'inserted');
      expect(inserted[1]).toBe('inserted');
    });

    it('should maintain array references correctly', () => {
      const objArray = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const updated = updateArrayAt(objArray, 1, { id: 4 });

      expect(updated[0]).toBe(objArray[0]); // Same reference
      expect(updated[1]).not.toBe(objArray[1]); // Different reference
      expect(updated[2]).toBe(objArray[2]); // Same reference
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = createArray(10000, (i) => i);

      const start = performance.now();
      const updated = updateArrayAt(largeArray, 5000, 'updated');
      const removed = removeArrayAt(largeArray, 5000);
      const inserted = insertArrayAt(largeArray, 5000, 'inserted');
      const end = performance.now();

      expect(updated[5000]).toBe('updated');
      expect(removed).toHaveLength(9999);
      expect(inserted[5000]).toBe('inserted');
      expect(end - start).toBeLessThan(100); // Should be reasonably fast
    });
  });
});
