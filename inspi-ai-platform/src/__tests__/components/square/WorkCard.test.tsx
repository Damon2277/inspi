/**
 * WorkCard Component Tests
 * 
 * Comprehensive test suite for the WorkCard component including
 * rendering, user interactions, accessibility, and visual regression testing.
 */

import React from 'react';
import WorkCard from '../../../components/square/WorkCard';
import { WorkCardData } from '../../../types/square';
import {
  renderComponent,
  ComponentTester,
  createUserInteraction,
  screen,
  fireEvent,
  waitFor
} from '../../../lib/testing/ui/ComponentTestUtils';
import { setupComponentMatchers } from '../../../lib/testing/ui/ComponentMatchers';

// Setup custom matchers
setupComponentMatchers();

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, width, height, className }: any) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        data-testid="next-image"
      />
    );
  };
});

describe('WorkCard', () => {
  let componentTester: ComponentTester;
  let userInteraction: ReturnType<typeof createUserInteraction>;
  let mockWorkData: WorkCardData;

  beforeEach(() => {
    componentTester = new ComponentTester();
    userInteraction = createUserInteraction();
    
    // Create mock work data
    mockWorkData = {
      id: 'work-123',
      title: '数学函数的可视化学习',
      knowledgePoint: '一次函数与二次函数',
      subject: '数学',
      gradeLevel: '高中一年级',
      author: {
        id: 'author-456',
        name: '张老师',
        avatar: '/avatars/zhang-teacher.jpg'
      },
      reuseCount: 42,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-16T14:20:00Z',
      thumbnail: '/thumbnails/work-123.jpg',
      tags: ['函数', '可视化', '互动学习', '数学建模'],
      cardCount: 8,
      cardTypes: ['visualization', 'analogy', 'thinking', 'interaction']
    };
  });

  describe('Rendering', () => {
    it('should render work card with all basic information', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      // Check title
      expect(screen.getByText(mockWorkData.title)).toBeInTheDocument();
      
      // Check knowledge point
      expect(screen.getByText(`知识点：${mockWorkData.knowledgePoint}`)).toBeInTheDocument();
      
      // Check subject
      expect(screen.getByText(mockWorkData.subject)).toBeInTheDocument();
      
      // Check author name
      expect(screen.getByText(mockWorkData.author.name)).toBeInTheDocument();
      
      // Check grade level
      expect(screen.getByText(mockWorkData.gradeLevel)).toBeInTheDocument();
      
      // Check reuse count
      expect(screen.getByText(mockWorkData.reuseCount.toString())).toBeInTheDocument();
      
      // Check reuse button
      expect(screen.getByRole('button', { name: '复用' })).toBeInTheDocument();
    });

    it('should render with proper card structure', () => {
      const { container } = renderComponent(<WorkCard work={mockWorkData} />);
      
      const card = container.firstChild as Element;
      expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-md');
      expect(card).toHaveClass('hover:shadow-lg', 'transition-shadow', 'duration-200');
      expect(card).toHaveClass('cursor-pointer', 'overflow-hidden');
    });

    it('should render author avatar when provided', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const avatar = screen.getByTestId('next-image');
      expect(avatar).toHaveAttribute('src', mockWorkData.author.avatar);
      expect(avatar).toHaveAttribute('alt', mockWorkData.author.name);
    });

    it('should render author initial when no avatar provided', () => {
      const workWithoutAvatar = {
        ...mockWorkData,
        author: {
          ...mockWorkData.author,
          avatar: undefined
        }
      };
      
      renderComponent(<WorkCard work={workWithoutAvatar} />);
      
      const initial = screen.getByText('张');
      expect(initial).toBeInTheDocument();
      expect(initial).toHaveClass('text-xs', 'text-gray-600');
    });

    it('should render creation date in correct format', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const expectedDate = new Date(mockWorkData.createdAt).toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  describe('Subject Color Mapping', () => {
    const subjectColorTests = [
      { subject: '数学', expectedClasses: ['bg-blue-100', 'text-blue-800'] },
      { subject: '语文', expectedClasses: ['bg-green-100', 'text-green-800'] },
      { subject: '英语', expectedClasses: ['bg-purple-100', 'text-purple-800'] },
      { subject: '科学', expectedClasses: ['bg-orange-100', 'text-orange-800'] },
      { subject: '历史', expectedClasses: ['bg-yellow-100', 'text-yellow-800'] },
      { subject: '地理', expectedClasses: ['bg-teal-100', 'text-teal-800'] },
      { subject: '未知学科', expectedClasses: ['bg-gray-100', 'text-gray-800'] }
    ];

    subjectColorTests.forEach(({ subject, expectedClasses }) => {
      it(`should apply correct colors for ${subject}`, () => {
        const workData = { ...mockWorkData, subject };
        renderComponent(<WorkCard work={workData} />);
        
        const subjectBadge = screen.getByText(subject);
        expectedClasses.forEach(className => {
          expect(subjectBadge).toHaveClass(className);
        });
      });
    });
  });

  describe('Card Type Icons', () => {
    const cardTypeIconTests = [
      { type: 'visualization', expectedIcon: '👁️' },
      { type: 'analogy', expectedIcon: '🔗' },
      { type: 'thinking', expectedIcon: '💭' },
      { type: 'interaction', expectedIcon: '🎯' },
      { type: 'unknown', expectedIcon: '📝' }
    ];

    cardTypeIconTests.forEach(({ type, expectedIcon }) => {
      it(`should display correct icon for ${type} card type`, () => {
        const workData = {
          ...mockWorkData,
          cardTypes: [type]
        };
        
        renderComponent(<WorkCard work={workData} />);
        
        const icon = screen.getByText(expectedIcon);
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute('title', type);
      });
    });

    it('should display multiple card type icons', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      // Check that all card types are displayed
      expect(screen.getByText('👁️')).toBeInTheDocument(); // visualization
      expect(screen.getByText('🔗')).toBeInTheDocument(); // analogy
      expect(screen.getByText('💭')).toBeInTheDocument(); // thinking
      expect(screen.getByText('🎯')).toBeInTheDocument(); // interaction
    });

    it('should limit card type icons to 4 and show overflow count', () => {
      const workData = {
        ...mockWorkData,
        cardTypes: ['visualization', 'analogy', 'thinking', 'interaction', 'extra1', 'extra2'],
        cardCount: 10
      };
      
      renderComponent(<WorkCard work={workData} />);
      
      // Should show +6 for the remaining cards (10 total - 4 shown)
      expect(screen.getByText('+6')).toBeInTheDocument();
    });
  });

  describe('Tags Display', () => {
    it('should display tags with proper formatting', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      // Check first 3 tags are displayed
      expect(screen.getByText('#函数')).toBeInTheDocument();
      expect(screen.getByText('#可视化')).toBeInTheDocument();
      expect(screen.getByText('#互动学习')).toBeInTheDocument();
      
      // Check overflow count for remaining tags
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('should not display tags section when no tags provided', () => {
      const workWithoutTags = {
        ...mockWorkData,
        tags: []
      };
      
      const { container } = renderComponent(<WorkCard work={workWithoutTags} />);
      
      // Should not find any tag elements
      const tagElements = container.querySelectorAll('[class*="rounded-full"][class*="bg-gray-100"]');
      expect(tagElements).toHaveLength(0);
    });

    it('should display all tags when count is 3 or less', () => {
      const workWithFewTags = {
        ...mockWorkData,
        tags: ['tag1', 'tag2']
      };
      
      renderComponent(<WorkCard work={workWithFewTags} />);
      
      expect(screen.getByText('#tag1')).toBeInTheDocument();
      expect(screen.getByText('#tag2')).toBeInTheDocument();
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onView when card is clicked', async () => {
      const handleView = jest.fn();
      renderComponent(<WorkCard work={mockWorkData} onView={handleView} />);
      
      const card = screen.getByText(mockWorkData.title).closest('div');
      await userInteraction.click(card!);
      
      expect(handleView).toHaveBeenCalledWith(mockWorkData.id);
      expect(handleView).toHaveBeenCalledTimes(1);
    });

    it('should call onReuse when reuse button is clicked', async () => {
      const handleReuse = jest.fn();
      renderComponent(<WorkCard work={mockWorkData} onReuse={handleReuse} />);
      
      const reuseButton = screen.getByRole('button', { name: '复用' });
      await userInteraction.click(reuseButton);
      
      expect(handleReuse).toHaveBeenCalledWith(mockWorkData.id);
      expect(handleReuse).toHaveBeenCalledTimes(1);
    });

    it('should not call onView when reuse button is clicked', async () => {
      const handleView = jest.fn();
      const handleReuse = jest.fn();
      
      renderComponent(
        <WorkCard 
          work={mockWorkData} 
          onView={handleView} 
          onReuse={handleReuse} 
        />
      );
      
      const reuseButton = screen.getByRole('button', { name: '复用' });
      await userInteraction.click(reuseButton);
      
      expect(handleReuse).toHaveBeenCalledTimes(1);
      expect(handleView).not.toHaveBeenCalled();
    });

    it('should handle missing event handlers gracefully', async () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const card = screen.getByText(mockWorkData.title).closest('div');
      const reuseButton = screen.getByRole('button', { name: '复用' });
      
      // Should not throw errors
      await userInteraction.click(card!);
      await userInteraction.click(reuseButton);
      
      expect(card).toBeInTheDocument();
      expect(reuseButton).toBeInTheDocument();
    });

    it('should handle keyboard navigation on reuse button', async () => {
      const handleReuse = jest.fn();
      renderComponent(<WorkCard work={mockWorkData} onReuse={handleReuse} />);
      
      const reuseButton = screen.getByRole('button', { name: '复用' });
      reuseButton.focus();
      
      await userInteraction.pressKey('{Enter}');
      expect(handleReuse).toHaveBeenCalledTimes(1);
      
      await userInteraction.pressKey(' ');
      expect(handleReuse).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      // Check for proper heading
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent(mockWorkData.title);
      
      // Check for button
      const reuseButton = screen.getByRole('button', { name: '复用' });
      expect(reuseButton).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const reuseButton = screen.getByRole('button', { name: '复用' });
      expect(reuseButton).toBeFocusable();
      
      reuseButton.focus();
      expect(reuseButton).toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const reuseButton = screen.getByRole('button', { name: '复用' });
      expect(reuseButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('should provide proper alt text for images', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const avatar = screen.getByTestId('next-image');
      expect(avatar).toHaveAttribute('alt', mockWorkData.author.name);
    });

    it('should pass accessibility audit', async () => {
      const { container } = renderComponent(<WorkCard work={mockWorkData} />);
      
      await componentTester.accessibility.testAccessibility(container);
    });

    it('should have proper color contrast', async () => {
      const { container } = renderComponent(<WorkCard work={mockWorkData} />);
      
      await componentTester.accessibility.testColorContrast(container);
    });
  });

  describe('Visual States', () => {
    it('should have hover effects on card', () => {
      const { container } = renderComponent(<WorkCard work={mockWorkData} />);
      
      const card = container.firstChild as Element;
      expect(card).toHaveClass('hover:shadow-lg');
    });

    it('should have hover effects on reuse button', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const reuseButton = screen.getByRole('button', { name: '复用' });
      expect(reuseButton).toHaveClass('hover:bg-indigo-200');
    });

    it('should have proper transition classes', () => {
      const { container } = renderComponent(<WorkCard work={mockWorkData} />);
      
      const card = container.firstChild as Element;
      expect(card).toHaveClass('transition-shadow', 'duration-200');
      
      const reuseButton = screen.getByRole('button', { name: '复用' });
      expect(reuseButton).toHaveClass('transition-colors', 'duration-200');
    });
  });

  describe('Content Truncation', () => {
    it('should handle long titles with line clamping', () => {
      const longTitleWork = {
        ...mockWorkData,
        title: '这是一个非常非常长的标题，用来测试标题的截断功能是否正常工作，应该会被限制在两行内显示'
      };
      
      renderComponent(<WorkCard work={longTitleWork} />);
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('line-clamp-2');
      expect(title).toHaveTextContent(longTitleWork.title);
    });

    it('should handle long knowledge points with line clamping', () => {
      const longKnowledgePointWork = {
        ...mockWorkData,
        knowledgePoint: '这是一个非常详细的知识点描述，包含了很多内容，用来测试知识点文本的截断功能'
      };
      
      renderComponent(<WorkCard work={longKnowledgePointWork} />);
      
      const knowledgePoint = screen.getByText(`知识点：${longKnowledgePointWork.knowledgePoint}`);
      expect(knowledgePoint).toHaveClass('line-clamp-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle work with no card types', () => {
      const workWithNoCardTypes = {
        ...mockWorkData,
        cardTypes: [],
        cardCount: 0
      };
      
      renderComponent(<WorkCard work={workWithNoCardTypes} />);
      
      expect(screen.getByText(mockWorkData.title)).toBeInTheDocument();
      // Should not show any card type icons
      expect(screen.queryByText('👁️')).not.toBeInTheDocument();
    });

    it('should handle work with zero reuse count', () => {
      const workWithZeroReuse = {
        ...mockWorkData,
        reuseCount: 0
      };
      
      renderComponent(<WorkCard work={workWithZeroReuse} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle work with very high reuse count', () => {
      const workWithHighReuse = {
        ...mockWorkData,
        reuseCount: 999999
      };
      
      renderComponent(<WorkCard work={workWithHighReuse} />);
      
      expect(screen.getByText('999999')).toBeInTheDocument();
    });

    it('should handle work with empty author name', () => {
      const workWithEmptyAuthor = {
        ...mockWorkData,
        author: {
          ...mockWorkData.author,
          name: ''
        }
      };
      
      renderComponent(<WorkCard work={workWithEmptyAuthor} />);
      
      // Should still render the component without errors
      expect(screen.getByText(mockWorkData.title)).toBeInTheDocument();
    });

    it('should handle invalid date strings', () => {
      const workWithInvalidDate = {
        ...mockWorkData,
        createdAt: 'invalid-date'
      };
      
      renderComponent(<WorkCard work={workWithInvalidDate} />);
      
      // Should not crash and should display something
      expect(screen.getByText(mockWorkData.title)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const renderTime = await componentTester.performance.testRenderPerformance(
        WorkCard,
        { work: mockWorkData },
        { maxRenderTime: 100, iterations: 5 }
      );
      
      expect(renderTime.averageTime).toBeLessThan(100);
    });

    it('should be memoized to prevent unnecessary re-renders', () => {
      const { rerender } = renderComponent(<WorkCard work={mockWorkData} />);
      
      // Re-render with same props should not cause re-render due to React.memo
      rerender(<WorkCard work={mockWorkData} />);
      
      expect(screen.getByText(mockWorkData.title)).toBeInTheDocument();
    });

    it('should not cause memory leaks', async () => {
      await componentTester.performance.testMemoryUsage(
        WorkCard,
        { work: mockWorkData },
        50
      );
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes for mobile optimization', () => {
      const { container } = renderComponent(<WorkCard work={mockWorkData} />);
      
      const card = container.firstChild as Element;
      expect(card).toHaveClass('rounded-lg');
      
      // Check for responsive spacing
      const cardContent = container.querySelector('.p-4');
      expect(cardContent).toBeInTheDocument();
    });

    it('should handle different screen sizes appropriately', async () => {
      const { container } = renderComponent(<WorkCard work={mockWorkData} />);
      
      await componentTester.visual.testResponsiveDesign(
        container,
        'WorkCard',
        [
          { width: 320, height: 568, name: 'mobile' },
          { width: 768, height: 1024, name: 'tablet' },
          { width: 1920, height: 1080, name: 'desktop' }
        ]
      );
    });
  });

  describe('Theme Integration', () => {
    it('should work with light theme', () => {
      renderComponent(
        <WorkCard work={mockWorkData} />,
        { theme: 'light' }
      );
      
      expect(screen.getByText(mockWorkData.title)).toBeInTheDocument();
    });

    it('should work with dark theme', () => {
      renderComponent(
        <WorkCard work={mockWorkData} />,
        { theme: 'dark' }
      );
      
      expect(screen.getByText(mockWorkData.title)).toBeInTheDocument();
    });
  });

  describe('Integration with Next.js', () => {
    it('should properly integrate with Next.js Image component', () => {
      renderComponent(<WorkCard work={mockWorkData} />);
      
      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('src', mockWorkData.author.avatar);
      expect(image).toHaveAttribute('width', '24');
      expect(image).toHaveAttribute('height', '24');
      expect(image).toHaveClass('rounded-full');
    });
  });
});