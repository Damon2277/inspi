/**
 * Jest测试环境设置
 * 配置全局测试环境和模拟对象
 */
require('whatwg-fetch');

// 设置测试超时
jest.setTimeout(30000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// 模拟Next.js路由
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// 模拟Next.js导航
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// 模拟Next Auth (如果存在)
try {
  jest.mock('next-auth/react', () => ({
    useSession: () => ({
      data: null,
      status: 'unauthenticated',
    }),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
  }));
} catch (e) {
  // next-auth not installed, skip mock
}

// 模拟Redis
jest.mock('@/lib/cache/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    increment: jest.fn(),
    isReady: jest.fn(() => true),
  },
}));

// 模拟MongoDB连接
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

// 模拟日志系统
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// 模拟文件上传
Object.defineProperty(window, 'File', {
  value: class MockFile {
    constructor(parts, filename, properties) {
      this.parts = parts;
      this.name = filename;
      this.size = properties?.size || 0;
      this.type = properties?.type || '';
      this.lastModified = properties?.lastModified || Date.now();
    }
  },
});

Object.defineProperty(window, 'FileReader', {
  value: class MockFileReader {
    constructor() {
      this.readyState = 0;
      this.result = null;
      this.error = null;
      this.onload = null;
      this.onerror = null;
      this.onabort = null;
    }

    readAsDataURL() {
      setTimeout(() => {
        this.readyState = 2;
        this.result = 'data:text/plain;base64,dGVzdA==';
        if (this.onload) this.onload({ target: this });
      }, 0);
    }

    readAsText() {
      setTimeout(() => {
        this.readyState = 2;
        this.result = 'test content';
        if (this.onload) this.onload({ target: this });
      }, 0);
    }
  },
});

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

// 模拟matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
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

// 模拟Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// 清理控制台警告
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is deprecated') ||
     args[0].includes('Warning: React.createFactory() is deprecated') ||
     args[0].includes('Warning: componentWillReceiveProps has been renamed'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 测试工具函数
global.testUtils = {
  // 等待异步操作完成
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

  // 模拟延迟
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // 创建模拟用户
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    tier: 'free',
    createdAt: new Date(),
    ...overrides,
  }),

  // 创建模拟请求
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    headers: {},
    body: null,
    ...overrides,
  }),
};
