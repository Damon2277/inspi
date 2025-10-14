/**
 * 邮件模板简化测试
 * 专注于模板渲染的核心功能测试
 */

import {
  getVerificationEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordResetSuccessTemplate,
  renderTemplate,
  EmailTemplate,
  TemplateVariables,
} from '@/lib/email/templates';

describe('Email Template Simple Tests', () => {
  beforeEach(() => {
    // Setup environment variables for template rendering
    process.env.NEXT_PUBLIC_APP_URL = 'https://inspi-ai.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('验证邮件模板', () => {
    it('应该正确渲染注册验证邮件', () => {
      // Arrange
      const variables = {
        code: '123456',
        email: 'test@example.com',
        type: 'registration' as const,
        expiryMinutes: 10,
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

    it('应该支持登录验证邮件', () => {
      // Arrange
      const variables = {
        code: '654321',
        email: 'login@example.com',
        type: 'login' as const,
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.subject).toContain('登录验证');
      expect(template.html).toContain('完成登录');
      expect(template.text).toContain('完成登录');
    });

    it('应该支持密码重置验证邮件', () => {
      // Arrange
      const variables = {
        code: '789012',
        email: 'reset@example.com',
        type: 'password_reset' as const,
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.subject).toContain('密码重置');
      expect(template.html).toContain('重置密码');
      expect(template.text).toContain('重置密码');
    });

    it('应该包含安全提醒', () => {
      // Arrange
      const variables = {
        code: '111111',
        email: 'security@example.com',
        type: 'registration' as const,
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('安全提醒');
      expect(template.html).toContain('请勿将验证码告诉他人');
      expect(template.html).toContain('如非本人操作，请忽略此邮件');
      expect(template.text).toContain('请勿将验证码告诉他人');
    });

    it('应该生成有效的HTML结构', () => {
      // Arrange
      const variables = {
        code: '222222',
        email: 'html@example.com',
        type: 'registration' as const,
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('<!DOCTYPE html>');
      expect(template.html).toContain('<html lang="zh-CN">');
      expect(template.html).toContain('<head>');
      expect(template.html).toContain('<body>');
      expect(template.html).toContain('</html>');
      expect(template.html).toContain('<style>');
    });
  });

  describe('欢迎邮件模板', () => {
    it('应该正确渲染欢迎邮件', () => {
      // Arrange
      const variables = {
        name: 'John Doe',
        email: 'john@example.com',
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
        email: 'features@example.com',
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      const expectedFeatures = [
        'AI教学魔法师',
        '智慧广场',
        '知识图谱',
        '贡献度系统',
      ];

      expectedFeatures.forEach(feature => {
        expect(template.html).toContain(feature);
        expect(template.text).toContain(feature);
      });
    });

    it('应该包含行动号召', () => {
      // Arrange
      const variables = {
        name: 'CTA Tester',
        email: 'cta@example.com',
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('开始创作');
      expect(template.html).toContain(process.env.NEXT_PUBLIC_APP_URL);
      expect(template.text).toContain(process.env.NEXT_PUBLIC_APP_URL);
    });

    it('应该处理中文用户名', () => {
      // Arrange
      const variables = {
        name: '张三',
        email: 'chinese@example.com',
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('张三');
      expect(template.text).toContain('张三');
    });
  });

  describe('密码重置成功模板', () => {
    it('应该正确渲染密码重置成功通知', () => {
      // Arrange
      const variables = {
        email: 'reset@example.com',
        resetTime: '2024-01-15 14:30:00',
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
        resetTime: new Date().toISOString(),
      };

      // Act
      const template = getPasswordResetSuccessTemplate(variables);

      // Assert
      const securityTips = [
        '使用强密码',
        '不要在多个网站使用相同密码',
        '定期更换密码',
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
        resetTime: new Date().toISOString(),
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
    it('应该正确替换简单变量', () => {
      // Arrange
      const template = 'Hello {{name}}, your code is {{code}}.';
      const variables: TemplateVariables = {
        name: 'John',
        code: '123456',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello John, your code is 123456.');
    });

    it('应该处理多个相同变量', () => {
      // Arrange
      const template = 'Hello {{name}}, welcome {{name}} to our platform!';
      const variables: TemplateVariables = {
        name: 'Alice',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello Alice, welcome Alice to our platform!');
    });

    it('应该处理缺失的变量', () => {
      // Arrange
      const template = 'Hello {{name}}, your {{missing}} is ready.';
      const variables: TemplateVariables = {
        name: 'Bob',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello Bob, your {{missing}} is ready.');
    });

    it('应该处理空白字符', () => {
      // Arrange
      const template = 'Hello {{ name }}, your code is {{  code  }}.';
      const variables: TemplateVariables = {
        name: 'Charlie',
        code: 'ABC-123',
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Hello Charlie, your code is ABC-123.');
    });

    it('应该处理数字和布尔值', () => {
      // Arrange
      const template = 'Count: {{count}}, Active: {{active}}';
      const variables: TemplateVariables = {
        count: 42,
        active: true,
      };

      // Act
      const rendered = renderTemplate(template, variables);

      // Assert
      expect(rendered).toBe('Count: 42, Active: true');
    });
  });

  describe('模板安全性', () => {
    it('应该防止基本的XSS攻击', () => {
      // Arrange
      const variables = {
        name: '<script>alert("xss")</script>',
        email: 'xss@example.com',
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      // HTML中应该正确转义特殊字符
      expect(template.html).toContain('&lt;script&gt;');
      expect(template.html).toContain('&quot;xss&quot;');
      // 文本版本应该保持原样
      expect(template.text).toContain('<script>alert("xss")</script>');
    });

    it('应该处理HTML注入尝试', () => {
      // Arrange
      const variables = {
        code: '123456<img src="x" onerror="alert(1)">',
        email: 'injection@example.com',
        type: 'registration' as const,
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).not.toContain('onerror=');
      expect(template.html).toContain('&lt;img');
      expect(template.html).toContain('&gt;');
    });
  });

  describe('模板性能', () => {
    it('应该快速渲染模板', () => {
      // Arrange
      const variables = {
        code: '555555',
        email: 'performance@example.com',
        type: 'registration' as const,
      };

      // Act
      const startTime = Date.now();
      const template = getVerificationEmailTemplate(variables);
      const renderTime = Date.now() - startTime;

      // Assert
      expect(renderTime).toBeLessThan(100); // 渲染时间应该小于100ms
      expect(template.html.length).toBeGreaterThan(0);
      expect(template.text.length).toBeGreaterThan(0);
    });

    it('应该生成合理大小的邮件内容', () => {
      // Arrange
      const variables = {
        name: 'Size Test User',
        email: 'size@example.com',
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.html.length).toBeLessThan(50000); // HTML大小应该合理
      expect(template.text.length).toBeLessThan(5000);  // 文本大小应该合理
    });
  });

  describe('模板国际化', () => {
    it('应该支持中文内容', () => {
      // Arrange
      const variables = {
        name: '测试用户',
        email: 'chinese@example.com',
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
        type: 'registration' as const,
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('charset="UTF-8"');
      expect(template.html).toContain('验证码');
      expect(template.html).toContain('分钟');
    });
  });

  describe('模板结构验证', () => {
    it('应该包含必要的邮件元素', () => {
      // Arrange
      const variables = {
        name: 'Structure Test',
        email: 'structure@example.com',
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      // 检查HTML结构
      expect(template.html).toMatch(/<html[^>]*>/);
      expect(template.html).toMatch(/<head[^>]*>/);
      expect(template.html).toMatch(/<body[^>]*>/);
      expect(template.html).toMatch(/<\/html>/);

      // 检查语言属性
      expect(template.html).toContain('lang="zh-CN"');

      // 检查标题结构
      expect(template.html).toMatch(/<h[1-6][^>]*>/);
    });

    it('应该包含联系信息', () => {
      // Arrange
      const variables = {
        name: 'Contact Test',
        email: 'contact@example.com',
      };

      // Act
      const template = getWelcomeEmailTemplate(variables);

      // Assert
      expect(template.html).toContain('support@inspi-ai.com');
      expect(template.html).toContain('© 2024 Inspi.AI');
      expect(template.text).toContain('support@inspi-ai.com');
      expect(template.text).toContain('© 2024 Inspi.AI');
    });

    it('应该有完整的文本版本', () => {
      // Arrange
      const variables = {
        code: '777777',
        email: 'text@example.com',
        type: 'login' as const,
      };

      // Act
      const template = getVerificationEmailTemplate(variables);

      // Assert
      // 文本版本应该包含主要信息
      expect(template.text).toContain(variables.code);
      expect(template.text).toContain('登录验证');
      expect(template.text).toContain('Inspi.AI');

      // 文本版本不应该包含HTML标签
      expect(template.text).not.toMatch(/<[^>]*>/);
    });
  });
});
