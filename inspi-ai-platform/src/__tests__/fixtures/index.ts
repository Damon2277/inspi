/**
 * 测试数据工厂入口文件
 * 统一导出所有测试数据工厂函数
 */

// 用户相关
export * from './user-fixtures';

// 作品相关
export * from './work-fixtures';

// 知识图谱相关
export * from './knowledge-graph-fixtures';

// API响应相关
export * from './api-fixtures';

// 通用工厂函数
export const createTestId = (prefix: string = 'test') =>
  `${prefix}-${Math.random().toString(36).substring(2, 15)}`;

export const createTestEmail = (prefix: string = 'test') =>
  `${prefix}-${Math.random().toString(36).substring(2, 8)}@example.com`;

export const createTestDate = (daysOffset: number = 0) =>
  new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString();

export const createTestArray = <T>(factory: () => T, count: number): T[] =>
  Array.from({ length: count }, factory);

// 随机选择器
export const randomChoice = <T>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];

export const randomChoices = <T>(array: T[], count: number): T[] =>
  Array.from({ length: count }, () => randomChoice(array));

// 随机数生成器
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomFloat = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

// 随机布尔值
export const randomBoolean = (): boolean => Math.random() < 0.5;

// 随机字符串
export const randomString = (length: number = 10): string =>
  Math.random().toString(36).substring(2, length + 2);

// 测试环境检查
export const isTestEnv = () => process.env.NODE_ENV === 'test';

// 清理测试数据
export const cleanupTestData = () => {
  // 这里可以添加清理逻辑，比如清理数据库、缓存等
  console.log('Cleaning up test data...');
};
