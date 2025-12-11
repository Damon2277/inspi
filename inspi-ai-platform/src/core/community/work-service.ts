/**
 * 作品服务
 * 处理作品的发布、编辑、搜索等功能
 */
import { promises as fs } from 'fs';
import path from 'path';

import mongoose from 'mongoose';

import Bookmark from '@/lib/models/Bookmark';
import Comment from '@/lib/models/Comment';
import User from '@/lib/models/User';
import Work, { WorkDocument, getWorkAuthorId, getWorkAuthorObjectId } from '@/lib/models/Work';
import connectDB from '@/lib/mongodb';
import { env } from '@/shared/config/environment';

export interface CreateWorkRequest {
  title: string
  description?: string
  knowledgePoint: string
  subject: string
  gradeLevel: string
  cards: any[]
  tags: string[]
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number
  visibility: 'public' | 'unlisted' | 'private'
  allowReuse: boolean
  allowComments: boolean
}

export interface UpdateWorkRequest extends Partial<CreateWorkRequest> {
  status?: 'draft' | 'published' | 'archived' | 'private'
}

export interface WorkSearchQuery {
  query?: string
  subject?: string
  gradeLevel?: string
  category?: string
  difficulty?: string
  tags?: string[]
  author?: string
  sortBy?: 'latest' | 'popular' | 'trending' | 'views'
  page?: number
  limit?: number
}

export interface WorkResponse {
  success: boolean
  work?: WorkDocument
  works?: WorkDocument[]
  total?: number
  page?: number
  totalPages?: number
  error?: string
  message?: string
}

/**
 * 作品服务类
 */
export class WorkService {
  private static readonly WORK_IMAGE_DIR = path.join(process.cwd(), 'public', 'work-images');
  private static readonly EPHEMERAL_HOST_KEYWORDS = [
    'ark-content-generation',
    'tos-cn-beijing',
  ];
  private static readonly EXPIRATION_QUERY_KEYS = ['X-Tos-Expires', 'X-Amz-Expires'];

  private static getBaseUrl(): string {
    const base = (env.APP_URL || 'http://localhost:3000').trim();
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }

  private static ensureSafeId(id: string, fallback: string): string {
    const normalized = (id || fallback || 'card')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '');
    return normalized.length > 0 ? normalized : fallback;
  }

  private static async persistImageIfNeeded(imageUrl?: string, identifier?: string): Promise<string | undefined> {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return imageUrl;
    }

    if (imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
      return imageUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch (error) {
      return imageUrl;
    }

    if (!this.isEphemeralUrl(parsedUrl)) {
      return imageUrl;
    }

    try {
      const response = await fetch(parsedUrl, {
        method: 'GET',
        headers: { Accept: 'image/*' },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.warn('Failed to persist remote image', parsedUrl.toString(), response.status);
        return imageUrl;
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.mkdir(this.WORK_IMAGE_DIR, { recursive: true });

      const extension = this.guessExtension(contentType, parsedUrl.pathname);
      const safeId = this.ensureSafeId(identifier || 'card-image', 'card-image');
      const filename = `${safeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
      const filePath = path.join(this.WORK_IMAGE_DIR, filename);
      await fs.writeFile(filePath, buffer);

      const baseUrl = this.getBaseUrl();
      return `${baseUrl}/work-images/${filename}`;
    } catch (error) {
      console.error('Persist image error:', error);
      return imageUrl;
    }
  }

  private static isEphemeralUrl(url: URL): boolean {
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    if (this.EXPIRATION_QUERY_KEYS.some(key => url.searchParams.has(key))) {
      return true;
    }

    return this.EPHEMERAL_HOST_KEYWORDS.some(keyword => url.hostname.includes(keyword));
  }

  private static guessExtension(contentType: string, pathname: string): string {
    if (contentType.includes('jpeg') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      return 'jpg';
    }
    if (contentType.includes('png') || pathname.endsWith('.png')) {
      return 'png';
    }
    if (contentType.includes('webp') || pathname.endsWith('.webp')) {
      return 'webp';
    }
    return 'png';
  }

  private static async normalizeCardImages(cards?: any[]): Promise<any[] | undefined> {
    if (!Array.isArray(cards) || cards.length === 0) {
      return cards;
    }

    return Promise.all(cards.map(async (card, cardIndex) => {
      const normalizedCard = { ...card };
      const safeId = this.ensureSafeId(card?.id || '', `card-${cardIndex}`);

      if (normalizedCard.metadata) {
        normalizedCard.metadata = { ...normalizedCard.metadata };
        if (normalizedCard.metadata.coverImageUrl) {
          normalizedCard.metadata.coverImageUrl = await this.persistImageIfNeeded(
            normalizedCard.metadata.coverImageUrl,
            `${safeId}-cover`,
          );
        }
      }

      if (normalizedCard.visual) {
          const normalizedVisual: any = { ...normalizedCard.visual };
          if (normalizedVisual.imageUrl) {
            normalizedVisual.imageUrl = await this.persistImageIfNeeded(
              normalizedVisual.imageUrl,
              `${safeId}-visual`,
            );
          }

          if (normalizedVisual.structured) {
            const structured = { ...normalizedVisual.structured };
            if (Array.isArray(structured.stages)) {
              structured.stages = await Promise.all(structured.stages.map(async (stage: any, stageIndex: number) => {
                if (!stage) {
                  return stage;
                }
                const normalizedStage = { ...stage };
                if (normalizedStage.imageUrl) {
                  normalizedStage.imageUrl = await this.persistImageIfNeeded(
                    normalizedStage.imageUrl,
                    `${safeId}-stage-${stageIndex}`,
                  );
                }
                return normalizedStage;
              }));
            }
            normalizedVisual.structured = structured;
          }

          normalizedCard.visual = normalizedVisual;
      }

      return normalizedCard;
    }));
  }

  private static extractCoverImage(cards?: any[]): string | null {
    if (!Array.isArray(cards)) return null;
    for (const card of cards) {
      if (card?.visual?.imageUrl) return card.visual.imageUrl;
      if (card?.metadata?.coverImageUrl) return card.metadata.coverImageUrl;
      const stages = card?.visual?.structured?.stages;
      if (Array.isArray(stages)) {
        const stageWithImage = stages.find((stage: any) => stage?.imageUrl);
        if (stageWithImage?.imageUrl) return stageWithImage.imageUrl;
      }
    }
    return null;
  }
  /**
   * 创建作品
   */
  static async createWork(
    authorId: string,
    data: CreateWorkRequest,
  ): Promise<WorkResponse> {
    try {
      await connectDB();

      const normalizedCards = await this.normalizeCardImages(data.cards);
      const payload = {
        ...data,
        cards: normalizedCards ?? [],
      };

      // 验证输入
      const validation = this.validateWorkData(payload);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // 创建作品
      const work = new Work({
        ...payload,
        author: new mongoose.Types.ObjectId(authorId),
        isOriginal: true,
        qualityScore: this.calculateInitialQualityScore(data),
        status: 'draft',
        coverImageUrl: this.extractCoverImage(payload.cards),
      });

      const savedWork = await work.save();
      await savedWork.populate('author', 'name avatar') as any;

      return {
        success: true,
        work: savedWork,
        message: '作品创建成功',
      };
    } catch (error) {
      console.error('Create work error:', error);
      return {
        success: false,
        error: '创建作品失败',
      };
    }
  }

  /**
   * 更新作品
   */
  static async updateWork(
    workId: string,
    authorId: string,
    data: UpdateWorkRequest,
  ): Promise<WorkResponse> {
    try {
      await connectDB();

      const work = await (Work.findOne as any)({
        _id: workId,
        author: authorId,
      });

      if (!work) {
        return {
          success: false,
          error: '作品不存在或无权限编辑',
        };
      }

      // 验证输入
      if (data.title || data.knowledgePoint || data.subject) {
        const validation = this.validateWorkData(data as CreateWorkRequest);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.error,
          };
        }
      }

      // 更新作品
      const normalizedCards = await this.normalizeCardImages(data.cards);

      const updatePayload: UpdateWorkRequest = {
        ...data,
        cards: normalizedCards ?? data.cards,
      };

      Object.assign(work, updatePayload);
      if (normalizedCards) {
        work.coverImageUrl = this.extractCoverImage(normalizedCards);
      }

      // 重新计算质量评分
      if (data.title || data.description || data.cards || data.tags) {
        work.qualityScore = this.calculateQualityScore(work);
      }

      const updatedWork = await work.save();
      await updatedWork.populate('author', 'name avatar') as any;

      return {
        success: true,
        work: updatedWork,
        message: '作品更新成功',
      };
    } catch (error) {
      console.error('Update work error:', error);
      return {
        success: false,
        error: '更新作品失败',
      };
    }
  }

  /**
   * 删除作品
   */
  static async deleteWork(
    workId: string,
    authorId: string,
  ): Promise<WorkResponse> {
    try {
      await connectDB();

      const work = await (Work.findOne as any)({
        _id: workId,
        author: authorId,
      });

      if (!work) {
        return {
          success: false,
          error: '作品不存在或无权限删除',
        };
      }

      await (Work.findByIdAndDelete as any)(workId);

      return {
        success: true,
        message: '作品删除成功',
      };
    } catch (error) {
      console.error('Delete work error:', error);
      return {
        success: false,
        error: '删除作品失败',
      };
    }
  }

  /**
   * 发布作品
   */
  static async publishWork(
    workId: string,
    authorId: string,
  ): Promise<WorkResponse> {
    try {
      await connectDB();

      const work = await (Work.findOne as any)({
        _id: workId,
        author: authorId,
      });

      if (!work) {
        return {
          success: false,
          error: '作品不存在或无权限发布',
        };
      }

      if (work.status === 'published') {
        return {
          success: false,
          error: '作品已经发布',
        };
      }

      // 检查作品完整性
      const completeness = this.checkWorkCompleteness(work);
      if (!completeness.isComplete) {
        return {
          success: false,
          error: `作品不完整：${completeness.missingFields.join(', ')}`,
        };
      }

      // 发布作品
      work.status = 'published';
      work.publishedAt = new Date();
      work.moderationStatus = 'pending'; // 发布后需要审核

      const publishedWork = await work.save();
      await publishedWork.populate('author', 'name avatar') as any;

      return {
        success: true,
        work: publishedWork,
        message: '作品发布成功，正在审核中',
      };
    } catch (error) {
      console.error('Publish work error:', error);
      return {
        success: false,
        error: '发布作品失败',
      };
    }
  }

  /**
   * 获取作品详情
   */
  static async getWork(
    workId: string,
    userId?: string,
  ): Promise<WorkResponse> {
    try {
      await connectDB();

      const work = await (Work.findById as any)(workId)
        .populate('author', 'name avatar bio')
        .populate('originalWork', 'title author');

      if (!work) {
        return {
          success: false,
          error: '作品不存在',
        };
      }

      // 检查访问权限
      if (
        work.visibility === 'private' &&
        (!userId || getWorkAuthorId(work.author) !== userId)
      ) {
        return {
          success: false,
          error: '无权限访问此作品',
        };
      }

      // 增加浏览量（如果不是作者本人）
      if (userId && getWorkAuthorId(work.author) !== userId) {
        work.views += 1;
        await work.save();
      }

      // 获取用户交互状态
      let userInteractions = {};
      if (userId) {
        const [isLiked, isBookmarked] = await Promise.all([
          work.likes.includes(new mongoose.Types.ObjectId(userId)),
          Bookmark.isBookmarked(
            new mongoose.Types.ObjectId(userId),
            new mongoose.Types.ObjectId(workId),
          ),
        ]);

        userInteractions = {
          isLiked,
          isBookmarked: !!isBookmarked,
        };
      }

      return {
        success: true,
        work: {
          ...work.toObject(),
          userInteractions,
        } as any,
      };
    } catch (error) {
      console.error('Get work error:', error);
      return {
        success: false,
        error: '获取作品失败',
      };
    }
  }

  /**
   * 搜索作品
   */
  static async searchWorks(query: WorkSearchQuery): Promise<WorkResponse> {
    try {
      await connectDB();

      const {
        query: searchQuery,
        subject,
        gradeLevel,
        category,
        difficulty,
        tags,
        author,
        sortBy = 'latest',
        page = 1,
        limit = 20,
      } = query;

      const skip = (page - 1) * limit;

      // 构建查询条件
      const filter: any = {
        status: 'published',
        visibility: { $in: ['public', 'unlisted'] },
        moderationStatus: 'approved',
      };

      if (searchQuery) {
        filter.$or = [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { knowledgePoint: { $regex: searchQuery, $options: 'i' } },
          { tags: { $in: [new RegExp(searchQuery, 'i')] } },
        ];
      }

      if (subject) filter.subject = subject;
      if (gradeLevel) filter.gradeLevel = gradeLevel;
      if (category) filter.category = category;
      if (difficulty) filter.difficulty = difficulty;
      if (tags && tags.length > 0) filter.tags = { $in: tags };
      if (author) filter.author = new mongoose.Types.ObjectId(author);

      // 构建排序条件
      let sort: any = {};
      switch (sortBy) {
        case 'popular':
          sort = { reuseCount: -1, likesCount: -1 };
          break;
        case 'trending':
          sort = { views: -1, likesCount: -1, createdAt: -1 };
          break;
        case 'views':
          sort = { views: -1 };
          break;
        default:
          sort = { createdAt: -1 };
      }

      // 执行查询
      const worksQuery = (Work.find as any)(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('author', 'name avatar') as any;

      const [works, total] = await Promise.all([
        worksQuery.exec() as any,
        (Work.countDocuments as any)(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        works,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('Search works error:', error);
      return {
        success: false,
        error: '搜索作品失败',
      };
    }
  }

  /**
   * 获取推荐作品
   */
  static async getRecommendedWorks(
    userId?: string,
    limit: number = 10,
  ): Promise<WorkResponse> {
    try {
      await connectDB();

      let works: WorkDocument[];

      if (userId) {
        // 基于用户兴趣推荐
        works = await this.getPersonalizedRecommendations(userId, limit);
      } else {
        // 获取热门作品
        works = await (Work.find as any)({
          status: 'published',
          visibility: 'public',
          moderationStatus: 'approved',
        })
          .sort({ qualityScore: -1, reuseCount: -1, likesCount: -1 })
          .limit(limit)
          .populate('author', 'name avatar')
          .exec();
      }

      return {
        success: true,
        works,
      };
    } catch (error) {
      console.error('Get recommended works error:', error);
      return {
        success: false,
        error: '获取推荐作品失败',
      };
    }
  }

  /**
   * 获取用户自己的作品
   */
  static async getUserWorks(
    authorId: string,
    options: {
      status?: 'draft' | 'published' | 'private' | 'archived' | 'all';
      limit?: number;
    } = {},
  ): Promise<{ success: boolean; works: WorkDocument[]; error?: string }> {
    try {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(authorId);
      if (!isValidObjectId) {
        // Demo 登录使用的虚拟 ID，此时直接返回空结果以避免 400
        if (process.env.NODE_ENV !== 'production') {
          return {
            success: true,
            works: [],
          };
        }

        return {
          success: false,
          error: '无效的用户标识',
          works: [],
        };
      }

      await connectDB();

      const query: Record<string, any> = {
        author: new mongoose.Types.ObjectId(authorId),
      };

      if (options.status && options.status !== 'all') {
        query.status = options.status;
      }

      const works = await (Work.find as any)(query)
        .sort({ updatedAt: -1 })
        .limit(options.limit ?? 50)
        .populate('author', 'name avatar')
        .exec();

      works.forEach((work) => {
        if (!work.coverImageUrl) {
          work.coverImageUrl = this.extractCoverImage(work.cards);
        }
      });

      return {
        success: true,
        works,
      };
    } catch (error) {
      console.error('Get user works error:', error);
      return {
        success: false,
        error: '获取作品失败',
        works: [],
      };
    }
  }

  /**
   * 点赞作品
   */
  static async toggleLike(
    workId: string,
    userId: string,
  ): Promise<WorkResponse> {
    try {
      await connectDB();

      const work = await (Work.findById as any)(workId);
      if (!work) {
        return {
          success: false,
          error: '作品不存在',
        };
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const likeIndex = work.likes.findIndex((id: mongoose.Types.ObjectId) => id.equals(userObjectId));

      if (likeIndex > -1) {
        // 取消点赞
        work.likes.splice(likeIndex, 1);
        work.likesCount = Math.max(0, work.likesCount - 1);
      } else {
        // 添加点赞
        work.likes.push(userObjectId);
        work.likesCount += 1;
      }

      await work.save();

      return {
        success: true,
        message: likeIndex > -1 ? '取消点赞成功' : '点赞成功',
      };
    } catch (error) {
      console.error('Toggle like error:', error);
      return {
        success: false,
        error: '操作失败',
      };
    }
  }

  /**
   * 验证作品数据
   */
  private static validateWorkData(data: Partial<CreateWorkRequest>): {
    isValid: boolean
    error?: string
  } {
    if (data.title && (data.title.length < 2 || data.title.length > 100)) {
      return {
        isValid: false,
        error: '标题长度应在2-100个字符之间',
      };
    }

    if (data.description && data.description.length > 500) {
      return {
        isValid: false,
        error: '描述长度不能超过500个字符',
      };
    }

    if (data.tags && data.tags.length > 10) {
      return {
        isValid: false,
        error: '标签数量不能超过10个',
      };
    }

    if (data.estimatedTime && (data.estimatedTime < 5 || data.estimatedTime > 300)) {
      return {
        isValid: false,
        error: '预计学习时间应在5-300分钟之间',
      };
    }

    return { isValid: true };
  }

  /**
   * 计算初始质量评分
   */
  private static calculateInitialQualityScore(data: CreateWorkRequest): number {
    let score = 50; // 基础分

    // 标题质量
    if (data.title.length >= 10) score += 10;

    // 描述质量
    if (data.description && data.description.length >= 50) score += 10;

    // 卡片数量
    if (data.cards.length >= 4) score += 10;

    // 标签数量
    if (data.tags.length >= 3) score += 5;

    // 预计时间合理性
    if (data.estimatedTime >= 15 && data.estimatedTime <= 60) score += 5;

    return Math.min(100, score);
  }

  /**
   * 计算质量评分
   */
  private static calculateQualityScore(work: WorkDocument): number {
    let score = 30; // 基础分

    // 内容质量
    if (work.title.length >= 10) score += 10;
    if (work.description && work.description.length >= 50) score += 10;
    if (work.cards.length >= 4) score += 10;
    if (work.tags.length >= 3) score += 5;

    // 社交指标
    if (work.likesCount > 0) score += Math.min(15, work.likesCount * 0.5);
    if (work.reuseCount > 0) score += Math.min(20, work.reuseCount * 2);
    if (work.views > 0) score += Math.min(10, work.views * 0.01);

    return Math.min(100, score);
  }

  /**
   * 检查作品完整性
   */
  private static checkWorkCompleteness(work: WorkDocument): {
    isComplete: boolean
    missingFields: string[]
  } {
    const missingFields: string[] = [];

    if (!work.title || work.title.length < 2) {
      missingFields.push('标题');
    }

    if (!work.knowledgePoint) {
      missingFields.push('知识点');
    }

    if (!work.cards || work.cards.length === 0) {
      missingFields.push('教学卡片');
    }

    if (!work.category) {
      missingFields.push('分类');
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * 获取个性化推荐
   */
  private static async getPersonalizedRecommendations(
    userId: string,
    limit: number,
  ): Promise<WorkDocument[]> {
    const user = await (User.findById as any)(userId).select('_id');
    if (!user) {
      return this.getPopularWorks(limit);
    }

    // 获取推荐作品（不再基于关注关系）
    const recommendedWorks = await (Work.find as any)({
      status: 'published',
      visibility: 'public',
      moderationStatus: 'approved',
      author: { $ne: new mongoose.Types.ObjectId(userId) },
    })
      .sort({ qualityScore: -1, likesCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('author', 'name avatar')
      .exec();

    return recommendedWorks;
  }

  /**
   * 获取热门作品
   */
  private static async getPopularWorks(limit: number): Promise<WorkDocument[]> {
    return (Work.find as any)({
      status: 'published',
      visibility: 'public',
      moderationStatus: 'approved',
    })
      .sort({ reuseCount: -1, likesCount: -1, views: -1 })
      .limit(limit)
      .populate('author', 'name avatar')
      .exec();
  }
}

export default WorkService;
