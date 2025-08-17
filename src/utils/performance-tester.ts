/**
 * Comprehensive Performance Testing Suite for DiffAni
 */

import { memoryOptimizer } from './memory-optimizer';

export interface PerformanceTestResult {
  testName: string;
  duration: number;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryBefore: number | null;
  memoryAfter: number | null;
  memoryDelta: number | null;
  timestamp: number;
}

export interface PerformanceTestSuite {
  name: string;
  tests: PerformanceTestResult[];
  totalDuration: number;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averagePerformance: number;
  };
}

export class PerformanceTester {
  private results: PerformanceTestResult[] = [];
  private currentSuite: string = 'default';

  /**
   * Run a performance test
   */
  async runTest<T>(
    testName: string,
    testFunction: () => T | Promise<T>,
    iterations: number = 1000,
    warmupIterations: number = 10,
  ): Promise<PerformanceTestResult> {
    console.log(`🧪 Running performance test: ${testName}`);

    // Warmup phase
    for (let i = 0; i < warmupIterations; i++) {
      await testFunction();
    }

    // Force garbage collection before test
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    const memoryBefore = this.getMemoryUsage();
    const times: number[] = [];
    
    // Main test phase
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await testFunction();
      const end = performance.now();
      times.push(end - start);
    }

    const memoryAfter = this.getMemoryUsage();
    
    const duration = times.reduce((sum, time) => sum + time, 0);
    const averageTime = duration / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    const result: PerformanceTestResult = {
      testName,
      duration,
      iterations,
      averageTime,
      minTime,
      maxTime,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryBefore && memoryAfter ? memoryAfter - memoryBefore : null,
      timestamp: Date.now(),
    };

    this.results.push(result);
    
    console.log(`✅ Test completed: ${testName}`);
    console.log(`   Average: ${averageTime.toFixed(4)}ms`);
    console.log(`   Range: ${minTime.toFixed(4)}ms - ${maxTime.toFixed(4)}ms`);
    if (result.memoryDelta !== null) {
      console.log(`   Memory: ${(result.memoryDelta / 1024 / 1024).toFixed(2)}MB delta`);
    }

    return result;
  }

  /**
   * Run a comparative test between two functions
   */
  async runComparativeTest<T>(
    testName: string,
    oldFunction: () => T | Promise<T>,
    newFunction: () => T | Promise<T>,
    iterations: number = 1000,
  ): Promise<{
    oldResult: PerformanceTestResult;
    newResult: PerformanceTestResult;
    improvement: number;
    summary: string;
  }> {
    const oldResult = await this.runTest(`${testName} (Before)`, oldFunction, iterations);
    const newResult = await this.runTest(`${testName} (After)`, newFunction, iterations);
    
    const improvement = ((oldResult.averageTime - newResult.averageTime) / oldResult.averageTime) * 100;
    
    const summary = `
Performance Comparison: ${testName}
${'='.repeat(50)}
Before: ${oldResult.averageTime.toFixed(4)}ms average
After:  ${newResult.averageTime.toFixed(4)}ms average
Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}% ${improvement > 0 ? 'faster' : 'slower'}
    `.trim();

    console.log(summary);

    return {
      oldResult,
      newResult,
      improvement,
      summary,
    };
  }

  /**
   * Run DiffAni-specific performance tests
   */
  async runDiffAniTests(): Promise<PerformanceTestSuite> {
    console.log('🚀 Running DiffAni Performance Test Suite');
    console.log('==========================================');

    const suiteStart = performance.now();
    
    // Test 1: Text Style Creation (Optimized vs Unoptimized)
    await this.runComparativeTest(
      'TextStyle Creation',
      () => {
        // Simulate unoptimized version
        return { fontFamily: 'monospace', fontSize: 16 };
      },
      () => {
        // Simulate optimized cached version
        return memoryOptimizer.getCacheValue('textStyle', 'default') || { fontFamily: 'monospace', fontSize: 16 };
      },
      5000,
    );

    // Test 2: Memory Optimizer Performance
    await this.runTest(
      'Memory Optimizer Cache Operations',
      () => {
        const key = `test-${Math.random()}`;
        memoryOptimizer.setCacheValue('test-cache', key, { data: 'test' });
        return memoryOptimizer.getCacheValue('test-cache', key);
      },
      10000,
    );

    // Test 3: Array Operations
    await this.runTest(
      'Large Array Processing',
      () => {
        const arr = Array.from({ length: 1000 }, (_, i) => i);
        return arr.map(x => x * 2).filter(x => x % 4 === 0);
      },
      1000,
    );

    // Test 4: JSON Serialization
    await this.runTest(
      'JSON Serialization',
      () => {
        const data = {
          snapshots: Array.from({ length: 100 }, (_, i) => ({
            id: `snapshot-${i}`,
            code: `const x = ${i};\nconsole.log(x);`,
            duration: 1000,
          })),
        };
        return JSON.stringify(data);
      },
      500,
    );

    const suiteEnd = performance.now();
    const totalDuration = suiteEnd - suiteStart;

    const suite: PerformanceTestSuite = {
      name: 'DiffAni Performance Suite',
      tests: [...this.results],
      totalDuration,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.length, // All tests pass if they complete
        failedTests: 0,
        averagePerformance: this.results.reduce((sum, test) => sum + test.averageTime, 0) / this.results.length,
      },
    };

    console.log('\n📊 Test Suite Summary');
    console.log('=====================');
    console.log(`Total Tests: ${suite.summary.totalTests}`);
    console.log(`Total Duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`Average Performance: ${suite.summary.averagePerformance.toFixed(4)}ms`);

    return suite;
  }

  /**
   * Export test results
   */
  exportResults(filename?: string): void {
    const data = {
      suite: this.currentSuite,
      results: this.results,
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        memory: this.getMemoryUsage(),
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `diffani-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return null;
  }

  /**
   * Get test results
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  /**
   * Set current test suite name
   */
  setSuite(name: string): void {
    this.currentSuite = name;
  }
}

/**
 * Global performance tester instance
 */
export const performanceTester = new PerformanceTester();

/**
 * Quick performance test function
 */
export async function quickPerformanceTest<T>(
  name: string,
  fn: () => T | Promise<T>,
  iterations: number = 1000,
): Promise<PerformanceTestResult> {
  return performanceTester.runTest(name, fn, iterations);
}

/**
 * Performance test decorator
 */
export function performanceTest(testName?: string, iterations: number = 100) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const originalMethod = descriptor.value;
    
    if (originalMethod) {
      descriptor.value = (async function (this: any, ...args: any[]) {
        const name = testName || `${target.constructor.name}.${propertyKey}`;
        
        return performanceTester.runTest(
          name,
          () => originalMethod.apply(this, args),
          iterations,
        );
      }) as any;
    }
    
    return descriptor;
  };
}
