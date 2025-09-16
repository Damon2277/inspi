/**
 * Test Assertion Helper Functions
 * 
 * This module provides reusable assertion helper functions that simplify
 * common test patterns and improve test readability.
 */

import { TestError, TestErrorType } from '../errors/TestError';

export interface AssertionOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}

export interface AsyncAssertionOptions extends AssertionOptions {
  retries?: number;
}

/**
 * Collection of assertion helper functions for testing
 */
export class AssertionHelpers {
  /**
   * Asserts that a function throws an error with specific properties
   */
  static async assertThrows<T extends Error>(
    fn: () => Promise<any> | any,
    expectedError?: {
      type?: new (...args: any[]) => T;
      message?: string | RegExp;
      code?: string;
    }
  ): Promise<T> {
    let thrownError: Error | null = null;
    
    try {
      const result = fn();
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      thrownError = error as Error;
    }
    
    if (!thrownError) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected function to throw an error, but it did not'
      );
    }
    
    if (expectedError?.type && !(thrownError instanceof expectedError.type)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Expected error to be instance of ${expectedError.type.name}, but got ${thrownError.constructor.name}`
      );
    }
    
    if (expectedError?.message) {
      const messageMatches = typeof expectedError.message === 'string'
        ? thrownError.message === expectedError.message
        : expectedError.message.test(thrownError.message);
        
      if (!messageMatches) {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          `Expected error message to match ${expectedError.message}, but got "${thrownError.message}"`
        );
      }
    }
    
    if (expectedError?.code && 'code' in thrownError) {
      if ((thrownError as any).code !== expectedError.code) {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          `Expected error code to be "${expectedError.code}", but got "${(thrownError as any).code}"`
        );
      }
    }
    
    return thrownError as T;
  }

  /**
   * Asserts that a condition becomes true within a timeout period
   */
  static async assertEventually(
    condition: () => boolean | Promise<boolean>,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100, message = 'Condition did not become true within timeout' } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        // Continue trying
      }
      
      await AssertionHelpers.sleep(interval);
    }
    
    throw new TestError(TestErrorType.TIMEOUT, message);
  }

  /**
   * Asserts that an async operation completes within a timeout
   */
  static async assertCompletesWithin<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    message?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TestError(
          TestErrorType.TIMEOUT,
          message || `Operation did not complete within ${timeoutMs}ms`
        ));
      }, timeoutMs);
    });
    
    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Asserts that an array contains elements matching a predicate
   */
  static assertArrayContains<T>(
    array: T[],
    predicate: (item: T) => boolean,
    message?: string
  ): void {
    if (!Array.isArray(array)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected first argument to be an array'
      );
    }
    
    const found = array.some(predicate);
    if (!found) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || 'Array does not contain any elements matching the predicate'
      );
    }
  }

  /**
   * Asserts that all elements in an array match a predicate
   */
  static assertArrayAll<T>(
    array: T[],
    predicate: (item: T) => boolean,
    message?: string
  ): void {
    if (!Array.isArray(array)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected first argument to be an array'
      );
    }
    
    const allMatch = array.every(predicate);
    if (!allMatch) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || 'Not all elements in the array match the predicate'
      );
    }
  }

  /**
   * Asserts that an object has specific properties with expected values
   */
  static assertObjectHasProperties(
    obj: any,
    expectedProperties: Record<string, any>,
    message?: string
  ): void {
    if (!obj || typeof obj !== 'object') {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected first argument to be an object'
      );
    }
    
    for (const [key, expectedValue] of Object.entries(expectedProperties)) {
      if (!(key in obj)) {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          message || `Object is missing property "${key}"`
        );
      }
      
      if (obj[key] !== expectedValue) {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          message || `Property "${key}" expected to be ${expectedValue}, but got ${obj[key]}`
        );
      }
    }
  }

  /**
   * Asserts that an object matches a partial structure
   */
  static assertObjectMatches(
    obj: any,
    expected: any,
    message?: string
  ): void {
    if (!AssertionHelpers.deepPartialMatch(obj, expected)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || `Object does not match expected structure:\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(obj, null, 2)}`
      );
    }
  }

  /**
   * Asserts that a mock function was called with specific arguments
   */
  static assertMockCalledWith(
    mockFn: jest.MockedFunction<any>,
    expectedArgs: any[],
    callIndex: number = 0,
    message?: string
  ): void {
    if (!jest.isMockFunction(mockFn)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected first argument to be a mock function'
      );
    }
    
    const calls = mockFn.mock.calls;
    if (calls.length <= callIndex) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || `Mock function was not called ${callIndex + 1} times (actual: ${calls.length})`
      );
    }
    
    const actualArgs = calls[callIndex];
    if (!AssertionHelpers.deepEqual(actualArgs, expectedArgs)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || `Mock function call ${callIndex + 1} arguments do not match:\nExpected: ${JSON.stringify(expectedArgs)}\nActual: ${JSON.stringify(actualArgs)}`
      );
    }
  }

  /**
   * Asserts that a value is within a numeric range
   */
  static assertInRange(
    value: number,
    min: number,
    max: number,
    message?: string
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected value to be a number'
      );
    }
    
    if (value < min || value > max) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || `Expected ${value} to be between ${min} and ${max}`
      );
    }
  }

  /**
   * Asserts that a date is within a time range
   */
  static assertDateInRange(
    date: Date,
    startDate: Date,
    endDate: Date,
    message?: string
  ): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected first argument to be a valid Date'
      );
    }
    
    if (date < startDate || date > endDate) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || `Expected ${date.toISOString()} to be between ${startDate.toISOString()} and ${endDate.toISOString()}`
      );
    }
  }

  /**
   * Asserts that a string matches a pattern
   */
  static assertStringMatches(
    str: string,
    pattern: string | RegExp,
    message?: string
  ): void {
    if (typeof str !== 'string') {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected first argument to be a string'
      );
    }
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (!regex.test(str)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || `String "${str}" does not match pattern ${pattern}`
      );
    }
  }

  /**
   * Asserts that an operation is idempotent
   */
  static async assertIdempotent<T>(
    operation: () => Promise<T> | T,
    iterations: number = 3,
    message?: string
  ): Promise<void> {
    const results: T[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await operation();
      results.push(result);
    }
    
    const firstResult = results[0];
    const allSame = results.every(result => AssertionHelpers.deepEqual(result, firstResult));
    
    if (!allSame) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        message || `Operation is not idempotent. Results varied across ${iterations} iterations`
      );
    }
  }

  /**
   * Asserts that an email result has expected properties
   */
  static assertEmailResult(result: any, expectations: {
    success?: boolean;
    hasMessageId?: boolean;
    hasError?: boolean;
    errorContains?: string;
  }): void {
    if (!result || typeof result !== 'object') {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected email result to be an object'
      );
    }
    
    if (!('success' in result)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Email result must have a success property'
      );
    }
    
    if (expectations.success !== undefined && result.success !== expectations.success) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Expected success to be ${expectations.success}, but got ${result.success}`
      );
    }
    
    if (expectations.hasMessageId && (!result.messageId || typeof result.messageId !== 'string')) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected email result to have a messageId'
      );
    }
    
    if (expectations.hasError && (!result.error || typeof result.error !== 'string')) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected email result to have an error'
      );
    }
    
    if (expectations.errorContains && (!result.error || !result.error.includes(expectations.errorContains))) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Expected error to contain "${expectations.errorContains}", but got "${result.error}"`
      );
    }
  }

  /**
   * Asserts that an email content has expected properties
   */
  static assertEmailContent(email: any, expectations: {
    hasHtml?: boolean;
    hasText?: boolean;
    containsUserName?: string;
    isWellFormed?: boolean;
  }): void {
    if (!email || typeof email !== 'object') {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected email to be an object'
      );
    }
    
    if (expectations.hasHtml && (!email.html || typeof email.html !== 'string')) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected email to have HTML content'
      );
    }
    
    if (expectations.hasText && (!email.text || typeof email.text !== 'string')) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected email to have text content'
      );
    }
    
    if (expectations.containsUserName) {
      const htmlContains = email.html && email.html.includes(expectations.containsUserName);
      const textContains = email.text && email.text.includes(expectations.containsUserName);
      
      if (!htmlContains && !textContains) {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          `Expected email content to contain user name "${expectations.containsUserName}"`
        );
      }
    }
    
    if (expectations.isWellFormed) {
      if (!email.to || (typeof email.to !== 'string' && !Array.isArray(email.to))) {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          'Well-formed email must have a "to" field'
        );
      }
      
      if (!email.subject || typeof email.subject !== 'string') {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          'Well-formed email must have a subject'
        );
      }
    }
  }

  /**
   * Asserts that HTML content is valid
   */
  static assertValidHtml(html: string): void {
    if (typeof html !== 'string') {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected HTML to be a string'
      );
    }
    
    const requiredTags = ['<html', '</html>', '<head', '</head>', '<body', '</body>'];
    const missingTags = requiredTags.filter(tag => !html.includes(tag));
    
    if (missingTags.length > 0) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `HTML is missing required tags: ${missingTags.join(', ')}`
      );
    }
  }

  /**
   * Asserts that an email address is valid
   */
  static assertValidEmail(email: string): void {
    if (typeof email !== 'string') {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Expected email to be a string'
      );
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Invalid email address: ${email}`
      );
    }
  }

  // Private helper methods
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => AssertionHelpers.deepEqual(item, b[index]));
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && AssertionHelpers.deepEqual(a[key], b[key])
    );
  }

  private static deepPartialMatch(obj: any, expected: any): boolean {
    if (expected === obj) return true;
    
    if (expected == null || obj == null) return expected === obj;
    
    if (typeof expected !== 'object') return expected === obj;
    
    if (Array.isArray(expected)) {
      if (!Array.isArray(obj)) return false;
      if (expected.length > obj.length) return false;
      
      return expected.every((item, index) => 
        AssertionHelpers.deepPartialMatch(obj[index], item)
      );
    }
    
    return Object.keys(expected).every(key => 
      key in obj && AssertionHelpers.deepPartialMatch(obj[key], expected[key])
    );
  }
}