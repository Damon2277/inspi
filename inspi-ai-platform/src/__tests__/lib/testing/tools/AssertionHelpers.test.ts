/**
 * Tests for Assertion Helper Functions
 */

import { AssertionHelpers } from '../../../../lib/testing/helpers/AssertionHelpers';
import { TestError, TestErrorType } from '../../../../lib/testing/errors/TestError';

describe('AssertionHelpers', () => {
  describe('assertThrows', () => {
    it('should pass when function throws expected error', async () => {
      const error = await AssertionHelpers.assertThrows(
        () => { throw new Error('Test error'); },
        { message: 'Test error' }
      );
      
      expect(error.message).toBe('Test error');
    });

    it('should pass when async function throws expected error', async () => {
      const error = await AssertionHelpers.assertThrows(
        async () => { throw new Error('Async error'); },
        { message: 'Async error' }
      );
      
      expect(error.message).toBe('Async error');
    });

    it('should fail when function does not throw', async () => {
      await expect(
        AssertionHelpers.assertThrows(() => 'no error')
      ).rejects.toThrow(TestError);
    });

    it('should validate error type', async () => {
      class CustomError extends Error {}
      
      const error = await AssertionHelpers.assertThrows(
        () => { throw new CustomError('Custom error'); },
        { type: CustomError }
      );
      
      expect(error).toBeInstanceOf(CustomError);
    });

    it('should validate error message with regex', async () => {
      const error = await AssertionHelpers.assertThrows(
        () => { throw new Error('Error code: 404'); },
        { message: /Error code: \d+/ }
      );
      
      expect(error.message).toMatch(/Error code: \d+/);
    });
  });

  describe('assertEventually', () => {
    it('should pass when condition becomes true', async () => {
      let counter = 0;
      const condition = () => ++counter > 3;
      
      await AssertionHelpers.assertEventually(condition, { timeout: 1000, interval: 50 });
      expect(counter).toBeGreaterThan(3);
    });

    it('should fail when condition never becomes true', async () => {
      const condition = () => false;
      
      await expect(
        AssertionHelpers.assertEventually(condition, { timeout: 100, interval: 10 })
      ).rejects.toThrow(TestError);
    });

    it('should work with async conditions', async () => {
      let counter = 0;
      const condition = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return ++counter > 2;
      };
      
      await AssertionHelpers.assertEventually(condition, { timeout: 1000, interval: 50 });
      expect(counter).toBeGreaterThan(2);
    });
  });

  describe('assertCompletesWithin', () => {
    it('should pass when operation completes within timeout', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'completed';
      };
      
      const result = await AssertionHelpers.assertCompletesWithin(operation, 200);
      expect(result).toBe('completed');
    });

    it('should fail when operation exceeds timeout', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'completed';
      };
      
      await expect(
        AssertionHelpers.assertCompletesWithin(operation, 50)
      ).rejects.toThrow(TestError);
    });
  });

  describe('assertArrayContains', () => {
    it('should pass when array contains matching element', () => {
      const array = [1, 2, 3, 4, 5];
      AssertionHelpers.assertArrayContains(array, x => x > 3);
    });

    it('should fail when array does not contain matching element', () => {
      const array = [1, 2, 3];
      expect(() => 
        AssertionHelpers.assertArrayContains(array, x => x > 5)
      ).toThrow(TestError);
    });

    it('should fail when input is not an array', () => {
      expect(() => 
        AssertionHelpers.assertArrayContains('not-array' as any, x => true)
      ).toThrow(TestError);
    });
  });

  describe('assertArrayAll', () => {
    it('should pass when all elements match predicate', () => {
      const array = [2, 4, 6, 8];
      AssertionHelpers.assertArrayAll(array, x => x % 2 === 0);
    });

    it('should fail when not all elements match predicate', () => {
      const array = [2, 4, 5, 8];
      expect(() => 
        AssertionHelpers.assertArrayAll(array, x => x % 2 === 0)
      ).toThrow(TestError);
    });
  });

  describe('assertObjectHasProperties', () => {
    it('should pass when object has all expected properties', () => {
      const obj = { name: 'John', age: 30, city: 'New York' };
      AssertionHelpers.assertObjectHasProperties(obj, { name: 'John', age: 30 });
    });

    it('should fail when object is missing properties', () => {
      const obj = { name: 'John' };
      expect(() => 
        AssertionHelpers.assertObjectHasProperties(obj, { name: 'John', age: 30 })
      ).toThrow(TestError);
    });

    it('should fail when property values do not match', () => {
      const obj = { name: 'John', age: 25 };
      expect(() => 
        AssertionHelpers.assertObjectHasProperties(obj, { name: 'John', age: 30 })
      ).toThrow(TestError);
    });
  });

  describe('assertObjectMatches', () => {
    it('should pass when object matches partial structure', () => {
      const obj = { 
        user: { name: 'John', age: 30 }, 
        settings: { theme: 'dark' },
        extra: 'data'
      };
      
      AssertionHelpers.assertObjectMatches(obj, {
        user: { name: 'John' },
        settings: { theme: 'dark' }
      });
    });

    it('should fail when object does not match structure', () => {
      const obj = { user: { name: 'John' } };
      expect(() => 
        AssertionHelpers.assertObjectMatches(obj, { user: { name: 'Jane' } })
      ).toThrow(TestError);
    });
  });

  describe('assertMockCalledWith', () => {
    it('should pass when mock was called with expected arguments', () => {
      const mockFn = jest.fn();
      mockFn('arg1', 'arg2');
      
      AssertionHelpers.assertMockCalledWith(mockFn, ['arg1', 'arg2']);
    });

    it('should fail when mock was not called enough times', () => {
      const mockFn = jest.fn();
      
      expect(() => 
        AssertionHelpers.assertMockCalledWith(mockFn, ['arg1'])
      ).toThrow(TestError);
    });

    it('should fail when mock was called with different arguments', () => {
      const mockFn = jest.fn();
      mockFn('wrong', 'args');
      
      expect(() => 
        AssertionHelpers.assertMockCalledWith(mockFn, ['arg1', 'arg2'])
      ).toThrow(TestError);
    });

    it('should validate specific call index', () => {
      const mockFn = jest.fn();
      mockFn('first', 'call');
      mockFn('second', 'call');
      
      AssertionHelpers.assertMockCalledWith(mockFn, ['second', 'call'], 1);
    });
  });

  describe('assertInRange', () => {
    it('should pass when value is within range', () => {
      AssertionHelpers.assertInRange(5, 1, 10);
      AssertionHelpers.assertInRange(1, 1, 10); // boundary
      AssertionHelpers.assertInRange(10, 1, 10); // boundary
    });

    it('should fail when value is outside range', () => {
      expect(() => AssertionHelpers.assertInRange(0, 1, 10)).toThrow(TestError);
      expect(() => AssertionHelpers.assertInRange(11, 1, 10)).toThrow(TestError);
    });

    it('should fail when value is not a number', () => {
      expect(() => AssertionHelpers.assertInRange('5' as any, 1, 10)).toThrow(TestError);
      expect(() => AssertionHelpers.assertInRange(NaN, 1, 10)).toThrow(TestError);
    });
  });

  describe('assertDateInRange', () => {
    it('should pass when date is within range', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-12-31');
      const middle = new Date('2023-06-15');
      
      AssertionHelpers.assertDateInRange(middle, start, end);
    });

    it('should fail when date is outside range', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-12-31');
      const before = new Date('2022-12-31');
      
      expect(() => 
        AssertionHelpers.assertDateInRange(before, start, end)
      ).toThrow(TestError);
    });

    it('should fail when input is not a valid date', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-12-31');
      
      expect(() => 
        AssertionHelpers.assertDateInRange(new Date('invalid'), start, end)
      ).toThrow(TestError);
    });
  });

  describe('assertStringMatches', () => {
    it('should pass when string matches pattern', () => {
      AssertionHelpers.assertStringMatches('hello world', /hello/);
      AssertionHelpers.assertStringMatches('test@example.com', '^[^@]+@[^@]+\\.[^@]+$');
    });

    it('should fail when string does not match pattern', () => {
      expect(() => 
        AssertionHelpers.assertStringMatches('hello world', /goodbye/)
      ).toThrow(TestError);
    });

    it('should fail when input is not a string', () => {
      expect(() => 
        AssertionHelpers.assertStringMatches(123 as any, /\d+/)
      ).toThrow(TestError);
    });
  });

  describe('assertIdempotent', () => {
    it('should pass when operation is idempotent', async () => {
      let counter = 0;
      const operation = () => {
        counter++;
        return { result: 'constant', timestamp: '2023-01-01' };
      };
      
      await AssertionHelpers.assertIdempotent(operation, 3);
      expect(counter).toBe(3);
    });

    it('should fail when operation is not idempotent', async () => {
      let counter = 0;
      const operation = () => ({ timestamp: Date.now(), counter: ++counter });
      
      await expect(
        AssertionHelpers.assertIdempotent(operation, 3)
      ).rejects.toThrow(TestError);
    });

    it('should work with async operations', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { result: 'constant' };
      };
      
      await AssertionHelpers.assertIdempotent(operation, 2);
    });
  });
});