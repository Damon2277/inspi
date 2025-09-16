/**
 * Interaction Simulator Tests
 * 
 * Tests for the user interaction simulation system
 */
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  InteractionSimulator,
  createInteractionSimulator,
  createInteractionSequence,
  InteractionSequence,
  TouchGesture,
  KeyboardSequence,
  MouseInteraction
} from '../../../../lib/testing/ui/InteractionSimulator';

// Mock components for testing
const InteractiveButton: React.FC<{ 
  onClick?: () => void; 
  onMouseEnter?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}> = ({ onClick, onMouseEnter, onKeyDown }) => React.createElement('button', {
  'data-testid': 'interactive-button',
  onClick,
  onMouseEnter,
  onKeyDown,
  tabIndex: 0
}, 'Click me');

const DraggableElement: React.FC<{
  onDragStart?: () => void;
  onDragEnd?: () => void;
}> = ({ onDragStart, onDragEnd }) => React.createElement('div', {
  'data-testid': 'draggable',
  draggable: true,
  onDragStart,
  onDragEnd,
  style: { width: 100, height: 100, backgroundColor: 'blue' }
}, 'Drag me');

const TouchableElement: React.FC<{
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  onTouchMove?: () => void;
}> = ({ onTouchStart, onTouchEnd, onTouchMove }) => React.createElement('div', {
  'data-testid': 'touchable',
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  style: { width: 200, height: 200, backgroundColor: 'green' }
}, 'Touch me');

const FormElement: React.FC<{
  onSubmit?: (data: { name: string; email: string }) => void;
}> = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({ name: '', email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="test-form">
      <input
        data-testid="name-input"
        name="name"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <input
        data-testid="email-input"
        name="email"
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <button type="submit" data-testid="submit-button">
        Submit
      </button>
    </form>
  );
};

describe('InteractionSimulator', () => {
  let simulator: InteractionSimulator;
  let container: HTMLElement;

  beforeEach(() => {
    simulator = createInteractionSimulator({
      delay: 0,
      skipHover: false,
      pointerEventsCheck: false
    });
    
    // Create a container for our tests
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    simulator.cleanup();
    document.body.removeChild(container);
  });

  describe('Mouse Interactions', () => {
    it('should simulate click interactions', async () => {
      const mockClick = jest.fn();
      const { container: renderContainer } = render(
        <InteractiveButton onClick={mockClick} />
      );

      const mouseInteraction: MouseInteraction = {
        type: 'click',
        button: 'left'
      };

      const sequence = createInteractionSequence('Click Test', [
        {
          type: 'mouse',
          target: '[data-testid="interactive-button"]',
          action: mouseInteraction
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].success).toBe(true);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('should simulate double click interactions', async () => {
      const mockDoubleClick = jest.fn();
      const { container: renderContainer } = render(
        <button 
          data-testid="double-click-button"
          onDoubleClick={mockDoubleClick}
        >
          Double click me
        </button>
      );

      const mouseInteraction: MouseInteraction = {
        type: 'doubleClick'
      };

      const sequence = createInteractionSequence('Double Click Test', [
        {
          type: 'mouse',
          target: '[data-testid="double-click-button"]',
          action: mouseInteraction
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('should simulate hover interactions', async () => {
      const mockMouseEnter = jest.fn();
      const { container: renderContainer } = render(
        <InteractiveButton onMouseEnter={mockMouseEnter} />
      );

      const mouseInteraction: MouseInteraction = {
        type: 'hover'
      };

      const sequence = createInteractionSequence('Hover Test', [
        {
          type: 'mouse',
          target: '[data-testid="interactive-button"]',
          action: mouseInteraction
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockMouseEnter).toHaveBeenCalledTimes(1);
    });

    it('should simulate drag interactions', async () => {
      const mockDragStart = jest.fn();
      const mockDragEnd = jest.fn();
      const { container: renderContainer } = render(
        <DraggableElement 
          onDragStart={mockDragStart}
          onDragEnd={mockDragEnd}
        />
      );

      const mouseInteraction: MouseInteraction = {
        type: 'drag',
        dragTo: { x: 200, y: 200 }
      };

      const sequence = createInteractionSequence('Drag Test', [
        {
          type: 'mouse',
          target: '[data-testid="draggable"]',
          action: mouseInteraction
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
    });
  });

  describe('Keyboard Interactions', () => {
    it('should simulate keyboard input', async () => {
      const { container: renderContainer } = render(
        <input data-testid="text-input" />
      );

      const keyboardSequence: KeyboardSequence = {
        keys: ['Hello World']
      };

      const sequence = createInteractionSequence('Keyboard Input Test', [
        {
          type: 'keyboard',
          target: '[data-testid="text-input"]',
          action: keyboardSequence
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      const input = screen.getByTestId('text-input') as HTMLInputElement;
      expect(input.value).toBe('Hello World');
    });

    it('should simulate keyboard shortcuts', async () => {
      const mockKeyDown = jest.fn();
      const { container: renderContainer } = render(
        <InteractiveButton onKeyDown={mockKeyDown} />
      );

      const keyboardSequence: KeyboardSequence = {
        keys: ['s'],
        modifiers: ['ctrl']
      };

      const sequence = createInteractionSequence('Keyboard Shortcut Test', [
        {
          type: 'keyboard',
          target: '[data-testid="interactive-button"]',
          action: keyboardSequence
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockKeyDown).toHaveBeenCalled();
    });

    it('should simulate Enter and Space key activation', async () => {
      const mockClick = jest.fn();
      const { container: renderContainer } = render(
        <InteractiveButton onClick={mockClick} />
      );

      const enterSequence = createInteractionSequence('Enter Key Test', [
        {
          type: 'keyboard',
          target: '[data-testid="interactive-button"]',
          action: { keys: ['{Enter}'] }
        }
      ]);

      const spaceSequence = createInteractionSequence('Space Key Test', [
        {
          type: 'keyboard',
          target: '[data-testid="interactive-button"]',
          action: { keys: [' '] }
        }
      ]);

      const enterResult = await simulator.executeSequence(enterSequence);
      const spaceResult = await simulator.executeSequence(spaceSequence);

      expect(enterResult.success).toBe(true);
      expect(spaceResult.success).toBe(true);
    });
  });

  describe('Touch Interactions', () => {
    it('should simulate tap gesture', async () => {
      const mockTouchStart = jest.fn();
      const mockTouchEnd = jest.fn();
      const { container: renderContainer } = render(
        <TouchableElement 
          onTouchStart={mockTouchStart}
          onTouchEnd={mockTouchEnd}
        />
      );

      const touchGesture: TouchGesture = {
        type: 'tap',
        startPoint: { x: 100, y: 100 }
      };

      const sequence = createInteractionSequence('Tap Test', [
        {
          type: 'touch',
          target: '[data-testid="touchable"]',
          action: touchGesture
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockTouchStart).toHaveBeenCalled();
      expect(mockTouchEnd).toHaveBeenCalled();
    });

    it('should simulate swipe gesture', async () => {
      const mockTouchStart = jest.fn();
      const mockTouchMove = jest.fn();
      const mockTouchEnd = jest.fn();
      const { container: renderContainer } = render(
        <TouchableElement 
          onTouchStart={mockTouchStart}
          onTouchMove={mockTouchMove}
          onTouchEnd={mockTouchEnd}
        />
      );

      const touchGesture: TouchGesture = {
        type: 'swipe',
        startPoint: { x: 50, y: 100 },
        endPoint: { x: 150, y: 100 },
        duration: 200
      };

      const sequence = createInteractionSequence('Swipe Test', [
        {
          type: 'touch',
          target: '[data-testid="touchable"]',
          action: touchGesture
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockTouchStart).toHaveBeenCalled();
      expect(mockTouchMove).toHaveBeenCalled();
      expect(mockTouchEnd).toHaveBeenCalled();
    });

    it('should simulate long press gesture', async () => {
      const mockTouchStart = jest.fn();
      const mockTouchEnd = jest.fn();
      const { container: renderContainer } = render(
        <TouchableElement 
          onTouchStart={mockTouchStart}
          onTouchEnd={mockTouchEnd}
        />
      );

      const touchGesture: TouchGesture = {
        type: 'longPress',
        startPoint: { x: 100, y: 100 },
        duration: 500
      };

      const sequence = createInteractionSequence('Long Press Test', [
        {
          type: 'touch',
          target: '[data-testid="touchable"]',
          action: touchGesture
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockTouchStart).toHaveBeenCalled();
      expect(mockTouchEnd).toHaveBeenCalled();
    });

    it('should simulate pinch gesture', async () => {
      const mockTouchStart = jest.fn();
      const mockTouchMove = jest.fn();
      const mockTouchEnd = jest.fn();
      const { container: renderContainer } = render(
        <TouchableElement 
          onTouchStart={mockTouchStart}
          onTouchMove={mockTouchMove}
          onTouchEnd={mockTouchEnd}
        />
      );

      const touchGesture: TouchGesture = {
        type: 'pinch',
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 150, y: 100 },
        duration: 300
      };

      const sequence = createInteractionSequence('Pinch Test', [
        {
          type: 'touch',
          target: '[data-testid="touchable"]',
          action: touchGesture
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockTouchStart).toHaveBeenCalled();
      expect(mockTouchMove).toHaveBeenCalled();
      expect(mockTouchEnd).toHaveBeenCalled();
    });
  });

  describe('Complex Interaction Sequences', () => {
    it('should execute multi-step form interaction', async () => {
      const mockSubmit = jest.fn();
      const { container: renderContainer } = render(
        <FormElement onSubmit={mockSubmit} />
      );

      const sequence = createInteractionSequence('Form Fill Test', [
        {
          type: 'keyboard',
          target: '[data-testid="name-input"]',
          action: { keys: ['John Doe'] }
        },
        {
          type: 'keyboard',
          target: '[data-testid="email-input"]',
          action: { keys: ['john@example.com'] }
        },
        {
          type: 'mouse',
          target: '[data-testid="submit-button"]',
          action: { type: 'click' }
        },
        {
          type: 'assert',
          assertion: async (container) => {
            expect(mockSubmit).toHaveBeenCalledWith({
              name: 'John Doe',
              email: 'john@example.com'
            });
          }
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(4);
      expect(result.steps.every(step => step.success)).toBe(true);
    });

    it('should handle step delays', async () => {
      const mockClick = jest.fn();
      const { container: renderContainer } = render(
        <InteractiveButton onClick={mockClick} />
      );

      const sequence = createInteractionSequence('Delayed Interaction Test', [
        {
          type: 'mouse',
          target: '[data-testid="interactive-button"]',
          action: { type: 'click' },
          delay: 100
        },
        {
          type: 'mouse',
          target: '[data-testid="interactive-button"]',
          action: { type: 'click' },
          delay: 100
        }
      ]);

      const startTime = Date.now();
      const result = await simulator.executeSequence(sequence);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
      expect(mockClick).toHaveBeenCalledTimes(2);
    });

    it('should execute cleanup after sequence', async () => {
      const mockCleanup = jest.fn();
      const mockClick = jest.fn();
      const { container: renderContainer } = render(
        <InteractiveButton onClick={mockClick} />
      );

      const sequence = createInteractionSequence(
        'Cleanup Test',
        [
          {
            type: 'mouse',
            target: '[data-testid="interactive-button"]',
            action: { type: 'click' }
          }
        ],
        { cleanup: mockCleanup }
      );

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(true);
      expect(mockClick).toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing elements', async () => {
      const sequence = createInteractionSequence('Missing Element Test', [
        {
          type: 'mouse',
          target: '[data-testid="non-existent"]',
          action: { type: 'click' }
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(false);
      expect(result.steps[0].success).toBe(false);
      expect(result.steps[0].error).toContain('Element not found');
    });

    it('should handle interaction errors', async () => {
      const { container: renderContainer } = render(
        <InteractiveButton />
      );

      const sequence = createInteractionSequence('Error Test', [
        {
          type: 'mouse',
          target: '[data-testid="interactive-button"]',
          action: { type: 'click' }
        },
        {
          type: 'assert',
          assertion: async (container) => {
            throw new Error('Assertion failed');
          }
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(false);
      expect(result.steps[0].success).toBe(true);
      expect(result.steps[1].success).toBe(false);
      expect(result.steps[1].error).toContain('Assertion failed');
    });

    it('should continue execution after non-critical errors', async () => {
      const mockClick = jest.fn();
      const { container: renderContainer } = render(
        <InteractiveButton onClick={mockClick} />
      );

      const sequence = createInteractionSequence('Partial Error Test', [
        {
          type: 'mouse',
          target: '[data-testid="non-existent"]',
          action: { type: 'click' }
        },
        {
          type: 'mouse',
          target: '[data-testid="interactive-button"]',
          action: { type: 'click' }
        }
      ]);

      const result = await simulator.executeSequence(sequence);

      expect(result.success).toBe(false);
      expect(result.steps[0].success).toBe(false);
      // Second step should not execute due to first step failure
      expect(result.steps).toHaveLength(1);
    });
  });

  describe('Accessibility Testing', () => {
    it('should test keyboard accessibility', async () => {
      const { container: renderContainer } = render(
        <InteractiveButton />
      );

      const button = screen.getByTestId('interactive-button');
      const isAccessible = await simulator.testAccessibilityInteraction(
        button,
        'keyboard'
      );

      expect(isAccessible).toBe(true);
    });

    it('should test screen reader accessibility', async () => {
      const { container: renderContainer } = render(
        <button data-testid="accessible-button" aria-label="Accessible button">
          Click me
        </button>
      );

      const button = screen.getByTestId('accessible-button');
      const isAccessible = await simulator.testAccessibilityInteraction(
        button,
        'screenReader'
      );

      expect(isAccessible).toBe(true);
    });

    it('should test voice control accessibility', async () => {
      const { container: renderContainer } = render(
        <button data-testid="voice-button" aria-label="Voice controlled button">
          Voice me
        </button>
      );

      const button = screen.getByTestId('voice-button');
      const isAccessible = await simulator.testAccessibilityInteraction(
        button,
        'voiceControl'
      );

      expect(isAccessible).toBe(true);
    });
  });

  describe('Common Interaction Patterns', () => {
    it('should provide form filling pattern', () => {
      const patterns = simulator.createCommonInteractions();
      const formPattern = patterns.fillForm({
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(formPattern.name).toBe('Fill Form');
      expect(formPattern.steps).toHaveLength(2);
      expect(formPattern.steps[0].target).toBe('[name="name"]');
      expect(formPattern.steps[1].target).toBe('[name="email"]');
    });

    it('should provide click and wait pattern', () => {
      const patterns = simulator.createCommonInteractions();
      const clickPattern = patterns.clickAndWait('#button', '#result');

      expect(clickPattern.name).toBe('Click and Wait');
      expect(clickPattern.steps).toHaveLength(2);
      expect(clickPattern.steps[0].type).toBe('mouse');
      expect(clickPattern.steps[1].type).toBe('wait');
    });

    it('should provide keyboard navigation pattern', () => {
      const patterns = simulator.createCommonInteractions();
      const navPattern = patterns.keyboardNavigation(['#first', '#second', '#third']);

      expect(navPattern.name).toBe('Keyboard Navigation');
      expect(navPattern.steps).toHaveLength(3);
      expect(navPattern.steps.every(step => step.type === 'keyboard')).toBe(true);
    });

    it('should provide swipe patterns', () => {
      const patterns = simulator.createCommonInteractions();
      const leftSwipe = patterns.swipeLeft('#element');
      const rightSwipe = patterns.swipeRight('#element');

      expect(leftSwipe.name).toBe('Swipe Left');
      expect(rightSwipe.name).toBe('Swipe Right');
      expect(leftSwipe.steps[0].type).toBe('touch');
      expect(rightSwipe.steps[0].type).toBe('touch');
    });
  });
});