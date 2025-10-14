import { renderHook, act } from '@testing-library/react';

import { useResponsive } from '@/shared/hooks/useResponsive';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('useResponsive', () => {
  let mockMediaQueryList: any;

  beforeEach(() => {
    mockMediaQueryList = mockMatchMedia(false);
    window.matchMedia = jest.fn().mockReturnValue(mockMediaQueryList);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return initial responsive state', () => {
      // Arrange
      window.matchMedia = jest.fn()
        .mockReturnValueOnce(mockMatchMedia(false)) // mobile
        .mockReturnValueOnce(mockMatchMedia(true))  // tablet
        .mockReturnValueOnce(mockMatchMedia(false)) // desktop
        .mockReturnValueOnce(mockMatchMedia(false)); // large

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current).toEqual({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isLarge: false,
        breakpoint: 'tablet',
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });

    it('should detect mobile breakpoint', () => {
      // Arrange
      window.matchMedia = jest.fn()
        .mockReturnValueOnce(mockMatchMedia(true))  // mobile
        .mockReturnValueOnce(mockMatchMedia(false)) // tablet
        .mockReturnValueOnce(mockMatchMedia(false)) // desktop
        .mockReturnValueOnce(mockMatchMedia(false)); // large

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.isMobile).toBe(true);
      expect(result.current.breakpoint).toBe('mobile');
    });

    it('should detect desktop breakpoint', () => {
      // Arrange
      window.matchMedia = jest.fn()
        .mockReturnValueOnce(mockMatchMedia(false)) // mobile
        .mockReturnValueOnce(mockMatchMedia(false)) // tablet
        .mockReturnValueOnce(mockMatchMedia(true))  // desktop
        .mockReturnValueOnce(mockMatchMedia(false)); // large

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.breakpoint).toBe('desktop');
    });

    it('should detect large breakpoint', () => {
      // Arrange
      window.matchMedia = jest.fn()
        .mockReturnValueOnce(mockMatchMedia(false)) // mobile
        .mockReturnValueOnce(mockMatchMedia(false)) // tablet
        .mockReturnValueOnce(mockMatchMedia(false)) // desktop
        .mockReturnValueOnce(mockMatchMedia(true));  // large

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.isLarge).toBe(true);
      expect(result.current.breakpoint).toBe('large');
    });
  });

  describe('responsive updates', () => {
    it('should update when window is resized', () => {
      // Arrange
      const mockAddEventListener = jest.fn();
      const mockRemoveEventListener = jest.fn();

      mockMediaQueryList.addEventListener = mockAddEventListener;
      mockMediaQueryList.removeEventListener = mockRemoveEventListener;

      const { result, unmount } = renderHook(() => useResponsive());

      // Act - Simulate media query change
      act(() => {
        const changeHandler = mockAddEventListener.mock.calls[0][1];
        changeHandler({ matches: true });
      });

      // Assert
      expect(result.current.isMobile).toBe(true);

      // Cleanup
      unmount();
      expect(mockRemoveEventListener).toHaveBeenCalled();
    });

    it('should handle multiple breakpoint changes', () => {
      // Arrange
      const mockAddEventListener = jest.fn();
      mockMediaQueryList.addEventListener = mockAddEventListener;

      const { result } = renderHook(() => useResponsive());

      // Act - Simulate multiple changes
      act(() => {
        // Change to tablet
        window.matchMedia = jest.fn()
          .mockReturnValueOnce(mockMatchMedia(false)) // mobile
          .mockReturnValueOnce(mockMatchMedia(true))  // tablet
          .mockReturnValueOnce(mockMatchMedia(false)) // desktop
          .mockReturnValueOnce(mockMatchMedia(false)); // large

        const changeHandler = mockAddEventListener.mock.calls[0][1];
        changeHandler({ matches: false });
      });

      // Assert
      expect(result.current.isTablet).toBe(true);
      expect(result.current.breakpoint).toBe('tablet');
    });
  });

  describe('window dimensions', () => {
    it('should track window dimensions', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
    });

    it('should update dimensions on window resize', () => {
      // Arrange
      const { result } = renderHook(() => useResponsive());

      // Act
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1200 });
        Object.defineProperty(window, 'innerHeight', { value: 800 });
        window.dispatchEvent(new Event('resize'));
      });

      // Assert
      expect(result.current.width).toBe(1200);
      expect(result.current.height).toBe(800);
    });
  });

  describe('custom breakpoints', () => {
    it('should support custom breakpoints', () => {
      // Arrange
      const customBreakpoints = {
        small: '(max-width: 480px)',
        medium: '(min-width: 481px) and (max-width: 768px)',
        large: '(min-width: 769px)',
      };

      window.matchMedia = jest.fn()
        .mockReturnValueOnce(mockMatchMedia(false)) // small
        .mockReturnValueOnce(mockMatchMedia(true))  // medium
        .mockReturnValueOnce(mockMatchMedia(false)); // large

      // Act
      const { result } = renderHook(() => useResponsive(customBreakpoints));

      // Assert
      expect(result.current.breakpoint).toBe('medium');
    });

    it('should handle invalid custom breakpoints', () => {
      // Arrange
      const invalidBreakpoints = null;

      // Act & Assert
      expect(() => {
        renderHook(() => useResponsive(invalidBreakpoints as any));
      }).not.toThrow();
    });
  });

  describe('orientation detection', () => {
    it('should detect portrait orientation', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.orientation).toBe('portrait');
    });

    it('should detect landscape orientation', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 667 });
      Object.defineProperty(window, 'innerHeight', { value: 375 });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.orientation).toBe('landscape');
    });

    it('should update orientation on device rotation', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      const { result } = renderHook(() => useResponsive());
      expect(result.current.orientation).toBe('portrait');

      // Act - Simulate rotation
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 667 });
        Object.defineProperty(window, 'innerHeight', { value: 375 });
        window.dispatchEvent(new Event('resize'));
      });

      // Assert
      expect(result.current.orientation).toBe('landscape');
    });
  });

  describe('touch device detection', () => {
    it('should detect touch devices', () => {
      // Arrange
      Object.defineProperty(window, 'ontouchstart', {
        value: () => {},
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.isTouchDevice).toBe(true);
    });

    it('should detect non-touch devices', () => {
      // Arrange
      Object.defineProperty(window, 'ontouchstart', {
        value: undefined,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.isTouchDevice).toBe(false);
    });
  });

  describe('performance optimization', () => {
    it('should debounce resize events', () => {
      // Arrange
      jest.useFakeTimers();
      const { result } = renderHook(() => useResponsive());

      const initialWidth = result.current.width;

      // Act - Trigger multiple resize events rapidly
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 800 });
        window.dispatchEvent(new Event('resize'));

        Object.defineProperty(window, 'innerWidth', { value: 900 });
        window.dispatchEvent(new Event('resize'));

        Object.defineProperty(window, 'innerWidth', { value: 1000 });
        window.dispatchEvent(new Event('resize'));
      });

      // Should not update immediately
      expect(result.current.width).toBe(initialWidth);

      // Act - Fast forward timers
      act(() => {
        jest.advanceTimersByTime(250); // Default debounce delay
      });

      // Assert - Should update after debounce
      expect(result.current.width).toBe(1000);

      jest.useRealTimers();
    });

    it('should cleanup event listeners on unmount', () => {
      // Arrange
      const mockRemoveEventListener = jest.spyOn(window, 'removeEventListener');
      const mockMediaRemoveListener = jest.fn();
      mockMediaQueryList.removeEventListener = mockMediaRemoveListener;

      // Act
      const { unmount } = renderHook(() => useResponsive());
      unmount();

      // Assert
      expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockMediaRemoveListener).toHaveBeenCalled();
    });
  });

  describe('SSR compatibility', () => {
    it('should handle server-side rendering', () => {
      // Arrange - Mock SSR environment
      const originalWindow = global.window;
      delete (global as any).window;

      // Act & Assert
      expect(() => {
        renderHook(() => useResponsive());
      }).not.toThrow();

      // Cleanup
      global.window = originalWindow;
    });

    it('should provide default values during SSR', () => {
      // Arrange - Mock SSR environment
      const originalWindow = global.window;
      delete (global as any).window;

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current).toEqual({
        isMobile: false,
        isTablet: false,
        isDesktop: true, // Default to desktop for SSR
        isLarge: false,
        breakpoint: 'desktop',
        width: 1024, // Default width
        height: 768, // Default height
        orientation: 'landscape',
        isTouchDevice: false,
      });

      // Cleanup
      global.window = originalWindow;
    });
  });

  describe('accessibility features', () => {
    it('should detect reduced motion preference', () => {
      // Arrange
      window.matchMedia = jest.fn().mockImplementation((query) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('should detect high contrast preference', () => {
      // Arrange
      window.matchMedia = jest.fn().mockImplementation((query) => {
        if (query === '(prefers-contrast: high)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.prefersHighContrast).toBe(true);
    });

    it('should detect dark mode preference', () => {
      // Arrange
      window.matchMedia = jest.fn().mockImplementation((query) => {
        if (query === '(prefers-color-scheme: dark)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.prefersDarkMode).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should provide breakpoint comparison methods', () => {
      // Arrange
      window.matchMedia = jest.fn()
        .mockReturnValueOnce(mockMatchMedia(false)) // mobile
        .mockReturnValueOnce(mockMatchMedia(true))  // tablet
        .mockReturnValueOnce(mockMatchMedia(false)) // desktop
        .mockReturnValueOnce(mockMatchMedia(false)); // large

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.isAtLeast('mobile')).toBe(true);
      expect(result.current.isAtLeast('tablet')).toBe(true);
      expect(result.current.isAtLeast('desktop')).toBe(false);
      expect(result.current.isAtMost('tablet')).toBe(true);
      expect(result.current.isAtMost('mobile')).toBe(false);
    });

    it('should provide device type detection', () => {
      // Arrange
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useResponsive());

      // Assert
      expect(result.current.deviceType).toBe('mobile');
    });
  });
});
