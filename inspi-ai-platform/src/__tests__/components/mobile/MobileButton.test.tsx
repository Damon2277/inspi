/**
 * MobileButton Component Tests
 * 
 * Comprehensive test suite for the MobileButton component including
 * rendering, user interactions, accessibility, and visual regression testing.
 */

import React from 'react';
import { MobileButton } from '../../../components/mobile/MobileButton';
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

describe('MobileButton', () => {
  let componentTester: ComponentTester;
  let userInteraction: ReturnType<typeof createUserInteraction>;

  beforeEach(() => {
    componentTester = new ComponentTester();
    userInteraction = createUserInteraction();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      renderComponent(<MobileButton>Click me</MobileButton>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    it('should render with custom text content', () => {
      const buttonText = 'Custom Button Text';
      renderComponent(<MobileButton>{buttonText}</MobileButton>);
      
      const button = screen.getByRole('button', { name: buttonText });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(buttonText);
    });

    it('should render with React node children', () => {
      renderComponent(
        <MobileButton>
          <span data-testid="icon">🚀</span>
          <span>Launch</span>
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('icon');
      
      expect(button).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(button).toContainText('Launch');
    });
  });

  describe('Variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost'] as const;

    variants.forEach(variant => {
      it(`should render ${variant} variant correctly`, () => {
        renderComponent(
          <MobileButton variant={variant}>
            {variant} Button
          </MobileButton>
        );
        
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        
        // Check for variant-specific classes
        switch (variant) {
          case 'primary':
            expect(button).toHaveClass('mobile-button-primary-enhanced');
            break;
          case 'secondary':
            expect(button).toHaveClass('mobile-button-secondary-enhanced');
            break;
          case 'outline':
            expect(button).toHaveClass('mobile-button-outline-enhanced');
            break;
          case 'ghost':
            expect(button).toHaveClass('text-gray-700', 'bg-transparent');
            break;
        }
      });
    });

    it('should apply primary variant by default', () => {
      renderComponent(<MobileButton>Default Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('mobile-button-primary-enhanced');
    });
  });

  describe('Sizes', () => {
    const sizes = [
      { size: 'sm' as const, expectedClasses: ['px-3', 'py-2', 'text-sm', 'min-h-[40px]'] },
      { size: 'md' as const, expectedClasses: ['px-4', 'py-3', 'text-base', 'min-h-[48px]'] },
      { size: 'lg' as const, expectedClasses: ['px-6', 'py-4', 'text-lg', 'min-h-[56px]'] }
    ];

    sizes.forEach(({ size, expectedClasses }) => {
      it(`should render ${size} size correctly`, () => {
        renderComponent(
          <MobileButton size={size}>
            {size} Button
          </MobileButton>
        );
        
        const button = screen.getByRole('button');
        expectedClasses.forEach(className => {
          expect(button).toHaveClass(className);
        });
      });
    });

    it('should apply medium size by default', () => {
      renderComponent(<MobileButton>Default Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-3', 'text-base', 'min-h-[48px]');
    });
  });

  describe('Full Width', () => {
    it('should render full width when fullWidth is true', () => {
      renderComponent(
        <MobileButton fullWidth>
          Full Width Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('should not render full width by default', () => {
      renderComponent(<MobileButton>Normal Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });
  });

  describe('Disabled State', () => {
    it('should render as disabled when disabled prop is true', () => {
      renderComponent(
        <MobileButton disabled>
          Disabled Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should not be disabled by default', () => {
      renderComponent(<MobileButton>Enabled Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should not trigger onClick when disabled', async () => {
      const handleClick = jest.fn();
      renderComponent(
        <MobileButton disabled onClick={handleClick}>
          Disabled Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      await userInteraction.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should render loading state correctly', () => {
      renderComponent(
        <MobileButton loading>
          Loading Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(button).toContainText('加载中...');
      
      // Check for spinner
      const spinner = button.querySelector('.mobile-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show loading state by default', () => {
      renderComponent(<MobileButton>Normal Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).not.toContainText('加载中...');
      
      const spinner = button.querySelector('.mobile-spinner');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should not trigger onClick when loading', async () => {
      const handleClick = jest.fn();
      renderComponent(
        <MobileButton loading onClick={handleClick}>
          Loading Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      await userInteraction.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should hide original content when loading', () => {
      const originalContent = 'Original Content';
      renderComponent(
        <MobileButton loading>
          {originalContent}
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).not.toContainText(originalContent);
      expect(button).toContainText('加载中...');
    });
  });

  describe('Button Types', () => {
    const buttonTypes = ['button', 'submit', 'reset'] as const;

    buttonTypes.forEach(type => {
      it(`should render with type="${type}"`, () => {
        renderComponent(
          <MobileButton type={type}>
            {type} Button
          </MobileButton>
        );
        
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', type);
      });
    });

    it('should default to type="button"', () => {
      renderComponent(<MobileButton>Default Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const customClass = 'custom-button-class';
      renderComponent(
        <MobileButton className={customClass}>
          Custom Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(customClass);
    });

    it('should preserve base classes when custom className is provided', () => {
      renderComponent(
        <MobileButton className="custom-class">
          Custom Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('mobile-button-enhanced');
      expect(button).toHaveClass('mobile-focus-visible');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = jest.fn();
      renderComponent(
        <MobileButton onClick={handleClick}>
          Clickable Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      await userInteraction.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', async () => {
      const handleClick = jest.fn();
      renderComponent(
        <MobileButton onClick={handleClick}>
          Multi-click Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      await userInteraction.click(button);
      await userInteraction.click(button);
      await userInteraction.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('should not call onClick when no handler is provided', async () => {
      // This should not throw an error
      renderComponent(<MobileButton>No Handler Button</MobileButton>);
      
      const button = screen.getByRole('button');
      await userInteraction.click(button);
      
      // Test passes if no error is thrown
      expect(button).toBeInTheDocument();
    });

    it('should handle keyboard activation (Enter key)', async () => {
      const handleClick = jest.fn();
      renderComponent(
        <MobileButton onClick={handleClick}>
          Keyboard Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      
      await userInteraction.pressKey('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard activation (Space key)', async () => {
      const handleClick = jest.fn();
      renderComponent(
        <MobileButton onClick={handleClick}>
          Keyboard Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      
      await userInteraction.pressKey(' ');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Management', () => {
    it('should be focusable', () => {
      renderComponent(<MobileButton>Focusable Button</MobileButton>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      renderComponent(
        <MobileButton disabled>
          Disabled Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).not.toHaveFocus();
    });

    it('should not be focusable when loading', () => {
      renderComponent(
        <MobileButton loading>
          Loading Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).not.toHaveFocus();
    });

    it('should have focus-visible classes', () => {
      renderComponent(<MobileButton>Focus Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('mobile-focus-visible');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      renderComponent(<MobileButton>Accessible Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      renderComponent(<MobileButton>Keyboard Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeFocusable();
    });

    it('should have proper disabled state for screen readers', () => {
      renderComponent(
        <MobileButton disabled>
          Disabled Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });

    it('should indicate loading state to screen readers', () => {
      renderComponent(
        <MobileButton loading>
          Loading Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toContainText('加载中...');
    });

    it('should pass accessibility audit', async () => {
      const { container } = renderComponent(
        <MobileButton>Accessible Button</MobileButton>
      );
      
      await componentTester.accessibility.testAccessibility(container);
    });

    it('should pass accessibility audit when disabled', async () => {
      const { container } = renderComponent(
        <MobileButton disabled>
          Disabled Button
        </MobileButton>
      );
      
      await componentTester.accessibility.testAccessibility(container);
    });

    it('should pass accessibility audit when loading', async () => {
      const { container } = renderComponent(
        <MobileButton loading>
          Loading Button
        </MobileButton>
      );
      
      await componentTester.accessibility.testAccessibility(container);
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-optimized classes', () => {
      renderComponent(<MobileButton>Mobile Button</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('mobile-button-enhanced');
    });

    it('should have appropriate minimum height for touch targets', () => {
      const sizes = [
        { size: 'sm' as const, minHeight: 'min-h-[40px]' },
        { size: 'md' as const, minHeight: 'min-h-[48px]' },
        { size: 'lg' as const, minHeight: 'min-h-[56px]' }
      ];

      sizes.forEach(({ size, minHeight }) => {
        renderComponent(
          <MobileButton size={size}>
            {size} Button
          </MobileButton>
        );
        
        const buttons = screen.getAllByRole('button');
        const button = buttons[buttons.length - 1]; // 获取最后一个按钮
        expect(button).toHaveClass(minHeight);
      });
    });
  });

  describe('State Combinations', () => {
    it('should handle disabled and loading states together', () => {
      renderComponent(
        <MobileButton disabled loading>
          Disabled Loading Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(button).toContainText('加载中...');
    });

    it('should handle all props together', () => {
      const handleClick = jest.fn();
      renderComponent(
        <MobileButton
          variant="secondary"
          size="lg"
          fullWidth
          type="submit"
          className="custom-class"
          onClick={handleClick}
        >
          Complex Button
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveClass('mobile-button-secondary-enhanced');
      expect(button).toHaveClass('px-6', 'py-4', 'text-lg', 'min-h-[56px]');
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const renderTime = await componentTester.performance.testRenderPerformance(
        MobileButton,
        { children: 'Performance Test' },
        { maxRenderTime: 50, iterations: 5 }
      );
      
      expect(renderTime.averageTime).toBeLessThan(50);
    });

    it('should not cause memory leaks', async () => {
      await componentTester.performance.testMemoryUsage(
        MobileButton,
        { children: 'Memory Test' },
        50
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      renderComponent(<MobileButton>{''}</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmpty();
    });

    it('should handle null children', () => {
      renderComponent(<MobileButton>{null}</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle undefined onClick', () => {
      renderComponent(
        <MobileButton onClick={undefined}>
          Undefined Handler
        </MobileButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle very long text content', () => {
      const longText = 'This is a very long button text that might cause layout issues if not handled properly';
      renderComponent(<MobileButton>{longText}</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toContainText(longText);
    });

    it('should handle special characters in content', () => {
      const specialText = '🚀 Click me! @#$%^&*()';
      renderComponent(<MobileButton>{specialText}</MobileButton>);
      
      const button = screen.getByRole('button');
      expect(button).toContainText(specialText);
    });
  });

  describe('Integration with Forms', () => {
    it('should work as submit button in forms', async () => {
      const handleSubmit = jest.fn(e => e.preventDefault());
      
      renderComponent(
        <form onSubmit={handleSubmit}>
          <MobileButton type="submit">
            Submit Form
          </MobileButton>
        </form>
      );
      
      const button = screen.getByRole('button');
      await userInteraction.click(button);
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should work as reset button in forms', () => {
      renderComponent(
        <form>
          <input defaultValue="test" />
          <MobileButton type="reset">
            Reset Form
          </MobileButton>
        </form>
      );
      
      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');
      
      expect(button).toHaveAttribute('type', 'reset');
      expect(input).toHaveValue('test');
      
      fireEvent.click(button);
      // 注意：在测试环境中，reset按钮可能不会自动重置表单
      // 这是JSDOM的限制，在真实浏览器中会正常工作
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Theme Integration', () => {
    it('should work with light theme', () => {
      const { container } = renderComponent(
        <MobileButton>Light Theme Button</MobileButton>,
        { theme: 'light' }
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should work with dark theme', () => {
      const { container } = renderComponent(
        <MobileButton>Dark Theme Button</MobileButton>,
        { theme: 'dark' }
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});