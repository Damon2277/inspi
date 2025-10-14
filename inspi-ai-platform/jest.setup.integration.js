// Jest setup for integration tests
import { jest } from '@jest/globals';

// 设置测试超时
jest.setTimeout(60000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 清理控制台警告
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is deprecated') ||
     args[0].includes('Warning: React.createFactory() is deprecated'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};
