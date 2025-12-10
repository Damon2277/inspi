'use client';

import React, { useMemo, useState } from 'react';

import { CommentSystem } from '@/components/comments/CommentSystem';

const WECHAT_ID = 'MohopeX';

export function FeedbackCommunityPanel() {
  type CommentSystemProps = React.ComponentProps<typeof CommentSystem>;
  const initialComments = useMemo<NonNullable<CommentSystemProps['initialComments']>>(() => ([
    {
      id: 'feedback-1',
      workId: 'global-feedback',
      userId: 'teacher-1',
      userName: '刘老师',
      userAvatar: '🧑‍🏫',
      content: 'AI 生成的课堂流程很实用，如果能直接导出为 PPT 或者课堂展示格式就更好了，省去再次整理的时间。',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      likes: 4,
      replies: [],
      category: { value: 'feature', label: '功能需求' },
      expectation: '希望支持一键导出课堂演示稿或 PPT 模板。',
    },
    {
      id: 'feedback-2',
      workId: 'global-feedback',
      userId: 'teacher-2',
      userName: '陈老师',
      userAvatar: '👩‍🏫',
      content: '有时候生成的启发问题不够贴合不同学段，想要自己调节语气或难度。',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      likes: 6,
      replies: [
        {
          id: 'feedback-2-reply-1',
          workId: 'global-feedback',
          userId: 'team-ops',
          userName: '运营小助手',
          userAvatar: '🛠️',
          content: '已记录需求，我们计划增加学段语气预设，也欢迎您在社群里继续分享具体案例。',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          likes: 2,
          replies: [],
          parentId: 'feedback-2',
        },
      ],
      category: { value: 'improve', label: '优化建议' },
      expectation: '能够自定义语气、难度，并保存为个人模板。',
    },
  ]), []);

  const formConfig = useMemo(() => ({
    categories: [
      { value: 'bug', label: '功能异常', hint: '生成失败、页面报错等' },
      { value: 'improve', label: '优化建议', hint: '流程、体验、效率提升' },
      { value: 'feature', label: '功能需求', hint: '希望新增的能力' },
      { value: 'content', label: '内容反馈', hint: '文案、模板、学科场景' },
    ],
    placeholder: '请描述遇到的问题、期待支持的场景或灵感想法……',
    requireCategory: true,
    allowAttachment: true,
    displayExpectation: true,
    expectationLabel: '期待的解决方式 / 使用场景',
    expectationPlaceholder: '例如：希望支持班级看板、家长会总结模板等',
    maxAttachments: 3,
    maxAttachmentSizeMb: 5,
    defaultCategory: 'improve',
  }), []);

  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyState('success');
    } catch (error) {
      console.error('复制微信号失败:', error);
      setCopyState('error');
    } finally {
      setTimeout(() => setCopyState('idle'), 2400);
    }
  };

  return (
    <div className="modern-card">
      <div className="modern-card-body" style={{ padding: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ maxWidth: '640px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
              产品反馈 & 社群共创
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.7 }}>
              把您在教学场景中的真实需求告诉我们。高价值反馈会进入需求池，优先排期；明确的场景案例也欢迎加入社群与产品、运营面对面交流。
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.6fr)',
        }}>
          <div>
            <CommentSystem
              workId="global-feedback"
              workTitle="产品反馈"
              initialComments={initialComments}
              formConfig={formConfig}
            />
          </div>

          <aside style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              border: '1px solid rgba(59, 130, 246, 0.15)',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '8px' }}>
                添加微信客服，加入共创社群
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: '12px' }}>
                备注「老师 + 学段/学科」，我们会邀请您进入产品共创社群，第一时间同步模板、直播和版本路线。
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'white',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px dashed var(--primary-200)',
              }}>
                <code style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-700)' }}>{WECHAT_ID}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(WECHAT_ID)}
                  className="modern-btn modern-btn-primary modern-btn-sm"
                >
                  复制微信号
                </button>
              </div>
              {copyState !== 'idle' && (
                <p style={{
                  fontSize: '12px',
                  marginTop: '8px',
                  color: copyState === 'success' ? 'var(--primary-600)' : 'var(--danger-600)',
                }}>
                  {copyState === 'success' ? '已复制微信号，可直接粘贴添加。' : '复制失败，请手动添加微信号。'}
                </p>
              )}
            </div>

            <div style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--gray-200)',
              padding: '20px',
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '10px' }}>优先跟进的话题</h4>
              <ul style={{
                listStyle: 'disc',
                paddingLeft: '18px',
                color: 'var(--gray-600)',
                fontSize: '13px',
                lineHeight: 1.6,
              }}>
                <li>真实课堂流程、备课痛点、学生互动场景</li>
                <li>批量生成、导出、校内协作相关需求</li>
                <li>不同学段/学科的模板、成功案例分享</li>
              </ul>
            </div>

            <div style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--gray-200)',
              padding: '20px',
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '10px' }}>高价值反馈如何处理？</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.7 }}>
                我们会在每次版本迭代后更新进展，形成《反馈跟进清单》，并通过社群和 Newsletter 回访，邀请提出建议的老师参与内测或案例共创。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
