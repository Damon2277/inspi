/**
 * 邮件模板系统
 */

import { ContactFormData } from './config';

/**
 * 邮件模板接口
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * 生成联系表单邮件模板
 */
export function generateContactEmailTemplate(data: ContactFormData): EmailTemplate {
  const { name, email, subject, message, type, priority = 'normal', userId, userAgent } = data;
  
  const priorityEmoji = {
    low: '🔵',
    normal: '🟡',
    high: '🟠',
    urgent: '🔴'
  };
  
  const typeLabels = {
    contact: '一般咨询',
    feedback: '用户反馈',
    bug: 'Bug报告',
    feature: '功能建议',
    general: '其他'
  };
  
  const emailSubject = `[Inspi.AI] ${priorityEmoji[priority]} ${typeLabels[type]} - ${subject}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inspi.AI 联系表单</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 10px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 15px;
          margin-bottom: 30px;
        }
        .label {
          font-weight: 600;
          color: #666;
        }
        .value {
          color: #333;
        }
        .message-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .priority-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .priority-low { background: #dbeafe; color: #1e40af; }
        .priority-normal { background: #fef3c7; color: #92400e; }
        .priority-high { background: #fed7aa; color: #c2410c; }
        .priority-urgent { background: #fecaca; color: #dc2626; }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Inspi.AI</div>
          <div>收到新的${typeLabels[type]}</div>
        </div>
        
        <div class="info-grid">
          <div class="label">发送人：</div>
          <div class="value">${name}</div>
          
          <div class="label">邮箱：</div>
          <div class="value"><a href="mailto:${email}">${email}</a></div>
          
          <div class="label">类型：</div>
          <div class="value">${typeLabels[type]}</div>
          
          <div class="label">优先级：</div>
          <div class="value">
            <span class="priority-badge priority-${priority}">
              ${priorityEmoji[priority]} ${priority.toUpperCase()}
            </span>
          </div>
          
          <div class="label">主题：</div>
          <div class="value"><strong>${subject}</strong></div>
          
          ${userId ? `
          <div class="label">用户ID：</div>
          <div class="value">${userId}</div>
          ` : ''}
        </div>
        
        <div class="label">消息内容：</div>
        <div class="message-box">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <div class="footer">
          <p><strong>技术信息：</strong></p>
          <ul>
            <li>发送时间：${new Date().toLocaleString('zh-CN')}</li>
            ${userAgent ? `<li>用户代理：${userAgent}</li>` : ''}
            <li>来源：Inspi.AI 联系表单</li>
          </ul>
          
          <p style="margin-top: 20px;">
            <em>此邮件由 Inspi.AI 系统自动发送，请及时处理用户请求。</em>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textContent = `
Inspi.AI - 收到新的${typeLabels[type]}

发送人：${name}
邮箱：${email}
类型：${typeLabels[type]}
优先级：${priority.toUpperCase()}
主题：${subject}
${userId ? `用户ID：${userId}` : ''}

消息内容：
${message}

技术信息：
- 发送时间：${new Date().toLocaleString('zh-CN')}
${userAgent ? `- 用户代理：${userAgent}` : ''}
- 来源：Inspi.AI 联系表单

此邮件由 Inspi.AI 系统自动发送，请及时处理用户请求。
  `;
  
  return {
    subject: emailSubject,
    html: htmlContent,
    text: textContent
  };
}

/**
 * 生成自动回复邮件模板
 */
export function generateAutoReplyTemplate(data: ContactFormData): EmailTemplate {
  const { name, type } = data;
  
  const typeLabels = {
    contact: '咨询',
    feedback: '反馈',
    bug: 'Bug报告',
    feature: '功能建议',
    general: '消息'
  };
  
  const subject = `感谢您联系 Inspi.AI - 我们已收到您的${typeLabels[type]}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>感谢您联系 Inspi.AI</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .highlight {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Inspi.AI</div>
          <div>感谢您的${typeLabels[type]}！</div>
        </div>
        
        <div class="content">
          <p>亲爱的 ${name}，</p>
          
          <p>感谢您联系 Inspi.AI！我们已经收到您的${typeLabels[type]}，并将在 <strong>24小时内</strong> 给您回复。</p>
          
          <div class="highlight">
            <p><strong>接下来会发生什么？</strong></p>
            <ul>
              <li>我们的团队将仔细审阅您的${typeLabels[type]}</li>
              <li>如需要更多信息，我们会通过邮件联系您</li>
              <li>我们会在处理完成后及时通知您</li>
            </ul>
          </div>
          
          <p>在等待期间，您可以：</p>
          <ul>
            <li>📚 浏览我们的 <a href="${process.env.NEXT_PUBLIC_SITE_URL}/help" style="color: #3b82f6;">帮助中心</a></li>
            <li>🎯 继续使用 <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color: #3b82f6;">AI教学魔法师</a></li>
            <li>🌟 探索 <a href="${process.env.NEXT_PUBLIC_SITE_URL}/square" style="color: #3b82f6;">智慧广场</a> 的精彩内容</li>
          </ul>
          
          <p>再次感谢您选择 Inspi.AI，我们致力于为教师提供最好的AI教学工具！</p>
          
          <p>祝好，<br>Inspi.AI 团队</p>
        </div>
        
        <div class="footer">
          <p>此邮件由 Inspi.AI 系统自动发送，请勿直接回复。</p>
          <p>如有紧急问题，请访问 <a href="${process.env.NEXT_PUBLIC_SITE_URL}/contact" style="color: #3b82f6;">联系我们</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
感谢您联系 Inspi.AI！

亲爱的 ${name}，

感谢您联系 Inspi.AI！我们已经收到您的${typeLabels[type]}，并将在 24小时内 给您回复。

接下来会发生什么？
- 我们的团队将仔细审阅您的${typeLabels[type]}
- 如需要更多信息，我们会通过邮件联系您
- 我们会在处理完成后及时通知您

在等待期间，您可以：
- 浏览我们的帮助中心：${process.env.NEXT_PUBLIC_SITE_URL}/help
- 继续使用AI教学魔法师：${process.env.NEXT_PUBLIC_SITE_URL}
- 探索智慧广场的精彩内容：${process.env.NEXT_PUBLIC_SITE_URL}/square

再次感谢您选择 Inspi.AI，我们致力于为教师提供最好的AI教学工具！

祝好，
Inspi.AI 团队

---
此邮件由 Inspi.AI 系统自动发送，请勿直接回复。
如有紧急问题，请访问：${process.env.NEXT_PUBLIC_SITE_URL}/contact
  `;
  
  return {
    subject,
    html,
    text
  };
}