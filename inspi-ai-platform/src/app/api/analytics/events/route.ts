/**
 * 用户行为分析API接口
 * 接收和处理用户行为事件数据
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/core/monitoring/logger';

interface UserEvent {
  eventType: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  properties: Record<string, any>;
  context: {
    page: string;
    userAgent: string;
    referrer: string;
    viewport: { width: number; height: number };
    device: 'desktop' | 'tablet' | 'mobile';
  };
}

interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  events: UserEvent[];
  duration: number;
  pageViews: number;
  isActive: boolean;
}

interface AnalyticsRequest {
  events: UserEvent[];
  session?: UserSession;
}

/**
 * 接收用户行为事件
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsRequest = await request.json();
    const { events, session } = body;

    // 验证请求数据
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 },
      );
    }

    // 处理事件数据
    const processedEvents = events.map(event => ({
      ...event,
      receivedAt: Date.now(),
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    }));

    // 记录事件到日志系统
    logger.info('Analytics events received', {
      eventsCount: events.length,
      sessionId: session?.sessionId,
      userId: session?.userId,
      events: processedEvents.map(e => ({
        eventType: e.eventType,
        timestamp: e.timestamp,
        page: e.context.page,
      })),
    }, ['analytics', 'events']);

    // 存储事件数据
    await storeEvents(processedEvents);

    // 更新会话信息
    if (session) {
      await updateSession(session);
    }

    // 处理实时分析
    await processRealTimeAnalytics(processedEvents);

    return NextResponse.json({
      success: true,
      processed: events.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to process analytics events', {
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
 * 获取分析数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const eventType = searchParams.get('eventType');
    const userId = searchParams.get('userId');

    const analytics = await getAnalyticsData({
      timeRange,
      eventType,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to get analytics data', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 存储事件数据
 */
async function storeEvents(events: any[]) {
  // 实现事件存储逻辑
  // 可以存储到数据库、数据仓库或发送到分析服务

  // 示例：简单的内存存储（生产环境应该使用持久化存储）
  if (typeof global !== 'undefined') {
    if (!(global as any).eventsStore) {
      (global as any).eventsStore = [];
    }
    (global as any).eventsStore.push(...events);

    // 保持存储大小在合理范围内
    if ((global as any).eventsStore.length > 50000) {
      (global as any).eventsStore = (global as any).eventsStore.slice(-25000);
    }
  }

  // 异步处理事件（例如发送到外部分析服务）
  processEventsAsync(events);
}

/**
 * 更新会话信息
 */
async function updateSession(session: UserSession) {
  // 实现会话存储和更新逻辑
  if (typeof global !== 'undefined') {
    if (!(global as any).sessionsStore) {
      (global as any).sessionsStore = new Map();
    }
    (global as any).sessionsStore.set(session.sessionId, {
      ...session,
      updatedAt: Date.now(),
    });
  }
}

/**
 * 处理实时分析
 */
async function processRealTimeAnalytics(events: any[]) {
  // 实时分析逻辑
  for (const event of events) {
    // 检查关键事件
    if (isKeyEvent(event)) {
      await handleKeyEvent(event);
    }

    // 更新实时指标
    await updateRealTimeMetrics(event);

    // 检查异常行为
    await detectAnomalies(event);
  }
}

/**
 * 检查是否为关键事件
 */
function isKeyEvent(event: any): boolean {
  const keyEvents = [
    'user_register',
    'user_login',
    'subscription_purchase',
    'work_publish',
    'payment_complete',
    'error_occurred',
  ];

  return keyEvents.includes(event.eventType) ||
         (event.eventType === 'conversion' && event.properties.conversionType);
}

/**
 * 处理关键事件
 */
async function handleKeyEvent(event: any) {
  logger.info('Key event detected', {
    eventType: event.eventType,
    userId: event.userId,
    sessionId: event.sessionId,
    properties: event.properties,
  }, ['analytics', 'key-event']);

  // 发送实时通知
  await sendRealTimeNotification(event);

  // 更新用户画像
  if (event.userId) {
    await updateUserProfile(event.userId, event);
  }
}

/**
 * 更新实时指标
 */
async function updateRealTimeMetrics(event: any) {
  if (typeof global !== 'undefined') {
    if (!(global as any).realTimeMetrics) {
      (global as any).realTimeMetrics = {
        activeUsers: new Set(),
        pageViews: 0,
        events: {},
        lastUpdate: Date.now(),
      };
    }

    const metrics = (global as any).realTimeMetrics;

    // 更新活跃用户
    if (event.userId) {
      metrics.activeUsers.add(event.userId);
    }

    // 更新页面浏览量
    if (event.eventType === 'page_view') {
      metrics.pageViews++;
    }

    // 更新事件计数
    if (!metrics.events[event.eventType]) {
      metrics.events[event.eventType] = 0;
    }
    metrics.events[event.eventType]++;

    metrics.lastUpdate = Date.now();

    // 定期清理过期数据
    const now = Date.now();
    if (Number(now - metrics.lastUpdate) > 60000) { // 1分钟
      metrics.activeUsers.clear();
      metrics.pageViews = 0;
      metrics.events = {};
    }
  }
}

/**
 * 检测异常行为
 */
async function detectAnomalies(event: any) {
  // 检测可疑行为模式
  const suspiciousPatterns = [
    // 短时间内大量请求
    { type: 'rapid_requests', threshold: 100, timeWindow: 60000 },
    // 异常的用户代理
    { type: 'suspicious_user_agent', pattern: /bot|crawler|spider/i },
    // 异常的页面访问模式
    { type: 'unusual_navigation', pattern: /admin|api|internal/i },
  ];

  for (const pattern of suspiciousPatterns) {
    if (await checkPattern(event, pattern)) {
      logger.warn('Suspicious behavior detected', {
        pattern: pattern.type,
        event: {
          eventType: event.eventType,
          userId: event.userId,
          sessionId: event.sessionId,
          context: event.context,
        },
      }, ['analytics', 'security', 'anomaly']);

      // 可以触发安全措施
      await handleSuspiciousBehavior(event, pattern);
    }
  }
}

/**
 * 检查行为模式
 */
async function checkPattern(event: any, pattern: any): Promise<boolean> {
  switch (pattern.type) {
    case 'rapid_requests':
      return await checkRapidRequests(event, pattern);
    case 'suspicious_user_agent':
      return pattern.pattern.test(event.userAgent || '');
    case 'unusual_navigation':
      return pattern.pattern.test(event.context.page || '');
    default:
      return false;
  }
}

/**
 * 检查快速请求
 */
async function checkRapidRequests(event: any, pattern: any): Promise<boolean> {
  if (typeof global !== 'undefined') {
    if (!(global as any).requestCounts) {
      (global as any).requestCounts = new Map();
    }

    const key = event.sessionId || event.ip || 'unknown';
    const now = Date.now();
    const requests = (global as any).requestCounts.get(key) || [];

    // 清理过期请求
    const validRequests = requests.filter((time: number) =>
      now - time < pattern.timeWindow,
    );

    validRequests.push(now);
    (global as any).requestCounts.set(key, validRequests);

    return validRequests.length > pattern.threshold;
  }

  return false;
}

/**
 * 处理可疑行为
 */
async function handleSuspiciousBehavior(event: any, pattern: any) {
  // 实现安全措施
  // 例如：限流、封禁、通知管理员等
  console.warn(`Suspicious behavior: ${pattern.type}`, event);
}

/**
 * 发送实时通知
 */
async function sendRealTimeNotification(event: any) {
  // 实现实时通知逻辑
  // 例如：WebSocket推送、邮件通知等
  console.log('Real-time notification:', event.eventType);
}

/**
 * 更新用户画像
 */
async function updateUserProfile(userId: string, event: any) {
  // 实现用户画像更新逻辑
  if (typeof global !== 'undefined') {
    if (!(global as any).userProfiles) {
      (global as any).userProfiles = new Map();
    }

    const profile = (global as any).userProfiles.get(userId) || {
      userId,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      eventCounts: {},
      preferences: {},
      segments: [],
    };

    profile.lastSeen = Date.now();
    profile.eventCounts[event.eventType] = (profile.eventCounts[event.eventType] || 0) + 1;

    // 更新用户偏好
    if (event.properties) {
      updateUserPreferences(profile, event.properties);
    }

    // 更新用户分群
    updateUserSegments(profile);

    (global as any).userProfiles.set(userId, profile);
  }
}

/**
 * 更新用户偏好
 */
function updateUserPreferences(profile: any, properties: any) {
  // 基于事件属性更新用户偏好
  if (properties.category) {
    profile.preferences.categories = profile.preferences.categories || {};
    profile.preferences.categories[properties.category] =
      (profile.preferences.categories[properties.category] || 0) + 1;
  }

  if (properties.device) {
    profile.preferences.device = properties.device;
  }
}

/**
 * 更新用户分群
 */
function updateUserSegments(profile: any) {
  const segments = [];

  // 基于活跃度分群
  const totalEvents = Object.values(profile.eventCounts).reduce((sum: number, count: any) => sum + count, 0);
  if (Number(totalEvents) > 100) {
    segments.push('high_activity');
  } else if (Number(totalEvents) > 20) {
    segments.push('medium_activity');
  } else {
    segments.push('low_activity');
  }

  // 基于行为分群
  if (profile.eventCounts.subscription_purchase) {
    segments.push('paying_user');
  }

  if (Number(profile.eventCounts.work_publish) > 5) {
    segments.push('content_creator');
  }

  profile.segments = segments;
}

/**
 * 异步处理事件
 */
async function processEventsAsync(events: any[]) {
  // 这里可以实现异步处理逻辑
  // 例如：发送到外部分析服务、数据仓库等
  setTimeout(() => {
    // 模拟异步处理
    console.log(`Processed ${events.length} events asynchronously`);
  }, 1000);
}

/**
 * 获取分析数据
 */
async function getAnalyticsData(params: {
  timeRange: string;
  eventType?: string | null;
  userId?: string | null;
}) {
  const { timeRange, eventType, userId } = params;

  // 从存储中获取数据
  let events: any[] = [];
  if (typeof global !== 'undefined' && (global as any).eventsStore) {
    const now = Date.now();
    const timeRangeMs = parseTimeRange(timeRange);
    const startTime = now - timeRangeMs;

    events = (global as any).eventsStore.filter((event: any) =>
      event.timestamp >= startTime &&
      (!eventType || event.eventType === eventType) &&
      (!userId || event.userId === userId),
    );
  }

  // 生成分析报告
  return {
    summary: generateSummary(events),
    eventCounts: generateEventCounts(events),
    userMetrics: generateUserMetrics(events),
    pageMetrics: generatePageMetrics(events),
    deviceMetrics: generateDeviceMetrics(events),
    timeRange,
    totalEvents: events.length,
  };
}

/**
 * 生成摘要
 */
function generateSummary(events: any[]) {
  const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
  const pageViews = events.filter(e => e.eventType === 'page_view').length;

  return {
    totalEvents: events.length,
    uniqueUsers,
    uniqueSessions,
    pageViews,
    avgEventsPerUser: uniqueUsers > 0 ? events.length / uniqueUsers : 0,
    avgEventsPerSession: uniqueSessions > 0 ? events.length / uniqueSessions : 0,
  };
}

/**
 * 生成事件计数
 */
function generateEventCounts(events: any[]) {
  const counts: Record<string, number> = {};
  events.forEach(event => {
    counts[event.eventType] = (counts[event.eventType] || 0) + 1;
  });

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20); // 返回前20个事件类型
}

/**
 * 生成用户指标
 */
function generateUserMetrics(events: any[]) {
  const userEvents: Record<string, any[]> = {};

  events.forEach(event => {
    if (event.userId) {
      if (!userEvents[event.userId]) {
        userEvents[event.userId] = [];
      }
      userEvents[event.userId].push(event);
    }
  });

  const userMetrics = Object.entries(userEvents).map(([userId, userEventList]) => ({
    userId,
    eventCount: userEventList.length,
    firstEvent: Math.min(...userEventList.map(e => e.timestamp)),
    lastEvent: Math.max(...userEventList.map(e => e.timestamp)),
    sessionCount: new Set(userEventList.map(e => e.sessionId)).size,
  }));

  return userMetrics.sort((a, b) => b.eventCount - a.eventCount).slice(0, 100);
}

/**
 * 生成页面指标
 */
function generatePageMetrics(events: any[]) {
  const pageViews: Record<string, number> = {};

  events
    .filter(e => e.eventType === 'page_view')
    .forEach(event => {
      const page = event.context?.page || 'unknown';
      pageViews[page] = (pageViews[page] || 0) + 1;
    });

  return Object.entries(pageViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);
}

/**
 * 生成设备指标
 */
function generateDeviceMetrics(events: any[]) {
  const devices: Record<string, number> = {};

  events.forEach(event => {
    const device = event.context?.device || 'unknown';
    devices[device] = (devices[device] || 0) + 1;
  });

  return Object.entries(devices);
}

/**
 * 解析时间范围
 */
function parseTimeRange(timeRange: string): number {
  const timeRangeMap: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  return timeRangeMap[timeRange] || timeRangeMap['24h'];
}

/**
 * 获取客户端IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}
