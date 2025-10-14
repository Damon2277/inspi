/**
 * Playwright全局清理
 * 在所有E2E测试运行后执行
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

    // 清理测试数据
    await cleanupTestData(page, baseURL);

    // 清理测试文件
    await cleanupTestFiles();

    // 生成测试报告摘要
    await generateTestSummary();

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ E2E test global teardown completed!');
}

/**
 * 清理测试数据
 */
async function cleanupTestData(page: any, baseURL: string) {
  console.log('🗑️ Cleaning up test data...');

  try {
    await page.evaluate(async (baseURL) => {
      const response = await fetch(`${baseURL}/api/test/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup_test_data',
        }),
      });
      return response.json();
    }, baseURL);

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error.message);
  }
}

/**
 * 清理测试文件
 */
async function cleanupTestFiles() {
  console.log('📁 Cleaning up test files...');

  try {
    const fs = require('fs');
    const path = require('path');

    // 清理临时认证文件
    const authDir = path.join(process.cwd(), 'test-results', 'auth');
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir);
      files.forEach((file: string) => {
        if (file.endsWith('-session.json')) {
          fs.unlinkSync(path.join(authDir, file));
        }
      });
    }

    // 清理临时截图和视频（保留失败的测试）
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(resultsDir)) {
      const cleanupOldFiles = (dir: string, maxAge: number = 7 * 24 * 60 * 60 * 1000) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        const now = Date.now();

        files.forEach((file: any) => {
          const filePath = path.join(dir, file.name);

          if (file.isDirectory()) {
            cleanupOldFiles(filePath, maxAge);
          } else {
            const stats = fs.statSync(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
              fs.unlinkSync(filePath);
            }
          }
        });
      };

      cleanupOldFiles(resultsDir);
    }

    console.log('✅ Test files cleanup completed');
  } catch (error) {
    console.warn('⚠️ Test files cleanup failed:', error.message);
  }
}

/**
 * 生成测试报告摘要
 */
async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    const fs = require('fs');
    const path = require('path');

    const resultsFile = path.join(process.cwd(), 'test-results', 'e2e-results.json');

    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

      const summary = {
        timestamp: new Date().toISOString(),
        total: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        projects: results.config?.projects?.map((p: any) => p.name) || [],
        failedTests: results.suites?.flatMap((suite: any) =>
          suite.specs?.filter((spec: any) =>
            spec.tests?.some((test: any) => test.results?.some((result: any) => result.status === 'failed')),
          ).map((spec: any) => ({
            title: spec.title,
            file: spec.file,
            errors: spec.tests?.flatMap((test: any) =>
              test.results?.filter((result: any) => result.status === 'failed')
                .map((result: any) => result.error?.message),
            ).filter(Boolean),
          })),
        ).filter(Boolean) || [],
      };

      const summaryFile = path.join(process.cwd(), 'test-results', 'e2e-summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

      // 输出摘要到控制台
      console.log('\n📋 E2E Test Summary:');
      console.log(`   Total: ${summary.total}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);

      if (summary.failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        summary.failedTests.forEach((test: any) => {
          console.log(`   - ${test.title}`);
          if (test.errors.length > 0) {
            test.errors.forEach((error: string) => {
              console.log(`     Error: ${error}`);
            });
          }
        });
      }

      console.log('✅ Test summary generated');
    }
  } catch (error) {
    console.warn('⚠️ Test summary generation failed:', error.message);
  }
}

export default globalTeardown;
