/**
 * 数据删除完整性测试器
 * 用于测试数据删除操作的完整性和彻底性
 */

export interface DeletionRule {
  entity: string;
  cascadeRules: Array<{
    relatedEntity: string;
    relationship: 'one-to-one' | 'one-to-many' | 'many-to-many';
    action: 'delete' | 'nullify' | 'restrict';
    foreignKey?: string;
  }>;
  softDelete?: boolean;
  retentionPeriod?: number; // 保留期限（天）
  auditRequired?: boolean;
}

export interface DeletionTestCase {
  name: string;
  entity: string;
  entityId: string;
  setupData: () => Promise<any>;
  expectedDeletions: Array<{
    entity: string;
    condition: Record<string, any>;
    shouldExist: boolean;
  }>;
  cleanupData?: () => Promise<void>;
}

export interface DeletionTestResult {
  testCase: string;
  passed: boolean;
  details: Array<{
    entity: string;
    expected: boolean;
    actual: boolean;
    condition: Record<string, any>;
    error?: string;
  }>;
  executionTime: number;
  auditTrail?: Array<{
    action: string;
    entity: string;
    entityId: string;
    timestamp: Date;
    userId?: string;
  }>;
}

export class DataDeletionTester {
  private rules: Map<string, DeletionRule> = new Map();
  private testCases: DeletionTestCase[] = [];
  private mockDatabase: Map<string, Map<string, any>> = new Map();
  private auditLog: Array<{
    action: string;
    entity: string;
    entityId: string;
    timestamp: Date;
    userId?: string;
  }> = [];

  /**
   * 注册删除规则
   */
  registerDeletionRule(rule: DeletionRule): void {
    this.rules.set(rule.entity, rule);
  }

  /**
   * 批量注册删除规则
   */
  registerDeletionRules(rules: DeletionRule[]): void {
    rules.forEach(rule => this.registerDeletionRule(rule));
  }

  /**
   * 添加删除测试用例
   */
  addDeletionTestCase(testCase: DeletionTestCase): void {
    this.testCases.push(testCase);
  }

  /**
   * 执行数据删除测试
   */
  async runDeletionTests(): Promise<DeletionTestResult[]> {
    const results: DeletionTestResult[] = [];

    for (const testCase of this.testCases) {
      const startTime = Date.now();

      try {
        // 设置测试数据
        await testCase.setupData();

        // 执行删除操作
        await this.performDeletion(testCase.entity, testCase.entityId);

        // 验证删除结果
        const details = await this.verifyDeletionResults(testCase.expectedDeletions);

        const executionTime = Date.now() - startTime;
        const passed = details.every(detail => detail.expected === detail.actual);

        results.push({
          testCase: testCase.name,
          passed,
          details,
          executionTime,
          auditTrail: [...this.auditLog],
        });

        // 清理测试数据
        if (testCase.cleanupData) {
          await testCase.cleanupData();
        }

      } catch (error) {
        const executionTime = Date.now() - startTime;

        results.push({
          testCase: testCase.name,
          passed: false,
          details: [{
            entity: testCase.entity,
            expected: true,
            actual: false,
            condition: { id: testCase.entityId },
            error: error instanceof Error ? error.message : String(error),
          }],
          executionTime,
        });
      }

      // 清理审计日志
      this.auditLog = [];
    }

    return results;
  }

  /**
   * 执行删除操作
   */
  private async performDeletion(entity: string, entityId: string, userId?: string): Promise<void> {
    const rule = this.rules.get(entity);
    if (!rule) {
      throw new Error(`No deletion rule found for entity: ${entity}`);
    }

    // 记录审计日志
    if (rule.auditRequired) {
      this.auditLog.push({
        action: 'delete_initiated',
        entity,
        entityId,
        timestamp: new Date(),
        userId,
      });
    }

    // 检查级联删除规则
    for (const cascadeRule of rule.cascadeRules) {
      await this.handleCascadeDeletion(entity, entityId, cascadeRule, userId);
    }

    // 执行主实体删除
    if (rule.softDelete) {
      await this.performSoftDelete(entity, entityId, userId);
    } else {
      await this.performHardDelete(entity, entityId, userId);
    }

    // 记录完成审计日志
    if (rule.auditRequired) {
      this.auditLog.push({
        action: 'delete_completed',
        entity,
        entityId,
        timestamp: new Date(),
        userId,
      });
    }
  }

  /**
   * 处理级联删除
   */
  private async handleCascadeDeletion(
    parentEntity: string,
    parentId: string,
    cascadeRule: DeletionRule['cascadeRules'][0],
    userId?: string,
  ): Promise<void> {
    const relatedEntities = await this.findRelatedEntities(
      parentEntity,
      parentId,
      cascadeRule,
    );

    for (const relatedEntity of relatedEntities) {
      switch (cascadeRule.action) {
        case 'delete':
          await this.performDeletion(cascadeRule.relatedEntity, relatedEntity.id, userId);
          break;
        case 'nullify':
          await this.nullifyForeignKey(cascadeRule.relatedEntity, relatedEntity.id, cascadeRule.foreignKey);
          break;
        case 'restrict':
          if (relatedEntities.length > 0) {
            throw new Error(`Cannot delete ${parentEntity}:${parentId} - related ${cascadeRule.relatedEntity} exists`);
          }
          break;
      }
    }
  }

  /**
   * 查找相关实体
   */
  private async findRelatedEntities(
    parentEntity: string,
    parentId: string,
    cascadeRule: DeletionRule['cascadeRules'][0],
  ): Promise<Array<{ id: string; [key: string]: any }>> {
    const collection = this.mockDatabase.get(cascadeRule.relatedEntity);
    if (!collection) {
      return [];
    }

    const results: Array<{ id: string; [key: string]: any }> = [];
    const foreignKey = cascadeRule.foreignKey || `${parentEntity}Id`;

    for (const [id, entity] of collection) {
      if (entity[foreignKey] === parentId) {
        results.push({ id, ...entity });
      }
    }

    return results;
  }

  /**
   * 执行软删除
   */
  private async performSoftDelete(entity: string, entityId: string, userId?: string): Promise<void> {
    const collection = this.mockDatabase.get(entity);
    if (!collection) {
      throw new Error(`Entity collection not found: ${entity}`);
    }

    const entityData = collection.get(entityId);
    if (!entityData) {
      throw new Error(`Entity not found: ${entity}:${entityId}`);
    }

    // 标记为已删除
    entityData.deletedAt = new Date();
    entityData.deletedBy = userId;
    collection.set(entityId, entityData);

    this.auditLog.push({
      action: 'soft_delete',
      entity,
      entityId,
      timestamp: new Date(),
      userId,
    });
  }

  /**
   * 执行硬删除
   */
  private async performHardDelete(entity: string, entityId: string, userId?: string): Promise<void> {
    const collection = this.mockDatabase.get(entity);
    if (!collection) {
      throw new Error(`Entity collection not found: ${entity}`);
    }

    const deleted = collection.delete(entityId);
    if (!deleted) {
      throw new Error(`Entity not found: ${entity}:${entityId}`);
    }

    this.auditLog.push({
      action: 'hard_delete',
      entity,
      entityId,
      timestamp: new Date(),
      userId,
    });
  }

  /**
   * 清空外键
   */
  private async nullifyForeignKey(
    entity: string,
    entityId: string,
    foreignKey?: string,
  ): Promise<void> {
    const collection = this.mockDatabase.get(entity);
    if (!collection) {
      return;
    }

    const entityData = collection.get(entityId);
    if (entityData && foreignKey) {
      entityData[foreignKey] = null;
      collection.set(entityId, entityData);
    }
  }

  /**
   * 验证删除结果
   */
  private async verifyDeletionResults(
    expectedDeletions: DeletionTestCase['expectedDeletions'],
  ): Promise<DeletionTestResult['details']> {
    const details: DeletionTestResult['details'] = [];

    for (const expected of expectedDeletions) {
      try {
        const exists = await this.checkEntityExists(expected.entity, expected.condition);

        details.push({
          entity: expected.entity,
          expected: expected.shouldExist,
          actual: exists,
          condition: expected.condition,
        });
      } catch (error) {
        details.push({
          entity: expected.entity,
          expected: expected.shouldExist,
          actual: false,
          condition: expected.condition,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return details;
  }

  /**
   * 检查实体是否存在
   */
  private async checkEntityExists(entity: string, condition: Record<string, any>): Promise<boolean> {
    const collection = this.mockDatabase.get(entity);
    if (!collection) {
      return false;
    }

    for (const [id, entityData] of collection) {
      let matches = true;

      for (const [key, value] of Object.entries(condition)) {
        if (key === 'id') {
          if (id !== value) {
            matches = false;
            break;
          }
        } else if (entityData[key] !== value) {
          matches = false;
          break;
        }
      }

      if (matches) {
        // 检查是否被软删除
        return !entityData.deletedAt;
      }
    }

    return false;
  }

  /**
   * 设置模拟数据
   */
  setMockData(entity: string, data: Map<string, any>): void {
    this.mockDatabase.set(entity, new Map(data));
  }

  /**
   * 获取模拟数据
   */
  getMockData(entity: string): Map<string, any> | undefined {
    return this.mockDatabase.get(entity);
  }

  /**
   * 生成默认删除规则
   */
  generateDefaultDeletionRules(): void {
    // 用户删除规则
    this.registerDeletionRule({
      entity: 'user',
      cascadeRules: [
        {
          relatedEntity: 'work',
          relationship: 'one-to-many',
          action: 'delete',
          foreignKey: 'userId',
        },
        {
          relatedEntity: 'session',
          relationship: 'one-to-many',
          action: 'delete',
          foreignKey: 'userId',
        },
        {
          relatedEntity: 'subscription',
          relationship: 'one-to-one',
          action: 'delete',
          foreignKey: 'userId',
        },
      ],
      softDelete: true,
      retentionPeriod: 30,
      auditRequired: true,
    });

    // 作品删除规则
    this.registerDeletionRule({
      entity: 'work',
      cascadeRules: [
        {
          relatedEntity: 'comment',
          relationship: 'one-to-many',
          action: 'delete',
          foreignKey: 'workId',
        },
        {
          relatedEntity: 'like',
          relationship: 'one-to-many',
          action: 'delete',
          foreignKey: 'workId',
        },
      ],
      softDelete: false,
      auditRequired: true,
    });

    // 订阅删除规则
    this.registerDeletionRule({
      entity: 'subscription',
      cascadeRules: [
        {
          relatedEntity: 'payment',
          relationship: 'one-to-many',
          action: 'nullify',
          foreignKey: 'subscriptionId',
        },
      ],
      softDelete: true,
      retentionPeriod: 90,
      auditRequired: true,
    });
  }

  /**
   * 生成默认测试用例
   */
  generateDefaultTestCases(): void {
    this.addDeletionTestCase({
      name: '删除用户应该级联删除相关数据',
      entity: 'user',
      entityId: 'user-1',
      setupData: async () => {
        // 设置用户数据
        this.setMockData('user', new Map([
          ['user-1', { id: 'user-1', name: 'Test User', email: 'test@example.com' }],
        ]));

        // 设置相关数据
        this.setMockData('work', new Map([
          ['work-1', { id: 'work-1', title: 'Test Work', userId: 'user-1' }],
          ['work-2', { id: 'work-2', title: 'Other Work', userId: 'user-2' }],
        ]));

        this.setMockData('session', new Map([
          ['session-1', { id: 'session-1', token: 'token1', userId: 'user-1' }],
        ]));
      },
      expectedDeletions: [
        {
          entity: 'user',
          condition: { id: 'user-1' },
          shouldExist: false,
        },
        {
          entity: 'work',
          condition: { userId: 'user-1' },
          shouldExist: false,
        },
        {
          entity: 'work',
          condition: { id: 'work-2' },
          shouldExist: true, // 其他用户的作品应该保留
        },
        {
          entity: 'session',
          condition: { userId: 'user-1' },
          shouldExist: false,
        },
      ],
    });

    this.addDeletionTestCase({
      name: '删除作品应该删除相关评论和点赞',
      entity: 'work',
      entityId: 'work-1',
      setupData: async () => {
        this.setMockData('work', new Map([
          ['work-1', { id: 'work-1', title: 'Test Work', userId: 'user-1' }],
        ]));

        this.setMockData('comment', new Map([
          ['comment-1', { id: 'comment-1', content: 'Great work!', workId: 'work-1' }],
          ['comment-2', { id: 'comment-2', content: 'Nice!', workId: 'work-2' }],
        ]));

        this.setMockData('like', new Map([
          ['like-1', { id: 'like-1', userId: 'user-2', workId: 'work-1' }],
        ]));
      },
      expectedDeletions: [
        {
          entity: 'work',
          condition: { id: 'work-1' },
          shouldExist: false,
        },
        {
          entity: 'comment',
          condition: { workId: 'work-1' },
          shouldExist: false,
        },
        {
          entity: 'comment',
          condition: { id: 'comment-2' },
          shouldExist: true, // 其他作品的评论应该保留
        },
        {
          entity: 'like',
          condition: { workId: 'work-1' },
          shouldExist: false,
        },
      ],
    });
  }

  /**
   * 生成删除测试报告
   */
  generateDeletionReport(results: DeletionTestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

    let report = '数据删除完整性测试报告\n';
    report += '==========================\n';
    report += `总测试数: ${totalTests}\n`;
    report += `通过: ${passedTests}\n`;
    report += `失败: ${failedTests}\n`;
    report += `通过率: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`;
    report += `平均执行时间: ${avgExecutionTime.toFixed(2)}ms\n\n`;

    if (failedTests > 0) {
      report += '失败详情:\n';
      report += '----------\n';

      for (const result of results) {
        if (!result.passed) {
          report += `测试用例: ${result.testCase}\n`;
          report += `执行时间: ${result.executionTime}ms\n`;

          for (const detail of result.details) {
            if (detail.expected !== detail.actual) {
              report += `  实体: ${detail.entity}\n`;
              report += `  条件: ${JSON.stringify(detail.condition)}\n`;
              report += `  期望存在: ${detail.expected}\n`;
              report += `  实际存在: ${detail.actual}\n`;
              if (detail.error) {
                report += `  错误: ${detail.error}\n`;
              }
              report += '\n';
            }
          }

          if (result.auditTrail && result.auditTrail.length > 0) {
            report += '  审计日志:\n';
            for (const audit of result.auditTrail) {
              report += `    ${audit.timestamp.toISOString()}: ${audit.action} ${audit.entity}:${audit.entityId}\n`;
            }
          }

          report += '\n';
        }
      }
    }

    return report;
  }

  /**
   * 清理测试数据
   */
  cleanup(): void {
    this.rules.clear();
    this.testCases = [];
    this.mockDatabase.clear();
    this.auditLog = [];
  }
}
