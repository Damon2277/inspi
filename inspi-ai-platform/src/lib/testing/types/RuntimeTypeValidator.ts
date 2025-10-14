/**
 * Runtime Type Validator
 *
 * Provides runtime validation of TypeScript interfaces and types
 * to ensure type safety at runtime and catch type inconsistencies.
 */

export interface ValidationRule {
  field: string;
  type: string;
  required: boolean;
  validator?: (value: any) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  expected: string;
  actual: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface TypeSchema {
  name: string;
  rules: ValidationRule[];
  nested?: Record<string, TypeSchema>;
}

export class RuntimeTypeValidator {
  private schemas: Map<string, TypeSchema> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();

  /**
   * Register a type schema for validation
   */
  registerSchema(schema: TypeSchema): void {
    this.schemas.set(schema.name, schema);
  }

  /**
   * Validate an object against a registered schema
   */
  validate(typeName: string, value: any, options: { strict?: boolean; cache?: boolean } = {}): ValidationResult {
    const cacheKey = options.cache ? `${typeName}:${JSON.stringify(value)}` : null;

    if (cacheKey && this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const schema = this.schemas.get(typeName);
    if (!schema) {
      throw new Error(`Schema not found for type: ${typeName}`);
    }

    const result = this.validateAgainstSchema(schema, value, options.strict || false);

    if (cacheKey) {
      this.validationCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Validate against schema
   */
  private validateAgainstSchema(schema: TypeSchema, value: any, strict: boolean): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if value is null or undefined
    if (value === null || value === undefined) {
      errors.push({
        field: 'root',
        message: 'Value cannot be null or undefined',
        expected: schema.name,
        actual: String(value),
      });
      return { isValid: false, errors, warnings };
    }

    // Validate each rule
    for (const rule of schema.rules) {
      const fieldValue = this.getNestedValue(value, rule.field);
      const validationResult = this.validateField(rule, fieldValue, strict);

      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
    }

    // Check for extra fields in strict mode
    if (strict) {
      const allowedFields = new Set(schema.rules.map(r => r.field.split('.')[0]));
      const actualFields = Object.keys(value);

      for (const field of actualFields) {
        if (!allowedFields.has(field)) {
          warnings.push({
            field,
            message: 'Unexpected field in strict mode',
            suggestion: `Remove field '${field}' or update schema`,
          });
        }
      }
    }

    // Validate nested objects
    if (schema.nested) {
      for (const [field, nestedSchema] of Object.entries(schema.nested)) {
        const nestedValue = this.getNestedValue(value, field);
        if (nestedValue !== undefined) {
          const nestedResult = this.validateAgainstSchema(nestedSchema, nestedValue, strict);

          // Prefix field names with parent field
          errors.push(...nestedResult.errors.map(e => ({
            ...e,
            field: `${field}.${e.field}`,
          })));
          warnings.push(...nestedResult.warnings.map(w => ({
            ...w,
            field: `${field}.${w.field}`,
          })));
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual field
   */
  private validateField(rule: ValidationRule, value: any, strict: boolean): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    if (rule.required && (value === undefined || value === null)) {
      errors.push({
        field: rule.field,
        message: rule.message || `Field '${rule.field}' is required`,
        expected: rule.type,
        actual: String(value),
      });
      return { isValid: false, errors, warnings };
    }

    // Skip validation if field is optional and undefined
    if (!rule.required && value === undefined) {
      return { isValid: true, errors, warnings };
    }

    // Type validation
    const typeValid = this.validateType(value, rule.type);
    if (!typeValid) {
      errors.push({
        field: rule.field,
        message: rule.message || `Field '${rule.field}' must be of type '${rule.type}'`,
        expected: rule.type,
        actual: typeof value,
      });
    }

    // Custom validator
    if (rule.validator && !rule.validator(value)) {
      errors.push({
        field: rule.field,
        message: rule.message || `Field '${rule.field}' failed custom validation`,
        expected: 'valid value',
        actual: String(value),
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate type
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'uuid':
        return typeof value === 'string' &&
               /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      case 'objectid':
        return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
      default:
        // Handle union types like 'string | number'
        if (expectedType.includes('|')) {
          const types = expectedType.split('|').map(t => t.trim());
          return types.some(type => this.validateType(value, type));
        }
        // Handle array types like 'string[]'
        if (expectedType.endsWith('[]')) {
          const elementType = expectedType.slice(0, -2);
          return Array.isArray(value) && value.every(item => this.validateType(item, elementType));
        }
        // Default to typeof check
        return typeof value === expectedType;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Create schema from TypeScript interface (simplified)
   */
  createSchemaFromInterface(interfaceName: string, interfaceDefinition: string): TypeSchema {
    // This is a simplified implementation
    // In a real implementation, you would parse the TypeScript AST
    const rules: ValidationRule[] = [];

    // Extract field definitions using regex (simplified)
    const fieldRegex = /(\w+)(\?)?:\s*([^;,\n]+)/g;
    let match;

    while ((match = fieldRegex.exec(interfaceDefinition)) !== null) {
      const [, fieldName, optional, fieldType] = match;
      rules.push({
        field: fieldName,
        type: fieldType.trim(),
        required: !optional,
      });
    }

    return {
      name: interfaceName,
      rules,
    };
  }

  /**
   * Validate project types
   */
  validateProjectTypes(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Register common project schemas
    this.registerProjectSchemas();

    // Test data samples
    const testCases = this.getProjectTestCases();

    for (const testCase of testCases) {
      try {
        const result = this.validate(testCase.type, testCase.value, { strict: true });

        if (!result.isValid) {
          errors.push(...result.errors.map(e => ({
            ...e,
            field: `${testCase.type}.${e.field}`,
          })));
        }

        warnings.push(...result.warnings.map(w => ({
          ...w,
          field: `${testCase.type}.${w.field}`,
        })));
      } catch (error) {
        errors.push({
          field: testCase.type,
          message: `Failed to validate type: ${error instanceof Error ? error.message : String(error)}`,
          expected: 'valid schema',
          actual: 'error',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Register project-specific schemas
   */
  private registerProjectSchemas(): void {
    // User schema
    this.registerSchema({
      name: 'User',
      rules: [
        { field: '_id', type: 'objectid', required: true },
        { field: 'email', type: 'email', required: true },
        { field: 'name', type: 'string', required: false },
        { field: 'avatar', type: 'url', required: false },
        { field: 'subscription', type: 'object', required: true },
        { field: 'createdAt', type: 'date', required: true },
        { field: 'updatedAt', type: 'date', required: true },
      ],
      nested: {
        subscription: {
          name: 'SubscriptionInfo',
          rules: [
            { field: 'plan', type: 'string', required: true, validator: (v) => ['free', 'pro', 'super'].includes(v) },
            { field: 'expiresAt', type: 'date', required: false },
            { field: 'features', type: 'object', required: true },
          ],
        },
      },
    });

    // Work schema
    this.registerSchema({
      name: 'Work',
      rules: [
        { field: '_id', type: 'objectid', required: true },
        { field: 'title', type: 'string', required: true },
        { field: 'description', type: 'string', required: false },
        { field: 'knowledgePoint', type: 'string', required: true },
        { field: 'subject', type: 'string', required: true },
        { field: 'gradeLevel', type: 'string', required: true },
        { field: 'cards', type: 'array', required: true },
        { field: 'authorId', type: 'objectid', required: true },
        { field: 'isPublic', type: 'boolean', required: true },
        { field: 'tags', type: 'string[]', required: true },
        { field: 'createdAt', type: 'date', required: true },
        { field: 'updatedAt', type: 'date', required: true },
      ],
    });

    // TeachingCard schema
    this.registerSchema({
      name: 'TeachingCard',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'type', type: 'string', required: true, validator: (v) => ['visualization', 'analogy', 'thinking', 'interaction'].includes(v) },
        { field: 'title', type: 'string', required: true },
        { field: 'content', type: 'string', required: true },
        { field: 'metadata', type: 'object', required: false },
      ],
    });

    // KnowledgeGraph schema
    this.registerSchema({
      name: 'KnowledgeGraph',
      rules: [
        { field: '_id', type: 'objectid', required: true },
        { field: 'userId', type: 'objectid', required: true },
        { field: 'nodes', type: 'array', required: true },
        { field: 'edges', type: 'array', required: true },
        { field: 'metadata', type: 'object', required: false },
        { field: 'createdAt', type: 'date', required: true },
        { field: 'updatedAt', type: 'date', required: true },
      ],
    });
  }

  /**
   * Get test cases for project types
   */
  private getProjectTestCases(): Array<{ type: string; value: any }> {
    return [
      {
        type: 'User',
        value: {
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          name: 'Test User',
          subscription: {
            plan: 'free',
            features: {},
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        type: 'Work',
        value: {
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
          updatedAt: new Date(),
        },
      },
      {
        type: 'TeachingCard',
        value: {
          id: 'card-1',
          type: 'visualization',
          title: 'Test Card',
          content: 'Test content',
        },
      },
    ];
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    registeredSchemas: number;
    cacheSize: number;
    cacheHitRate: number;
  } {
    return {
      registeredSchemas: this.schemas.size,
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // Would need to track hits/misses for real implementation
    };
  }
}

/**
 * Create runtime type validator instance
 */
export function createRuntimeTypeValidator(): RuntimeTypeValidator {
  return new RuntimeTypeValidator();
}
