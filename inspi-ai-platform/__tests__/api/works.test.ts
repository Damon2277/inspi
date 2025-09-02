import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// 简化的API测试，不依赖数据库连接
describe('Works API Integration', () => {
  describe('Work Service Functions', () => {
    it('应该能够导入workService模块', async () => {
      // 动态导入避免模块加载问题
      const workServiceModule = await import('@/lib/services/workService');
      expect(workServiceModule.default).toBeDefined();
      expect(typeof workServiceModule.default.createWork).toBe('function');
      expect(typeof workServiceModule.default.updateWork).toBe('function');
      expect(typeof workServiceModule.default.getWorkById).toBe('function');
      expect(typeof workServiceModule.default.getWorksList).toBe('function');
      expect(typeof workServiceModule.default.deleteWork).toBe('function');
    });

    it('应该能够导入Work模型', async () => {
      const WorkModel = await import('@/lib/models/Work');
      expect(WorkModel.default).toBeDefined();
    });
  });

  describe('API Routes Structure', () => {
    it('应该有正确的API路由文件结构', () => {
      // 检查文件是否存在的简单测试
      expect(() => require('@/app/api/works/route')).not.toThrow();
      expect(() => require('@/app/api/works/[id]/route')).not.toThrow();
      expect(() => require('@/app/api/works/drafts/route')).not.toThrow();
      expect(() => require('@/app/api/works/search/route')).not.toThrow();
    });
  });

  describe('Component Structure', () => {
    it('应该能够导入作品相关组件', async () => {
      const WorkEditor = await import('@/components/works/WorkEditor');
      const WorkPreview = await import('@/components/works/WorkPreview');
      const DraftsList = await import('@/components/works/DraftsList');
      const PublishModal = await import('@/components/works/PublishModal');

      expect(WorkEditor.default).toBeDefined();
      expect(WorkPreview.default).toBeDefined();
      expect(DraftsList.default).toBeDefined();
      expect(PublishModal.default).toBeDefined();
    });
  });
});