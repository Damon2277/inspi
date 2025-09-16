/**
 * 测试配置和管理系统入口
 * 统一导出所有测试相关的类和工具
 */

// 测试配置和环境管理
export { TestConfigManager } from './TestConfigManager';
export { TestEnvironment } from './TestEnvironment';
export { TestDatabaseManager } from './TestDatabaseManager';
export { JestConfigGenerator } from './JestConfigGenerator';

// 测试数据工厂系统
export { 
  TestDataFactory,
  UserFactory,
  TeachingCardFactory,
  WorkFactory,
  GraphNodeFactory,
  GraphEdgeFactory,
  KnowledgeGraphFactory,
  testDataFactory
} from './TestDataFactory';

// 测试数据构建器模式
export {
  TestDataBuilder,
  UserBuilder,
  TeachingCardBuilder,
  WorkBuilder,
  GraphNodeBuilder,
  GraphEdgeBuilder,
  KnowledgeGraphBuilder,
  testDataBuilder
} from './TestDataBuilder';

// 测试数据关系管理
export {
  TestDataRelationshipManager,
  TestDataCollection,
  testDataRelationshipManager,
  RelationshipType
} from './TestDataRelationshipManager';

// 测试数据清理管理
export {
  TestDataCleanupManager,
  createTestDataCleanupManager,
  CleanupStrategy,
  CleanupScope
} from './TestDataCleanupManager';

// Mock服务管理系统
export {
  MockServiceManager,
  mockServiceManager
} from './MockServiceManager';

export {
  BaseMockService
} from './mocks/BaseMockService';

export {
  MockGeminiService
} from './mocks/MockGeminiService';

export {
  MockEmailService
} from './mocks/MockEmailService';

export {
  MockDatabaseService
} from './mocks/MockDatabaseService';

// 类型导出
export type {
  TestConfig,
  QualityGate,
  QualityCondition,
  QualityAction,
  NotificationConfig,
} from './TestConfigManager';

export type {
  EnvironmentInfo,
  InitializationResult,
} from './TestEnvironment';

export type {
  DatabaseConfig,
  DatabaseStatus,
} from './TestDatabaseManager';

export type {
  JestConfigOptions,
} from './JestConfigGenerator';

export type { 
  DataRelationship, 
  DataReference, 
  RelationshipConstraint 
} from './TestDataRelationshipManager';

export type { 
  CleanupConfig, 
  CleanupStats, 
  CleanupTask, 
  DataItemMetadata 
} from './TestDataCleanupManager';

// Mock服务类型
export type {
  MockService,
  MockServiceStatus,
  MockServiceConfig,
  MockCall,
  MockVerificationResult,
  MockServiceVerificationResult,
  MockManagerStats
} from './MockServiceManager';

export type {
  MockAIResponse
} from './mocks/MockGeminiService';

export type {
  MockEmailRecord,
  MockEmailConfig
} from './mocks/MockEmailService';

export type {
  MockDatabaseConfig,
  MockCollection,
  MockQuery,
  MockTransaction,
  MockOperation
} from './mocks/MockDatabaseService';

// 便捷函数
export const createTestConfig = () => TestConfigManager.getInstance();
export const createTestEnvironment = () => TestEnvironment.getInstance();
export const createTestDatabase = () => TestDatabaseManager.getInstance();
export const createJestConfig = () => new JestConfigGenerator();

// Mock服务便捷函数
export const createMockServiceManager = () => MockServiceManager.getInstance();
export const createMockGeminiService = () => new MockGeminiService();
export const createMockEmailService = () => new MockEmailService();
export const createMockDatabaseService = () => new MockDatabaseService();

// 新增测试工具和辅助函数
export * from './utils/TestingUtils';
export * from './matchers/CustomMatchers';
export * from './helpers/AssertionHelpers';
export * from './performance/PerformanceMonitor';
export * from './errors/TestError';