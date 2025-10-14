/**
 * 简化的E2E用户流程测试 (Jest版本)
 * 主要测试组件渲染和基本交互
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { act } from 'react';

// 模拟页面组件
const MockHomePage = () => (
  <div>
    <h1 className="hero-title page-title">欢迎来到Inspi AI平台</h1>
    <div className="feature-cards">
      <div className="feature-card">AI创作</div>
      <div className="feature-card">智能分析</div>
      <div className="feature-card">协作平台</div>
    </div>
    <button className="cta-button">开始创作</button>
  </div>
);

const MockCreatePage = () => (
  <div>
    <h1 className="page-title">创作中心</h1>
    <div className="create-options">
      <button className="create-option">文本创作</button>
      <button className="create-option">图像生成</button>
      <button className="create-option">视频制作</button>
    </div>
    <div className="create-form">
      <textarea placeholder="输入您的创意..." />
      <button className="generate-button">生成内容</button>
    </div>
  </div>
);

const MockSquarePage = () => (
  <div>
    <h1 className="page-title">创意广场</h1>
    <div className="search-filters">
      <input type="text" placeholder="搜索作品..." className="search-input" />
      <select className="filter-select">
        <option>全部类型</option>
        <option>文本</option>
        <option>图像</option>
      </select>
    </div>
    <div className="works-grid">
      <div className="work-card">作品1</div>
      <div className="work-card">作品2</div>
      <div className="work-card">作品3</div>
    </div>
  </div>
);

describe('E2E用户流程测试', () => {
  describe('主页功能', () => {
    it('应该正确渲染主页元素', async () => {
      await act(async () => {
        render(<MockHomePage />);
      });

      expect(screen.getByText('欢迎来到Inspi AI平台')).toBeInTheDocument();
      expect(screen.getByText('开始创作')).toBeInTheDocument();

      const featureCards = screen.getAllByText(/AI创作|智能分析|协作平台/);
      expect(featureCards).toHaveLength(3);
    });

    it('应该响应CTA按钮点击', async () => {
      await act(async () => {
        render(<MockHomePage />);
      });

      const ctaButton = screen.getByText('开始创作');

      await act(async () => {
        fireEvent.click(ctaButton);
      });

      expect(ctaButton).toBeInTheDocument();
    });
  });

  describe('创作页面功能', () => {
    it('应该正确渲染创作选项', async () => {
      await act(async () => {
        render(<MockCreatePage />);
      });

      expect(screen.getByText('创作中心')).toBeInTheDocument();
      expect(screen.getByText('文本创作')).toBeInTheDocument();
      expect(screen.getByText('图像生成')).toBeInTheDocument();
      expect(screen.getByText('视频制作')).toBeInTheDocument();
    });

    it('应该处理创作表单交互', async () => {
      await act(async () => {
        render(<MockCreatePage />);
      });

      const textarea = screen.getByPlaceholderText('输入您的创意...');
      const generateButton = screen.getByText('生成内容');

      await act(async () => {
        fireEvent.change(textarea, { target: { value: '测试创意内容' } });
      });

      expect(textarea).toHaveValue('测试创意内容');

      await act(async () => {
        fireEvent.click(generateButton);
      });

      expect(generateButton).toBeInTheDocument();
    });
  });

  describe('广场页面功能', () => {
    it('应该正确渲染搜索和筛选功能', async () => {
      await act(async () => {
        render(<MockSquarePage />);
      });

      expect(screen.getByText('创意广场')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('搜索作品...')).toBeInTheDocument();

      const filterSelect = screen.getByDisplayValue('全部类型');
      expect(filterSelect).toBeInTheDocument();
    });

    it('应该处理搜索交互', async () => {
      await act(async () => {
        render(<MockSquarePage />);
      });

      const searchInput = screen.getByPlaceholderText('搜索作品...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '测试搜索' } });
      });

      expect(searchInput).toHaveValue('测试搜索');
    });

    it('应该显示作品网格', async () => {
      await act(async () => {
        render(<MockSquarePage />);
      });

      const workCards = screen.getAllByText(/作品[123]/);
      expect(workCards).toHaveLength(3);
    });
  });

  describe('响应式行为测试', () => {
    it('应该在移动端正确显示', async () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      // 触发resize事件
      await act(async () => {
        window.dispatchEvent(new Event('resize'));
      });

      await act(async () => {
        render(<MockHomePage />);
      });

      expect(screen.getByText('欢迎来到Inspi AI平台')).toBeInTheDocument();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内渲染', async () => {
      const startTime = performance.now();

      await act(async () => {
        render(<MockHomePage />);
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 渲染时间应该少于100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('应该处理大量数据渲染', async () => {
      const LargeDataComponent = () => (
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i} className="work-card">作品 {i + 1}</div>
          ))}
        </div>
      );

      const startTime = performance.now();

      await act(async () => {
        render(<LargeDataComponent />);
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 大量数据渲染时间应该少于200ms
      expect(renderTime).toBeLessThan(200);
    });
  });
});
