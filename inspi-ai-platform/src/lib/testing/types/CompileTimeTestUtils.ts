/**
 * Compile-Time Test Utilities
 * 
 * Utilities for testing TypeScript types at compile time including
 * type assertion helpers, compilation testing, and type compatibility validation.
 */
import * as ts from 'typescript';
import { CompileTimeTest, ExpectedError, ExpectedWarning } from './TypeTestFramework';

export class CompileTimeTestUtils {
  /**
   * Create a compile-time test that should pass
   */
  static createPassingTest(name: string, sourceCode: string): CompileTimeTest {
    return {
      name,
      description: `Test that ${name} compiles successfully`,
      sourceCode,
      expectedErrors: [],
      expectedWarnings: [],
      shouldCompile: true
    };
  }

  /**
   * Create a compile-time test that should fail
   */
  static createFailingTest(
    name: string, 
    sourceCode: string, 
    expectedErrors: ExpectedError[]
  ): CompileTimeTest {
    return {
      name,
      description: `Test that ${name} fails to compile with expected errors`,
      sourceCode,
      expectedErrors,
      expectedWarnings: [],
      shouldCompile: false
    };
  }

  /**
   * Create type assignability tests
   */
  static createAssignabilityTests(): CompileTimeTest[] {
    return [
      {
        name: 'Basic Type Assignability',
        description: 'Test basic type assignments',
        sourceCode: `
          interface User {
            id: number;
            name: string;
            email: string;
          }
          
          const user: User = {
            id: 1,
            name: 'John',
            email: 'john@example.com'
          };
          
          // This should work
          const userId: number = user.id;
          const userName: string = user.name;
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      },
      {
        name: 'Invalid Type Assignment',
        description: 'Test invalid type assignments',
        sourceCode: `
          interface User {
            id: number;
            name: string;
          }
          
          const user: User = {
            id: 'invalid', // Should be number
            name: 123      // Should be string
          };
        `,
        expectedErrors: [
          {
            code: 2322,
            message: "Type 'string' is not assignable to type 'number'"
          },
          {
            code: 2322,
            message: "Type 'number' is not assignable to type 'string'"
          }
        ],
        expectedWarnings: [],
        shouldCompile: false
      }
    ];
  }

  /**
   * Create generic type tests
   */
  static createGenericTypeTests(): CompileTimeTest[] {
    return [
      {
        name: 'Generic Function Types',
        description: 'Test generic function type constraints',
        sourceCode: `
          function identity<T>(arg: T): T {
            return arg;
          }
          
          const stringResult = identity<string>('hello');
          const numberResult = identity<number>(42);
          const booleanResult = identity<boolean>(true);
          
          // Type should be inferred
          const inferredResult = identity('inferred');
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      },
      {
        name: 'Generic Constraint Violations',
        description: 'Test generic constraint violations',
        sourceCode: `
          interface Lengthwise {
            length: number;
          }
          
          function loggingIdentity<T extends Lengthwise>(arg: T): T {
            console.log(arg.length);
            return arg;
          }
          
          // This should work
          loggingIdentity('hello');
          loggingIdentity([1, 2, 3]);
          
          // This should fail
          loggingIdentity(42);
        `,
        expectedErrors: [
          {
            code: 2345,
            message: "Argument of type 'number' is not assignable to parameter of type 'Lengthwise'"
          }
        ],
        expectedWarnings: [],
        shouldCompile: false
      }
    ];
  }

  /**
   * Create interface consistency tests
   */
  static createInterfaceConsistencyTests(): CompileTimeTest[] {
    return [
      {
        name: 'Interface Extension',
        description: 'Test interface extension consistency',
        sourceCode: `
          interface BaseUser {
            id: number;
            name: string;
          }
          
          interface AdminUser extends BaseUser {
            permissions: string[];
            isAdmin: true;
          }
          
          const admin: AdminUser = {
            id: 1,
            name: 'Admin',
            permissions: ['read', 'write'],
            isAdmin: true
          };
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      },
      {
        name: 'Interface Implementation',
        description: 'Test class interface implementation',
        sourceCode: `
          interface Flyable {
            fly(): void;
            altitude: number;
          }
          
          class Bird implements Flyable {
            altitude: number = 0;
            
            fly(): void {
              this.altitude = 100;
            }
          }
          
          class Airplane implements Flyable {
            altitude: number = 0;
            
            fly(): void {
              this.altitude = 30000;
            }
            
            // Additional methods are allowed
            land(): void {
              this.altitude = 0;
            }
          }
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      }
    ];
  }

  /**
   * Create utility type tests
   */
  static createUtilityTypeTests(): CompileTimeTest[] {
    return [
      {
        name: 'Utility Types Usage',
        description: 'Test TypeScript utility types',
        sourceCode: `
          interface User {
            id: number;
            name: string;
            email: string;
            password: string;
          }
          
          // Partial type
          const partialUser: Partial<User> = {
            name: 'John'
          };
          
          // Pick type
          const publicUser: Pick<User, 'id' | 'name' | 'email'> = {
            id: 1,
            name: 'John',
            email: 'john@example.com'
          };
          
          // Omit type
          const userWithoutPassword: Omit<User, 'password'> = {
            id: 1,
            name: 'John',
            email: 'john@example.com'
          };
          
          // Required type
          const requiredUser: Required<Partial<User>> = {
            id: 1,
            name: 'John',
            email: 'john@example.com',
            password: 'secret'
          };
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      }
    ];
  }

  /**
   * Create conditional type tests
   */
  static createConditionalTypeTests(): CompileTimeTest[] {
    return [
      {
        name: 'Conditional Types',
        description: 'Test conditional type logic',
        sourceCode: `
          type IsString<T> = T extends string ? true : false;
          
          type Test1 = IsString<string>;   // true
          type Test2 = IsString<number>;   // false
          type Test3 = IsString<boolean>;  // false
          
          // More complex conditional type
          type ApiResponse<T> = T extends string 
            ? { message: T } 
            : T extends number 
              ? { code: T } 
              : { data: T };
          
          const stringResponse: ApiResponse<string> = { message: 'success' };
          const numberResponse: ApiResponse<number> = { code: 200 };
          const objectResponse: ApiResponse<{ id: number }> = { data: { id: 1 } };
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      }
    ];
  }

  /**
   * Create mapped type tests
   */
  static createMappedTypeTests(): CompileTimeTest[] {
    return [
      {
        name: 'Mapped Types',
        description: 'Test mapped type transformations',
        sourceCode: `
          interface User {
            id: number;
            name: string;
            email: string;
          }
          
          // Make all properties optional
          type OptionalUser = {
            [K in keyof User]?: User[K];
          };
          
          // Make all properties readonly
          type ReadonlyUser = {
            readonly [K in keyof User]: User[K];
          };
          
          // Transform property types
          type StringifiedUser = {
            [K in keyof User]: string;
          };
          
          const optionalUser: OptionalUser = { name: 'John' };
          const readonlyUser: ReadonlyUser = { id: 1, name: 'John', email: 'john@example.com' };
          const stringifiedUser: StringifiedUser = { id: '1', name: 'John', email: 'john@example.com' };
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      }
    ];
  }

  /**
   * Create type guard tests
   */
  static createTypeGuardTests(): CompileTimeTest[] {
    return [
      {
        name: 'Type Guards',
        description: 'Test type guard functions',
        sourceCode: `
          interface Cat {
            meow(): void;
          }
          
          interface Dog {
            bark(): void;
          }
          
          type Animal = Cat | Dog;
          
          function isCat(animal: Animal): animal is Cat {
            return 'meow' in animal;
          }
          
          function isDog(animal: Animal): animal is Dog {
            return 'bark' in animal;
          }
          
          function handleAnimal(animal: Animal) {
            if (isCat(animal)) {
              animal.meow(); // TypeScript knows this is a Cat
            } else if (isDog(animal)) {
              animal.bark(); // TypeScript knows this is a Dog
            }
          }
        `,
        expectedErrors: [],
        expectedWarnings: [],
        shouldCompile: true
      }
    ];
  }

  /**
   * Create strict mode tests
   */
  static createStrictModeTests(): CompileTimeTest[] {
    return [
      {
        name: 'Strict Null Checks',
        description: 'Test strict null checking',
        sourceCode: `
          interface User {
            id: number;
            name: string;
            email?: string;
          }
          
          function getUser(): User | null {
            return Math.random() > 0.5 ? { id: 1, name: 'John' } : null;
          }
          
          const user = getUser();
          
          // This should fail in strict mode
          console.log(user.name);
          
          // This should work
          if (user) {
            console.log(user.name);
          }
          
          // Optional chaining should work
          console.log(user?.name);
        `,
        expectedErrors: [
          {
            code: 2531,
            message: "Object is possibly 'null'"
          }
        ],
        expectedWarnings: [],
        shouldCompile: false
      }
    ];
  }

  /**
   * Validate TypeScript compiler options
   */
  static validateCompilerOptions(options: ts.CompilerOptions): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for strict mode
    if (!options.strict) {
      issues.push('Strict mode is not enabled');
      recommendations.push('Enable strict mode for better type safety');
    }

    // Check for no implicit any
    if (options.noImplicitAny === false) {
      issues.push('noImplicitAny is disabled');
      recommendations.push('Enable noImplicitAny to catch untyped variables');
    }

    // Check for strict null checks
    if (!options.strictNullChecks) {
      issues.push('strictNullChecks is not enabled');
      recommendations.push('Enable strictNullChecks to prevent null/undefined errors');
    }

    // Check target version
    if (options.target && options.target < ts.ScriptTarget.ES2018) {
      recommendations.push('Consider upgrading target to ES2018 or later for better features');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Generate type compatibility matrix
   */
  static generateCompatibilityMatrix(types: string[]): {
    matrix: boolean[][];
    typeNames: string[];
    incompatibilities: Array<{ from: string; to: string; reason: string }>;
  } {
    const matrix: boolean[][] = [];
    const incompatibilities: Array<{ from: string; to: string; reason: string }> = [];

    // Create compatibility matrix (simplified implementation)
    for (let i = 0; i < types.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < types.length; j++) {
        const compatible = this.areTypesCompatible(types[i], types[j]);
        matrix[i][j] = compatible;
        
        if (!compatible && i !== j) {
          incompatibilities.push({
            from: types[i],
            to: types[j],
            reason: `${types[i]} is not assignable to ${types[j]}`
          });
        }
      }
    }

    return {
      matrix,
      typeNames: types,
      incompatibilities
    };
  }

  /**
   * Check if two types are compatible (simplified)
   */
  private static areTypesCompatible(type1: string, type2: string): boolean {
    // Simplified compatibility check
    if (type1 === type2) return true;
    
    // Basic primitive compatibility
    const primitiveCompatibility: Record<string, string[]> = {
      'any': ['string', 'number', 'boolean', 'object', 'undefined', 'null'],
      'unknown': [],
      'string': ['any'],
      'number': ['any'],
      'boolean': ['any'],
      'object': ['any'],
      'undefined': ['any', 'void'],
      'null': ['any'],
      'void': ['any', 'undefined']
    };

    return primitiveCompatibility[type1]?.includes(type2) || false;
  }
}