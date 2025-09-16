/**
 * Type Testing Integration Tests
 * 
 * Comprehensive integration tests that combine all type testing components
 * to validate the complete type definition testing system.
 */

import {
  TypeTestFramework,
  createTypeTestFramework,
  TypeTestConfig
} from '../../../../lib/testing/types/TypeTestFramework';
import {
  RuntimeTypeValidator,
  createRuntimeTypeValidator
} from '../../../../lib/testing/types/RuntimeTypeValidator';
import {
  TypeCoverageAnalyzer,
  createTypeCoverageAnalyzer
} from '../../../../lib/testing/types/TypeCoverageAnalyzer';
import {
  TypeRegressionTester,
  createTypeRegressionTester
} from '../../../../lib/testing/types/TypeRegressionTester';
import {
  InterfaceConsistencyChecker,
  createInterfaceConsistencyChecker
} from '../../../../lib/testing/types/InterfaceConsistencyChecker';
import { CompileTimeTestUtils } from '../../../../lib/testing/types/CompileTimeTestUtils';
import { RuntimeAssertions } from '../../../../lib/testing/types/TypeAssertions';
import * as ts from 'typescript';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Type Testing Integration', () => {
  let framework: TypeTestFramework;
  let validator: RuntimeTypeValidator;
  let coverageAnalyzer: TypeCoverageAnalyzer;
  let regressionTester: TypeRegressionTester;
  let consistencyChecker: InterfaceConsistencyChecker;

  beforeEach(() => {
    // Setup common configuration
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    };

    // Initialize all components
    const frameworkConfig: TypeTestConfig = {
      compilerOptions,
      strictMode: true,
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.ts'],
      coverage: {
        enabled: true,
        threshold: 80,
        reportPath: './coverage/types'
      },
      runtime: {
        enabled: true,
        strictChecking: true,
        performanceMode: false
      },
      regression: {
        enabled: true,
        baselinePath: './snapshots/baseline.json',
        snapshotPath: './snapshots'
      }
    };

    framework = createTypeTestFramework(frameworkConfig);
    validator = createRuntimeTypeValidator();
    
    coverageAnalyzer = createTypeCoverageAnalyzer({
      sourceRoot: 'src',
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.ts'],
      testPatterns: ['**/*.test.ts'],
      thresholds: { overall: 80, perFile: 70, perModule: 75 },
      reportFormats: ['json', 'html', 'markdown'],
      outputDir: './coverage'
    });

    regressionTester = createTypeRegressionTester({
      snapshotPath: './snapshots',
      sourceRoot: 'src',
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.ts'],
      strictMode: false,
      allowedBreakingChanges: [],
      compilerOptions
    });

    consistencyChecker = createInterfaceConsistencyChecker({
      sourceRoot: 'src',
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.ts'],
      strictMode: true,
      checkImplementations: true,
      checkExtensions: true,
      checkUsage: true
    });

    // Setup fs mocks
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.readFileSync.mockReturnValue('');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockImplementation();
    mockFs.mkdirSync.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    framework.cleanup();
  });

  describe('Complete Type Testing Workflow', () => {
    beforeEach(() => {
      // Mock a comprehensive TypeScript project structure
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src/types')) {
          return [
            { name: 'user.ts', isFile: () => true, isDirectory: () => false },
            { name: 'api.ts', isFile: () => true, isDirectory: () => false }
          ] as any;
        }
        if (dir.includes('src/services')) {
          return [
            { name: 'userService.ts', isFile: () => true, isDirectory: () => false }
          ] as any;
        }
        if (dir.includes('__tests__')) {
          return [
            { name: 'user.test.ts', isFile: () => true, isDirectory: () => false }
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
              createdAt: Date;
              updatedAt: Date;
            }
            
            export interface CreateUserRequest {
              name: string;
              email: string;
            }
            
            export interface UpdateUserRequest {
              name?: string;
              email?: string;
            }
            
            export type UserStatus = 'active' | 'inactive' | 'suspended';
            
            export enum UserRole {
              ADMIN = 'admin',
              USER = 'user',
              MODERATOR = 'moderator'
            }
          `;
        }
        if (filePath.includes('api.ts')) {
          return `
            export interface ApiResponse<T> {
              data: T;
              status: number;
              message?: string;
              timestamp: Date;
            }
            
            export interface ApiError {
              code: string;
              message: string;
              details?: Record<string, any>;
            }
            
            export interface PaginatedResponse<T> extends ApiResponse<T[]> {
              pagination: {
                page: number;
                limit: number;
                total: number;
                hasNext: boolean;
                hasPrev: boolean;
              };
            }
          `;
        }
        if (filePath.includes('userService.ts')) {
          return `
            import { User, CreateUserRequest, UpdateUserRequest, UserStatus } from '../types/user';
            import { ApiResponse, ApiError } from '../types/api';
            
            export interface UserService {
              getUser(id: number): Promise<ApiResponse<User>>;
              createUser(request: CreateUserRequest): Promise<ApiResponse<User>>;
              updateUser(id: number, request: UpdateUserRequest): Promise<ApiResponse<User>>;
              deleteUser(id: number): Promise<ApiResponse<void>>;
              getUsersByStatus(status: UserStatus): Promise<ApiResponse<User[]>>;
            }
            
            export class DatabaseUserService implements UserService {
              async getUser(id: number): Promise<ApiResponse<User>> {
                // Implementation
                return {
                  data: {
                    id,
                    name: 'Test User',
                    email: 'test@example.com',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  status: 200,
                  timestamp: new Date()
                };
              }
              
              async createUser(request: CreateUserRequest): Promise<ApiResponse<User>> {
                // Implementation
                return {
                  data: {
                    id: 1,
                    name: request.name,
                    email: request.email,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  status: 201,
                  timestamp: new Date()
                };
              }
              
              async updateUser(id: number, request: UpdateUserRequest): Promise<ApiResponse<User>> {
                // Implementation
                return {
                  data: {
                    id,
                    name: request.name || 'Updated User',
                    email: request.email || 'updated@example.com',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  status: 200,
                  timestamp: new Date()
                };
              }
              
              async deleteUser(id: number): Promise<ApiResponse<void>> {
                // Implementation
                return {
                  data: undefined as any,
                  status: 204,
                  timestamp: new Date()
                };
              }
              
              async getUsersByStatus(status: UserStatus): Promise<ApiResponse<User[]>> {
                // Implementation
                return {
                  data: [],
                  status: 200,
                  timestamp: new Date()
                };
              }
            }
          `;
        }
        if (filePath.includes('user.test.ts')) {
          return `
            import { User, CreateUserRequest, UserStatus, UserRole } from '../types/user';
            import { ApiResponse } from '../types/api';
            import { DatabaseUserService } from '../services/userService';
            
            describe('User Types', () => {
              it('should validate User interface', () => {
                const user: User = {
                  id: 1,
                  name: 'Test User',
                  email: 'test@example.com',
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                expect(user).toBeDefined();
              });
              
              it('should validate CreateUserRequest', () => {
                const request: CreateUserRequest = {
                  name: 'New User',
                  email: 'new@example.com'
                };
                expect(request).toBeDefined();
              });
              
              it('should validate UserStatus type', () => {
                const status: UserStatus = 'active';
                expect(['active', 'inactive', 'suspended']).toContain(status);
              });
              
              it('should validate UserRole enum', () => {
                expect(UserRole.ADMIN).toBe('admin');
                expect(UserRole.USER).toBe('user');
                expect(UserRole.MODERATOR).toBe('moderator');
              });
            });
          `;
        }
        return '';
      });
    });

    it('should run complete type testing workflow', async () => {
      // 1. Initialize all components
      await framework.initialize();
      await coverageAnalyzer.initialize();
      await regressionTester.initialize();
      await consistencyChecker.initialize();

      // 2. Run compile-time tests
      const compileTimeTests = [
        ...CompileTimeTestUtils.createAssignabilityTests(),
        ...CompileTimeTestUtils.createGenericTypeTests(),
        ...CompileTimeTestUtils.createInterfaceConsistencyTests()
      ];

      const compileTimeResults = await framework.runCompileTimeTests(compileTimeTests);
      expect(compileTimeResults.length).toBeGreaterThan(0);
      expect(compileTimeResults.every(r => r.type === 'compile-time')).toBe(true);

      // 3. Run runtime type validation
      validator.validateProjectTypes();
      
      const userValidation = validator.validate('User', {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      expect(userValidation.isValid).toBe(true);

      // 4. Analyze type coverage
      const coverageReport = await coverageAnalyzer.analyze();
      expect(coverageReport.overall.totalTypes).toBeGreaterThanOrEqual(0);
      expect(coverageReport.overall.coverage).toBeGreaterThanOrEqual(0);
      expect(coverageReport.overall.coverage).toBeLessThanOrEqual(100);

      // 5. Check interface consistency
      const consistencyReport = await consistencyChecker.checkConsistency();
      expect(consistencyReport.interfaces.length).toBeGreaterThan(0);
      expect(consistencyReport.summary.totalInterfaces).toBeGreaterThan(0);

      // 6. Create regression baseline
      const snapshot = await regressionTester.createSnapshot('1.0.0');
      expect(snapshot.types.length).toBeGreaterThan(0);
      expect(snapshot.checksum).toBeDefined();

      console.log('Complete type testing workflow executed successfully');
    });

    it('should detect type changes and regressions', async () => {
      // Initialize and create baseline
      await regressionTester.initialize();
      const baseline = await regressionTester.createSnapshot('1.0.0');

      // Mock changes to types
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('baseline.json')) {
          return JSON.stringify(baseline);
        }
        if (filePath.includes('user.ts')) {
          return `
            export interface User {
              id: string; // Changed from number to string - breaking change
              name: string;
              email: string;
              phone?: string; // Added optional field - non-breaking
              createdAt: Date;
              updatedAt: Date;
            }
            
            // Removed CreateUserRequest - breaking change
            
            export interface UpdateUserRequest {
              name?: string;
              email?: string;
              phone?: string; // Added field - non-breaking
            }
            
            export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending'; // Added value - non-breaking
            
            // Added new enum - non-breaking
            export enum UserPermission {
              READ = 'read',
              WRITE = 'write',
              DELETE = 'delete'
            }
          `;
        }
        return '';
      });

      await regressionTester.initialize();
      const regressionResult = await regressionTester.runRegressionTest();

      expect(regressionResult.changes.length).toBeGreaterThan(0);
      expect(regressionResult.breakingChanges.length).toBeGreaterThan(0);
      expect(regressionResult.summary.impactLevel).toMatch(/minor|major/);

      // Should detect added types
      const addedChanges = regressionResult.changes.filter(c => c.type === 'added');
      expect(addedChanges.length).toBeGreaterThan(0);

      // Should detect removed types
      const removedChanges = regressionResult.changes.filter(c => c.type === 'removed');
      expect(removedChanges.length).toBeGreaterThan(0);

      // Should detect modified types
      const modifiedChanges = regressionResult.changes.filter(c => c.type === 'modified');
      expect(modifiedChanges.length).toBeGreaterThan(0);
    });

    it('should validate interface implementations', async () => {
      await consistencyChecker.initialize();
      const report = await consistencyChecker.checkConsistency();

      // Should find UserService interface
      const userServiceInterface = report.interfaces.find(i => i.name === 'UserService');
      expect(userServiceInterface).toBeDefined();
      expect(userServiceInterface?.methods.length).toBeGreaterThan(0);

      // Should find DatabaseUserService implementation
      const implementation = report.implementations.find(impl => 
        impl.className === 'DatabaseUserService'
      );
      expect(implementation).toBeDefined();
      expect(implementation?.implements).toContain('UserService');

      // Should have minimal violations for correct implementation
      const implementationViolations = report.violations.filter(v => 
        v.type === 'incorrect-implementation' && 
        v.description.includes('DatabaseUserService')
      );
      expect(implementationViolations.length).toBe(0);
    });

    it('should generate comprehensive coverage reports', async () => {
      await coverageAnalyzer.initialize();
      const report = await coverageAnalyzer.analyze();

      // Should have module breakdown
      expect(report.modules.length).toBeGreaterThan(0);
      const typesModule = report.modules.find(m => m.moduleName.includes('types'));
      if (typesModule) {
        expect(typesModule.totalTypes).toBeGreaterThan(0);
      }

      // Should have file breakdown
      expect(report.files.length).toBeGreaterThan(0);
      const userFile = report.files.find(f => f.fileName.includes('user.ts'));
      if (userFile) {
        expect(userFile.totalTypes).toBeGreaterThan(0);
      }

      // Should provide recommendations
      expect(Array.isArray(report.recommendations)).toBe(true);

      // Export reports in different formats
      const jsonPath = await coverageAnalyzer.exportReport(report, 'json');
      const htmlPath = await coverageAnalyzer.exportReport(report, 'html');
      const markdownPath = await coverageAnalyzer.exportReport(report, 'markdown');

      expect(jsonPath).toContain('.json');
      expect(htmlPath).toContain('.html');
      expect(markdownPath).toContain('.markdown');
    });
  });

  describe('Runtime and Compile-time Integration', () => {
    it('should combine compile-time and runtime type validation', async () => {
      // Compile-time validation using framework
      await framework.initialize();
      
      const compileTimeTest = CompileTimeTestUtils.createPassingTest(
        'User Interface Compilation',
        `
          interface User {
            id: number;
            name: string;
            email: string;
          }
          
          const user: User = {
            id: 1,
            name: 'Test',
            email: 'test@example.com'
          };
        `
      );

      const compileResult = await framework.runCompileTimeTests([compileTimeTest]);
      expect(compileResult[0].status).toBe('passed');

      // Runtime validation using validator
      validator.validateProjectTypes();
      
      const runtimeResult = validator.validate('User', {
        id: 1,
        name: 'Test',
        email: 'test@example.com'
      });

      expect(runtimeResult.isValid).toBe(true);

      // Both should pass for valid data
      expect(compileResult[0].status).toBe('passed');
      expect(runtimeResult.isValid).toBe(true);
    });

    it('should detect inconsistencies between compile-time and runtime', async () => {
      // Test with data that should fail runtime validation
      validator.validateProjectTypes();
      
      const invalidRuntimeResult = validator.validate('User', {
        id: 'invalid', // Should be number
        name: 'Test',
        email: 'invalid-email' // Should be valid email
      });

      expect(invalidRuntimeResult.isValid).toBe(false);
      expect(invalidRuntimeResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large type definitions efficiently', async () => {
      // Mock a large number of type definitions
      const largeTypeDefinition = Array.from({ length: 100 }, (_, i) => `
        export interface Type${i} {
          id: number;
          name: string;
          value${i}: string;
        }
      `).join('\n');

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('large.ts')) {
          return largeTypeDefinition;
        }
        return '';
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'large.ts', isFile: () => true, isDirectory: () => false }
          ] as any;
        }
        return [];
      });

      const startTime = Date.now();

      await framework.initialize();
      await coverageAnalyzer.initialize();
      await consistencyChecker.initialize();

      const coverageReport = await coverageAnalyzer.analyze();
      const consistencyReport = await consistencyChecker.checkConsistency();

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(coverageReport.overall.totalTypes).toBeGreaterThan(0);
      expect(consistencyReport.interfaces.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle component failures gracefully', async () => {
      // Mock file system errors
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      // Components should handle errors gracefully
      await expect(framework.initialize()).resolves.not.toThrow();
      await expect(coverageAnalyzer.initialize()).resolves.not.toThrow();
      await expect(consistencyChecker.initialize()).resolves.not.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      // Test with invalid TypeScript syntax
      mockFs.readFileSync.mockImplementation(() => {
        return 'invalid TypeScript syntax {{{';
      });

      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (dir.includes('src')) {
          return [
            { name: 'invalid.ts', isFile: () => true, isDirectory: () => false }
          ] as any;
        }
        return [];
      });

      await framework.initialize();
      await coverageAnalyzer.initialize();
      await consistencyChecker.initialize();

      // Should not throw but should handle gracefully
      await expect(coverageAnalyzer.analyze()).resolves.not.toThrow();
      await expect(consistencyChecker.checkConsistency()).resolves.not.toThrow();
    });
  });

  describe('Reporting and Documentation', () => {
    it('should generate comprehensive integrated reports', async () => {
      await framework.initialize();
      await coverageAnalyzer.initialize();
      await consistencyChecker.initialize();

      // Generate individual reports
      const coverageReport = await coverageAnalyzer.analyze();
      const consistencyReport = await consistencyChecker.checkConsistency();

      // Generate text reports
      const coverageText = await coverageAnalyzer.exportReport(coverageReport, 'markdown');
      const consistencyText = consistencyChecker.generateReport(consistencyReport);

      expect(coverageText).toContain('.markdown');
      expect(typeof consistencyText).toBe('string');
      expect(consistencyText).toContain('Interface Consistency Report');

      // Verify report content
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should provide actionable recommendations', async () => {
      await coverageAnalyzer.initialize();
      await consistencyChecker.initialize();

      const coverageReport = await coverageAnalyzer.analyze();
      const consistencyReport = await consistencyChecker.checkConsistency();

      // Coverage recommendations
      for (const recommendation of coverageReport.recommendations) {
        expect(recommendation.type).toMatch(/critical|important|suggestion/);
        expect(typeof recommendation.message).toBe('string');
        expect(typeof recommendation.action).toBe('string');
      }

      // Consistency violations should have suggestions
      for (const violation of consistencyReport.violations) {
        expect(typeof violation.suggestion).toBe('string');
        expect(violation.suggestion.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should support continuous integration workflows', async () => {
      // Simulate CI environment
      process.env.CI = 'true';

      await framework.initialize();
      await coverageAnalyzer.initialize();
      await regressionTester.initialize();

      // Create baseline for first run
      const baseline = await regressionTester.createSnapshot('1.0.0');
      expect(baseline).toBeDefined();

      // Analyze current state
      const coverageReport = await coverageAnalyzer.analyze();
      expect(coverageReport.overall.coverage).toBeGreaterThanOrEqual(0);

      // Check for regressions
      const regressionResult = await regressionTester.runRegressionTest();
      expect(typeof regressionResult.passed).toBe('boolean');

      // Generate CI-friendly reports
      const jsonReport = await coverageAnalyzer.exportReport(coverageReport, 'json');
      expect(jsonReport).toContain('.json');

      delete process.env.CI;
    });

    it('should support development workflow integration', async () => {
      // Simulate development environment
      process.env.NODE_ENV = 'development';

      await framework.initialize();
      await consistencyChecker.initialize();

      // Check interface consistency during development
      const consistencyReport = await consistencyChecker.checkConsistency();
      
      // Should provide developer-friendly feedback
      expect(consistencyReport.summary.consistencyScore).toBeGreaterThanOrEqual(0);
      
      if (consistencyReport.violations.length > 0) {
        const violation = consistencyReport.violations[0];
        expect(violation.location).toBeDefined();
        expect(violation.suggestion).toBeDefined();
      }

      delete process.env.NODE_ENV;
    });
  });
});