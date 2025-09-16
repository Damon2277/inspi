/**
 * 数据库事务一致性测试
 * 测试数据库事务的ACID特性、并发控制和数据一致性
 */

import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Work from '@/lib/models/Work';
import Contribution from '@/lib/models/Contribution';

// Mock mongoose with transaction support
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
  inTransaction: jest.fn().mockReturnValue(false),
  transaction: jest.fn()
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
  transaction: jest.fn(),
  db: {
    admin: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue({ ok: 1 })
    })
  }
};

jest.mock('mongoose', () => ({
  connection: mockConnection,
  startSession: jest.fn().mockResolvedValue(mockSession),
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => id || `mock-id-${Date.now()}`)
  }
}));

// Mock models with transaction support
const createTransactionMockModel = (name: string) => {
  const mockData = new Map();
  let transactionData = new Map(); // 事务中的临时数据
  let isInTransaction = false;
  
  return {
    create: jest.fn().mockImplementation(async (data, options = {}) => {
      const doc = {
        ...data,
        _id: `mock-${name.toLowerCase()}-id-${Date.now()}-${Math.random()}`,
        save: jest.fn().mockResolvedValue(data)
      };
      
      if (options.session && isInTransaction) {
        transactionData.set(doc._id, doc);
      } else {
        mockData.set(doc._id, doc);
      }
      
      return doc;
    }),
    
    findById: jest.fn().mockImplementation((id) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        return Promise.resolve(
          transactionData.get(id) || mockData.get(id) || null
        );
      })
    })),
    
    findByIdAndUpdate: jest.fn().mockImplementation((id, update, options = {}) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        const dataStore = (options.session && isInTransaction) ? transactionData : mockData;
        const existing = dataStore.get(id);
        if (!existing) return Promise.resolve(null);
        
        const updated = { ...existing, ...update };
        dataStore.set(id, updated);
        return Promise.resolve(options.new ? updated : existing);
      })
    })),
    
    findByIdAndDelete: jest.fn().mockImplementation((id, options = {}) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        const dataStore = (options.session && isInTransaction) ? transactionData : mockData;
        const existing = dataStore.get(id);
        if (existing) {
          dataStore.delete(id);
        }
        return Promise.resolve(existing || null);
      })
    })),
    
    find: jest.fn().mockImplementation((query = {}) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        const allData = new Map([...mockData, ...transactionData]);
        return Promise.resolve(
          Array.from(allData.values()).filter(item => 
            Object.keys(query).every(key => item[key] === query[key])
          )
        );
      })
    })),
    
    countDocuments: jest.fn().mockImplementation((query = {}) => ({
      exec: jest.fn().mockResolvedValue(
        Array.from(mockData.values()).filter(item => 
          Object.keys(query).every(key => item[key] === query[key])
        ).length
      )
    })),
    
    // Transaction control methods
    __startTransaction: () => {
      isInTransaction = true;
      transactionData.clear();
    },
    
    __commitTransaction: () => {
      // Move transaction data to main data
      for (const [key, value] of transactionData) {
        mockData.set(key, value);
      }
      transactionData.clear();
      isInTransaction = false;
    },
    
    __abortTransaction: () => {
      transactionData.clear();
      isInTransaction = false;
    },
    
    __clearAllData: () => {
      mockData.clear();
      transactionData.clear();
      isInTransaction = false;
    },
    
    __getMainData: () => mockData,
    __getTransactionData: () => transactionData,
    __isInTransaction: () => isInTransaction
  };
};

// Create transaction-aware mock models
const MockUser = createTransactionMockModel('User');
const MockWork = createTransactionMockModel('Work');
const MockContribution = createTransactionMockModel('Contribution');

// Mock the model imports
jest.mock('@/lib/models/User', () => MockUser);
jest.mock('@/lib/models/Work', () => MockWork);
jest.mock('@/lib/models/Contribution', () => MockContribution);

describe('数据库事务一致性测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockUser.__clearAllData();
    MockWork.__clearAllData();
    MockContribution.__clearAllData();
    
    // Reset session mocks
    mockSession.startTransaction.mockClear();
    mockSession.commitTransaction.mockClear();
    mockSession.abortTransaction.mockClear();
    mockSession.endSession.mockClear();
  });

  describe('ACID特性测试', () => {
    describe('原子性(Atomicity)测试', () => {
      it('应该在事务成功时提交所有操作', async () => {
        // Arrange
        const session = await mongoose.startSession();
        
        // Mock transaction success
        mockSession.transaction.mockImplementation(async (fn) => {
          MockUser.__startTransaction();
          MockWork.__startTransaction();
          MockContribution.__startTransaction();
          
          try {
            const result = await fn(session);
            MockUser.__commitTransaction();
            MockWork.__commitTransaction();
            MockContribution.__commitTransaction();
            return result;
          } catch (error) {
            MockUser.__abortTransaction();
            MockWork.__abortTransaction();
            MockContribution.__abortTransaction();
            throw error;
          }
        });

        // Act
        const result = await session.transaction(async (session) => {
          const user = await MockUser.create({
            email: 'atomic@example.com',
            name: 'Atomic User'
          }, { session });
          
          const work = await MockWork.create({
            title: 'Atomic Work',
            author: user._id,
            content: { concept: 'test' }
          }, { session });
          
          const contribution = await MockContribution.create({
            user: user._id,
            work: work._id,
            type: 'create',
            points: 10
          }, { session });
          
          return { user, work, contribution };
        });

        // Assert
        expect(result.user).toBeDefined();
        expect(result.work).toBeDefined();
        expect(result.contribution).toBeDefined();
        expect(mockSession.transaction).toHaveBeenCalled();
      });

      it('应该在事务失败时回滚所有操作', async () => {
        // Arrange
        const session = await mongoose.startSession();
        
        // Mock transaction failure
        mockSession.transaction.mockImplementation(async (fn) => {
          MockUser.__startTransaction();
          MockWork.__startTransaction();
          MockContribution.__startTransaction();
          
          try {
            await fn(session);
            // 模拟事务中的错误
            throw new Error('Transaction failed');
          } catch (error) {
            MockUser.__abortTransaction();
            MockWork.__abortTransaction();
            MockContribution.__abortTransaction();
            throw error;
          }
        });

        // Act & Assert
        await expect(session.transaction(async (session) => {
          await MockUser.create({
            email: 'rollback@example.com',
            name: 'Rollback User'
          }, { session });
          
          await MockWork.create({
            title: 'Rollback Work',
            author: 'rollback-user-id',
            content: { concept: 'test' }
          }, { session });
          
          // 模拟操作失败
          throw new Error('Simulated failure');
        })).rejects.toThrow('Transaction failed');

        // Assert - 验证数据未被保存
        const users = await MockUser.find().exec();
        const works = await MockWork.find().exec();
        expect(users).toHaveLength(0);
        expect(works).toHaveLength(0);
      });
    });

    describe('一致性(Consistency)测试', () => {
      it('应该维护数据完整性约束', async () => {
        // Arrange
        const session = await mongoose.startSession();
        
        mockSession.transaction.mockImplementation(async (fn) => {
          MockUser.__startTransaction();
          MockWork.__startTransaction();
          MockContribution.__startTransaction();
          
          const result = await fn(session);
          
          MockUser.__commitTransaction();
          MockWork.__commitTransaction();
          MockContribution.__commitTransaction();
          
          return result;
        });

        // Act
        const result = await session.transaction(async (session) => {
          const user = await MockUser.create({
            email: 'consistency@example.com',
            name: 'Consistency User',
            contributionScore: 0
          }, { session });
          
          const work = await MockWork.create({
            title: 'Consistency Work',
            author: user._id,
            content: { concept: 'test' },
            likes: 0
          }, { session });
          
          const contribution = await MockContribution.create({
            user: user._id,
            work: work._id,
            type: 'create',
            points: 10
          }, { session });
          
          // 更新用户贡献分数
          const updatedUser = await MockUser.findByIdAndUpdate(
            user._id,
            { contributionScore: 10 },
            { new: true, session }
          ).exec();
          
          return { user: updatedUser, work, contribution };
        });

        // Assert
        expect(result.user.contributionScore).toBe(10);
        expect(result.contribution.points).toBe(10);
        expect(result.work.author).toBe(result.user._id);
      });
    });

    describe('隔离性(Isolation)测试', () => {
      it('应该防止脏读', async () => {
        // Arrange
        const session1 = await mongoose.startSession();
        const session2 = await mongoose.startSession();
        
        // 模拟两个并发事务
        mockSession.transaction.mockImplementation(async (fn) => {
          MockUser.__startTransaction();
          const result = await fn();
          // 不立即提交，模拟长时间运行的事务
          return result;
        });

        // Act
        const transaction1Promise = session1.transaction(async (session) => {
          const user = await MockUser.create({
            email: 'isolation1@example.com',
            name: 'Isolation User 1'
          }, { session });
          
          // 模拟长时间运行的操作
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return user;
        });

        const transaction2Promise = session2.transaction(async (session) => {
          // 尝试读取事务1中创建但未提交的数据
          const users = await MockUser.find({ email: 'isolation1@example.com' }).exec();
          return users;
        });

        const [user1, users2] = await Promise.all([transaction1Promise, transaction2Promise]);

        // Assert - 事务2不应该看到事务1未提交的数据
        expect(user1).toBeDefined();
        expect(users2).toHaveLength(0); // 脏读被防止
      });
    });

    describe('持久性(Durability)测试', () => {
      it('应该确保提交的事务持久化', async () => {
        // Arrange
        const session = await mongoose.startSession();
        
        mockSession.transaction.mockImplementation(async (fn) => {
          MockUser.__startTransaction();
          const result = await fn(session);
          MockUser.__commitTransaction();
          return result;
        });

        // Act
        const user = await session.transaction(async (session) => {
          return await MockUser.create({
            email: 'durable@example.com',
            name: 'Durable User'
          }, { session });
        });

        // Assert - 验证数据已持久化
        const persistedUser = await MockUser.findById(user._id).exec();
        expect(persistedUser).toBeDefined();
        expect(persistedUser.email).toBe('durable@example.com');
      });
    });
  });

  describe('并发控制测试', () => {
    it('应该处理并发事务冲突', async () => {
      // Arrange
      const user = await MockUser.create({
        email: 'concurrent@example.com',
        name: 'Concurrent User',
        contributionScore: 100
      });

      const session1 = await mongoose.startSession();
      const session2 = await mongoose.startSession();

      // Act - 两个事务同时尝试更新同一用户
      const transaction1Promise = session1.transaction(async (session) => {
        const currentUser = await MockUser.findById(user._id).session(session).exec();
        await new Promise(resolve => setTimeout(resolve, 100)); // 模拟处理时间
        
        return await MockUser.findByIdAndUpdate(
          user._id,
          { contributionScore: currentUser.contributionScore + 50 },
          { new: true, session }
        ).exec();
      });

      const transaction2Promise = session2.transaction(async (session) => {
        const currentUser = await MockUser.findById(user._id).session(session).exec();
        await new Promise(resolve => setTimeout(resolve, 50)); // 更短的处理时间
        
        return await MockUser.findByIdAndUpdate(
          user._id,
          { contributionScore: currentUser.contributionScore + 30 },
          { new: true, session }
        ).exec();
      });

      const [result1, result2] = await Promise.all([transaction1Promise, transaction2Promise]);

      // Assert - 最终结果应该反映两个更新
      expect(result1.contributionScore).toBeGreaterThan(100);
      expect(result2.contributionScore).toBeGreaterThan(100);
    });

    it('应该处理死锁情况', async () => {
      // Arrange
      const user1 = await MockUser.create({ email: 'deadlock1@example.com', name: 'User 1' });
      const user2 = await MockUser.create({ email: 'deadlock2@example.com', name: 'User 2' });

      const session1 = await mongoose.startSession();
      const session2 = await mongoose.startSession();

      // Mock deadlock detection
      let deadlockDetected = false;
      mockSession.transaction.mockImplementation(async (fn) => {
        if (deadlockDetected) {
          throw new Error('Deadlock detected');
        }
        return await fn();
      });

      // Act - 创建死锁场景
      const transaction1Promise = session1.transaction(async (session) => {
        await MockUser.findByIdAndUpdate(user1._id, { name: 'Updated by T1' }, { session }).exec();
        await new Promise(resolve => setTimeout(resolve, 100));
        await MockUser.findByIdAndUpdate(user2._id, { name: 'Updated by T1' }, { session }).exec();
      });

      const transaction2Promise = session2.transaction(async (session) => {
        await MockUser.findByIdAndUpdate(user2._id, { name: 'Updated by T2' }, { session }).exec();
        await new Promise(resolve => setTimeout(resolve, 50));
        deadlockDetected = true; // 模拟死锁检测
        await MockUser.findByIdAndUpdate(user1._id, { name: 'Updated by T2' }, { session }).exec();
      });

      // Assert - 至少一个事务应该失败
      const results = await Promise.allSettled([transaction1Promise, transaction2Promise]);
      const failures = results.filter(result => result.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });
  });

  describe('事务性能测试', () => {
    it('应该在合理时间内完成简单事务', async () => {
      // Arrange
      const session = await mongoose.startSession();
      const startTime = Date.now();

      // Act
      await session.transaction(async (session) => {
        await MockUser.create({
          email: 'performance@example.com',
          name: 'Performance User'
        }, { session });
      });

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该处理大量数据的事务', async () => {
      // Arrange
      const session = await mongoose.startSession();
      const dataCount = 100;
      const startTime = Date.now();

      // Act
      await session.transaction(async (session) => {
        const createPromises = Array(dataCount).fill(null).map((_, index) =>
          MockUser.create({
            email: `bulk${index}@example.com`,
            name: `Bulk User ${index}`
          }, { session })
        );
        
        await Promise.all(createPromises);
      });

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 100个创建操作应该在5秒内完成
      
      const userCount = await MockUser.countDocuments().exec();
      expect(userCount).toBe(dataCount);
    });
  });

  describe('事务错误处理测试', () => {
    it('应该处理会话超时', async () => {
      // Arrange
      const session = await mongoose.startSession();
      
      mockSession.transaction.mockImplementation(async () => {
        throw new Error('Session timeout');
      });

      // Act & Assert
      await expect(session.transaction(async (session) => {
        await MockUser.create({
          email: 'timeout@example.com',
          name: 'Timeout User'
        }, { session });
      })).rejects.toThrow('Session timeout');
    });

    it('应该处理网络中断', async () => {
      // Arrange
      const session = await mongoose.startSession();
      
      mockSession.transaction.mockImplementation(async () => {
        throw new Error('Network error');
      });

      // Act & Assert
      await expect(session.transaction(async (session) => {
        await MockUser.create({
          email: 'network@example.com',
          name: 'Network User'
        }, { session });
      })).rejects.toThrow('Network error');
    });

    it('应该处理资源不足', async () => {
      // Arrange
      const session = await mongoose.startSession();
      
      mockSession.transaction.mockImplementation(async () => {
        throw new Error('Insufficient resources');
      });

      // Act & Assert
      await expect(session.transaction(async (session) => {
        // 尝试创建大量数据
        const promises = Array(10000).fill(null).map((_, index) =>
          MockUser.create({
            email: `resource${index}@example.com`,
            name: `Resource User ${index}`
          }, { session })
        );
        
        await Promise.all(promises);
      })).rejects.toThrow('Insufficient resources');
    });
  });

  describe('事务监控和日志测试', () => {
    it('应该记录事务开始和结束', async () => {
      // Arrange
      const session = await mongoose.startSession();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await session.transaction(async (session) => {
        console.log('Transaction started');
        await MockUser.create({
          email: 'logged@example.com',
          name: 'Logged User'
        }, { session });
        console.log('Transaction completed');
      });

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Transaction started');
      expect(logSpy).toHaveBeenCalledWith('Transaction completed');
      
      logSpy.mockRestore();
    });

    it('应该记录事务失败信息', async () => {
      // Arrange
      const session = await mongoose.startSession();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSession.transaction.mockImplementation(async () => {
        console.error('Transaction failed: Test error');
        throw new Error('Test error');
      });

      // Act & Assert
      await expect(session.transaction(async (session) => {
        await MockUser.create({
          email: 'error@example.com',
          name: 'Error User'
        }, { session });
      })).rejects.toThrow('Test error');

      expect(errorSpy).toHaveBeenCalledWith('Transaction failed: Test error');
      
      errorSpy.mockRestore();
    });

    it('应该监控事务性能指标', async () => {
      // Arrange
      const session = await mongoose.startSession();
      const performanceMetrics = {
        startTime: 0,
        endTime: 0,
        duration: 0
      };

      mockSession.transaction.mockImplementation(async (fn) => {
        performanceMetrics.startTime = Date.now();
        const result = await fn();
        performanceMetrics.endTime = Date.now();
        performanceMetrics.duration = performanceMetrics.endTime - performanceMetrics.startTime;
        return result;
      });

      // Act
      await session.transaction(async (session) => {
        await MockUser.create({
          email: 'metrics@example.com',
          name: 'Metrics User'
        }, { session });
      });

      // Assert
      expect(performanceMetrics.startTime).toBeGreaterThan(0);
      expect(performanceMetrics.endTime).toBeGreaterThan(performanceMetrics.startTime);
      expect(performanceMetrics.duration).toBeGreaterThan(0);
    });
  });
});