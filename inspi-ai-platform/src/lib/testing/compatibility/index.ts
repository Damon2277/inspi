/**
 * Multi-Environment Compatibility Testing Framework
 * 
 * This module provides comprehensive testing capabilities across different:
 * - Operating systems (Windows, macOS, Linux)
 * - Node.js versions
 * - Browser environments
 * - Container environments
 */

export { EnvironmentDetector } from './EnvironmentDetector';
export { NodeVersionTester } from './NodeVersionTester';
export { BrowserCompatibilityTester } from './BrowserCompatibilityTester';
export { ContainerTestRunner } from './ContainerTestRunner';
export { CrossPlatformTestRunner } from './CrossPlatformTestRunner';
export { CompatibilityReporter } from './CompatibilityReporter';

export type {
  EnvironmentInfo,
  NodeVersionInfo,
  BrowserInfo,
  ContainerInfo,
  CompatibilityTestResult,
  CompatibilityReport
} from './types';