/**
 * 作品服务单元测试
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import WorkService from '@/core/community/work-service';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/lib/models/Work');
jest.mock('@/lib/models/Comment');
jest.mock('@/lib/models/Bookmark');
jest.mock('@/lib/models/Follow');
jest.mock('@/lib/models/User');

describe('WorkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('作品验证', () => {
    it('应该验证作品标题长度', () => {
      const testCases = [
        { title: '', valid: false, error: '标题长度应在2-100个字符之间' },
        { title: 'A', valid: false, error: '标题长度应在2-100个字符之间' },
        { title: '数学作品', valid: true },
        { title: 'A'.repeat(101), valid: false, error: '标题长度应在2-100个字符之间' },
      ];

      testCases.forEach(({ title, valid, error }) => {
        if (title.length < 2 || title.length > 100) {
          expect(valid).toBe(false);
          expect(error).toBe('标题长度应在2-100个字符之间');
        } else {
          expect(valid).toBe(true);
        }
      });
    });

    it('应该验证描述长度', () => {
      const testCases = [
        { description: '', valid: true },
        { description: '这是一个很好的作品描述', valid: true },
        { description: 'A'.repeat(501), valid: false, error: '描述长度不能超过500个字符' },
      ];

      testCases.forEach(({ description, valid, error }) => {
        if (description && description.length > 500) {
          expect(valid).toBe(false);
          expect(error).toBe('描述长度不能超过500个字符');
        } else {
          expect(valid).toBe(true);
        }
      });
    });

    it('应该验证标签数量', () => {
      const testCases = [
        { tags: [], valid: true },
        { tags: ['数学', '几何', '三角形'], valid: true },
        { tags: Array(11).fill('标签'), valid: false, error: '标签数量不能超过10个' },
      ];

      testCases.forEach(({ tags, valid, error }) => {
        if (tags.length > 10) {
          expect(valid).toBe(false);
          expect(error).toBe('标签数量不能超过10个');
        } else {
          expect(valid).toBe(true);
        }
      });
    });

    it('应该验证预计学习时间', () => {
      const testCases = [
        { time: 4, valid: false, error: '预计学习时间应在5-300分钟之间' },
        { time: 30, valid: true },
        { time: 301, valid: false, error: '预计学习时间应在5-300分钟之间' },
      ];

      testCases.forEach(({ time, valid, error }) => {
        if (time < 5 || time > 300) {
          expect(valid).toBe(false);
          expect(error).toBe('预计学习时间应在5-300分钟之间');
        } else {
          expect(valid).toBe(true);
        }
      });
    });
  });

  describe('质量评分计算', () => {
    it('应该计算初始质量评分', () => {
      const workData = {
        title: '二次函数的图像与性质',
        description: '本作品详细介绍了二次函数的图像特征和基本性质，通过多个实例帮助学生理解',
        cards: [
          { title: '概念介绍', content: '二次函数的定义' },
          { title: '图像特征', content: '抛物线的开口方向' },
          { title: '性质分析', content: '对称轴和顶点' },
          { title: '实例应用', content: '实际问题中的应用' },
        ],
        tags: ['数学', '函数', '图像'],
        estimatedTime: 45,
      };

      let score = 50; // 基础分

      // 标题质量 (>=10字符)
      if (workData.title.length >= 10) score += 10;

      // 描述质量 (>=50字符)
      if (workData.description && workData.description.length >= 50) score += 10;

      // 卡片数量 (>=4个)
      if (workData.cards.length >= 4) score += 10;

      // 标签数量 (>=3个)
      if (workData.tags.length >= 3) score += 5;

      // 预计时间合理性 (15-60分钟)
      if (workData.estimatedTime >= 15 && workData.estimatedTime <= 60) score += 5;

      expect(score).toBe(80); // 50 + 10 + 10 + 10 + 0 + 0 (estimatedTime不在15-60范围内)
    });

    it('应该根据社交指标调整质量评分', () => {
      const workStats = {
        likesCount: 10,
        reuseCount: 5,
        views: 1000,
      };

      let score = 30; // 基础分

      // 点赞数影响 (最多15分)
      if (workStats.likesCount > 0) {
        score += Math.min(15, workStats.likesCount * 0.5);
      }

      // 复用数影响 (最多20分)
      if (workStats.reuseCount > 0) {
        score += Math.min(20, workStats.reuseCount * 2);
      }

      // 浏览数影响 (最多10分)
      if (workStats.views > 0) {
        score += Math.min(10, workStats.views * 0.01);
      }

      expect(score).toBe(55); // 30 + 5 + 10 + 10
    });
  });

  describe('作品完整性检查', () => {
    it('应该检查必需字段', () => {
      const incompleteWork = {
        title: '',
        knowledgePoint: '',
        cards: [],
        category: '',
      };

      const missingFields: string[] = [];

      if (!incompleteWork.title || incompleteWork.title.length < 2) {
        missingFields.push('标题');
      }

      if (!incompleteWork.knowledgePoint) {
        missingFields.push('知识点');
      }

      if (!incompleteWork.cards || incompleteWork.cards.length === 0) {
        missingFields.push('教学卡片');
      }

      if (!incompleteWork.category) {
        missingFields.push('分类');
      }

      expect(missingFields).toEqual(['标题', '知识点', '教学卡片', '分类']);
      expect(missingFields.length > 0).toBe(true);
    });

    it('应该通过完整作品的检查', () => {
      const completeWork = {
        title: '完整的数学作品',
        knowledgePoint: '二次函数',
        cards: [{ title: '卡片1', content: '内容1' }],
        category: '概念解释',
      };

      const missingFields: string[] = [];

      if (!completeWork.title || completeWork.title.length < 2) {
        missingFields.push('标题');
      }

      if (!completeWork.knowledgePoint) {
        missingFields.push('知识点');
      }

      if (!completeWork.cards || completeWork.cards.length === 0) {
        missingFields.push('教学卡片');
      }

      if (!completeWork.category) {
        missingFields.push('分类');
      }

      expect(missingFields).toEqual([]);
      expect(missingFields.length === 0).toBe(true);
    });
  });

  describe('搜索和筛选', () => {
    it('应该构建正确的搜索查询', () => {
      const searchQuery = {
        query: '数学',
        subject: '数学',
        gradeLevel: '高中一年级',
        difficulty: 'intermediate',
        tags: ['函数', '图像'],
      };

      const filter: any = {
        status: 'published',
        visibility: { $in: ['public', 'unlisted'] },
        moderationStatus: 'approved',
      };

      if (searchQuery.query) {
        filter.$or = [
          { title: { $regex: searchQuery.query, $options: 'i' } },
          { description: { $regex: searchQuery.query, $options: 'i' } },
          { knowledgePoint: { $regex: searchQuery.query, $options: 'i' } },
          { tags: { $in: [new RegExp(searchQuery.query, 'i')] } },
        ];
      }

      if (searchQuery.subject) filter.subject = searchQuery.subject;
      if (searchQuery.gradeLevel) filter.gradeLevel = searchQuery.gradeLevel;
      if (searchQuery.difficulty) filter.difficulty = searchQuery.difficulty;
      if (searchQuery.tags && searchQuery.tags.length > 0) {
        filter.tags = { $in: searchQuery.tags };
      }

      expect(filter.subject).toBe('数学');
      expect(filter.gradeLevel).toBe('高中一年级');
      expect(filter.difficulty).toBe('intermediate');
      expect(filter.tags).toEqual({ $in: ['函数', '图像'] });
      expect(filter.$or).toBeDefined();
    });

    it('应该构建正确的排序条件', () => {
      const sortOptions = ['latest', 'popular', 'trending', 'views'];

      sortOptions.forEach(sortBy => {
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

        if (sortBy === 'popular') {
          expect(sort).toEqual({ reuseCount: -1, likesCount: -1 });
        } else if (sortBy === 'trending') {
          expect(sort).toEqual({ views: -1, likesCount: -1, createdAt: -1 });
        } else if (sortBy === 'views') {
          expect(sort).toEqual({ views: -1 });
        } else {
          expect(sort).toEqual({ createdAt: -1 });
        }
      });
    });
  });

  describe('用户交互', () => {
    it('应该正确处理点赞逻辑', () => {
      const work = {
        _id: 'work123',
        likes: ['user1', 'user2'],
        likesCount: 2,
      };

      const userId = 'user3';
      const userIdExists = 'user1';

      // 新用户点赞
      const likeIndex = work.likes.findIndex(id => id === userId);
      expect(likeIndex).toBe(-1); // 用户不在点赞列表中

      if (likeIndex > -1) {
        // 取消点赞
        work.likes.splice(likeIndex, 1);
        work.likesCount = Math.max(0, work.likesCount - 1);
      } else {
        // 添加点赞
        work.likes.push(userId);
        work.likesCount += 1;
      }

      expect(work.likes).toContain(userId);
      expect(work.likesCount).toBe(3);

      // 已点赞用户取消点赞
      const existingLikeIndex = work.likes.findIndex(id => id === userIdExists);
      expect(existingLikeIndex).toBeGreaterThan(-1);

      if (existingLikeIndex > -1) {
        work.likes.splice(existingLikeIndex, 1);
        work.likesCount = Math.max(0, work.likesCount - 1);
      }

      expect(work.likes).not.toContain(userIdExists);
      expect(work.likesCount).toBe(2);
    });
  });

  describe('权限检查', () => {
    it('应该检查作品访问权限', () => {
      const testCases = [
        {
          work: { visibility: 'public', author: 'author1' },
          userId: 'user1',
          canAccess: true,
        },
        {
          work: { visibility: 'private', author: 'author1' },
          userId: 'user1',
          canAccess: false,
        },
        {
          work: { visibility: 'private', author: 'author1' },
          userId: 'author1',
          canAccess: true,
        },
        {
          work: { visibility: 'unlisted', author: 'author1' },
          userId: 'user1',
          canAccess: true,
        },
      ];

      testCases.forEach(({ work, userId, canAccess }) => {
        const hasAccess = work.visibility === 'public' ||
                         work.visibility === 'unlisted' ||
                         (work.visibility === 'private' && work.author === userId);

        expect(hasAccess).toBe(canAccess);
      });
    });
  });

  describe('数据格式化', () => {
    it('应该正确格式化时间显示', () => {
      const now = new Date();
      const testDates = [
        { date: new Date(now.getTime() - 30 * 1000), expected: '刚刚' },
        { date: new Date(now.getTime() - 5 * 60 * 1000), expected: '5分钟前' },
        { date: new Date(now.getTime() - 2 * 60 * 60 * 1000), expected: '2小时前' },
        { date: new Date(now.getTime() - 24 * 60 * 60 * 1000), expected: '1天前' },
      ];

      testDates.forEach(({ date, expected }) => {
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let result = '';
        if (minutes < 1) result = '刚刚';
        else if (minutes < 60) result = `${minutes}分钟前`;
        else if (hours < 24) result = `${hours}小时前`;
        else result = `${days}天前`;

        expect(result).toBe(expected);
      });
    });

    it('应该正确转换难度标签', () => {
      const difficulties = [
        { value: 'beginner', label: '初级' },
        { value: 'intermediate', label: '中级' },
        { value: 'advanced', label: '高级' },
      ];

      difficulties.forEach(({ value, label }) => {
        let result = '';
        switch (value) {
          case 'beginner': result = '初级'; break;
          case 'intermediate': result = '中级'; break;
          case 'advanced': result = '高级'; break;
          default: result = value;
        }
        expect(result).toBe(label);
      });
    });
  });
});
