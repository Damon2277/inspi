import { TestCacheManager, TestResult, CacheEntry } from '../../../../lib/testing/incremental/TestCacheManager';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Mock fs and crypto modules
jest.mock('fs');
jest.mock('crypto');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('TestCacheManager', () => {
  let cacheManager: TestCacheManager;
  const mockCacheDir = '/mock/cache';

  beforeEach(() => {
    // Mock fs operations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation();
    mockFs.readFileSync.mockReturnValue('mock file content');
    mockFs.writeFileSync.mockImplementation();
    mockFs.statSync.mockReturnValue({
      mtime: new Date('2023-01-01'),
      size: 1000
    } as any);

    // Mock crypto operations
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mockhash123')
    };
    mockCrypto.createHash.mockReturnValue(mockHash as any);

    cacheManager = new TestCacheManager({
      cacheDir: mockCacheDir,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 10 * 1024 * 1024, // 10MB
      compressionEnabled: false
    });
  });

  afterEach(() => {
    cacheManager.destroy();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create cache directory if not exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      new TestCacheManager({ cacheDir: '/new/cache' });
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/new/cache', { recursive: true });
    });

    it('should load existing cache on initialization', () => {
      const mockCacheData = {
        version: '1.0.0',
        entries: [{
          key: 'test-key',
          testFile: 'test.spec.ts',
          sourceFiles: ['src/file.ts'],
          sourceHashes: { 'src/file.ts': 'hash123' },
          testHash: 'testhash',
          result: {
            testFile: 'test.spec.ts',
            status: 'passed',
            duration: 1000,
            timestamp: '2023-01-01T00:00:00.000Z'
          },
          dependencies: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastUsed: '2023-01-01T00:00:00.000Z',
          useCount: 0
        }]
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockCacheData));

      const manager = new TestCacheManager({ cacheDir: mockCacheDir });
      const entries = manager.getCacheEntries();
      
      expect(entries).toHaveLength(1);
      expect(entries[0].testFile).toBe('test.spec.ts');
    });
  });

  describe('cache validation', () => {
    it('should validate cache when files unchanged', () => {
      const testFile = 'test.spec.ts';
      const sourceFiles = ['src/file.ts'];
      
      // Cache a result first
      const testResult: TestResult = {
        testFile,
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      cacheManager.cacheResult(testFile, sourceFiles, testResult);
      
      // Should be valid since files haven't changed (same hash)
      const isValid = cacheManager.isCacheValid(testFile, sourceFiles);
      expect(isValid).toBe(true);
    });

    it('should invalidate cache when test file changed', () => {
      const testFile = 'test.spec.ts';
      const sourceFiles = ['src/file.ts'];
      
      const testResult: TestResult = {
        testFile,
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      cacheManager.cacheResult(testFile, sourceFiles, testResult);
      
      // Change the hash to simulate file change
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('newhash456')
      };
      mockCrypto.createHash.mockReturnValue(mockHash as any);
      
      const isValid = cacheManager.isCacheValid(testFile, sourceFiles);
      expect(isValid).toBe(false);
    });

    it('should invalidate cache when source file changed', () => {
      const testFile = 'test.spec.ts';
      const sourceFiles = ['src/file.ts'];
      
      const testResult: TestResult = {
        testFile,
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      cacheManager.cacheResult(testFile, sourceFiles, testResult);
      
      // Simulate source file change by changing its hash
      let callCount = 0;
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? 'mockhash123' : 'newhash456';
        })
      };
      mockCrypto.createHash.mockReturnValue(mockHash as any);
      
      const isValid = cacheManager.isCacheValid(testFile, sourceFiles);
      expect(isValid).toBe(false);
    });

    it('should invalidate cache when dependencies changed', () => {
      const testFile = 'test.spec.ts';
      const sourceFiles = ['src/file.ts'];
      const dependencies = ['src/dep1.ts'];
      
      const testResult: TestResult = {
        testFile,
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      cacheManager.cacheResult(testFile, sourceFiles, testResult, dependencies);
      
      // Check with different dependencies
      const newDependencies = ['src/dep1.ts', 'src/dep2.ts'];
      const isValid = cacheManager.isCacheValid(testFile, sourceFiles, newDependencies);
      expect(isValid).toBe(false);
    });

    it('should invalidate expired cache', () => {
      const testFile = 'test.spec.ts';
      const sourceFiles = ['src/file.ts'];
      
      // Create cache manager with very short max age
      const shortCacheManager = new TestCacheManager({
        cacheDir: mockCacheDir,
        maxAge: 1 // 1ms
      });
      
      const testResult: TestResult = {
        testFile,
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      shortCacheManager.cacheResult(testFile, sourceFiles, testResult);
      
      // Wait for cache to expire
      setTimeout(() => {
        const isValid = shortCacheManager.isCacheValid(testFile, sourceFiles);
        expect(isValid).toBe(false);
      }, 10);
    });
  });

  describe('cache operations', () => {
    it('should cache and retrieve test results', () => {
      const testFile = 'test.spec.ts';
      const sourceFiles = ['src/file.ts'];
      const testResult: TestResult = {
        testFile,
        status: 'passed',
        duration: 1000,
        timestamp: new Date(),
        coverage: {
          statements: 95,
          branches: 90,
          functions: 100,
          lines: 95,
          files: {}
        }
      };
      
      cacheManager.cacheResult(testFile, sourceFiles, testResult);
      
      const cachedResult = cacheManager.getCachedResult(testFile, sourceFiles);
      expect(cachedResult).toEqual(testResult);
    });

    it('should return null for cache miss', () => {
      const testFile = 'nonexistent.spec.ts';
      const sourceFiles = ['src/file.ts'];
      
      const cachedResult = cacheManager.getCachedResult(testFile, sourceFiles);
      expect(cachedResult).toBeNull();
    });

    it('should update cache statistics on hit and miss', () => {
      const testFile = 'test.spec.ts';
      const sourceFiles = ['src/file.ts'];
      
      // Cache miss
      cacheManager.getCachedResult(testFile, sourceFiles);
      
      // Cache result
      const testResult: TestResult = {
        testFile,
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      cacheManager.cacheResult(testFile, sourceFiles, testResult);
      
      // Cache hit
      cacheManager.getCachedResult(testFile, sourceFiles);
      
      const stats = cacheManager.getStats();
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('cache invalidation', () => {
    beforeEach(() => {
      // Set up some cached results
      const testResults = [
        { testFile: 'test1.spec.ts', sourceFiles: ['src/file1.ts'] },
        { testFile: 'test2.spec.ts', sourceFiles: ['src/file2.ts'] },
        { testFile: 'test3.spec.ts', sourceFiles: ['src/file1.ts', 'src/file3.ts'] }
      ];

      testResults.forEach(({ testFile, sourceFiles }) => {
        const result: TestResult = {
          testFile,
          status: 'passed',
          duration: 1000,
          timestamp: new Date()
        };
        cacheManager.cacheResult(testFile, sourceFiles, result);
      });
    });

    it('should invalidate specific test cache', () => {
      cacheManager.invalidateTest('test1.spec.ts');
      
      const result = cacheManager.getCachedResult('test1.spec.ts', ['src/file1.ts']);
      expect(result).toBeNull();
      
      // Other tests should still be cached
      const result2 = cacheManager.getCachedResult('test2.spec.ts', ['src/file2.ts']);
      expect(result2).not.toBeNull();
    });

    it('should invalidate affected tests', () => {
      cacheManager.invalidateAffectedTests(['src/file1.ts']);
      
      // Tests that depend on file1.ts should be invalidated
      const result1 = cacheManager.getCachedResult('test1.spec.ts', ['src/file1.ts']);
      const result3 = cacheManager.getCachedResult('test3.spec.ts', ['src/file1.ts', 'src/file3.ts']);
      expect(result1).toBeNull();
      expect(result3).toBeNull();
      
      // Test that doesn't depend on file1.ts should still be cached
      const result2 = cacheManager.getCachedResult('test2.spec.ts', ['src/file2.ts']);
      expect(result2).not.toBeNull();
    });

    it('should clear all cache', () => {
      cacheManager.clear();
      
      const stats = cacheManager.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('cache size management', () => {
    it('should enforce maximum cache size', () => {
      const smallCacheManager = new TestCacheManager({
        cacheDir: mockCacheDir,
        maxSize: 100 // Very small size
      });

      // Add many entries to exceed size limit
      for (let i = 0; i < 10; i++) {
        const testResult: TestResult = {
          testFile: `test${i}.spec.ts`,
          status: 'passed',
          duration: 1000,
          timestamp: new Date()
        };
        smallCacheManager.cacheResult(`test${i}.spec.ts`, [`src/file${i}.ts`], testResult);
      }

      const stats = smallCacheManager.getStats();
      expect(stats.totalEntries).toBeLessThan(10); // Some entries should be evicted
    });

    it('should cleanup expired entries', () => {
      const shortCacheManager = new TestCacheManager({
        cacheDir: mockCacheDir,
        maxAge: 1 // 1ms
      });

      const testResult: TestResult = {
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      shortCacheManager.cacheResult('test.spec.ts', ['src/file.ts'], testResult);
      
      // Wait for expiration
      setTimeout(() => {
        shortCacheManager.cleanup();
        const stats = shortCacheManager.getStats();
        expect(stats.totalEntries).toBe(0);
      }, 10);
    });
  });

  describe('cache persistence', () => {
    it('should save cache to disk', async () => {
      const testResult: TestResult = {
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      cacheManager.cacheResult('test.spec.ts', ['src/file.ts'], testResult);
      
      await cacheManager.saveCache();
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-cache.json'),
        expect.any(String),
        'utf8'
      );
    });

    it('should handle save errors gracefully', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      // Should not throw
      await expect(cacheManager.saveCache()).resolves.not.toThrow();
    });
  });

  describe('cache export/import', () => {
    it('should export cache data', () => {
      const testResult: TestResult = {
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        timestamp: new Date()
      };
      
      cacheManager.cacheResult('test.spec.ts', ['src/file.ts'], testResult);
      
      const exported = cacheManager.exportCache();
      
      expect(exported.version).toBe('1.0.0');
      expect(exported.entries).toHaveLength(1);
      expect(exported.stats).toBeDefined();
    });

    it('should import cache data', () => {
      const cacheData = {
        version: '1.0.0',
        entries: [[
          'test-key',
          {
            testFile: 'imported.spec.ts',
            sourceFiles: ['src/imported.ts'],
            sourceHashes: { 'src/imported.ts': 'hash123' },
            testHash: 'testhash',
            result: {
              testFile: 'imported.spec.ts',
              status: 'passed',
              duration: 1000,
              timestamp: new Date()
            },
            dependencies: [],
            createdAt: new Date(),
            lastUsed: new Date(),
            useCount: 0
          }
        ]]
      };

      cacheManager.importCache(cacheData);
      
      const entries = cacheManager.getCacheEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].testFile).toBe('imported.spec.ts');
    });
  });

  describe('statistics', () => {
    it('should provide accurate cache statistics', () => {
      // Add some test results
      for (let i = 0; i < 3; i++) {
        const testResult: TestResult = {
          testFile: `test${i}.spec.ts`,
          status: 'passed',
          duration: 1000,
          timestamp: new Date()
        };
        cacheManager.cacheResult(`test${i}.spec.ts`, [`src/file${i}.ts`], testResult);
      }

      // Generate some hits and misses
      cacheManager.getCachedResult('test0.spec.ts', ['src/file0.ts']); // hit
      cacheManager.getCachedResult('nonexistent.spec.ts', ['src/file.ts']); // miss

      const stats = cacheManager.getStats();
      
      expect(stats.totalEntries).toBe(3);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.cacheSize).toBeGreaterThan(0);
    });
  });
});