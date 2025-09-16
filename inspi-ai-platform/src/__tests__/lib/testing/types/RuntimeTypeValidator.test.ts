/**
 * Runtime Type Validator Tests
 */

import {
  RuntimeTypeValidator,
  createRuntimeTypeValidator,
  ValidationRule,
  TypeSchema
} from '../../../../lib/testing/types/RuntimeTypeValidator';

describe('RuntimeTypeValidator', () => {
  let validator: RuntimeTypeValidator;

  beforeEach(() => {
    validator = createRuntimeTypeValidator();
  });

  describe('Schema Registration', () => {
    it('should register type schemas', () => {
      const schema: TypeSchema = {
        name: 'User',
        rules: [
          { field: 'id', type: 'number', required: true },
          { field: 'name', type: 'string', required: true },
          { field: 'email', type: 'email', required: false }
        ]
      };

      expect(() => validator.registerSchema(schema)).not.toThrow();
    });

    it('should create schema from interface definition', () => {
      const interfaceDefinition = `
        interface User {
          id: number;
          name: string;
          email?: string;
        }
      `;

      const schema = validator.createSchemaFromInterface('User', interfaceDefinition);

      expect(schema.name).toBe('User');
      expect(schema.rules).toHaveLength(3);
      expect(schema.rules.find(r => r.field === 'id')?.required).toBe(true);
      expect(schema.rules.find(r => r.field === 'email')?.required).toBe(false);
    });
  });

  describe('Basic Type Validation', () => {
    beforeEach(() => {
      const userSchema: TypeSchema = {
        name: 'User',
        rules: [
          { field: 'id', type: 'number', required: true },
          { field: 'name', type: 'string', required: true },
          { field: 'email', type: 'email', required: false },
          { field: 'age', type: 'number', required: false }
        ]
      };
      validator.registerSchema(userSchema);
    });

    it('should validate valid objects', () => {
      const validUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const result = validator.validate('User', validUser);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidUser = {
        name: 'John Doe'
        // Missing required 'id' field
      };

      const result = validator.validate('User', invalidUser);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('id');
      expect(result.errors[0].message).toContain('required');
    });

    it('should detect incorrect types', () => {
      const invalidUser = {
        id: 'not-a-number',
        name: 'John Doe'
      };

      const result = validator.validate('User', invalidUser);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('id');
      expect(result.errors[0].expected).toBe('number');
      expect(result.errors[0].actual).toBe('string');
    });

    it('should handle optional fields correctly', () => {
      const userWithoutOptional = {
        id: 1,
        name: 'John Doe'
        // Optional fields omitted
      };

      const result = validator.validate('User', userWithoutOptional);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate email format', () => {
      const userWithInvalidEmail = {
        id: 1,
        name: 'John Doe',
        email: 'invalid-email'
      };

      const result = validator.validate('User', userWithInvalidEmail);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email')).toBe(true);
    });
  });

  describe('Advanced Type Validation', () => {
    beforeEach(() => {
      const productSchema: TypeSchema = {
        name: 'Product',
        rules: [
          { field: 'id', type: 'uuid', required: true },
          { field: 'name', type: 'string', required: true },
          { field: 'price', type: 'number', required: true },
          { field: 'tags', type: 'string[]', required: true },
          { field: 'status', type: 'string', required: true, validator: (v) => ['active', 'inactive'].includes(v) },
          { field: 'url', type: 'url', required: false },
          { field: 'createdAt', type: 'date', required: true }
        ]
      };
      validator.registerSchema(productSchema);
    });

    it('should validate UUID format', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        tags: ['electronics', 'gadget'],
        status: 'active',
        createdAt: new Date()
      };

      const result = validator.validate('Product', validProduct);
      expect(result.isValid).toBe(true);

      const invalidProduct = {
        ...validProduct,
        id: 'invalid-uuid'
      };

      const invalidResult = validator.validate('Product', invalidProduct);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate array types', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        tags: ['electronics', 'gadget'],
        status: 'active',
        createdAt: new Date()
      };

      const result = validator.validate('Product', validProduct);
      expect(result.isValid).toBe(true);

      const invalidProduct = {
        ...validProduct,
        tags: 'not-an-array'
      };

      const invalidResult = validator.validate('Product', invalidProduct);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate custom validators', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        tags: ['electronics'],
        status: 'active',
        createdAt: new Date()
      };

      const result = validator.validate('Product', validProduct);
      expect(result.isValid).toBe(true);

      const invalidProduct = {
        ...validProduct,
        status: 'invalid-status'
      };

      const invalidResult = validator.validate('Product', invalidProduct);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate URL format', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        tags: ['electronics'],
        status: 'active',
        url: 'https://example.com/product',
        createdAt: new Date()
      };

      const result = validator.validate('Product', validProduct);
      expect(result.isValid).toBe(true);

      const invalidProduct = {
        ...validProduct,
        url: 'invalid-url'
      };

      const invalidResult = validator.validate('Product', invalidProduct);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate date types', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        tags: ['electronics'],
        status: 'active',
        createdAt: new Date()
      };

      const result = validator.validate('Product', validProduct);
      expect(result.isValid).toBe(true);

      // Test with ISO string
      const productWithISODate = {
        ...validProduct,
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      const isoResult = validator.validate('Product', productWithISODate);
      expect(isoResult.isValid).toBe(true);

      // Test with invalid date
      const invalidProduct = {
        ...validProduct,
        createdAt: 'invalid-date'
      };

      const invalidResult = validator.validate('Product', invalidProduct);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Nested Object Validation', () => {
    beforeEach(() => {
      const addressSchema: TypeSchema = {
        name: 'Address',
        rules: [
          { field: 'street', type: 'string', required: true },
          { field: 'city', type: 'string', required: true },
          { field: 'zipCode', type: 'string', required: true }
        ]
      };

      const userWithAddressSchema: TypeSchema = {
        name: 'UserWithAddress',
        rules: [
          { field: 'id', type: 'number', required: true },
          { field: 'name', type: 'string', required: true },
          { field: 'address', type: 'object', required: true }
        ],
        nested: {
          address: addressSchema
        }
      };

      validator.registerSchema(addressSchema);
      validator.registerSchema(userWithAddressSchema);
    });

    it('should validate nested objects', () => {
      const validUser = {
        id: 1,
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zipCode: '12345'
        }
      };

      const result = validator.validate('UserWithAddress', validUser);
      expect(result.isValid).toBe(true);
    });

    it('should detect errors in nested objects', () => {
      const invalidUser = {
        id: 1,
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown'
          // Missing zipCode
        }
      };

      const result = validator.validate('UserWithAddress', invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('address.zipCode'))).toBe(true);
    });
  });

  describe('Strict Mode Validation', () => {
    beforeEach(() => {
      const strictSchema: TypeSchema = {
        name: 'StrictUser',
        rules: [
          { field: 'id', type: 'number', required: true },
          { field: 'name', type: 'string', required: true }
        ]
      };
      validator.registerSchema(strictSchema);
    });

    it('should allow extra fields in non-strict mode', () => {
      const userWithExtra = {
        id: 1,
        name: 'John Doe',
        extraField: 'extra value'
      };

      const result = validator.validate('StrictUser', userWithExtra, { strict: false });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about extra fields in strict mode', () => {
      const userWithExtra = {
        id: 1,
        name: 'John Doe',
        extraField: 'extra value'
      };

      const result = validator.validate('StrictUser', userWithExtra, { strict: true });
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'extraField')).toBe(true);
    });
  });

  describe('Union Type Validation', () => {
    beforeEach(() => {
      const unionSchema: TypeSchema = {
        name: 'UnionType',
        rules: [
          { field: 'id', type: 'string | number', required: true },
          { field: 'value', type: 'string | boolean', required: true }
        ]
      };
      validator.registerSchema(unionSchema);
    });

    it('should validate union types correctly', () => {
      const validObjects = [
        { id: 'string-id', value: 'string-value' },
        { id: 123, value: true },
        { id: 'string-id', value: false },
        { id: 456, value: 'another-string' }
      ];

      for (const obj of validObjects) {
        const result = validator.validate('UnionType', obj);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid union types', () => {
      const invalidObject = {
        id: true, // boolean not allowed in string | number
        value: 'valid-string'
      };

      const result = validator.validate('UnionType', invalidObject);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      const simpleSchema: TypeSchema = {
        name: 'Simple',
        rules: [
          { field: 'id', type: 'number', required: true }
        ]
      };
      validator.registerSchema(simpleSchema);
    });

    it('should cache validation results when enabled', () => {
      const testObject = { id: 1 };

      // First validation
      const result1 = validator.validate('Simple', testObject, { cache: true });
      expect(result1.isValid).toBe(true);

      // Second validation should use cache
      const result2 = validator.validate('Simple', testObject, { cache: true });
      expect(result2.isValid).toBe(true);

      const stats = validator.getStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    it('should clear cache when requested', () => {
      const testObject = { id: 1 };
      validator.validate('Simple', testObject, { cache: true });

      expect(validator.getStats().cacheSize).toBeGreaterThan(0);

      validator.clearCache();
      expect(validator.getStats().cacheSize).toBe(0);
    });
  });

  describe('Project Type Validation', () => {
    it('should validate project-specific types', () => {
      const result = validator.validateProjectTypes();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');

      // Should have registered project schemas
      const stats = validator.getStats();
      expect(stats.registeredSchemas).toBeGreaterThan(0);
    });

    it('should validate User type from project', () => {
      validator.validateProjectTypes(); // This registers project schemas

      const validUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        subscription: {
          plan: 'free',
          features: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate('User', validUser);
      expect(result.isValid).toBe(true);
    });

    it('should validate Work type from project', () => {
      validator.validateProjectTypes(); // This registers project schemas

      const validWork = {
        _id: '507f1f77bcf86cd799439012',
        title: 'Test Work',
        knowledgePoint: 'Test Knowledge',
        subject: 'Math',
        gradeLevel: 'Grade 5',
        cards: [],
        authorId: '507f1f77bcf86cd799439011',
        isPublic: true,
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate('Work', validWork);
      expect(result.isValid).toBe(true);
    });

    it('should validate TeachingCard type from project', () => {
      validator.validateProjectTypes(); // This registers project schemas

      const validCard = {
        id: 'card-1',
        type: 'visualization',
        title: 'Test Card',
        content: 'Test content'
      };

      const result = validator.validate('TeachingCard', validCard);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown schemas gracefully', () => {
      expect(() => {
        validator.validate('UnknownSchema', {});
      }).toThrow('Schema not found for type: UnknownSchema');
    });

    it('should handle null and undefined values', () => {
      const schema: TypeSchema = {
        name: 'TestSchema',
        rules: [
          { field: 'id', type: 'number', required: true }
        ]
      };
      validator.registerSchema(schema);

      const nullResult = validator.validate('TestSchema', null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors[0].message).toContain('null or undefined');

      const undefinedResult = validator.validate('TestSchema', undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors[0].message).toContain('null or undefined');
    });
  });

  describe('Statistics', () => {
    it('should provide validation statistics', () => {
      const stats = validator.getStats();

      expect(stats).toHaveProperty('registeredSchemas');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('cacheHitRate');

      expect(typeof stats.registeredSchemas).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.cacheHitRate).toBe('number');
    });
  });
});