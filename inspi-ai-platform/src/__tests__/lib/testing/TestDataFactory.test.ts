import { ObjectId } from 'mongoose';

import { TestDataBuilder as Builder } from '@/lib/testing/TestDataBuilder';
import {
  TestDataFactory,
  TestDataBuilder,
  UserFactory,
  WorkFactory,
  TeachingCardFactory,
} from '@/lib/testing/TestDataFactory';

describe('Test Data Factory System', () => {
  let testDataFactory: TestDataFactory;
  let testDataBuilder: typeof Builder;

  beforeEach(() => {
    // 创建新的工厂实例
    testDataFactory = new TestDataFactory();
    testDataBuilder = Builder;

    // 重置所有工厂和构建器的序列号
    testDataFactory.resetSequences();
    testDataBuilder.resetSequences();
  });

  describe('TestDataFactory', () => {
    describe('User Factory', () => {
      it('should create a user with default values', () => {
        const user = testDataFactory.user.create();

        expect(user).toHaveProperty('_id');
        expect(user.email).toMatch(/^test\d+@example\.com$/);
        expect(user.name).toMatch(/^Test User \d+$/);
        expect(user.subscription.plan).toBe('free');
        expect(user.usage.dailyGenerations).toBe(0);
        expect(user.contributionScore).toBe(0);
      });

      it('should create a user with overrides', () => {
        const overrides = {
          email: 'custom@example.com',
          name: 'Custom User',
          subscription: {
            plan: 'pro' as const,
            expiresAt: new Date(),
            autoRenew: true,
          },
        };

        const user = testDataFactory.user.create(overrides);

        expect(user.email).toBe('custom@example.com');
        expect(user.name).toBe('Custom User');
        expect(user.subscription.plan).toBe('pro');
        expect(user.subscription.autoRenew).toBe(true);
      });

      it('should create multiple users with unique data', () => {
        const users = testDataFactory.user.createMany(3);

        expect(users).toHaveLength(3);

        const emails = users.map(u => u.email);
        const uniqueEmails = new Set(emails);
        expect(uniqueEmails.size).toBe(3);

        const names = users.map(u => u.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(3);
      });

      it('should create users with different subscription plans', () => {
        const freeUser = testDataFactory.user.createWithSubscription('free');
        const proUser = testDataFactory.user.createWithSubscription('pro');
        const superUser = testDataFactory.user.createWithSubscription('super');

        expect(freeUser.subscription.plan).toBe('free');
        expect(freeUser.subscription.expiresAt).toBeNull();

        expect(proUser.subscription.plan).toBe('pro');
        expect(proUser.subscription.expiresAt).toBeInstanceOf(Date);
        expect(proUser.subscription.autoRenew).toBe(true);

        expect(superUser.subscription.plan).toBe('super');
        expect(superUser.subscription.expiresAt).toBeInstanceOf(Date);
        expect(superUser.subscription.autoRenew).toBe(true);
      });

      it('should create Google users', () => {
        const googleUser = testDataFactory.user.createGoogleUser();

        expect(googleUser.googleId).toMatch(/^google_\d+$/);
        expect(googleUser.password).toBeNull();
      });
    });

    describe('Work Factory', () => {
      it('should create a work with default values', () => {
        const work = testDataFactory.work.create();

        expect(work).toHaveProperty('_id');
        expect(work.title).toMatch(/^Test Work \d+$/);
        expect(work.knowledgePoint).toMatch(/^Knowledge Point \d+$/);
        expect(work.subject).toBeTruthy();
        expect(work.gradeLevel).toBeTruthy();
        expect(work.cards).toHaveLength(3);
        expect(work.status).toBe('draft');
        expect(work.reuseCount).toBe(0);
      });

      it('should create works with specific authors', () => {
        const user = testDataFactory.user.create();
        const work = testDataFactory.work.createWithAuthor(user._id);

        expect(work.author).toEqual(user._id);
      });

      it('should create published works', () => {
        const work = testDataFactory.work.createPublished();

        expect(work.status).toBe('published');
        expect(work.reuseCount).toBeGreaterThanOrEqual(0);
      });

      it('should create reused works with proper attribution', () => {
        const originalUser = testDataFactory.user.create();
        const newUser = testDataFactory.user.create();
        const originalWork = testDataFactory.work.createWithAuthor(originalUser._id, {
          status: 'published',
        });

        const reusedWork = testDataFactory.work.createReusedWork(originalWork, newUser._id);

        expect(reusedWork.author).toEqual(newUser._id);
        expect(reusedWork.originalWork).toEqual(originalWork._id);
        expect(reusedWork.attribution).toHaveLength(1);
        expect(reusedWork.attribution[0].originalAuthor).toEqual(originalUser._id);
        expect(reusedWork.attribution[0].originalWorkId).toEqual(originalWork._id);
        expect(reusedWork.title).toContain('(Reused)');
      });
    });

    describe('Knowledge Graph Factory', () => {
      it('should create a knowledge graph with default values', () => {
        const graph = testDataFactory.graph.create();

        expect(graph).toHaveProperty('_id');
        expect(graph.name).toMatch(/^Test Graph \d+$/);
        expect(graph.nodes).toHaveLength(5);
        expect(graph.edges).toHaveLength(4);
        expect(graph.isPublic).toBe(false);
        expect(graph.version).toBe(1);
      });

      it('should create graphs with hierarchy', () => {
        const graph = testDataFactory.graph.createWithHierarchy(3, 2);

        expect(graph.nodes.length).toBeGreaterThan(1);
        expect(graph.edges.length).toBeGreaterThan(0);

        // 验证层次结构
        const rootNodes = graph.nodes.filter(n => n.level === 0);
        expect(rootNodes).toHaveLength(1);

        const level1Nodes = graph.nodes.filter(n => n.level === 1);
        expect(level1Nodes).toHaveLength(2);

        const level2Nodes = graph.nodes.filter(n => n.level === 2);
        expect(level2Nodes).toHaveLength(4);
      });
    });

    describe('Complex Scenarios', () => {
      it('should create user with works relationship', () => {
        const { user, works } = testDataFactory.createUserWithWorks(5);

        expect(works).toHaveLength(5);
        works.forEach(work => {
          expect(work.author).toEqual(user._id);
        });
      });

      it('should create reuse chain', () => {
        const { users, works } = testDataFactory.createReuseChain(4);

        expect(users).toHaveLength(4);
        expect(works).toHaveLength(4);

        // 验证复用链
        const originalWork = works[0];
        expect(originalWork.originalWork).toBeUndefined();

        for (let i = 1; i < works.length; i++) {
          const reusedWork = works[i];
          expect(reusedWork.originalWork).toBeDefined();
          expect(reusedWork.attribution).toHaveLength(1);
        }
      });

      it('should create collaboration scenario', () => {
        const scenario = testDataFactory.createCollaborationScenario();

        expect(scenario.users).toHaveLength(5);
        expect(scenario.originalWorks).toHaveLength(5);
        expect(scenario.reusedWorks.length).toBeGreaterThan(0);
        expect(scenario.graphs).toHaveLength(5);
      });
    });
  });

  describe('TestDataBuilder', () => {
    describe('User Builder', () => {
      it('should build user with fluent API', () => {
        const user = testDataBuilder.user()
          .withEmail('builder@example.com')
          .withName('Builder User')
          .asProUser()
          .withUsage(5, 2)
          .withContributionScore(100)
          .build();

        expect(user.email).toBe('builder@example.com');
        expect(user.name).toBe('Builder User');
        expect(user.subscription.plan).toBe('pro');
        expect(user.usage.dailyGenerations).toBe(5);
        expect(user.usage.dailyReuses).toBe(2);
        expect(user.contributionScore).toBe(100);
      });

      it('should create different user types', () => {
        const freeUser = testDataBuilder.user().asFreeUser().build();
        const proUser = testDataBuilder.user().asProUser().build();
        const superUser = testDataBuilder.user().asSuperUser().build();
        const googleUser = testDataBuilder.user().asGoogleUser().build();
        const activeUser = testDataBuilder.user().asActiveUser().build();

        expect(freeUser.subscription.plan).toBe('free');
        expect(proUser.subscription.plan).toBe('pro');
        expect(superUser.subscription.plan).toBe('super');
        expect(googleUser.googleId).toBeTruthy();
        expect(activeUser.usage.dailyGenerations).toBeGreaterThan(0);
        expect(activeUser.contributionScore).toBeGreaterThan(0);
      });
    });

    describe('Work Builder', () => {
      it('should build work with fluent API', () => {
        const user = testDataFactory.user.create();
        const work = testDataBuilder.work()
          .withTitle('Custom Work')
          .withAuthor(user._id)
          .asMathWork()
          .asPublished()
          .withCompleteCardSet()
          .build();

        expect(work.title).toBe('Custom Work');
        expect(work.author).toEqual(user._id);
        expect(work.subject).toBe('数学');
        expect(work.status).toBe('published');
        expect(work.cards).toHaveLength(4);
      });

      it('should create subject-specific works', () => {
        const mathWork = testDataBuilder.work().asMathWork().build();
        const chineseWork = testDataBuilder.work().asChineseWork().build();
        const englishWork = testDataBuilder.work().asEnglishWork().build();

        expect(mathWork.subject).toBe('数学');
        expect(chineseWork.subject).toBe('语文');
        expect(englishWork.subject).toBe('英语');
      });
    });

    describe('Knowledge Graph Builder', () => {
      it('should build graph with hierarchy', () => {
        const user = testDataFactory.user.create();
        const graph = testDataBuilder.graph()
          .withUserId(user._id)
          .withName('Test Math Graph')
          .asMathGraph()
          .withSimpleHierarchy()
          .asPublic()
          .build();

        expect(graph.userId).toEqual(user._id);
        expect(graph.name).toBe('Test Math Graph');
        expect(graph.subject).toBe('数学');
        expect(graph.isPublic).toBe(true);
        expect(graph.nodes).toHaveLength(3);
        expect(graph.edges).toHaveLength(2);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should create complex data scenarios', () => {
      // 使用工厂创建数据
      const { user, works } = testDataFactory.createUserWithWorks(3);

      // 使用构建器创建更多数据
      const customWork = testDataBuilder.work()
        .withAuthor(user._id)
        .asMathWork()
        .asPublished()
        .build();

      expect(user).toBeDefined();
      expect(works).toHaveLength(3);
      expect(customWork.author).toEqual(user._id);
      expect(customWork.subject).toBe('数学');
      expect(customWork.status).toBe('published');

      // 验证所有作品都属于同一用户
      works.forEach(work => {
        expect(work.author).toEqual(user._id);
      });
    });
  });
});
