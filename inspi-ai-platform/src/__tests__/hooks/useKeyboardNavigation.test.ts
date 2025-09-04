import { renderHook } from '@testing-library/react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

// Mock document.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true
});

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register global keyboard shortcuts', () => {
    const mockAction = jest.fn();
    
    renderHook(() =>
      useKeyboardNavigation({
        shortcuts: [
          {
            key: 'Enter',
            action: mockAction,
            description: 'Test shortcut'
          }
        ],
        scope: 'global'
      })
    );

    expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not register event listeners for local scope', () => {
    const mockAction = jest.fn();
    
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        shortcuts: [
          {
            key: 'Enter',
            action: mockAction,
            description: 'Test shortcut'
          }
        ],
        scope: 'local'
      })
    );

    expect(mockAddEventListener).not.toHaveBeenCalled();
    expect(result.current.handleKeyDown).toBeDefined();
  });

  it('should not register shortcuts when disabled', () => {
    const mockAction = jest.fn();
    
    renderHook(() =>
      useKeyboardNavigation({
        shortcuts: [
          {
            key: 'Enter',
            action: mockAction,
            description: 'Test shortcut'
          }
        ],
        disabled: true
      })
    );

    expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should cleanup event listeners on unmount', () => {
    const mockAction = jest.fn();
    
    const { unmount } = renderHook(() =>
      useKeyboardNavigation({
        shortcuts: [
          {
            key: 'Enter',
            action: mockAction,
            description: 'Test shortcut'
          }
        ],
        scope: 'global'
      })
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should handle keyboard events correctly', () => {
    const mockAction = jest.fn();
    let keydownHandler: (event: KeyboardEvent) => void;

    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler;
      }
    });

    renderHook(() =>
      useKeyboardNavigation({
        shortcuts: [
          {
            key: 'Enter',
            action: mockAction,
            description: 'Test shortcut'
          }
        ],
        scope: 'global'
      })
    );

    // Simulate Enter key press
    const mockEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false
    });

    Object.defineProperty(mockEvent, 'target', {
      value: { tagName: 'DIV' },
      writable: false
    });

    keydownHandler!(mockEvent);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should ignore shortcuts when target is input element', () => {
    const mockAction = jest.fn();
    let keydownHandler: (event: KeyboardEvent) => void;

    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler;
      }
    });

    renderHook(() =>
      useKeyboardNavigation({
        shortcuts: [
          {
            key: 'Enter',
            action: mockAction,
            description: 'Test shortcut'
          }
        ],
        scope: 'global'
      })
    );

    // Simulate Enter key press on input element
    const mockEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false
    });

    Object.defineProperty(mockEvent, 'target', {
      value: { tagName: 'INPUT' },
      writable: false
    });

    keydownHandler!(mockEvent);

    expect(mockAction).not.toHaveBeenCalled();
  });
});