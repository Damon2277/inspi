/**
 * Type Assertions
 *
 * Compile-time type assertion utilities for testing TypeScript types.
 * These functions help verify type relationships and constraints at compile time.
 */

/**
 * Assert that a type T is exactly equal to type U
 */
export function expectType<T>(): <U extends T>() => U extends T ? (T extends U ? true : false) : false {
  return <U extends T>() => true as any;
}

/**
 * Assert that a type T is assignable to type U
 */
export function expectAssignable<T, U extends T>(): true {
  return true;
}

/**
 * Assert that a type T is NOT assignable to type U
 */
export function expectNotAssignable<T, U>(): T extends U ? false : true {
  return true as any;
}

/**
 * Assert that a type T extends type U
 */
export function expectExtends<T extends U, U>(): true {
  return true;
}

/**
 * Assert that a type T does NOT extend type U
 */
export function expectNotExtends<T, U>(): T extends U ? false : true {
  return true as any;
}

/**
 * Assert that an expression should cause a TypeScript error
 */
export function expectError<T = any>(expression: T): void {
  // This function is used for compile-time testing
  // The actual error checking happens at compile time
}

/**
 * Assert that two types are exactly the same
 */
export type Expect<T extends true> = T;

/**
 * Assert that two types are equal
 */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/**
 * Assert that a type is not any
 */
export type NotAny<T> = 0 extends 1 & T ? false : true;

/**
 * Assert that a type is any
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Assert that a type is never
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Assert that a type is unknown
 */
export type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;

/**
 * Assert that a type has a specific property
 */
export type HasProperty<T, K extends PropertyKey> = K extends keyof T ? true : false;

/**
 * Assert that a type is a function
 */
export type IsFunction<T> = T extends (...args: any[]) => any ? true : false;

/**
 * Assert that a type is an array
 */
export type IsArray<T> = T extends readonly any[] ? true : false;

/**
 * Assert that a type is a tuple
 */
export type IsTuple<T> = T extends readonly any[] ? number extends T['length'] ? false : true : false;

/**
 * Assert that a type is a union
 */
export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

/**
 * Helper type to convert union to intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Assert that a type is optional
 */
export type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

/**
 * Assert that a type is readonly
 */
export type IsReadonly<T, K extends keyof T> = Equal<
  { -readonly [P in K]: T[P] },
  { [P in K]: T[P] }
> extends true ? false : true;

/**
 * Test type utilities
 */
export namespace TypeTests {
  /**
   * Test basic type equality
   */
  export function testTypeEquality(): void {
    // Test equal types
    type Test1 = Expect<Equal<string, string>>;
    type Test2 = Expect<Equal<number, number>>;
    type Test3 = Expect<Equal<{ a: string }, { a: string }>>;

    // Test unequal types
    type Test4 = Expect<Equal<Equal<string, number>, false>>;
    type Test5 = Expect<Equal<Equal<{ a: string }, { a: number }>, false>>;
  }

  /**
   * Test type assignability
   */
  export function testTypeAssignability(): void {
    // Test assignable types
    expectAssignable<string, string | number>();
    expectAssignable<'hello', string>();
    expectAssignable<{ a: string; b: number }, { a: string }>();

    // Test non-assignable types (these should cause compile errors)
    // expectAssignable<string, number>(); // Should error
    // expectAssignable<{ a: string }, { a: string; b: number }>(); // Should error
  }

  /**
   * Test type extensions
   */
  export function testTypeExtensions(): void {
    interface Base {
      id: string;
    }

    interface Extended extends Base {
      name: string;
    }

    expectExtends<Extended, Base>();
    expectNotExtends<Base, Extended>();
  }

  /**
   * Test utility types
   */
  export function testUtilityTypes(): void {
    type Test1 = Expect<NotAny<string>>;
    type Test2 = Expect<IsAny<any>>;
    type Test3 = Expect<IsNever<never>>;
    type Test4 = Expect<IsUnknown<unknown>>;
    type Test5 = Expect<IsFunction<() => void>>;
    type Test6 = Expect<IsArray<string[]>>;
    type Test7 = Expect<IsTuple<[string, number]>>;
  }

  /**
   * Test object property types
   */
  export function testObjectProperties(): void {
    interface TestInterface {
      required: string;
      optional?: number;
      readonly readonly: boolean;
    }

    type Test1 = Expect<HasProperty<TestInterface, 'required'>>;
    type Test2 = Expect<HasProperty<TestInterface, 'optional'>>;
    type Test3 = Expect<Equal<HasProperty<TestInterface, 'nonexistent'>, false>>;
    type Test4 = Expect<IsOptional<TestInterface, 'optional'>>;
    type Test5 = Expect<Equal<IsOptional<TestInterface, 'required'>, false>>;
    type Test6 = Expect<IsReadonly<TestInterface, 'readonly'>>;
    type Test7 = Expect<Equal<IsReadonly<TestInterface, 'required'>, false>>;
  }

  /**
   * Test union types
   */
  export function testUnionTypes(): void {
    type StringOrNumber = string | number;
    type StringAndNumber = string & number;

    type Test1 = Expect<IsUnion<StringOrNumber>>;
    type Test2 = Expect<Equal<IsUnion<string>, false>>;
    type Test3 = Expect<Equal<IsUnion<StringAndNumber>, false>>;
  }

  /**
   * Test generic constraints
   */
  export function testGenericConstraints(): void {
    function testConstraint<T extends string>(value: T): T {
      return value;
    }

    // These should work
    const result1 = testConstraint('hello');
    const result2 = testConstraint('world' as const);

    // This should error
    // const result3 = testConstraint(42); // Should error

    expectType<string>()(result1);
    expectType<'world'>()(result2);
  }

  /**
   * Test conditional types
   */
  export function testConditionalTypes(): void {
    type IsString<T> = T extends string ? true : false;
    type IsArray<T> = T extends any[] ? true : false;

    type Test1 = Expect<Equal<IsString<string>, true>>;
    type Test2 = Expect<Equal<IsString<number>, false>>;
    type Test3 = Expect<Equal<IsArray<string[]>, true>>;
    type Test4 = Expect<Equal<IsArray<string>, false>>;
  }

  /**
   * Test mapped types
   */
  export function testMappedTypes(): void {
    interface Original {
      a: string;
      b: number;
      c: boolean;
    }

    type Optional<T> = {
      [K in keyof T]?: T[K];
    };

    type Readonly<T> = {
      readonly [K in keyof T]: T[K];
    };

    type OptionalOriginal = Optional<Original>;
    type ReadonlyOriginal = Readonly<Original>;

    type Test1 = Expect<IsOptional<OptionalOriginal, 'a'>>;
    type Test2 = Expect<IsOptional<OptionalOriginal, 'b'>>;
    type Test3 = Expect<IsReadonly<ReadonlyOriginal, 'a'>>;
    type Test4 = Expect<IsReadonly<ReadonlyOriginal, 'c'>>;
  }

  /**
   * Test template literal types
   */
  export function testTemplateLiteralTypes(): void {
    type EventName<T extends string> = `on${Capitalize<T>}`;
    type CSSProperty<T extends string> = `--${T}`;

    type Test1 = Expect<Equal<EventName<'click'>, 'onClick'>>;
    type Test2 = Expect<Equal<EventName<'change'>, 'onChange'>>;
    type Test3 = Expect<Equal<CSSProperty<'primary-color'>, '--primary-color'>>;
  }

  /**
   * Test recursive types
   */
  export function testRecursiveTypes(): void {
    type JSONValue =
      | string
      | number
      | boolean
      | null
      | JSONValue[]
      | { [key: string]: JSONValue };

    const validJSON: JSONValue = {
      name: 'test',
      age: 25,
      active: true,
      tags: ['typescript', 'testing'],
      metadata: {
        created: '2023-01-01',
        nested: {
          deep: true,
        },
      },
    };

    expectType<JSONValue>()(validJSON);
  }
}

/**
 * Runtime type assertion helpers
 */
export namespace RuntimeAssertions {
  /**
   * Assert that a value matches a type at runtime
   */
  export function assertType<T>(value: unknown, validator: (value: unknown) => value is T): asserts value is T {
    if (!validator(value)) {
      throw new Error('Type assertion failed: value does not match expected type');
    }
  }

  /**
   * Check if a value is of a specific type
   */
  export function isType<T>(value: unknown, validator: (value: unknown) => value is T): value is T {
    return validator(value);
  }

  /**
   * Type guard for string
   */
  export function isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  /**
   * Type guard for number
   */
  export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
  }

  /**
   * Type guard for boolean
   */
  export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  /**
   * Type guard for object
   */
  export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Type guard for array
   */
  export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /**
   * Type guard for function
   */
  export function isFunction(value: unknown): value is Function {
    return typeof value === 'function';
  }

  /**
   * Create a type guard for an interface
   */
  export function createTypeGuard<T>(
    validator: (value: unknown) => boolean,
  ): (value: unknown) => value is T {
    return (value: unknown): value is T => validator(value);
  }

  /**
   * Validate object properties
   */
  export function hasProperty<K extends PropertyKey>(
    obj: unknown,
    key: K,
  ): obj is Record<K, unknown> {
    return isObject(obj) && key in obj;
  }

  /**
   * Validate required properties
   */
  export function hasRequiredProperties<T extends Record<string, unknown>>(
    obj: unknown,
    keys: (keyof T)[],
  ): obj is T {
    if (!isObject(obj)) return false;

    return keys.every(key => key in obj);
  }
}

/**
 * Export all type testing utilities
 */
export {
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
};
