'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SimpleCardEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  className?: string;
}

export function SimpleCardEditor({
  initialContent,
  onContentChange,
  className = '',
}: SimpleCardEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleSave = () => {
    onContentChange(content);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  return (
    <div className={`simple-card-editor ${className}`}>
      {/* Card content area */}
      <div
        className="card-content"
        style={{
          backgroundColor: '#ffffff',
          color: '#1f2937',
          fontSize: '16px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          minHeight: '200px',
          position: 'relative',
          cursor: isEditing ? 'text' : 'pointer',
        }}
        onClick={() => !isEditing && setIsEditing(true)}
      >
        {isEditing ? (
          <>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                fontSize: '16px',
                fontFamily: 'inherit',
                color: '#1f2937',
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                resize: 'vertical',
                outline: 'none',
                lineHeight: '1.6',
              }}
              placeholder="输入卡片内容..."
            />
            <div style={{
              marginTop: '12px',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#ffffff',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                wordBreak: 'break-word',
              }}
            >
              {content || '点击编辑内容...'}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '4px 8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.color = '#3b82f6';
              }}
            >
              编辑
            </button>
          </>
        )}
      </div>
    </div>
  );
}
