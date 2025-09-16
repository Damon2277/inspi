import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveContainer, ResponsiveGrid, DesktopLayout } from '@/components/layout';

// Mock the useResponsive hook
jest.mock('@/hooks/useResponsive', () => ({
  useResponsive: jest.fn(),
  useResponsiveValue: jest.fn(),
}));

const mockUseResponsive = require('@/hooks/useResponsive').useResponsive;
const mockUseResponsiveValue = require('@/hooks/useResponsive').useResponsiveValue;

describe('Responsive System Integration', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseResponsive.mockReset();
    mockUseResponsiveValue.mockReset();
  });

  test('integrates all responsive components correctly', () => {
    // Mock desktop breakpoint
    mockUseResponsive.mockReturnValue({
      breakpoint: 'desktop',
      screenWidth: 1200,
      screenHeight: 800,
      isMobile: false,
      isTablet: true,
      isDesktop: true,
      isWide: false,
      orientation: 'landscape',
      touchDevice: false,
    });

    mockUseResponsiveValue.mockReturnValue(3);

    const sidebar = <div data-testid="sidebar">Sidebar Content</div>;
    const rightPanel = <div data-testid="right-panel">Right Panel</div>;

    render(
      <DesktopLayout sidebar={sidebar} rightPanel={rightPanel}>
        <ResponsiveContainer>
          <ResponsiveGrid>
            <div data-testid="grid-item-1">Item 1</div>
            <div data-testid="grid-item-2">Item 2</div>
            <div data-testid="grid-item-3">Item 3</div>
          </ResponsiveGrid>
        </ResponsiveContainer>
      </DesktopLayout>
    );

    // Verify all components render
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('grid-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('grid-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('grid-item-3')).toBeInTheDocument();
  });

  test('responsive system adapts to mobile breakpoint', () => {
    // Mock mobile breakpoint
    mockUseResponsive.mockReturnValue({
      breakpoint: 'mobile',
      screenWidth: 600,
      screenHeight: 800,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isWide: false,
      orientation: 'portrait',
      touchDevice: true,
    });

    mockUseResponsiveValue.mockReturnValue(1);

    const sidebar = <div data-testid="sidebar">Sidebar Content</div>;

    render(
      <DesktopLayout sidebar={sidebar}>
        <ResponsiveContainer>
          <ResponsiveGrid>
            <div data-testid="grid-item-1">Item 1</div>
            <div data-testid="grid-item-2">Item 2</div>
          </ResponsiveGrid>
        </ResponsiveContainer>
      </DesktopLayout>
    );

    // On mobile, sidebar should not be visible
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    
    // Grid items should still be present
    expect(screen.getByTestId('grid-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('grid-item-2')).toBeInTheDocument();
  });

  test('CSS variables are applied correctly', () => {
    mockUseResponsive.mockReturnValue({
      breakpoint: 'desktop',
      isDesktop: true,
      isWide: false,
    });

    const { container } = render(
      <ResponsiveContainer className="test-container">
        <div>Test Content</div>
      </ResponsiveContainer>
    );

    const containerElement = container.querySelector('.test-container');
    expect(containerElement).toHaveClass('responsive-container');
    
    // Check that CSS custom properties are being used
    const computedStyle = window.getComputedStyle(containerElement!);
    expect(containerElement).toHaveStyle({
      maxWidth: 'var(--max-content-width)',
      padding: '0 var(--content-padding)',
    });
  });
});