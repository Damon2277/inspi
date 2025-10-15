'use client';

import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useState, useCallback } from 'react';

interface CardEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onStyleChange: (style: CardStyle) => void;
  style: CardStyle;
  className?: string;
}

export interface CardStyle {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  padding: number;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
}

export const defaultCardStyle: CardStyle = {
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontSize: 16,
  fontFamily: 'Inter, sans-serif',
  padding: 24,
  borderRadius: 12,
  borderColor: '#e5e7eb',
  borderWidth: 1,
};

export function CardEditor({
  initialContent,
  onContentChange,
  onStyleChange,
  style,
  className = '',
}: CardEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Color.configure({ types: [TextStyle.name] }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    immediatelyRender: false,
  });

  const handleStyleChange = useCallback((key: keyof CardStyle, value: any) => {
    onStyleChange({
      ...style,
      [key]: value,
    });
  }, [style, onStyleChange]);

  const fontFamilies = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Open Sans', value: 'Open Sans, sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: '思源黑体', value: 'Source Han Sans CN, sans-serif' },
    { name: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  ];

  const presetColors = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
    '#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a',
    '#10b981', '#059669', '#047857', '#065f46',
    '#f59e0b', '#d97706', '#b45309', '#92400e',
    '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
    '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6',
  ];

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className={`card-editor ${className}`}>
      {/* 编辑工具栏 */}
      {isEditing && (
        <div className="editor-toolbar" style={{
          padding: '12px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
        }}>
          {/* 文本格式化按钮 */}
          <div className="toolbar-group" style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: editor.isActive('bold') ? '#3b82f6' : 'white',
                color: editor.isActive('bold') ? 'white' : '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: editor.isActive('italic') ? '#3b82f6' : 'white',
                color: editor.isActive('italic') ? 'white' : '#374151',
                fontSize: '14px',
                fontStyle: 'italic',
                cursor: 'pointer',
              }}
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: editor.isActive('strike') ? '#3b82f6' : 'white',
                color: editor.isActive('strike') ? 'white' : '#374151',
                fontSize: '14px',
                textDecoration: 'line-through',
                cursor: 'pointer',
              }}
            >
              S
            </button>
          </div>

          {/* 标题按钮 */}
          <div className="toolbar-group" style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: editor.isActive('heading', { level: 1 }) ? '#3b82f6' : 'white',
                color: editor.isActive('heading', { level: 1 }) ? 'white' : '#374151',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: editor.isActive('heading', { level: 2 }) ? '#3b82f6' : 'white',
                color: editor.isActive('heading', { level: 2 }) ? 'white' : '#374151',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              H2
            </button>
          </div>

          {/* 列表按钮 */}
          <div className="toolbar-group" style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: editor.isActive('bulletList') ? '#3b82f6' : 'white',
                color: editor.isActive('bulletList') ? 'white' : '#374151',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              • 列表
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: editor.isActive('orderedList') ? '#3b82f6' : 'white',
                color: editor.isActive('orderedList') ? 'white' : '#374151',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              1. 列表
            </button>
          </div>
        </div>
      )}

      {/* 卡片内容区域 */}
      <div
        className="card-content"
        style={{
          backgroundColor: style.backgroundColor,
          color: style.textColor,
          fontSize: `${style.fontSize}px`,
          fontFamily: style.fontFamily,
          padding: `${style.padding}px`,
          borderRadius: `${style.borderRadius}px`,
          border: `${style.borderWidth}px solid ${style.borderColor}`,
          minHeight: '200px',
          position: 'relative',
          cursor: isEditing ? 'text' : 'pointer',
        }}
        onClick={() => !isEditing && setIsEditing(true)}
      >
        {isEditing ? (
          <EditorContent editor={editor} />
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: initialContent }}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* 编辑按钮 */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '6px 12px',
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              opacity: 0.8,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
          >
            ✏️ 编辑
          </button>
        )}
      </div>

      {/* 样式控制面板 */}
      {isEditing && (
        <div className="style-panel" style={{
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* 背景颜色 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                背景颜色
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {presetColors.map(color => (
                  <button
                    key={color}
                    onClick={() => handleStyleChange('backgroundColor', color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: color,
                      border: style.backgroundColor === color ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 文字颜色 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                文字颜色
              </label>
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => handleStyleChange('textColor', e.target.value)}
                style={{
                  width: '40px',
                  height: '32px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* 字体大小 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                字体大小: {style.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="24"
                value={style.fontSize}
                onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            {/* 字体家族 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                字体
              </label>
              <select
                value={style.fontFamily}
                onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {fontFamilies.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 内边距 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                内边距: {style.padding}px
              </label>
              <input
                type="range"
                min="12"
                max="48"
                value={style.padding}
                onChange={(e) => handleStyleChange('padding', parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            {/* 圆角 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                圆角: {style.borderRadius}px
              </label>
              <input
                type="range"
                min="0"
                max="24"
                value={style.borderRadius}
                onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              完成编辑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
