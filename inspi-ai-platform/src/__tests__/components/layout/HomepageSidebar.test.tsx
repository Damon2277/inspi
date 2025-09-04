import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomepageSidebar } from '@/components/layout/HomepageSidebar';

// Use the existing mocked location from jest setup

describe('HomepageSidebar', () => {
  beforeEach(() => {
    window.location.href = '';
    jest.clearAllMocks();
  });

  describe('Left Sidebar', () => {
    it('should render quick actions section', () => {
      render(<HomepageSidebar position="left" />);

      expect(screen.getByText('快捷功能')).toBeInTheDocument();
      expect(screen.getByText('AI魔法师')).toBeInTheDocument();
      expect(screen.getByText('智慧广场')).toBeInTheDocument();
      expect(screen.getByText('知识图谱')).toBeInTheDocument();
    });

    it('should render statistics section', () => {
      render(<HomepageSidebar position="left" />);

      expect(screen.getByText('我的统计')).toBeInTheDocument();
      expect(screen.getByText('创作数量')).toBeInTheDocument();
      expect(screen.getByText('获得点赞')).toBeInTheDocument();
      expect(screen.getByText('分享次数')).toBeInTheDocument();
      expect(screen.getByText('贡献积分')).toBeInTheDocument();
    });

    it('should have clickable quick action buttons', () => {
      render(<HomepageSidebar position="left" />);

      const aiMagicButton = screen.getByText('AI魔法师').closest('button');
      const squareButton = screen.getByText('智慧广场').closest('button');
      const knowledgeButton = screen.getByText('知识图谱').closest('button');

      expect(aiMagicButton).toBeInTheDocument();
      expect(squareButton).toBeInTheDocument();
      expect(knowledgeButton).toBeInTheDocument();

      // Verify buttons are clickable
      expect(aiMagicButton).not.toBeDisabled();
      expect(squareButton).not.toBeDisabled();
      expect(knowledgeButton).not.toBeDisabled();
    });

    it('should apply custom className', () => {
      const { container } = render(<HomepageSidebar position="left" className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('homepage-left-sidebar', 'custom-class');
    });
  });

  describe('Right Sidebar', () => {
    it('should render recent activities section', () => {
      render(<HomepageSidebar position="right" />);

      expect(screen.getByText('最近活动')).toBeInTheDocument();
      expect(screen.getByText('创建了新的数学教学卡片')).toBeInTheDocument();
      expect(screen.getByText('分享了"函数概念"到智慧广场')).toBeInTheDocument();
      expect(screen.getByText('点赞了"创新教学方法"')).toBeInTheDocument();
      expect(screen.getByText('评论了"物理实验设计"')).toBeInTheDocument();
    });

    it('should render recommended content section', () => {
      render(<HomepageSidebar position="right" />);

      expect(screen.getByText('推荐内容')).toBeInTheDocument();
      expect(screen.getByText('🎯 教学技巧分享')).toBeInTheDocument();
      expect(screen.getByText('📚 热门资源')).toBeInTheDocument();
      expect(screen.getByText('🌟 社区精选')).toBeInTheDocument();
    });

    it('should render quick operations section', () => {
      render(<HomepageSidebar position="right" />);

      expect(screen.getByText('快速操作')).toBeInTheDocument();
      expect(screen.getByText('✨ 创建新卡片')).toBeInTheDocument();
      expect(screen.getByText('🌟 浏览广场')).toBeInTheDocument();
    });

    it('should have clickable quick operation buttons', () => {
      render(<HomepageSidebar position="right" />);

      const createButton = screen.getByText('✨ 创建新卡片');
      const browseButton = screen.getByText('🌟 浏览广场');

      expect(createButton).toBeInTheDocument();
      expect(browseButton).toBeInTheDocument();
      expect(createButton).not.toBeDisabled();
      expect(browseButton).not.toBeDisabled();
    });

    it('should have clickable activity items', () => {
      render(<HomepageSidebar position="right" />);

      const activityText = screen.getByText('创建了新的数学教学卡片');
      expect(activityText).toBeInTheDocument();
      
      // Find the clickable container (should have cursor-pointer class)
      const clickableContainer = activityText.closest('.cursor-pointer');
      expect(clickableContainer).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<HomepageSidebar position="right" className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('homepage-right-sidebar', 'custom-class');
    });
  });

  describe('Activity Icons', () => {
    it('should render activity items with icons', () => {
      render(<HomepageSidebar position="right" />);

      // Check that activity items are rendered
      const activities = screen.getAllByText(/创建了|分享了|点赞了|评论了/);
      expect(activities).toHaveLength(4);
      
      // Check that SVG icons are present in the DOM
      const { container } = render(<HomepageSidebar position="right" />);
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe('Hover Effects', () => {
    it('should have hover classes for interactive elements', () => {
      render(<HomepageSidebar position="left" />);

      const quickActionButtons = screen.getAllByRole('button');
      quickActionButtons.forEach(button => {
        expect(button).toHaveClass('hover:bg-gray-50');
      });
    });
  });
});