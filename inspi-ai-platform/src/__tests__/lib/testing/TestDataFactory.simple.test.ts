/**
 * 简化的测试数据工厂测试
 * 不依赖MongoDB，专注于测试核心功能
 */

// Mock ObjectId for testing
class MockObjectId {
  private static counter = 0;
  public readonly id: string;

  constructor() {
    this.id = `mock_${++MockObjectId.counter}`;
  }

  toString(): string {
    return this.id;
  }

  static reset(): void {
    MockObjectId.counter = 0;
  }
}

// Mock types for testing
interface MockUser {
  _id: MockObjectId;
  email: string;
  name: string;
  avatar?: string | null;
  password?: string | null;
  googleId?: string | null;
  subscription: {
    plan: 'free' | 'pro' | 'super';
    expiresAt?: Date | null;
    autoRenew: boolean;
  };
  usage: {
    dailyGenerations: number;
    dailyReuses: number;
    lastResetDate: Date;
  };
  contributionScore: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MockTeachingCard {
  id: string;
  type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
  title: string;
  content: string;
  editable: boolean;
}

interface MockWork {
  _id: MockObjectId;
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  author: MockObjectId;
  cards: MockTeachingCard[];
  tags: string[];
  reuseCount: number;
  originalWork?: MockObjectId;
  attribution: any[];
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

// 序列号生成器
class SequenceGenerator {
  private static counters: Map<string, number> = new Map();

  static next(key: string): number {
    const current = this.counters.get(key) || 0;
    const next = current + 1;
    this.counters.set(key, next);
    return next;
  }

  static reset(key?: string): void {
    if (key) {
      this.counters.delete(key);
    } else {
      this.counters.clear();
    }
  }
}

// 用户工厂
class MockUserFactory {
  private static readonly defaultUser: Omit<MockUser, '_id'> = {
    email: 'test@example.com',
    name: 'Test User',
    avatar: null,
    password: null,
    googleId: null,
    subscription: {
      plan: 'free',
      expiresAt: null,
      autoRenew: false,
    },
    usage: {
      dailyGenerations: 0,
      dailyReuses: 0,
      lastResetDate: new Date(),
    },
    contributionScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  create(overrides: Partial<MockUser> = {}): MockUser {
    const sequence = SequenceGenerator.next('user');
    
    return {
      _id: new MockObjectId(),
      ...MockUserFactory.defaultUser,
      email: `test${sequence}@example.com`,
      name: `Test User ${sequence}`,
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  createWithSubscription(plan: 'free' | 'pro' | 'super', overrides: Partial<MockUser> = {}): MockUser {
    const expiresAt = plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    
    return this.create({
      subscription: {
        plan,
        expiresAt,
        autoRenew: plan !== 'free',
      },
      ...overrides,
    });
  }
}

// 教学卡片工厂
class MockTeachingCardFactory {
  private static readonly cardTypes: MockTeachingCard['type'][] = [
    'visualization', 'analogy', 'thinking', 'interaction'
  ];

  create(overrides: Partial<MockTeachingCard> = {}): MockTeachingCard {
    const sequence = SequenceGenerator.next('card');
    const type = MockTeachingCardFactory.cardTypes[sequence % MockTeachingCardFactory.cardTypes.length];
    
    return {
      id: `card_${sequence}`,
      type,
      title: `Test Card ${sequence}`,
      content: `This is test content for card ${sequence}`,
      editable: true,
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<MockTeachingCard> = {}): MockTeachingCard[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// 作品工厂
class MockWorkFactory {
  private static readonly subjects = ['数学', '语文', '英语', '物理', '化学', '生物'];
  private static readonly gradeLevels = ['小学', '初中', '高中'];

  private cardFactory = new MockTeachingCardFactory();

  create(overrides: Partial<MockWork> = {}): MockWork {
    const sequence = SequenceGenerator.next('work');
    const subject = MockWorkFactory.subjects[sequence % MockWorkFactory.subjects.length];
    const gradeLevel = MockWorkFactory.gradeLevels[sequence % MockWorkFactory.gradeLevels.length];
    
    return {
      _id: new MockObjectId(),
      title: `Test Work ${sequence}`,
      knowledgePoint: `Knowledge Point ${sequence}`,
      subject,
      gradeLevel,
      author: new MockObjectId(),
      cards: this.cardFactory.createMany(3),
      tags: [`tag${sequence}`, `${subject.toLowerCase()}`],
      reuseCount: 0,
      attribution: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  createMany(count: number, overrides: Partial<MockWork> = {}): MockWork[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  createWithAuthor(author: MockObjectId, overrides: Partial<MockWork> = {}): MockWork {
    return this.create({ author, ...overrides });
  }
}

// 主工厂类
class MockTestDataFactory {
  public readonly user = new MockUserFactory();
  public readonly card = new MockTeachingCardFactory();
  public readonly work = new MockWorkFactory();

  resetSequences(): void {
    SequenceGenerator.reset();
    MockObjectId.reset();
  }

  createUserWithWorks(workCount: number = 3): { user: MockUser; works: MockWork[] } {
    const user = this.user.create();
    const works = this.work.createMany(workCount, { author: user._id });
    
    return { user, works };
  }
}

describe('Test Data Factory System (Simplified)', () => {
  let factory: MockTestDataFactory;

  beforeEach(() => {
    factory = new MockTestDataFactory();
    factory.resetSequences();
  });

  describe('User Factory', () => {
    it('should create a user with default values', () => {
      const user = factory.user.create();
      
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

      const user = factory.user.create(overrides);
      
      expect(user.email).toBe('custom@example.com');
      expect(user.name).toBe('Custom User');
      expect(user.subscription.plan).toBe('pro');
      expect(user.subscription.autoRenew).toBe(true);
    });

    it('should create multiple users with unique data', () => {
      const users = factory.user.createMany(3);
      
      expect(users).toHaveLength(3);
      
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(3);
      
      const names = users.map(u => u.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(3);
    });

    it('should create users with different subscription plans', () => {
      const freeUser = factory.user.createWithSubscription('free');
      const proUser = factory.user.createWithSubscription('pro');
      const superUser = factory.user.createWithSubscription('super');
      
      expect(freeUser.subscription.plan).toBe('free');
      expect(freeUser.subscription.expiresAt).toBeNull();
      
      expect(proUser.subscription.plan).toBe('pro');
      expect(proUser.subscription.expiresAt).toBeInstanceOf(Date);
      expect(proUser.subscription.autoRenew).toBe(true);
      
      expect(superUser.subscription.plan).toBe('super');
      expect(superUser.subscription.expiresAt).toBeInstanceOf(Date);
      expect(superUser.subscription.autoRenew).toBe(true);
    });
  });

  describe('Teaching Card Factory', () => {
    it('should create a card with default values', () => {
      const card = factory.card.create();
      
      expect(card).toHaveProperty('id');
      expect(card.id).toMatch(/^card_\d+$/);
      expect(card.title).toMatch(/^Test Card \d+$/);
      expect(card.content).toMatch(/^This is test content for card \d+$/);
      expect(card.editable).toBe(true);
      expect(['visualization', 'analogy', 'thinking', 'interaction']).toContain(card.type);
    });

    it('should create multiple cards with different types', () => {
      const cards = factory.card.createMany(8); // More than 4 to test cycling
      
      expect(cards).toHaveLength(8);
      
      const types = cards.map(c => c.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(4); // Should cycle through all 4 types
    });

    it('should create cards with overrides', () => {
      const card = factory.card.create({
        type: 'interaction',
        title: 'Custom Card',
        content: 'Custom content',
        editable: false,
      });
      
      expect(card.type).toBe('interaction');
      expect(card.title).toBe('Custom Card');
      expect(card.content).toBe('Custom content');
      expect(card.editable).toBe(false);
    });
  });

  describe('Work Factory', () => {
    it('should create a work with default values', () => {
      const work = factory.work.create();
      
      expect(work).toHaveProperty('_id');
      expect(work.title).toMatch(/^Test Work \d+$/);
      expect(work.knowledgePoint).toMatch(/^Knowledge Point \d+$/);
      expect(work.subject).toBeTruthy();
      expect(work.gradeLevel).toBeTruthy();
      expect(work.cards).toHaveLength(3);
      expect(work.status).toBe('draft');
      expect(work.reuseCount).toBe(0);
      expect(work.tags).toHaveLength(2);
    });

    it('should create works with specific authors', () => {
      const user = factory.user.create();
      const work = factory.work.createWithAuthor(user._id);
      
      expect(work.author.toString()).toBe(user._id.toString());
    });

    it('should create multiple works with different subjects', () => {
      const works = factory.work.createMany(10);
      
      expect(works).toHaveLength(10);
      
      const subjects = works.map(w => w.subject);
      const uniqueSubjects = new Set(subjects);
      expect(uniqueSubjects.size).toBeGreaterThan(1); // Should have multiple subjects
    });
  });

  describe('Complex Scenarios', () => {
    it('should create user with works relationship', () => {
      const { user, works } = factory.createUserWithWorks(5);
      
      expect(works).toHaveLength(5);
      works.forEach(work => {
        expect(work.author.toString()).toBe(user._id.toString());
      });
    });

    it('should maintain sequence consistency', () => {
      // Reset sequences first to ensure clean state
      factory.resetSequences();
      
      // Create some data
      const user1 = factory.user.create();
      const card1 = factory.card.create(); // Create card before work to avoid confusion
      const work1 = factory.work.create();
      
      // Verify initial sequence numbers
      expect(user1.email).toBe('test1@example.com');
      expect(card1.id).toBe('card_1');
      expect(work1.title).toBe('Test Work 1');
      
      // Reset sequences
      factory.resetSequences();
      
      // Create new data - should start from 1 again
      const user2 = factory.user.create();
      const card2 = factory.card.create();
      const work2 = factory.work.create();
      
      expect(user2.email).toBe('test1@example.com');
      expect(user2.name).toBe('Test User 1');
      expect(card2.id).toBe('card_1');
      expect(work2.title).toBe('Test Work 1');
    });

    it('should handle large data sets efficiently', () => {
      const startTime = Date.now();
      
      // Create a large dataset
      const users = factory.user.createMany(100);
      const works = factory.work.createMany(500);
      const cards = factory.card.createMany(1000);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(users).toHaveLength(100);
      expect(works).toHaveLength(500);
      expect(cards).toHaveLength(1000);
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Data Integrity', () => {
    it('should generate unique IDs', () => {
      const users = factory.user.createMany(50);
      const works = factory.work.createMany(50);
      
      const userIds = users.map(u => u._id.toString());
      const workIds = works.map(w => w._id.toString());
      
      const uniqueUserIds = new Set(userIds);
      const uniqueWorkIds = new Set(workIds);
      
      expect(uniqueUserIds.size).toBe(50);
      expect(uniqueWorkIds.size).toBe(50);
    });

    it('should maintain data consistency', () => {
      const { user, works } = factory.createUserWithWorks(3);
      
      // All works should belong to the same user
      works.forEach(work => {
        expect(work.author.toString()).toBe(user._id.toString());
      });
      
      // Each work should have cards
      works.forEach(work => {
        expect(work.cards.length).toBeGreaterThan(0);
        work.cards.forEach(card => {
          expect(card.id).toBeTruthy();
          expect(card.title).toBeTruthy();
          expect(card.content).toBeTruthy();
        });
      });
    });

    it('should handle edge cases gracefully', () => {
      // Test with zero count
      const emptyUsers = factory.user.createMany(0);
      expect(emptyUsers).toHaveLength(0);
      
      // Test with large overrides
      const userWithLongName = factory.user.create({
        name: 'A'.repeat(1000),
        email: 'very.long.email.address.that.might.cause.issues@example.com',
      });
      
      expect(userWithLongName.name).toHaveLength(1000);
      expect(userWithLongName.email).toContain('@example.com');
    });
  });
});