/**
 * Type Definition Testing Module
 *
 * Comprehensive TypeScript type testing framework including:
 * - Compile-time type validation
 * - Runtime interface checking
 * - Type safety regression testing
 * - Type coverage analysis
 */

export { TypeTestFramework, createTypeTestFramework } from './TypeTestFramework';
export { CompileTimeTestUtils } from './CompileTimeTestUtils';
export { RuntimeTypeValidator } from './RuntimeTypeValidator';
export { TypeCoverageAnalyzer } from './TypeCoverageAnalyzer';
export { TypeRegressionTester } from './TypeRegressionTester';
export { InterfaceConsistencyChecker } from './InterfaceConsistencyChecker';

export type {
  TypeTestConfig,
  TypeDefinition,
  TypeTestCase,
  TypeAssertion,
  CompileTimeTest,
  RuntimeTypeCheck,
  TypeCoverageReport,
  TypeRegressionTest,
  TypeTestResult,
  TypeSnapshot,
  TypeChange,
} from './TypeTestFramework';

// Re-export commonly used utilities
export {
  expectType,
  expectError,
  expectAssignable,
  expectNotAssignable,
  expectExtends,
  expectNotExtends,
} from './TypeAssertions';
