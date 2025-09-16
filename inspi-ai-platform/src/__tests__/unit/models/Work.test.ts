/**
 * Work模型关系处理测试
 * 测试Work模型的关系处理、方法功能、数据验证和复杂场景
 */

import mongoose from 'mongoose';
import Work, { WorkDocument, TeachingCard, Attribution } from '@/lib/models/Work';

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    models: {},
    model: jest.fn(),
    Schema: actualMongoose.Schema,
    Types: actualMongoose.Types,
  };
});

describe('Work模型关系处理测试', () => {
  let mockWork: Partial<WorkDocument>;
  let mockTeachingCard: TeachingCard;
  let mockAttribution: Attribution;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock teaching card
    mockTeachingCard = {
      id: 'card-1',
      type: 'visualization',
      title: '可视化卡片',
      content: '这是一个可视化教学卡片的内容',
      editable: true,
    };

    // Setup mock attribution
    mockAttribution = {
      originalAuthor: new mongoose.Types.ObjectId(),
      originalWorkId: new mongoose.Types.ObjectId(),
      originalWorkTitle: '原始作品标题',
    };

    // Setup mock work data
    mockWork = {
      title: '测试教学作品',
      knowledgePoint: '二次方程',
      subject: '数学',
      gradeLevel: '九年级',
      author: new mongoose.Types.ObjectId(),
      cards: [mockTeachingCard],
      tags: ['数学', '方程', '教学'],
      reuseCount: 0,
      attribution: [],
      status: 'draft',
      save: jest.fn().mockResolvedValue(true),
      incrementReuseCount: jest.fn(),
      addAttribution: jest.fn(),
    };
  });

  describe('模型结构验证', () => {
    it('应该定义正确的必填字段', () => {
      // Arrange
      const workSchema = Work.schema;

      // Assert
      expect(workSchema.paths.title.isRequired).toBe(true);
      expect(workSchema.paths.knowledgePoint.isRequired).toBe(true);
      expect(workSchema.paths.subject.isRequired).toBe(true);
      expect(workSchema.paths.gradeLevel.isRequired).toBe(true);
      expect(workSchema.paths.author.isRequired).toBe(true);
    });

    it('应该设置正确的默认值', () => {
      // Arrange
      const workSchema = Work.schema;

      // Assert
      expect(workSchema.paths.reuseCount.defaultValue).toBe(0);
      expect(workSchema.paths.status.defaultValue).toBe('draft');
    });

    it('应该定义正确的枚举值', () => {
      // Arrange
      const workSchema = Work.schema;

      // Assert
      expect(workSchema.paths.status.enumValues).toEqual(['draft', 'published', 'archived']);
    });

    it('应该设置正确的索引', () => {
      // Arrange
      const workSchema = Work.schema;
      const indexes = workSchema.indexes();

      // Assert
      const authorStatusIndex = indexes.find(index => 
        index[0].author === 1 && index[0].status === 1
      );
      const subjectGradeIndex = indexes.find(index => 
        index[0].subject === 1 && index[0].gradeLevel === 1
      );
      const reuseCountIndex = indexes.find(index => index[0].reuseCount === -1);
      const createdAtIndex = indexes.find(index => index[0].createdAt === -1);

      expect(authorStatusIndex).toBeDefined();
      expect(subjectGradeIndex).toBeDefined();
      expect(reuseCountIndex).toBeDefined();
      expect(createdAtIndex).toBeDefined();
    });

    it('应该设置时间戳', () => {
      // Arrange
      const workSchema = Work.schema;

      // Assert
      expect(workSchema.options.timestamps).toBe(true);
    });
  });

  describe('教学卡片结构验证', () => {
    it('应该验证教学卡片的必填字段', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        cards: [{
          id: 'card-1',
          type: 'visualization',
          title: '测试卡片',
          content: '测试内容',
          editable: true,
        }],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
    });

    it('应该验证教学卡片类型枚举', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        cards: [{
          id: 'card-1',
          type: 'invalid-type' as any,
          title: '测试卡片',
          content: '测试内容',
          editable: true,
        }],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError?.errors['cards.0.type']).toBeDefined();
    });

    it('应该设置教学卡片的默认值', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        cards: [{
          id: 'card-1',
          type: 'visualization',
          title: '测试卡片',
          content: '测试内容',
          // editable 未设置，应该使用默认值
        }],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.cards[0].editable).toBe(true);
    });

    it('应该支持多种教学卡片类型', () => {
      // Arrange
      const cardTypes = ['visualization', 'analogy', 'thinking', 'interaction'];
      const cards = cardTypes.map((type, index) => ({
        id: `card-${index}`,
        type: type as any,
        title: `${type}卡片`,
        content: `${type}内容`,
        editable: true,
      }));

      const work = new Work({
        ...mockWork,
        cards,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.cards).toHaveLength(4);
      work.cards.forEach((card, index) => {
        expect(card.type).toBe(cardTypes[index]);
      });
    });
  });

  describe('归属信息结构验证', () => {
    it('应该验证归属信息的必填字段', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        attribution: [{
          originalAuthor: new mongoose.Types.ObjectId(),
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '原始作品',
        }],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
    });

    it('应该验证ObjectId字段的格式', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        attribution: [{
          originalAuthor: 'invalid-object-id' as any,
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '原始作品',
        }],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError?.errors['attribution.0.originalAuthor']).toBeDefined();
    });

    it('应该支持多个归属信息', () => {
      // Arrange
      const attributions = Array(3).fill(null).map((_, index) => ({
        originalAuthor: new mongoose.Types.ObjectId(),
        originalWorkId: new mongoose.Types.ObjectId(),
        originalWorkTitle: `原始作品 ${index + 1}`,
      }));

      const work = new Work({
        ...mockWork,
        attribution: attributions,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.attribution).toHaveLength(3);
    });
  });

  describe('incrementReuseCount方法测试', () => {
    it('应该正确增加复用次数', async () => {
      // Arrange
      const work = {
        reuseCount: 5,
        save: jest.fn().mockResolvedValue(true),
        incrementReuseCount: Work.schema.methods.incrementReuseCount,
      };

      // Act
      await work.incrementReuseCount();

      // Assert
      expect(work.reuseCount).toBe(6);
      expect(work.save).toHaveBeenCalled();
    });

    it('应该从零开始增加复用次数', async () => {
      // Arrange
      const work = {
        reuseCount: 0,
        save: jest.fn().mockResolvedValue(true),
        incrementReuseCount: Work.schema.methods.incrementReuseCount,
      };

      // Act
      await work.incrementReuseCount();

      // Assert
      expect(work.reuseCount).toBe(1);
    });

    it('应该处理大数值的复用次数', async () => {
      // Arrange
      const work = {
        reuseCount: Number.MAX_SAFE_INTEGER - 1,
        save: jest.fn().mockResolvedValue(true),
        incrementReuseCount: Work.schema.methods.incrementReuseCount,
      };

      // Act
      await work.incrementReuseCount();

      // Assert
      expect(work.reuseCount).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('应该处理保存失败的情况', async () => {
      // Arrange
      const work = {
        reuseCount: 5,
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
        incrementReuseCount: Work.schema.methods.incrementReuseCount,
      };

      // Act & Assert
      await expect(work.incrementReuseCount()).rejects.toThrow('Save failed');
      expect(work.reuseCount).toBe(6); // 数值仍然增加了
    });
  });

  describe('addAttribution方法测试', () => {
    it('应该正确添加归属信息', async () => {
      // Arrange
      const work = {
        attribution: [],
        save: jest.fn().mockResolvedValue(true),
        addAttribution: Work.schema.methods.addAttribution,
      };

      const newAttribution = {
        originalAuthor: new mongoose.Types.ObjectId(),
        originalWorkId: new mongoose.Types.ObjectId(),
        originalWorkTitle: '新的原始作品',
      };

      // Act
      await work.addAttribution(newAttribution);

      // Assert
      expect(work.attribution).toHaveLength(1);
      expect(work.attribution[0]).toEqual(newAttribution);
      expect(work.save).toHaveBeenCalled();
    });

    it('应该支持添加多个归属信息', async () => {
      // Arrange
      const existingAttribution = {
        originalAuthor: new mongoose.Types.ObjectId(),
        originalWorkId: new mongoose.Types.ObjectId(),
        originalWorkTitle: '现有作品',
      };

      const work = {
        attribution: [existingAttribution],
        save: jest.fn().mockResolvedValue(true),
        addAttribution: Work.schema.methods.addAttribution,
      };

      const newAttribution = {
        originalAuthor: new mongoose.Types.ObjectId(),
        originalWorkId: new mongoose.Types.ObjectId(),
        originalWorkTitle: '新作品',
      };

      // Act
      await work.addAttribution(newAttribution);

      // Assert
      expect(work.attribution).toHaveLength(2);
      expect(work.attribution[1]).toEqual(newAttribution);
    });

    it('应该处理保存失败的情况', async () => {
      // Arrange
      const work = {
        attribution: [],
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
        addAttribution: Work.schema.methods.addAttribution,
      };

      const newAttribution = mockAttribution;

      // Act & Assert
      await expect(work.addAttribution(newAttribution)).rejects.toThrow('Save failed');
      expect(work.attribution).toHaveLength(1); // 归属信息仍然添加了
    });
  });

  describe('静态方法测试', () => {
    describe('getPopularWorks方法', () => {
      it('应该返回热门作品', async () => {
        // Arrange
        const mockWorks = [
          { title: '热门作品1', reuseCount: 100, author: { name: '作者1' } },
          { title: '热门作品2', reuseCount: 80, author: { name: '作者2' } },
        ];

        Work.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(mockWorks),
            }),
          }),
        });

        // Act
        const result = await Work.getPopularWorks(10);

        // Assert
        expect(Work.find).toHaveBeenCalledWith({ status: 'published' });
        expect(result).toEqual(mockWorks);
      });

      it('应该使用默认限制数量', async () => {
        // Arrange
        Work.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

        // Act
        await Work.getPopularWorks();

        // Assert
        const mockChain = Work.find().sort().limit;
        expect(mockChain).toHaveBeenCalledWith(10);
      });

      it('应该按复用次数降序排列', async () => {
        // Arrange
        Work.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

        // Act
        await Work.getPopularWorks();

        // Assert
        const mockChain = Work.find().sort;
        expect(mockChain).toHaveBeenCalledWith({ reuseCount: -1 });
      });
    });

    describe('getWorksBySubject方法', () => {
      it('应该返回指定学科的作品', async () => {
        // Arrange
        const subject = '数学';
        const mockWorks = [
          { title: '数学作品1', subject: '数学' },
          { title: '数学作品2', subject: '数学' },
        ];

        Work.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(mockWorks),
            }),
          }),
        });

        // Act
        const result = await Work.getWorksBySubject(subject, 20);

        // Assert
        expect(Work.find).toHaveBeenCalledWith({ subject, status: 'published' });
        expect(result).toEqual(mockWorks);
      });

      it('应该使用默认限制数量', async () => {
        // Arrange
        Work.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

        // Act
        await Work.getWorksBySubject('数学');

        // Assert
        const mockChain = Work.find().sort().limit;
        expect(mockChain).toHaveBeenCalledWith(20);
      });

      it('应该按创建时间降序排列', async () => {
        // Arrange
        Work.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

        // Act
        await Work.getWorksBySubject('数学');

        // Assert
        const mockChain = Work.find().sort;
        expect(mockChain).toHaveBeenCalledWith({ createdAt: -1 });
      });
    });
  });

  describe('关系处理测试', () => {
    it('应该正确处理作者关系', () => {
      // Arrange
      const authorId = new mongoose.Types.ObjectId();
      const work = new Work({
        ...mockWork,
        author: authorId,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.author).toEqual(authorId);
    });

    it('应该正确处理原始作品关系', () => {
      // Arrange
      const originalWorkId = new mongoose.Types.ObjectId();
      const work = new Work({
        ...mockWork,
        originalWork: originalWorkId,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.originalWork).toEqual(originalWorkId);
    });

    it('应该支持作品链式关系', () => {
      // Arrange
      const originalWorkId = new mongoose.Types.ObjectId();
      const attribution = {
        originalAuthor: new mongoose.Types.ObjectId(),
        originalWorkId: originalWorkId,
        originalWorkTitle: '原始作品',
      };

      const work = new Work({
        ...mockWork,
        originalWork: originalWorkId,
        attribution: [attribution],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.originalWork).toEqual(originalWorkId);
      expect(work.attribution[0].originalWorkId).toEqual(originalWorkId);
    });

    it('应该处理复杂的归属链', () => {
      // Arrange
      const attributions = [
        {
          originalAuthor: new mongoose.Types.ObjectId(),
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '第一代作品',
        },
        {
          originalAuthor: new mongoose.Types.ObjectId(),
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '第二代作品',
        },
        {
          originalAuthor: new mongoose.Types.ObjectId(),
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '第三代作品',
        },
      ];

      const work = new Work({
        ...mockWork,
        attribution: attributions,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.attribution).toHaveLength(3);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空的教学卡片数组', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        cards: [],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.cards).toHaveLength(0);
    });

    it('应该处理大量教学卡片', () => {
      // Arrange
      const cards = Array(100).fill(null).map((_, index) => ({
        id: `card-${index}`,
        type: 'visualization' as const,
        title: `卡片 ${index}`,
        content: `内容 ${index}`,
        editable: true,
      }));

      const work = new Work({
        ...mockWork,
        cards,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.cards).toHaveLength(100);
    });

    it('应该处理极长的字符串字段', () => {
      // Arrange
      const longString = 'a'.repeat(10000);
      const work = new Work({
        ...mockWork,
        title: longString,
        knowledgePoint: longString,
        cards: [{
          id: 'card-1',
          type: 'visualization',
          title: longString,
          content: longString,
          editable: true,
        }],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
    });

    it('应该处理特殊字符和Unicode', () => {
      // Arrange
      const specialString = '特殊字符 🚀 !@#$%^&*() 测试';
      const work = new Work({
        ...mockWork,
        title: specialString,
        knowledgePoint: specialString,
        tags: [specialString],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.title).toBe(specialString);
    });

    it('应该处理空标签数组', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        tags: [],
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.tags).toHaveLength(0);
    });

    it('应该处理大量标签', () => {
      // Arrange
      const tags = Array(100).fill(null).map((_, index) => `标签${index}`);
      const work = new Work({
        ...mockWork,
        tags,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.tags).toHaveLength(100);
    });
  });

  describe('性能测试', () => {
    it('应该快速创建作品实例', () => {
      // Arrange
      const startTime = Date.now();

      // Act
      for (let i = 0; i < 1000; i++) {
        new Work({
          ...mockWork,
          title: `作品 ${i}`,
        });
      }

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成1000个实例创建
    });

    it('应该快速处理大量教学卡片', () => {
      // Arrange
      const cards = Array(50).fill(null).map((_, index) => ({
        id: `card-${index}`,
        type: 'visualization' as const,
        title: `卡片 ${index}`,
        content: `内容 ${index}`,
        editable: true,
      }));

      const startTime = Date.now();

      // Act
      for (let i = 0; i < 100; i++) {
        new Work({
          ...mockWork,
          title: `作品 ${i}`,
          cards,
        });
      }

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该快速执行方法调用', async () => {
      // Arrange
      const work = {
        reuseCount: 0,
        attribution: [],
        save: jest.fn().mockResolvedValue(true),
        incrementReuseCount: Work.schema.methods.incrementReuseCount,
        addAttribution: Work.schema.methods.addAttribution,
      };

      const startTime = Date.now();

      // Act
      for (let i = 0; i < 1000; i++) {
        await work.incrementReuseCount();
      }

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成1000次调用
      expect(work.reuseCount).toBe(1000);
    });
  });

  describe('数据一致性测试', () => {
    it('应该保持复用次数的一致性', async () => {
      // Arrange
      const work = {
        reuseCount: 0,
        save: jest.fn().mockResolvedValue(true),
        incrementReuseCount: Work.schema.methods.incrementReuseCount,
      };

      // Act - 并发增加复用次数
      const promises = Array(10).fill(null).map(() => work.incrementReuseCount());
      await Promise.all(promises);

      // Assert
      expect(work.reuseCount).toBe(10);
    });

    it('应该保持归属信息的完整性', async () => {
      // Arrange
      const work = {
        attribution: [],
        save: jest.fn().mockResolvedValue(true),
        addAttribution: Work.schema.methods.addAttribution,
      };

      const attributions = Array(5).fill(null).map((_, index) => ({
        originalAuthor: new mongoose.Types.ObjectId(),
        originalWorkId: new mongoose.Types.ObjectId(),
        originalWorkTitle: `作品 ${index}`,
      }));

      // Act
      for (const attribution of attributions) {
        await work.addAttribution(attribution);
      }

      // Assert
      expect(work.attribution).toHaveLength(5);
      work.attribution.forEach((attr, index) => {
        expect(attr.originalWorkTitle).toBe(`作品 ${index}`);
      });
    });

    it('应该正确处理状态转换', () => {
      // Arrange
      const work = new Work({
        ...mockWork,
        status: 'draft',
      });

      // Act
      work.status = 'published';

      // Assert
      expect(work.status).toBe('published');
    });
  });

  describe('复杂场景测试', () => {
    it('应该处理作品的完整生命周期', async () => {
      // Arrange
      const work = {
        status: 'draft',
        reuseCount: 0,
        attribution: [],
        save: jest.fn().mockResolvedValue(true),
        incrementReuseCount: Work.schema.methods.incrementReuseCount,
        addAttribution: Work.schema.methods.addAttribution,
      };

      // Act - 模拟完整生命周期
      // 1. 发布作品
      work.status = 'published';
      
      // 2. 被复用多次
      for (let i = 0; i < 5; i++) {
        await work.incrementReuseCount();
      }
      
      // 3. 添加归属信息
      await work.addAttribution({
        originalAuthor: new mongoose.Types.ObjectId(),
        originalWorkId: new mongoose.Types.ObjectId(),
        originalWorkTitle: '衍生作品',
      });

      // Assert
      expect(work.status).toBe('published');
      expect(work.reuseCount).toBe(5);
      expect(work.attribution).toHaveLength(1);
    });

    it('应该处理复杂的教学卡片组合', () => {
      // Arrange
      const complexCards = [
        {
          id: 'concept-card',
          type: 'visualization' as const,
          title: '概念可视化',
          content: '复杂的概念解释内容',
          editable: true,
        },
        {
          id: 'analogy-card',
          type: 'analogy' as const,
          title: '类比说明',
          content: '生动的类比内容',
          editable: false,
        },
        {
          id: 'thinking-card',
          type: 'thinking' as const,
          title: '思维导图',
          content: '思维过程展示',
          editable: true,
        },
        {
          id: 'interaction-card',
          type: 'interaction' as const,
          title: '互动练习',
          content: '互动式学习内容',
          editable: true,
        },
      ];

      const work = new Work({
        ...mockWork,
        cards: complexCards,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.cards).toHaveLength(4);
      expect(work.cards.map(card => card.type)).toEqual([
        'visualization', 'analogy', 'thinking', 'interaction'
      ]);
    });

    it('应该处理多层级的作品关系', () => {
      // Arrange
      const multiLevelAttribution = [
        {
          originalAuthor: new mongoose.Types.ObjectId(),
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '原始作品',
        },
        {
          originalAuthor: new mongoose.Types.ObjectId(),
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '第一次改编',
        },
        {
          originalAuthor: new mongoose.Types.ObjectId(),
          originalWorkId: new mongoose.Types.ObjectId(),
          originalWorkTitle: '第二次改编',
        },
      ];

      const work = new Work({
        ...mockWork,
        attribution: multiLevelAttribution,
        originalWork: multiLevelAttribution[0].originalWorkId,
      });

      // Act
      const validationError = work.validateSync();

      // Assert
      expect(validationError).toBeNull();
      expect(work.attribution).toHaveLength(3);
      expect(work.originalWork).toEqual(multiLevelAttribution[0].originalWorkId);
    });
  });
});