/**
 * Custom Jest Matchers for Inspi.AI Platform Testing
 *
 * This module provides custom Jest matchers for domain-specific assertions
 * that improve test readability and provide better error messages.
 */

import { diff } from 'jest-diff';

export interface CustomMatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Custom matchers for the Inspi.AI platform
 */
export class CustomMatchers {
  /**
   * Validates if an object is a valid card structure
   */
  static toBeValidCard(received: any): CustomMatcherResult {
    const pass = CustomMatchers.isValidCard(received);

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${JSON.stringify(received)} not to be a valid card`;
        } else {
          const issues = CustomMatchers.getCardValidationIssues(received);
          return `Expected ${JSON.stringify(received)} to be a valid card.\nIssues found:\n${issues.join('\n')}`;
        }
      },
    };
  }

  /**
   * Validates if an object is a valid user structure
   */
  static toBeValidUser(received: any): CustomMatcherResult {
    const pass = CustomMatchers.isValidUser(received);

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${JSON.stringify(received)} not to be a valid user`;
        } else {
          const issues = CustomMatchers.getUserValidationIssues(received);
          return `Expected ${JSON.stringify(received)} to be a valid user.\nIssues found:\n${issues.join('\n')}`;
        }
      },
    };
  }

  /**
   * Validates if an object is a valid work structure
   */
  static toBeValidWork(received: any): CustomMatcherResult {
    const pass = CustomMatchers.isValidWork(received);

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${JSON.stringify(received)} not to be a valid work`;
        } else {
          const issues = CustomMatchers.getWorkValidationIssues(received);
          return `Expected ${JSON.stringify(received)} to be a valid work.\nIssues found:\n${issues.join('\n')}`;
        }
      },
    };
  }

  /**
   * Validates performance metrics within tolerance
   */
  static toHavePerformanceWithin(
    received: number,
    expected: number,
    tolerance: number = 0.1,
  ): CustomMatcherResult {
    const difference = Math.abs(received - expected);
    const pass = difference <= tolerance;

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${received} not to be within ${tolerance} of ${expected}`;
        } else {
          return `Expected ${received} to be within ${tolerance} of ${expected}, but difference was ${difference}`;
        }
      },
    };
  }

  /**
   * Validates API response structure
   */
  static toBeValidApiResponse(received: any): CustomMatcherResult {
    const pass = CustomMatchers.isValidApiResponse(received);

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${JSON.stringify(received)} not to be a valid API response`;
        } else {
          const issues = CustomMatchers.getApiResponseValidationIssues(received);
          return `Expected ${JSON.stringify(received)} to be a valid API response.\nIssues found:\n${issues.join('\n')}`;
        }
      },
    };
  }

  /**
   * Validates error response structure
   */
  static toBeValidErrorResponse(received: any): CustomMatcherResult {
    const pass = CustomMatchers.isValidErrorResponse(received);

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${JSON.stringify(received)} not to be a valid error response`;
        } else {
          const issues = CustomMatchers.getErrorResponseValidationIssues(received);
          return `Expected ${JSON.stringify(received)} to be a valid error response.\nIssues found:\n${issues.join('\n')}`;
        }
      },
    };
  }

  /**
   * Validates JWT token structure
   */
  static toBeValidJWT(received: any): CustomMatcherResult {
    const pass = CustomMatchers.isValidJWT(received);

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${received} not to be a valid JWT token`;
        } else {
          return `Expected ${received} to be a valid JWT token (format: header.payload.signature)`;
        }
      },
    };
  }

  /**
   * Validates email format
   */
  static toBeValidEmail(received: any): CustomMatcherResult {
    const pass = CustomMatchers.isValidEmail(received);

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${received} not to be a valid email`;
        } else {
          return `Expected ${received} to be a valid email address`;
        }
      },
    };
  }

  // Private validation methods
  private static isValidCard(card: any): boolean {
    return (
      card &&
      typeof card === 'object' &&
      typeof card.title === 'string' &&
      card.title.length > 0 &&
      typeof card.content === 'string' &&
      card.content.length > 0 &&
      Array.isArray(card.tags) &&
      (card.createdAt === undefined || card.createdAt instanceof Date || typeof card.createdAt === 'string') &&
      (card.updatedAt === undefined || card.updatedAt instanceof Date || typeof card.updatedAt === 'string')
    );
  }

  private static getCardValidationIssues(card: any): string[] {
    const issues: string[] = [];

    if (!card || typeof card !== 'object') {
      issues.push('- Must be an object');
      return issues;
    }

    if (typeof card.title !== 'string' || card.title.length === 0) {
      issues.push('- title must be a non-empty string');
    }

    if (typeof card.content !== 'string' || card.content.length === 0) {
      issues.push('- content must be a non-empty string');
    }

    if (!Array.isArray(card.tags)) {
      issues.push('- tags must be an array');
    }

    return issues;
  }

  private static isValidUser(user: any): boolean {
    return (
      user &&
      typeof user === 'object' &&
      typeof user.email === 'string' &&
      CustomMatchers.isValidEmail(user.email) &&
      typeof user.name === 'string' &&
      user.name.length > 0 &&
      ((user.id || (user as any)._id) === undefined || typeof (user.id || (user as any)._id) === 'string') &&
      (user.createdAt === undefined || user.createdAt instanceof Date || typeof user.createdAt === 'string')
    );
  }

  private static getUserValidationIssues(user: any): string[] {
    const issues: string[] = [];

    if (!user || typeof user !== 'object') {
      issues.push('- Must be an object');
      return issues;
    }

    if (typeof user.email !== 'string' || !CustomMatchers.isValidEmail(user.email)) {
      issues.push('- email must be a valid email address');
    }

    if (typeof user.name !== 'string' || user.name.length === 0) {
      issues.push('- name must be a non-empty string');
    }

    return issues;
  }

  private static isValidWork(work: any): boolean {
    return (
      work &&
      typeof work === 'object' &&
      typeof work.title === 'string' &&
      work.title.length > 0 &&
      typeof work.description === 'string' &&
      (work.userId === undefined || typeof work.userId === 'string') &&
      (work.status === undefined || ['draft', 'published', 'archived'].includes(work.status)) &&
      Array.isArray(work.tags)
    );
  }

  private static getWorkValidationIssues(work: any): string[] {
    const issues: string[] = [];

    if (!work || typeof work !== 'object') {
      issues.push('- Must be an object');
      return issues;
    }

    if (typeof work.title !== 'string' || work.title.length === 0) {
      issues.push('- title must be a non-empty string');
    }

    if (typeof work.description !== 'string') {
      issues.push('- description must be a string');
    }

    if (!Array.isArray(work.tags)) {
      issues.push('- tags must be an array');
    }

    if (work.status !== undefined && !['draft', 'published', 'archived'].includes(work.status)) {
      issues.push('- status must be one of: draft, published, archived');
    }

    return issues;
  }

  private static isValidApiResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      (response.success === true || response.success === false) &&
      (response.data !== undefined || response.error !== undefined)
    );
  }

  private static getApiResponseValidationIssues(response: any): string[] {
    const issues: string[] = [];

    if (!response || typeof response !== 'object') {
      issues.push('- Must be an object');
      return issues;
    }

    if (response.success !== true && response.success !== false) {
      issues.push('- success must be a boolean');
    }

    if (response.data === undefined && response.error === undefined) {
      issues.push('- must have either data or error property');
    }

    return issues;
  }

  private static isValidErrorResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      response.success === false &&
      response.error &&
      typeof response.error === 'object' &&
      typeof response.error.message === 'string' &&
      typeof response.error.code === 'string'
    );
  }

  private static getErrorResponseValidationIssues(response: any): string[] {
    const issues: string[] = [];

    if (!response || typeof response !== 'object') {
      issues.push('- Must be an object');
      return issues;
    }

    if (response.success !== false) {
      issues.push('- success must be false for error responses');
    }

    if (!response.error || typeof response.error !== 'object') {
      issues.push('- error must be an object');
    } else {
      if (typeof response.error.message !== 'string') {
        issues.push('- error.message must be a string');
      }
      if (typeof response.error.code !== 'string') {
        issues.push('- error.code must be a string');
      }
    }

    return issues;
  }

  private static isValidJWT(token: any): boolean {
    if (typeof token !== 'string') return false;

    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  private static isValidEmail(email: any): boolean {
    if (typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Type declarations for Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCard(): R;
      toBeValidUser(): R;
      toBeValidWork(): R;
      toHavePerformanceWithin(expected: number, tolerance?: number): R;
      toBeValidApiResponse(): R;
      toBeValidErrorResponse(): R;
      toBeValidJWT(): R;
      toBeValidEmail(): R;
    }
  }
}
