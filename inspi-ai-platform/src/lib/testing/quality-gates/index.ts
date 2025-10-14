/**
 * Quality Gates System
 *
 * Comprehensive quality gate system for automated quality assurance
 * including coverage, performance, security, and compliance checks.
 */

// Main system
export { QualityGateSystem } from './QualityGateSystem';
export type {
  QualityGateConfig,
  QualityGateResult,
  CoverageCheckResult,
  PerformanceCheckResult,
  SecurityCheckResult,
  ComplianceCheckResult,
} from './QualityGateSystem';

// Coverage checker
export { CoverageChecker } from './CoverageChecker';
export type {
  CoverageData,
  FileCoverageData,
  CoverageConfig,
} from './CoverageChecker';

// Performance checker
export { PerformanceChecker } from './PerformanceChecker';
export type {
  PerformanceMetrics,
  PerformanceBaseline,
  PerformanceConfig,
} from './PerformanceChecker';

// Security checker
export { SecurityChecker } from './SecurityChecker';
export type {
  SecurityViolation,
  SecurityConfig,
  SecurityRule,
} from './SecurityChecker';

// Compliance checker
export { ComplianceChecker } from './ComplianceChecker';
export type {
  ComplianceViolation,
  ComplianceConfig,
  ComplianceRule,
} from './ComplianceChecker';
