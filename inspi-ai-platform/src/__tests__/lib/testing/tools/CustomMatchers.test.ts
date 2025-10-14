/**
 * Tests for Custom Jest Matchers
 */

import { CustomMatchers } from '../../../../lib/testing/matchers/CustomMatchers';
import { TestDataHelper } from '../../../../lib/testing/utils/TestingUtils';

// Setup custom matchers for testing
expect.extend({
  toBeValidCard: CustomMatchers.toBeValidCard,
  toBeValidUser: CustomMatchers.toBeValidUser,
  toBeValidWork: CustomMatchers.toBeValidWork,
  toHavePerformanceWithin: CustomMatchers.toHavePerformanceWithin,
  toBeValidApiResponse: CustomMatchers.toBeValidApiResponse,
  toBeValidErrorResponse: CustomMatchers.toBeValidErrorResponse,
  toBeValidJWT: CustomMatchers.toBeValidJWT,
  toBeValidEmail: CustomMatchers.toBeValidEmail,
});

describe('CustomMatchers', () => {
  describe('toBeValidCard', () => {
    it('should pass for valid card objects', () => {
      const validCard = TestDataHelper.createValidCard();
      expect(validCard).toBeValidCard();
    });

    it('should fail for invalid card objects', () => {
      const invalidCard = { title: '', content: 123, tags: 'not-array' };
      expect(() => expect(invalidCard).toBeValidCard()).toThrow();
    });

    it('should fail for null or undefined', () => {
      expect(() => expect(null).toBeValidCard()).toThrow();
      expect(() => expect(undefined).toBeValidCard()).toThrow();
    });
  });

  describe('toBeValidUser', () => {
    it('should pass for valid user objects', () => {
      const validUser = TestDataHelper.createValidUser();
      expect(validUser).toBeValidUser();
    });

    it('should fail for invalid user objects', () => {
      const invalidUser = { email: 'invalid-email', name: '' };
      expect(() => expect(invalidUser).toBeValidUser()).toThrow();
    });
  });

  describe('toBeValidWork', () => {
    it('should pass for valid work objects', () => {
      const validWork = TestDataHelper.createValidWork();
      expect(validWork).toBeValidWork();
    });

    it('should fail for invalid work objects', () => {
      const invalidWork = { title: '', description: 123, tags: 'not-array' };
      expect(() => expect(invalidWork).toBeValidWork()).toThrow();
    });
  });

  describe('toHavePerformanceWithin', () => {
    it('should pass when performance is within tolerance', () => {
      expect(100).toHavePerformanceWithin(105, 10); // 5% difference, 10% tolerance
    });

    it('should fail when performance exceeds tolerance', () => {
      expect(() => expect(100).toHavePerformanceWithin(150, 10)).toThrow(); // 50% difference, 10% tolerance
    });
  });

  describe('toBeValidApiResponse', () => {
    it('should pass for valid success response', () => {
      const response = TestDataHelper.createValidApiResponse({ message: 'Success' });
      expect(response).toBeValidApiResponse();
    });

    it('should pass for valid error response', () => {
      const response = TestDataHelper.createValidApiResponse({ message: 'Error' }, false);
      expect(response).toBeValidApiResponse();
    });

    it('should fail for invalid response structure', () => {
      const invalidResponse = { message: 'No success field' };
      expect(() => expect(invalidResponse).toBeValidApiResponse()).toThrow();
    });
  });

  describe('toBeValidErrorResponse', () => {
    it('should pass for valid error response', () => {
      const errorResponse = TestDataHelper.createValidErrorResponse();
      expect(errorResponse).toBeValidErrorResponse();
    });

    it('should fail for success response', () => {
      const successResponse = TestDataHelper.createValidApiResponse({ data: 'success' });
      expect(() => expect(successResponse).toBeValidErrorResponse()).toThrow();
    });
  });

  describe('toBeValidJWT', () => {
    it('should pass for valid JWT format', () => {
      const jwt = TestDataHelper.createValidJWT();
      expect(jwt).toBeValidJWT();
    });

    it('should fail for invalid JWT format', () => {
      expect(() => expect('invalid.jwt').toBeValidJWT()).toThrow();
      expect(() => expect('not-a-jwt').toBeValidJWT()).toThrow();
    });
  });

  describe('toBeValidEmail', () => {
    it('should pass for valid email addresses', () => {
      expect('test@example.com').toBeValidEmail();
      expect('user.name+tag@domain.co.uk').toBeValidEmail();
    });

    it('should fail for invalid email addresses', () => {
      expect(() => expect('invalid-email').toBeValidEmail()).toThrow();
      expect(() => expect('@domain.com').toBeValidEmail()).toThrow();
      expect(() => expect('user@').toBeValidEmail()).toThrow();
    });
  });
});
