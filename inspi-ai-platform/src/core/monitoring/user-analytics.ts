
export interface UserEvent {
  userId?: string;
  eventType: string;
  timestamp: number;
  properties?: Record<string, any>;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  events: UserEvent[];
}

export interface FunnelStep {
  name: string;
  count: number;
  conversionRate: number;
}

export interface Funnel {
  name: string;
  steps: FunnelStep[];
  totalConversion: number;
}


/**
 * 用户行为分析系统
 * 追踪和分析用户行为数据
 */

interface TrackedEvent {
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

interface TrackedSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  events: TrackedEvent[];
  duration: number;
  pageViews: number;
  isActive: boolean;
}

interface TrackedFunnelStep {
  name: string;
  condition: (event: TrackedEvent) => boolean;
  required: boolean;
}

interface TrackedFunnel {
  name: string;
  steps: TrackedFunnelStep[];
}

/**
 * 用户分析管理器
 */
export class UserAnalytics {
  private static instance: UserAnalytics;
  private events: TrackedEvent[] = [];
  private currentSession: TrackedSession | null = null;
  private funnels: Map<string, TrackedFunnel> = new Map();
  private isEnabled = true;
  private batchSize = 10;
  private flushInterval = 30000; // 30秒
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeSession();
    this.setupEventListeners();
    this.startPeriodicFlush();
    this.setupDefaultFunnels();
  }

  static getInstance(): UserAnalytics {
    if (!UserAnalytics.instance) {
      UserAnalytics.instance = new UserAnalytics();
    }
    return UserAnalytics.instance;
  }

  /**
   * 初始化用户会话
   */
  private initializeSession() {
    if (typeof window === 'undefined') return;

    const sessionId = this.getOrCreateSessionId();
    const userId = this.getUserId();

    this.currentSession = {
      sessionId,
      userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      events: [],
      duration: 0,
      pageViews: 0,
      isActive: true,
    };

    // 记录会话开始事件
    this.track('session_start', {
      sessionId,
      userId,
      timestamp: Date.now(),
    });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // 页面浏览事件
    this.track('page_view', {
      page: window.location.pathname,
      title: document.title,
      referrer: document.referrer,
    });

    // 点击事件
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.track('click', {
        element: target.tagName.toLowerCase(),
        id: target.id,
        className: target.className,
        text: target.textContent?.slice(0, 100),
        x: event.clientX,
        y: event.clientY,
      });
    });

    // 滚动事件（节流）
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.track('scroll', {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          scrollPercentage: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100),
        });
      }, 1000);
    });

    // 表单提交事件
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.track('form_submit', {
        formId: form.id,
        formAction: form.action,
        formMethod: form.method,
        fieldCount: form.elements.length,
      });
    });

    // 输入事件（节流）
    let inputTimeout: NodeJS.Timeout;
    document.addEventListener('input', (event) => {
      clearTimeout(inputTimeout);
      inputTimeout = setTimeout(() => {
        const target = event.target as HTMLInputElement;
        this.track('input', {
          inputType: target.type,
          inputId: target.id,
          inputName: target.name,
          valueLength: target.value.length,
        });
      }, 2000);
    });

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      this.track('visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });

      if (this.currentSession) {
        this.currentSession.isActive = !document.hidden;
        this.currentSession.lastActivity = Date.now();
      }
    });

    // 页面卸载
    window.addEventListener('beforeunload', () => {
      this.track('page_unload', {
        timeOnPage: Date.now() - (this.currentSession?.startTime || Date.now()),
      });
      this.flushEvents();
    });

    // 错误事件
    window.addEventListener('error', (event) => {
      this.track('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });
  }

  /**
   * 追踪用户事件
   */
  track(eventType: string, properties: Record<string, any> = {}, userId?: string) {
    if (!this.isEnabled) return;

    const event: TrackedEvent = {
      eventType,
      userId: userId || this.getUserId(),
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
      properties,
      context: this.getContext(),
    };

    this.events.push(event);

    // 更新当前会话
    if (this.currentSession) {
      this.currentSession.events.push(event);
      this.currentSession.lastActivity = Date.now();
      this.currentSession.duration = Date.now() - this.currentSession.startTime;

      if (eventType === 'page_view') {
        this.currentSession.pageViews++;
      }
    }

    // 检查漏斗转化
    this.checkFunnelConversion(event);

    // 批量发送事件
    if (this.events.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics_user_id', userId);
    }

    if (this.currentSession) {
      this.currentSession.userId = userId;
    }

    this.track('user_identify', { userId });
  }

  /**
   * 设置用户属性
   */
  setUserProperties(properties: Record<string, any>) {
    this.track('user_properties_update', properties);
  }

  /**
   * 追踪页面浏览
   */
  trackPageView(page?: string, title?: string) {
    this.track('page_view', {
      page: page || (typeof window !== 'undefined' ? window.location.pathname : ''),
      title: title || (typeof document !== 'undefined' ? document.title : ''),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });
  }

  /**
   * 追踪转化事件
   */
  trackConversion(conversionType: string, value?: number, currency?: string) {
    this.track('conversion', {
      conversionType,
      value,
      currency: currency || 'CNY',
    });
  }

  /**
   * 追踪业务事件
   */
  trackBusinessEvent(eventName: string, properties: Record<string, any> = {}) {
    this.track('business_event', {
      eventName,
      ...properties,
    });
  }

  /**
   * 定义转化漏斗
   */
  defineFunnel(name: string, steps: TrackedFunnelStep[]) {
    this.funnels.set(name, { name, steps });
  }

  /**
   * 设置默认漏斗
   */
  private setupDefaultFunnels() {
    // 用户注册漏斗
    this.defineFunnel('user_registration', [
      {
        name: 'visit_signup_page',
        condition: (event) => event.eventType === 'page_view' && event.properties.page?.includes('/register'),
        required: true,
      },
      {
        name: 'start_registration',
        condition: (event) => event.eventType === 'click' && event.properties.id?.includes('register'),
        required: true,
      },
      {
        name: 'complete_registration',
        condition: (event) => event.eventType === 'form_submit' && event.properties.formAction?.includes('/register'),
        required: true,
      },
    ]);

    // 作品创建漏斗
    this.defineFunnel('work_creation', [
      {
        name: 'visit_create_page',
        condition: (event) => event.eventType === 'page_view' && event.properties.page?.includes('/create'),
        required: true,
      },
      {
        name: 'start_editing',
        condition: (event) => event.eventType === 'input' && event.properties.inputId?.includes('work'),
        required: true,
      },
      {
        name: 'publish_work',
        condition: (event) => event.eventType === 'click' && event.properties.text?.includes('发布'),
        required: true,
      },
    ]);

    // 订阅转化漏斗
    this.defineFunnel('subscription_conversion', [
      {
        name: 'view_pricing',
        condition: (event) => event.eventType === 'page_view' && event.properties.page?.includes('/pricing'),
        required: true,
      },
      {
        name: 'select_plan',
        condition: (event) => event.eventType === 'click' && event.properties.className?.includes('plan'),
        required: true,
      },
      {
        name: 'complete_payment',
        condition: (event) => event.eventType === 'conversion' && event.properties.conversionType === 'subscription',
        required: true,
      },
    ]);
  }

  /**
   * 检查漏斗转化
   */
  private checkFunnelConversion(event: TrackedEvent) {
    this.funnels.forEach((funnel) => {
      const userEvents = this.currentSession?.events || [];
      const completedSteps: string[] = [];

      funnel.steps.forEach((step) => {
        const stepCompleted = userEvents.some((userEvent) => step.condition(userEvent));
        if (stepCompleted) {
          completedSteps.push(step.name);
        }
      });

      // 如果完成了所有步骤，记录转化事件
      if (completedSteps.length === funnel.steps.length) {
        this.track('funnel_conversion', {
          funnelName: funnel.name,
          completedSteps,
          conversionTime: Date.now() - (this.currentSession?.startTime || Date.now()),
        });
      }
    });
  }

  /**
   * 获取用户行为报告
   */
  getAnalyticsReport() {
    return {
      session: this.currentSession,
      recentEvents: this.events.slice(-50),
      eventSummary: this.generateEventSummary(),
      funnelAnalysis: this.generateFunnelAnalysis(),
    };
  }

  /**
   * 生成事件摘要
   */
  private generateEventSummary() {
    const eventCounts: Record<string, number> = {};
    const recentEvents = this.events.slice(-100);

    recentEvents.forEach((event) => {
      eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
    });

    return {
      totalEvents: recentEvents.length,
      eventTypes: eventCounts,
      sessionDuration: this.currentSession?.duration || 0,
      pageViews: this.currentSession?.pageViews || 0,
    };
  }

  /**
   * 生成漏斗分析
   */
  private generateFunnelAnalysis() {
    const analysis: Record<string, any> = {};

    this.funnels.forEach((funnel, name) => {
      const userEvents = this.currentSession?.events || [];
      const stepCompletion: Record<string, boolean> = {};

      funnel.steps.forEach((step) => {
        stepCompletion[step.name] = userEvents.some((event) => step.condition(event));
      });

      analysis[name] = {
        steps: stepCompletion,
        completionRate: Object.values(stepCompletion).filter(Boolean).length / funnel.steps.length,
      };
    });

    return analysis;
  }

  /**
   * 刷新事件到后端
   */
  private async flushEvents() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: eventsToSend,
          session: this.currentSession,
        }),
      });
    } catch (error) {
      console.warn('Failed to send analytics events:', error);
      // 如果发送失败，将事件重新加入队列
      this.events.unshift(...eventsToSend);
    }
  }

  /**
   * 开始定期刷新
   */
  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * 获取或创建会话ID
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * 获取会话ID
   */
  private getSessionId(): string {
    return this.currentSession?.sessionId || this.getOrCreateSessionId();
  }

  /**
   * 获取用户ID
   */
  private getUserId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('analytics_user_id') || undefined;
  }

  /**
   * 获取上下文信息
   */
  private getContext() {
    if (typeof window === 'undefined') {
      return {
        page: '',
        userAgent: '',
        referrer: '',
        viewport: { width: 0, height: 0 },
        device: 'desktop' as const,
      };
    }

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const device = this.detectDevice(viewport.width);

    return {
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      viewport,
      device,
    };
  }

  /**
   * 检测设备类型
   */
  private detectDevice(width: number): 'desktop' | 'tablet' | 'mobile' {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * 启用/禁用分析
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushEvents();
    this.events = [];
    this.currentSession = null;
  }
}

// 导出单例实例
export const userAnalytics = UserAnalytics.getInstance();

// 自动初始化
if (typeof window !== 'undefined') {
  // 页面加载完成后开始追踪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      userAnalytics.trackPageView();
    });
  } else {
    userAnalytics.trackPageView();
  }
}
