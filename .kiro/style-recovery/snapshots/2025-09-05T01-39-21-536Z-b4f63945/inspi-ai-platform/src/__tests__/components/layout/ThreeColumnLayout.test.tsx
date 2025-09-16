import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { useResponsive } from '@/hooks/useResponsive';

// Mock the useResponsive hook
jest.mock('@/hooks/useResponsive');
const mockUseResponsive = useResponsive as jest.MockedFunction<typeof useResponsive>;

describe('ThreeColumnLayout', () => {
  const mockLeftSidebar = <div data-testid="left-sidebar">Left Sidebar</div>;
  const mockRightSidebar = <div data-testid="right-sidebar">Right Sidebar</div>;
  const mockMainContent = <div data-testid="main-content">Main Content</div>;

  beforeEach(() => {
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
      });
    });

    it('should render only main content on mobile', () => {
      render(
        <ThreeColumnLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-sidebar')).not.toBeInTheDocument();
    });

    it('should have mobile class', () => {
      const { container } = render(
        <ThreeColumnLayout>
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(container.firstChild).toHaveClass('mobile');
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
      });
    });

    it('should render main content and right sidebar on tablet', () => {
      render(
        <ThreeColumnLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    });

    it('should have tablet class', () => {
      const { container } = render(
        <ThreeColumnLayout rightSidebar={mockRightSidebar}>
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(container.firstChild).toHaveClass('tablet');
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
      });
    });

    it('should render all three columns on desktop', () => {
      render(
        <ThreeColumnLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    });

    it('should have desktop class', () => {
      const { container } = render(
        <ThreeColumnLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(container.firstChild).toHaveClass('desktop');
    });

    it('should apply custom sidebar widths', () => {
      render(
        <ThreeColumnLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
          leftSidebarWidth="300px"
          rightSidebarWidth="350px"
        >
          {mockMainContent}
        </ThreeColumnLayout>
      );

      // Find the aside elements that contain the sidebars
      const asideElements = screen.getAllByRole('complementary');
      const leftSidebarAside = asideElements.find(aside => 
        aside.querySelector('[data-testid="left-sidebar"]')
      );
      const rightSidebarAside = asideElements.find(aside => 
        aside.querySelector('[data-testid="right-sidebar"]')
      );

      expect(leftSidebarAside).toHaveStyle({ width: '300px' });
      expect(rightSidebarAside).toHaveStyle({ width: '350px' });
    });

    it('should handle missing sidebars gracefully', () => {
      render(
        <ThreeColumnLayout>
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Sticky Header', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
      });
    });

    it('should apply sticky positioning when stickyHeader is true', () => {
      render(
        <ThreeColumnLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
          stickyHeader={true}
        >
          {mockMainContent}
        </ThreeColumnLayout>
      );

      // Find the aside elements that contain the sidebars
      const asideElements = screen.getAllByRole('complementary');
      const leftSidebarAside = asideElements.find(aside => 
        aside.querySelector('[data-testid="left-sidebar"]')
      );
      const rightSidebarAside = asideElements.find(aside => 
        aside.querySelector('[data-testid="right-sidebar"]')
      );

      expect(leftSidebarAside).toHaveClass('sticky');
      expect(rightSidebarAside).toHaveClass('sticky');
    });

    it('should not apply sticky positioning when stickyHeader is false', () => {
      render(
        <ThreeColumnLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
          stickyHeader={false}
        >
          {mockMainContent}
        </ThreeColumnLayout>
      );

      // Find the aside elements that contain the sidebars
      const asideElements = screen.getAllByRole('complementary');
      const leftSidebarAside = asideElements.find(aside => 
        aside.querySelector('[data-testid="left-sidebar"]')
      );
      const rightSidebarAside = asideElements.find(aside => 
        aside.querySelector('[data-testid="right-sidebar"]')
      );

      expect(leftSidebarAside).not.toHaveClass('sticky');
      expect(rightSidebarAside).not.toHaveClass('sticky');
    });
  });

  describe('Custom Classes', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
      });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ThreeColumnLayout className="custom-layout">
          {mockMainContent}
        </ThreeColumnLayout>
      );

      expect(container.firstChild).toHaveClass('custom-layout');
    });
  });
});