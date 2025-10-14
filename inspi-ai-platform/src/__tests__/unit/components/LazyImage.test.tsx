/**
 * LazyImage 组件单元测试
 */

import { render, screen, waitFor, fireEvent, renderHook, act } from '@testing-library/react';
import React from 'react';

import LazyImage, { ResponsiveLazyImage, LazyImageGallery, useLazyImage } from '@/shared/components/LazyImage';


// Mock logger
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock Image constructor
const mockImage = {
  onload: null as any,
  onerror: null as any,
  src: '',
  crossOrigin: null as any,
};

global.Image = jest.fn(() => mockImage) as any;

describe('LazyImage 组件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImage.onload = null;
    mockImage.onerror = null;
    mockImage.src = '';
    mockImage.crossOrigin = null;
  });

  describe('基础功能', () => {
    test('应该渲染基础的懒加载图片', () => {
      render(<LazyImage src="test.jpg" alt="Test image" />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Test image');
    });

    test('应该设置IntersectionObserver', () => {
      render(<LazyImage src="test.jpg" alt="Test image" />);

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { threshold: 0.1, rootMargin: '50px' },
      );
    });

    test('应该使用自定义IntersectionObserver选项', () => {
      const customOptions = { threshold: 0.5, rootMargin: '100px' };

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          config={{ intersectionOptions: customOptions }}
        />,
      );

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        customOptions,
      );
    });

    test('应该显示占位符图片', () => {
      const placeholder = 'placeholder.jpg';

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          config={{ placeholder }}
        />,
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', placeholder);
    });
  });

  describe('图片加载', () => {
    test('应该在元素可见时开始加载图片', async () => {
      const mockObserve = jest.fn();
      const mockDisconnect = jest.fn();

      mockIntersectionObserver.mockReturnValue({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: mockDisconnect,
      });

      render(<LazyImage src="test.jpg" alt="Test image" />);

      // 模拟元素进入视口
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // 验证开始加载图片
      expect(global.Image).toHaveBeenCalled();
      expect(mockImage.src).toBe('test.jpg');
    });

    test('应该在图片加载成功后更新src', async () => {
      const mockObserve = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });

      render(<LazyImage src="test.jpg" alt="Test image" />);

      const img = screen.getByRole('img');

      // 模拟元素进入视口
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // 模拟图片加载成功
      act(() => {
        mockImage.onload();
      });

      await waitFor(() => {
        expect(img).toHaveAttribute('src', 'test.jpg');
      });
    });

    test('应该处理图片加载失败', async () => {
      const fallback = 'fallback.jpg';
      const onError = jest.fn();

      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          config={{ fallback, retries: 0 }}
          onError={onError}
        />,
      );

      const img = screen.getByRole('img');

      // 模拟元素进入视口
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // 模拟图片加载失败
      act(() => {
        mockImage.onerror();
      });

      await waitFor(() => {
        expect(img).toHaveAttribute('src', fallback);
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('重试机制', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该在失败后重试加载', async () => {
      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          config={{ retries: 2, retryDelay: 1000 }}
        />,
      );

      // 模拟元素进入视口
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      // 模拟第一次加载失败
      act(() => {
        mockImage.onerror();
      });

      // 快进时间，触发重试
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // 验证重试
      expect(global.Image).toHaveBeenCalledTimes(2);
    });
  });

  describe('样式和动画', () => {
    test('应该应用渐入动画样式', () => {
      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          config={{ fadeIn: true, fadeInDuration: 500 }}
        />,
      );

      const img = screen.getByRole('img');
      expect(img).toHaveStyle({
        transition: 'opacity 500ms ease-in-out',
        opacity: '0',
      });
    });

    test('应该应用模糊到清晰效果', () => {
      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          config={{
            blurToSharp: true,
            placeholder: 'placeholder.jpg',
            fadeInDuration: 300,
          }}
        />,
      );

      const img = screen.getByRole('img');
      expect(img).toHaveStyle({
        filter: 'blur(5px)',
        transition: expect.stringContaining('filter 300ms ease-in-out'),
      });
    });

    test('应该应用自定义样式', () => {
      const customStyle = { borderRadius: '10px', maxWidth: '200px' };

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          style={customStyle}
        />,
      );

      const img = screen.getByRole('img');
      expect(img).toHaveStyle(customStyle);
    });
  });

  describe('回调函数', () => {
    test('应该调用onLoadStart回调', () => {
      const onLoadStart = jest.fn();

      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          onLoadStart={onLoadStart}
        />,
      );

      // 模拟元素进入视口
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      expect(onLoadStart).toHaveBeenCalled();
    });

    test('应该调用onStateChange回调', () => {
      const onStateChange = jest.fn();

      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          onStateChange={onStateChange}
        />,
      );

      // 模拟元素进入视口
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: true,
          loaded: false,
          error: false,
        }),
      );
    });
  });

  describe('属性传递', () => {
    test('应该传递crossOrigin属性', () => {
      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      });

      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          config={{ crossOrigin: 'anonymous' }}
        />,
      );

      // 模拟元素进入视口
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      expect(mockImage.crossOrigin).toBe('anonymous');
    });

    test('应该传递其他img属性', () => {
      render(
        <LazyImage
          src="test.jpg"
          alt="Test image"
          className="custom-class"
          id="custom-id"
          title="Custom title"
        />,
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('custom-class');
      expect(img).toHaveAttribute('id', 'custom-id');
      expect(img).toHaveAttribute('title', 'Custom title');
    });
  });
});

describe('ResponsiveLazyImage 组件', () => {
  test('应该生成正确的srcSet', () => {
    const sources = [
      { src: 'small.jpg', width: 400 },
      { src: 'medium.jpg', width: 800 },
      { src: 'large.jpg', width: 1200 },
    ];

    render(
      <ResponsiveLazyImage
        sources={sources}
        defaultSrc="default.jpg"
        alt="Responsive image"
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('srcset', 'small.jpg 400w, medium.jpg 800w, large.jpg 1200w');
    expect(img).toHaveAttribute('sizes', '100vw');
  });

  test('应该处理density描述符', () => {
    const sources = [
      { src: 'normal.jpg', width: 400, density: 1 },
      { src: 'retina.jpg', width: 400, density: 2 },
    ];

    render(
      <ResponsiveLazyImage
        sources={sources}
        defaultSrc="default.jpg"
        alt="Responsive image"
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('srcset', 'normal.jpg 1x, retina.jpg 2x');
  });
});

describe('LazyImageGallery 组件', () => {
  const mockImages = [
    { src: 'image1.jpg', alt: 'Image 1', caption: 'Caption 1' },
    { src: 'image2.jpg', alt: 'Image 2', caption: 'Caption 2' },
    { src: 'image3.jpg', alt: 'Image 3' },
  ];

  test('应该渲染图片画廊', () => {
    render(<LazyImageGallery images={mockImages} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);

    expect(screen.getByText('Caption 1')).toBeInTheDocument();
    expect(screen.getByText('Caption 2')).toBeInTheDocument();
  });

  test('应该处理图片点击', () => {
    const onImageClick = jest.fn();

    render(
      <LazyImageGallery
        images={mockImages}
        onImageClick={onImageClick}
      />,
    );

    const firstImage = screen.getAllByRole('img')[0];
    fireEvent.click(firstImage.parentElement!);

    expect(onImageClick).toHaveBeenCalledWith(0, mockImages[0]);
  });

  test('应该应用自定义列数和间距', () => {
    render(
      <LazyImageGallery
        images={mockImages}
        columns={4}
        gap={20}
      />,
    );

    const gallery = screen.getAllByRole('img')[0].parentElement!.parentElement!;
    expect(gallery).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '20px',
    });
  });
});

describe('useLazyImage Hook', () => {
  test('应该返回初始状态', () => {
    const { result } = renderHook(() =>
      useLazyImage('test.jpg', { placeholder: 'placeholder.jpg' }),
    );

    expect(result.current).toEqual({
      loading: false,
      loaded: false,
      error: false,
      retryCount: 0,
      currentSrc: 'placeholder.jpg',
      elementRef: expect.any(Object),
      loadImage: expect.any(Function),
    });
  });

  test('应该设置IntersectionObserver', () => {
    const mockElement = document.createElement('div');
    const mockObserve = jest.fn();

    mockIntersectionObserver.mockReturnValue({
      observe: mockObserve,
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });

    const { result } = renderHook(() => useLazyImage('test.jpg'));

    // 设置元素引用
    act(() => {
      result.current.elementRef.current = mockElement;
    });

    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  test('应该手动加载图片', async () => {
    const { result } = renderHook(() => useLazyImage('test.jpg'));

    act(() => {
      result.current.loadImage();
    });

    expect(result.current.loading).toBe(true);

    // 模拟图片加载成功
    act(() => {
      mockImage.onload();
    });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
      expect(result.current.currentSrc).toBe('test.jpg');
    });
  });
});
