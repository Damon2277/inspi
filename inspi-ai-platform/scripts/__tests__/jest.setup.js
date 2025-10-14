/**
 * Jest测试环境设置
 * 为版本管理系统测试配置全局设置和工具
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 全局测试超时设置
jest.setTimeout(30000);

// 全局变量设置
global.TEST_TIMEOUT = 30000;
global.TEST_ENV = 'test';

// 测试工具函数
global.testUtils = {
  // 创建临时目录
  createTempDir: (prefix = 'test-') => {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  },
  
  // 清理临时目录
  cleanupTempDir: (dirPath) => {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  },
  
  // 创建测试Git仓库
  createTestRepo: (repoPath) => {
    const { execSync } = require('child_process');
    
    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }
    
    const originalCwd = process.cwd();
    process.chdir(repoPath);
    
    try {
      execSync('git init', { stdio: 'pipe' });
      execSync('git config user.name "Test User"', { stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
      
      // 创建初始文件
      fs.writeFileSync('README.md', '# Test Repository');
      fs.writeFileSync('package.json', JSON.stringify({
        name: 'test-repo',
        version: '1.0.0'
      }, null, 2));
      
      execSync('git add .', { stdio: 'pipe' });
      execSync('git commit -m "chore: initial commit"', { stdio: 'pipe' });
      
    } finally {
      process.chdir(originalCwd);
    }
    
    return repoPath;
  },
  
  // 等待异步操作
  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // 验证版本号格式
  isValidSemVer: (version) => {
    const semVerRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
    return semVerRegex.test(version);
  },
  
  // 比较版本号
  compareVersions: (v1, v2) => {
    const parseVersion = (version) => {
      const parts = version.replace(/^v/, '').split('.');
      return {
        major: parseInt(parts[0], 10) || 0,
        minor: parseInt(parts[1], 10) || 0,
        patch: parseInt(parts[2], 10) || 0
      };
    };
    
    const parsed1 = parseVersion(v1);
    const parsed2 = parseVersion(v2);
    
    if (parsed1.major !== parsed2.major) {
      return parsed1.major - parsed2.major;
    }
    if (parsed1.minor !== parsed2.minor) {
      return parsed1.minor - parsed2.minor;
    }
    return parsed1.patch - parsed2.patch;
  },
  
  // 生成测试提交数据
  generateTestCommits: (count = 5) => {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
    const scopes = ['ui', 'api', 'core', 'auth', 'db'];
    const commits = [];
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const scope = Math.random() > 0.5 ? scopes[Math.floor(Math.random() * scopes.length)] : null;
      const breaking = Math.random() > 0.9;
      
      const message = scope 
        ? `${type}(${scope})${breaking ? '!' : ''}: test commit ${i + 1}`
        : `${type}${breaking ? '!' : ''}: test commit ${i + 1}`;
      
      commits.push({
        hash: `abc${i.toString().padStart(3, '0')}def${i.toString().padStart(3, '0')}`,
        message,
        author: `Test User ${i + 1}`,
        date: new Date(Date.now() - (count - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    
    return commits;
  }
};

// 模拟控制台输出（避免测试时的噪音）
const originalConsole = { ...console };
global.mockConsole = () => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
};

global.restoreConsole = () => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
};

// 全局测试钩子
beforeEach(() => {
  // 每个测试前重置环境变量
  process.env.NODE_ENV = 'test';
  
  // 清理模拟
  jest.clearAllMocks();
});

afterEach(() => {
  // 恢复控制台输出
  restoreConsole();
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// 自定义匹配器
expect.extend({
  toBeValidSemVer(received) {
    const pass = global.testUtils.isValidSemVer(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid semantic version`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid semantic version`,
        pass: false,
      };
    }
  },
  
  toBeNewerVersion(received, expected) {
    const comparison = global.testUtils.compareVersions(received, expected);
    const pass = comparison > 0;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be newer than ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be newer than ${expected}`,
        pass: false,
      };
    }
  },
  
  toHaveValidCommitFormat(received) {
    const conventionalCommitRegex =
      /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?(!)?: .{1,50}/;
    const pass = conventionalCommitRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid commit format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid commit format`,
        pass: false,
      };
    }
  }
});

// 测试数据常量
global.TEST_DATA = {
  VALID_COMMIT_TYPES: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf',
    'test', 'chore', 'ci', 'build'],
  VALID_SCOPES: ['ui', 'api', 'core', 'auth', 'db', 'config', 'deps'],
  SAMPLE_VERSIONS: ['1.0.0', '1.2.3', '2.0.0-alpha.1', '1.0.0-beta.2', '3.1.4-rc.1'],
  SAMPLE_COMMITS: [
    'feat: add user authentication',
    'fix(ui): resolve button alignment issue',
    'docs: update API documentation',
    'feat(api)!: change authentication method',
    'chore: update dependencies'
  ]
};

// 输出测试环境信息
console.log('🧪 Jest测试环境已初始化');
console.log(`📁 工作目录: ${process.cwd()}`);
console.log(`🔧 Node版本: ${process.version}`);
console.log(`⏰ 测试超时: ${global.TEST_TIMEOUT}ms`);
console.log('');