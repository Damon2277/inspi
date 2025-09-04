import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedHomepage } from '@/components/layout/EnhancedHomepage';
import { useResponsive } from '@/hooks/useResponsive';

// Mock the useResponsive hook
jest.mock('@/hooks/useResponsive');
const mockUseResponsive = useResponsive as jest.MockedFunction<typeof useResponsive>;

// Use the existing mocked location from jest setup

describe('EnhancedHomepage', () => {
  beforeEach(() => {
    window.location.href = '';
    jest.clearAllMocks();
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isWide: false,
        breakpoint: 'mobile',
        screenWidth: 375,
        screenHeight: 667,
        orientation: 'portrait',
        touchDevice: true,
      });
    });

    it('should render main content without sidebars on mobile', () => {
      render(<EnhancedHomepage />);

      // Main content should be present
      expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      expect(screen.getByText('点燃您教学的热情')).toBeInTheDocument();

      // Sidebars should not be present
      expect(screen.queryByText('快捷功能')).not.toBeInTheDocument();
      expect(screen.queryByText('最近活动')).not.toBeInTheDocument();
    });

    it('should render feature cards', () => {
      render(<EnhancedHomepage />);

      expect(screen.getByText('AI教学魔法师')).toBeInTheDocument();
      expect(screen.getByText('智慧广场')).toBeInTheDocument();
      expect(screen.getByText('知识图谱')).toBeInTheDocument();
      expect(screen.getByText('贡献度系统')).toBeInTheDocument();
      expect(screen.getByText('学习资源库')).toBeInTheDocument();
      expect(screen.getByText('数据分析')).toBeInTheDocument();
    });
  });

  describe('Tablet Layout', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isWide: false,
        breakpoint: 'tablet',
        screenWidth: 768,
        screenHeight: 1024,
        orientation: 'portrait',
        touchDevice: true,
      });
    });

    it('should render main content with right sidebar on tablet', () => {
      render(<EnhancedHomepage />);

      // Main content should be present
      expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();

      // Right sidebar should be present
      expect(screen.getByText('最近活动')).toBeInTheDocument();
      expect(screen.getByText('推荐内容')).toBeInTheDocument();

      // Left sidebar should not be present
      expect(screen.queryByText('快捷功能')).not.toBeInTheDocument();
    });
  });

  describe('Desktop Layout', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        touchDevice: false,
      });
    });

    it('should render full three-column layout on desktop', () => {
      render(<EnhancedHomepage />);

      // Main content should be present
      expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();

      // Both sidebars should be present
      expect(screen.getByText('快捷功能')).toBeInTheDocument();
      expect(screen.getByText('最近活动')).toBeInTheDocument();
      expect(screen.getByText('推荐内容')).toBeInTheDocument();
    });

    it('should render statistics in left sidebar', () => {
      render(<EnhancedHomepage />);

      expect(screen.getByText('我的统计')).toBeInTheDocument();
      expect(screen.getByText('创作数量')).toBeInTheDocument();
      expect(screen.getByText('获得点赞')).toBeInTheDocument();
    });
  });

  describe('Hero Section', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        touchDevice: false,
      });
    });

    it('should render hero section with correct content', () => {
      render(<EnhancedHomepage />);

      expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      expect(screen.getByText('点燃您教学的热情')).toBeInTheDocument();
      expect(screen.getByText(/用AI激发教学创意/)).toBeInTheDocument();
    });

    it('should render CTA buttons', () => {
      render(<EnhancedHomepage />);

      expect(screen.getByText('✨ 开始创作教学魔法')).toBeInTheDocument();
      expect(screen.getByText('🌟 浏览智慧广场')).toBeInTheDocument();
    });

    it('should have clickable CTA buttons', () => {
      render(<EnhancedHomepage />);

      const createButton = screen.getByText('✨ 开始创作教学魔法');
      const squareButton = screen.getByText('🌟 浏览智慧广场');

      expect(createButton).toBeInTheDocument();
      expect(squareButton).toBeInTheDocument();
      expect(createButton).not.toBeDisabled();
      expect(squareButton).not.toBeDisabled();
    });
  });

  describe('Feature Cards', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        touchDevice: false,
      });
    });

    it('should render all feature cards', () => {
      render(<EnhancedHomepage />);

      // Check for unique cards that don't appear in sidebars
      expect(screen.getByText('AI教学魔法师')).toBeInTheDocument();
      expect(screen.getByText('贡献度系统')).toBeInTheDocument();
      expect(screen.getByText('学习资源库')).toBeInTheDocument();
      expect(screen.getByText('数据分析')).toBeInTheDocument();

      // Handle duplicate text by checking for multiple instances
      const squareElements = screen.getAllByText('智慧广场');
      expect(squareElements.length).toBeGreaterThan(0);
      
      const knowledgeElements = screen.getAllByText('知识图谱');
      expect(knowledgeElements.length).toBeGreaterThan(0);
    });

    it('should have clickable feature cards', () => {
      render(<EnhancedHomepage />);

      const aiCard = screen.getByText('AI教学魔法师').closest('.group');
      expect(aiCard).toBeInTheDocument();
      expect(aiCard).toHaveClass('cursor-pointer');

      // Check for multiple "智慧广场" elements and find the one in feature cards
      const squareElements = screen.getAllByText('智慧广场');
      const squareCard = squareElements.find(el => el.closest('.group'));
      expect(squareCard?.closest('.group')).toBeInTheDocument();
    });

    it('should have hover effects on feature cards', () => {
      render(<EnhancedHomepage />);

      const aiCard = screen.getByText('AI教学魔法师').closest('.group');
      expect(aiCard).toHaveClass('hover:shadow-xl', 'hover:-translate-y-1');

      // Check for cards with hover effects
      const hoverCards = document.querySelectorAll('.hover\\:shadow-xl');
      expect(hoverCards.length).toBeGreaterThan(0);
    });
  });

  describe('CTA Section', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        touchDevice: false,
      });
    });

    it('should render CTA section', () => {
      render(<EnhancedHomepage />);

      expect(screen.getByText('您的每一次奇思妙想，都值得被精彩呈现')).toBeInTheDocument();
      expect(screen.getByText(/立即开始，让AI成为您教学创意的放大器/)).toBeInTheDocument();
      expect(screen.getByText('🚀 免费开始使用')).toBeInTheDocument();
    });

    it('should have clickable CTA button', () => {
      render(<EnhancedHomepage />);

      const ctaButton = screen.getByText('🚀 免费开始使用');
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).not.toBeDisabled();
    });
  });

  describe('Custom Classes', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        touchDevice: false,
      });
    });

    it('should apply custom className', () => {
      const { container } = render(<EnhancedHomepage className="custom-homepage" />);
      
      expect(container.firstChild).toHaveClass('enhanced-homepage', 'custom-homepage');
    });
  });

  describe('Responsive Behavior', () => {
    it('should show different layouts based on screen size', () => {
      // Test mobile
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isWide: false,
        breakpoint: 'mobile',
        screenWidth: 375,
        screenHeight: 667,
        orientation: 'portrait',
        touchDevice: true,
      });

      const { rerender } = render(<EnhancedHomepage />);
      expect(screen.queryByText('快捷功能')).not.toBeInTheDocument();

      // Test desktop
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        touchDevice: false,
      });

      rerender(<EnhancedHomepage />);
      expect(screen.getByText('快捷功能')).toBeInTheDocument();
    });
  });
});