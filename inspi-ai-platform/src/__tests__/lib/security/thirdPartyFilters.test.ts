/**
 * 第三方过滤器测试
 */

import { BaiduContentFilter, ThirdPartyFilterManager } from '@/lib/security/thirdPartyFilters';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('BaiduContentFilter', () => {
  let filter: BaiduContentFilter;

  beforeEach(() => {
    filter = new BaiduContentFilter({
      provider: 'baidu',
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      enabled: true
    });
    jest.clearAllMocks();
  });

  describe('内容检测', () => {
    test('应该检测到违规内容', async () => {
      // Mock access token 请求
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock-token',
            expires_in: 3600
          })
        } as Response)
        // Mock 内容审核请求
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            conclusionType: 3, // 不合规
            confidence: 0.9,
            data: [{
              type: 'inappropriate',
              probability: 0.9,
              msg: '包含不当内容'
            }],
            log_id: 'test-log-id'
          })
        } as Response);

      const issues = await filter.detect('测试违规内容');
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('sensitive_word');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('百度内容审核');
    });

    test('应该通过正常内容', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock-token',
            expires_in: 3600
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            conclusionType: 1, // 合规
            confidence: 0.95,
            data: [],
            log_id: 'test-log-id'
          })
        } as Response);

      const issues = await filter.detect('正常内容');
      
      expect(issues).toHaveLength(0);
    });

    test('应该处理不确定内容', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock-token',
            expires_in: 3600
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            conclusionType: 2, // 不确定
            confidence: 0.7,
            data: [{
              type: 'uncertain',
              probability: 0.7,
              msg: '需要人工审核'
            }],
            log_id: 'test-log-id'
          })
        } as Response);

      const issues = await filter.detect('可疑内容');
      
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
    });

    test('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const issues = await filter.detect('测试内容');
      
      expect(issues).toHaveLength(0); // 错误时不阻止内容
    });

    test('应该处理百度API错误响应', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock-token',
            expires_in: 3600
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            error_code: 18,
            error_msg: 'Open api qps request limit reached'
          })
        } as Response);

      const issues = await filter.detect('测试内容');
      
      expect(issues).toHaveLength(0);
    });
  });

  describe('Token管理', () => {
    test('应该缓存access token', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock-token',
            expires_in: 3600
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            conclusionType: 1,
            confidence: 0.95,
            data: [],
            log_id: 'test-log-id-1'
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            conclusionType: 1,
            confidence: 0.95,
            data: [],
            log_id: 'test-log-id-2'
          })
        } as Response);

      await filter.detect('内容1');
      await filter.detect('内容2');
      
      // 应该只请求一次token
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1次token + 2次内容检测
    });
  });

  describe('禁用状态', () => {
    test('禁用时应该跳过检测', async () => {
      const disabledFilter = new BaiduContentFilter({
        provider: 'baidu',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        enabled: false
      });

      const issues = await disabledFilter.detect('任何内容');
      
      expect(issues).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

describe('ThirdPartyFilterManager', () => {
  let manager: ThirdPartyFilterManager;

  beforeEach(() => {
    manager = new ThirdPartyFilterManager();
    jest.clearAllMocks();
  });

  test('应该添加和移除过滤器', () => {
    manager.addFilter('test-baidu', {
      provider: 'baidu',
      apiKey: 'test-key',
      secretKey: 'test-secret',
      enabled: true
    });

    expect(manager.getFilters()).toContain('test-baidu');

    manager.removeFilter('test-baidu');
    expect(manager.getFilters()).not.toContain('test-baidu');
  });

  test('应该并行调用所有过滤器', async () => {
    // Mock 百度过滤器
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock-token',
          expires_in: 3600
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          conclusionType: 3,
          confidence: 0.9,
          data: [{ type: 'inappropriate', probability: 0.9, msg: '违规' }],
          log_id: 'test-log-id'
        })
      } as Response);

    manager.addFilter('baidu', {
      provider: 'baidu',
      apiKey: 'test-key',
      secretKey: 'test-secret',
      enabled: true
    });

    const issues = await manager.detectAll('测试内容');
    
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('百度内容审核');
  });

  test('应该处理过滤器错误', async () => {
    mockFetch.mockRejectedValue(new Error('网络错误'));

    manager.addFilter('baidu', {
      provider: 'baidu',
      apiKey: 'test-key',
      secretKey: 'test-secret',
      enabled: true
    });

    const issues = await manager.detectAll('测试内容');
    
    expect(issues).toHaveLength(0); // 错误时返回空数组
  });

  test('应该支持不支持的提供商', () => {
    expect(() => {
      manager.addFilter('unsupported', {
        provider: 'custom' as any,
        apiKey: 'test-key',
        enabled: true
      });
    }).toThrow('Unsupported provider: custom');
  });
});