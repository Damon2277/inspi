/**
 * Type Test Framework Tests
 * 
 * Comprehensive tests for the TypeScript type testing framework
 */

import {
  TypeTestFramework,
  createTypeTestFramework,
  TypeTestConfig,
  CompileTimeTest,
  RuntimeTypeCheck,
  TypeTestCase
} from '../../../../lib/testing/types/TypeTestFramework';
import { CompileTimeTestUtils } from '../../../../lib/testing/types/CompileTimeTestUtils';
import * as ts from 'typescript';

describe('TypeTestFramework', () => {
  let framework: TypeTestFramework;
  let config: TypeTestConfig;

  beforeEach(() => {
    config = {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true
      },
      strictMode: true,
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.ts', '**/*.spec.ts'],
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

    framework = createTypeTestFramework(config);
  });

  afterEach(() => {
    framework.cleanup();
  });

  describe('Framework Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(framework.initialize()).resolves.not.toThrow();
    });

    it('should emit initialization events', async () => {
      const initializingSpy = jest.fn();
      const initializedSpy = jest.fn();

      framework.on('frameworkInitializing', initializingSpy);
      framework.on('frameworkInitialized', initializedSpy);

      await framework.initialize();

      expect(initializingSpy).toHaveBeenCalled();
      expect(initializedSpy).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const errorSpy = jest.fn();
      framework.on('frameworkError', errorSpy);

      // Create invalid config to trigger error
      const invalidFramework = createTypeTestFramework({
        ...config,
        includePatterns: ['/nonexistent/path/**/*.ts']
      });

      await expect(invalidFramework.initialize()).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Compile-Time Tests', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should run basic compile-time tests', async () => {
      const tests = CompileTimeTestUtils.createAssignabilityTests();
      const results = await framework.runCompileTimeTests(tests);

      expect(results).toHaveLength(tests.length);
      expect(results.every(r => r.type === 'compile-time')).toBe(true);
    });

    it('should detect compilation errors correctly', async () => {
      const failingTest: CompileTimeTest = {
        name: 'Type Error Test',
        description: 'Test that should fail compilation',
        sourceCode: `
          interface User {
            id: number;
            name: string;
          }
          
          const user: User = {
            id: 'invalid', // Should be number
            name: 123      // Should be string
          };
        `,
        expectedErrors: [
          {
            code: 2322,
            message: "Type 'string' is not assignable to type 'number'"
          }
        ],
        expectedWarnings: [],
        shouldCompile: false
      };

      const results = await framework.runCompileTimeTests([failingTest]);
      const result = results[0];

      expect(result.status).toBe('passed'); // Test passes because it correctly detects expected errors
      expect(result.assertions.some(a => a.name.includes('Compilation Result'))).toBe(true);
    });

    it('should validate generic type constraints', async () => {
      const genericTests = CompileTimeTestUtils.createGenericTypeTests();
      const results = await framework.runCompileTimeTests(genericTests);

      expect(results).toHaveLength(genericTests.length);
      
      const passingTest = results.find(r => r.testCase === 'Generic Function Types');
      const failingTest = results.find(r => r.testCase === 'Generic Constraint Violations');

      expect(passingTest?.status).toBe('passed');
      expect(failingTest?.status).toBe('passed'); // Passes because it correctly detects expected errors
    });

    it('should test interface consistency', async () => {
      const interfaceTests = CompileTimeTestUtils.createInterfaceConsistencyTests();
      const results = await framework.runCompileTimeTests(interfaceTests);

      expect(results).toHaveLength(interfaceTests.length);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });

    it('should validate utility types', async () => {
      const utilityTests = CompileTimeTestUtils.createUtilityTypeTests();
      const results = await framework.runCompileTimeTests(utilityTests);

      expect(results).toHaveLength(utilityTests.length);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });

    it('should test conditional types', async () => {
      const conditionalTests = CompileTimeTestUtils.createConditionalTypeTests();
      const results = await framework.runCompileTimeTests(conditionalTests);

      expect(results).toHaveLength(conditionalTests.length);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });

    it('should validate mapped types', async () => {
      const mappedTests = CompileTimeTestUtils.createMappedTypeTests();
      const results = await framework.runCompileTimeTests(mappedTests);

      expect(results).toHaveLength(mappedTests.length);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });

    it('should test type guards', async () => {
      const typeGuardTests = CompileTimeTestUtils.createTypeGuardTests();
      const results = await framework.runCompileTimeTests(typeGuardTests);

      expect(results).toHaveLength(typeGuardTests.length);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });

    it('should validate strict mode compliance', async () => {
      const strictTests = CompileTimeTestUtils.createStrictModeTests();
      const results = await framework.runCompileTimeTests(strictTests);

      expect(results).toHaveLength(strictTests.length);
      
      // Strict mode tests should detect null/undefined issues
      const result = results[0];
      expect(result.assertions.some(a => a.name.includes('Expected Error'))).toBe(true);
    });
  });

  describe('Runtime Type Checks', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should run runtime type validation', async () => {
      const runtimeCheck: RuntimeTypeCheck = {
        name: 'User Interface Validation',
        description: 'Validate User interface at runtime',
        typeDefinition: `
          interface User {
            id: number;
            name: string;
            email: string;
          }
        `,
        testValues: [
          {
            value: { id: 1, name: 'John', email: 'john@example.com' },
            shouldPass: true,
            description: 'Valid user object'
          },
          {
            value: { id: 'invalid', name: 'John', email: 'john@example.com' },
            shouldPass: false,
            description: 'Invalid id type'
          },
          {
            value: { name: 'John', email: 'john@example.com' },
            shouldPass: false,
            description: 'Missing required id field'
          }
        ]
      };

      const results = await framework.runRuntimeTypeChecks([runtimeCheck]);
      const result = results[0];

      expect(result.type).toBe('runtime');
      expect(result.assertions).toHaveLength(3);
      
      // Check that validation results match expectations
      const validObjectAssertion = result.assertions.find(a => a.name.includes('Valid user object'));
      const invalidIdAssertion = result.assertions.find(a => a.name.includes('Invalid id type'));
      const missingFieldAssertion = result.assertions.find(a => a.name.includes('Missing required id field'));

      expect(validObjectAssertion?.passed).toBe(true);
      expect(invalidIdAssertion?.passed).toBe(true); // Passes because it correctly identifies invalid type
      expect(missingFieldAssertion?.passed).toBe(true); // Passes because it correctly identifies missing field
    });

    it('should validate complex nested types', async () => {
      const nestedTypeCheck: RuntimeTypeCheck = {
        name: 'Nested Type Validation',
        description: 'Validate nested object structures',
        typeDefinition: `
          interface Address {
            street: string;
            city: string;
            zipCode: string;
          }
          
          interface User {
            id: number;
            name: string;
            address: Address;
          }
        `,
        testValues: [
          {
            value: {
              id: 1,
              name: 'John',
              address: {
                street: '123 Main St',
                city: 'Anytown',
                zipCode: '12345'
              }
            },
            shouldPass: true,
            description: 'Valid nested object'
          },
          {
            value: {
              id: 1,
              name: 'John',
              address: {
                street: '123 Main St',
                city: 'Anytown'
                // Missing zipCode
              }
            },
            shouldPass: false,
            description: 'Invalid nested object - missing field'
          }
        ]
      };

      const results = await framework.runRuntimeTypeChecks([nestedTypeCheck]);
      const result = results[0];

      expect(result.assertions).toHaveLength(2);
      expect(result.status).toBe('passed');
    });

    it('should handle array and union types', async () => {
      const arrayUnionCheck: RuntimeTypeCheck = {
        name: 'Array and Union Type Validation',
        description: 'Validate arrays and union types',
        typeDefinition: `
          type Status = 'active' | 'inactive' | 'pending';
          
          interface User {
            id: number;
            name: string;
            status: Status;
            tags: string[];
          }
        `,
        testValues: [
          {
            value: {
              id: 1,
              name: 'John',
              status: 'active',
              tags: ['admin', 'user']
            },
            shouldPass: true,
            description: 'Valid array and union types'
          },
          {
            value: {
              id: 1,
              name: 'John',
              status: 'invalid_status',
              tags: ['admin', 'user']
            },
            shouldPass: false,
            description: 'Invalid union type value'
          }
        ]
      };

      const results = await framework.runRuntimeTypeChecks([arrayUnionCheck]);
      expect(results[0].assertions).toHaveLength(2);
    });
  });

  describe('Type Coverage Analysis', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should generate coverage report', async () => {
      const report = await framework.generateCoverageReport();

      expect(report).toHaveProperty('totalTypes');
      expect(report).toHaveProperty('coveredTypes');
      expect(report).toHaveProperty('coveragePercentage');
      expect(report).toHaveProperty('fileBreakdown');
      expect(report).toHaveProperty('summary');

      expect(typeof report.coveragePercentage).toBe('number');
      expect(report.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(report.coveragePercentage).toBeLessThanOrEqual(100);
    });

    it('should provide file-level coverage breakdown', async () => {
      const report = await framework.generateCoverageReport();

      expect(Array.isArray(report.fileBreakdown)).toBe(true);
      
      if (report.fileBreakdown.length > 0) {
        const fileReport = report.fileBreakdown[0];
        expect(fileReport).toHaveProperty('file');
        expect(fileReport).toHaveProperty('totalTypes');
        expect(fileReport).toHaveProperty('coveredTypes');
        expect(fileReport).toHaveProperty('coveragePercentage');
      }
    });

    it('should categorize types by kind', async () => {
      const report = await framework.generateCoverageReport();

      expect(report.summary).toHaveProperty('interfaces');
      expect(report.summary).toHaveProperty('types');
      expect(report.summary).toHaveProperty('classes');
      expect(report.summary).toHaveProperty('enums');
      expect(report.summary).toHaveProperty('functions');

      expect(typeof report.summary.interfaces.total).toBe('number');
      expect(typeof report.summary.interfaces.covered).toBe('number');
    });
  });

  describe('Regression Testing', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should create type snapshots', async () => {
      const snapshot = await framework.createTypeSnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('version');
      expect(snapshot).toHaveProperty('types');
      expect(snapshot).toHaveProperty('checksum');

      expect(Array.isArray(snapshot.types)).toBe(true);
      expect(typeof snapshot.checksum).toBe('string');
    });

    it('should detect type changes between snapshots', async () => {
      const baselineSnapshot = await framework.createTypeSnapshot();
      
      // Simulate changes by creating a new snapshot
      // In a real scenario, this would be after code changes
      const currentSnapshot = await framework.createTypeSnapshot();

      const regressionTests = await framework.runRegressionTests(baselineSnapshot);

      expect(Array.isArray(regressionTests)).toBe(true);
      
      if (regressionTests.length > 0) {
        const test = regressionTests[0];
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('baseline');
        expect(test).toHaveProperty('current');
        expect(test).toHaveProperty('changes');
      }
    });
  });

  describe('Test Case Execution', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should execute mixed test cases', async () => {
      const testCases: TypeTestCase[] = [
        {
          name: 'Compile-time Interface Test',
          description: 'Test interface compilation',
          type: 'compile-time',
          target: 'User',
          assertions: [
            {
              name: 'Interface compiles',
              type: 'assignable',
              expected: true
            }
          ]
        },
        {
          name: 'Runtime Validation Test',
          description: 'Test runtime type validation',
          type: 'runtime',
          target: 'User',
          assertions: [
            {
              name: 'Valid object passes',
              type: 'runtime-valid',
              expected: true
            }
          ]
        }
      ];

      const results = await framework.runTests(testCases);

      expect(results).toHaveLength(testCases.length);
      expect(results.every(r => r.metadata)).toBe(true);
      expect(results.every(r => typeof r.duration === 'number')).toBe(true);
    });

    it('should handle test setup and teardown', async () => {
      const setupSpy = jest.fn();
      const teardownSpy = jest.fn();

      const testCase: TypeTestCase = {
        name: 'Setup/Teardown Test',
        description: 'Test with setup and teardown',
        type: 'compile-time',
        target: 'TestType',
        assertions: [],
        setup: setupSpy,
        teardown: teardownSpy
      };

      await framework.runTests([testCase]);

      expect(setupSpy).toHaveBeenCalled();
      expect(teardownSpy).toHaveBeenCalled();
    });

    it('should emit test events', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();

      framework.on('testStarted', startedSpy);
      framework.on('testCompleted', completedSpy);

      const testCase: TypeTestCase = {
        name: 'Event Test',
        description: 'Test event emission',
        type: 'compile-time',
        target: 'TestType',
        assertions: []
      };

      await framework.runTests([testCase]);

      expect(startedSpy).toHaveBeenCalledWith({
        testCase: 'Event Test',
        type: 'compile-time'
      });
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should generate comprehensive test reports', async () => {
      const testCase: TypeTestCase = {
        name: 'Report Test',
        description: 'Test for report generation',
        type: 'compile-time',
        target: 'TestType',
        assertions: [
          {
            name: 'Test assertion',
            type: 'assignable',
            expected: true
          }
        ]
      };

      const results = await framework.runTests([testCase]);
      const report = framework.generateReport(results);

      expect(typeof report).toBe('string');
      expect(report).toContain('Type Definition Test Report');
      expect(report).toContain('Summary:');
      expect(report).toContain('Total Tests:');
      expect(report).toContain('Success Rate:');
    });

    it('should include test type breakdown in reports', async () => {
      const testCases: TypeTestCase[] = [
        {
          name: 'Compile Test',
          description: 'Compile-time test',
          type: 'compile-time',
          target: 'TestType1',
          assertions: []
        },
        {
          name: 'Runtime Test',
          description: 'Runtime test',
          type: 'runtime',
          target: 'TestType2',
          assertions: []
        }
      ];

      const results = await framework.runTests(testCases);
      const report = framework.generateReport(results);

      expect(report).toContain('Test Type Breakdown');
      expect(report).toContain('compile-time');
      expect(report).toContain('runtime');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should handle test execution errors gracefully', async () => {
      const testCase: TypeTestCase = {
        name: 'Error Test',
        description: 'Test that throws an error',
        type: 'compile-time',
        target: 'TestType',
        assertions: [],
        setup: async () => {
          throw new Error('Setup failed');
        }
      };

      const results = await framework.runTests([testCase]);
      const result = results[0];

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Setup failed');
    });

    it('should continue execution after individual test failures', async () => {
      const testCases: TypeTestCase[] = [
        {
          name: 'Failing Test',
          description: 'This test will fail',
          type: 'compile-time',
          target: 'TestType1',
          assertions: [],
          setup: async () => {
            throw new Error('Test failure');
          }
        },
        {
          name: 'Passing Test',
          description: 'This test will pass',
          type: 'compile-time',
          target: 'TestType2',
          assertions: []
        }
      ];

      const results = await framework.runTests(testCases);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('failed');
      expect(results[1].status).toBe('passed');
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    it('should complete tests within reasonable time', async () => {
      const startTime = Date.now();
      
      const testCases: TypeTestCase[] = Array.from({ length: 10 }, (_, i) => ({
        name: `Performance Test ${i}`,
        description: `Performance test case ${i}`,
        type: 'compile-time',
        target: `TestType${i}`,
        assertions: []
      }));

      await framework.runTests(testCases);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should track test execution times', async () => {
      const testCase: TypeTestCase = {
        name: 'Timing Test',
        description: 'Test execution timing',
        type: 'compile-time',
        target: 'TestType',
        assertions: []
      };

      const results = await framework.runTests([testCase]);
      const result = results[0];

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});

describe('CompileTimeTestUtils', () => {
  describe('Test Creation Utilities', () => {
    it('should create passing tests', () => {
      const test = CompileTimeTestUtils.createPassingTest(
        'Valid Interface',
        'interface User { id: number; name: string; }'
      );

      expect(test.name).toBe('Valid Interface');
      expect(test.shouldCompile).toBe(true);
      expect(test.expectedErrors).toHaveLength(0);
    });

    it('should create failing tests', () => {
      const expectedErrors = [
        {
          code: 2322,
          message: "Type 'string' is not assignable to type 'number'"
        }
      ];

      const test = CompileTimeTestUtils.createFailingTest(
        'Invalid Assignment',
        'const x: number = "string";',
        expectedErrors
      );

      expect(test.name).toBe('Invalid Assignment');
      expect(test.shouldCompile).toBe(false);
      expect(test.expectedErrors).toEqual(expectedErrors);
    });
  });

  describe('Compiler Options Validation', () => {
    it('should validate strict compiler options', () => {
      const strictOptions: ts.CompilerOptions = {
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        target: ts.ScriptTarget.ES2020
      };

      const result = CompileTimeTestUtils.validateCompilerOptions(strictOptions);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify non-strict options', () => {
      const nonStrictOptions: ts.CompilerOptions = {
        strict: false,
        noImplicitAny: false,
        strictNullChecks: false,
        target: ts.ScriptTarget.ES5
      };

      const result = CompileTimeTestUtils.validateCompilerOptions(nonStrictOptions);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Type Compatibility Matrix', () => {
    it('should generate compatibility matrix', () => {
      const types = ['string', 'number', 'boolean', 'any'];
      const matrix = CompileTimeTestUtils.generateCompatibilityMatrix(types);

      expect(matrix.typeNames).toEqual(types);
      expect(matrix.matrix).toHaveLength(types.length);
      expect(matrix.matrix[0]).toHaveLength(types.length);
      expect(Array.isArray(matrix.incompatibilities)).toBe(true);
    });

    it('should identify type incompatibilities', () => {
      const types = ['string', 'number'];
      const matrix = CompileTimeTestUtils.generateCompatibilityMatrix(types);

      expect(matrix.incompatibilities.length).toBeGreaterThan(0);
      expect(matrix.incompatibilities.some(i => 
        i.from === 'string' && i.to === 'number'
      )).toBe(true);
    });
  });
});