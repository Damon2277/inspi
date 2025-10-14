/**
 * Type Assertions Tests
 */

import {
  expectType,
  expectAssignable,
  expectNotAssignable,
  expectExtends,
  expectNotExtends,
  expectError,
  Expect,
  Equal,
  NotAny,
  IsAny,
  IsNever,
  IsUnknown,
  HasProperty,
  IsFunction,
  IsArray,
  IsTuple,
  IsUnion,
  IsOptional,
  IsReadonly,
  TypeTests,
  RuntimeAssertions,
} from '../../../../lib/testing/types/TypeAssertions';

describe('TypeAssertions', () => {
  describe('Compile-time Type Assertions', () => {
    describe('expectType', () => {
      it('should validate type equality at compile time', () => {
        // These should compile without errors
        expectType<string>()<string>();
        expectType<number>()<number>();
        expectType<boolean>()<boolean>();

        // Test with complex types
        interface TestInterface {
          id: number;
          name: string;
        }

        expectType<TestInterface>()<TestInterface>();
        expectType<TestInterface[]>()<TestInterface[]>();
      });
    });

    describe('expectAssignable', () => {
      it('should validate type assignability', () => {
        // These should compile without errors
        expectAssignable<string, string | number>();
        expectAssignable<'hello', string>();
        expectAssignable<number, any>();
        expectAssignable<{ a: string; b: number }, { a: string }>();

        // Union types
        expectAssignable<'red' | 'blue', string>();
        expectAssignable<1 | 2 | 3, number>();
      });
    });

    describe('expectNotAssignable', () => {
      it('should validate type non-assignability', () => {
        // These should compile without errors (meaning the types are NOT assignable)
        expectNotAssignable<string, number>();
        expectNotAssignable<{ a: string }, { a: string; b: number }>();
        expectNotAssignable<number, string>();
      });
    });

    describe('expectExtends', () => {
      it('should validate type extension relationships', () => {
        interface Base {
          id: string;
        }

        interface Extended extends Base {
          name: string;
        }

        expectExtends<Extended, Base>();
        expectExtends<string, any>();
        expectExtends<never, string>();
      });
    });

    describe('expectNotExtends', () => {
      it('should validate non-extension relationships', () => {
        interface Base {
          id: string;
        }

        interface Extended extends Base {
          name: string;
        }

        expectNotExtends<Base, Extended>();
        expectNotExtends<string, number>();
        expectNotExtends<number, boolean>();
      });
    });
  });

  describe('Type Utility Tests', () => {
    describe('Equal', () => {
      it('should test type equality', () => {
        type Test1 = Expect<Equal<string, string>>;
        type Test2 = Expect<Equal<number, number>>;
        type Test3 = Expect<Equal<{ a: string }, { a: string }>>;

        // These should be false
        type Test4 = Equal<string, number>; // false
        type Test5 = Equal<{ a: string }, { a: number }>; // false

        expect(true).toBe(true); // Runtime assertion to make test pass
      });
    });

    describe('NotAny and IsAny', () => {
      it('should detect any types', () => {
        type Test1 = Expect<NotAny<string>>;
        type Test2 = Expect<NotAny<number>>;
        type Test3 = Expect<NotAny<object>>;

        type Test4 = Expect<IsAny<any>>;

        expect(true).toBe(true);
      });
    });

    describe('IsNever', () => {
      it('should detect never types', () => {
        type Test1 = Expect<IsNever<never>>;
        type Test2 = Expect<Equal<IsNever<string>, false>>;
        type Test3 = Expect<Equal<IsNever<number>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('IsUnknown', () => {
      it('should detect unknown types', () => {
        type Test1 = Expect<IsUnknown<unknown>>;
        type Test2 = Expect<Equal<IsUnknown<any>, false>>;
        type Test3 = Expect<Equal<IsUnknown<string>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('HasProperty', () => {
      it('should detect object properties', () => {
        interface TestInterface {
          id: number;
          name: string;
          optional?: boolean;
        }

        type Test1 = Expect<HasProperty<TestInterface, 'id'>>;
        type Test2 = Expect<HasProperty<TestInterface, 'name'>>;
        type Test3 = Expect<HasProperty<TestInterface, 'optional'>>;
        type Test4 = Expect<Equal<HasProperty<TestInterface, 'nonexistent'>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('IsFunction', () => {
      it('should detect function types', () => {
        type Test1 = Expect<IsFunction<() => void>>;
        type Test2 = Expect<IsFunction<(x: number) => string>>;
        type Test3 = Expect<IsFunction<Function>>;
        type Test4 = Expect<Equal<IsFunction<string>, false>>;
        type Test5 = Expect<Equal<IsFunction<object>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('IsArray', () => {
      it('should detect array types', () => {
        type Test1 = Expect<IsArray<string[]>>;
        type Test2 = Expect<IsArray<number[]>>;
        type Test3 = Expect<IsArray<readonly string[]>>;
        type Test4 = Expect<Equal<IsArray<string>, false>>;
        type Test5 = Expect<Equal<IsArray<object>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('IsTuple', () => {
      it('should detect tuple types', () => {
        type Test1 = Expect<IsTuple<[string, number]>>;
        type Test2 = Expect<IsTuple<[string, number, boolean]>>;
        type Test3 = Expect<IsTuple<readonly [string, number]>>;
        type Test4 = Expect<Equal<IsTuple<string[]>, false>>;
        type Test5 = Expect<Equal<IsTuple<number[]>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('IsUnion', () => {
      it('should detect union types', () => {
        type Test1 = Expect<IsUnion<string | number>>;
        type Test2 = Expect<IsUnion<'a' | 'b' | 'c'>>;
        type Test3 = Expect<IsUnion<boolean | null>>;
        type Test4 = Expect<Equal<IsUnion<string>, false>>;
        type Test5 = Expect<Equal<IsUnion<number>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('IsOptional', () => {
      it('should detect optional properties', () => {
        interface TestInterface {
          required: string;
          optional?: number;
        }

        type Test1 = Expect<IsOptional<TestInterface, 'optional'>>;
        type Test2 = Expect<Equal<IsOptional<TestInterface, 'required'>, false>>;

        expect(true).toBe(true);
      });
    });

    describe('IsReadonly', () => {
      it('should detect readonly properties', () => {
        interface TestInterface {
          mutable: string;
          readonly immutable: number;
        }

        type Test1 = Expect<IsReadonly<TestInterface, 'immutable'>>;
        type Test2 = Expect<Equal<IsReadonly<TestInterface, 'mutable'>, false>>;

        expect(true).toBe(true);
      });
    });
  });

  describe('TypeTests Namespace', () => {
    it('should run all type tests without compilation errors', () => {
      // These functions contain compile-time type tests
      // If they compile, the tests pass
      TypeTests.testTypeEquality();
      TypeTests.testTypeAssignability();
      TypeTests.testTypeExtensions();
      TypeTests.testUtilityTypes();
      TypeTests.testObjectProperties();
      TypeTests.testUnionTypes();
      TypeTests.testGenericConstraints();
      TypeTests.testConditionalTypes();
      TypeTests.testMappedTypes();
      TypeTests.testTemplateLiteralTypes();
      TypeTests.testRecursiveTypes();

      expect(true).toBe(true);
    });
  });

  describe('Runtime Assertions', () => {
    describe('Type Guards', () => {
      it('should validate string types', () => {
        expect(RuntimeAssertions.isString('hello')).toBe(true);
        expect(RuntimeAssertions.isString(123)).toBe(false);
        expect(RuntimeAssertions.isString(null)).toBe(false);
        expect(RuntimeAssertions.isString(undefined)).toBe(false);
      });

      it('should validate number types', () => {
        expect(RuntimeAssertions.isNumber(123)).toBe(true);
        expect(RuntimeAssertions.isNumber(3.14)).toBe(true);
        expect(RuntimeAssertions.isNumber('123')).toBe(false);
        expect(RuntimeAssertions.isNumber(NaN)).toBe(false);
        expect(RuntimeAssertions.isNumber(Infinity)).toBe(true);
      });

      it('should validate boolean types', () => {
        expect(RuntimeAssertions.isBoolean(true)).toBe(true);
        expect(RuntimeAssertions.isBoolean(false)).toBe(true);
        expect(RuntimeAssertions.isBoolean('true')).toBe(false);
        expect(RuntimeAssertions.isBoolean(1)).toBe(false);
        expect(RuntimeAssertions.isBoolean(0)).toBe(false);
      });

      it('should validate object types', () => {
        expect(RuntimeAssertions.isObject({})).toBe(true);
        expect(RuntimeAssertions.isObject({ a: 1 })).toBe(true);
        expect(RuntimeAssertions.isObject(null)).toBe(false);
        expect(RuntimeAssertions.isObject([])).toBe(false);
        expect(RuntimeAssertions.isObject('object')).toBe(false);
      });

      it('should validate array types', () => {
        expect(RuntimeAssertions.isArray([])).toBe(true);
        expect(RuntimeAssertions.isArray([1, 2, 3])).toBe(true);
        expect(RuntimeAssertions.isArray('array')).toBe(false);
        expect(RuntimeAssertions.isArray({})).toBe(false);
        expect(RuntimeAssertions.isArray(null)).toBe(false);
      });

      it('should validate function types', () => {
        expect(RuntimeAssertions.isFunction(() => {})).toBe(true);
        expect(RuntimeAssertions.isFunction(function () {})).toBe(true);
        expect(RuntimeAssertions.isFunction(Math.max)).toBe(true);
        expect(RuntimeAssertions.isFunction('function')).toBe(false);
        expect(RuntimeAssertions.isFunction({})).toBe(false);
      });
    });

    describe('Property Validation', () => {
      it('should check for property existence', () => {
        const obj = { name: 'test', age: 25 };

        expect(RuntimeAssertions.hasProperty(obj, 'name')).toBe(true);
        expect(RuntimeAssertions.hasProperty(obj, 'age')).toBe(true);
        expect(RuntimeAssertions.hasProperty(obj, 'email')).toBe(false);
        expect(RuntimeAssertions.hasProperty(null, 'name')).toBe(false);
        expect(RuntimeAssertions.hasProperty('string', 'length')).toBe(false);
      });

      it('should check for required properties', () => {
        interface User {
          id: number;
          name: string;
          email: string;
        }

        const validUser = { id: 1, name: 'John', email: 'john@example.com' };
        const invalidUser = { id: 1, name: 'John' }; // missing email

        expect(RuntimeAssertions.hasRequiredProperties<User>(validUser, ['id', 'name', 'email'])).toBe(true);
        expect(RuntimeAssertions.hasRequiredProperties<User>(invalidUser, ['id', 'name', 'email'])).toBe(false);
        expect(RuntimeAssertions.hasRequiredProperties<User>(null, ['id', 'name', 'email'])).toBe(false);
      });
    });

    describe('Type Assertions', () => {
      it('should assert types successfully', () => {
        const stringValidator = (value: unknown): value is string => typeof value === 'string';
        const numberValidator = (value: unknown): value is number => typeof value === 'number';

        expect(() => {
          RuntimeAssertions.assertType('hello', stringValidator);
        }).not.toThrow();

        expect(() => {
          RuntimeAssertions.assertType(123, numberValidator);
        }).not.toThrow();
      });

      it('should throw on failed type assertions', () => {
        const stringValidator = (value: unknown): value is string => typeof value === 'string';

        expect(() => {
          RuntimeAssertions.assertType(123, stringValidator);
        }).toThrow('Type assertion failed');
      });

      it('should check types without throwing', () => {
        const stringValidator = (value: unknown): value is string => typeof value === 'string';

        expect(RuntimeAssertions.isType('hello', stringValidator)).toBe(true);
        expect(RuntimeAssertions.isType(123, stringValidator)).toBe(false);
      });
    });

    describe('Custom Type Guards', () => {
      it('should create custom type guards', () => {
        interface User {
          id: number;
          name: string;
        }

        const isUser = RuntimeAssertions.createTypeGuard<User>(
          (value: unknown): boolean => {
            return RuntimeAssertions.isObject(value) &&
                   RuntimeAssertions.hasProperty(value, 'id') &&
                   RuntimeAssertions.hasProperty(value, 'name') &&
                   typeof value.id === 'number' &&
                   typeof value.name === 'string';
          },
        );

        const validUser = { id: 1, name: 'John' };
        const invalidUser = { id: '1', name: 'John' }; // id should be number

        expect(isUser(validUser)).toBe(true);
        expect(isUser(invalidUser)).toBe(false);
        expect(isUser(null)).toBe(false);
        expect(isUser('user')).toBe(false);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should combine compile-time and runtime assertions', () => {
      interface ApiResponse<T> {
        data: T;
        status: number;
        message?: string;
      }

      // Compile-time tests
      type Test1 = Expect<HasProperty<ApiResponse<string>, 'data'>>;
      type Test2 = Expect<HasProperty<ApiResponse<string>, 'status'>>;
      type Test3 = Expect<IsOptional<ApiResponse<string>, 'message'>>;

      // Runtime validation
      const isApiResponse = <T>(
        value: unknown,
        dataValidator: (data: unknown) => data is T,
      ): value is ApiResponse<T> => {
        return RuntimeAssertions.isObject(value) &&
               RuntimeAssertions.hasProperty(value, 'data') &&
               RuntimeAssertions.hasProperty(value, 'status') &&
               dataValidator(value.data) &&
               typeof value.status === 'number';
      };

      const stringResponse = {
        data: 'hello',
        status: 200,
        message: 'success',
      };

      const numberResponse = {
        data: 42,
        status: 200,
      };

      const invalidResponse = {
        data: 'hello',
        status: '200', // should be number
      };

      expect(isApiResponse(stringResponse, RuntimeAssertions.isString)).toBe(true);
      expect(isApiResponse(numberResponse, RuntimeAssertions.isNumber)).toBe(true);
      expect(isApiResponse(invalidResponse, RuntimeAssertions.isString)).toBe(false);
    });

    it('should validate complex nested structures', () => {
      interface Address {
        street: string;
        city: string;
        zipCode: string;
      }

      interface User {
        id: number;
        name: string;
        addresses: Address[];
      }

      // Compile-time tests
      type Test1 = Expect<HasProperty<User, 'addresses'>>;
      type Test2 = Expect<IsArray<User['addresses']>>;

      // Runtime validation
      const isAddress = (value: unknown): value is Address => {
        return RuntimeAssertions.isObject(value) &&
               RuntimeAssertions.hasRequiredProperties<Address>(value, ['street', 'city', 'zipCode']) &&
               RuntimeAssertions.isString(value.street) &&
               RuntimeAssertions.isString(value.city) &&
               RuntimeAssertions.isString(value.zipCode);
      };

      const isUser = (value: unknown): value is User => {
        return RuntimeAssertions.isObject(value) &&
               RuntimeAssertions.hasRequiredProperties<User>(value, ['id', 'name', 'addresses']) &&
               RuntimeAssertions.isNumber(value.id) &&
               RuntimeAssertions.isString(value.name) &&
               RuntimeAssertions.isArray(value.addresses) &&
               value.addresses.every(isAddress);
      };

      const validUser = {
        id: 1,
        name: 'John',
        addresses: [
          { street: '123 Main St', city: 'Anytown', zipCode: '12345' },
          { street: '456 Oak Ave', city: 'Somewhere', zipCode: '67890' },
        ],
      };

      const invalidUser = {
        id: 1,
        name: 'John',
        addresses: [
          { street: '123 Main St', city: 'Anytown' }, // missing zipCode
        ],
      };

      expect(isUser(validUser)).toBe(true);
      expect(isUser(invalidUser)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle edge cases in type guards', () => {
      expect(RuntimeAssertions.isString('')).toBe(true);
      expect(RuntimeAssertions.isNumber(0)).toBe(true);
      expect(RuntimeAssertions.isNumber(-0)).toBe(true);
      expect(RuntimeAssertions.isBoolean(false)).toBe(true);
      expect(RuntimeAssertions.isArray([])).toBe(true);
      expect(RuntimeAssertions.isObject({})).toBe(true);
      expect(RuntimeAssertions.isFunction(() => {})).toBe(true);
    });

    it('should handle null and undefined correctly', () => {
      expect(RuntimeAssertions.isString(null)).toBe(false);
      expect(RuntimeAssertions.isString(undefined)).toBe(false);
      expect(RuntimeAssertions.isNumber(null)).toBe(false);
      expect(RuntimeAssertions.isNumber(undefined)).toBe(false);
      expect(RuntimeAssertions.isObject(null)).toBe(false);
      expect(RuntimeAssertions.isObject(undefined)).toBe(false);
    });

    it('should handle special number values', () => {
      expect(RuntimeAssertions.isNumber(NaN)).toBe(false);
      expect(RuntimeAssertions.isNumber(Infinity)).toBe(true);
      expect(RuntimeAssertions.isNumber(-Infinity)).toBe(true);
    });
  });
});
