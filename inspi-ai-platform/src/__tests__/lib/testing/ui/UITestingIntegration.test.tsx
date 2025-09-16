/**
 * UI Testing Framework Integration Tests
 * 
 * Comprehensive integration tests for the complete UI testing framework
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UITestingSuite,
  createUITestingSuite,
  createBasicComponentTest,
  createAccessibilityTest,
  createResponsiveTest,
  createInteractionTest,
  ComponentTestSuite
} from '../../../../lib/testing/ui';

// Mock jest-axe
jest.mock('jest-axe', () => ({
  axe: jest.fn().mockResolvedValue({ violations: [] }),
  toHaveNoViolations: {}
}));

// Complex test components
const TodoApp: React.FC = () => {
  const [todos, setTodos] = React.useState<Array<{ id: number; text: string; completed: boolean }>>([]);
  const [inputValue, setInputValue] = React.useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, { id: Date.now(), text: inputValue, completed: false }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div data-testid="todo-app" className="todo-app">
      <header>
        <h1>Todo App</h1>
        <div className="add-todo">
          <input
            data-testid="todo-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new todo..."
            aria-label="New todo input"
          />
          <button
            data-testid="add-button"
            onClick={addTodo}
            aria-label="Add todo"
          >
            Add
          </button>
        </div>
      </header>
      <main>
        <ul data-testid="todo-list" className="todo-list">
          {todos.map(todo => (
            <li
              key={todo.id}
              data-testid={`todo-item-${todo.id}`}
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
              />
              <span className="todo-text">{todo.text}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                aria-label={`Delete "${todo.text}"`}
                className="delete-button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        {todos.length === 0 && (
          <p data-testid="empty-message" className="empty-message">
            No todos yet. Add one above!
          </p>
        )}
      </main>
    </div>
  );
};

const ResponsiveCard: React.FC<{
  title: string;
  content: string;
  imageUrl?: string;
  actions?: Array<{ label: string; onClick: () => void }>;
}> = ({ title, content, imageUrl, actions = [] }) => (
  <div data-testid="responsive-card" className="card">
    {imageUrl && (
      <img
        src={imageUrl}
        alt={`Image for ${title}`}
        className="card-image"
      />
    )}
    <div className="card-content">
      <h2 className="card-title">{title}</h2>
      <p className="card-text">{content}</p>
      {actions.length > 0 && (
        <div className="card-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="card-action-button"
              data-testid={`action-${index}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

const ModalDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" data-testid="modal-overlay">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
        data-testid="modal"
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            data-testid="modal-close"
            className="modal-close"
          >
            ×
          </button>
        </header>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const FormWithValidation: React.FC<{
  onSubmit: (data: { name: string; email: string; message: string }) => void;
}> = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="validation-form" noValidate>
      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          data-testid="name-input"
        />
        {errors.name && (
          <div id="name-error" role="alert" className="error-message">
            {errors.name}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          data-testid="email-input"
        />
        {errors.email && (
          <div id="email-error" role="alert" className="error-message">
            {errors.email}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="message">Message *</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          data-testid="message-input"
        />
        {errors.message && (
          <div id="message-error" role="alert" className="error-message">
            {errors.message}
          </div>
        )}
      </div>

      <button type="submit" data-testid="submit-button">
        Submit
      </button>
    </form>
  );
};

describe('UI Testing Framework Integration', () => {
  let testingSuite: UITestingSuite;

  beforeEach(() => {
    testingSuite = createUITestingSuite({
      component: {
        theme: 'light',
        viewport: { width: 1024, height: 768 },
        accessibility: { enabled: true },
        performance: { enabled: true },
        styles: { enabled: true }
      },
      interaction: {
        delay: 0,
        pointerEventsCheck: false
      },
      accessibility: {
        wcagLevel: 'AA',
        keyboardNavigation: true,
        screenReaderTesting: true,
        colorContrastTesting: true,
        focusManagement: true
      }
    });
  });

  afterEach(() => {
    testingSuite.cleanup();
  });

  describe('Complete Component Testing', () => {
    it('should run complete test suite for TodoApp', async () => {
      const suite: ComponentTestSuite = {
        name: 'TodoApp Complete Test',
        component: TodoApp,
        interactions: [
          {
            name: 'Add Todo Item',
            action: async (user, container) => {
              const input = container.querySelector('[data-testid="todo-input"]') as HTMLElement;
              const addButton = container.querySelector('[data-testid="add-button"]') as HTMLElement;
              
              await user.type(input, 'Test todo item');
              await user.click(addButton);
            },
            assertions: async (container) => {
              const todoList = container.querySelector('[data-testid="todo-list"]');
              expect(todoList?.children.length).toBe(1);
              expect(todoList?.textContent).toContain('Test todo item');
            }
          },
          {
            name: 'Toggle Todo Completion',
            action: async (user, container) => {
              const input = container.querySelector('[data-testid="todo-input"]') as HTMLElement;
              const addButton = container.querySelector('[data-testid="add-button"]') as HTMLElement;
              
              await user.type(input, 'Toggle test');
              await user.click(addButton);
              
              const checkbox = container.querySelector('input[type="checkbox"]') as HTMLElement;
              await user.click(checkbox);
            },
            assertions: async (container) => {
              const todoItem = container.querySelector('.todo-item');
              expect(todoItem).toHaveClass('completed');
            }
          },
          {
            name: 'Delete Todo Item',
            action: async (user, container) => {
              const input = container.querySelector('[data-testid="todo-input"]') as HTMLElement;
              const addButton = container.querySelector('[data-testid="add-button"]') as HTMLElement;
              
              await user.type(input, 'Delete test');
              await user.click(addButton);
              
              const deleteButton = container.querySelector('.delete-button') as HTMLElement;
              await user.click(deleteButton);
            },
            assertions: async (container) => {
              const todoList = container.querySelector('[data-testid="todo-list"]');
              expect(todoList?.children.length).toBe(0);
              expect(container.querySelector('[data-testid="empty-message"]')).toBeInTheDocument();
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.component.renderTime).toBeGreaterThan(0);
      expect(results.interactions).toHaveLength(3);
      expect(results.interactions.every(r => r.success)).toBe(true);
      expect(results.accessibility.passed).toBe(true);
    });

    it('should test responsive card component', async () => {
      const mockAction = jest.fn();
      const suite: ComponentTestSuite = {
        name: 'Responsive Card Test',
        component: ResponsiveCard,
        props: {
          title: 'Test Card',
          content: 'This is test content for the card component.',
          imageUrl: 'https://example.com/image.jpg',
          actions: [
            { label: 'Action 1', onClick: mockAction },
            { label: 'Action 2', onClick: mockAction }
          ]
        },
        variants: [
          {
            name: 'Without Image',
            props: {
              title: 'No Image Card',
              content: 'Card without image',
              actions: [{ label: 'Single Action', onClick: mockAction }]
            }
          },
          {
            name: 'No Actions',
            props: {
              title: 'Simple Card',
              content: 'Card with no actions',
              imageUrl: 'https://example.com/simple.jpg'
            }
          }
        ],
        interactions: [
          {
            name: 'Click Action Button',
            action: async (user, container) => {
              const actionButton = container.querySelector('[data-testid="action-0"]') as HTMLElement;
              await user.click(actionButton);
            },
            assertions: async (container) => {
              expect(mockAction).toHaveBeenCalledTimes(1);
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.component.renderTime).toBeGreaterThan(0);
      expect(results.interactions[0].success).toBe(true);
      expect(results.accessibility.passed).toBe(true);
    });

    it('should test modal dialog with focus management', async () => {
      const ModalTestWrapper: React.FC = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setIsOpen(true)} data-testid="open-modal">
              Open Modal
            </button>
            <ModalDialog
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              title="Test Modal"
            >
              <p>Modal content goes here</p>
              <button data-testid="modal-action">Modal Action</button>
            </ModalDialog>
          </div>
        );
      };

      const suite: ComponentTestSuite = {
        name: 'Modal Dialog Test',
        component: ModalTestWrapper,
        interactions: [
          {
            name: 'Open and Close Modal',
            action: async (user, container) => {
              const openButton = container.querySelector('[data-testid="open-modal"]') as HTMLElement;
              await user.click(openButton);
              
              await waitFor(() => {
                expect(container.querySelector('[data-testid="modal"]')).toBeInTheDocument();
              });
              
              const closeButton = container.querySelector('[data-testid="modal-close"]') as HTMLElement;
              await user.click(closeButton);
            },
            assertions: async (container) => {
              await waitFor(() => {
                expect(container.querySelector('[data-testid="modal"]')).not.toBeInTheDocument();
              });
            }
          },
          {
            name: 'Close Modal with Escape Key',
            action: async (user, container) => {
              const openButton = container.querySelector('[data-testid="open-modal"]') as HTMLElement;
              await user.click(openButton);
              
              await waitFor(() => {
                expect(container.querySelector('[data-testid="modal"]')).toBeInTheDocument();
              });
              
              await user.keyboard('{Escape}');
            },
            assertions: async (container) => {
              await waitFor(() => {
                expect(container.querySelector('[data-testid="modal"]')).not.toBeInTheDocument();
              });
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.interactions.every(r => r.success)).toBe(true);
      expect(results.accessibility.focusManagement?.focusTrapping).toBeDefined();
    });

    it('should test form validation', async () => {
      const mockSubmit = jest.fn();
      const suite: ComponentTestSuite = {
        name: 'Form Validation Test',
        component: FormWithValidation,
        props: { onSubmit: mockSubmit },
        interactions: [
          {
            name: 'Submit Empty Form',
            action: async (user, container) => {
              const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLElement;
              await user.click(submitButton);
            },
            assertions: async (container) => {
              expect(container.querySelectorAll('.error-message')).toHaveLength(3);
              expect(mockSubmit).not.toHaveBeenCalled();
            }
          },
          {
            name: 'Submit Valid Form',
            action: async (user, container) => {
              const nameInput = container.querySelector('[data-testid="name-input"]') as HTMLElement;
              const emailInput = container.querySelector('[data-testid="email-input"]') as HTMLElement;
              const messageInput = container.querySelector('[data-testid="message-input"]') as HTMLElement;
              const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLElement;
              
              await user.type(nameInput, 'John Doe');
              await user.type(emailInput, 'john@example.com');
              await user.type(messageInput, 'This is a test message');
              await user.click(submitButton);
            },
            assertions: async (container) => {
              expect(mockSubmit).toHaveBeenCalledWith({
                name: 'John Doe',
                email: 'john@example.com',
                message: 'This is a test message'
              });
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.interactions.every(r => r.success)).toBe(true);
      expect(results.accessibility.passed).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('should create basic component test', () => {
      const test = createBasicComponentTest(TodoApp, {});
      
      expect(test.name).toBe('TodoApp');
      expect(test.component).toBe(TodoApp);
      expect(test.props).toEqual({});
    });

    it('should create accessibility-focused test', () => {
      const test = createAccessibilityTest(ResponsiveCard, {
        title: 'Accessibility Test',
        content: 'Testing accessibility'
      });
      
      expect(test.name).toBe('ResponsiveCard Accessibility');
      expect(test.config?.accessibility?.enabled).toBe(true);
      expect(test.config?.performance?.enabled).toBe(false);
      expect(test.config?.styles?.enabled).toBe(false);
    });

    it('should create responsive design test', () => {
      const test = createResponsiveTest(ResponsiveCard, {
        title: 'Responsive Test',
        content: 'Testing responsive behavior'
      });
      
      expect(test.name).toBe('ResponsiveCard Responsive');
      expect(test.config?.styles?.enabled).toBe(true);
      expect(test.config?.styles?.checkResponsive).toBe(true);
      expect(test.config?.styles?.breakpoints).toEqual([320, 768, 1024, 1440]);
    });

    it('should create interaction test', () => {
      const mockClick = jest.fn();
      const interactions = [
        {
          name: 'Click Test',
          action: async (user: any, container: HTMLElement) => {
            const button = container.querySelector('button') as HTMLElement;
            await user.click(button);
          },
          assertions: async (container: HTMLElement) => {
            expect(mockClick).toHaveBeenCalled();
          }
        }
      ];

      const test = createInteractionTest(
        ResponsiveCard,
        interactions,
        {
          title: 'Interactive Card',
          content: 'Card with interactions',
          actions: [{ label: 'Click me', onClick: mockClick }]
        }
      );
      
      expect(test.name).toBe('ResponsiveCard Interactions');
      expect(test.interactions).toHaveLength(1);
      expect(test.interactions![0].name).toBe('Click Test');
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive test report', async () => {
      const suite: ComponentTestSuite = {
        name: 'Report Test',
        component: TodoApp,
        interactions: [
          {
            name: 'Simple Interaction',
            action: async (user, container) => {
              const input = container.querySelector('[data-testid="todo-input"]') as HTMLElement;
              await user.type(input, 'Test');
            },
            assertions: async (container) => {
              const input = container.querySelector('[data-testid="todo-input"]') as HTMLInputElement;
              expect(input.value).toBe('Test');
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);
      const report = testingSuite.generateReport(results);

      expect(report).toContain('# UI Component Test Report');
      expect(report).toContain('## Component Tests');
      expect(report).toContain('Render Time:');
      expect(report).toContain('Memory Usage:');
      expect(report).toContain('## Interaction Tests');
      expect(report).toContain('## Accessibility Tests');
      expect(report).toContain('Overall Score:');
    });

    it('should handle failed tests in report', async () => {
      const suite: ComponentTestSuite = {
        name: 'Failing Test',
        component: TodoApp,
        interactions: [
          {
            name: 'Failing Interaction',
            action: async (user, container) => {
              // This will fail
              throw new Error('Intentional test failure');
            },
            assertions: async (container) => {
              // Should not reach here
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);
      const report = testingSuite.generateReport(results);

      expect(report).toContain('FAILED');
      expect(report).toContain('Error:');
    });
  });

  describe('Performance Testing', () => {
    it('should measure component render performance', async () => {
      const HeavyComponent: React.FC = () => {
        const [items, setItems] = React.useState<number[]>([]);
        
        React.useEffect(() => {
          // Simulate heavy computation
          const heavyItems = Array.from({ length: 1000 }, (_, i) => i);
          setItems(heavyItems);
        }, []);

        return (
          <div data-testid="heavy-component">
            {items.map(item => (
              <div key={item}>Item {item}</div>
            ))}
          </div>
        );
      };

      const suite: ComponentTestSuite = {
        name: 'Performance Test',
        component: HeavyComponent,
        config: {
          performance: {
            enabled: true,
            renderTimeThreshold: 100,
            memoryThreshold: 1000000
          }
        }
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.component.renderTime).toBeGreaterThan(0);
      expect(results.component.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', async () => {
      const ErrorComponent: React.FC = () => {
        throw new Error('Component render error');
      };

      const suite: ComponentTestSuite = {
        name: 'Error Component Test',
        component: ErrorComponent
      };

      await expect(testingSuite.runCompleteTest(suite)).rejects.toThrow();
    });

    it('should handle interaction errors gracefully', async () => {
      const suite: ComponentTestSuite = {
        name: 'Error Interaction Test',
        component: TodoApp,
        interactions: [
          {
            name: 'Error Interaction',
            action: async (user, container) => {
              throw new Error('Interaction error');
            },
            assertions: async (container) => {
              // Should not reach here
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.interactions[0].success).toBe(false);
      expect(results.interactions[0].error).toContain('Interaction error');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should test complex user workflows', async () => {
      const suite: ComponentTestSuite = {
        name: 'Complex Workflow Test',
        component: TodoApp,
        interactions: [
          {
            name: 'Complete Todo Workflow',
            action: async (user, container) => {
              const input = container.querySelector('[data-testid="todo-input"]') as HTMLElement;
              const addButton = container.querySelector('[data-testid="add-button"]') as HTMLElement;
              
              // Add multiple todos
              await user.type(input, 'First todo');
              await user.click(addButton);
              
              await user.type(input, 'Second todo');
              await user.click(addButton);
              
              await user.type(input, 'Third todo');
              await user.click(addButton);
              
              // Complete first todo
              const firstCheckbox = container.querySelector('input[type="checkbox"]') as HTMLElement;
              await user.click(firstCheckbox);
              
              // Delete second todo
              const deleteButtons = container.querySelectorAll('.delete-button');
              await user.click(deleteButtons[1] as HTMLElement);
            },
            assertions: async (container) => {
              const todoItems = container.querySelectorAll('.todo-item');
              expect(todoItems).toHaveLength(2);
              expect(todoItems[0]).toHaveClass('completed');
              expect(todoItems[1]).not.toHaveClass('completed');
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.interactions[0].success).toBe(true);
      expect(results.accessibility.passed).toBe(true);
    });

    it('should test keyboard navigation workflows', async () => {
      const suite: ComponentTestSuite = {
        name: 'Keyboard Navigation Test',
        component: TodoApp,
        interactions: [
          {
            name: 'Keyboard Todo Addition',
            action: async (user, container) => {
              const input = container.querySelector('[data-testid="todo-input"]') as HTMLElement;
              
              await user.type(input, 'Keyboard todo');
              await user.keyboard('{Enter}');
            },
            assertions: async (container) => {
              const todoList = container.querySelector('[data-testid="todo-list"]');
              expect(todoList?.children.length).toBe(1);
              expect(todoList?.textContent).toContain('Keyboard todo');
            }
          }
        ]
      };

      const results = await testingSuite.runCompleteTest(suite);

      expect(results.interactions[0].success).toBe(true);
      expect(results.accessibility.keyboardNavigation?.passed).toBe(true);
    });
  });
});