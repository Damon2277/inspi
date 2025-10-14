import { NextRequest, NextResponse } from 'next/server';

import { integrationTestService } from '@/lib/testing/integration-test';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 开始运行集成测试...');

    // 运行完整的端到端测试
    const testResult = await integrationTestService.runFullE2ETest();

    // 生成测试报告
    const report = integrationTestService.generateTestReport(testResult);

    return NextResponse.json({
      success: true,
      testResult,
      report,
      summary: {
        totalTests: testResult.totalTests,
        passedTests: testResult.passedTests,
        failedTests: testResult.failedTests,
        successRate: Math.round((testResult.passedTests / testResult.totalTests) * 100),
        duration: testResult.duration,
      },
    });

  } catch (error) {
    console.error('运行集成测试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '集成测试失败',
      },
      { status: 500 },
    );
  }
}
