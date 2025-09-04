import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdaptiveGrid, GridPresets } from '@/components/layout/AdaptiveGrid';
import { useResponsive, useResponsiveValue } from '@/hooks/useResponsive';

// Mock the useResponsive hooks
jest.mock('@/hooks/useResponsive');
const mockUseResponsive = useResponsive as jest.MockedFunction<typeof useResponsive>;
const mockUseResponsiveValue = useResponsiveValue as jest.MockedFunction<typeof useResponsiveValue>;

describe('AdaptiveGrid', () => {
  const mockChildren = [
    <div key="1" data-testid="item-1">Item 1</div>,
    <div key="2" data-testid="item-2">Item 2</div>,
    <div key="3" data-testid="item-3">Item 3</div>,
    <div key="4" data-testid="item-4">Item 4</div>,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isWide: false,
      breakpoint: 'desktop',
      screenWidth: 1024,
      screenHeight: 768,
    });
    // Default mock for useResponsiveValue
    mockUseResponsiveValue.mockReturnValue(3);
  });

  describe('Basic Grid Functionality', () => {
    it('should render all children', () => {
      mockUseResponsiveValue.mockReturnValue(3);

      render(
        <AdaptiveGrid>
          {mockChildren}
        </AdaptiveGrid>
      );

      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
      expect(screen.getByTestId('item-4')).toBeInTheDocument();
    });

    it('should apply grid styles', () => {
      mockUseResponsiveValue
        .mockReturnValueOnce(3) // cols
        .mockReturnValueOnce('1.5rem'); // gap

      const { container } = render(
        <AdaptiveGrid>
          {mockChildren}
        </AdaptiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveStyle({
        display: 'grid',
        gap: '1.5rem',
        gridTemplateColumns: 'repeat(3, 1fr)',
      });
    });

    it('should limit columns to number of children', () => {
      const { container } = render(
        <AdaptiveGrid cols={{ desktop: 10 }}>
          <div>Item 1</div>
        </AdaptiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      // Should limit to 1 column since there's only 1 child, even though cols is 10
      const actualCols = parseInt(gridElement.getAttribute('data-cols') || '0');
      expect(actualCols).toBe(1);
    });
  });

  describe('Responsive Columns', () => {
    it('should use responsive column values', () => {
      const cols = {
        mobile: 1,
        tablet: 2,
        desktop: 3,
        wide: 4,
      };

      mockUseResponsiveValue.mockReturnValue(3); // desktop value

      const { container } = render(
        <AdaptiveGrid cols={cols}>
          {mockChildren}
        </AdaptiveGrid>
      );

      expect(mockUseResponsiveValue).toHaveBeenCalledWith(cols);
      
      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(3, 1fr)',
      });
    });
  });

  describe('Responsive Gap', () => {
    it('should handle string gap', () => {
      mockUseResponsiveValue.mockReturnValue(3);

      const { container } = render(
        <AdaptiveGrid gap="2rem">
          {mockChildren}
        </AdaptiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveStyle({ gap: '2rem' });
    });

    it('should handle responsive gap object', () => {
      const gap = {
        mobile: '1rem',
        tablet: '1.25rem',
        desktop: '1.5rem',
        wide: '2rem',
      };

      mockUseResponsiveValue
        .mockReturnValueOnce(3) // cols
        .mockReturnValueOnce('1.5rem'); // gap

      const { container } = render(
        <AdaptiveGrid gap={gap}>
          {mockChildren}
        </AdaptiveGrid>
      );

      expect(mockUseResponsiveValue).toHaveBeenCalledWith(gap);
      
      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveStyle({ gap: '1.5rem' });
    });
  });

  describe('Auto-fit Mode', () => {
    it('should use auto-fit grid template when autoFit is true', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1200,
        screenHeight: 768,
      });

      mockUseResponsiveValue.mockReturnValue('1.5rem');

      const { container } = render(
        <AdaptiveGrid 
          autoFit={true}
          minItemWidth="300px"
          maxItemWidth="400px"
        >
          {mockChildren}
        </AdaptiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 400px))',
      });
    });

    it('should calculate columns based on screen width in auto-fit mode', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1200,
        screenHeight: 768,
      });

      mockUseResponsiveValue
        .mockReturnValueOnce(4) // original cols
        .mockReturnValueOnce('1rem'); // gap

      const { container } = render(
        <AdaptiveGrid 
          autoFit={true}
          minItemWidth="280px"
        >
          {mockChildren}
        </AdaptiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveAttribute('data-auto-fit', 'true');
    });
  });

  describe('Data Attributes', () => {
    it('should set data attributes correctly', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        screenWidth: 1024,
        screenHeight: 768,
      });

      mockUseResponsiveValue.mockReturnValue(3);

      const { container } = render(
        <AdaptiveGrid autoFit={false}>
          {mockChildren}
        </AdaptiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveAttribute('data-breakpoint', 'desktop');
      expect(gridElement).toHaveAttribute('data-cols', '3');
      expect(gridElement).toHaveAttribute('data-auto-fit', 'false');
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className to grid', () => {
      mockUseResponsiveValue.mockReturnValue(3);

      const { container } = render(
        <AdaptiveGrid className="custom-grid">
          {mockChildren}
        </AdaptiveGrid>
      );

      expect(container.firstChild).toHaveClass('adaptive-grid', 'custom-grid');
    });

    it('should apply itemClassName to grid items', () => {
      mockUseResponsiveValue.mockReturnValue(3);

      render(
        <AdaptiveGrid itemClassName="custom-item">
          {mockChildren}
        </AdaptiveGrid>
      );

      const items = screen.getAllByTestId(/item-/);
      items.forEach(item => {
        expect(item.parentElement).toHaveClass('grid-item', 'custom-item');
      });
    });
  });

  describe('GridPresets', () => {
    it('should have predefined grid presets', () => {
      expect(GridPresets.featureCards).toBeDefined();
      expect(GridPresets.contentCards).toBeDefined();
      expect(GridPresets.compactList).toBeDefined();
      expect(GridPresets.showcase).toBeDefined();
    });

    it('should have correct structure for feature cards preset', () => {
      const preset = GridPresets.featureCards;
      
      expect(preset.cols).toEqual({
        mobile: 1,
        tablet: 2,
        desktop: 3,
        wide: 4,
      });
      expect(preset.minItemWidth).toBe('280px');
      expect(preset.maxItemWidth).toBe('400px');
    });
  });
});