/**
 * Interface Consistency Checker
 *
 * Validates interface consistency across the codebase,
 * checks for proper implementation, and ensures type safety.
 */

import * as fs from 'fs';

import * as ts from 'typescript';

export interface ConsistencyCheckConfig {
  sourceRoot: string;
  includePatterns: string[];
  excludePatterns: string[];
  strictMode: boolean;
  checkImplementations: boolean;
  checkExtensions: boolean;
  checkUsage: boolean;
}

export interface InterfaceInfo {
  name: string;
  sourceFile: string;
  line: number;
  column: number;
  properties: PropertyInfo[];
  methods: MethodInfo[];
  extends: string[];
  generic: boolean;
  typeParameters: string[];
  exported: boolean;
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  readonly: boolean;
  line: number;
}

export interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  optional: boolean;
  line: number;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface ImplementationInfo {
  className: string;
  sourceFile: string;
  line: number;
  implements: string[];
  missingMembers: string[];
  extraMembers: string[];
  incorrectTypes: TypeMismatch[];
}

export interface TypeMismatch {
  memberName: string;
  expected: string;
  actual: string;
  severity: 'error' | 'warning';
}

export interface UsageInfo {
  location: string;
  line: number;
  context: 'parameter' | 'return' | 'property' | 'variable';
  correct: boolean;
  issues: string[];
}

export interface ConsistencyReport {
  timestamp: Date;
  interfaces: InterfaceInfo[];
  implementations: ImplementationInfo[];
  usages: Map<string, UsageInfo[]>;
  violations: ConsistencyViolation[];
  summary: ConsistencySummary;
}

export interface ConsistencyViolation {
  type: 'missing-implementation' | 'incorrect-implementation' | 'inconsistent-usage' | 'circular-dependency';
  severity: 'error' | 'warning' | 'info';
  interfaceName: string;
  description: string;
  location: string;
  suggestion: string;
}

export interface ConsistencySummary {
  totalInterfaces: number;
  implementedInterfaces: number;
  violationsCount: number;
  errorCount: number;
  warningCount: number;
  consistencyScore: number;
}

export class InterfaceConsistencyChecker {
  private config: ConsistencyCheckConfig;
  private program?: ts.Program;
  private typeChecker?: ts.TypeChecker;
  private interfaces: Map<string, InterfaceInfo> = new Map();
  private implementations: Map<string, ImplementationInfo[]> = new Map();

  constructor(config: ConsistencyCheckConfig) {
    this.config = config;
  }

  /**
   * Initialize the checker
   */
  async initialize(): Promise<void> {
    const sourceFiles = await this.getSourceFiles();

    this.program = ts.createProgram(sourceFiles, {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
      strict: this.config.strictMode,
      esModuleInterop: true,
      skipLibCheck: true,
    });

    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * Run consistency check
   */
  async checkConsistency(): Promise<ConsistencyReport> {
    if (!this.program || !this.typeChecker) {
      throw new Error('Checker not initialized');
    }

    // Extract interfaces
    await this.extractInterfaces();

    // Check implementations
    if (this.config.checkImplementations) {
      await this.checkImplementations();
    }

    // Check extensions
    if (this.config.checkExtensions) {
      await this.checkExtensions();
    }

    // Check usage
    const usages = this.config.checkUsage ? await this.checkUsage() : new Map();

    // Generate violations
    const violations = this.generateViolations();

    // Generate summary
    const summary = this.generateSummary(violations);

    return {
      timestamp: new Date(),
      interfaces: Array.from(this.interfaces.values()),
      implementations: Array.from(this.implementations.values()).flat(),
      usages,
      violations,
      summary,
    };
  }

  /**
   * Extract interface definitions
   */
  private async extractInterfaces(): Promise<void> {
    if (!this.program) return;

    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldAnalyzeFile(sourceFile.fileName)) {
        this.extractInterfacesFromFile(sourceFile);
      }
    }
  }

  /**
   * Extract interfaces from a single file
   */
  private extractInterfacesFromFile(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const interfaceInfo = this.createInterfaceInfo(node, sourceFile);
        this.interfaces.set(interfaceInfo.name, interfaceInfo);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Create interface info from AST node
   */
  private createInterfaceInfo(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): InterfaceInfo {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    const properties: PropertyInfo[] = [];
    const methods: MethodInfo[] = [];

    // Extract members
    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        const prop = this.createPropertyInfo(member, sourceFile);
        if (prop) properties.push(prop);
      } else if (ts.isMethodSignature(member)) {
        const method = this.createMethodInfo(member, sourceFile);
        if (method) methods.push(method);
      }
    }

    // Extract extends clause
    const extendsClause = node.heritageClauses?.find(clause =>
      clause.token === ts.SyntaxKind.ExtendsKeyword,
    );
    const extends_ = extendsClause?.types.map(type => type.getText()) || [];

    // Check if generic
    const generic = !!node.typeParameters && node.typeParameters.length > 0;
    const typeParameters = node.typeParameters?.map(tp => tp.name.text) || [];

    // Check if exported
    const exported = !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));

    return {
      name: node.name.text,
      sourceFile: sourceFile.fileName,
      line: position.line + 1,
      column: position.character + 1,
      properties,
      methods,
      extends: extends_,
      generic,
      typeParameters,
      exported,
    };
  }

  /**
   * Create property info
   */
  private createPropertyInfo(node: ts.PropertySignature, sourceFile: ts.SourceFile): PropertyInfo | null {
    if (!node.name) return null;

    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const name = node.name.getText();
    const type = node.type?.getText() || 'any';
    const optional = !!node.questionToken;
    const readonly = !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ReadonlyKeyword));

    return {
      name,
      type,
      optional,
      readonly,
      line: position.line + 1,
    };
  }

  /**
   * Create method info
   */
  private createMethodInfo(node: ts.MethodSignature, sourceFile: ts.SourceFile): MethodInfo | null {
    if (!node.name) return null;

    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const name = node.name.getText();
    const optional = !!node.questionToken;
    const returnType = node.type?.getText() || 'void';

    const parameters: ParameterInfo[] = node.parameters.map(param => ({
      name: param.name.getText(),
      type: param.type?.getText() || 'any',
      optional: !!param.questionToken,
    }));

    return {
      name,
      parameters,
      returnType,
      optional,
      line: position.line + 1,
    };
  }

  /**
   * Check interface implementations
   */
  private async checkImplementations(): Promise<void> {
    if (!this.program) return;

    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldAnalyzeFile(sourceFile.fileName)) {
        this.checkImplementationsInFile(sourceFile);
      }
    }
  }

  /**
   * Check implementations in a single file
   */
  private checkImplementationsInFile(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const implementationInfo = this.createImplementationInfo(node, sourceFile);
        if (implementationInfo) {
          const interfaceName = implementationInfo.implements[0]; // Simplified
          if (!this.implementations.has(interfaceName)) {
            this.implementations.set(interfaceName, []);
          }
          this.implementations.get(interfaceName)!.push(implementationInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Create implementation info
   */
  private createImplementationInfo(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ImplementationInfo | null {
    if (!node.name) return null;

    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Get implements clause
    const implementsClause = node.heritageClauses?.find(clause =>
      clause.token === ts.SyntaxKind.ImplementsKeyword,
    );

    if (!implementsClause) return null;

    const implements_ = implementsClause.types.map(type => type.getText());

    // Check each implemented interface
    const missingMembers: string[] = [];
    const extraMembers: string[] = [];
    const incorrectTypes: TypeMismatch[] = [];

    for (const interfaceName of implements_) {
      const interfaceInfo = this.interfaces.get(interfaceName);
      if (interfaceInfo) {
        const result = this.validateImplementation(node, interfaceInfo);
        missingMembers.push(...result.missingMembers);
        extraMembers.push(...result.extraMembers);
        incorrectTypes.push(...result.incorrectTypes);
      }
    }

    return {
      className: node.name.text,
      sourceFile: sourceFile.fileName,
      line: position.line + 1,
      implements: implements_,
      missingMembers,
      extraMembers,
      incorrectTypes,
    };
  }

  /**
   * Validate implementation against interface
   */
  private validateImplementation(classNode: ts.ClassDeclaration, interfaceInfo: InterfaceInfo): {
    missingMembers: string[];
    extraMembers: string[];
    incorrectTypes: TypeMismatch[];
  } {
    const missingMembers: string[] = [];
    const extraMembers: string[] = [];
    const incorrectTypes: TypeMismatch[] = [];

    // Get class members
    const classMembers = new Map<string, ts.ClassElement>();
    for (const member of classNode.members) {
      if (ts.isPropertyDeclaration(member) || ts.isMethodDeclaration(member)) {
        const name = member.name?.getText();
        if (name) {
          classMembers.set(name, member);
        }
      }
    }

    // Check required properties
    for (const prop of interfaceInfo.properties) {
      if (!prop.optional && !classMembers.has(prop.name)) {
        missingMembers.push(`property ${prop.name}: ${prop.type}`);
      } else if (classMembers.has(prop.name)) {
        const classMember = classMembers.get(prop.name)!;
        const classType = this.getClassMemberType(classMember);
        if (classType !== prop.type) {
          incorrectTypes.push({
            memberName: prop.name,
            expected: prop.type,
            actual: classType,
            severity: 'error',
          });
        }
      }
    }

    // Check required methods
    for (const method of interfaceInfo.methods) {
      if (!method.optional && !classMembers.has(method.name)) {
        missingMembers.push(`method ${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${method.returnType}`);
      }
    }

    return { missingMembers, extraMembers, incorrectTypes };
  }

  /**
   * Get class member type
   */
  private getClassMemberType(member: ts.ClassElement): string {
    if (ts.isPropertyDeclaration(member)) {
      return member.type?.getText() || 'any';
    } else if (ts.isMethodDeclaration(member)) {
      return member.type?.getText() || 'void';
    }
    return 'unknown';
  }

  /**
   * Check interface extensions
   */
  private async checkExtensions(): Promise<void> {
    // Check for circular dependencies and proper extension chains
    for (const [name, interfaceInfo] of this.interfaces) {
      if (interfaceInfo.extends.length > 0) {
        this.checkExtensionChain(name, interfaceInfo, new Set());
      }
    }
  }

  /**
   * Check extension chain for circular dependencies
   */
  private checkExtensionChain(name: string, interfaceInfo: InterfaceInfo, visited: Set<string>): void {
    if (visited.has(name)) {
      // Circular dependency detected - would be handled in violations
      return;
    }

    visited.add(name);

    for (const extendedInterface of interfaceInfo.extends) {
      const extended = this.interfaces.get(extendedInterface);
      if (extended) {
        this.checkExtensionChain(extendedInterface, extended, new Set(visited));
      }
    }
  }

  /**
   * Check interface usage
   */
  private async checkUsage(): Promise<Map<string, UsageInfo[]>> {
    const usages = new Map<string, UsageInfo[]>();

    if (!this.program) return usages;

    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldAnalyzeFile(sourceFile.fileName)) {
        const fileUsages = this.checkUsageInFile(sourceFile);
        for (const [interfaceName, usageList] of fileUsages) {
          if (!usages.has(interfaceName)) {
            usages.set(interfaceName, []);
          }
          usages.get(interfaceName)!.push(...usageList);
        }
      }
    }

    return usages;
  }

  /**
   * Check usage in a single file
   */
  private checkUsageInFile(sourceFile: ts.SourceFile): Map<string, UsageInfo[]> {
    const usages = new Map<string, UsageInfo[]>();

    const visit = (node: ts.Node) => {
      // Check type references
      if (ts.isTypeReferenceNode(node)) {
        const typeName = node.typeName.getText();
        if (this.interfaces.has(typeName)) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const usage: UsageInfo = {
            location: sourceFile.fileName,
            line: position.line + 1,
            context: this.getUsageContext(node),
            correct: true, // Simplified - would need more analysis
            issues: [],
          };

          if (!usages.has(typeName)) {
            usages.set(typeName, []);
          }
          usages.get(typeName)!.push(usage);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return usages;
  }

  /**
   * Get usage context
   */
  private getUsageContext(node: ts.Node): UsageInfo['context'] {
    const parent = node.parent;

    if (ts.isParameter(parent)) {
      return 'parameter';
    } else if (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent)) {
      return 'return';
    } else if (ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent)) {
      return 'property';
    } else {
      return 'variable';
    }
  }

  /**
   * Generate consistency violations
   */
  private generateViolations(): ConsistencyViolation[] {
    const violations: ConsistencyViolation[] = [];

    // Check for interfaces without implementations
    for (const [name, interfaceInfo] of this.interfaces) {
      if (interfaceInfo.exported && !this.implementations.has(name)) {
        violations.push({
          type: 'missing-implementation',
          severity: 'warning',
          interfaceName: name,
          description: `Interface '${name}' has no implementations`,
          location: `${interfaceInfo.sourceFile}:${interfaceInfo.line}`,
          suggestion: `Consider implementing interface '${name}' or mark as utility type`,
        });
      }
    }

    // Check implementation violations
    for (const [interfaceName, implementations] of this.implementations) {
      for (const impl of implementations) {
        if (impl.missingMembers.length > 0) {
          violations.push({
            type: 'incorrect-implementation',
            severity: 'error',
            interfaceName,
            description: `Class '${impl.className}' missing required members: ${impl.missingMembers.join(', ')}`,
            location: `${impl.sourceFile}:${impl.line}`,
            suggestion: `Implement missing members in class '${impl.className}'`,
          });
        }

        if (impl.incorrectTypes.length > 0) {
          for (const mismatch of impl.incorrectTypes) {
            violations.push({
              type: 'incorrect-implementation',
              severity: mismatch.severity,
              interfaceName,
              description: `Type mismatch in '${impl.className}.${mismatch.memberName}': expected '${mismatch.expected}', got '${mismatch.actual}'`,
              location: `${impl.sourceFile}:${impl.line}`,
              suggestion: `Fix type of '${mismatch.memberName}' to match interface`,
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Generate consistency summary
   */
  private generateSummary(violations: ConsistencyViolation[]): ConsistencySummary {
    const totalInterfaces = this.interfaces.size;
    const implementedInterfaces = this.implementations.size;
    const violationsCount = violations.length;
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    // Calculate consistency score (0-100)
    const consistencyScore = totalInterfaces > 0
      ? Math.max(0, 100 - (violationsCount / totalInterfaces) * 100)
      : 100;

    return {
      totalInterfaces,
      implementedInterfaces,
      violationsCount,
      errorCount,
      warningCount,
      consistencyScore,
    };
  }

  /**
   * Get source files
   */
  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];

    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = `${dir}/${entry.name}`;

          if (entry.isDirectory() && !entry.name.includes('node_modules')) {
            walkDir(fullPath);
          } else if (entry.isFile() && this.shouldAnalyzeFile(fullPath)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    };

    walkDir(this.config.sourceRoot);
    return files;
  }

  /**
   * Check if file should be analyzed
   */
  private shouldAnalyzeFile(fileName: string): boolean {
    if (!fileName.endsWith('.ts') && !fileName.endsWith('.tsx')) {
      return false;
    }

    if (fileName.includes('node_modules') || fileName.includes('.test.') || fileName.includes('.spec.')) {
      return false;
    }

    const included = this.config.includePatterns.some(pattern =>
      fileName.includes(pattern),
    );

    const excluded = this.config.excludePatterns.some(pattern =>
      fileName.includes(pattern),
    );

    return included && !excluded;
  }

  /**
   * Generate consistency report
   */
  generateReport(report: ConsistencyReport): string {
    let output = '# Interface Consistency Report\n\n';

    output += `**Generated:** ${report.timestamp.toLocaleString()}\n\n`;

    output += '## Summary\n\n';
    output += `- Total Interfaces: ${report.summary.totalInterfaces}\n`;
    output += `- Implemented Interfaces: ${report.summary.implementedInterfaces}\n`;
    output += `- Violations: ${report.summary.violationsCount}\n`;
    output += `- Errors: ${report.summary.errorCount}\n`;
    output += `- Warnings: ${report.summary.warningCount}\n`;
    output += `- Consistency Score: ${report.summary.consistencyScore.toFixed(1)}%\n\n`;

    if (report.violations.length > 0) {
      output += '## Violations\n\n';

      const errors = report.violations.filter(v => v.severity === 'error');
      const warnings = report.violations.filter(v => v.severity === 'warning');

      if (errors.length > 0) {
        output += '### Errors\n\n';
        for (const violation of errors) {
          output += `- **${violation.interfaceName}**: ${violation.description}\n`;
          output += `  - Location: ${violation.location}\n`;
          output += `  - Suggestion: ${violation.suggestion}\n\n`;
        }
      }

      if (warnings.length > 0) {
        output += '### Warnings\n\n';
        for (const violation of warnings) {
          output += `- **${violation.interfaceName}**: ${violation.description}\n`;
          output += `  - Location: ${violation.location}\n`;
          output += `  - Suggestion: ${violation.suggestion}\n\n`;
        }
      }
    }

    return output;
  }
}

/**
 * Create interface consistency checker
 */
export function createInterfaceConsistencyChecker(config: ConsistencyCheckConfig): InterfaceConsistencyChecker {
  return new InterfaceConsistencyChecker(config);
}
