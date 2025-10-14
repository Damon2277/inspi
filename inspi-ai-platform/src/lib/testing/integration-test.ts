/**
 * 系统集成和端到端测试
 * 测试完整的订阅支付流程
 */

import { permissionMiddleware } from '@/core/auth/permission-middleware';
import { paymentService } from '@/core/subscription/payment-service';
import { planService } from '@/core/subscription/plan-service';
import { EnhancedQuotaChecker } from '@/core/subscription/quota-checker';
import { subscriptionService } from '@/core/subscription/subscription-service';
import { notificationService } from '@/lib/notification/notification-service';
import { securityService } from '@/lib/security/security-service';
import { errorHandler } from '@/shared/errors/error-handler';

/**
 * 测试结果
 */
export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * 测试套件结果
 */
export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
}

/**
 * 集成测试服务
 */
export class IntegrationTestService {
  private static instance: IntegrationTestService;

  private constructor() {}

  public static getInstance(): IntegrationTestService {
    if (!IntegrationTestService.instance) {
      IntegrationTestService.instance = new IntegrationTestService();
    }
    return IntegrationTestService.instance;
  }

  /**
   * 运行完整的端到端测试
   */
  async runFullE2ETest(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    console.log('🚀 开始运行完整的端到端测试...');

    // 测试用户注册和订阅流程
    results.push(await this.testUserSubscriptionFlow());

    // 测试支付流程
    results.push(await this.testPaymentFlow());

    // 测试配额系统
    results.push(await this.testQuotaSystem());

    // 测试权限控制
    results.push(await this.testPermissionControl());

    // 测试升级流程
    results.push(await this.testUpgradeFlow());

    // 测试通知系统
    results.push(await this.testNotificationSystem());

    // 测试错误处理
    results.push(await this.testErrorHandling());

    // 测试安全机制
    results.push(await this.testSecurityMechanisms());

    const duration = Date.now() - startTime;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;

    const suiteResult: TestSuiteResult = {
      suiteName: '完整端到端测试',
      totalTests: results.length,
      passedTests,
      failedTests,
      duration,
      results,
    };

    console.log(`✅ 测试完成: ${passedTests}/${results.length} 通过, 耗时: ${duration}ms`);

    return suiteResult;
  }

  /**
   * 测试用户订阅流程
   */
  private async testUserSubscriptionFlow(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('📝 测试用户订阅流程...');

      const testUserId = 'test-user-e2e-001';

      // 1. 获取可用套餐
      const plansResult = await planService.queryPlans({ status: 'active' });
      if (plansResult.plans.length === 0) {
        throw new Error('没有可用的套餐');
      }

      const basicPlan = (plansResult.plans as any).find(p => p.tier === 'basic');
      if (!basicPlan) {
        throw new Error('找不到基础版套餐');
      }

      // 2. 创建订阅
      const subscriptionResult = await subscriptionService.createSubscription({
        userId: testUserId,
        planId: basicPlan.id,
        paymentMethod: 'wechat_pay',
        billingCycle: 'monthly',
      });

      if (!subscriptionResult.subscription) {
        throw new Error('订阅创建失败');
      }

      // 3. 验证订阅状态
      const currentSubscription = await subscriptionService.getCurrentSubscription(testUserId);
      if (!currentSubscription || currentSubscription.id !== subscriptionResult.subscription.id) {
        throw new Error('订阅状态验证失败');
      }

      return {
        testName: '用户订阅流程',
        success: true,
        duration: Date.now() - startTime,
        details: {
          subscriptionId: subscriptionResult.subscription.id,
          planName: basicPlan.name,
          userId: testUserId,
        },
      };

    } catch (error) {
      return {
        testName: '用户订阅流程',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 测试支付流程
   */
  private async testPaymentFlow(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('💳 测试支付流程...');

      const testUserId = 'test-user-e2e-002';

      // 1. 创建支付记录
      const paymentInfo = await paymentService.createPayment({
        orderId: 'order-test-001',
        userId: testUserId,
        amount: 6900, // 69元
        currency: 'CNY',
        paymentMethod: 'wechat_pay',
        description: '基础版订阅',
      });

      if (!paymentInfo.paymentId) {
        throw new Error('支付记录创建失败');
      }

      return {
        testName: '支付流程',
        success: true,
        duration: Date.now() - startTime,
        details: {
          paymentId: paymentInfo.paymentId,
          amount: paymentInfo.amount,
          qrCode: paymentInfo.qrCode,
        },
      };

    } catch (error) {
      return {
        testName: '支付流程',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 测试配额系统
   */
  private async testQuotaSystem(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('📊 测试配额系统...');

      const testUserId = 'test-user-e2e-003';
      const quotaChecker = new EnhancedQuotaChecker(testUserId, null);

      // 1. 检查初始配额
      const initialQuota = await quotaChecker.checkQuota('create', 1);
      if (!initialQuota.allowed) {
        throw new Error('初始配额检查失败');
      }

      // 2. 消费配额
      const consumeResult = await quotaChecker.consumeQuota('create', 1);
      if (!consumeResult) {
        throw new Error('配额消费失败');
      }

      // 3. 检查配额使用情况
      const usageMap = await quotaChecker.getAllQuotaStatus();
      const usage = usageMap['create'];
      if (!usage || usage.used === 0) {
        throw new Error('配额使用统计错误');
      }

      // 4. 测试配额重置
      await quotaChecker.resetDailyQuotas();
      const resetUsageMap = await quotaChecker.getAllQuotaStatus();
      const resetUsage = resetUsageMap['create'];
      if (!resetUsage || resetUsage.used !== 0) {
        throw new Error('配额重置失败');
      }

      return {
        testName: '配额系统',
        success: true,
        duration: Date.now() - startTime,
        details: {
          initialQuota: initialQuota.allowed,
          consumedAmount: 1,
          finalUsage: resetUsage?.used ?? 0,
        },
      };

    } catch (error) {
      return {
        testName: '配额系统',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 测试权限控制
   */
  private async testPermissionControl(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('🔐 测试权限控制...');

      const testUserId = 'test-user-e2e-004';

      // 1. 测试基础权限检查
      const basicPermission = await permissionMiddleware.checkPermission({
        userId: testUserId,
        requiredPermissions: ['card:create:basic'],
      });

      if (!basicPermission.allowed) {
        throw new Error('基础权限检查失败');
      }

      // 2. 测试高级权限检查（应该失败）
      const advancedPermission = await permissionMiddleware.checkPermission({
        userId: testUserId,
        requiredPermissions: ['card:brand:custom'],
      });

      if (advancedPermission.allowed) {
        throw new Error('高级权限检查应该失败但通过了');
      }

      // 3. 测试配额权限检查
      const quotaPermission = await permissionMiddleware.checkPermission({
        userId: testUserId,
        quotaType: 'create',
        quotaAmount: 1,
      });

      if (!quotaPermission.allowed) {
        throw new Error('配额权限检查失败');
      }

      // 4. 获取用户权限信息
      const userPermissions = await permissionMiddleware.getUserPermissions(testUserId);
      if (!userPermissions.permissions || userPermissions.permissions.length === 0) {
        throw new Error('获取用户权限信息失败');
      }

      return {
        testName: '权限控制',
        success: true,
        duration: Date.now() - startTime,
        details: {
          basicPermissionAllowed: basicPermission.allowed,
          advancedPermissionDenied: !advancedPermission.allowed,
          userTier: userPermissions.tier,
          permissionCount: userPermissions.permissions.length,
        },
      };

    } catch (error) {
      return {
        testName: '权限控制',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 测试升级流程
   */
  private async testUpgradeFlow(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('⬆️ 测试升级流程...');

      const testUserId = 'test-user-e2e-005';

      // 1. 创建基础版订阅
      const basicSubscription = await subscriptionService.createSubscription({
        userId: testUserId,
        planId: 'plan-basic',
        paymentMethod: 'wechat_pay',
        billingCycle: 'monthly',
      });

      // 2. 升级到专业版
      const upgradeResult = await subscriptionService.upgradeSubscription(
        basicSubscription.subscription.id,
        'plan-pro',
      );

      if (!upgradeResult.subscription) {
        throw new Error('订阅升级失败');
      }

      // 3. 验证升级后的订阅
      const upgradedSubscription = await subscriptionService.getCurrentSubscription(testUserId);
      if (!upgradedSubscription || upgradedSubscription.tier !== 'pro') {
        throw new Error('升级后订阅验证失败');
      }

      // 4. 测试降级
      const downgradeResult = await subscriptionService.downgradeSubscription(
        upgradedSubscription.id,
        'plan-basic',
      );

      if (!downgradeResult) {
        throw new Error('订阅降级失败');
      }

      return {
        testName: '升级流程',
        success: true,
        duration: Date.now() - startTime,
        details: {
          originalTier: 'basic',
          upgradedTier: 'pro',
          downgradeScheduled: true,
        },
      };

    } catch (error) {
      return {
        testName: '升级流程',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 测试通知系统
   */
  private async testNotificationSystem(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('🔔 测试通知系统...');

      const testUserId = 'test-user-e2e-006';

      // 1. 发送测试通知
      const notification = await notificationService.sendNotification(
        testUserId,
        'quota_warning',
        {
          quotaType: 'create',
          usedQuota: 8,
          totalQuota: 10,
          usagePercentage: 80,
        },
      );

      if (!notification) {
        throw new Error('通知发送失败');
      }

      // 2. 获取用户通知
      const userNotifications = await notificationService.getUserNotifications(testUserId);
      if (userNotifications.notifications.length === 0) {
        throw new Error('获取用户通知失败');
      }

      // 3. 标记通知为已读
      const markReadResult = await notificationService.markNotificationAsRead(notification.id);
      if (!markReadResult) {
        throw new Error('标记通知已读失败');
      }

      // 4. 验证未读数量
      const updatedNotifications = await notificationService.getUserNotifications(testUserId);
      const unreadCount = updatedNotifications.notifications.filter(n => !n.readAt).length;

      return {
        testName: '通知系统',
        success: true,
        duration: Date.now() - startTime,
        details: {
          notificationId: notification.id,
          totalNotifications: updatedNotifications.total,
          unreadCount,
        },
      };

    } catch (error) {
      return {
        testName: '通知系统',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 测试错误处理
   */
  private async testErrorHandling(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('⚠️ 测试错误处理...');

      // 1. 测试支付错误处理
      const paymentError = new Error('模拟支付失败');
      const paymentErrorResponse = errorHandler.handleError(paymentError, {
        context: 'payment_test',
        userId: 'test-user-e2e-007',
      });

      if (paymentErrorResponse.status !== 500) {
        throw new Error('支付错误处理响应状态码错误');
      }

      // 2. 测试配额错误处理
      const quotaErrorResponse = errorHandler.handleQuotaError(
        'create',
        10,
        10,
        'test-user-e2e-007',
      );

      if (quotaErrorResponse.status !== 403) {
        throw new Error('配额错误处理响应状态码错误');
      }

      // 3. 获取错误统计
      const errorStats = errorHandler.getErrorStatistics();
      if (errorStats.totalErrors === 0) {
        throw new Error('错误统计记录失败');
      }

      return {
        testName: '错误处理',
        success: true,
        duration: Date.now() - startTime,
        details: {
          totalErrors: errorStats.totalErrors,
          errorTypes: Object.keys(errorStats.errorsByType).length,
        },
      };

    } catch (error) {
      return {
        testName: '错误处理',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 测试安全机制
   */
  private async testSecurityMechanisms(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      console.log('🔒 测试安全机制...');

      const testUserId = 'test-user-e2e-008';

      // 1. 测试数据签名
      const testData = { userId: testUserId, amount: 6900, timestamp: Date.now() };
      const signature = securityService.generateDataSignature(testData);
      const isSignatureValid = securityService.verifyDataSignature(testData, signature);

      if (!isSignatureValid) {
        throw new Error('数据签名验证失败');
      }

      // 2. 测试数据加密
      const sensitiveData = { cardNumber: '1234567890123456', cvv: '123' };
      const encrypted = securityService.encryptSensitiveData(sensitiveData);
      const decrypted = securityService.decryptSensitiveData(encrypted);

      if (!decrypted.success) {
        throw new Error('数据加密解密失败');
      }

      // 3. 测试访问令牌
      const token = securityService.generateAccessToken(
        testUserId,
        ['card:create:basic'],
        'basic',
      );

      const tokenVerification = securityService.verifyAccessToken(token);
      if (!tokenVerification.valid) {
        throw new Error('访问令牌验证失败');
      }

      // 4. 测试访问频率限制
      const rateLimitResult = securityService.checkRateLimit(testUserId);
      if (!rateLimitResult.allowed) {
        throw new Error('访问频率限制检查失败');
      }

      return {
        testName: '安全机制',
        success: true,
        duration: Date.now() - startTime,
        details: {
          signatureValid: isSignatureValid,
          encryptionWorking: decrypted.success,
          tokenValid: tokenVerification.valid,
          rateLimitAllowed: rateLimitResult.allowed,
        },
      };

    } catch (error) {
      return {
        testName: '安全机制',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 生成测试报告
   */
  generateTestReport(suiteResult: TestSuiteResult): string {
    const { suiteName, totalTests, passedTests, failedTests, duration, results } = suiteResult;

    let report = `
# ${suiteName} - 测试报告

## 测试概览
- 总测试数: ${totalTests}
- 通过测试: ${passedTests}
- 失败测试: ${failedTests}
- 成功率: ${Math.round((passedTests / totalTests) * 100)}%
- 总耗时: ${duration}ms

## 详细结果

`;

    results.forEach((result, index) => {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      report += `### ${index + 1}. ${result.testName} - ${status}
- 耗时: ${result.duration}ms
`;

      if (result.success && result.details) {
        report += `- 详情: ${JSON.stringify(result.details, null, 2)}
`;
      }

      if (!result.success && result.error) {
        report += `- 错误: ${result.error}
`;
      }

      report += '\n';
    });

    return report;
  }
}

// 导出单例实例
export const integrationTestService = IntegrationTestService.getInstance();
