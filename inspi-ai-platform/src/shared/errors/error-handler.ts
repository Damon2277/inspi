/**
 * 错误处理服务
 * 统一处理系统错误、支付错误和业务异常
 */

import { NextResponse } from 'next/server';

import { notificationService } from '@/lib/notification/notification-service';
import { PaymentRecord, Subscription } from '@/shared/types/subscription';

/**
 * 错误类型
 */
export type ErrorType =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'PAYMENT_ERROR'
  | 'QUOTA_ERROR'
  | 'SUBSCRIPTION_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR';

/**
 * 错误严重级别
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly data?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType,
    code: string,
    statusCode: number = 500,
    severity: ErrorSeverity = 'medium',
    data?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.statusCode = statusCode;
    this.data = data;
    this.timestamp = new Date();

    // 确保堆栈跟踪正确
    Error.captureStackTrace(this, AppError);
  }
}

/**
 * 支付错误类
 */
export class PaymentError extends AppError {
  public readonly paymentId?: string;
  public readonly transactionId?: string;

  constructor(
    message: string,
    code: string,
    paymentId?: string,
    transactionId?: string,
    data?: Record<string, any>,
  ) {
    super(message, 'PAYMENT_ERROR', code, 400, 'high', data);
    this.paymentId = paymentId;
    this.transactionId = transactionId;
  }
}

/**
 * 配额错误类
 */
export class QuotaError extends AppError {
  public readonly quotaType: string;
  public readonly currentUsage: number;
  public readonly limit: number;

  constructor(
    message: string,
    quotaType: string,
    currentUsage: number,
    limit: number,
  ) {
    super(message, 'QUOTA_ERROR', 'QUOTA_EXCEEDED', 403, 'medium', {
      quotaType,
      currentUsage,
      limit,
    });
    this.quotaType = quotaType;
    this.currentUsage = currentUsage;
    this.limit = limit;
  }
}

/**
 * 订阅错误类
 */
export class SubscriptionError extends AppError {
  public readonly subscriptionId?: string;

  constructor(
    message: string,
    code: string,
    subscriptionId?: string,
    data?: Record<string, any>,
  ) {
    super(message, 'SUBSCRIPTION_ERROR', code, 400, 'medium', data);
    this.subscriptionId = subscriptionId;
  }
}

/**
 * 错误处理服务类
 */
export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private errorLog: Array<{
    error: AppError;
    context?: Record<string, any>;
    userId?: string;
  }> = [];

  private constructor() {}

  public static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * 处理错误并返回响应
   */
  handleError(error: unknown, context?: Record<string, any>): NextResponse {
    let appError: AppError;

    // 转换为应用错误
    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError(
        error.message,
        'INTERNAL_ERROR',
        'UNKNOWN_ERROR',
        500,
        'medium',
      );
    } else {
      appError = new AppError(
        '未知错误',
        'INTERNAL_ERROR',
        'UNKNOWN_ERROR',
        500,
        'medium',
      );
    }

    // 记录错误
    this.logError(appError, context);

    // 发送错误通知（如果是严重错误）
    if (appError.severity === 'high' || appError.severity === 'critical') {
      this.sendErrorNotification(appError, context);
    }

    // 返回错误响应
    return this.createErrorResponse(appError);
  }

  /**
   * 处理支付错误
   */
  async handlePaymentError(
    error: unknown,
    paymentRecord?: PaymentRecord,
    context?: Record<string, any>,
  ): Promise<NextResponse> {
    let paymentError: PaymentError;

    if (error instanceof PaymentError) {
      paymentError = error;
    } else if (error instanceof Error) {
      paymentError = new PaymentError(
        error.message,
        'PAYMENT_PROCESSING_ERROR',
        paymentRecord?.id,
        paymentRecord?.transactionId,
      );
    } else {
      paymentError = new PaymentError(
        '支付处理失败',
        'PAYMENT_UNKNOWN_ERROR',
        paymentRecord?.id,
      );
    }

    // 记录支付错误
    this.logError(paymentError, {
      ...context,
      paymentRecord: paymentRecord ? {
        id: paymentRecord.id,
        userId: paymentRecord.userId,
        amount: paymentRecord.amount,
        status: paymentRecord.status,
      } : undefined,
    });

    // 发送支付失败通知
    if (paymentRecord) {
      try {
        await notificationService.sendPaymentFailedNotification({
          ...paymentRecord,
          errorMessage: paymentError.message,
        });
      } catch (notificationError) {
        console.error('发送支付失败通知失败:', notificationError);
      }
    }

    // 实施支付错误恢复策略
    await this.implementPaymentRecovery(paymentError, paymentRecord);

    return this.createErrorResponse(paymentError);
  }

  /**
   * 处理配额错误
   */
  handleQuotaError(
    quotaType: string,
    currentUsage: number,
    limit: number,
    userId?: string,
  ): NextResponse {
    const quotaError = new QuotaError(
      `${this.getQuotaDisplayName(quotaType)}已达上限`,
      quotaType,
      currentUsage,
      limit,
    );

    // 记录配额错误
    this.logError(quotaError, { userId });

    // 发送配额超限通知
    if (userId) {
      notificationService.sendQuotaExceededNotification(
        userId,
        quotaType,
        currentUsage,
        limit,
      ).catch(error => {
        console.error('发送配额超限通知失败:', error);
      });
    }

    return this.createErrorResponse(quotaError);
  }

  /**
   * 处理订阅错误
   */
  async handleSubscriptionError(
    error: unknown,
    subscription?: Subscription,
    context?: Record<string, any>,
  ): Promise<NextResponse> {
    let subscriptionError: SubscriptionError;

    if (error instanceof SubscriptionError) {
      subscriptionError = error;
    } else if (error instanceof Error) {
      subscriptionError = new SubscriptionError(
        error.message,
        'SUBSCRIPTION_PROCESSING_ERROR',
        subscription?.id,
      );
    } else {
      subscriptionError = new SubscriptionError(
        '订阅处理失败',
        'SUBSCRIPTION_UNKNOWN_ERROR',
        subscription?.id,
      );
    }

    // 记录订阅错误
    this.logError(subscriptionError, {
      ...context,
      subscription: subscription ? {
        id: subscription.id,
        userId: subscription.userId,
        status: subscription.status,
        tier: subscription.plan,
      } : undefined,
    });

    // 实施订阅错误恢复策略
    await this.implementSubscriptionRecovery(subscriptionError, subscription);

    return this.createErrorResponse(subscriptionError);
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(timeRange?: { start: Date; end: Date }): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: Array<{
      error: AppError;
      context?: Record<string, any>;
      userId?: string;
    }>;
  } {
    let filteredErrors = this.errorLog;

    // 时间范围过滤
    if (timeRange) {
      filteredErrors = this.errorLog.filter(log =>
        log.error.timestamp >= timeRange.start &&
        log.error.timestamp <= timeRange.end,
      );
    }

    // 统计错误类型
    const errorsByType = filteredErrors.reduce((acc, log) => {
      acc[log.error.type] = (acc[log.error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    // 统计错误严重级别
    const errorsBySeverity = filteredErrors.reduce((acc, log) => {
      acc[log.error.severity] = (acc[log.error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: filteredErrors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: filteredErrors.slice(-10), // 最近10个错误
    };
  }

  // 私有方法

  /**
   * 记录错误
   */
  private logError(error: AppError, context?: Record<string, any>): void {
    const logEntry = {
      error,
      context,
      userId: context?.userId,
    };

    this.errorLog.push(logEntry);

    // 控制台输出
    console.error('应用错误:', {
      type: error.type,
      code: error.code,
      message: error.message,
      severity: error.severity,
      timestamp: error.timestamp,
      context,
    });

    // 保持错误日志大小
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500);
    }
  }

  /**
   * 发送错误通知
   */
  private async sendErrorNotification(error: AppError, context?: Record<string, any>): Promise<void> {
    try {
      // 发送给管理员的错误通知
      console.log('发送错误通知给管理员:', {
        type: error.type,
        severity: error.severity,
        message: error.message,
        context,
      });

      // 在实际应用中，这里应该发送邮件或其他通知给管理员
    } catch (notificationError) {
      console.error('发送错误通知失败:', notificationError);
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(error: AppError): NextResponse {
    const response = {
      success: false,
      error: error.message,
      code: error.code,
      type: error.type,
      timestamp: error.timestamp.toISOString(),
      ...(error.data && { data: error.data }),
    };

    return NextResponse.json(response, { status: error.statusCode });
  }

  /**
   * 实施支付错误恢复策略
   */
  private async implementPaymentRecovery(
    error: PaymentError,
    paymentRecord?: PaymentRecord,
  ): Promise<void> {
    try {
      if (!paymentRecord) return;

      // 根据错误类型实施不同的恢复策略
      switch (error.code) {
        case 'PAYMENT_TIMEOUT':
          // 支付超时，安排重试
          console.log('安排支付重试:', paymentRecord.id);
          break;

        case 'PAYMENT_NETWORK_ERROR':
          // 网络错误，短时间后重试
          console.log('网络错误，稍后重试:', paymentRecord.id);
          break;

        case 'PAYMENT_INSUFFICIENT_FUNDS':
          // 余额不足，通知用户
          console.log('余额不足，通知用户:', paymentRecord.userId);
          break;

        default:
          console.log('未知支付错误，记录日志:', error.code);
      }

    } catch (recoveryError) {
      console.error('支付错误恢复失败:', recoveryError);
    }
  }

  /**
   * 实施订阅错误恢复策略
   */
  private async implementSubscriptionRecovery(
    error: SubscriptionError,
    subscription?: Subscription,
  ): Promise<void> {
    try {
      if (!subscription) return;

      // 根据错误类型实施不同的恢复策略
      switch (error.code) {
        case 'SUBSCRIPTION_SYNC_ERROR':
          // 订阅同步错误，重新同步
          console.log('重新同步订阅状态:', subscription.id);
          break;

        case 'SUBSCRIPTION_QUOTA_INCONSISTENCY':
          // 配额不一致，重新计算
          console.log('重新计算配额:', subscription.userId);
          break;

        default:
          console.log('未知订阅错误，记录日志:', error.code);
      }

    } catch (recoveryError) {
      console.error('订阅错误恢复失败:', recoveryError);
    }
  }

  /**
   * 获取配额显示名称
   */
  private getQuotaDisplayName(quotaType: string): string {
    const displayNames = {
      create: '每日创建配额',
      reuse: '每日复用配额',
      export: '每日导出配额',
      graph_nodes: '知识图谱节点配额',
    };

    return displayNames[quotaType as keyof typeof displayNames] || quotaType;
  }
}

// 导出单例实例
export const errorHandler = ErrorHandlerService.getInstance();
