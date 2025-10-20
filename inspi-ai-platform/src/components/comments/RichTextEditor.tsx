'use client';

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '输入内容...',
  minHeight = 100,
  maxHeight = 400,
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 插入文本到光标位置
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.slice(0, start) + text + value.slice(end);

    onChange(newValue);

    // 恢复光标位置
    setTimeout(() => {
      textarea.selectionStart = start + text.length;
      textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  // 包裹选中文本
  const wrapSelection = (before: string, after: string = before) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const wrappedText = before + selectedText + after;
    const newValue = value.slice(0, start) + wrappedText + value.slice(end);

    onChange(newValue);

    // 恢复光标位置
    setTimeout(() => {
      if (selectedText) {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + wrappedText.length;
      } else {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length;
      }
      textarea.focus();
    }, 0);
  };

  const toolbarButtons = [
    { icon: 'B', title: '粗体', action: () => wrapSelection('**') },
    { icon: 'I', title: '斜体', action: () => wrapSelection('*') },
    { icon: 'S', title: '删除线', action: () => wrapSelection('~~') },
    { icon: 'H', title: '标题', action: () => insertAtCursor('### ') },
    { icon: '•', title: '列表', action: () => insertAtCursor('- ') },
    { icon: '1.', title: '有序列表', action: () => insertAtCursor('1. ') },
    { icon: '"', title: '引用', action: () => insertAtCursor('> ') },
    { icon: '</>', title: '代码', action: () => wrapSelection('`') },
    { icon: '[]', title: '代码块', action: () => wrapSelection('```\n', '\n```') },
    { icon: '🔗', title: '链接', action: () => wrapSelection('[', '](url)') },
  ];

  return (
    <div style={{
      border: '1px solid var(--gray-300)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {/* 工具栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px',
        borderBottom: '1px solid var(--gray-200)',
        background: 'var(--gray-50)',
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {toolbarButtons.map((btn, index) => (
            <button
              key={index}
              type="button"
              onClick={btn.action}
              title={btn.title}
              disabled={isPreview}
              style={{
                padding: '4px 8px',
                background: 'white',
                border: '1px solid var(--gray-300)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: btn.icon === 'B' ? 'bold' : btn.icon === 'I' ? 'italic' : 'normal',
                fontStyle: btn.icon === 'I' ? 'italic' : 'normal',
                textDecoration: btn.icon === 'S' ? 'line-through' : 'none',
                cursor: isPreview ? 'not-allowed' : 'pointer',
                opacity: isPreview ? 0.5 : 1,
                minWidth: '28px',
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            style={{
              padding: '4px 12px',
              background: !isPreview ? 'var(--primary-100)' : 'transparent',
              color: !isPreview ? 'var(--primary-700)' : 'var(--gray-600)',
              border: '1px solid',
              borderColor: !isPreview ? 'var(--primary-300)' : 'var(--gray-300)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            style={{
              padding: '4px 12px',
              background: isPreview ? 'var(--primary-100)' : 'transparent',
              color: isPreview ? 'var(--primary-700)' : 'var(--gray-600)',
              border: '1px solid',
              borderColor: isPreview ? 'var(--primary-300)' : 'var(--gray-300)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            预览
          </button>
        </div>
      </div>

      {/* 编辑器/预览区 */}
      <div style={{
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto',
      }}>
        {isPreview ? (
          <div style={{
            padding: '12px',
            fontSize: '14px',
            lineHeight: '1.6',
          }}>
            {value ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{children}</h3>,
                  p: ({ children }) => <p style={{ marginBottom: '8px' }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ marginLeft: '20px', marginBottom: '8px' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ marginLeft: '20px', marginBottom: '8px' }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote style={{
                      borderLeft: '4px solid var(--gray-300)',
                      paddingLeft: '12px',
                      marginLeft: '0',
                      marginBottom: '8px',
                      color: 'var(--gray-600)',
                    }}>
                      {children}
                    </blockquote>
                  ),
                  code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) => (
                    inline ? (
                      <code style={{
                        padding: '2px 4px',
                        background: 'var(--gray-100)',
                        borderRadius: '3px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}>
                        {children}
                      </code>
                    ) : (
                      <pre style={{
                        padding: '12px',
                        background: 'var(--gray-100)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'auto',
                        marginBottom: '8px',
                      }}>
                        <code style={{
                          fontSize: '13px',
                          fontFamily: 'monospace',
                        }}>
                          {children}
                        </code>
                      </pre>
                    )
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{
                      color: 'var(--primary-600)',
                      textDecoration: 'underline',
                    }}>
                      {children}
                    </a>
                  ),
                  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '16px 0' }} />,
                  strong: ({ children }) => <strong style={{ fontWeight: '600' }}>{children}</strong>,
                  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                  del: ({ children }) => <del style={{ textDecoration: 'line-through' }}>{children}</del>,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p style={{ color: 'var(--gray-400)' }}>预览内容将在这里显示...</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
              padding: '12px',
              border: 'none',
              fontSize: '14px',
              lineHeight: '1.6',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
        )}
      </div>

      {/* 底部提示 */}
      <div style={{
        padding: '8px',
        borderTop: '1px solid var(--gray-200)',
        background: 'var(--gray-50)',
        fontSize: '12px',
        color: 'var(--gray-500)',
      }}>
        支持 Markdown 语法 • 使用工具栏快速格式化
      </div>
    </div>
  );
}
