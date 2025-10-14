/**
 * 性能指标API接口
 * 接收和处理前端发送的性能指标数据
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/core/monitoring/logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

interface MetricsRequest {
  metrics: PerformanceMetric[];
  metadata?: {
    userAgent?: string;
    url?: string;
    timestamp?: number;
  };
}

/**
 * 接收性能指标数据
 */
export async function POST(request: NextRequest) {
  try {
    const body: MetricsRequest = await request.json();
    const { metrics, metadata } = body;

    // 验证请求数据
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: 'Invalid metrics data' },
        { status: 400 },
      );
    }

    // 处理每个指标
    const processedMetrics = metrics.map(metric => ({
      ...metric,
      receivedAt: Date.now(),
      source: 'client',
      metadata,
    }));

    // 记录指标到日志系统
    logger.info('Performance metrics received', {
      metricsCount: metrics.length,
      metadata,
      metrics: processedMetrics,
    }, ['performance', 'metrics']);

    // 这里可以添加指标存储逻辑
    // 例如：存储到数据库、发送到监控服务等
    await storeMetrics(processedMetrics);

    // 检查指标阈值和告警
    await checkMetricThresholds(processedMetrics);

    return NextResponse.json({
      success: true,
      processed: metrics.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to process performance metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 获取性能指标统计
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h';
    const metricName = searchParams.get('metric');

    // 这里应该从数据库或缓存中获取指标数据
    const stats = await getMetricStats(timeRange, metricName);

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to get performance metrics stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 存储指标数据
 */
async function storeMetrics(metrics: any[]) {
  // 这里实现指标存储逻辑
  // 可以存储到数据库、时序数据库或发送到外部监控服务

  // 示例：简单的内存存储（生产环境应该使用持久化存储）
  if (typeof global !== 'undefined') {
    if (!(global as any).metricsStore) {
      (global as any).metricsStore = [];
    }
    (global as any).metricsStore.push(...metrics);

    // 保持存储大小在合理范围内
    if ((global as any).metricsStore.length > 10000) {
      (global as any).metricsStore = (global as any).metricsStore.slice(-5000);
    }
  }
}

/**
 * 检查指标阈值
 */
async function checkMetricThresholds(metrics: any[]) {
  const thresholds = {
    'page_load_time': 3000, // 3秒
    'api_call_duration': 5000, // 5秒
    'memory_used': 100 * 1024 * 1024, // 100MB
    'error_rate': 0.05, // 5%
  };

  for (const metric of metrics) {
    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      // 发送告警
      logger.warn('Performance threshold exceeded', {
        metric: metric.name,
        value: metric.value,
        threshold,
        tags: metric.tags,
      }, ['performance', 'alert']);

      // 这里可以发送通知到告警系统
      await sendPerformanceAlert(metric, threshold);
    }
  }
}

/**
 * 发送性能告警
 */
async function sendPerformanceAlert(metric: any, threshold: number) {
  // 实现告警发送逻辑
  // 例如：发送邮件、Slack通知、短信等
  console.warn(`Performance Alert: ${metric.name} = ${metric.value} > ${threshold}`);
}

/**
 * 获取指标统计
 */
async function getMetricStats(timeRange: string, metricName?: string | null) {
  // 这里应该从实际的存储中获取数据
  // 示例：从内存存储中获取

  const now = Date.now();
  const timeRangeMs = parseTimeRange(timeRange);
  const startTime = now - timeRangeMs;

  let metrics: any[] = [];
  if (typeof global !== 'undefined' && (global as any).metricsStore) {
    metrics = (global as any).metricsStore.filter((metric: any) =>
      metric.timestamp >= startTime &&
      (!metricName || metric.name === metricName),
    );
  }

  // 计算统计信息
  const stats = {
    totalMetrics: metrics.length,
    timeRange,
    startTime,
    endTime: now,
    metrics: calculateMetricStats(metrics),
  };

  return stats;
}

/**
 * 解析时间范围
 */
function parseTimeRange(timeRange: string): number {
  const timeRangeMap: Record<string, number> = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  return timeRangeMap[timeRange] || timeRangeMap['1h'];
}

/**
 * 计算指标统计
 */
function calculateMetricStats(metrics: any[]) {
  const statsByName: Record<string, any> = {};

  metrics.forEach(metric => {
    if (!statsByName[metric.name]) {
      statsByName[metric.name] = {
        name: metric.name,
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: [],
      };
    }

    const stats = statsByName[metric.name];
    stats.count++;
    stats.sum += metric.value;
    stats.min = Math.min(stats.min, metric.value);
    stats.max = Math.max(stats.max, metric.value);
    stats.values.push({
      value: metric.value,
      timestamp: metric.timestamp,
    });
  });

  // 计算平均值和百分位数
  Object.values(statsByName).forEach((stats: any) => {
    stats.avg = stats.sum / stats.count;

    const sortedValues = stats.values.map((v: any) => v.value).sort((a: number, b: number) => a - b);
    stats.p50 = getPercentile(sortedValues, 50);
    stats.p90 = getPercentile(sortedValues, 90);
    stats.p95 = getPercentile(sortedValues, 95);
    stats.p99 = getPercentile(sortedValues, 99);
  });

  return Object.values(statsByName);
}

/**
 * 计算百分位数
 */
function getPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}
