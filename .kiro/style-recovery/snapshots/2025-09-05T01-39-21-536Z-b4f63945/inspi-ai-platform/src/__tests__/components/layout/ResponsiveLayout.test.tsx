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

describe('ResponsiveContainer', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      breakpoint: 'desktop',
      isDesktop: true,
      isWide: false,
    });
  });

  test('renders children correctly', () => {
    render(
      <ResponsiveContainer>
        <div data-testid="child">Test Content</div>
      </ResponsiveContainer>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    const { container } = render(
      <ResponsiveContainer maxWidth="wide" className="custom-class">
        <div>Content</div>
      </ResponsiveContainer>
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('responsive-container');
    expect(containerElement).toHaveClass('custom-class');
  });

  test('applies different padding based on screen size', () => {
    // Test desktop padding
    mockUseResponsive.mockReturnValue({
      breakpoint: 'desktop',
      isDesktop: true,
      isWide: false,
    });

    const { rerender, container } = render(
      <ResponsiveContainer>
        <div>Content</div>
      </ResponsiveContainer>
    );

    let containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('px-6');

    // Test wide screen padding
    mockUseResponsive.mockReturnValue({
      breakpoint: 'wide',
      isDesktop: true,
      isWide: true,
    });

    rerender(
      <ResponsiveContainer>
        <div>Content</div>
      </ResponsiveContainer>
    );

    containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('px-8');
  });
});

describe('ResponsiveGrid', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      breakpoint: 'desktop',
    });
    mockUseResponsiveValue.mockReturnValue(3);
  });

  test('renders children in grid layout', () => {
    render(
      <ResponsiveGrid>
        <div data-testid="item-1">Item 1</div>
        <div data-testid="item-2">Item 2</div>
        <div data-testid="item-3">Item 3</div>
      </ResponsiveGrid>
    );

    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
  });

  test('applies correct grid columns based on breakpoint', () => {
    const { container } = render(
      <ResponsiveGrid cols={{ mobile: 1, desktop: 3 }}>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveAttribute('data-cols', '3');
    expect(gridElement).toHaveAttribute('data-breakpoint', 'desktop');
  });

  test('adapts columns to number of children when adaptive is true', () => {
    mockUseResponsiveValue.mockReturnValue(4); // Grid supports 4 columns

    const { container } = render(
      <ResponsiveGrid adaptive={true}>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    // Should use 2 columns (number of children) instead of 4
    expect(gridElement).toHaveAttribute('data-cols', '2');
  });
});

describe('DesktopLayout', () => {
  test('renders mobile layout on small screens', () => {
    mockUseResponsive.mockReturnValue({
      isDesktop: false,
      isTablet: false,
    });

    render(
      <DesktopLayout
        sidebar={<div data-testid="sidebar">Sidebar</div>}
        rightPanel={<div data-testid="right-panel">Right Panel</div>}
      >
        <div data-testid="main-content">Main Content</div>
      </DesktopLayout>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument();
  });

  test('renders tablet layout on medium screens', () => {
    mockUseResponsive.mockReturnValue({
      isDesktop: false,
      isTablet: true,
    });

    render(
      <DesktopLayout
        sidebar={<div data-testid="sidebar">Sidebar</div>}
        rightPanel={<div data-testid="right-panel">Right Panel</div>}
      >
        <div data-testid="main-content">Main Content</div>
      </DesktopLayout>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument();
  });

  test('renders desktop layout on large screens', () => {
    mockUseResponsive.mockReturnValue({
      isDesktop: true,
      isTablet: true,
    });

    render(
      <DesktopLayout
        sidebar={<div data-testid="sidebar">Sidebar</div>}
        rightPanel={<div data-testid="right-panel">Right Panel</div>}
      >
        <div data-testid="main-content">Main Content</div>
      </DesktopLayout>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
  });

  test('handles sidebar collapse state', () => {
    mockUseResponsive.mockReturnValue({
      isDesktop: true,
      isTablet: true,
    });

    const { container } = render(
      <DesktopLayout
        sidebar={<div data-testid="sidebar">Sidebar</div>}
        sidebarCollapsed={true}
      >
        <div data-testid="main-content">Main Content</div>
      </DesktopLayout>
    );

    const sidebarElement = screen.getByTestId('sidebar').parentElement;
    expect(sidebarElement).toHaveClass('w-16');
  });
});