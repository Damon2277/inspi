/**
 * 测试数据管理器
 * 统一管理测试数据的创建、更新和清理
 */

import { createUserFixture, createWorkFixture, createKnowledgeGraphFixture } from '../fixtures';

interface TestDataOptions {
  cleanup?: boolean
  persist?: boolean
  environment?: 'test' | 'e2e' | 'performance'
}

interface TestDataSet {
  users: any[]
  works: any[]
  knowledgeGraphs: any[]
  sessions: any[]
}

class TestDataManager {
  private static instance: TestDataManager;
  private createdData: Map<string, any[]> = new Map();
  private cleanupTasks: (() => Promise<void>)[] = [];

  private constructor() {}

  static getInstance(): TestDataManager {
    if (!TestDataManager.instance) {
      TestDataManager.instance = new TestDataManager();
    }
    return TestDataManager.instance;
  }

  /**
   * 创建完整的测试数据集
   */
  async createTestDataSet(options: TestDataOptions = {}): Promise<TestDataSet> {
    const { environment = 'test' } = options;

    console.log(`🔧 创建${environment}环境测试数据...`);

    // 创建测试用户
    const users = await this.createTestUsers(environment);

    // 创建测试作品
    const works = await this.createTestWorks(users, environment);

    // 创建知识图谱
    const knowledgeGraphs = await this.createTestKnowledgeGraphs(users, environment);

    // 创建用户会话
    const sessions = await this.createTestSessions(users, environment);

    const dataSet: TestDataSet = {
      users,
      works,
      knowledgeGraphs,
      sessions,
    };

    // 记录创建的数据用于清理
    this.createdData.set(`dataset-${Date.now()}`, [
      ...users,
      ...works,
      ...knowledgeGraphs,
      ...sessions,
    ]);

    console.log(`✅ 测试数据创建完成: ${users.length}个用户, ${works.length}个作品, ${knowledgeGraphs.length}个图谱`);

    return dataSet;
  }

  /**
   * 创建测试用户
   */
  private async createTestUsers(environment: string): Promise<any[]> {
    const userCount = this.getUserCountByEnvironment(environment);
    const users: any[] = [];

    for (let i = 0; i < userCount; i++) {
      const user = createUserFixture({
        id: `test-user-${i + 1}`,
        email: `test${i + 1}@example.com`,
        name: `测试用户${i + 1}`,
        subscription: i === 0 ? 'pro' : i === 1 ? 'super' : 'free',
        stats: {
          totalWorks: Math.floor(Math.random() * 20),
          totalViews: Math.floor(Math.random() * 10000),
          totalLikes: Math.floor(Math.random() * 1000),
          contributionScore: Math.floor(Math.random() * 5000),
        },
      });

      users.push(user);

      // 如果需要持久化到数据库
      if (environment === 'e2e' || environment === 'performance') {
        await this.persistUser(user);
      }
    }

    return users;
  }

  /**
   * 创建测试作品
   */
  private async createTestWorks(users: any[], environment: string): Promise<any[]> {
    const workCount = this.getWorkCountByEnvironment(environment);
    const works: any[] = [];

    const subjects = ['数学', '物理', '化学', '生物', '语文', '英语'];
    const gradeLevels = ['小学', '初中', '高中'];

    for (let i = 0; i < workCount; i++) {
      const author = users[Math.floor(Math.random() * users.length)];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const gradeLevel = gradeLevels[Math.floor(Math.random() * gradeLevels.length)];

      const work = createWorkFixture({
        id: `test-work-${i + 1}`,
        title: `${subject}测试作品${i + 1}`,
        description: `这是一个${subject}${gradeLevel}的测试作品`,
        author,
        subject,
        gradeLevel,
        tags: [subject, gradeLevel, '测试'],
        stats: {
          views: Math.floor(Math.random() * 1000),
          likes: Math.floor(Math.random() * 100),
          reuses: Math.floor(Math.random() * 50),
          contributionScore: Math.floor(Math.random() * 200),
        },
      });

      works.push(work);

      // 如果需要持久化到数据库
      if (environment === 'e2e' || environment === 'performance') {
        await this.persistWork(work);
      }
    }

    return works;
  }

  /**
   * 创建测试知识图谱
   */
  private async createTestKnowledgeGraphs(users: any[], environment: string): Promise<any[]> {
    const graphCount = this.getGraphCountByEnvironment(environment);
    const graphs: any[] = [];

    for (let i = 0; i < graphCount; i++) {
      const owner = users[Math.floor(Math.random() * users.length)];

      const graph = createKnowledgeGraphFixture({
        id: `test-graph-${i + 1}`,
        name: `测试知识图谱${i + 1}`,
        owner,
        nodes: this.generateTestNodes(10),
        edges: this.generateTestEdges(8),
      });

      graphs.push(graph);

      // 如果需要持久化到数据库
      if (environment === 'e2e' || environment === 'performance') {
        await this.persistKnowledgeGraph(graph);
      }
    }

    return graphs;
  }

  /**
   * 创建测试会话
   */
  private async createTestSessions(users: any[], environment: string): Promise<any[]> {
    const sessions: any[] = [];

    for (const user of users) {
      const session = {
        id: `session-${(user.id || (user as any)._id)}`,
        userId: (user.id || (user as any)._id),
        token: `test-token-${(user.id || (user as any)._id)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        createdAt: new Date(),
      };

      sessions.push(session);

      // 如果需要持久化
      if (environment === 'e2e' || environment === 'performance') {
        await this.persistSession(session);
      }
    }

    return sessions;
  }

  /**
   * 生成测试节点
   */
  private generateTestNodes(count: number): any[] {
    const subjects = ['数学', '物理', '化学', '生物'];
    const topics = ['基础概念', '进阶理论', '实践应用', '综合练习'];

    const nodes: any[] = [];

    for (let i = 0; i < count; i++) {
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const topic = topics[Math.floor(Math.random() * topics.length)];

      nodes.push({
        id: `node-${i + 1}`,
        name: `${subject}-${topic}`,
        type: i < 4 ? 'subject' : 'topic',
        x: Math.random() * 800,
        y: Math.random() * 600,
        mountedWorks: [],
      });
    }

    return nodes;
  }

  /**
   * 生成测试边
   */
  private generateTestEdges(count: number): any[] {
    const edges: any[] = [];

    for (let i = 0; i < count; i++) {
      edges.push({
        id: `edge-${i + 1}`,
        source: `node-${Math.floor(Math.random() * 10) + 1}`,
        target: `node-${Math.floor(Math.random() * 10) + 1}`,
        type: 'contains',
        weight: Math.random(),
      });
    }

    return edges;
  }

  /**
   * 根据环境获取用户数量
   */
  private getUserCountByEnvironment(environment: string): number {
    switch (environment) {
      case 'test': return 3;
      case 'e2e': return 5;
      case 'performance': return 20;
      default: return 3;
    }
  }

  /**
   * 根据环境获取作品数量
   */
  private getWorkCountByEnvironment(environment: string): number {
    switch (environment) {
      case 'test': return 10;
      case 'e2e': return 20;
      case 'performance': return 100;
      default: return 10;
    }
  }

  /**
   * 根据环境获取图谱数量
   */
  private getGraphCountByEnvironment(environment: string): number {
    switch (environment) {
      case 'test': return 2;
      case 'e2e': return 3;
      case 'performance': return 10;
      default: return 2;
    }
  }

  /**
   * 持久化用户到数据库
   */
  private async persistUser(user: any): Promise<void> {
    try {
      // 这里应该调用实际的数据库API
      // 为了测试，我们只是模拟
      console.log(`💾 持久化用户: ${user.name}`);

      // 添加清理任务
      this.cleanupTasks.push(async () => {
        console.log(`🗑️ 清理用户: ${user.name}`);
        // 实际的删除逻辑
      });
    } catch (error) {
      console.error(`❌ 用户持久化失败: ${user.name}`, error);
    }
  }

  /**
   * 持久化作品到数据库
   */
  private async persistWork(work: any): Promise<void> {
    try {
      console.log(`💾 持久化作品: ${work.title}`);

      this.cleanupTasks.push(async () => {
        console.log(`🗑️ 清理作品: ${work.title}`);
      });
    } catch (error) {
      console.error(`❌ 作品持久化失败: ${work.title}`, error);
    }
  }

  /**
   * 持久化知识图谱到数据库
   */
  private async persistKnowledgeGraph(graph: any): Promise<void> {
    try {
      console.log(`💾 持久化知识图谱: ${graph.name}`);

      this.cleanupTasks.push(async () => {
        console.log(`🗑️ 清理知识图谱: ${graph.name}`);
      });
    } catch (error) {
      console.error(`❌ 知识图谱持久化失败: ${graph.name}`, error);
    }
  }

  /**
   * 持久化会话到数据库
   */
  private async persistSession(session: any): Promise<void> {
    try {
      console.log(`💾 持久化会话: ${session.id}`);

      this.cleanupTasks.push(async () => {
        console.log(`🗑️ 清理会话: ${session.id}`);
      });
    } catch (error) {
      console.error(`❌ 会话持久化失败: ${session.id}`, error);
    }
  }

  /**
   * 清理所有测试数据
   */
  async cleanupAllData(): Promise<void> {
    console.log('🧹 开始清理所有测试数据...');

    // 执行所有清理任务
    for (const cleanupTask of this.cleanupTasks) {
      try {
        await cleanupTask();
      } catch (error) {
        console.error('❌ 清理任务执行失败:', error);
      }
    }

    // 清空记录
    this.createdData.clear();
    this.cleanupTasks = [];

    console.log('✅ 测试数据清理完成');
  }

  /**
   * 清理特定数据集
   */
  async cleanupDataSet(dataSetId: string): Promise<void> {
    const data = this.createdData.get(dataSetId);
    if (!data) {
      console.warn(`⚠️ 数据集不存在: ${dataSetId}`);
      return;
    }

    console.log(`🧹 清理数据集: ${dataSetId}`);

    // 这里应该实现具体的清理逻辑
    // 根据数据类型调用相应的删除API

    this.createdData.delete(dataSetId);
    console.log(`✅ 数据集清理完成: ${dataSetId}`);
  }

  /**
   * 获取数据统计
   */
  getDataStats(): any {
    const stats = {
      totalDataSets: this.createdData.size,
      totalCleanupTasks: this.cleanupTasks.length,
      dataSets: Array.from(this.createdData.keys()),
    };

    return stats;
  }

  /**
   * 重置管理器状态
   */
  reset(): void {
    this.createdData.clear();
    this.cleanupTasks = [];
    console.log('🔄 测试数据管理器已重置');
  }
}

// 导出单例实例
export const testDataManager = TestDataManager.getInstance();

// 导出类型
export type { TestDataOptions, TestDataSet };
