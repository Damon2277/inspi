/**
 * Compliance Testing Module
 * 
 * Comprehensive compliance checking system for code quality standards,
 * test coverage requirements, documentation completeness, and regulatory compliance.
 */

export { 
  ComplianceChecker, 
  createComplianceChecker,
  type ComplianceConfig,
  type ComplianceResult,
  type ComplianceViolation,
  type ComplianceRecommendation,
  type CodeQualityConfig,
  type TestCoverageConfig,
  type DocumentationConfig,
  type SecurityConfig,
  type AccessibilityConfig,
  type PerformanceConfig,
  type CategoryResult,
  type CategoryDetail,
  type ComplianceTrend,
  type CustomRule,
  type SonarQubeConfig
} from './ComplianceChecker';

export {
  ComplianceReporter,
  createComplianceReporter,
  type ReportConfig,
  type ReportFormat,
  type ReportTemplate,
  type ReportScheduling,
  type NotificationConfig,
  type NotificationChannel,
  type NotificationTrigger,
  type RetentionConfig,
  type ReportMetadata,
  type GeneratedReport
} from './ComplianceReporter';

export {
  ComplianceAutomation,
  createComplianceAutomation,
  type AutomationConfig,
  type SchedulingConfig,
  type ScheduleDefinition,
  type ScheduleCondition,
  type MonitoringConfig,
  type MonitoringTrigger,
  type CicdConfig,
  type CicdPlatform,
  type QualityGate,
  type GateCondition,
  type CicdReporting,
  type HookConfig,
  type AutomationNotificationConfig,
  type NotificationEvent,
  type NotificationTemplate,
  type PersistenceConfig,
  type DatabaseConfig,
  type TableConfig,
  type DataRetentionConfig,
  type RetryPolicy,
  type AutomationStatus
} from './ComplianceAutomation';

// Re-export utility functions
export { ComplianceUtils } from './ComplianceUtils';

// Default configurations
export const DEFAULT_COMPLIANCE_CONFIG: Partial<ComplianceConfig> = {
  codeQuality: {
    enabled: true,
    customRules: [],
    thresholds: {
      complexity: 10,
      maintainabilityIndex: 70,
      duplicateLines: 50,
      codeSmells: 10
    }
  },
  testCoverage: {
    enabled: true,
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    excludePatterns: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
    requireTestFiles: true,
    testFilePatterns: ['**/*.test.ts', '**/*.spec.ts']
  },
  documentation: {
    enabled: true,
    requiredFiles: ['README.md', 'CHANGELOG.md'],
    apiDocumentation: {
      required: true,
      format: 'jsdoc',
      coverage: 70
    },
    readmeRequirements: {
      sections: ['Installation', 'Usage', 'API', 'Contributing'],
      minimumLength: 500
    },
    changelogRequired: true
  },
  security: {
    enabled: true,
    vulnerabilityScanning: true,
    dependencyAudit: true,
    secretsDetection: true,
    codeAnalysis: true,
    allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
    securityHeaders: ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options']
  },
  accessibility: {
    enabled: true,
    wcagLevel: 'AA',
    testPatterns: ['**/*.tsx', '**/*.jsx'],
    requiredAttributes: ['alt', 'aria-label', 'role'],
    colorContrastRatio: 4.5
  },
  performance: {
    enabled: true,
    budgets: {
      bundleSize: 500, // KB
      loadTime: 3000, // ms
      memoryUsage: 100, // MB
      cpuUsage: 80 // %
    },
    metrics: ['FCP', 'LCP', 'FID', 'CLS']
  },
  outputPath: './compliance-reports',
  reportFormats: ['json', 'html', 'markdown']
};

export const DEFAULT_REPORT_CONFIG: Partial<ReportConfig> = {
  outputDir: './compliance-reports',
  formats: [
    { type: 'json', enabled: true },
    { type: 'html', enabled: true },
    { type: 'markdown', enabled: true }
  ],
  templates: [],
  scheduling: {
    enabled: false,
    frequency: 'daily',
    time: '09:00',
    timezone: 'UTC',
    autoGenerate: true
  },
  notifications: {
    enabled: false,
    channels: [],
    triggers: []
  },
  retention: {
    maxReports: 50,
    maxAge: 30,
    archiveOldReports: true
  }
};

export const DEFAULT_AUTOMATION_CONFIG: Partial<AutomationConfig> = {
  scheduling: {
    enabled: false,
    schedules: [],
    timezone: 'UTC',
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 1000,
      exponential: true
    }
  },
  monitoring: {
    enabled: false,
    watchPaths: ['src/**/*'],
    debounceMs: 5000,
    triggers: [],
    realTimeReporting: false
  },
  cicd: {
    enabled: false,
    platforms: [],
    gates: [],
    reporting: {
      formats: ['json'],
      artifacts: true,
      comments: false,
      badges: false
    }
  },
  hooks: [],
  notifications: {
    enabled: false,
    channels: [],
    events: [],
    templates: []
  },
  persistence: {
    enabled: false,
    database: {
      type: 'sqlite',
      connectionString: './compliance.db',
      tables: [],
      indexes: []
    },
    retention: {
      maxRecords: 1000,
      maxAge: 90,
      archiveOldData: true
    }
  }
};

/**
 * Create a complete compliance system with default configurations
 */
export function createComplianceSystem(
  complianceConfig?: Partial<ComplianceConfig>,
  reportConfig?: Partial<ReportConfig>,
  automationConfig?: Partial<AutomationConfig>
) {
  const finalComplianceConfig = {
    ...DEFAULT_COMPLIANCE_CONFIG,
    ...complianceConfig
  } as ComplianceConfig;

  const finalReportConfig = {
    ...DEFAULT_REPORT_CONFIG,
    ...reportConfig
  } as ReportConfig;

  const finalAutomationConfig = {
    ...DEFAULT_AUTOMATION_CONFIG,
    ...automationConfig
  } as AutomationConfig;

  const checker = createComplianceChecker(finalComplianceConfig);
  const reporter = createComplianceReporter(finalReportConfig);
  const automation = createComplianceAutomation(
    finalAutomationConfig,
    finalComplianceConfig,
    finalReportConfig
  );

  return {
    checker,
    reporter,
    automation,
    async runCompleteCheck() {
      const result = await checker.runComplianceCheck();
      const reports = await reporter.generateReport(result);
      return { result, reports };
    },
    async startAutomation() {
      return automation.start();
    },
    async stopAutomation() {
      return automation.stop();
    }
  };
}