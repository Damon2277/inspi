/**
 * 缓存同步和更新机制
 */
import { EventEmitter } from 'events';
import { logger } from '@/lib/logging/logger';
import { CacheManager } from './manager';
import { CacheStrategyFactory } from './strategies';
import { CacheKeyPrefix, CacheEventType } from './config';

/**
 * 缓存同步事件类型
 */
export enum SyncEventType {
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  WORK_CREATED = 'work.created',
  WORK_UPDATED = 'work.updated',
  WORK_DELETED = 'work.deleted',
  WORK_PUBLISHED = 'work.published',
  CONTRIBUTION_UPDATED = 'contribution.updated',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  GRAPH_UPDATED = 'graph.updated'
}

/**
 * 同步事件数据
 */
export interface SyncEvent {
  type: SyncEventType;
  entityId: string;
  entityType: 'user' | 'work' | 'contribution' | 'subscription' | 'graph';
  data?: any;
  timestamp: number;
  source: string;
}

/**
 * 缓存同步管理器
 */
export class CacheSyncManager extends EventEmitter {
  private cacheManager: CacheManager;
  private syncQueue: SyncEvent[] = [];
  private processing = false;
  private batchSize = 10;
  private batchInterval = 5000; // 5秒
  private retryAttempts = 3;

  constructor(cacheManager: CacheManager) {
    super();
    this.cacheManager = cacheManager;
    this.startBatchProcessor();
  }

  /**
   * 添加同步事件
   */
  addSyncEvent(event: SyncEvent): void {
    this.syncQueue.push(event);
    logger.debug('Sync event added to queue', { 
      type: event.type, 
      entityId: event.entityId,
      queueSize: this.syncQueue.length 
    });

    // 如果队列过大，立即处理
    if (this.syncQueue.length >= this.batchSize * 2) {
      this.processSyncQueue();
    }
  }

  /**
   * 处理用户更新事件
   */
  async handleUserUpdated(userId: string, userData?: any): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.USER_UPDATED,
      entityId: userId,
      entityType: 'user',
      data: userData,
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理用户删除事件
   */
  async handleUserDeleted(userId: string): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.USER_DELETED,
      entityId: userId,
      entityType: 'user',
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理作品创建事件
   */
  async handleWorkCreated(workId: string, workData?: any): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.WORK_CREATED,
      entityId: workId,
      entityType: 'work',
      data: workData,
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理作品更新事件
   */
  async handleWorkUpdated(workId: string, workData?: any): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.WORK_UPDATED,
      entityId: workId,
      entityType: 'work',
      data: workData,
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理作品删除事件
   */
  async handleWorkDeleted(workId: string): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.WORK_DELETED,
      entityId: workId,
      entityType: 'work',
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理作品发布事件
   */
  async handleWorkPublished(workId: string, workData?: any): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.WORK_PUBLISHED,
      entityId: workId,
      entityType: 'work',
      data: workData,
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理贡献度更新事件
   */
  async handleContributionUpdated(userId: string, contributionData?: any): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.CONTRIBUTION_UPDATED,
      entityId: userId,
      entityType: 'contribution',
      data: contributionData,
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理订阅更新事件
   */
  async handleSubscriptionUpdated(userId: string, subscriptionData?: any): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.SUBSCRIPTION_UPDATED,
      entityId: userId,
      entityType: 'subscription',
      data: subscriptionData,
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 处理知识图谱更新事件
   */
  async handleGraphUpdated(graphId: string, graphData?: any): Promise<void> {
    const event: SyncEvent = {
      type: SyncEventType.GRAPH_UPDATED,
      entityId: graphId,
      entityType: 'graph',
      data: graphData,
      timestamp: Date.now(),
      source: 'cache-sync'
    };

    this.addSyncEvent(event);
  }

  /**
   * 启动批处理器
   */
  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.syncQueue.length > 0 && !this.processing) {
        this.processSyncQueue();
      }
    }, this.batchInterval);
  }

  /**
   * 处理同步队列
   */
  private async processSyncQueue(): Promise<void> {
    if (this.processing || this.syncQueue.length === 0) {
      return;
    }

    this.processing = true;
    const batch = this.syncQueue.splice(0, this.batchSize);

    logger.info('Processing sync batch', { batchSize: batch.length });

    try {
      // 按事件类型分组处理
      const eventGroups = this.groupEventsByType(batch);
      
      for (const [eventType, events] of eventGroups.entries()) {
        await this.processEventGroup(eventType, events);
      }

      logger.info('Sync batch processed successfully', { batchSize: batch.length });
    } catch (error) {
      logger.error('Failed to process sync batch', error instanceof Error ? error : new Error(String(error)), { batchSize: batch.length });
      
      // 重新加入队列进行重试
      this.requeueFailedEvents(batch);
    } finally {
      this.processing = false;
    }
  }

  /**
   * 按事件类型分组
   */
  private groupEventsByType(events: SyncEvent[]): Map<SyncEventType, SyncEvent[]> {
    const groups = new Map<SyncEventType, SyncEvent[]>();
    
    for (const event of events) {
      if (!groups.has(event.type)) {
        groups.set(event.type, []);
      }
      groups.get(event.type)!.push(event);
    }
    
    return groups;
  }

  /**
   * 处理事件组
   */
  private async processEventGroup(eventType: SyncEventType, events: SyncEvent[]): Promise<void> {
    switch (eventType) {
      case SyncEventType.USER_UPDATED:
        await this.processUserUpdatedEvents(events);
        break;
      case SyncEventType.USER_DELETED:
        await this.processUserDeletedEvents(events);
        break;
      case SyncEventType.WORK_CREATED:
      case SyncEventType.WORK_UPDATED:
        await this.processWorkUpdatedEvents(events);
        break;
      case SyncEventType.WORK_DELETED:
        await this.processWorkDeletedEvents(events);
        break;
      case SyncEventType.WORK_PUBLISHED:
        await this.processWorkPublishedEvents(events);
        break;
      case SyncEventType.CONTRIBUTION_UPDATED:
        await this.processContributionUpdatedEvents(events);
        break;
      case SyncEventType.SUBSCRIPTION_UPDATED:
        await this.processSubscriptionUpdatedEvents(events);
        break;
      case SyncEventType.GRAPH_UPDATED:
        await this.processGraphUpdatedEvents(events);
        break;
      default:
        logger.warn('Unknown sync event type', { eventType });
    }
  }

  /**
   * 处理用户更新事件
   */
  private async processUserUpdatedEvents(events: SyncEvent[]): Promise<void> {
    const userStrategy = CacheStrategyFactory.getStrategy('user', this.cacheManager);
    
    for (const event of events) {
      try {
        // 失效用户相关缓存
        await userStrategy.invalidate([event.entityId]);
        
        logger.debug('User cache invalidated', { userId: event.entityId });
      } catch (error) {
        logger.error('Failed to process user updated event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 处理用户删除事件
   */
  private async processUserDeletedEvents(events: SyncEvent[]): Promise<void> {
    const userStrategy = CacheStrategyFactory.getStrategy('user', this.cacheManager);
    
    for (const event of events) {
      try {
        // 删除用户相关缓存
        await userStrategy.invalidate([event.entityId]);
        
        logger.debug('User cache deleted', { userId: event.entityId });
      } catch (error) {
        logger.error('Failed to process user deleted event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 处理作品更新事件
   */
  private async processWorkUpdatedEvents(events: SyncEvent[]): Promise<void> {
    const workStrategy = CacheStrategyFactory.getStrategy('work', this.cacheManager);
    
    for (const event of events) {
      try {
        // 失效作品相关缓存
        await workStrategy.invalidate([event.entityId]);
        
        // 失效作品列表缓存
        await this.cacheManager.deletePattern('work:list:*');
        
        logger.debug('Work cache invalidated', { workId: event.entityId });
      } catch (error) {
        logger.error('Failed to process work updated event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 处理作品删除事件
   */
  private async processWorkDeletedEvents(events: SyncEvent[]): Promise<void> {
    const workStrategy = CacheStrategyFactory.getStrategy('work', this.cacheManager);
    
    for (const event of events) {
      try {
        // 删除作品相关缓存
        await workStrategy.invalidate([event.entityId]);
        
        // 失效作品列表缓存
        await this.cacheManager.deletePattern('work:list:*');
        
        logger.debug('Work cache deleted', { workId: event.entityId });
      } catch (error) {
        logger.error('Failed to process work deleted event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 处理作品发布事件
   */
  private async processWorkPublishedEvents(events: SyncEvent[]): Promise<void> {
    const workStrategy = CacheStrategyFactory.getStrategy('work', this.cacheManager);
    const rankingStrategy = CacheStrategyFactory.getStrategy('ranking', this.cacheManager);
    
    for (const event of events) {
      try {
        // 失效作品相关缓存
        await workStrategy.invalidate([event.entityId]);
        
        // 失效排行榜缓存
        await rankingStrategy.invalidate();
        
        // 失效作品列表缓存
        await this.cacheManager.deletePattern('work:list:*');
        await this.cacheManager.deletePattern('work:popular:*');
        await this.cacheManager.deletePattern('work:recent:*');
        
        logger.debug('Work published cache updated', { workId: event.entityId });
      } catch (error) {
        logger.error('Failed to process work published event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 处理贡献度更新事件
   */
  private async processContributionUpdatedEvents(events: SyncEvent[]): Promise<void> {
    const rankingStrategy = CacheStrategyFactory.getStrategy('ranking', this.cacheManager);
    const userStrategy = CacheStrategyFactory.getStrategy('user', this.cacheManager);
    
    for (const event of events) {
      try {
        // 失效排行榜缓存
        await rankingStrategy.invalidate();
        
        // 失效用户缓存
        await userStrategy.invalidate([event.entityId]);
        
        logger.debug('Contribution cache updated', { userId: event.entityId });
      } catch (error) {
        logger.error('Failed to process contribution updated event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 处理订阅更新事件
   */
  private async processSubscriptionUpdatedEvents(events: SyncEvent[]): Promise<void> {
    const userStrategy = CacheStrategyFactory.getStrategy('user', this.cacheManager);
    
    for (const event of events) {
      try {
        // 失效用户订阅缓存
        await userStrategy.invalidate([event.entityId]);
        
        logger.debug('Subscription cache updated', { userId: event.entityId });
      } catch (error) {
        logger.error('Failed to process subscription updated event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 处理知识图谱更新事件
   */
  private async processGraphUpdatedEvents(events: SyncEvent[]): Promise<void> {
    const graphStrategy = CacheStrategyFactory.getStrategy('knowledgeGraph', this.cacheManager);
    
    for (const event of events) {
      try {
        // 失效图谱相关缓存
        await graphStrategy.invalidate([event.entityId]);
        
        logger.debug('Graph cache updated', { graphId: event.entityId });
      } catch (error) {
        logger.error('Failed to process graph updated event', error instanceof Error ? error : new Error(String(error)), { event });
      }
    }
  }

  /**
   * 重新加入失败的事件
   */
  private requeueFailedEvents(events: SyncEvent[]): void {
    // 为失败的事件添加重试计数
    const retriedEvents = events.map(event => ({
      ...event,
      retryCount: (event as any).retryCount ? (event as any).retryCount + 1 : 1
    }));

    // 只重新加入未超过最大重试次数的事件
    const eventsToRetry = retriedEvents.filter(event => 
      (event as any).retryCount <= this.retryAttempts
    );

    if (eventsToRetry.length > 0) {
      this.syncQueue.unshift(...eventsToRetry);
      logger.info('Failed events requeued for retry', { 
        retryCount: eventsToRetry.length,
        discardedCount: events.length - eventsToRetry.length
      });
    }
  }

  /**
   * 获取同步队列状态
   */
  getQueueStatus(): {
    queueSize: number;
    processing: boolean;
    batchSize: number;
    batchInterval: number;
  } {
    return {
      queueSize: this.syncQueue.length,
      processing: this.processing,
      batchSize: this.batchSize,
      batchInterval: this.batchInterval
    };
  }

  /**
   * 清空同步队列
   */
  clearQueue(): void {
    this.syncQueue = [];
    logger.info('Sync queue cleared');
  }

  /**
   * 停止同步管理器
   */
  stop(): void {
    this.processing = false;
    this.removeAllListeners();
    logger.info('Cache sync manager stopped');
  }
}

/**
 * 缓存同步工具函数
 */
export class CacheSyncUtils {
  /**
   * 创建同步事件
   */
  static createSyncEvent(
    type: SyncEventType,
    entityId: string,
    entityType: SyncEvent['entityType'],
    data?: any
  ): SyncEvent {
    return {
      type,
      entityId,
      entityType,
      data,
      timestamp: Date.now(),
      source: 'cache-sync-utils'
    };
  }

  /**
   * 批量创建同步事件
   */
  static createBatchSyncEvents(
    type: SyncEventType,
    entityIds: string[],
    entityType: SyncEvent['entityType'],
    data?: any
  ): SyncEvent[] {
    return entityIds.map(entityId => 
      this.createSyncEvent(type, entityId, entityType, data)
    );
  }

  /**
   * 验证同步事件
   */
  static validateSyncEvent(event: SyncEvent): boolean {
    return !!(
      event.type &&
      event.entityId &&
      event.entityType &&
      event.timestamp &&
      event.source
    );
  }
}

export default CacheSyncManager;