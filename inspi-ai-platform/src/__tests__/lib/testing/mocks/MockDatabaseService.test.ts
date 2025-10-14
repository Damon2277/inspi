/**
 * MockDatabaseService测试
 * 验证数据库服务Mock的功能和一致性
 */

import { MockDatabaseService, MockDatabaseConfig } from '@/lib/testing';

describe('MockDatabaseService', () => {
  let mockService: MockDatabaseService;

  beforeEach(() => {
    mockService = new MockDatabaseService();
  });

  afterEach(() => {
    mockService.reset();
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      // Assert
      expect(mockService.name).toBe('DatabaseService');
      expect(mockService.version).toBe('1.0.0');
      expect(mockService.isActive).toBe(true);
    });

    it('应该初始化默认集合', () => {
      // Act
      const stats = mockService.getAllCollectionStats();

      // Assert
      expect(stats).toHaveLength(4);
      const collectionNames = stats.map(s => s.name);
      expect(collectionNames).toContain('users');
      expect(collectionNames).toContain('works');
      expect(collectionNames).toContain('knowledgeGraphs');
      expect(collectionNames).toContain('sessions');
    });
  });

  describe('CRUD操作', () => {
    describe('创建文档', () => {
      it('应该能够创建文档', async () => {
        // Arrange
        const userData = {
          name: 'Test User',
          email: 'test@example.com',
          age: 25,
        };

        // Act
        const created = await mockService.create('users', userData);

        // Assert
        expect(created).toBeDefined();
        expect(created._id).toBeTruthy();
        expect(created.name).toBe(userData.name);
        expect(created.email).toBe(userData.email);
        expect(created.age).toBe(userData.age);
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
      });

      it('应该为每个文档生成唯一ID', async () => {
        // Act
        const doc1 = await mockService.create('users', { name: 'User 1' });
        const doc2 = await mockService.create('users', { name: 'User 2' });

        // Assert
        expect(doc1._id).not.toBe(doc2._id);
      });
    });

    describe('查找文档', () => {
      beforeEach(async () => {
        await mockService.create('users', { name: 'Alice', age: 25, city: 'New York' });
        await mockService.create('users', { name: 'Bob', age: 30, city: 'London' });
        await mockService.create('users', { name: 'Charlie', age: 25, city: 'Paris' });
      });

      it('应该能够查找所有文档', async () => {
        // Act
        const users = await mockService.find('users');

        // Assert
        expect(users).toHaveLength(3);
      });

      it('应该能够按条件过滤文档', async () => {
        // Act
        const youngUsers = await mockService.find('users', { age: 25 });

        // Assert
        expect(youngUsers).toHaveLength(2);
        expect(youngUsers.every(u => u.age === 25)).toBe(true);
      });

      it('应该支持复杂查询操作符', async () => {
        // Act
        const olderUsers = await mockService.find('users', { age: { $gt: 25 } });
        const specificAges = await mockService.find('users', { age: { $in: [25, 30] } });
        const notBob = await mockService.find('users', { name: { $ne: 'Bob' } });

        // Assert
        expect(olderUsers).toHaveLength(1);
        expect(olderUsers[0].name).toBe('Bob');

        expect(specificAges).toHaveLength(3);

        expect(notBob).toHaveLength(2);
        expect(notBob.every(u => u.name !== 'Bob')).toBe(true);
      });

      it('应该支持排序', async () => {
        // Act
        const sortedByName = await mockService.find('users', {}, { sort: { name: 1 } });
        const sortedByAgeDesc = await mockService.find('users', {}, { sort: { age: -1 } });

        // Assert
        expect(sortedByName[0].name).toBe('Alice');
        expect(sortedByName[1].name).toBe('Bob');
        expect(sortedByName[2].name).toBe('Charlie');

        expect(sortedByAgeDesc[0].age).toBe(30);
        expect(sortedByAgeDesc[1].age).toBe(25);
      });

      it('应该支持分页', async () => {
        // Act
        const firstPage = await mockService.find('users', {}, { limit: 2 });
        const secondPage = await mockService.find('users', {}, { skip: 2, limit: 2 });

        // Assert
        expect(firstPage).toHaveLength(2);
        expect(secondPage).toHaveLength(1);
      });

      it('应该能够查找单个文档', async () => {
        // Act
        const user = await mockService.findOne('users', { name: 'Alice' });

        // Assert
        expect(user).toBeDefined();
        expect(user!.name).toBe('Alice');
      });

      it('应该能够根据ID查找文档', async () => {
        // Arrange
        const created = await mockService.create('users', { name: 'Test User' });

        // Act
        const found = await mockService.findById('users', created._id);

        // Assert
        expect(found).toBeDefined();
        expect(found!._id).toBe(created._id);
        expect(found!.name).toBe('Test User');
      });
    });

    describe('更新文档', () => {
      let userId: string;

      beforeEach(async () => {
        const user = await mockService.create('users', { name: 'Test User', age: 25 });
        userId = user._id;
      });

      it('应该能够更新文档', async () => {
        // Act
        const updated = await mockService.update('users', { _id: userId }, { age: 30 });

        // Assert
        expect(updated).toHaveLength(1);
        expect(updated[0].age).toBe(30);
        expect(updated[0].name).toBe('Test User'); // 保持不变
        expect(updated[0].updatedAt).toBeInstanceOf(Date);
      });

      it('应该能够根据ID更新文档', async () => {
        // Act
        const updated = await mockService.updateById('users', userId, { name: 'Updated User' });

        // Assert
        expect(updated).toBeDefined();
        expect(updated!.name).toBe('Updated User');
        expect(updated!.age).toBe(25); // 保持不变
      });

      it('应该支持批量更新', async () => {
        // Arrange
        await mockService.create('users', { name: 'User 2', age: 25 });
        await mockService.create('users', { name: 'User 3', age: 25 });

        // Act
        const updated = await mockService.update('users', { age: 25 }, { status: 'active' }, { multi: true });

        // Assert
        expect(updated.length).toBeGreaterThan(1);
        expect(updated.every(u => u.status === 'active')).toBe(true);
      });
    });

    describe('删除文档', () => {
      let userIds: string[];

      beforeEach(async () => {
        const users = await Promise.all([
          mockService.create('users', { name: 'User 1', age: 25 }),
          mockService.create('users', { name: 'User 2', age: 30 }),
          mockService.create('users', { name: 'User 3', age: 25 }),
        ]);
        userIds = users.map(u => u._id);
      });

      it('应该能够删除文档', async () => {
        // Act
        const deletedCount = await mockService.delete('users', { age: 25 });

        // Assert
        expect(deletedCount).toBe(1); // 默认只删除第一个匹配的

        const remaining = await mockService.find('users');
        expect(remaining).toHaveLength(2);
      });

      it('应该能够根据ID删除文档', async () => {
        // Act
        const deleted = await mockService.deleteById('users', userIds[0]);

        // Assert
        expect(deleted).toBe(true);

        const found = await mockService.findById('users', userIds[0]);
        expect(found).toBeNull();
      });

      it('应该支持批量删除', async () => {
        // Act
        const deletedCount = await mockService.delete('users', { age: 25 }, { multi: true });

        // Assert
        expect(deletedCount).toBe(2);

        const remaining = await mockService.find('users');
        expect(remaining).toHaveLength(1);
        expect(remaining[0].age).toBe(30);
      });
    });

    describe('统计操作', () => {
      beforeEach(async () => {
        await mockService.create('users', { name: 'User 1', age: 25 });
        await mockService.create('users', { name: 'User 2', age: 30 });
        await mockService.create('users', { name: 'User 3', age: 25 });
      });

      it('应该能够统计文档数量', async () => {
        // Act
        const totalCount = await mockService.count('users');
        const filteredCount = await mockService.count('users', { age: 25 });

        // Assert
        expect(totalCount).toBe(3);
        expect(filteredCount).toBe(2);
      });
    });
  });

  describe('索引管理', () => {
    beforeEach(async () => {
      await mockService.create('users', { name: 'Alice', email: 'alice@example.com' });
      await mockService.create('users', { name: 'Bob', email: 'bob@example.com' });
    });

    it('应该能够创建索引', async () => {
      // Act
      await mockService.createIndex('users', 'email');

      // Assert
      const stats = mockService.getCollectionStats('users');
      expect(stats!.indexes).toContain('email');
    });

    it('创建索引后应该为现有文档建立索引', async () => {
      // Act
      await mockService.createIndex('users', 'name');

      // Assert
      const stats = mockService.getCollectionStats('users');
      expect(stats!.indexCount).toBe(1);
    });
  });

  describe('集合管理', () => {
    it('应该能够清空集合', async () => {
      // Arrange
      await mockService.create('users', { name: 'Test User' });

      // Act
      await mockService.clearCollection('users');

      // Assert
      const count = await mockService.count('users');
      expect(count).toBe(0);
    });

    it('应该能够获取集合统计信息', async () => {
      // Arrange
      await mockService.create('users', { name: 'User 1' });
      await mockService.create('users', { name: 'User 2' });
      await mockService.createIndex('users', 'name');

      // Act
      const stats = mockService.getCollectionStats('users');

      // Assert
      expect(stats).toBeDefined();
      expect(stats!.name).toBe('users');
      expect(stats!.documentCount).toBe(2);
      expect(stats!.indexCount).toBe(1);
      expect(stats!.indexes).toContain('name');
    });

    it('应该能够获取所有集合统计信息', () => {
      // Act
      const allStats = mockService.getAllCollectionStats();

      // Assert
      expect(allStats).toHaveLength(4); // 默认集合数量
      expect(allStats.every(s => s.name && typeof s.documentCount === 'number')).toBe(true);
    });
  });

  describe('配置管理', () => {
    it('应该能够设置配置', () => {
      // Arrange
      const config: Partial<MockDatabaseConfig> = {
        autoIncrement: false,
        simulateLatency: false,
        failureRate: 0.1,
      };

      // Act
      mockService.setConfig(config);

      // Assert
      const stats = mockService.getDetailedStats();
      expect(stats.config.autoIncrement).toBe(false);
      expect(stats.config.simulateLatency).toBe(false);
      expect(stats.config.failureRate).toBe(0.1);
    });

    it('应该能够设置失败率', async () => {
      // Arrange
      mockService.setFailureRate(1); // 100% 失败率

      // Act & Assert
      await expect(mockService.create('users', { name: 'Test' }))
        .rejects.toThrow('Mock database create failed');
    });
  });

  describe('数据导入导出', () => {
    beforeEach(async () => {
      await mockService.create('users', { name: 'Alice', age: 25 });
      await mockService.create('users', { name: 'Bob', age: 30 });
      await mockService.create('works', { title: 'Work 1', author: 'Alice' });
    });

    it('应该能够导出数据', () => {
      // Act
      const exportedData = mockService.exportData();

      // Assert
      expect(exportedData.users).toHaveLength(2);
      expect(exportedData.works).toHaveLength(1);
      expect(exportedData.users[0].name).toBeTruthy();
    });

    it('应该能够导入数据', () => {
      // Arrange
      const importData = {
        users: [
          { _id: 'user1', name: 'Imported User 1', age: 35 },
          { _id: 'user2', name: 'Imported User 2', age: 40 },
        ],
        products: [
          { name: 'Product 1', price: 100 },
        ],
      };

      // Act
      mockService.importData(importData);

      // Assert
      const users = mockService.exportData().users;
      const products = mockService.exportData().products;

      expect(users).toHaveLength(2);
      expect(products).toHaveLength(1);
      expect(users.find(u => u.name === 'Imported User 1')).toBeDefined();
    });
  });

  describe('延迟模拟', () => {
    it('应该能够模拟延迟', async () => {
      // Arrange
      mockService.setConfig({ simulateLatency: true, defaultLatency: 100 });

      // Act
      const startTime = Date.now();
      await mockService.create('users', { name: 'Test User' });
      const endTime = Date.now();

      // Assert
      const actualDelay = endTime - startTime;
      expect(actualDelay).toBeGreaterThanOrEqual(100);
    });

    it('应该能够禁用延迟模拟', async () => {
      // Arrange
      mockService.setConfig({ simulateLatency: false });

      // Act
      const startTime = Date.now();
      await mockService.create('users', { name: 'Test User' });
      const endTime = Date.now();

      // Assert
      const actualDelay = endTime - startTime;
      expect(actualDelay).toBeLessThan(50); // 应该很快
    });
  });

  describe('服务验证', () => {
    it('正常状态下验证应该成功', async () => {
      // Act
      const isValid = await mockService.verify();

      // Assert
      expect(isValid).toBe(true);
    });

    it('高失败率时验证应该失败', async () => {
      // Arrange
      mockService.setFailureRate(1);

      // Act
      const isValid = await mockService.verify();

      // Assert
      expect(isValid).toBe(false);
      const status = mockService.getStatus();
      expect(status.errors.length).toBeGreaterThan(0);
    });
  });

  describe('重置功能', () => {
    it('重置应该清除所有数据和配置', async () => {
      // Arrange
      await mockService.create('users', { name: 'Test User' });
      mockService.setFailureRate(0.5);
      mockService.setConfig({ defaultLatency: 200 });

      // Act
      mockService.reset();

      // Assert
      const stats = mockService.getDetailedStats();
      expect(stats.callCount).toBe(0);
      expect(stats.totalDocuments).toBe(0);
      expect(stats.config.failureRate).toBe(0);
      expect(stats.config.defaultLatency).toBe(10);
      expect(stats.errors).toHaveLength(0);

      // 验证默认集合重新创建
      const collectionStats = mockService.getAllCollectionStats();
      expect(collectionStats).toHaveLength(4);
    });
  });

  describe('服务状态管理', () => {
    it('停用服务后应该抛出错误', async () => {
      // Arrange
      mockService.deactivate();

      // Act & Assert
      await expect(mockService.create('users', { name: 'Test' }))
        .rejects.toThrow('not active');

      await expect(mockService.find('users'))
        .rejects.toThrow('not active');
    });

    it('重新激活服务后应该正常工作', async () => {
      // Arrange
      mockService.deactivate();
      mockService.activate();

      // Act
      const created = await mockService.create('users', { name: 'Test User' });

      // Assert
      expect(created).toBeDefined();
      expect(created.name).toBe('Test User');
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的查询操作符', async () => {
      // Arrange
      await mockService.create('users', { name: 'Test', age: 25 });

      // Act
      const result = await mockService.find('users', { age: { $invalidOp: 25 } });

      // Assert
      expect(result).toHaveLength(0); // 无效操作符应该不匹配任何文档
    });

    it('应该处理嵌套字段查询', async () => {
      // Arrange
      await mockService.create('users', {
        name: 'Test',
        profile: { age: 25, city: 'New York' },
      });

      // Act
      const result = await mockService.find('users', { 'profile.age': 25 });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].profile.age).toBe(25);
    });
  });

  describe('性能和限制', () => {
    it('应该能够处理大量数据', async () => {
      // Arrange
      const promises = Array.from({ length: 100 }, (_, i) =>
        mockService.create('users', { name: `User ${i}`, index: i }),
      );

      // Act
      await Promise.all(promises);

      // Assert
      const count = await mockService.count('users');
      expect(count).toBe(100);

      const users = await mockService.find('users', {}, { limit: 10 });
      expect(users).toHaveLength(10);
    });
  });
});
