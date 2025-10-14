/**
 * 邮件模板系统
 * 提供各种邮件模板的HTML和文本版本
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/**
 * 邮件验证码模板
 */
export function getVerificationEmailTemplate(variables: {
  code: string;
  email: string;
  type: 'registration' | 'login' | 'password_reset';
  expiryMinutes?: number;
}): EmailTemplate {
  const { code, email, type, expiryMinutes = 10 } = variables;

  const typeMap = {
    registration: '注册验证',
    login: '登录验证',
    password_reset: '密码重置',
  };

  const actionMap = {
    registration: '完成注册',
    login: '完成登录',
    password_reset: '重置密码',
  };

  const subject = `【Inspi.AI】${typeMap[type]}验证码：${code}`;

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .code-container {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            color: white;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }
        .code-label {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-top: 10px;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }
        .warning-text {
            color: #92400e;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .footer a {
            color: #6366f1;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Inspi.AI</div>
            <div class="title">${typeMap[type]}验证码</div>
        </div>

        <div class="content">
            <p>您好，</p>
            <p>您正在使用邮箱 <strong>${email}</strong> 进行${typeMap[type]}操作。</p>
            <p>请使用以下验证码${actionMap[type]}：</p>
        </div>

        <div class="code-container">
            <div class="code">${code}</div>
            <div class="code-label">验证码</div>
        </div>

        <div class="warning">
            <div class="warning-title">⚠️ 安全提醒</div>
            <div class="warning-text">
                • 验证码有效期为 ${expiryMinutes} 分钟<br>
                • 请勿将验证码告诉他人<br>
                • 如非本人操作，请忽略此邮件
            </div>
        </div>

        <div class="content">
            <p>如果您没有进行此操作，请忽略此邮件。您的账户安全不会受到影响。</p>
        </div>

        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系我们：<a href="mailto:support@inspi-ai.com">support@inspi-ai.com</a></p>
            <p>&copy; 2024 Inspi.AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
【Inspi.AI】${typeMap[type]}验证码

您好，

您正在使用邮箱 ${email} 进行${typeMap[type]}操作。

验证码：${code}

请在 ${expiryMinutes} 分钟内使用此验证码${actionMap[type]}。

安全提醒：
- 请勿将验证码告诉他人
- 如非本人操作，请忽略此邮件

如有疑问，请联系我们：support@inspi-ai.com

© 2024 Inspi.AI. All rights reserved.
`;

  return { subject, html, text };
}

/**
 * 欢迎邮件模板
 */
export function getWelcomeEmailTemplate(variables: {
  name: string;
  email: string;
}): EmailTemplate {
  const { name, email } = variables;

  const subject = '欢迎加入 Inspi.AI - 开启您的AI教学创作之旅！';

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .features {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .feature-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        .feature-icon {
            font-size: 20px;
            margin-right: 12px;
            margin-top: 2px;
        }
        .feature-text {
            flex: 1;
        }
        .feature-title {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }
        .feature-desc {
            color: #6b7280;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎓 Inspi.AI</div>
            <div class="title">欢迎加入 Inspi.AI！</div>
        </div>

        <div class="content">
            <p>亲爱的 ${name}，</p>
            <p>欢迎加入 Inspi.AI 大家庭！我们很高兴您选择我们的平台来开启您的AI教学创作之旅。</p>
        </div>

        <div class="features">
            <div class="feature-item">
                <div class="feature-icon">🎯</div>
                <div class="feature-text">
                    <div class="feature-title">AI教学魔法师</div>
                    <div class="feature-desc">输入知识点，AI自动生成四种类型的教学卡片</div>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon">🌐</div>
                <div class="feature-text">
                    <div class="feature-title">智慧广场</div>
                    <div class="feature-desc">发现和分享优质教学内容，与同行交流经验</div>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon">🧠</div>
                <div class="feature-text">
                    <div class="feature-title">知识图谱</div>
                    <div class="feature-desc">构建个人知识体系，让教学更有条理</div>
                </div>
            </div>
            <div class="feature-item">
                <div class="feature-icon">🏆</div>
                <div class="feature-text">
                    <div class="feature-title">贡献度系统</div>
                    <div class="feature-desc">记录您的创作贡献，获得社区认可</div>
                </div>
            </div>
        </div>

        <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="cta-button">
                开始创作 →
            </a>
        </div>

        <div class="content">
            <p>如果您在使用过程中遇到任何问题，请随时联系我们的支持团队。我们将竭诚为您服务！</p>
        </div>

        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系我们：<a href="mailto:support@inspi-ai.com">support@inspi-ai.com</a></p>
            <p>&copy; 2024 Inspi.AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
欢迎加入 Inspi.AI！

亲爱的 ${name}，

欢迎加入 Inspi.AI 大家庭！我们很高兴您选择我们的平台来开启您的AI教学创作之旅。

平台特色功能：
🎯 AI教学魔法师 - 输入知识点，AI自动生成四种类型的教学卡片
🌐 智慧广场 - 发现和分享优质教学内容，与同行交流经验
🧠 知识图谱 - 构建个人知识体系，让教学更有条理
🏆 贡献度系统 - 记录您的创作贡献，获得社区认可

立即开始：${process.env.NEXT_PUBLIC_APP_URL}

如果您在使用过程中遇到任何问题，请随时联系我们的支持团队。

联系我们：support@inspi-ai.com

© 2024 Inspi.AI. All rights reserved.
`;

  return { subject, html, text };
}

/**
 * 密码重置成功通知模板
 */
export function getPasswordResetSuccessTemplate(variables: {
  email: string;
  resetTime: string;
}): EmailTemplate {
  const { email, resetTime } = variables;

  const subject = '【Inspi.AI】密码重置成功通知';

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
        }
        .success-icon {
            font-size: 48px;
            color: #10b981;
            margin-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .info-box {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <div class="logo">Inspi.AI</div>
            <div class="title">密码重置成功</div>
        </div>

        <div class="content">
            <p>您好，</p>
            <p>您的 Inspi.AI 账户密码已成功重置。</p>
        </div>

        <div class="info-box">
            <p><strong>账户邮箱：</strong>${email}</p>
            <p><strong>重置时间：</strong>${resetTime}</p>
        </div>

        <div class="content">
            <p>如果这不是您本人的操作，请立即联系我们的支持团队。</p>
            <p>为了您的账户安全，建议您：</p>
            <ul>
                <li>使用强密码，包含字母、数字和特殊字符</li>
                <li>不要在多个网站使用相同密码</li>
                <li>定期更换密码</li>
            </ul>
        </div>

        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系我们：<a href="mailto:support@inspi-ai.com">support@inspi-ai.com</a></p>
            <p>&copy; 2024 Inspi.AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
【Inspi.AI】密码重置成功通知

您好，

您的 Inspi.AI 账户密码已成功重置。

账户邮箱：${email}
重置时间：${resetTime}

如果这不是您本人的操作，请立即联系我们的支持团队。

为了您的账户安全，建议您：
- 使用强密码，包含字母、数字和特殊字符
- 不要在多个网站使用相同密码
- 定期更换密码

联系我们：support@inspi-ai.com

© 2024 Inspi.AI. All rights reserved.
`;

  return { subject, html, text };
}

/**
 * 渲染模板
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  let rendered = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  });

  return rendered;
}
