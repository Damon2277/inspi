/**
 * Type definitions for multi-environment compatibility testing
 */

export interface EnvironmentInfo {
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  npmVersion: string;
  osVersion: string;
  cpuCount: number;
  totalMemory: number;
  availableMemory: number;
  timezone: string;
  locale: string;
}

export interface NodeVersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  lts: boolean;
  supported: boolean;
  features: string[];
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  mobile: boolean;
  supported: boolean;
  features: BrowserFeature[];
}

export interface BrowserFeature {
  name: string;
  supported: boolean;
  version?: string;
  polyfillRequired?: boolean;
}

export interface ContainerInfo {
  runtime: 'docker' | 'podman' | 'containerd';
  version: string;
  baseImage: string;
  nodeVersion: string;
  architecture: string;
  memoryLimit?: number;
  cpuLimit?: number;
}

export interface CompatibilityTestResult {
  environment: EnvironmentInfo;
  testSuite: string;
  passed: boolean;
  duration: number;
  errors: CompatibilityError[];
  warnings: CompatibilityWarning[];
  performance: PerformanceMetrics;
  coverage?: CoverageInfo;
}

export interface CompatibilityError {
  type: 'platform' | 'version' | 'feature' | 'performance' | 'security';
  message: string;
  code?: string;
  severity: 'critical' | 'major' | 'minor';
  suggestion?: string;
  affectedTests: string[];
}

export interface CompatibilityWarning {
  type: 'deprecation' | 'performance' | 'compatibility';
  message: string;
  suggestion?: string;
  affectedTests: string[];
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: {
    peak: number;
    average: number;
    final: number;
  };
  cpuUsage: {
    peak: number;
    average: number;
  };
  diskIO?: {
    read: number;
    write: number;
  };
}

export interface CoverageInfo {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface CompatibilityReport {
  summary: {
    totalEnvironments: number;
    passedEnvironments: number;
    failedEnvironments: number;
    warningEnvironments: number;
  };
  results: CompatibilityTestResult[];
  recommendations: string[];
  supportMatrix: SupportMatrix;
}

export interface SupportMatrix {
  platforms: PlatformSupport[];
  nodeVersions: NodeVersionSupport[];
  browsers: BrowserSupport[];
  containers: ContainerSupport[];
}

export interface PlatformSupport {
  platform: NodeJS.Platform;
  supported: boolean;
  minNodeVersion?: string;
  limitations?: string[];
  recommendations?: string[];
}

export interface NodeVersionSupport {
  version: string;
  supported: boolean;
  tested: boolean;
  issues?: string[];
  recommendations?: string[];
}

export interface BrowserSupport {
  browser: string;
  versions: string[];
  supported: boolean;
  polyfillsRequired?: string[];
  limitations?: string[];
}

export interface ContainerSupport {
  runtime: string;
  baseImages: string[];
  supported: boolean;
  recommendations?: string[];
}

export interface TestEnvironmentConfig {
  platforms: NodeJS.Platform[];
  nodeVersions: string[];
  browsers: BrowserConfig[];
  containers: ContainerConfig[];
  parallel: boolean;
  timeout: number;
  retries: number;
}

export interface BrowserConfig {
  name: string;
  versions: string[];
  headless: boolean;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface ContainerConfig {
  runtime: string;
  image: string;
  nodeVersion: string;
  environment?: Record<string, string>;
  volumes?: string[];
  ports?: number[];
}