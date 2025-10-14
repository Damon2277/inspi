/**
 * 套餐管理服务单元测试
 */

import { UserTier } from '@/shared/types/subscription';

import { CreatePlanRequest, UpdatePlanRequest } from '../plan-model';
import { planService } from '../plan-service';

describe('PlanService', () => {
  describe('createPlan', () => {
    it('应该成功创建新套餐', async () => {
      const createRequest: CreatePlanRequest = {
        name: '测试套餐',
        tier: 'basic',
        monthlyPrice: 99,
        yearlyPrice: 990,
        quotas: {
          dailyCreateQuota: 10,
          dailyReuseQuota: 3,
          maxExportsPerDay: 30,
          maxGraphNodes: -1,
        },
        features: ['高清导出', '智能分析'],
        description: '这是一个测试套餐',
        metadata: {
          targetAudience: ['测试用户'],
          useCases: ['测试场景'],
          limitations: ['测试限制'],
          benefits: ['测试收益'],
          comparisonPoints: ['测试对比'],
          marketingTags: ['测试'],
        },
      };

      const plan = await planService.createPlan(createRequest);

      expect(plan).toBeDefined();
      expect(plan.name).toBe('测试套餐');
      expect(plan.tier).toBe('basic');
      expect(plan.monthlyPrice).toBe(99);
      expect(plan.status).toBe('active');
      expect(plan.id).toMatch(/^plan-/);
    });

    it('应该在缺少必需参数时抛出错误', async () => {
      const invalidRequest = {
        name: '',
        tier: 'basic' as UserTier,
        monthlyPrice: 99,
        quotas: {
          dailyCreateQuota: 10,
          dailyReuseQuota: 3,
          maxExportsPerDay: 30,
          maxGraphNodes: -1,
        },
        features: [],
        description: '',
        metadata: {},
      };

      await expect(planService.createPlan(invalidRequest)).rejects.toThrow('套餐名称不能为空');
    });

    it('应该在价格为负数时抛出错误', async () => {
      const invalidRequest: CreatePlanRequest = {
        name: '测试套餐',
        tier: 'basic',
        monthlyPrice: -10,
        quotas: {
          dailyCreateQuota: 10,
          dailyReuseQuota: 3,
          maxExportsPerDay: 30,
          maxGraphNodes: -1,
        },
        features: ['高清导出'],
        description: '测试描述',
        metadata: {},
      };

      await expect(planService.createPlan(invalidRequest)).rejects.toThrow('月费不能为负数');
    });
  });

  describe('updatePlan', () => {
    it('应该成功更新套餐', async () => {
      // 先创建一个套餐
      const createRequest: CreatePlanRequest = {
        name: '原始套餐',
        tier: 'basic',
        monthlyPrice: 99,
        quotas: {
          dailyCreateQuota: 10,
          dailyReuseQuota: 3,
          maxExportsPerDay: 30,
          maxGraphNodes: -1,
        },
        features: ['高清导出'],
        description: '原始描述',
        metadata: {},
      };

      const createdPlan = await planService.createPlan(createRequest);

      // 更新套餐
      const updateRequest: UpdatePlanRequest = {
        id: createdPlan.id,
        name: '更新后的套餐',
        monthlyPrice: 129,
        description: '更新后的描述',
      };

      const updatedPlan = await planService.updatePlan(updateRequest);

      expect(updatedPlan.name).toBe('更新后的套餐');
      expect(updatedPlan.monthlyPrice).toBe(129);
      expect(updatedPlan.description).toBe('更新后的描述');
      expect(updatedPlan.tier).toBe('basic'); // 未更新的字段保持不变
    });

    it('应该在套餐不存在时抛出错误', async () => {
      const updateRequest: UpdatePlanRequest = {
        id: 'non-existent-plan',
        name: '不存在的套餐',
      };

      await expect(planService.updatePlan(updateRequest)).rejects.toThrow('套餐不存在');
    });
  });

  describe('queryPlans', () => {
    it('应该返回所有活跃套餐', async () => {
      const result = await planService.queryPlans({
        status: 'active',
      });

      expect(result.plans).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.plans.every(plan => plan.status === 'active')).toBe(true);
    });

    it('应该支持分页查询', async () => {
      const result = await planService.queryPlans({
        limit: 2,
        offset: 0,
      });

      expect(result.plans.length).toBeLessThanOrEqual(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.pageSize).toBe(2);
    });

    it('应该支持按层级过滤', async () => {
      const result = await planService.queryPlans({
        tier: 'basic',
      });

      expect(result.plans.every(plan => plan.tier === 'basic')).toBe(true);
    });

    it('应该支持排序', async () => {
      const result = await planService.queryPlans({
        sortBy: 'price',
        sortOrder: 'asc',
      });

      const prices = result.plans.map(plan => plan.monthlyPrice);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });
  });

  describe('searchPlans', () => {
    it('应该支持关键词搜索', async () => {
      const result = await planService.searchPlans({
        keyword: '基础',
      });

      expect(result.plans.length).toBeGreaterThan(0);
      expect(result.searchMeta.keyword).toBe('基础');
      expect(result.searchMeta.matchedFields.length).toBeGreaterThan(0);
    });

    it('应该支持价格范围过滤', async () => {
      const result = await planService.searchPlans({
        priceRange: {
          min: 50,
          max: 150,
        },
      });

      expect(result.plans.every(plan =>
        plan.monthlyPrice >= 50 && plan.monthlyPrice <= 150,
      )).toBe(true);
    });

    it('应该支持功能过滤', async () => {
      const result = await planService.searchPlans({
        features: ['高清导出'],
      });

      expect(result.plans.every(plan =>
        plan.features.includes('高清导出'),
      )).toBe(true);
    });
  });

  describe('getRecommendedPlans', () => {
    it('应该为免费用户推荐升级套餐', async () => {
      const result = await planService.getRecommendedPlans('free');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.every(rec =>
        rec.plan.tier !== 'free',
      )).toBe(true);
    });

    it('应该包含推荐理由和收益', async () => {
      const result = await planService.getRecommendedPlans('free');

      result.recommendations.forEach(rec => {
        expect(rec.reason).toBeDefined();
        expect(rec.reason.length).toBeGreaterThan(0);
        expect(rec.benefits).toBeDefined();
        expect(Array.isArray(rec.benefits)).toBe(true);
        expect(rec.score).toBeGreaterThan(0);
      });
    });

    it('应该按推荐分数排序', async () => {
      const result = await planService.getRecommendedPlans('free');

      const scores = result.recommendations.map(rec => rec.score);
      const sortedScores = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sortedScores);
    });
  });

  describe('comparePlans', () => {
    it('应该成功对比多个套餐', async () => {
      const result = await planService.comparePlans(['plan-basic', 'plan-pro']);

      expect(result.plans.length).toBe(2);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.features).toBeDefined();
      expect(result.comparison.quotas).toBeDefined();
      expect(result.comparison.permissions).toBeDefined();
      expect(result.comparison.pricing).toBeDefined();
    });

    it('应该在套餐不存在时抛出错误', async () => {
      await expect(planService.comparePlans(['non-existent-plan'])).rejects.toThrow();
    });
  });

  describe('getPlanStatistics', () => {
    it('应该返回完整的统计信息', async () => {
      const statistics = await planService.getPlanStatistics();

      expect(statistics.totalPlans).toBeGreaterThan(0);
      expect(statistics.activePlans).toBeGreaterThan(0);
      expect(statistics.plansByTier).toBeDefined();
      expect(statistics.averagePrice).toBeGreaterThanOrEqual(0);
      expect(statistics.priceRange).toBeDefined();
      expect(statistics.priceRange.min).toBeGreaterThanOrEqual(0);
      expect(statistics.priceRange.max).toBeGreaterThanOrEqual(statistics.priceRange.min);
    });
  });

  describe('deletePlan', () => {
    it('应该成功删除套餐', async () => {
      // 先创建一个套餐
      const createRequest: CreatePlanRequest = {
        name: '待删除套餐',
        tier: 'basic',
        monthlyPrice: 99,
        quotas: {
          dailyCreateQuota: 10,
          dailyReuseQuota: 3,
          maxExportsPerDay: 30,
          maxGraphNodes: -1,
        },
        features: ['高清导出'],
        description: '这个套餐将被删除',
        metadata: {},
      };

      const createdPlan = await planService.createPlan(createRequest);

      // 删除套餐
      const success = await planService.deletePlan(createdPlan.id);
      expect(success).toBe(true);

      // 验证套餐已被软删除
      const deletedPlan = await planService.getPlanById(createdPlan.id);
      expect(deletedPlan?.status).toBe('inactive');
    });

    it('应该在套餐不存在时抛出错误', async () => {
      await expect(planService.deletePlan('non-existent-plan')).rejects.toThrow('套餐不存在');
    });
  });

  describe('batchUpdatePlanStatus', () => {
    it('应该批量更新套餐状态', async () => {
      // 先创建两个套餐
      const plan1 = await planService.createPlan({
        name: '批量测试套餐1',
        tier: 'basic',
        monthlyPrice: 99,
        quotas: {
          dailyCreateQuota: 10,
          dailyReuseQuota: 3,
          maxExportsPerDay: 30,
          maxGraphNodes: -1,
        },
        features: ['高清导出'],
        description: '批量测试',
        metadata: {},
      });

      const plan2 = await planService.createPlan({
        name: '批量测试套餐2',
        tier: 'pro',
        monthlyPrice: 199,
        quotas: {
          dailyCreateQuota: 50,
          dailyReuseQuota: 20,
          maxExportsPerDay: 100,
          maxGraphNodes: -1,
        },
        features: ['高清导出', '品牌定制'],
        description: '批量测试',
        metadata: {},
      });

      // 批量更新状态
      const result = await planService.batchUpdatePlanStatus(
        [plan1.id, plan2.id],
        'inactive',
      );

      expect(result.success.length).toBe(2);
      expect(result.failed.length).toBe(0);
      expect(result.success).toContain(plan1.id);
      expect(result.success).toContain(plan2.id);
    });
  });
});
