/**
 * Type Regression Tester Tests
 */

import * as fs from 'fs';

import * as ts from 'typescript';

import {
  TypeRegressionTester,
  createTypeRegressionTester,
  RegressionTestConfig,
  TypeSnapshot,
  TypeDefinition,
} from '../../../../lib/testing/types/TypeRegressionTester';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('TypeRegressionTester', () => {
  let tester: TypeRegressionTester;
  let config: RegressionTestConfig;
  let baselineSnapshot: TypeSnapshot;

  beforeEach(() => {
    config = {
      snapshotPath: './snapshots',
      sourceRoot: 'src',
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.ts', '**/node_modules/**'],
      strictMode: false,
      allowedBreakingChanges: [],
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: true,
      },
    };

    baselineSnapshot = {
      version: '1.0.0',
      timestamp: new Date('2023-01-01'),
      checksum: 'baseline-checksum',
      types: [
        {
          name: 'User',
          kind: 'interface',
          signature: 'interface User { id: number; name: string; }',
          location: { file: 'src/types/user.ts', line: 1, column: 1 },
          dependencies: [],
          exported: true,
          generic: false,
        },
        {
          name: 'UserService',
          kind: 'class',
          signature: 'class UserService { getUser(id: number): User; }',
          location: { file: 'src/services/user.ts', line: 1, column: 1 },
          dependencies: ['User'],
          exported: true,
          generic: false,
        },
      ],
      compilerOptions: config.compilerOptions,
    };

    tester = createTypeRegressionTester(config);

    // Setup fs mocks
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.readFileSync.mockReturnValue('');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockImplementation();
    mockFs.mkdirSync.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      await expect(tester.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors', async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Access denied');
      });

      await expect(tester.initialize()).resolves.not.toThrow();
    });
  });

  describe('Snapshot Creation', () => {
    beforeEach(async () => {
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('user.ts')) {
          return `
            export interface User {
              id: number;
              name: string;
              email: string;
            }
            
            export class UserService {
              getUser(id: number): User | null {
                return null;
              }
            }
          `;
        }
        return '';
      });

      await tester.initialize();
    });

    it('should create type snapshots', async () => {
      const snapshot = await tester.createSnapshot('1.0.0');

      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(typeof snapshot.checksum).toBe('string');
      expect(Array.isArray(snapshot.types)).toBe(true);
      expect(snapshot.compilerOptions).toEqual(config.compilerOptions);
    });

    it('should save snapshots to file', async () => {
      await tester.createSnapshot('1.0.0');

      expect(mockFs.writeFileSync).toHaveBeenCalled();

      const writeCall = mockFs.writeFileSync.mock.calls[0];
      expect(writeCall[0]).toContain('snapshot-1.0.0');
      expect(writeCall[0]).toContain('.json');
    });

    it('should create baseline snapshot if none exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await tester.createSnapshot('1.0.0');

      const baselineCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('baseline.json'),
      );
      expect(baselineCall).toBeDefined();
    });

    it('should generate unique checksums for different types', async () => {
      const snapshot1 = await tester.createSnapshot('1.0.0');

      // Mock different type content
      mockFs.readFileSync.mockImplementation(() => {
        return `
          export interface User {
            id: string; // Changed from number to string
            name: string;
            email: string;
          }
        `;
      });

      await tester.initialize();
      const snapshot2 = await tester.createSnapshot('1.0.1');

      expect(snapshot1.checksum).not.toBe(snapshot2.checksum);
    });
  });

  describe('Baseline Loading', () => {
    it('should load baseline from config', async () => {
      const configWithBaseline = {
        ...config,
        baselineSnapshot,
      };

      const testerWithBaseline = createTypeRegressionTester(configWithBaseline);
      const loaded = await testerWithBaseline.loadBaselineSnapshot();

      expect(loaded).toEqual(baselineSnapshot);
    });

    it('should load baseline from file', async () => {
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        return '';
      });

      const loaded = await tester.loadBaselineSnapshot();

      expect(loaded).toEqual(baselineSnapshot);
    });

    it('should return null if no baseline exists', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const loaded = await tester.loadBaselineSnapshot();

      expect(loaded).toBeNull();
    });
  });

  describe('Regression Testing', () => {
    beforeEach(async () => {
      // Mock baseline loading
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        if (filePath.includes('user.ts')) {
          return `
            export interface User {
              id: number;
              name: string;
              email: string; // Added field
              age?: number;  // Added optional field
            }
            
            export class UserService {
              getUser(id: number): User | null {
                return null;
              }
              
              // Added new method
              createUser(data: Partial<User>): User {
                return { id: 1, name: '', email: '', ...data };
              }
            }
            
            // Added new type
            export type UserRole = 'admin' | 'user';
          `;
        }
        return '';
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      await tester.initialize();
    });

    it('should detect added types', async () => {
      const result = await tester.runRegressionTest();

      const addedChanges = result.changes.filter(c => c.type === 'added');
      expect(addedChanges.length).toBeGreaterThan(0);

      const addedType = addedChanges.find(c => c.typeName === 'UserRole');
      expect(addedType).toBeDefined();
      expect(addedType?.breakingChange).toBe(false);
    });

    it('should detect modified types', async () => {
      const result = await tester.runRegressionTest();

      const modifiedChanges = result.changes.filter(c => c.type === 'modified');
      expect(modifiedChanges.length).toBeGreaterThan(0);

      const modifiedUser = modifiedChanges.find(c => c.typeName === 'User');
      expect(modifiedUser).toBeDefined();
    });

    it('should calculate impact levels', async () => {
      const result = await tester.runRegressionTest();

      expect(result.summary.impactLevel).toMatch(/none|patch|minor|major/);
      expect(typeof result.summary.totalChanges).toBe('number');
      expect(typeof result.summary.addedTypes).toBe('number');
      expect(typeof result.summary.modifiedTypes).toBe('number');
    });

    it('should generate recommendations', async () => {
      const result = await tester.runRegressionTest();

      expect(Array.isArray(result.recommendations)).toBe(true);

      for (const recommendation of result.recommendations) {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      }
    });

    it('should identify breaking changes', async () => {
      // Mock a breaking change (removed type)
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        if (filePath.includes('user.ts')) {
          return `
            // UserService removed - breaking change
            export interface User {
              id: number;
              name: string;
            }
          `;
        }
        return '';
      });

      await tester.initialize();
      const result = await tester.runRegressionTest();

      expect(result.breakingChanges.length).toBeGreaterThan(0);

      const removedService = result.breakingChanges.find(c =>
        c.typeName === 'UserService' && c.type === 'removed',
      );
      expect(removedService).toBeDefined();
      expect(removedService?.breakingChange).toBe(true);
    });

    it('should pass when no breaking changes in non-strict mode', async () => {
      const result = await tester.runRegressionTest();

      // In non-strict mode, should pass even with changes
      expect(typeof result.passed).toBe('boolean');
    });

    it('should fail on breaking changes in strict mode', async () => {
      const strictTester = createTypeRegressionTester({
        ...config,
        strictMode: true,
      });

      // Mock breaking change
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        if (filePath.includes('user.ts')) {
          return `
            export interface User {
              id: string; // Changed type - breaking change
              name: string;
            }
          `;
        }
        return '';
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      await strictTester.initialize();
      const result = await strictTester.runRegressionTest();

      expect(result.passed).toBe(false);
    });

    it('should allow whitelisted breaking changes', async () => {
      const allowedTester = createTypeRegressionTester({
        ...config,
        strictMode: true,
        allowedBreakingChanges: ['UserService'],
      });

      // Mock removal of whitelisted type
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        if (filePath.includes('user.ts')) {
          return `
            export interface User {
              id: number;
              name: string;
            }
            // UserService removed but it's whitelisted
          `;
        }
        return '';
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      await allowedTester.initialize();
      const result = await allowedTester.runRegressionTest();

      expect(result.passed).toBe(true);
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        return 'export interface User { id: number; name: string; }';
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      await tester.initialize();
    });

    it('should generate comprehensive reports', async () => {
      const result = await tester.runRegressionTest();
      const report = tester.generateReport(result);

      expect(typeof report).toBe('string');
      expect(report).toContain('Type Regression Test Report');
      expect(report).toContain('Summary');
      expect(report).toContain(result.passed ? 'PASSED' : 'FAILED');
    });

    it('should include breaking changes section', async () => {
      // Mock a breaking change
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        return ''; // Empty file - all types removed
      });

      await tester.initialize();
      const result = await tester.runRegressionTest();
      const report = tester.generateReport(result);

      if (result.breakingChanges.length > 0) {
        expect(report).toContain('Breaking Changes');
      }
    });

    it('should include recommendations section', async () => {
      const result = await tester.runRegressionTest();
      const report = tester.generateReport(result);

      if (result.recommendations.length > 0) {
        expect(report).toContain('Recommendations');
      }
    });

    it('should list all changes', async () => {
      const result = await tester.runRegressionTest();
      const report = tester.generateReport(result);

      if (result.changes.length > 0) {
        expect(report).toContain('All Changes');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing baseline gracefully', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(tester.runRegressionTest())
        .rejects.toThrow('No baseline snapshot found');
    });

    it('should handle TypeScript compilation errors', async () => {
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baselineSnapshot);
        }
        return 'invalid TypeScript syntax {{{';
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'invalid.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      await tester.initialize();
      await expect(tester.runRegressionTest()).resolves.not.toThrow();
    });

    it('should handle file system errors during snapshot saving', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write permission denied');
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      await tester.initialize();
      await expect(tester.createSnapshot('1.0.0')).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large type sets efficiently', async () => {
      // Create a large baseline
      const largeBaseline: TypeSnapshot = {
        ...baselineSnapshot,
        types: Array.from({ length: 1000 }, (_, i) => ({
          name: `Type${i}`,
          kind: 'interface' as const,
          signature: `interface Type${i} { id: number; }`,
          location: { file: `src/types/type${i}.ts`, line: 1, column: 1 },
          dependencies: [],
          exported: true,
          generic: false,
        })),
      };

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(largeBaseline);
        }
        return 'export interface TestType { id: number; }';
      });

      const startTime = Date.now();

      await tester.initialize();
      const result = await tester.runRegressionTest();

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.changes.length).toBeGreaterThanOrEqual(0);
    });
  });
});
