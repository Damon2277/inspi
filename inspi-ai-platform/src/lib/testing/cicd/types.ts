/**
 * Type definitions for CI/CD integration optimization
 */

export interface PipelineConfig {
  name: string;
  platform: 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circleci';
  stages: PipelineStage[];
  parallelization: ParallelizationConfig;
  caching: CachingConfig;
  environment: EnvironmentConfig;
  notifications: NotificationConfig;
  qualityGates: QualityGateConfig[];
}

export interface PipelineStage {
  name: string;
  type: 'build' | 'test' | 'lint' | 'security' | 'deploy' | 'custom';
  commands: string[];
  dependencies: string[];
  timeout: number;
  retries: number;
  condition?: string;
  artifacts?: ArtifactConfig[];
  environment?: Record<string, string>;
}

export interface ParallelizationConfig {
  enabled: boolean;
  maxConcurrency: number;
  strategy: 'stage' | 'test' | 'matrix';
  matrix?: MatrixConfig;
}

export interface MatrixConfig {
  nodeVersion: string[];
  os: string[];
  browser?: string[];
  environment?: string[];
}

export interface CachingConfig {
  enabled: boolean;
  strategy: 'dependencies' | 'build' | 'test' | 'all';
  paths: string[];
  key: string;
  restoreKeys: string[];
  ttl?: number;
}

export interface EnvironmentConfig {
  variables: Record<string, string>;
  secrets: string[];
  files?: EnvironmentFile[];
}

export interface EnvironmentFile {
  path: string;
  content: string;
  encoding?: 'base64' | 'plain';
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  conditions: NotificationCondition[];
}

export interface NotificationChannel {
  type: 'slack' | 'email' | 'teams' | 'webhook';
  config: Record<string, any>;
}

export interface NotificationCondition {
  event: 'success' | 'failure' | 'always' | 'change';
  stages?: string[];
}

export interface QualityGateConfig {
  name: string;
  type: 'coverage' | 'performance' | 'security' | 'custom';
  threshold: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  blocking: boolean;
  message?: string;
}

export interface ArtifactConfig {
  name: string;
  paths: string[];
  retention?: number;
  condition?: string;
}

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  startTime: Date;
  endTime: Date;
  suite: string;
  file: string;
  error?: TestError;
  metadata?: Record<string, any>;
}

export interface TestError {
  message: string;
  stack?: string;
  type: string;
  line?: number;
  column?: number;
}

export interface QualityGate {
  id: string;
  name: string;
  type: string;
  status: 'passed' | 'failed' | 'warning';
  value: number;
  threshold: number;
  message: string;
  blocking: boolean;
  details?: Record<string, any>;
}

export interface DeploymentConfig {
  environment: string;
  strategy: 'rolling' | 'blue-green' | 'canary' | 'recreate';
  validation: ValidationConfig;
  rollback: RollbackConfig;
  monitoring: MonitoringConfig;
}

export interface ValidationConfig {
  healthChecks: HealthCheck[];
  smokeTests: SmokeTest[];
  timeout: number;
  retries: number;
}

export interface HealthCheck {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus: number;
  timeout: number;
  headers?: Record<string, string>;
}

export interface SmokeTest {
  name: string;
  command: string;
  timeout: number;
  expectedExitCode: number;
}

export interface RollbackConfig {
  enabled: boolean;
  automatic: boolean;
  conditions: RollbackCondition[];
  strategy: 'previous' | 'specific';
  version?: string;
}

export interface RollbackCondition {
  type: 'health' | 'performance' | 'error-rate';
  threshold: number;
  duration: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  alerts: AlertConfig[];
  duration: number;
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
}

export interface CICDMetrics {
  pipelineId: string;
  buildNumber: number;
  duration: number;
  status: 'success' | 'failure' | 'cancelled' | 'running';
  stages: StageMetrics[];
  testResults: TestSummary;
  qualityGates: QualityGateSummary;
  artifacts: ArtifactSummary;
  performance: PerformanceMetrics;
}

export interface StageMetrics {
  name: string;
  status: 'success' | 'failure' | 'skipped' | 'running';
  duration: number;
  startTime: Date;
  endTime?: Date;
  logs?: string;
  artifacts?: string[];
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: CoverageInfo;
}

export interface CoverageInfo {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface QualityGateSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  blocking: number;
}

export interface ArtifactSummary {
  total: number;
  size: number;
  types: Record<string, number>;
}

export interface PerformanceMetrics {
  buildTime: number;
  testTime: number;
  deployTime: number;
  queueTime: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface PipelineOptimization {
  recommendations: OptimizationRecommendation[];
  estimatedImprovement: ImprovementEstimate;
  implementationPlan: ImplementationStep[];
}

export interface OptimizationRecommendation {
  type: 'caching' | 'parallelization' | 'resource' | 'dependency' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: string;
  implementation: string;
}

export interface ImprovementEstimate {
  timeReduction: number;
  costReduction: number;
  reliabilityImprovement: number;
  confidence: number;
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  commands?: string[];
  files?: FileChange[];
  validation: string;
}

export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
  patch?: string;
}

export interface CICDProvider {
  name: string;
  type: 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circleci';
  apiUrl: string;
  authentication: AuthConfig;
  capabilities: ProviderCapabilities;
}

export interface AuthConfig {
  type: 'token' | 'oauth' | 'basic' | 'certificate';
  credentials: Record<string, string>;
}

export interface ProviderCapabilities {
  parallelization: boolean;
  matrixBuilds: boolean;
  caching: boolean;
  artifacts: boolean;
  environments: boolean;
  approvals: boolean;
  rollbacks: boolean;
}

export interface PipelineAnalysis {
  bottlenecks: Bottleneck[];
  inefficiencies: Inefficiency[];
  recommendations: string[];
  trends: TrendAnalysis;
}

export interface Bottleneck {
  stage: string;
  type: 'cpu' | 'memory' | 'io' | 'network' | 'dependency';
  impact: number;
  frequency: number;
  suggestions: string[];
}

export interface Inefficiency {
  type: 'redundant' | 'sequential' | 'oversized' | 'misconfigured';
  description: string;
  impact: string;
  solution: string;
}

export interface TrendAnalysis {
  duration: TrendData;
  successRate: TrendData;
  resourceUsage: TrendData;
  testCoverage: TrendData;
}

export interface TrendData {
  current: number;
  previous: number;
  trend: 'improving' | 'degrading' | 'stable';
  change: number;
}