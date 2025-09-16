/**
 * Test Reporting System
 * 
 * Exports for the comprehensive test reporting system including
 * report generation, templates, and configuration.
 */

export {
  TestReportGenerator,
  type TestReportData,
  type ReportConfig,
  type ReportFormat,
  type ReportTemplate
} from './TestReportGenerator';

// Re-export commonly used types for convenience
export type {
  TestReportData as ReportData,
  ReportConfig as Config
} from './TestReportGenerator';