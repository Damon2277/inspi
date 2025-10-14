/**
 * 数据库服务Mock实现
 * 提供数据库操作的模拟功能，支持内存存储和查询
 */

import { DatabaseUtils, CacheUtils, TransactionUtils } from '@/lib/db-utils';

import { BaseMockService } from './BaseMockService';

export interface MockDatabaseConfig {
  autoIncrement?: boolean;
  persistData?: boolean;
  simulateLatency?: boolean;
  defaultLatency?: number;
  failureRate?: number;
}

export interface MockCollection {
  name: string;
  documents: Map<string, any>;
  indexes: Map<string, Set<string>>;
  schema?: any;
}

export interface MockQuery {
  collection: string;
  filter?: any;
  sort?: any;
  limit?: number;
  skip?: number;
}

export interface MockTransaction {
  id: string;
  operations: MockOperation[];
  status: 'pending' | 'committed' | 'aborted';
  timestamp: Date;
}

export interface MockOperation {
  type: 'create' | 'update' | 'delete' | 'find';
  collection: string;
  data?: any;
  filter?: any;
  result?: any;
}

export class MockDatabaseService extends BaseMockService {
  private collections: Map<string, MockCollection> = new Map();
  private transactions: Map<string, MockTransaction> = new Map();
  private config: MockDatabaseConfig = {
    autoIncrement: true,
    persistData: false,
    simulateLatency: true,
    defaultLatency: 10,
    failureRate: 0,
  };
  private idCounters: Map<string, number> = new Map();

  constructor() {
    super('DatabaseService', '1.0.0');
    this.initializeCollections();
  }

  /**
   * 初始化集合
   */
  private initializeCollections(): void {
    const defaultCollections = ['users', 'works', 'knowledgeGraphs', 'sessions'];

    defaultCollections.forEach(name => {
      this.collections.set(name, {
        name,
        documents: new Map(),
        indexes: new Map(),
      });
      this.idCounters.set(name, 1);
    });
  }

  /**
   * 创建文档
   */
  async create<T>(collection: string, data: Partial<T>): Promise<T> {
    this.ensureActive();
    this.recordCall('create', [collection, data]);

    if (this.shouldSimulateFailure()) {
      throw new Error(`Mock database create failed for collection: ${collection}`);
    }

    await this.simulateLatency();

    const coll = this.getOrCreateCollection(collection);
    const id = this.generateId(collection);

    const document = {
      _id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as T;

    coll.documents.set(id, document);
    this.updateIndexes(collection, id, document);

    return document;
  }

  /**
   * 查找文档
   */
  async find<T>(collection: string, filter: any = {}, options: any = {}): Promise<T[]> {
    this.ensureActive();
    this.recordCall('find', [collection, filter, options]);

    if (this.shouldSimulateFailure()) {
      throw new Error(`Mock database find failed for collection: ${collection}`);
    }

    await this.simulateLatency();

    const coll = this.getOrCreateCollection(collection);
    let documents = Array.from(coll.documents.values());

    // 应用过滤器
    if (Object.keys(filter).length > 0) {
      documents = documents.filter(doc => this.matchesFilter(doc, filter));
    }

    // 应用排序
    if (options.sort) {
      documents = this.applySorting(documents, options.sort);
    }

    // 应用分页
    if (options.skip) {
      documents = documents.slice(options.skip);
    }
    if (options.limit) {
      documents = documents.slice(0, options.limit);
    }

    return documents as T[];
  }

  /**
   * 查找单个文档
   */
  async findOne<T>(collection: string, filter: any = {}): Promise<T | null> {
    const results = await this.find<T>(collection, filter, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 根据ID查找文档
   */
  async findById<T>(collection: string, id: string): Promise<T | null> {
    this.ensureActive();
    this.recordCall('findById', [collection, id]);

    if (this.shouldSimulateFailure()) {
      throw new Error(`Mock database findById failed for collection: ${collection}`);
    }

    await this.simulateLatency();

    const coll = this.getOrCreateCollection(collection);
    const document = coll.documents.get(id);

    return document ? (document as T) : null;
  }

  /**
   * 更新文档
   */
  async update<T>(collection: string, filter: any, update: any, options: any = {}): Promise<T[]> {
    this.ensureActive();
    this.recordCall('update', [collection, filter, update, options]);

    if (this.shouldSimulateFailure()) {
      throw new Error(`Mock database update failed for collection: ${collection}`);
    }

    await this.simulateLatency();

    const documents = await this.find<T>(collection, filter);
    const updatedDocuments: T[] = [];

    for (const doc of documents) {
      const updatedDoc = {
        ...doc,
        ...update,
        updatedAt: new Date(),
      } as T;

      const coll = this.getOrCreateCollection(collection);
      const id = (doc as any)._id;
      coll.documents.set(id, updatedDoc);
      this.updateIndexes(collection, id, updatedDoc);

      updatedDocuments.push(updatedDoc);

      if (!options.multi) {
        break; // 只更新第一个匹配的文档
      }
    }

    return updatedDocuments;
  }

  /**
   * 根据ID更新文档
   */
  async updateById<T>(collection: string, id: string, update: any): Promise<T | null> {
    const results = await this.update<T>(collection, { _id: id }, update);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 删除文档
   */
  async delete(collection: string, filter: any = {}, options: any = {}): Promise<number> {
    this.ensureActive();
    this.recordCall('delete', [collection, filter, options]);

    if (this.shouldSimulateFailure()) {
      throw new Error(`Mock database delete failed for collection: ${collection}`);
    }

    await this.simulateLatency();

    const documents = await (this.find as any)(collection, filter);
    const coll = this.getOrCreateCollection(collection);
    let deletedCount = 0;

    for (const doc of documents) {
      const id = (doc as any)._id;
      coll.documents.delete(id);
      this.removeFromIndexes(collection, id);
      deletedCount++;

      if (!options.multi) {
        break; // 只删除第一个匹配的文档
      }
    }

    return deletedCount;
  }

  /**
   * 根据ID删除文档
   */
  async deleteById(collection: string, id: string): Promise<boolean> {
    const deletedCount = await this.delete(collection, { _id: id });
    return deletedCount > 0;
  }

  /**
   * 统计文档数量
   */
  async count(collection: string, filter: any = {}): Promise<number> {
    this.ensureActive();
    this.recordCall('count', [collection, filter]);

    if (this.shouldSimulateFailure()) {
      throw new Error(`Mock database count failed for collection: ${collection}`);
    }

    await this.simulateLatency();

    const documents = await (this.find as any)(collection, filter);
    return documents.length;
  }

  /**
   * 创建索引
   */
  async createIndex(collection: string, field: string): Promise<void> {
    this.ensureActive();
    this.recordCall('createIndex', [collection, field]);

    const coll = this.getOrCreateCollection(collection);
    if (!coll.indexes.has(field)) {
      coll.indexes.set(field, new Set());

      // 为现有文档建立索引
      for (const [id, doc] of coll.documents) {
        const value = this.getFieldValue(doc, field);
        if (value !== undefined) {
          coll.indexes.get(field)!.add(`${value}:${id}`);
        }
      }
    }
  }

  /**
   * 清空集合
   */
  async clearCollection(collection: string): Promise<void> {
    this.ensureActive();
    this.recordCall('clearCollection', [collection]);

    const coll = this.getOrCreateCollection(collection);
    coll.documents.clear();
    coll.indexes.forEach(index => index.clear());
    this.idCounters.set(collection, 1);
  }

  /**
   * 获取集合统计信息
   */
  getCollectionStats(collection: string) {
    const coll = this.collections.get(collection);
    if (!coll) {
      return null;
    }

    return {
      name: collection,
      documentCount: coll.documents.size,
      indexCount: coll.indexes.size,
      indexes: Array.from(coll.indexes.keys()),
    };
  }

  /**
   * 获取所有集合统计信息
   */
  getAllCollectionStats() {
    const stats: any[] = [];
    for (const collectionName of this.collections.keys()) {
      const collStats = this.getCollectionStats(collectionName);
      if (collStats) {
        stats.push(collStats);
      }
    }
    return stats;
  }

  /**
   * 设置Mock配置
   */
  setConfig(config: Partial<MockDatabaseConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置失败率
   */
  setFailureRate(rate: number): void {
    this.config.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * 导出数据
   */
  exportData(): any {
    const data: any = {};
    for (const [name, collection] of this.collections) {
      data[name] = Array.from(collection.documents.values());
    }
    return data;
  }

  /**
   * 导入数据
   */
  importData(data: any): void {
    for (const [collectionName, documents] of Object.entries(data)) {
      const coll = this.getOrCreateCollection(collectionName);
      coll.documents.clear();

      if (Array.isArray(documents)) {
        documents.forEach(doc => {
          const id = doc._id || this.generateId(collectionName);
          coll.documents.set(id, { ...doc, _id: id });
        });
      }
    }
  }

  /**
   * 获取或创建集合
   */
  private getOrCreateCollection(name: string): MockCollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, {
        name,
        documents: new Map(),
        indexes: new Map(),
      });
      this.idCounters.set(name, 1);
    }
    return this.collections.get(name)!;
  }

  /**
   * 生成ID
   */
  private generateId(collection: string): string {
    if (this.config.autoIncrement) {
      const counter = this.idCounters.get(collection) || 1;
      this.idCounters.set(collection, counter + 1);
      return `${collection}_${counter}`;
    }
    return `${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 匹配过滤器
   */
  private matchesFilter(document: any, filter: any): boolean {
    for (const [key, value] of Object.entries(filter)) {
      const docValue = this.getFieldValue(document, key);

      if (typeof value === 'object' && value !== null) {
        // 处理操作符
        if (value.$eq !== undefined && docValue !== value.$eq) return false;
        if (value.$ne !== undefined && docValue === value.$ne) return false;
        if (value.$gt !== undefined && docValue <= value.$gt) return false;
        if (value.$gte !== undefined && docValue < value.$gte) return false;
        if (value.$lt !== undefined && docValue >= value.$lt) return false;
        if (value.$lte !== undefined && docValue > value.$lte) return false;
        if (value.$in !== undefined && !value.$in.includes(docValue)) return false;
        if (value.$nin !== undefined && value.$nin.includes(docValue)) return false;
      } else {
        if (docValue !== value) return false;
      }
    }
    return true;
  }

  /**
   * 获取字段值
   */
  private getFieldValue(document: any, field: string): any {
    const parts = field.split('.');
    let value = document;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 应用排序
   */
  private applySorting(documents: any[], sort: any): any[] {
    return documents.sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aValue = this.getFieldValue(a, field);
        const bValue = this.getFieldValue(b, field);

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;

        if (direction === -1) comparison *= -1;

        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  }

  /**
   * 更新索引
   */
  private updateIndexes(collection: string, id: string, document: any): void {
    const coll = this.collections.get(collection);
    if (!coll) return;

    for (const [field, index] of coll.indexes) {
      const value = this.getFieldValue(document, field);
      if (value !== undefined) {
        index.add(`${value}:${id}`);
      }
    }
  }

  /**
   * 从索引中移除
   */
  private removeFromIndexes(collection: string, id: string): void {
    const coll = this.collections.get(collection);
    if (!coll) return;

    for (const index of coll.indexes.values()) {
      const toRemove = Array.from(index).filter(entry => entry.endsWith(`:${id}`));
      toRemove.forEach(entry => index.delete(entry));
    }
  }

  /**
   * 模拟延迟
   */
  private async simulateLatency(): Promise<void> {
    if (this.config.simulateLatency) {
      const delay = this.config.defaultLatency || 10;
      await super.simulateDelay(delay, delay * 2);
    }
  }

  /**
   * 判断是否应该模拟失败
   */
  private shouldSimulateFailure(): boolean {
    return Math.random() < (this.config.failureRate || 0);
  }

  /**
   * 验证Mock服务状态
   */
  protected async onVerify(): Promise<boolean> {
    try {
      // 验证基本CRUD操作
      const testCollection = 'test_verification';

      // 创建测试
      const created = await (this.create as any)(testCollection, { name: 'test', value: 123 });
      if (!created._id) {
        this.addError('Create operation failed');
        return false;
      }

      // 查找测试
      const found = await (this.findById as any)(testCollection, created._id);
      if (!found || found.name !== 'test') {
        this.addError('Find operation failed');
        return false;
      }

      // 更新测试
      const updated = await this.updateById(testCollection, created._id, { value: 456 });
      if (!updated || updated.value !== 456) {
        this.addError('Update operation failed');
        return false;
      }

      // 删除测试
      const deleted = await this.deleteById(testCollection, created._id);
      if (!deleted) {
        this.addError('Delete operation failed');
        return false;
      }

      // 清理测试集合
      await this.clearCollection(testCollection);

      return true;
    } catch (error) {
      this.addError(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 重置时的自定义逻辑
   */
  protected onReset(): void {
    this.collections.clear();
    this.transactions.clear();
    this.idCounters.clear();
    this.config = {
      autoIncrement: true,
      persistData: false,
      simulateLatency: true,
      defaultLatency: 10,
      failureRate: 0,
    };
    this.initializeCollections();
  }

  /**
   * 获取详细统计信息
   */
  getDetailedStats() {
    return {
      ...this.getStatus(),
      collections: this.getAllCollectionStats(),
      config: this.config,
      totalDocuments: Array.from(this.collections.values())
        .reduce((sum, coll) => sum + coll.documents.size, 0),
    };
  }
}
