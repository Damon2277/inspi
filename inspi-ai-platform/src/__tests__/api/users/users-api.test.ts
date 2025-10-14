/**
 * 用户API测试
 */

import {
  ApiTestHelper,
  setupApiTestEnvironment,
  mockDatabase,
  mockServices,
  jwtUtils,
  responseValidators,
} from '../setup/api-test-setup';

import { GET, PUT } from '@/app/api/profile/route';
import { createUserFixture, createUserProfileFixture } from '@/fixtures';

// Mock外部依赖
jest.mock('@/core/auth/middleware', () => ({
  authenticateUser: jest.fn().mockImplementation((request) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = jwtUtils.verifyTestToken(token);
      return Promise.resolve({ userId: payload.userId });
    } catch {
      throw new Error('Invalid token');
    }
  }),
}));

jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getUserById: jest.fn().mockImplementation((id) =>
    Promise.resolve(Array.from(mockDatabase.users.values()).find(u => u.id === id)),
  ),
  updateUser: jest.fn().mockImplementation((id, updates) => {
    const users = Array.from(mockDatabase.users.values());
    const user = users.find(u => u.id === id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      return Promise.resolve(user);
    }
    return Promise.resolve(null);
  }),
  getUserProfile: jest.fn().mockImplementation((userId) =>
    Promise.resolve(mockDatabase.profiles?.get(userId)),
  ),
  updateUserProfile: jest.fn().mockImplementation((userId, profileData) => {
    if (!mockDatabase.profiles) mockDatabase.profiles = new Map();
    const profile = { userId, ...profileData, updatedAt: new Date().toISOString() };
    mockDatabase.profiles.set(userId, profile);
    return Promise.resolve(profile);
  }),
  getUserStats: jest.fn().mockImplementation((userId) =>
    Promise.resolve({
      totalWorks: 5,
      totalViews: 100,
      totalLikes: 25,
      rank: 10,
    }),
  ),
}));

describe('/api/profile API测试', () => {
  setupApiTestEnvironment();

  const testUser = createUserFixture({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  });
  const authToken = jwtUtils.createTestToken({ userId: testUser.id });
  const authHeaders = ApiTestHelper.createAuthHeaders(authToken);

  beforeEach(() => {
    mockDatabase.users.set(testUser.id, testUser);

    // 初始化profiles Map
    if (!mockDatabase.profiles) {
      mockDatabase.profiles = new Map();
    }
  });

  describe('GET /api/profile - 获取用户资料', () => {
    test('应该返回当前用户的完整资料', async () => {
      const testProfile = createUserProfileFixture(testUser.id, {
        bio: 'Test user bio',
        skills: ['Mathematics', 'Teaching'],
      });
      mockDatabase.profiles.set(testUser.id, testProfile);

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/profile',
        {
          headers: authHeaders,
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      responseValidators.validateUserResponse(response);
      expect(response.success).toBe(true);
      expect(response.data.user.id).toBe(testUser.id);
      expect(response.data.user.email).toBe(testUser.email);
      expect(response.data.profile.bio).toBe(testProfile.bio);
      expect(response.data.stats).toBeDefined();
    });

    test('应该处理没有profile的用户', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/profile',
        {
          headers: authHeaders,
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      expect(response.success).toBe(true);
      expect(response.data.user.id).toBe(testUser.id);
      expect(response.data.profile).toBeNull();
      expect(response.data.stats).toBeDefined();
    });

    test('应该要求用户认证', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/profile',
      );

      ApiTestHelper.expectUnauthorizedError(result);
    });

    test('应该处理无效token', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/profile',
        {
          headers: { 'Authorization': 'Bearer invalid-token' },
        },
      );

      ApiTestHelper.expectUnauthorizedError(result);
    });

    test('应该隐藏敏感信息', async () => {
      const result = await ApiTestHelper.callApi(
        GET,
        '/api/profile',
        {
          headers: authHeaders,
        },
      );

      const response = await result.json();

      // 确保不返回敏感信息
      expect(response.data.user).not.toHaveProperty('password');
      expect(response.data.user).not.toHaveProperty('passwordHash');
      expect(response.data.user).not.toHaveProperty('resetToken');
    });
  });

  describe('PUT /api/profile - 更新用户资料', () => {
    test('应该成功更新用户基本信息', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio',
        website: 'https://example.com',
        location: 'New City',
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      expect(response.success).toBe(true);
      expect(response.data.user.name).toBe(updateData.name);
      expect(response.data.profile.bio).toBe(updateData.bio);
      expect(response.data.profile.website).toBe(updateData.website);
    });

    test('应该验证邮箱格式', async () => {
      const updateData = {
        email: 'invalid-email-format',
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      ApiTestHelper.expectValidationError(result, ['email']);
    });

    test('应该验证网站URL格式', async () => {
      const updateData = {
        website: 'not-a-valid-url',
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      ApiTestHelper.expectValidationError(result, ['website']);
    });

    test('应该处理技能标签', async () => {
      const updateData = {
        skills: ['Mathematics', 'Science', 'Teaching', 'Programming'],
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      expect(response.data.profile.skills).toEqual(updateData.skills);
    });

    test('应该限制技能标签数量', async () => {
      const updateData = {
        skills: Array(20).fill(null).map((_, i) => `Skill ${i + 1}`), // 太多技能
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      ApiTestHelper.expectValidationError(result, ['skills']);
    });

    test('应该清理XSS攻击', async () => {
      const updateData = {
        name: '<script>alert("xss")</script>Malicious Name',
        bio: 'Bio with <img src=x onerror=alert(1)> XSS',
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      // 应该清理恶意脚本
      expect(response.data.user.name).not.toContain('<script>');
      expect(response.data.profile.bio).not.toContain('<img');
      expect(response.data.user.name).toContain('Malicious Name');
    });

    test('应该处理头像上传', async () => {
      const updateData = {
        avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      expect(response.data.profile.avatar).toBeDefined();
      expect(mockServices.storage.upload).toHaveBeenCalled();
    });

    test('应该验证头像文件大小', async () => {
      const largeImageData = 'data:image/jpeg;base64,' + 'A'.repeat(10 * 1024 * 1024); // 10MB

      const updateData = {
        avatar: largeImageData,
      };

      const result = await ApiTestHelper.callApi(
        PUT,
        '/api/profile',
        {
          body: updateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      ApiTestHelper.expectValidationError(result, ['avatar']);
    });
  });

  describe('错误处理', () => {
    test('应该处理数据库错误', async () => {
      const { getUserById } = require('@/lib/db/mongodb');
      getUserById.mockRejectedValueOnce(new Error('Database error'));

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/profile',
        {
          headers: authHeaders,
        },
      );

      expect(result.status).toBe(500);
      const response = await result.json();
      expect(response.success).toBe(false);
    });

    test('应该处理用户不存在', async () => {
      const { getUserById } = require('@/lib/db/mongodb');
      getUserById.mockResolvedValueOnce(null);

      const result = await ApiTestHelper.callApi(
        GET,
        '/api/profile',
        {
          headers: authHeaders,
        },
      );

      ApiTestHelper.expectNotFoundError(result);
    });
  });
});
