/**
 * Prometheus指标API
 * 提供应用性能指标供Prometheus收集
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/shared/utils/logger';

interface Metric {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  help: string
  value: number | string
  labels?: Record<string, string>
}

export async function GET(request: NextRequest) {
  try {
    const metrics = await collectMetrics();
    const prometheusFormat = formatMetricsForPrometheus(metrics);

    return new Response(prometheusFormat, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });

  } catch (error) {
    logger.error('Metrics collection failed', { error });

    return NextResponse.json({
      error: 'Metrics collection failed',
    }, { status: 500 });
  }
}

/**
 * 收集应用指标
 */
async function collectMetrics(): Promise<Metric[]> {
  const metrics: Metric[] = [];

  // 系统指标
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  // 内存指标
  metrics.push({
    name: 'nodejs_memory_heap_used_bytes',
    type: 'gauge',
    help: 'Process heap memory used in bytes',
    value: memoryUsage.heapUsed,
  });

  metrics.push({
    name: 'nodejs_memory_heap_total_bytes',
    type: 'gauge',
    help: 'Process heap memory total in bytes',
    value: memoryUsage.heapTotal,
  });

  metrics.push({
    name: 'nodejs_memory_rss_bytes',
    type: 'gauge',
    help: 'Process resident memory in bytes',
    value: memoryUsage.rss,
  });

  metrics.push({
    name: 'nodejs_memory_external_bytes',
    type: 'gauge',
    help: 'Process external memory in bytes',
    value: memoryUsage.external,
  });

  // 运行时间指标
  metrics.push({
    name: 'nodejs_process_uptime_seconds',
    type: 'gauge',
    help: 'Process uptime in seconds',
    value: uptime,
  });

  // CPU使用率指标
  const cpuUsage = await getCPUUsage();
  metrics.push({
    name: 'nodejs_process_cpu_usage_percent',
    type: 'gauge',
    help: 'Process CPU usage percentage',
    value: cpuUsage,
  });

  // 事件循环延迟指标
  const eventLoopDelay = await measureEventLoopDelay();
  metrics.push({
    name: 'nodejs_eventloop_delay_milliseconds',
    type: 'gauge',
    help: 'Event loop delay in milliseconds',
    value: eventLoopDelay,
  });

  // 垃圾回收指标（如果可用）
  if (global.gc) {
    const gcStats = getGCStats();
    Object.entries(gcStats).forEach(([key, value]) => {
      metrics.push({
        name: `nodejs_gc_${key}_total`,
        type: 'counter',
        help: `Garbage collection ${key} total`,
        value: value,
      });
    });
  }

  // HTTP请求指标（模拟数据，实际应该从请求中间件收集）
  metrics.push({
    name: 'http_requests_total',
    type: 'counter',
    help: 'Total number of HTTP requests',
    value: getHttpRequestsTotal(),
    labels: { method: 'GET', status: '200' },
  });

  metrics.push({
    name: 'http_request_duration_seconds',
    type: 'histogram',
    help: 'HTTP request duration in seconds',
    value: getHttpRequestDuration(),
  });

  // 数据库连接指标（模拟数据）
  metrics.push({
    name: 'database_connections_active',
    type: 'gauge',
    help: 'Number of active database connections',
    value: getDatabaseConnectionsActive(),
  });

  metrics.push({
    name: 'database_connections_idle',
    type: 'gauge',
    help: 'Number of idle database connections',
    value: getDatabaseConnectionsIdle(),
  });

  // Redis连接指标（模拟数据）
  metrics.push({
    name: 'redis_connections_active',
    type: 'gauge',
    help: 'Number of active Redis connections',
    value: getRedisConnectionsActive(),
  });

  // 缓存指标（模拟数据）
  const cacheStats = getCacheStats();
  metrics.push({
    name: 'cache_hits_total',
    type: 'counter',
    help: 'Total number of cache hits',
    value: cacheStats.hits,
  });

  metrics.push({
    name: 'cache_misses_total',
    type: 'counter',
    help: 'Total number of cache misses',
    value: cacheStats.misses,
  });

  metrics.push({
    name: 'cache_hit_ratio',
    type: 'gauge',
    help: 'Cache hit ratio',
    value: cacheStats.hitRatio,
  });

  // 邀请系统业务指标（模拟数据）
  metrics.push({
    name: 'invitation_codes_generated_total',
    type: 'counter',
    help: 'Total number of invitation codes generated',
    value: getInvitationCodesGenerated(),
  });

  metrics.push({
    name: 'invitation_registrations_total',
    type: 'counter',
    help: 'Total number of invitation registrations',
    value: getInvitationRegistrations(),
  });

  metrics.push({
    name: 'rewards_distributed_total',
    type: 'counter',
    help: 'Total number of rewards distributed',
    value: getRewardsDistributed(),
  });

  return metrics;
}

/**
 * 将指标格式化为Prometheus格式
 */
function formatMetricsForPrometheus(metrics: Metric[]): string {
  const lines: string[] = [];

  for (const metric of metrics) {
    // 添加HELP注释
    lines.push(`# HELP ${metric.name} ${metric.help}`);

    // 添加TYPE注释
    lines.push(`# TYPE ${metric.name} ${metric.type}`);

    // 添加指标值
    if (metric.labels && Object.keys(metric.labels).length > 0) {
      const labelString = Object.entries(metric.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      lines.push(`${metric.name}{${labelString}} ${metric.value}`);
    } else {
      lines.push(`${metric.name} ${metric.value}`);
    }

    lines.push(''); // 空行分隔
  }

  return lines.join('\n');
}

/**
 * 获取CPU使用率
 */
async function getCPUUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    const startTime = Date.now();

    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const endTime = Date.now();
      const totalTime = (endTime - startTime) * 1000;
      const cpuPercent = ((endUsage.user + endUsage.system) / totalTime) * 100;
      resolve(Math.min(cpuPercent, 100));
    }, 100);
  });
}

/**
 * 测量事件循环延迟
 */
async function measureEventLoopDelay(): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now();
    setImmediate(() => {
      const delay = Date.now() - start;
      resolve(delay);
    });
  });
}

/**
 * 获取垃圾回收统计（模拟数据）
 */
function getGCStats(): Record<string, number> {
  return {
    collections: Math.floor(Math.random() * 100),
    duration: Math.floor(Math.random() * 50),
    freed: Math.floor(Math.random() * 1024 * 1024),
  };
}

/**
 * 获取HTTP请求总数（模拟数据）
 */
function getHttpRequestsTotal(): number {
  return Math.floor(Math.random() * 10000) + 1000;
}

/**
 * 获取HTTP请求持续时间（模拟数据）
 */
function getHttpRequestDuration(): number {
  return Math.random() * 2 + 0.1; // 0.1-2.1秒
}

/**
 * 获取活跃数据库连接数（模拟数据）
 */
function getDatabaseConnectionsActive(): number {
  return Math.floor(Math.random() * 20) + 5;
}

/**
 * 获取空闲数据库连接数（模拟数据）
 */
function getDatabaseConnectionsIdle(): number {
  return Math.floor(Math.random() * 30) + 10;
}

/**
 * 获取活跃Redis连接数（模拟数据）
 */
function getRedisConnectionsActive(): number {
  return Math.floor(Math.random() * 10) + 2;
}

/**
 * 获取缓存统计（模拟数据）
 */
function getCacheStats(): { hits: number; misses: number; hitRatio: number } {
  const hits = Math.floor(Math.random() * 1000) + 500;
  const misses = Math.floor(Math.random() * 200) + 50;
  const hitRatio = hits / (hits + misses);

  return { hits, misses, hitRatio };
}

/**
 * 获取生成的邀请码数量（模拟数据）
 */
function getInvitationCodesGenerated(): number {
  return Math.floor(Math.random() * 5000) + 1000;
}

/**
 * 获取邀请注册数量（模拟数据）
 */
function getInvitationRegistrations(): number {
  return Math.floor(Math.random() * 2000) + 500;
}

/**
 * 获取分发的奖励数量（模拟数据）
 */
function getRewardsDistributed(): number {
  return Math.floor(Math.random() * 1500) + 300;
}
