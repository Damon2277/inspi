// 项目状态管理系统的TypeScript接口定义

export type FeatureStatus = 'not_started' | 'in_progress' | 'completed' | 'testing' | 'deployed';
export type RiskLevel = 'low' | 'medium' | 'high';
export type OverallStatus = 'stable' | 'warning' | 'critical';
export type IssueType = 'style_regression' | 'version_control' | 'functional_error' | 'dependency_conflict';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'active' | 'resolved' | 'ignored';

export interface Feature {
  status: FeatureStatus;
  lastUpdated: string;
  completionCriteria: string[];
  dependencies: string[];
  riskLevel: RiskLevel;
  notes?: string;
  completionDate?: string;
  blockers?: string[];
}

export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  affectedFeatures: string[];
  createdAt: string;
  status: IssueStatus;
  resolvedAt?: string;
  resolution?: string;
}

export interface GlobalHealth {
  overallStatus: OverallStatus;
  lastStableSnapshot: string | null;
  activeIssues: Issue[];
}

export interface ProjectState {
  version: string;
  lastUpdated: string;
  features: {
    [featureName: string]: Feature;
  };
  globalHealth: GlobalHealth;
}

export interface StateChangeLog {
  id: string;
  timestamp: string;
  featureName: string;
  previousStatus: FeatureStatus;
  newStatus: FeatureStatus;
  reason: string;
  operator: string;
  additionalData?: any;
}

export interface StatusValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}