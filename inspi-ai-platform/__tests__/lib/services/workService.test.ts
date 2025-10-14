import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import ContributionLog from '@/lib/models/ContributionLog';
import User from '@/lib/models/User';
import Work from '@/lib/models/Work';
import workService from '@/lib/services/workService';

let mongoServer: MongoMemoryServer;

beforeEach(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('WorkService', () => {
  let testUser: any;
  let testWorkData: any;

  beforeEach(async () => {
    // 创建测试用户
    testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      contributionScore: 0,
    });

    testWorkData = {
      title: '测试作品',
      knowledgePoint: '二次函数',
      subject: '数学',
      gradeLevel: '高中一年级',
      cards: [
        {
          id: 'card1',
          type: 'visualization' as const,
          title: '可视化卡片',
          content: '这是一个可视化卡片',
          editable: true,
        },
      ],
      tags: ['数学', '函数'],
    };
  });

  describe('createWork', () => {
    it('应该成功创建草稿作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'draft',
      });

      expect(work).toBeDefined();
      expect(work.title).toBe(testWorkData.title);
      expect(work.status).toBe('draft');
      expect(work.author.toString()).toBe(testUser._id.toString());
    });

    it('应该成功创建并发布作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'published',
      });

      expect(work.status).toBe('published');

      // 检查贡献度记录
      const contributionLog = await ContributionLog.findOne({
        userId: testUser._id,
        workId: work._id,
        type: 'creation',
      });
      expect(contributionLog).toBeDefined();
      expect(contributionLog?.points).toBe(10);

      // 检查用户贡献度更新
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.contributionScore).toBe(10);
    });

    it('创建作品时缺少必填字段应该失败', async () => {
      await expect(
        workService.createWork(testUser._id.toString(), {
          title: '',
          knowledgePoint: '',
          subject: '',
          gradeLevel: '',
          cards: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe('updateWork', () => {
    it('应该成功更新作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), testWorkData);

      const updatedWork = await workService.updateWork(
        work._id.toString(),
        testUser._id.toString(),
        { title: '更新后的标题' },
      );

      expect(updatedWork.title).toBe('更新后的标题');
    });

    it('非作者不能更新作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), testWorkData);
      const otherUser = await User.create({
        email: 'other@example.com',
        name: 'Other User',
      });

      await expect(
        workService.updateWork(
          work._id.toString(),
          otherUser._id.toString(),
          { title: '恶意更新' },
        ),
      ).rejects.toThrow('作品不存在或无权限修改');
    });

    it('从草稿发布应该记录贡献度', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'draft',
      });

      await workService.updateWork(
        work._id.toString(),
        testUser._id.toString(),
        { status: 'published' },
      );

      const contributionLog = await ContributionLog.findOne({
        userId: testUser._id,
        workId: work._id,
        type: 'creation',
      });
      expect(contributionLog).toBeDefined();
    });
  });

  describe('getWorkById', () => {
    it('应该获取已发布的作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'published',
      });

      const retrievedWork = await workService.getWorkById(work._id.toString());
      expect(retrievedWork).toBeDefined();
      expect(retrievedWork?._id.toString()).toBe(work._id.toString());
    });

    it('未登录用户不能查看草稿', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'draft',
      });

      const retrievedWork = await workService.getWorkById(work._id.toString());
      expect(retrievedWork).toBeNull();
    });

    it('作者可以查看自己的草稿', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'draft',
      });

      const retrievedWork = await workService.getWorkById(
        work._id.toString(),
        testUser._id.toString(),
      );
      expect(retrievedWork).toBeDefined();
    });
  });

  describe('getWorksList', () => {
    beforeEach(async () => {
      // 创建多个测试作品
      await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        title: '作品1',
        subject: '数学',
        status: 'published',
      });

      await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        title: '作品2',
        subject: '语文',
        status: 'published',
      });

      await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        title: '草稿作品',
        status: 'draft',
      });
    });

    it('应该获取已发布作品列表', async () => {
      const result = await workService.getWorksList({});

      expect(result.works).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.works.every(work => work.status === 'published')).toBe(true);
    });

    it('应该按学科筛选作品', async () => {
      const result = await workService.getWorksList({ subject: '数学' });

      expect(result.works).toHaveLength(1);
      expect(result.works[0].subject).toBe('数学');
    });

    it('应该获取指定作者的作品', async () => {
      const result = await workService.getWorksList({
        author: testUser._id.toString(),
        status: 'draft',
      });

      expect(result.works).toHaveLength(1);
      expect(result.works[0].title).toBe('草稿作品');
    });

    it('应该支持分页', async () => {
      const result = await workService.getWorksList({
        page: 1,
        limit: 1,
      });

      expect(result.works).toHaveLength(1);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('publishWork', () => {
    it('应该成功发布草稿', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'draft',
      });

      const publishedWork = await workService.publishWork(
        work._id.toString(),
        testUser._id.toString(),
      );

      expect(publishedWork.status).toBe('published');
    });

    it('不能发布已发布的作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        status: 'published',
      });

      await expect(
        workService.publishWork(work._id.toString(), testUser._id.toString()),
      ).rejects.toThrow('草稿不存在或已发布');
    });
  });

  describe('saveDraft', () => {
    it('应该创建新草稿', async () => {
      const draft = await workService.saveDraft(testUser._id.toString(), {
        title: '自动保存草稿',
        knowledgePoint: '测试知识点',
      });

      expect(draft.status).toBe('draft');
      expect(draft.title).toBe('自动保存草稿');
    });

    it('应该更新现有草稿', async () => {
      // 先创建一个草稿
      await workService.saveDraft(testUser._id.toString(), {
        title: '未命名作品',
        knowledgePoint: '测试知识点',
      });

      // 再次保存应该更新现有草稿
      const updatedDraft = await workService.saveDraft(testUser._id.toString(), {
        title: '更新的标题',
        knowledgePoint: '测试知识点',
      });

      expect(updatedDraft.title).toBe('更新的标题');

      // 确保只有一个草稿
      const drafts = await workService.getUserDrafts(testUser._id.toString());
      expect(drafts).toHaveLength(1);
    });
  });

  describe('searchWorks', () => {
    beforeEach(async () => {
      await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        title: '二次函数教学设计',
        knowledgePoint: '二次函数',
        tags: ['数学', '函数'],
        status: 'published',
      });

      await workService.createWork(testUser._id.toString(), {
        ...testWorkData,
        title: '一次函数教学设计',
        knowledgePoint: '一次函数',
        tags: ['数学', '函数'],
        status: 'published',
      });
    });

    it('应该按标题搜索作品', async () => {
      const results = await workService.searchWorks('二次函数');

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('二次函数');
    });

    it('应该按知识点搜索作品', async () => {
      const results = await workService.searchWorks('函数');

      expect(results).toHaveLength(2);
    });

    it('应该按标签搜索作品', async () => {
      const results = await workService.searchWorks('数学');

      expect(results).toHaveLength(2);
    });

    it('应该支持筛选条件', async () => {
      const results = await workService.searchWorks('函数', {
        limit: 1,
      });

      expect(results).toHaveLength(1);
    });
  });

  describe('deleteWork', () => {
    it('应该成功删除作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), testWorkData);

      await workService.deleteWork(work._id.toString(), testUser._id.toString());

      const deletedWork = await Work.findById(work._id);
      expect(deletedWork).toBeNull();
    });

    it('非作者不能删除作品', async () => {
      const work = await workService.createWork(testUser._id.toString(), testWorkData);
      const otherUser = await User.create({
        email: 'other@example.com',
        name: 'Other User',
      });

      await expect(
        workService.deleteWork(work._id.toString(), otherUser._id.toString()),
      ).rejects.toThrow('作品不存在或无权限删除');
    });
  });
});
