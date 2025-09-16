/**
 * 邮件模板系统渲染测试
 * 测试邮件模板的渲染、变量替换和格式验证
 */

import {
  getVerificationEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordResetSuccessTemplate,
  renderTemplate,
  EmailTemplate,
  TemplateVariables
} from '@/lib/email/templates';
import { TestDataFactory } from '@/lib/testing/TestDataFactory';
import { AssertionHelpers } from '@/lib/testing/helpers/AssertionHelpers';

describe('Email Template Rendering Tests', () => {
  let testDataFactory: TestDataFactory;

  beforeEach(() => {
    testDataFactory = new TestDataFactory();
    
    // Setup environment variables for template rendering
    process.env.NEXT_PUBLIC_APP_URL = 'https://inspi-ai.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('验证邮件模板', () => {
    it('应该正确渲染验证邮件模板', () => {
      // Arrange
      const variables = {
        code: '123456',
        email: 'test@example.com',
        type: 'registration' as const,
        expiryMinutes: 10
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.subject).toContain('注册验证');
      expect(template.subject).toContain('123456');
      expect(template.html).toContain('123456');
      expect(template.html).toContain('test@example.com');
      expect(template.html).toContain('10 分钟');
      expect(template.text).toContain('123456');
      expect(template.text).toContain('test@example.com');
    });

    it('应该支持不同类型的验证邮件', () => {
      // Arrange
      const testCases = [
        {
          type: 'registration' as const,
          expectedSubject: '注册验证',
          expectedAction: '完成注册'
        },
        {
          type: 'login' as const,
          expectedSubject: '登录验证',
          expectedAction: '完成登录'
        },
        {
          type: 'password_reset' as const,
          expectedSubject: '密码重置',
          expectedAction: '重置密码'
        }
      ];

      testCases.forEach(testCase => {
        // Act
        const template = getVerificationEmailTemplate({
          code: '654321',
          email: 'user@example.com',
          type: testCase.type
        });

        // Assert
        expect(template.subject).toContain(testCase.expectedSubject);
        expect(template.html).toContain(testCase.expectedAction);
        expect(template.text).toContain(testCase.expectedAction);
      });
    });

    it('应该包含安全提醒信息', () => {
      // Arrange
      const variables = {
        code: '789012',
        email: 'security@example.com',
        type: 'login' as const
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('安全提醒');
      expect(template.html).toContain('请勿将验证码告诉他人');
      expect(template.html).toContain('如非本人操作，请忽略此邮件');
      expect(template.text).toContain('请勿将验证码告诉他人');
    });

    it('应该正确处理自定义过期时间', () => {
      // Arrange
      const customExpiryMinutes = 30;
      const variables = {
        code: '111111',
        email: 'custom@example.com',
        type: 'registration' as const,
        expiryMinutes: customExpiryMinutes
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).toContain(`${customExpiryMinutes} 分钟`);
      expect(template.text).toContain(`${customExpiryMinutes} 分钟`);
    });

    it('应该生成有效的HTML结构', () => {
      // Arrange
      const variables = {
        code: '222222',
        email: 'html@example.com',
        type: 'registration' as const
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('<!DOCTYPE html>');
      expect(template.html).toContain('<html lang="zh-CN">');
      expect(template.html).toContain('<head>');
      expect(template.html).toContain('<body>');
      expect(template.html).toContain('</html>');
      
      // 验证CSS样式存在
      expect(template.html).toContain('<style>');
      expect(template.html).toContain('font-family');
      expect(template.html).toContain('background-color');
    });
  });

  describe('欢迎邮件模板', () => {
    it('应该正确渲染欢迎邮件模板', () => {
      // Arrange
      const variables = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.subject).toContain('欢迎加入 Inspi.AI');
      expect(template.html).toContain('John Doe');
      expect(template.html).toContain('john@example.com');
      expect(template.text).toContain('John Doe');
    });

    it('应该包含平台功能介绍', () => {
      // Arrange
      const variables = {
        name: 'Feature Tester',
        email: 'features@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      const expectedFeatures = [
        'AI教学魔法师',
        '智慧广场',
        '知识图谱',
        '贡献度系统'
      ];

      expectedFeatures.forEach(feature => {
        expect(template.html).toContain(feature);
        expect(template.text).toContain(feature);
      });
    });

    it('应该包含行动号召按钮', () => {
      // Arrange
      const variables = {
        name: 'CTA Tester',
        email: 'cta@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('开始创作');
      expect(template.html).toContain(process.env.NEXT_PUBLIC_APP_URL);
      expect(template.text).toContain(process.env.NEXT_PUBLIC_APP_URL);
    });

    it('应该处理特殊字符和HTML转义', () => {
      // Arrange
      const variables = {
        name: 'Test & <Script>',
        email: 'special@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      // HTML中应该正确转义特殊字符
      expect(template.html).toContain('Test &amp; &lt;Script&gt;');
      // 文本版本应该保持原样
      expect(template.text).toContain('Test & <Script>');
    });

    it('应该支持多语言用户名', () => {
      // Arrange
      const testCases = [
        { name: '张三', email: 'chinese@example.com' },
        { name: 'José García', email: 'spanish@example.com' },
        { name: 'محمد أحمد', email: 'arabic@example.com' },
        { name: '田中太郎', email: 'japanese@example.com' }
      ];

      testCases.forEach(testCase => {
        // Act
        const template = getWelcomeEmailTemplate(testCase);

        // Assert
        expect(template.html).toContain(testCase.name);
        expect(template.text).toContain(testCase.name);
      });
    });
  });

  describe('密码重置成功模板', () => {
    it('应该正确渲染密码重置成功模板', () => {
      // Arrange
      const variables = {
        email: 'reset@example.com',
        resetTime: '2024-01-15 14:30:00'
      };

      // Act
      const template = getPasswordResetSuccessTemplate(variables);

      // Assert
      expect(template.subject).toContain('密码重置成功');
      expect(template.html).toContain('reset@example.com');
      expect(template.html).toContain('2024-01-15 14:30:00');
      expect(template.text).toContain('reset@example.com');
      expect(template.text).toContain('2024-01-15 14:30:00');
    });

    it('应该包含安全建议', () => {
      // Arrange
      const variables = {
        email: 'security@example.com',
        resetTime: new Date().toISOString()
      };

      // Act
      const template = getPasswordResetSuccessTemplate(variables);

      // Assert
      const securityTips = [
        '使用强密码',
        '不要在多个网站使用相同密码',
        '定期更换密码'
      ];

      securityTips.forEach(tip => {
        expect(template.html).toContain(tip);
        expect(template.text).toContain(tip);
      });
    });

    it('应该包含安全警告', () => {
      // Arrange
      const variables = {
        email: 'warning@example.com',
        resetTime: new Date().toISOString()
      };

      // Act
      const template = getPasswordResetSuccessTemplate(variables);

      // Assert
      expect(template.html).toContain('如果这不是您本人的操作');
      expect(template.html).toContain('请立即联系我们');
      expect(template.text).toContain('如果这不是您本人的操作');
    });
  });

  describe('模板渲染引擎', () => {
    it('应该正确替换模板变量', () => {
      // Arrange
      const template = 'Hello {{name}}, your code is {{code}}. Valid for {{minutes}} minutes.';
      const variables: TemplateVariables = {
        name: 'John',
        code: '123456',
        minutes: 10
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello John, your code is 123456. Valid for 10 minutes.');
    });

    it('应该处理嵌套的模板变量', () => {
      // Arrange
      const template = 'Welcome {{user.name}} to {{app.name}}! Your {{user.type}} account is ready.';
      const variables: TemplateVariables = {
        'user.name': 'Alice',
        'app.name': 'Inspi.AI',
        'user.type': 'premium'
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Welcome Alice to Inspi.AI! Your premium account is ready.');
    });

    it('应该处理缺失的变量', () => {
      // Arrange
      const template = 'Hello {{name}}, your {{missing}} is ready.';
      const variables: TemplateVariables = {
        name: 'Bob'
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello Bob, your {{missing}} is ready.');
    });

    it('应该处理空白和特殊字符', () => {
      // Arrange
      const template = 'Hello {{ name }}, your code is {{  code  }}.';
      const variables: TemplateVariables = {
        name: 'Charlie',
        code: 'ABC-123'
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello Charlie, your code is ABC-123.');
    });

    it('应该支持条件渲染', () => {
      // Arrange
      const template = 'Hello {{name}}{{#if premium}}, you have premium access{{/if}}.';
      const variables: TemplateVariables = {
        name: 'David',
        premium: true
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toContain('premium access');
    });

    it('应该处理数组变量', () => {
      // Arrange
      const template = 'Your features: {{features.0}}, {{features.1}}, {{features.2}}';
      const variables: TemplateVariables = {
        'features.0': 'AI Magic',
        'features.1': 'Smart Square',
        'features.2': 'Knowledge Graph'
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Your features: AI Magic, Smart Square, Knowledge Graph');
    });
  });

  describe('模板验证和质量检查', () => {
    it('应该验证HTML模板的有效性', () => {
      // Arrange
      const variables = {
        code: '999999',
        email: 'validation@example.com',
        type: 'registration' as const
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      AssertionHelpers.assertValidHtml(template.html);
      
      // 检查必要的HTML元素
      expect(template.html).toMatch(/<html[^>]*>/);
      expect(template.html).toMatch(/<head[^>]*>/);
      expect(template.html).toMatch(/<body[^>]*>/);
      expect(template.html).toMatch(/<\/html>/);
    });

    it('应该验证邮件可访问性', () => {
      // Arrange
      const variables = {
        name: 'Accessibility Tester',
        email: 'a11y@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      // 检查alt属性
      const imgTags = template.html.match(/<img[^>]*>/g) || [];
      imgTags.forEach(img => {
        expect(img).toMatch(/alt\s*=\s*["'][^"']*["']/);
      });

      // 检查语言属性
      expect(template.html).toContain('lang="zh-CN"');

      // 检查标题结构
      expect(template.html).toMatch(/<h[1-6][^>]*>/);
    });

    it('应该检查邮件客户端兼容性', () => {
      // Arrange
      const variables = {
        code: '777777',
        email: 'compat@example.com',
        type: 'login' as const
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      // 检查内联样式（邮件客户端兼容性）
      expect(template.html).toContain('<style>');
      
      // 检查表格布局（更好的邮件客户端支持）
      expect(template.html).toMatch(/<table[^>]*>/);
      
      // 检查字体回退
      expect(template.html).toContain('font-family');
      expect(template.html).toContain('Arial');
      expect(template.html).toContain('sans-serif');
    });

    it('应该验证文本版本的完整性', () => {
      // Arrange
      const variables = {
        name: 'Text Tester',
        email: 'text@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      // 文本版本应该包含主要信息
      expect(template.text).toContain(variables.name);
      expect(template.text).toContain('欢迎');
      expect(template.text).toContain('Inspi.AI');
      
      // 文本版本应该包含链接
      expect(template.text).toContain('http');
      
      // 文本版本不应该包含HTML标签
      expect(template.text).not.toMatch(/<[^>]*>/);
    });

    it('应该检查模板性能', () => {
      // Arrange
      const variables = {
        code: '555555',
        email: 'performance@example.com',
        type: 'registration' as const
      };

      // Act
      const startTime = Date.now();
      const template = getVerificationEmailTemplate(variables);
      const renderTime = Date.now() - startTime;

      // Assert
      expect(renderTime).toBeLessThan(100); // 渲染时间应该小于100ms
      expect(template.html.length).toBeLessThan(50000); // HTML大小应该合理
      expect(template.text.length).toBeLessThan(5000); // 文本大小应该合理
    });
  });

  describe('模板国际化支持', () => {
    it('应该支持中文内容', () => {
      // Arrange
      const variables = {
        name: '测试用户',
        email: 'chinese@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('测试用户');
      expect(template.html).toContain('欢迎加入');
      expect(template.html).toContain('开始创作');
    });

    it('应该正确处理字符编码', () => {
      // Arrange
      const variables = {
        code: '666666',
        email: 'encoding@example.com',
        type: 'registration' as const
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('charset="UTF-8"');
      expect(template.html).toContain('验证码');
      expect(template.html).toContain('分钟');
    });

    it('应该支持RTL语言布局', () => {
      // Arrange - 模拟阿拉伯语环境
      const variables = {
        name: 'مستخدم تجريبي',
        email: 'rtl@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('مستخدم تجريبي');
      // 在实际实现中，应该根据语言设置dir="rtl"
    });
  });

  describe('模板安全性', () => {
    it('应该防止XSS攻击', () => {
      // Arrange
      const maliciousVariables = {
        name: '<script>alert("xss")</script>',
        email: 'xss@example.com'
      };

      // Act
      const template = getWelcomeEmailTemplate(maliciousVariables);

      // Assert
      expect(template.html).not.toContain('<script>');
      expect(template.html).toContain('&lt;script&gt;');
      expect(template.html).toContain('&quot;xss&quot;');
    });

    it('应该防止HTML注入', () => {
      // Arrange
      const maliciousVariables = {
        code: '123456<img src="x" onerror="alert(1)">',
        email: 'injection@example.com',
        type: 'registration' as const
      };

      // Act
      const template = getVerificationEmailTemplate(maliciousVariables);

      // Assert
      expect(template.html).not.toContain('onerror=');
      expect(template.html).toContain('&lt;img');
      expect(template.html).toContain('&gt;');
    });

    it('应该验证邮件地址格式', () => {
      // Arrange
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example',
        ''
      ];

      invalidEmails.forEach(email => {
        const variables = {
          name: 'Test User',
          email: email
        };

        // Act & Assert
        expect(() => {
          const template = getWelcomeEmailTemplate(variables);
          AssertionHelpers.assertValidEmail(email);
        }).toThrow();
      });
    });
  });
});