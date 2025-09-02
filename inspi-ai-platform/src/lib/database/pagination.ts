/**
 * 数据库分页优化
 */
import { logger } from '@/lib/logging/logger';

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
  cursor?: string;
}

/**
 * 分页结果
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
  performance: {
    executionTime: number;
    documentsExamined: number;
    indexUsed: boolean;
  };
}

/**
 * 游标分页参数
 */
export interface CursorPaginationParams {
  limit: number;
  cursor?: string;
  sort: Record<string, 1 | -1>;
  direction?: 'forward' | 'backward';
}

/**
 * 游标分页结果
 */
export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
    totalEstimate?: number;
  };
  performance: {
    executionTime: number;
    documentsExamined: number;
    indexUsed: boolean;
  };
}

/**
 * 分页优化器
 */
export class PaginationOptimizer {
  private db: any;
  private defaultLimit = 20;
  private maxLimit = 100;

  constructor(database: any) {
    this.db = database;
  }

  /**
   * 优化的偏移分页
   */
  async paginateWithOffset<T>(
    collection: string,
    query: Record<string, any>,
    params: PaginationParams
  ): Promise<PaginationResult<T>> {
    const startTime = Date.now();
    
    try {
      // 验证和规范化参数
      const normalizedParams = this.normalizeOffsetParams(params);
      
      // 检查是否适合偏移分页
      if (normalizedParams.page > 100) {
        logger.warn('Large offset pagination detected, consider using cursor pagination', {
          collection,
          page: normalizedParams.page,
          offset: (normalizedParams.page - 1) * normalizedParams.limit
        });
      }

      const coll = this.db.collection(collection);
      const skip = (normalizedParams.page - 1) * normalizedParams.limit;

      // 构建查询选项
      const options: any = {
        limit: normalizedParams.limit,
        skip
      };

      if (normalizedParams.sort) {
        options.sort = normalizedParams.sort;
      }

      // 并行执行数据查询和总数统计
      const [data, total] = await Promise.all([
        coll.find(query, options).toArray(),
        this.getOptimizedCount(coll, query, skip)
      ]);

      const executionTime = Date.now() - startTime;
      const totalPages = Math.ceil(total / normalizedParams.limit);

      return {
        data,
        pagination: {
          page: normalizedParams.page,
          limit: normalizedParams.limit,
          total,
          totalPages,
          hasNext: normalizedParams.page < totalPages,
          hasPrev: normalizedParams.page > 1
        },
        performance: {
          executionTime,
          documentsExamined: skip + data.length,
          indexUsed: true // 需要从explain结果获取
        }
      };

    } catch (error) {
      logger.error('Offset pagination failed', error instanceof Error ? error : new Error(String(error)), {
        collection,
        query: JSON.stringify(query),
        params
      });
      throw error;
    }
  }

  /**
   * 游标分页（推荐用于大数据集）
   */
  async paginateWithCursor<T>(
    collection: string,
    query: Record<string, any>,
    params: CursorPaginationParams
  ): Promise<CursorPaginationResult<T>> {
    const startTime = Date.now();
    
    try {
      const normalizedParams = this.normalizeCursorParams(params);
      const coll = this.db.collection(collection);

      // 构建游标查询
      const cursorQuery = this.buildCursorQuery(query, normalizedParams);
      
      // 获取比限制多一条记录以判断是否有下一页
      const limit = normalizedParams.limit + 1;
      
      const options: any = {
        limit,
        sort: normalizedParams.sort
      };

      const data = await coll.find(cursorQuery, options).toArray();
      const executionTime = Date.now() - startTime;

      // 检查是否有更多数据
      const hasNext = data.length > normalizedParams.limit;
      if (hasNext) {
        data.pop(); // 移除多查询的一条记录
      }

      // 生成游标
      const nextCursor = hasNext && data.length > 0 
        ? this.generateCursor(data[data.length - 1], normalizedParams.sort)
        : undefined;

      const prevCursor = normalizedParams.cursor && data.length > 0
        ? this.generateCursor(data[0], normalizedParams.sort, true)
        : undefined;

      return {
        data,
        pagination: {
          limit: normalizedParams.limit,
          hasNext,
          hasPrev: !!normalizedParams.cursor,
          nextCursor,
          prevCursor
        },
        performance: {
          executionTime,
          documentsExamined: data.length,
          indexUsed: true
        }
      };

    } catch (error) {
      logger.error('Cursor pagination failed', error instanceof Error ? error : new Error(String(error)), {
        collection,
        query: JSON.stringify(query),
        params
      });
      throw error;
    }
  }

  /**
   * 智能分页（自动选择最优分页方式）
   */
  async smartPaginate<T>(
    collection: string,
    query: Record<string, any>,
    params: PaginationParams
  ): Promise<PaginationResult<T> | CursorPaginationResult<T>> {
    // 如果有游标或页数较大，使用游标分页
    if (params.cursor || (params.page && params.page > 50)) {
      const cursorParams: CursorPaginationParams = {
        limit: params.limit,
        cursor: params.cursor,
        sort: params.sort || { _id: 1 }
      };
      
      return await this.paginateWithCursor(collection, query, cursorParams);
    }

    // 否则使用偏移分页
    return await this.paginateWithOffset(collection, query, params);
  }

  /**
   * 聚合分页
   */
  async paginateAggregation<T>(
    collection: string,
    pipeline: any[],
    params: PaginationParams
  ): Promise<PaginationResult<T>> {
    const startTime = Date.now();
    
    try {
      const normalizedParams = this.normalizeOffsetParams(params);
      const coll = this.db.collection(collection);

      // 构建分页管道
      const paginationPipeline = [...pipeline];
      
      // 添加排序
      if (normalizedParams.sort) {
        paginationPipeline.push({ $sort: normalizedParams.sort });
      }

      // 使用 $facet 同时获取数据和总数
      const facetPipeline = [
        ...paginationPipeline,
        {
          $facet: {
            data: [
              { $skip: (normalizedParams.page - 1) * normalizedParams.limit },
              { $limit: normalizedParams.limit }
            ],
            count: [
              { $count: 'total' }
            ]
          }
        }
      ];

      const [result] = await coll.aggregate(facetPipeline).toArray();
      const data = result.data || [];
      const total = result.count[0]?.total || 0;
      
      const executionTime = Date.now() - startTime;
      const totalPages = Math.ceil(total / normalizedParams.limit);

      return {
        data,
        pagination: {
          page: normalizedParams.page,
          limit: normalizedParams.limit,
          total,
          totalPages,
          hasNext: normalizedParams.page < totalPages,
          hasPrev: normalizedParams.page > 1
        },
        performance: {
          executionTime,
          documentsExamined: total,
          indexUsed: true
        }
      };

    } catch (error) {
      logger.error('Aggregation pagination failed', error instanceof Error ? error : new Error(String(error)), {
        collection,
        pipeline: JSON.stringify(pipeline),
        params
      });
      throw error;
    }
  }

  /**
   * 规范化偏移分页参数
   */
  private normalizeOffsetParams(params: PaginationParams): Required<Omit<PaginationParams, 'cursor'>> {
    return {
      page: Math.max(1, params.page || 1),
      limit: Math.min(this.maxLimit, Math.max(1, params.limit || this.defaultLimit)),
      sort: params.sort || { _id: 1 }
    };
  }

  /**
   * 规范化游标分页参数
   */
  private normalizeCursorParams(params: CursorPaginationParams): Required<CursorPaginationParams> {
    return {
      limit: Math.min(this.maxLimit, Math.max(1, params.limit || this.defaultLimit)),
      cursor: params.cursor,
      sort: params.sort,
      direction: params.direction || 'forward'
    };
  }

  /**
   * 构建游标查询
   */
  private buildCursorQuery(
    baseQuery: Record<string, any>,
    params: Required<CursorPaginationParams>
  ): Record<string, any> {
    if (!params.cursor) {
      return baseQuery;
    }

    try {
      const cursorData = this.parseCursor(params.cursor);
      const sortFields = Object.keys(params.sort);
      const cursorQuery: Record<string, any> = { ...baseQuery };

      // 构建游标条件
      if (sortFields.length === 1) {
        const field = sortFields[0];
        const direction = params.sort[field];
        const operator = direction === 1 ? '$gt' : '$lt';
        
        if (params.direction === 'backward') {
          cursorQuery[field] = { [direction === 1 ? '$lt' : '$gt']: cursorData[field] };
        } else {
          cursorQuery[field] = { [operator]: cursorData[field] };
        }
      } else {
        // 多字段排序的复杂游标查询
        const orConditions = this.buildMultiFieldCursorConditions(cursorData, params.sort, params.direction);
        if (orConditions.length > 0) {
          cursorQuery.$or = orConditions;
        }
      }

      return cursorQuery;
    } catch (error) {
      logger.error('Failed to build cursor query', error instanceof Error ? error : new Error(String(error)), { cursor: params.cursor });
      return baseQuery;
    }
  }

  /**
   * 构建多字段游标条件
   */
  private buildMultiFieldCursorConditions(
    cursorData: Record<string, any>,
    sort: Record<string, 1 | -1>,
    direction: 'forward' | 'backward'
  ): any[] {
    const conditions: any[] = [];
    const sortFields = Object.keys(sort);

    for (let i = 0; i < sortFields.length; i++) {
      const condition: Record<string, any> = {};
      
      // 添加前面字段的等值条件
      for (let j = 0; j < i; j++) {
        const field = sortFields[j];
        condition[field] = cursorData[field];
      }
      
      // 添加当前字段的比较条件
      const currentField = sortFields[i];
      const sortDirection = sort[currentField];
      let operator: string;
      
      if (direction === 'forward') {
        operator = sortDirection === 1 ? '$gt' : '$lt';
      } else {
        operator = sortDirection === 1 ? '$lt' : '$gt';
      }
      
      condition[currentField] = { [operator]: cursorData[currentField] };
      conditions.push(condition);
    }

    return conditions;
  }

  /**
   * 生成游标
   */
  private generateCursor(
    document: any,
    sort: Record<string, 1 | -1>,
    reverse: boolean = false
  ): string {
    const cursorData: Record<string, any> = {};
    
    Object.keys(sort).forEach(field => {
      cursorData[field] = document[field];
    });

    // 添加文档ID作为唯一标识
    cursorData._id = document._id;

    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * 解析游标
   */
  private parseCursor(cursor: string): Record<string, any> {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * 优化的计数查询
   */
  private async getOptimizedCount(
    collection: any,
    query: Record<string, any>,
    skip: number
  ): Promise<number> {
    // 对于大偏移量，使用估算计数
    if (skip > 10000) {
      try {
        const stats = await collection.stats();
        return Math.max(stats.count - skip, 0);
      } catch {
        // 如果stats失败，回退到精确计数
        return await collection.countDocuments(query);
      }
    }

    // 小偏移量使用精确计数
    return await collection.countDocuments(query);
  }

  /**
   * 设置默认限制
   */
  setDefaultLimit(limit: number): void {
    this.defaultLimit = Math.max(1, limit);
  }

  /**
   * 设置最大限制
   */
  setMaxLimit(limit: number): void {
    this.maxLimit = Math.max(1, limit);
  }
}

/**
 * 分页工具函数
 */
export class PaginationUtils {
  /**
   * 验证分页参数
   */
  static validatePaginationParams(params: any): {
    valid: boolean;
    errors: string[];
    normalized?: PaginationParams;
  } {
    const errors: string[] = [];

    // 验证页码
    if (params.page !== undefined) {
      if (!Number.isInteger(params.page) || params.page < 1) {
        errors.push('页码必须是大于0的整数');
      }
    }

    // 验证限制
    if (params.limit !== undefined) {
      if (!Number.isInteger(params.limit) || params.limit < 1) {
        errors.push('每页数量必须是大于0的整数');
      }
      if (params.limit > 100) {
        errors.push('每页数量不能超过100');
      }
    }

    // 验证排序
    if (params.sort !== undefined) {
      if (typeof params.sort !== 'object' || params.sort === null) {
        errors.push('排序参数必须是对象');
      } else {
        for (const [field, direction] of Object.entries(params.sort)) {
          if (direction !== 1 && direction !== -1) {
            errors.push(`排序字段 ${field} 的方向必须是 1 或 -1`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      normalized: {
        page: params.page || 1,
        limit: params.limit || 20,
        sort: params.sort,
        cursor: params.cursor
      }
    };
  }

  /**
   * 计算分页信息
   */
  static calculatePaginationInfo(
    page: number,
    limit: number,
    total: number
  ): {
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    startIndex: number;
    endIndex: number;
  } {
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit + 1;
    const endIndex = Math.min(page * limit, total);

    return {
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      startIndex,
      endIndex
    };
  }

  /**
   * 生成分页链接信息
   */
  static generatePaginationLinks(
    currentPage: number,
    totalPages: number,
    maxLinks: number = 5
  ): {
    first: number;
    last: number;
    prev?: number;
    next?: number;
    pages: number[];
  } {
    const half = Math.floor(maxLinks / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxLinks - 1);

    // 调整起始位置
    if (end - start + 1 < maxLinks) {
      start = Math.max(1, end - maxLinks + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return {
      first: 1,
      last: totalPages,
      prev: currentPage > 1 ? currentPage - 1 : undefined,
      next: currentPage < totalPages ? currentPage + 1 : undefined,
      pages
    };
  }

  /**
   * 转换为URL查询参数
   */
  static toQueryParams(params: PaginationParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.page) {
      queryParams.page = params.page.toString();
    }

    if (params.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params.sort) {
      queryParams.sort = JSON.stringify(params.sort);
    }

    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }

    return queryParams;
  }

  /**
   * 从URL查询参数解析
   */
  static fromQueryParams(queryParams: Record<string, string>): PaginationParams {
    const params: PaginationParams = {
      page: 1,
      limit: 20
    };

    if (queryParams.page) {
      const page = parseInt(queryParams.page, 10);
      if (!isNaN(page) && page > 0) {
        params.page = page;
      }
    }

    if (queryParams.limit) {
      const limit = parseInt(queryParams.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        params.limit = Math.min(100, limit);
      }
    }

    if (queryParams.sort) {
      try {
        params.sort = JSON.parse(queryParams.sort);
      } catch {
        // 忽略无效的排序参数
      }
    }

    if (queryParams.cursor) {
      params.cursor = queryParams.cursor;
    }

    return params;
  }
}

export default PaginationOptimizer;