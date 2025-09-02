/**
 * 联系支持数据模型
 */
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/database/connection';
import { ContactRecord, ContactType, ContactStatus, ContactPriority } from '@/types/contact';

/**
 * 联系记录数据模型类
 */
export class ContactModel {
  private static collectionName = 'contacts';

  /**
   * 创建新的联系记录
   */
  static async create(contactData: Omit<ContactRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<ContactRecord> {
    const db = await connectToDatabase();
    
    const record: Omit<ContactRecord, '_id'> = {
      ...contactData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(this.collectionName).insertOne(record);
    
    return {
      _id: result.insertedId,
      ...record
    };
  }

  /**
   * 根据ID查找联系记录
   */
  static async findById(id: string | ObjectId): Promise<ContactRecord | null> {
    const db = await connectToDatabase();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const record = await db.collection(this.collectionName).findOne({ _id: objectId });
    return record as ContactRecord | null;
  }

  /**
   * 查找联系记录列表
   */
  static async findMany(options: {
    status?: ContactStatus;
    type?: ContactType;
    priority?: ContactPriority;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'priority';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    records: ContactRecord[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const db = await connectToDatabase();
    
    const {
      status,
      type,
      priority,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // 构建查询条件
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    // 构建排序条件
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // 计算分页
    const skip = (page - 1) * limit;

    // 执行查询
    const [records, total] = await Promise.all([
      db.collection(this.collectionName)
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(this.collectionName).countDocuments(query)
    ]);

    return {
      records: records as ContactRecord[],
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * 更新联系记录状态
   */
  static async updateStatus(
    id: string | ObjectId, 
    status: ContactStatus, 
    adminNotes?: string
  ): Promise<ContactRecord | null> {
    const db = await connectToDatabase();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const result = await db.collection(this.collectionName).findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result.value as ContactRecord | null;
  }

  /**
   * 根据邮箱查找最近的联系记录
   */
  static async findRecentByEmail(email: string, hours: number = 24): Promise<ContactRecord[]> {
    const db = await connectToDatabase();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const records = await db.collection(this.collectionName)
      .find({
        email: email.toLowerCase(),
        createdAt: { $gte: cutoffTime }
      })
      .sort({ createdAt: -1 })
      .toArray();

    return records as ContactRecord[];
  }

  /**
   * 根据IP地址查找最近的联系记录
   */
  static async findRecentByIP(ipAddress: string, hours: number = 1): Promise<ContactRecord[]> {
    const db = await connectToDatabase();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const records = await db.collection(this.collectionName)
      .find({
        ipAddress,
        createdAt: { $gte: cutoffTime }
      })
      .sort({ createdAt: -1 })
      .toArray();

    return records as ContactRecord[];
  }

  /**
   * 获取联系统计信息
   */
  static async getStats(days: number = 30): Promise<{
    total: number;
    byStatus: Record<ContactStatus, number>;
    byType: Record<ContactType, number>;
    byPriority: Record<ContactPriority, number>;
    recentTrend: Array<{ date: string; count: number }>;
  }> {
    const db = await connectToDatabase();
    const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 获取总数
    const total = await db.collection(this.collectionName)
      .countDocuments({ createdAt: { $gte: cutoffTime } });

    // 按状态统计
    const statusStats = await db.collection(this.collectionName)
      .aggregate([
        { $match: { createdAt: { $gte: cutoffTime } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray();

    const byStatus: Record<ContactStatus, number> = {
      'new': 0,
      'processing': 0,
      'resolved': 0,
      'closed': 0
    };
    statusStats.forEach(stat => {
      byStatus[stat._id as ContactStatus] = stat.count;
    });

    // 按类型统计
    const typeStats = await db.collection(this.collectionName)
      .aggregate([
        { $match: { createdAt: { $gte: cutoffTime } } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]).toArray();

    const byType: Record<ContactType, number> = {
      'general': 0,
      'technical': 0,
      'feedback': 0,
      'bug-report': 0
    };
    typeStats.forEach(stat => {
      byType[stat._id as ContactType] = stat.count;
    });

    // 按优先级统计
    const priorityStats = await db.collection(this.collectionName)
      .aggregate([
        { $match: { createdAt: { $gte: cutoffTime } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]).toArray();

    const byPriority: Record<ContactPriority, number> = {
      'low': 0,
      'medium': 0,
      'high': 0,
      'urgent': 0
    };
    priorityStats.forEach(stat => {
      byPriority[stat._id as ContactPriority] = stat.count;
    });

    // 最近趋势（按天）
    const trendStats = await db.collection(this.collectionName)
      .aggregate([
        { $match: { createdAt: { $gte: cutoffTime } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

    const recentTrend = trendStats.map(stat => ({
      date: stat._id,
      count: stat.count
    }));

    return {
      total,
      byStatus,
      byType,
      byPriority,
      recentTrend
    };
  }

  /**
   * 删除联系记录
   */
  static async delete(id: string | ObjectId): Promise<boolean> {
    const db = await connectToDatabase();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const result = await db.collection(this.collectionName).deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  /**
   * 批量更新联系记录状态
   */
  static async batchUpdateStatus(
    ids: (string | ObjectId)[], 
    status: ContactStatus,
    adminNotes?: string
  ): Promise<number> {
    const db = await connectToDatabase();
    const objectIds = ids.map(id => typeof id === 'string' ? new ObjectId(id) : id);
    
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const result = await db.collection(this.collectionName).updateMany(
      { _id: { $in: objectIds } },
      { $set: updateData }
    );

    return result.modifiedCount;
  }

  /**
   * 搜索联系记录
   */
  static async search(
    query: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    records: ContactRecord[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const db = await connectToDatabase();
    const { page = 1, limit = 20 } = options;

    // 构建搜索条件
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { subject: { $regex: query, $options: 'i' } },
        { message: { $regex: query, $options: 'i' } }
      ]
    };

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      db.collection(this.collectionName)
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(this.collectionName).countDocuments(searchQuery)
    ]);

    return {
      records: records as ContactRecord[],
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * 创建数据库索引
   */
  static async createIndexes(): Promise<void> {
    const db = await connectToDatabase();
    const collection = db.collection(this.collectionName);

    // 创建索引
    await Promise.all([
      collection.createIndex({ email: 1 }),
      collection.createIndex({ status: 1 }),
      collection.createIndex({ type: 1 }),
      collection.createIndex({ priority: 1 }),
      collection.createIndex({ createdAt: -1 }),
      collection.createIndex({ ipAddress: 1, createdAt: -1 }),
      collection.createIndex({ 
        name: 'text', 
        subject: 'text', 
        message: 'text' 
      }, { 
        name: 'contact_text_search' 
      })
    ]);
  }
}