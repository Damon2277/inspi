/**
 * CI/CD集成测试
 * 测试版本标签触发的CI/CD流程
 */

const fs = require('fs');
const path = require('path');

describe('CI/CD Integration', () => {
  let workflowContent;

  beforeAll(() => {
    // 读取GitHub Actions工作流配置
    const workflowPath = path.join(__dirname, '../../.github/workflows/ci-cd.yml');
    workflowContent = fs.readFileSync(workflowPath, 'utf8');
  });

  describe('Workflow Configuration', () => {
    it('should trigger on version tags', () => {
      expect(workflowContent).toContain('tags:');
      expect(workflowContent).toContain("- 'v*'");
    });

    it('should have version-release job', () => {
      expect(workflowContent).toContain('version-release:');
    });

    it('should have deploy-staging-release job', () => {
      expect(workflowContent).toContain('deploy-staging-release:');
    });

    it('should have deploy-production-release job', () => {
      expect(workflowContent).toContain('deploy-production-release:');
    });

    it('should have post-release-verification job', () => {
      expect(workflowContent).toContain('post-release-verification:');
    });

    it('should have rollback-on-failure job', () => {
      expect(workflowContent).toContain('rollback-on-failure:');
    });
  });

  describe('Version Release Job', () => {
    it('should only run on version tags', () => {
      expect(workflowContent).toContain("if: startsWith(github.ref, 'refs/tags/v')");
    });

    it('should validate version format', () => {
      expect(workflowContent).toContain('验证版本标签格式');
    });

    it('should run compatibility check', () => {
      expect(workflowContent).toContain('运行版本兼容性检查');
      expect(workflowContent).toContain('version:compatibility:validate');
    });

    it('should generate release notes', () => {
      expect(workflowContent).toContain('生成发布说明');
      expect(workflowContent).toContain('release:docs');
    });

    it('should create GitHub release', () => {
      expect(workflowContent).toContain('创建GitHub Release');
      expect(workflowContent).toContain('actions/create-release@v1');
    });
  });

  describe('Staging Deployment Job', () => {
    it('should perform health check', () => {
      expect(workflowContent).toContain('预发布环境健康检查');
      expect(workflowContent).toContain('/api/health');
    });

    it('should run smoke tests', () => {
      expect(workflowContent).toContain('运行预发布环境烟雾测试');
    });
  });

  describe('Production Deployment Job', () => {
    it('should deploy with --prod flag', () => {
      expect(workflowContent).toContain("vercel-args: '--prod'");
    });

    it('should send deployment notification', () => {
      expect(workflowContent).toContain('发送部署成功通知');
      expect(workflowContent).toContain('8398a7/action-slack@v3');
    });
  });

  describe('Post-Release Verification Job', () => {
    it('should run end-to-end tests', () => {
      expect(workflowContent).toContain('运行生产环境端到端测试');
      expect(workflowContent).toContain('test:e2e');
    });

    it('should run performance tests', () => {
      expect(workflowContent).toContain('运行性能测试');
      expect(workflowContent).toContain('test:performance');
    });

    it('should verify version information', () => {
      expect(workflowContent).toContain('验证版本信息');
      expect(workflowContent).toContain('/api/version');
    });
  });

  describe('Rollback Job', () => {
    it('should run on failure', () => {
      expect(workflowContent).toContain('if: failure()');
    });

    it('should get previous stable version', () => {
      expect(workflowContent).toContain('获取上一个稳定版本');
    });

    it('should execute version rollback', () => {
      expect(workflowContent).toContain('执行版本回滚');
      expect(workflowContent).toContain('version:rollback');
    });

    it('should send rollback notification', () => {
      expect(workflowContent).toContain('发送回滚通知');
    });
  });

  describe('Environment Variables and Secrets', () => {
    it('should use required environment variables', () => {
      expect(workflowContent).toContain("NODE_VERSION: '18'");
      expect(workflowContent).toContain("PNPM_VERSION: '8'");
    });

    it('should reference required secrets', () => {
      expect(workflowContent).toContain('secrets.VERCEL_TOKEN');
      expect(workflowContent).toContain('secrets.VERCEL_ORG_ID');
      expect(workflowContent).toContain('secrets.VERCEL_PROJECT_ID');
      expect(workflowContent).toContain('secrets.PRODUCTION_URL');
      expect(workflowContent).toContain('secrets.STAGING_API_URL');
      expect(workflowContent).toContain('secrets.PRODUCTION_API_URL');
      expect(workflowContent).toContain('secrets.SLACK_WEBHOOK');
    });
  });
});

describe('Package.json Scripts', () => {
  let packageJson;

  beforeAll(() => {
    const packagePath = path.join(__dirname, '../../package.json');
    packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  });

  it('should have deployment verification script', () => {
    expect(packageJson.scripts['deploy:verify']).toBeDefined();
    expect(packageJson.scripts['deploy:verify']).toContain('deployment-verification.js');
  });

  it('should have deployment rollback scripts', () => {
    expect(packageJson.scripts['deploy:rollback']).toBeDefined();
    expect(packageJson.scripts['deploy:rollback:emergency']).toBeDefined();
    expect(packageJson.scripts['deploy:rollback:list']).toBeDefined();
  });

  it('should have version compatibility validation script', () => {
    expect(packageJson.scripts['version:compatibility:validate']).toBeDefined();
  });
});

describe('API Endpoints', () => {
  it('should have version API endpoint', () => {
    const versionApiPath = path.join(__dirname, '../../src/app/api/version/route.ts');
    expect(fs.existsSync(versionApiPath)).toBe(true);
  });

  it('should have health API endpoint', () => {
    const healthApiPath = path.join(__dirname, '../../src/app/api/health/route.ts');
    expect(fs.existsSync(healthApiPath)).toBe(true);
  });
});

describe('Deployment Scripts', () => {
  it('should have deployment verification script', () => {
    const scriptPath = path.join(__dirname, '../deployment-verification.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('should have deployment rollback script', () => {
    const scriptPath = path.join(__dirname, '../deployment-rollback.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('deployment verification script should be executable', () => {
    const scriptPath = path.join(__dirname, '../deployment-verification.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('#!/usr/bin/env node');
    expect(content).toContain('class DeploymentVerifier');
  });

  it('deployment rollback script should be executable', () => {
    const scriptPath = path.join(__dirname, '../deployment-rollback.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('#!/usr/bin/env node');
    expect(content).toContain('class DeploymentRollback');
  });
});

describe('Requirements Verification', () => {
  let workflowContent;

  beforeAll(() => {
    // 读取GitHub Actions工作流配置
    const workflowPath = path.join(__dirname, '../../.github/workflows/ci-cd.yml');
    workflowContent = fs.readFileSync(workflowPath, 'utf8');
  });

  describe('Requirement 7.1: CI triggers on version tags', () => {
    it('should automatically trigger build on version tag creation', () => {
      expect(workflowContent).toContain('tags:');
      expect(workflowContent).toContain("- 'v*'");
      expect(workflowContent).toContain('version-release:');
    });
  });

  describe('Requirement 7.2: Automatic test execution after build', () => {
    it('should run tests after successful build', () => {
      expect(workflowContent).toContain('needs: [test, build, security-scan]');
      expect(workflowContent).toContain('运行发布前测试');
      expect(workflowContent).toContain('test:unit');
      expect(workflowContent).toContain('test:integration');
    });
  });

  describe('Requirement 7.3: Automatic staging deployment', () => {
    it('should deploy to staging after tests pass', () => {
      expect(workflowContent).toContain('deploy-staging-release:');
      expect(workflowContent).toContain('needs: version-release');
      expect(workflowContent).toContain('environment: staging');
    });
  });

  describe('Requirement 7.4: Production deployment support', () => {
    it('should support one-click production deployment', () => {
      expect(workflowContent).toContain('deploy-production-release:');
      expect(workflowContent).toContain('environment: production');
      expect(workflowContent).toContain("vercel-args: '--prod'");
    });
  });

  describe('Requirement 7.5: Automatic rollback on failure', () => {
    it('should rollback to previous stable version on deployment failure', () => {
      expect(workflowContent).toContain('rollback-on-failure:');
      expect(workflowContent).toContain('if: failure()');
      expect(workflowContent).toContain('获取上一个稳定版本');
      expect(workflowContent).toContain('执行版本回滚');
    });
  });
});