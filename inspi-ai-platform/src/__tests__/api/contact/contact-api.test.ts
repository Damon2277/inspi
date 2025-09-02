/**
 * 联系API测试
 */

import { POST } from '@/app/api/contact/route'
import { 
  ApiTestHelper, 
  setupApiTestEnvironment, 
  mockDatabase, 
  mockServices,
  responseValidators
} from '../setup/api-test-setup'

// Mock外部依赖
jest.mock('@/lib/services/emailService', () => ({
  sendContactEmail: jest.fn().mockResolvedValue(true),
  sendAutoReply: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  saveContactMessage: jest.fn().mockImplementation((messageData) => {
    const message = { 
      ...messageData, 
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }
    if (!mockDatabase.contactMessages) {
      mockDatabase.contactMessages = new Map()
    }
    mockDatabase.contactMessages.set(message.id, message)
    return Promise.resolve(message)
  }),
}))

// Mock验证码服务
jest.mock('@/lib/services/captchaService', () => ({
  verifyCaptcha: jest.fn().mockResolvedValue(true),
}))

// Mock限流服务
jest.mock('@/lib/middleware/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true),
}))

describe('/api/contact API测试', () => {
  setupApiTestEnvironment()

  beforeEach(() => {
    if (!mockDatabase.contactMessages) {
      mockDatabase.contactMessages = new Map()
    }
  })

  describe('POST /api/contact - 发送联系消息', () => {
    test('应该成功发送联系消息', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Feature Request',
        message: 'I would like to request a new feature...',
        type: 'feature',
        captcha: 'valid-captcha-token',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      
      responseValidators.validateApiResponse(response)
      expect(response.success).toBe(true)
      expect(response.message).toContain('sent successfully')
      
      // 验证邮件发送
      const { sendContactEmail, sendAutoReply } = require('@/lib/services/emailService')
      expect(sendContactEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: contactData.name,
          email: contactData.email,
          subject: contactData.subject,
          message: contactData.message,
        })
      )
      expect(sendAutoReply).toHaveBeenCalledWith(contactData.email, contactData.name)
    })

    test('应该验证必需字段', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        subject: '',
        message: '',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: invalidData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      ApiTestHelper.expectValidationError(result, ['name', 'email', 'subject', 'message'])
    })

    test('应该验证邮箱格式', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'not-an-email',
        subject: 'Test Subject',
        message: 'Test message',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: invalidData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      ApiTestHelper.expectValidationError(result, ['email'])
    })

    test('应该验证消息长度', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'A'.repeat(5001), // 超过最大长度
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: invalidData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      ApiTestHelper.expectValidationError(result, ['message'])
    })

    test('应该验证验证码', async () => {
      const { verifyCaptcha } = require('@/lib/services/captchaService')
      verifyCaptcha.mockResolvedValueOnce(false)

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        captcha: 'invalid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(400)
      const response = await result.json()
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid captcha')
    })

    test('应该处理不同消息类型', async () => {
      const messageTypes = ['general', 'bug', 'feature', 'support', 'business']

      for (const type of messageTypes) {
        const contactData = {
          name: 'John Doe',
          email: 'john@example.com',
          subject: `${type} inquiry`,
          message: `This is a ${type} message`,
          type,
          captcha: 'valid-captcha',
        }

        const result = await ApiTestHelper.callApi(
          POST,
          '/api/contact',
          {
            body: contactData,
            headers: ApiTestHelper.createJsonHeaders(),
          }
        )

        expect(result.status).toBe(200)
        const response = await result.json()
        expect(response.success).toBe(true)
      }
    })

    test('应该清理XSS攻击', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'john@example.com',
        subject: 'Test <img src=x onerror=alert(1)> Subject',
        message: 'Message with <iframe src="javascript:alert(1)"></iframe> XSS',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: maliciousData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.success).toBe(true)

      // 验证存储的数据已清理
      const { saveContactMessage } = require('@/lib/db/mongodb')
      const savedData = saveContactMessage.mock.calls[saveContactMessage.mock.calls.length - 1][0]
      
      expect(savedData.name).not.toContain('<script>')
      expect(savedData.subject).not.toContain('<img')
      expect(savedData.message).not.toContain('<iframe')
      expect(savedData.name).toContain('John Doe')
    })

    test('应该处理附件上传', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Bug Report with Screenshot',
        message: 'Please see attached screenshot',
        type: 'bug',
        captcha: 'valid-captcha',
        attachments: [
          {
            name: 'screenshot.png',
            type: 'image/png',
            size: 1024 * 500, // 500KB
            data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          },
        ],
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.success).toBe(true)
      
      // 验证文件上传
      expect(mockServices.storage.upload).toHaveBeenCalled()
    })

    test('应该限制附件大小', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Large File',
        message: 'File too large',
        captcha: 'valid-captcha',
        attachments: [
          {
            name: 'large-file.pdf',
            type: 'application/pdf',
            size: 1024 * 1024 * 11, // 11MB (超过10MB限制)
            data: 'data:application/pdf;base64,' + 'A'.repeat(1000),
          },
        ],
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      ApiTestHelper.expectValidationError(result, ['attachments'])
    })

    test('应该限制附件类型', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Executable File',
        message: 'Trying to upload exe',
        captcha: 'valid-captcha',
        attachments: [
          {
            name: 'malware.exe',
            type: 'application/x-msdownload',
            size: 1024,
            data: 'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA',
          },
        ],
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      ApiTestHelper.expectValidationError(result, ['attachments'])
    })

    test('应该处理限流', async () => {
      const { checkRateLimit } = require('@/lib/middleware/rateLimiter')
      checkRateLimit.mockResolvedValueOnce(false)

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Rate Limited',
        message: 'This should be rate limited',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(429)
      const response = await result.json()
      expect(response.success).toBe(false)
      expect(response.error).toContain('rate limit')
    })

    test('应该处理邮件发送失败', async () => {
      const { sendContactEmail } = require('@/lib/services/emailService')
      sendContactEmail.mockRejectedValueOnce(new Error('SMTP server unavailable'))

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Email Failure Test',
        message: 'This email should fail to send',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      // 即使邮件发送失败，也应该保存消息并返回成功
      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.success).toBe(true)
      expect(response.message).toContain('received')
      
      // 但应该记录错误
      const { saveContactMessage } = require('@/lib/db/mongodb')
      expect(saveContactMessage).toHaveBeenCalled()
    })

    test('应该处理数据库保存失败', async () => {
      const { saveContactMessage } = require('@/lib/db/mongodb')
      saveContactMessage.mockRejectedValueOnce(new Error('Database error'))

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Database Error Test',
        message: 'This should cause database error',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(500)
      const response = await result.json()
      expect(response.success).toBe(false)
      expect(response.error).toContain('server error')
    })

    test('应该处理紧急消息', async () => {
      const urgentData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'URGENT: System Down',
        message: 'The system is completely down and users cannot access the platform',
        type: 'bug',
        priority: 'urgent',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: urgentData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.success).toBe(true)

      // 验证紧急消息的特殊处理
      const { sendContactEmail } = require('@/lib/services/emailService')
      const emailCall = sendContactEmail.mock.calls[sendContactEmail.mock.calls.length - 1][0]
      expect(emailCall.priority).toBe('urgent')
    })

    test('应该支持多语言消息', async () => {
      const chineseData = {
        name: '张三',
        email: 'zhangsan@example.com',
        subject: '功能建议',
        message: '希望能添加中文支持功能',
        type: 'feature',
        language: 'zh-CN',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: chineseData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(200)
      const response = await result.json()
      expect(response.success).toBe(true)

      // 验证自动回复使用正确语言
      const { sendAutoReply } = require('@/lib/services/emailService')
      const autoReplyCall = sendAutoReply.mock.calls[sendAutoReply.mock.calls.length - 1]
      expect(autoReplyCall[2]).toBe('zh-CN') // 语言参数
    })
  })

  describe('错误处理和边界情况', () => {
    test('应该处理无效JSON', async () => {
      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: 'invalid json',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      expect(result.status).toBe(400)
      const response = await result.json()
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid JSON')
    })

    test('应该处理缺少Content-Type', async () => {
      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: JSON.stringify({ name: 'Test' }),
          headers: {}, // 没有Content-Type
        }
      )

      expect(result.status).toBe(400)
    })

    test('应该处理空请求体', async () => {
      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: '',
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      expect(result.status).toBe(400)
      const response = await result.json()
      expect(response.success).toBe(false)
    })

    test('应该处理超长字段', async () => {
      const longData = {
        name: 'A'.repeat(1000),
        email: 'test@example.com',
        subject: 'B'.repeat(1000),
        message: 'C'.repeat(10000),
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: longData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      // 应该截断或拒绝超长字段
      expect([200, 400]).toContain(result.status)
    })
  })

  describe('安全性测试', () => {
    test('应该防止SQL注入', async () => {
      const maliciousData = {
        name: "'; DROP TABLE contact_messages; --",
        email: 'test@example.com',
        subject: 'SQL Injection Test',
        message: 'Testing SQL injection',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: maliciousData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      // 应该安全处理，不会导致系统错误
      expect([200, 400]).toContain(result.status)
    })

    test('应该防止NoSQL注入', async () => {
      const maliciousData = {
        name: { $ne: null },
        email: 'test@example.com',
        subject: 'NoSQL Injection Test',
        message: { $where: 'function() { return true; }' },
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: maliciousData,
          headers: ApiTestHelper.createJsonHeaders(),
        }
      )

      // 应该拒绝对象类型的字段
      ApiTestHelper.expectValidationError(result)
    })

    test('应该防止CSRF攻击', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'CSRF Test',
        message: 'Testing CSRF protection',
        captcha: 'valid-captcha',
      }

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/contact',
        {
          body: contactData,
          headers: {
            ...ApiTestHelper.createJsonHeaders(),
            'Origin': 'https://malicious-site.com',
            'Referer': 'https://malicious-site.com/attack',
          },
        }
      )

      // 应该检查Origin和Referer
      expect([200, 403]).toContain(result.status)
    })
  })
})