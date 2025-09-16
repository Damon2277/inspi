/**
 * Interaction Simulator
 * 
 * Advanced user interaction simulation for comprehensive component testing.
 * Supports complex user flows, touch gestures, keyboard navigation,
 * and accessibility interactions.
 */
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/react';

export interface InteractionConfig {
  delay?: number;
  skipHover?: boolean;
  skipClick?: boolean;
  pointerEventsCheck?: boolean;
  advanceTimers?: boolean;
}

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'longPress' | 'doubleTap';
  startPoint: { x: number; y: number };
  endPoint?: { x: number; y: number };
  duration?: number;
  force?: number;
}

export interface KeyboardSequence {
  keys: string[];
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  delay?: number;
}

export interface MouseInteraction {
  type: 'click' | 'doubleClick' | 'rightClick' | 'hover' | 'drag';
  button?: 'left' | 'right' | 'middle';
  position?: { x: number; y: number };
  dragTo?: { x: number; y: number };
}

export interface InteractionSequence {
  name: string;
  steps: InteractionStep[];
  timeout?: number;
  cleanup?: () => Promise<void>;
}

export interface InteractionStep {
  type: 'mouse' | 'keyboard' | 'touch' | 'wait' | 'assert';
  action: any;
  target?: string | HTMLElement;
  delay?: number;
  assertion?: (element: HTMLElement) => void | Promise<void>;
}

export interface InteractionResult {
  success: boolean;
  duration: number;
  steps: StepResult[];
  error?: string;
}

export interface StepResult {
  stepIndex: number;
  type: string;
  success: boolean;
  duration: number;
  error?: string;
}

export class InteractionSimulator {
  private user: ReturnType<typeof userEvent.setup>;
  private config: InteractionConfig;

  constructor(config: InteractionConfig = {}) {
    this.config = {
      delay: 0,
      skipHover: false,
      skipClick: false,
      pointerEventsCheck: true,
      advanceTimers: false,
      ...config
    };

    this.user = userEvent.setup({
      delay: this.config.delay,
      skipHover: this.config.skipHover,
      skipClick: this.config.skipClick,
      pointerEventsCheck: this.config.pointerEventsCheck,
      advanceTimers: this.config.advanceTimers
    });
  }

  /**
   * Execute interaction sequence
   */
  async executeSequence(sequence: InteractionSequence): Promise<InteractionResult> {
    const startTime = performance.now();
    const stepResults: StepResult[] = [];

    try {
      for (let i = 0; i < sequence.steps.length; i++) {
        const step = sequence.steps[i];
        const stepStartTime = performance.now();

        try {
          await this.executeStep(step);
          
          stepResults.push({
            stepIndex: i,
            type: step.type,
            success: true,
            duration: performance.now() - stepStartTime
          });
        } catch (error) {
          stepResults.push({
            stepIndex: i,
            type: step.type,
            success: false,
            duration: performance.now() - stepStartTime,
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }

        // Add delay between steps if specified
        if (step.delay) {
          await this.wait(step.delay);
        }
      }

      // Run cleanup if provided
      if (sequence.cleanup) {
        await sequence.cleanup();
      }

      return {
        success: true,
        duration: performance.now() - startTime,
        steps: stepResults
      };
    } catch (error) {
      return {
        success: false,
        duration: performance.now() - startTime,
        steps: stepResults,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute individual interaction step
   */
  private async executeStep(step: InteractionStep): Promise<void> {
    const element = this.resolveElement(step.target);

    switch (step.type) {
      case 'mouse':
        await this.executeMouseInteraction(element, step.action);
        break;
      case 'keyboard':
        await this.executeKeyboardInteraction(element, step.action);
        break;
      case 'touch':
        await this.executeTouchInteraction(element, step.action);
        break;
      case 'wait':
        await this.wait(step.action);
        break;
      case 'assert':
        if (step.assertion && element) {
          await step.assertion(element);
        }
        break;
      default:
        throw new Error(`Unknown interaction type: ${step.type}`);
    }
  }

  /**
   * Execute mouse interaction
   */
  private async executeMouseInteraction(
    element: HTMLElement | null,
    interaction: MouseInteraction
  ): Promise<void> {
    if (!element) throw new Error('Element not found for mouse interaction');

    switch (interaction.type) {
      case 'click':
        await this.user.click(element);
        break;
      case 'doubleClick':
        await this.user.dblClick(element);
        break;
      case 'rightClick':
        await this.user.pointer({ keys: '[MouseRight]', target: element });
        break;
      case 'hover':
        await this.user.hover(element);
        break;
      case 'drag':
        if (interaction.dragTo) {
          await this.dragElement(element, interaction.dragTo);
        }
        break;
      default:
        throw new Error(`Unknown mouse interaction: ${interaction.type}`);
    }
  }

  /**
   * Execute keyboard interaction
   */
  private async executeKeyboardInteraction(
    element: HTMLElement | null,
    sequence: KeyboardSequence
  ): Promise<void> {
    if (element) {
      await this.user.click(element); // Focus element first
    }

    for (const key of sequence.keys) {
      const modifiedKey = sequence.modifiers 
        ? `{${sequence.modifiers.join('+')}}${key}`
        : key;
      
      await this.user.keyboard(modifiedKey);
      
      if (sequence.delay) {
        await this.wait(sequence.delay);
      }
    }
  }

  /**
   * Execute touch interaction
   */
  private async executeTouchInteraction(
    element: HTMLElement | null,
    gesture: TouchGesture
  ): Promise<void> {
    if (!element) throw new Error('Element not found for touch interaction');

    switch (gesture.type) {
      case 'tap':
        await this.simulateTap(element, gesture);
        break;
      case 'swipe':
        await this.simulateSwipe(element, gesture);
        break;
      case 'pinch':
        await this.simulatePinch(element, gesture);
        break;
      case 'longPress':
        await this.simulateLongPress(element, gesture);
        break;
      case 'doubleTap':
        await this.simulateDoubleTap(element, gesture);
        break;
      default:
        throw new Error(`Unknown touch gesture: ${gesture.type}`);
    }
  }

  /**
   * Simulate tap gesture
   */
  private async simulateTap(element: HTMLElement, gesture: TouchGesture): Promise<void> {
    const { x, y } = gesture.startPoint;
    
    fireEvent.touchStart(element, {
      touches: [{ clientX: x, clientY: y, force: gesture.force || 1 }]
    });

    await this.wait(50); // Brief touch duration

    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX: x, clientY: y, force: gesture.force || 1 }]
    });
  }

  /**
   * Simulate swipe gesture
   */
  private async simulateSwipe(element: HTMLElement, gesture: TouchGesture): Promise<void> {
    if (!gesture.endPoint) throw new Error('End point required for swipe gesture');

    const { x: startX, y: startY } = gesture.startPoint;
    const { x: endX, y: endY } = gesture.endPoint;
    const duration = gesture.duration || 300;
    const steps = 10;

    fireEvent.touchStart(element, {
      touches: [{ clientX: startX, clientY: startY }]
    });

    // Simulate movement
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;

      fireEvent.touchMove(element, {
        touches: [{ clientX: currentX, clientY: currentY }]
      });

      await this.wait(duration / steps);
    }

    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX: endX, clientY: endY }]
    });
  }

  /**
   * Simulate pinch gesture
   */
  private async simulatePinch(element: HTMLElement, gesture: TouchGesture): Promise<void> {
    const { x, y } = gesture.startPoint;
    const duration = gesture.duration || 500;

    // Start with two fingers close together
    fireEvent.touchStart(element, {
      touches: [
        { clientX: x - 10, clientY: y },
        { clientX: x + 10, clientY: y }
      ]
    });

    // Move fingers apart (zoom in) or together (zoom out)
    const steps = 10;
    const spread = gesture.endPoint ? 
      Math.abs(gesture.endPoint.x - gesture.startPoint.x) : 50;

    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const currentSpread = 10 + spread * progress;

      fireEvent.touchMove(element, {
        touches: [
          { clientX: x - currentSpread, clientY: y },
          { clientX: x + currentSpread, clientY: y }
        ]
      });

      await this.wait(duration / steps);
    }

    fireEvent.touchEnd(element, {
      changedTouches: [
        { clientX: x - spread, clientY: y },
        { clientX: x + spread, clientY: y }
      ]
    });
  }

  /**
   * Simulate long press gesture
   */
  private async simulateLongPress(element: HTMLElement, gesture: TouchGesture): Promise<void> {
    const { x, y } = gesture.startPoint;
    const duration = gesture.duration || 800;

    fireEvent.touchStart(element, {
      touches: [{ clientX: x, clientY: y }]
    });

    await this.wait(duration);

    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX: x, clientY: y }]
    });
  }

  /**
   * Simulate double tap gesture
   */
  private async simulateDoubleTap(element: HTMLElement, gesture: TouchGesture): Promise<void> {
    await this.simulateTap(element, gesture);
    await this.wait(100);
    await this.simulateTap(element, gesture);
  }

  /**
   * Drag element to position
   */
  private async dragElement(
    element: HTMLElement,
    target: { x: number; y: number }
  ): Promise<void> {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    // Start drag
    fireEvent.mouseDown(element, { clientX: startX, clientY: startY });

    // Move to target
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const currentX = startX + (target.x - startX) * progress;
      const currentY = startY + (target.y - startY) * progress;

      fireEvent.mouseMove(document, { clientX: currentX, clientY: currentY });
      await this.wait(50);
    }

    // End drag
    fireEvent.mouseUp(document, { clientX: target.x, clientY: target.y });
  }

  /**
   * Resolve element from target
   */
  private resolveElement(target?: string | HTMLElement): HTMLElement | null {
    if (!target) return null;
    
    if (typeof target === 'string') {
      // Try different selectors
      return document.querySelector(target) ||
             document.querySelector(`[data-testid="${target}"]`) ||
             document.querySelector(`[aria-label="${target}"]`) ||
             document.querySelector(`[role="${target}"]`);
    }
    
    return target;
  }

  /**
   * Wait for specified duration
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create common interaction patterns
   */
  createCommonInteractions() {
    return {
      // Form interactions
      fillForm: (formData: Record<string, string>) => ({
        name: 'Fill Form',
        steps: Object.entries(formData).map(([field, value]) => ({
          type: 'keyboard' as const,
          target: `[name="${field}"]`,
          action: { keys: [value] }
        }))
      }),

      // Navigation interactions
      clickAndWait: (selector: string, waitFor?: string) => ({
        name: 'Click and Wait',
        steps: [
          {
            type: 'mouse' as const,
            target: selector,
            action: { type: 'click' }
          },
          ...(waitFor ? [{
            type: 'wait' as const,
            action: 1000
          }] : [])
        ]
      }),

      // Accessibility interactions
      keyboardNavigation: (selectors: string[]) => ({
        name: 'Keyboard Navigation',
        steps: selectors.map(selector => ({
          type: 'keyboard' as const,
          target: selector,
          action: { keys: ['Tab'] }
        }))
      }),

      // Mobile interactions
      swipeLeft: (selector: string) => ({
        name: 'Swipe Left',
        steps: [{
          type: 'touch' as const,
          target: selector,
          action: {
            type: 'swipe',
            startPoint: { x: 200, y: 100 },
            endPoint: { x: 50, y: 100 }
          }
        }]
      }),

      swipeRight: (selector: string) => ({
        name: 'Swipe Right',
        steps: [{
          type: 'touch' as const,
          target: selector,
          action: {
            type: 'swipe',
            startPoint: { x: 50, y: 100 },
            endPoint: { x: 200, y: 100 }
          }
        }]
      })
    };
  }

  /**
   * Test interaction accessibility
   */
  async testAccessibilityInteraction(
    element: HTMLElement,
    interaction: 'keyboard' | 'screenReader' | 'voiceControl'
  ): Promise<boolean> {
    try {
      switch (interaction) {
        case 'keyboard':
          return await this.testKeyboardAccessibility(element);
        case 'screenReader':
          return await this.testScreenReaderAccessibility(element);
        case 'voiceControl':
          return await this.testVoiceControlAccessibility(element);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Accessibility test failed: ${error}`);
      return false;
    }
  }

  /**
   * Test keyboard accessibility
   */
  private async testKeyboardAccessibility(element: HTMLElement): Promise<boolean> {
    // Test if element is focusable
    element.focus();
    if (document.activeElement !== element) {
      return false;
    }

    // Test keyboard activation
    await this.user.keyboard('{Enter}');
    await this.user.keyboard(' ');

    return true;
  }

  /**
   * Test screen reader accessibility
   */
  private async testScreenReaderAccessibility(element: HTMLElement): Promise<boolean> {
    // Check for proper ARIA attributes
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasAriaDescribedBy = element.hasAttribute('aria-describedby');
    const hasRole = element.hasAttribute('role');

    return hasAriaLabel || hasAriaLabelledBy || hasAriaDescribedBy || hasRole;
  }

  /**
   * Test voice control accessibility
   */
  private async testVoiceControlAccessibility(element: HTMLElement): Promise<boolean> {
    // Check if element has accessible name for voice commands
    const accessibleName = element.getAttribute('aria-label') ||
                          element.textContent ||
                          element.getAttribute('title');

    return !!accessibleName && accessibleName.trim().length > 0;
  }

  /**
   * Cleanup simulator
   */
  cleanup(): void {
    // Clear any pending timers or observers
    if (this.config.advanceTimers) {
      jest.runOnlyPendingTimers();
    }
  }
}

/**
 * Create interaction simulator instance
 */
export function createInteractionSimulator(config?: InteractionConfig): InteractionSimulator {
  return new InteractionSimulator(config);
}

/**
 * Helper function to create interaction sequences
 */
export function createInteractionSequence(
  name: string,
  steps: InteractionStep[],
  options?: { timeout?: number; cleanup?: () => Promise<void> }
): InteractionSequence {
  return {
    name,
    steps,
    timeout: options?.timeout,
    cleanup: options?.cleanup
  };
}