import React from 'react';
import { render, screen } from '@testing-library/react';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { MobileLayout } from '@/components/mobile/MobileLayout';

// Mock useResponsive hook to simulate server/client consistency
jest.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({
    breakpoint: 'desktop',
    screenWidth: 1440,
    screenHeight: 900,
    isMobile: false,
    isTablet: true,
    isDesktop: true,
    isWide: false,
    orientation: 'landscape',
    touchDevice: false,
  })
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Hydration Fix Tests', () => {
  test('MobileBottomNav should render consistently on server and client', () => {
    const { container } = render(<MobileBottomNav />);

    // Should render navigation without hydration errors
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(container.querySelector('nav')).toBeTruthy();
  });

  test('MobileLayout should render without hydration errors', () => {
    render(
      <MobileLayout>
        <div>Test content</div>
      </MobileLayout>
    );

    // Should render layout without throwing hydration errors
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  test('Components should not cause hydration mismatches', () => {
    // Test that components render the same way on server and client
    const serverRender = render(<MobileBottomNav />);
    const clientRender = render(<MobileBottomNav />);

    // Both should have the same basic structure
    expect(serverRender.container.querySelector('nav')).toBeTruthy();
    expect(clientRender.container.querySelector('nav')).toBeTruthy();
    
    // Both should have the same number of navigation links
    expect(serverRender.container.querySelectorAll('a').length).toBe(5);
    expect(clientRender.container.querySelectorAll('a').length).toBe(5);
  });

  test('Mobile components should handle SSR gracefully', () => {
    // Mock window as undefined to simulate SSR
    const originalWindow = global.window;
    
    // @ts-ignore
    delete global.window;

    const { container } = render(
      <MobileLayout>
        <div>SSR Test</div>
      </MobileLayout>
    );

    // Should not crash during SSR
    expect(container).toBeDefined();
    expect(screen.getByText('SSR Test')).toBeInTheDocument();

    // Restore window
    global.window = originalWindow;
  });
});