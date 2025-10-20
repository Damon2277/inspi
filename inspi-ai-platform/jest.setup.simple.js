/**
 * 简化的Jest测试环境设置
 * 只包含必要的模拟和配置
 */
require('whatwg-fetch');

const globalScope = typeof globalThis !== 'undefined' ? globalThis : global;

// 设置测试超时
jest.setTimeout(10000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.SIGNATURE_SECRET = 'test-signature-secret-64-characters-long-for-testing-purposes';
process.env.TOKEN_SECRET = 'test-token-secret-32-chars-long';

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => {
      return {
        json: () => Promise.resolve(data),
        status: init?.status || 200,
        headers: new Map(Object.entries(init?.headers || {})),
      };
    },
    redirect: (url, status = 302) => {
      return {
        status,
        headers: new Map([['Location', url]]),
      };
    },
  },
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.cookies = new Map();
    }
  },
}));

// Global NextResponse for tests that import it directly
global.NextResponse = {
  json: (data, init) => {
    return {
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
    };
  },
  redirect: (url, status = 302) => {
    return {
      status,
      headers: new Map([['Location', url]]),
    };
  },
};

// 模拟全局对象
global.console = {
  ...console,
  // 静默某些警告
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
};

// 模拟DOM API
if (typeof globalScope.window === 'undefined') {
  globalScope.window = {};
}

if (!globalScope.window.matchMedia) {
  Object.defineProperty(globalScope.window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// 模拟IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 模拟ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 全局测试工具
global.testUtils = {
  waitFor: (callback, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          const result = callback();
          if (result) {
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(check, 10);
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(check, 10);
          }
        }
      };
      check();
    });
  },

  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    tier: 'free',
    createdAt: new Date(),
    ...overrides,
  }),
};

// 清理函数
afterEach(() => {
  // 清理所有定时器
  jest.clearAllTimers();
  // 清理所有模拟
  jest.clearAllMocks();
});

afterAll(() => {
  // 强制清理所有异步操作
  jest.clearAllTimers();
  jest.useRealTimers();
});
