/**
 * Security Testing Module Index
 *
 * 导出所有安全测试相关的类和接口
 */

// 主要安全测试框架
export { SecurityTestFramework } from './SecurityTestFramework';
export type {
  SecurityTestConfig,
  SecurityPayload,
  SecurityTestResult,
  SecurityVulnerability,
  SecurityReport,
} from './SecurityTestFramework';

// 输入验证测试器
export { InputValidationTester } from './InputValidationTester';
export type {
  InputValidationConfig,
  ValidationPayload,
  ValidationTestResult,
  ValidationReport,
  InputValidator,
  ValidationResult,
} from './InputValidationTester';

// 认证授权测试器
export { AuthorizationTester } from './AuthorizationTester';
export type {
  AuthorizationConfig,
  AuthTestScenario,
  AuthorizationTestResult,
  AuthorizationReport,
  TestUser,
  Resource,
  AuthorizationService,
  AuthorizationResult,
} from './AuthorizationTester';

// 数据加密验证器
export { EncryptionValidator } from './EncryptionValidator';
export type {
  EncryptionConfig,
  EncryptionAlgorithm,
  EncryptionTestResult,
  EncryptionReport,
  EncryptionService,
} from './EncryptionValidator';

// 漏洞扫描器
export { VulnerabilityScanner } from './VulnerabilityScanner';
export type {
  VulnerabilityScanConfig,
  ScanRule,
  ScanTarget,
  VulnerabilityScanResult,
  Vulnerability,
  VulnerabilityReport,
} from './VulnerabilityScanner';
