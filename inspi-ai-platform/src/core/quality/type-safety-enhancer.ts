/**
 * TypeScript类型安全增强工具
 * 提供类型覆盖率分析、运行时类型验证和类型安全建议
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 类型安全指标
 */
export interface TypeSafetyMetrics {
  // 覆盖率指标
  totalFiles: number;
  typeScriptFiles: number;
  typeScriptCoverage: number;

  // 类型使用指标
  anyUsage: number;
  unknownUsage: number;
  explicitTypes: number;
  inferredTypes: number;

  // 类型定义指标
  interfaceCount: number;
  typeAliasCount: number;
  enumCount: number;
  genericUsage: number;

  // 类型安全问题
  typeAssertions: number;
  nonNullAssertions: number;
  typeIgnoreComments: number;

  // 严格性指标
  strictModeEnabled: boolean;
  noImplicitAny: boolean;
  strictNullChecks: boolean;
  strictFunctionTypes: boolean;
}

/**
 * 类型安全问题
 */
export interface TypeSafetyIssue {
  file: string;
  line: number;
  column: number;
  type: 'any-usage' | 'type-assertion' | 'non-null-assertion' | 'missing-type' | 'unsafe-cast';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
  autoFixable: boolean;
}

/**
 * 运行时类型验证器
 */
export interface RuntimeTypeValidator {
  validate<T>(value: unknown, schema: TypeSchema<T>): value is T;
  createValidator<T>(schema: TypeSchema<T>): (value: unknown) => value is T;
  generateSchema<T>(type: T): TypeSchema<T>;
}

/**
 * 类型模式定义
 */
export type TypeSchema<T> = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'function';
  properties?: T extends object ? { [K in keyof T]?: TypeSchema<T[K]> } : never;
  items?: T extends Array<infer U> ? TypeSchema<U> : never;
  required?: T extends object ? (keyof T)[] : never;
  nullable?: boolean;
  optional?: boolean;
};

/**
 * TypeScript类型安全增强器
 */
export class TypeSafetyEnhancer {
  private projectRoot: string;
  private tsConfigPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.tsConfigPath = path.join(projectRoot, 'tsconfig.json');
  }

  /**
   * 分析类型安全性
   */
  async analyzeTypeSafety(): Promise<{
    metrics: TypeSafetyMetrics;
    issues: TypeSafetyIssue[];
    recommendations: string[];
  }> {
    console.log('🔍 Analyzing TypeScript type safety...');

    const files = await this.getSourceFiles();
    const tsConfig = await this.loadTsConfig();

    const metrics = await this.collectTypeMetrics(files, tsConfig);
    const issues = await this.findTypeIssues(files);
    const recommendations = this.generateTypeRecommendations(metrics, issues);

    console.log(`✅ Type safety analysis complete. Coverage: ${metrics.typeScriptCoverage.toFixed(1)}%`);

    return { metrics, issues, recommendations };
  }

  /**
   * 收集类型指标
   */
  private async collectTypeMetrics(files: string[], tsConfig: any): Promise<TypeSafetyMetrics> {
    let totalFiles = 0;
    let typeScriptFiles = 0;
    let anyUsage = 0;
    let unknownUsage = 0;
    let explicitTypes = 0;
    let inferredTypes = 0;
    let interfaceCount = 0;
    let typeAliasCount = 0;
    let enumCount = 0;
    let genericUsage = 0;
    let typeAssertions = 0;
    let nonNullAssertions = 0;
    let typeIgnoreComments = 0;

    for (const file of files) {
      totalFiles++;

      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        typeScriptFiles++;

        const content = await fs.promises.readFile(file, 'utf-8');
        const analysis = this.analyzeFileTypes(content);

        anyUsage += analysis.anyUsage;
        unknownUsage += analysis.unknownUsage;
        explicitTypes += analysis.explicitTypes;
        inferredTypes += analysis.inferredTypes;
        interfaceCount += analysis.interfaceCount;
        typeAliasCount += analysis.typeAliasCount;
        enumCount += analysis.enumCount;
        genericUsage += analysis.genericUsage;
        typeAssertions += analysis.typeAssertions;
        nonNullAssertions += analysis.nonNullAssertions;
        typeIgnoreComments += analysis.typeIgnoreComments;
      }
    }

    const typeScriptCoverage = totalFiles > 0 ? (typeScriptFiles / totalFiles) * 100 : 0;

    return {
      totalFiles,
      typeScriptFiles,
      typeScriptCoverage,
      anyUsage,
      unknownUsage,
      explicitTypes,
      inferredTypes,
      interfaceCount,
      typeAliasCount,
      enumCount,
      genericUsage,
      typeAssertions,
      nonNullAssertions,
      typeIgnoreComments,
      strictModeEnabled: tsConfig?.compilerOptions?.strict === true,
      noImplicitAny: tsConfig?.compilerOptions?.noImplicitAny !== false,
      strictNullChecks: tsConfig?.compilerOptions?.strictNullChecks !== false,
      strictFunctionTypes: tsConfig?.compilerOptions?.strictFunctionTypes !== false,
    };
  }

  /**
   * 分析单个文件的类型使用
   */
  private analyzeFileTypes(content: string) {
    const lines = content.split('\n');
    let anyUsage = 0;
    let unknownUsage = 0;
    let explicitTypes = 0;
    const inferredTypes = 0;
    let interfaceCount = 0;
    let typeAliasCount = 0;
    let enumCount = 0;
    let genericUsage = 0;
    let typeAssertions = 0;
    let nonNullAssertions = 0;
    let typeIgnoreComments = 0;

    for (const line of lines) {
      // 计算 any 使用
      const anyMatches = line.match(/:\s*any\b/g);
      if (anyMatches) anyUsage += anyMatches.length;

      // 计算 unknown 使用
      const unknownMatches = line.match(/:\s*unknown\b/g);
      if (unknownMatches) unknownUsage += unknownMatches.length;

      // 计算显式类型
      const explicitMatches = line.match(/:\s*[A-Z][a-zA-Z0-9<>[\]|&\s]*[^=]/g);
      if (explicitMatches) explicitTypes += explicitMatches.length;

      // 计算接口定义
      if (line.match(/^\s*interface\s+/)) interfaceCount++;

      // 计算类型别名
      if (line.match(/^\s*type\s+\w+\s*=/)) typeAliasCount++;

      // 计算枚举
      if (line.match(/^\s*enum\s+/)) enumCount++;

      // 计算泛型使用
      const genericMatches = line.match(/<[A-Z][a-zA-Z0-9,\s]*>/g);
      if (genericMatches) genericUsage += genericMatches.length;

      // 计算类型断言
      const assertionMatches = line.match(/as\s+[A-Z][a-zA-Z0-9<>[\]|&\s]*/g);
      if (assertionMatches) typeAssertions += assertionMatches.length;

      // 计算非空断言
      const nonNullMatches = line.match(/!\s*[.;)]/g);
      if (nonNullMatches) nonNullAssertions += nonNullMatches.length;

      // 计算类型忽略注释
      if (line.includes('@ts-ignore') || line.includes('@ts-expect-error')) {
        typeIgnoreComments++;
      }
    }

    return {
      anyUsage,
      unknownUsage,
      explicitTypes,
      inferredTypes,
      interfaceCount,
      typeAliasCount,
      enumCount,
      genericUsage,
      typeAssertions,
      nonNullAssertions,
      typeIgnoreComments,
    };
  }

  /**
   * 查找类型安全问题
   */
  private async findTypeIssues(files: string[]): Promise<TypeSafetyIssue[]> {
    const issues: TypeSafetyIssue[] = [];

    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = await fs.promises.readFile(file, 'utf-8');
        const fileIssues = this.analyzeFileIssues(content, file);
        issues.push(...fileIssues);
      }
    }

    return issues;
  }

  /**
   * 分析文件中的类型问题
   */
  private analyzeFileIssues(content: string, filePath: string): TypeSafetyIssue[] {
    const issues: TypeSafetyIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 检查 any 使用
      const anyMatch = line.match(/:\s*any\b/);
      if (anyMatch) {
        issues.push({
          file: filePath,
          line: lineNumber,
          column: line.indexOf(anyMatch[0]) + 1,
          type: 'any-usage',
          severity: 'warning',
          message: 'Use of "any" type reduces type safety',
          suggestion: 'Replace "any" with specific type or "unknown"',
          autoFixable: false,
        });
      }

      // 检查类型断言
      const assertionMatch = line.match(/as\s+[A-Z][a-zA-Z0-9<>[\]|&\s]*/);
      if (assertionMatch) {
        issues.push({
          file: filePath,
          line: lineNumber,
          column: line.indexOf(assertionMatch[0]) + 1,
          type: 'type-assertion',
          severity: 'info',
          message: 'Type assertion bypasses type checking',
          suggestion: 'Consider using type guards or proper typing',
          autoFixable: false,
        });
      }

      // 检查非空断言
      const nonNullMatch = line.match(/!\s*[.;)]/);
      if (nonNullMatch) {
        issues.push({
          file: filePath,
          line: lineNumber,
          column: line.indexOf(nonNullMatch[0]) + 1,
          type: 'non-null-assertion',
          severity: 'warning',
          message: 'Non-null assertion can cause runtime errors',
          suggestion: 'Add proper null checks or use optional chaining',
          autoFixable: false,
        });
      }

      // 检查缺少类型的函数参数
      const functionMatch = line.match(/function\s+\w+\s*\([^)]*\w+[^:)]*\)/);
      if (functionMatch) {
        issues.push({
          file: filePath,
          line: lineNumber,
          column: line.indexOf(functionMatch[0]) + 1,
          type: 'missing-type',
          severity: 'error',
          message: 'Function parameter missing type annotation',
          suggestion: 'Add type annotations to function parameters',
          autoFixable: false,
        });
      }

      // 检查不安全的类型转换
      const unsafeCastMatch = line.match(/<[^>]+>\s*\w+/);
      if (unsafeCastMatch && !line.includes('React.')) {
        issues.push({
          file: filePath,
          line: lineNumber,
          column: line.indexOf(unsafeCastMatch[0]) + 1,
          type: 'unsafe-cast',
          severity: 'warning',
          message: 'Unsafe type casting detected',
          suggestion: 'Use type guards or proper type checking',
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * 生成类型安全建议
   */
  private generateTypeRecommendations(
    metrics: TypeSafetyMetrics,
    issues: TypeSafetyIssue[],
  ): string[] {
    const recommendations: string[] = [];

    // TypeScript覆盖率建议
    if (metrics.typeScriptCoverage < 95) {
      recommendations.push(
        `Increase TypeScript coverage from ${metrics.typeScriptCoverage.toFixed(1)}% to 95%+`,
      );
    }

    // any 使用建议
    if (metrics.anyUsage > 0) {
      recommendations.push(
        `Replace ${metrics.anyUsage} instances of "any" type with specific types`,
      );
    }

    // 严格模式建议
    if (!metrics.strictModeEnabled) {
      recommendations.push('Enable strict mode in tsconfig.json for better type safety');
    }

    if (!metrics.noImplicitAny) {
      recommendations.push('Enable noImplicitAny compiler option');
    }

    if (!metrics.strictNullChecks) {
      recommendations.push('Enable strictNullChecks for null safety');
    }

    // 类型断言建议
    if (metrics.typeAssertions > 10) {
      recommendations.push(
        `Reduce type assertions (${metrics.typeAssertions} found) by improving type definitions`,
      );
    }

    // 非空断言建议
    if (metrics.nonNullAssertions > 5) {
      recommendations.push(
        `Reduce non-null assertions (${metrics.nonNullAssertions} found) by adding proper null checks`,
      );
    }

    // 类型定义建议
    if (metrics.interfaceCount < metrics.typeScriptFiles * 0.5) {
      recommendations.push('Add more interface definitions for better type documentation');
    }

    // 基于问题的建议
    const errorCount = issues.filter(i => i.severity === 'error').length;
    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} type errors immediately`);
    }

    const warningCount = issues.filter(i => i.severity === 'warning').length;
    if (warningCount > 10) {
      recommendations.push(`Address ${warningCount} type safety warnings`);
    }

    return recommendations;
  }

  /**
   * 创建运行时类型验证器
   */
  createRuntimeValidator(): RuntimeTypeValidator {
    return {
      validate: <T>(value: unknown, schema: TypeSchema<T>): value is T => {
        return this.validateValue(value, schema);
      },

      createValidator: <T>(schema: TypeSchema<T>) => {
        return (value: unknown): value is T => {
          return this.validateValue(value, schema);
        };
      },

      generateSchema: <T>(type: T): TypeSchema<T> => {
        return this.generateSchemaFromValue(type);
      },
    };
  }

  /**
   * 验证值是否符合模式
   */
  private validateValue(value: unknown, schema: TypeSchema<any>): boolean {
    // 处理 null 和 undefined
    if (value === null) {
      return schema.nullable === true || schema.type === 'null';
    }

    if (value === undefined) {
      return schema.optional === true || schema.type === 'undefined';
    }

    // 基本类型验证
    switch (schema.type) {
      case 'string':
        return typeof value === 'string';

      case 'number':
        return typeof value === 'number' && !isNaN(value);

      case 'boolean':
        return typeof value === 'boolean';

      case 'function':
        return typeof value === 'function';

      case 'object':
        if (typeof value !== 'object' || value === null) return false;

        // 验证对象属性
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            const propValue = (value as any)[key];
            const isRequired = schema.required?.includes(key as any);

            if (propValue === undefined && isRequired) {
              return false;
            }

            if (propValue !== undefined && !this.validateValue(propValue, propSchema)) {
              return false;
            }
          }
        }
        return true;

      case 'array':
        if (!Array.isArray(value)) return false;

        // 验证数组元素
        if (schema.items) {
          return value.every(item => this.validateValue(item, schema.items!));
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * 从值生成模式
   */
  private generateSchemaFromValue(value: any): TypeSchema<any> {
    if (value === null) {
      return { type: 'null' };
    }

    if (value === undefined) {
      return { type: 'undefined' };
    }

    const type = typeof value;

    switch (type) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'function':
        return { type };

      case 'object':
        if (Array.isArray(value)) {
          const itemSchema = value.length > 0
            ? this.generateSchemaFromValue(value[0])
            : { type: 'string' as const };

          return {
            type: 'array',
            items: itemSchema,
          };
        }

        const properties: any = {};
        const required: string[] = [];

        for (const [key, val] of Object.entries(value)) {
          properties[key] = this.generateSchemaFromValue(val);
          required.push(key);
        }

        return {
          type: 'object',
          properties,
          required,
        };

      default:
        return { type: 'string' };
    }
  }

  /**
   * 生成类型定义文件
   */
  async generateTypeDefinitions(apiResponses: Record<string, any>): Promise<string> {
    let typeDefinitions = '// Auto-generated type definitions\n\n';

    for (const [name, response] of Object.entries(apiResponses)) {
      const schema = this.generateSchemaFromValue(response);
      const typeDefinition = this.schemaToTypeScript(schema, name);
      typeDefinitions += typeDefinition + '\n\n';
    }

    return typeDefinitions;
  }

  /**
   * 将模式转换为TypeScript类型定义
   */
  private schemaToTypeScript(schema: TypeSchema<any>, name: string): string {
    const typeName = this.capitalize(name);

    switch (schema.type) {
      case 'object':
        let interfaceDefinition = `export interface ${typeName} {\n`;

        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            const isOptional = !schema.required?.includes(key);
            const propType = this.schemaToTypeScriptType(propSchema);
            interfaceDefinition += `  ${key}${isOptional ? '?' : ''}: ${propType};\n`;
          }
        }

        interfaceDefinition += '}';
        return interfaceDefinition;

      case 'array':
        const itemType = schema.items ? this.schemaToTypeScriptType(schema.items) : 'any';
        return `export type ${typeName} = ${itemType}[];`;

      default:
        const type = this.schemaToTypeScriptType(schema);
        return `export type ${typeName} = ${type};`;
    }
  }

  /**
   * 将模式转换为TypeScript类型字符串
   */
  private schemaToTypeScriptType(schema: TypeSchema<any>): string {
    let baseType: string;

    switch (schema.type) {
      case 'string':
        baseType = 'string';
        break;
      case 'number':
        baseType = 'number';
        break;
      case 'boolean':
        baseType = 'boolean';
        break;
      case 'function':
        baseType = 'Function';
        break;
      case 'null':
        baseType = 'null';
        break;
      case 'undefined':
        baseType = 'undefined';
        break;
      case 'array':
        const itemType = schema.items ? this.schemaToTypeScriptType(schema.items) : 'any';
        baseType = `${itemType}[]`;
        break;
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties)
            .map(([key, propSchema]) => {
              const isOptional = !schema.required?.includes(key);
              const propType = this.schemaToTypeScriptType(propSchema);
              return `${key}${isOptional ? '?' : ''}: ${propType}`;
            })
            .join('; ');
          baseType = `{ ${props} }`;
        } else {
          baseType = 'object';
        }
        break;
      default:
        baseType = 'any';
    }

    if (schema.nullable) {
      baseType += ' | null';
    }

    if (schema.optional) {
      baseType += ' | undefined';
    }

    return baseType;
  }

  /**
   * 辅助方法
   */
  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !this.shouldExcludeDirectory(entry.name)) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && this.isSourceFile(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    await scanDirectory(path.join(this.projectRoot, 'src'));
    return files;
  }

  private shouldExcludeDirectory(name: string): boolean {
    const excludeDirs = ['node_modules', '.next', 'dist', 'build', 'coverage'];
    return excludeDirs.includes(name);
  }

  private isSourceFile(name: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(name);
  }

  private async loadTsConfig(): Promise<any> {
    try {
      const content = await fs.promises.readFile(this.tsConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Could not load tsconfig.json:', error);
      return {};
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
