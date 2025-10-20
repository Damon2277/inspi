import { Types } from 'mongoose';

import ContributionLog from '../models/ContributionLog';
import User from '../models/User';
import Work, {
  IWork,
  WorkDocument,
  TeachingCard,
  Attribution,
  getWorkAuthorSummary,
} from '../models/Work';


export interface CreateWorkRequest {
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  cards: TeachingCard[];
  tags?: string[];
  status?: 'draft' | 'published';
}

export interface UpdateWorkRequest {
  title?: string;
  knowledgePoint?: string;
  subject?: string;
  gradeLevel?: string;
  cards?: TeachingCard[];
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface WorkListQuery {
  author?: string;
  status?: 'draft' | 'published' | 'archived';
  subject?: string;
  gradeLevel?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'reuseCount';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkListResponse {
  works: WorkDocument[];
  total: number;
  page: number;
  totalPages: number;
}

class WorkService {
  /**
   * 创建新作品
   */
  async createWork(userId: string, data: CreateWorkRequest): Promise<WorkDocument> {
    try {
      const work = new Work({
        ...data,
        author: new Types.ObjectId(userId),
        status: data.status || 'draft',
      });

      const savedWork = await work.save();

      // 如果是发布状态，记录贡献度
      if (data.status === 'published') {
        await this.recordContribution(userId, savedWork._id, 'creation');
      }

      return savedWork;
    } catch (error) {
      throw new Error(`创建作品失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 更新作品
   */
  async updateWork(workId: string, userId: string, data: UpdateWorkRequest): Promise<WorkDocument> {
    try {
      const work = await (Work.findOne as any)({
        _id: workId,
        author: userId,
      });

      if (!work) {
        throw new Error('作品不存在或无权限修改');
      }

      const wasPublished = work.status === 'published';
      const willBePublished = data.status === 'published';

      // 更新作品数据
      Object.assign(work, data);
      const updatedWork = await work.save();

      // 如果从草稿变为发布，记录贡献度
      if (!wasPublished && willBePublished) {
        await this.recordContribution(userId, workId, 'creation');
      }

      return updatedWork;
    } catch (error) {
      throw new Error(`更新作品失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取作品详情
   */
  async getWorkById(workId: string, userId?: string): Promise<WorkDocument | null> {
    try {
      const query: any = { _id: workId };

      // 如果提供了用户ID，可以查看自己的草稿
      if (!userId) {
        query.status = 'published';
      } else {
        query.$or = [
          { status: 'published' },
          { author: userId },
        ];
      }

      const work = await (Work.findOne as any)(query)
        .populate('author', 'name avatar')
        .populate('originalWork', 'title author');

      return work;
    } catch (error) {
      throw new Error(`获取作品失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取作品列表
   */
  async getWorksList(query: WorkListQuery): Promise<WorkListResponse> {
    try {
      const {
        author,
        status = 'published',
        subject,
        gradeLevel,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const filter: any = { status };

      if (author) {
        filter.author = author;
      }
      if (subject) {
        filter.subject = subject;
      }
      if (gradeLevel) {
        filter.gradeLevel = gradeLevel;
      }

      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [works, total] = await Promise.all([
        (Work.find as any)(filter)
          .populate('author', 'name avatar')
        .sort(sort)
          .skip(skip)
          .limit(limit),
        (Work.countDocuments as any)(filter),
      ]);

      return {
        works,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`获取作品列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除作品
   */
  async deleteWork(workId: string, userId: string): Promise<void> {
    try {
      const work = await (Work.findOne as any)({
        _id: workId,
        author: userId,
      });

      if (!work) {
        throw new Error('作品不存在或无权限删除');
      }

      await (Work.findByIdAndDelete as any)(workId);
    } catch (error) {
      throw new Error(`删除作品失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 发布作品
   */
  async publishWork(workId: string, userId: string): Promise<WorkDocument> {
    try {
      const work = await (Work.findOne as any)({
        _id: workId,
        author: userId,
        status: 'draft',
      });

      if (!work) {
        throw new Error('草稿不存在或已发布');
      }

      work.status = 'published';
      const publishedWork = await work.save();

      // 记录贡献度
      await this.recordContribution(userId, workId, 'creation');

      return publishedWork;
    } catch (error) {
      throw new Error(`发布作品失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取用户的草稿列表
   */
  async getUserDrafts(userId: string): Promise<WorkDocument[]> {
    try {
      return await (Work.find as any)({
        author: userId,
        status: 'draft',
      })
        .sort({ updatedAt: -1 })
        .limit(50);
    } catch (error) {
      throw new Error(`获取草稿列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 自动保存草稿
   */
  async saveDraft(userId: string, data: Partial<CreateWorkRequest>): Promise<WorkDocument> {
    try {
      // 查找最近的草稿
      const draft = await (Work.findOne as any)({
        author: userId,
        status: 'draft',
        title: { $in: ['', '未命名作品', data.title] },
      }).sort({ updatedAt: -1 });

      if (draft) {
        // 更新现有草稿
        Object.assign(draft, data);
        return await draft.save();
      } else {
        // 创建新草稿
        return await this.createWork(userId, {
          title: data.title || '未命名作品',
          knowledgePoint: data.knowledgePoint || '',
          subject: data.subject || '',
          gradeLevel: data.gradeLevel || '',
          cards: data.cards || [],
          tags: data.tags || [],
          status: 'draft',
        });
      }
    } catch (error) {
      throw new Error(`保存草稿失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录贡献度
   */
  private async recordContribution(userId: string, workId: string, type: 'creation' | 'reuse'): Promise<void> {
    try {
      const points = type === 'creation' ? 10 : 50;

      await (ContributionLog.create as any)({
        userId: new Types.ObjectId(userId),
        type,
        points,
        workId: new Types.ObjectId(workId),
      });

      // 更新用户贡献度分数
      await (User.findByIdAndUpdate as any)(userId, {
        $inc: { contributionScore: points },
      });
    } catch (error) {
      console.error('记录贡献度失败:', error);
    }
  }

  /**
   * 搜索作品
   */
  async searchWorks(keyword: string, filters?: Partial<WorkListQuery>): Promise<WorkDocument[]> {
    try {
      const query: any = {
        status: 'published',
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { knowledgePoint: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(keyword, 'i')] } },
        ],
      };

      if (filters?.subject) {
        query.subject = filters.subject;
      }
      if (filters?.gradeLevel) {
        query.gradeLevel = filters.gradeLevel;
      }

      return await (Work.find as any)(query)
        .populate('author', 'name avatar')
        .sort({ reuseCount: -1, createdAt: -1 })
        .limit(filters?.limit || 20);
    } catch (error) {
      throw new Error(`搜索作品失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取智慧广场作品列表（专用方法）
   */
  async getWorksForSquare(query: SquareQuery): Promise<SquareResponse> {
    try {
      const {
        subject,
        gradeLevel,
        page = 1,
        limit = 12,
        sortBy = 'latest',
        search,
        tags,
      } = query;

      const filter: any = { status: 'published' };

      // 筛选条件
      if (subject) filter.subject = subject;
      if (gradeLevel) filter.gradeLevel = gradeLevel;
      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      // 搜索条件
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { knowledgePoint: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];
      }

      // 排序条件
      const sort: any = {};
      switch (sortBy) {
        case 'popular':
          sort.reuseCount = -1;
          sort.createdAt = -1;
          break;
        case 'reuse_count':
          sort.reuseCount = -1;
          break;
        case 'latest':
        default:
          sort.createdAt = -1;
          break;
      }

      const skip = (page - 1) * limit;

      // 并行查询作品和统计信息
      const [works, total, filters] = await Promise.all([
        (Work.find as any)(filter)
          .populate('author', 'name avatar')
        .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        (Work.countDocuments as any)(filter),
        this.getSquareFilters(),
      ]);

      // 转换为卡片数据格式
      const workCards = works.map(work => this.transformToWorkCard(work));

      return {
        works: workCards,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        filters,
      };
    } catch (error) {
      throw new Error(`获取智慧广场作品失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取筛选选项
   */
  private async getSquareFilters(): Promise<any> {
    try {
      const [subjectStats, gradeLevelStats] = await Promise.all([
        (Work.aggregate as any)([
          { $match: { status: 'published' } },
          { $group: { _id: '$subject', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        (Work.aggregate as any)([
          { $match: { status: 'published' } },
          { $group: { _id: '$gradeLevel', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

      return {
        subjects: subjectStats.map(item => ({
          value: item._id,
          label: item._id,
          count: item.count,
        })),
        gradeLevels: gradeLevelStats.map(item => ({
          value: item._id,
          label: item._id,
          count: item.count,
        })),
        availableTags: [], // TODO: 实现标签统计
      };
    } catch (error) {
      console.error('获取筛选选项失败:', error);
      return { subjects: [], gradeLevels: [], availableTags: [] };
    }
  }

  /**
   * 转换作品为卡片展示格式
   */
  private transformToWorkCard(work: IWork & { _id: Types.ObjectId | string }): any {
    const authorSummary = getWorkAuthorSummary(work.author);

    return {
      id: work._id.toString(),
      title: work.title,
      knowledgePoint: work.knowledgePoint,
      subject: work.subject,
      gradeLevel: work.gradeLevel,
      author: {
        id: authorSummary.id,
        name: authorSummary.name,
        avatar: authorSummary.avatar ?? undefined,
      },
      reuseCount: work.reuseCount || 0,
      createdAt: work.createdAt.toISOString(),
      updatedAt: work.updatedAt.toISOString(),
      tags: work.tags || [],
      cardCount: work.cards?.length || 0,
      cardTypes: work.cards?.map((card: any) => card.type) || [],
    };
  }
}

// 智慧广场查询接口
export interface SquareQuery {
  subject?: string;
  gradeLevel?: string;
  page?: number;
  limit?: number;
  sortBy?: 'latest' | 'popular' | 'reuse_count';
  search?: string;
  tags?: string[];
}

// 智慧广场响应接口
export interface SquareResponse {
  works: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: any;
}

export const workService = new WorkService();

export default workService;
