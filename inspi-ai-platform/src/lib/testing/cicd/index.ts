/**
 * CI/CD Integration Optimization System
 * 
 * This module provides comprehensive CI/CD integration capabilities including:
 * - Pipeline optimization and performance monitoring
 * - Test result integration and reporting
 * - Automated quality gates and deployment validation
 * - Multi-platform CI/CD support
 */

export { PipelineOptimizer } from './PipelineOptimizer';
export { TestResultIntegrator } from './TestResultIntegrator';
export { QualityGateManager } from './QualityGateManager';
export { DeploymentValidator } from './DeploymentValidator';
export { CICDReporter } from './CICDReporter';
export { PipelineAnalyzer } from './PipelineAnalyzer';

export type {
  PipelineConfig,
  TestResult,
  QualityGate,
  DeploymentConfig,
  CICDMetrics,
  PipelineOptimization
} from './types';