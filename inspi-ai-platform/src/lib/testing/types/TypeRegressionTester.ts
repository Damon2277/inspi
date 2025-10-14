/**
 * Type Regression Tester
 *
 * Detects breaking changes in TypeScript type definitions
 * and provides regression testing for type safety.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

export interface TypeSnapshot {
  version: string;
  timestamp: Date;
  checksum: string;
  types: TypeDefinition[];
  compilerOptions: ts.CompilerOptions;
}

export interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'class' | 'enum' | 'function';
  signature: string;
  location: SourceLocation;
  dependencies: string[];
  exported: boolean;
  generic: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface TypeChange {
  type: 'added' | 'removed' | 'modified' | 'moved';
  typeName: string;
  before?: TypeDefinition;
  after?: TypeDefinition;
  impact: ChangeImpact;
  description: string;
  breakingChange: boolean;
}

export interface ChangeImpact {
  level: 'none' | 'patch' | 'minor' | 'major';
  affectedTypes: string[];
  migrationRequired: boolean;
  migrationGuide?: string;
}

export interface RegressionTestResult {
  passed: boolean;
  changes: TypeChange[];
  breakingChanges: TypeChange[];
  summary: RegressionSummary;
  recommendations: string[];
}

export interface RegressionSummary {
  totalChanges: number;
  addedTypes: number;
  removedTypes: number;
  modifiedTypes: number;
  breakingChanges: number;
  impactLevel: 'none' | 'patch' | 'minor' | 'major';
}

export interface RegressionTestConfig {
  baselineSnapshot?: TypeSnapshot;
  snapshotPath: string;
  sourceRoot: string;
  includePatterns: string[];
  excludePatterns: string[];
  strictMode: boolean;
  allowedBreakingChanges: string[];
  compilerOptions: ts.CompilerOptions;
}

export class TypeRegressionTester {
  private config: RegressionTestConfig;
  private program?: ts.Program;
  private typeChecker?: ts.TypeChecker;

  constructor(config: RegressionTestConfig) {
    this.config = config;
  }

  /**
   * Initialize the regression tester
   */
  async initialize(): Promise<void> {
    const sourceFiles = await this.getSourceFiles();

    this.program = ts.createProgram(sourceFiles, this.config.compilerOptions);
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * Create a type snapshot
   */
  async createSnapshot(version: string): Promise<TypeSnapshot> {
    if (!this.program || !this.typeChecker) {
      throw new Error('Regression tester not initialized');
    }

    const types = await this.extractTypeDefinitions();
    const checksum = this.calculateChecksum(types);

    const snapshot: TypeSnapshot = {
      version,
      timestamp: new Date(),
      checksum,
      types,
      compilerOptions: this.config.compilerOptions,
    };

    // Save snapshot to file
    await this.saveSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Load baseline snapshot
   */
  async loadBaselineSnapshot(): Promise<TypeSnapshot | null> {
    if (this.config.baselineSnapshot) {
      return this.config.baselineSnapshot;
    }

    try {
      const snapshotPath = path.join(this.config.snapshotPath, 'baseline.json');
      const content = fs.readFileSync(snapshotPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Run regression test
   */
  async runRegressionTest(): Promise<RegressionTestResult> {
    const baseline = await this.loadBaselineSnapshot();
    if (!baseline) {
      throw new Error('No baseline snapshot found. Create one first using createSnapshot()');
    }

    const current = await this.createSnapshot('current');
    const changes = this.compareSnapshots(baseline, current);
    const breakingChanges = changes.filter(c => c.breakingChange);

    const summary: RegressionSummary = {
      totalChanges: changes.length,
      addedTypes: changes.filter(c => c.type === 'added').length,
      removedTypes: changes.filter(c => c.type === 'removed').length,
      modifiedTypes: changes.filter(c => c.type === 'modified').length,
      breakingChanges: breakingChanges.length,
      impactLevel: this.calculateImpactLevel(changes),
    };

    const recommendations = this.generateRecommendations(changes);
    const passed = this.evaluateTestResult(changes, breakingChanges);

    return {
      passed,
      changes,
      breakingChanges,
      summary,
      recommendations,
    };
  }

  /**
   * Extract type definitions from source files
   */
  private async extractTypeDefinitions(): Promise<TypeDefinition[]> {
    if (!this.program || !this.typeChecker) {
      throw new Error('Program not initialized');
    }

    const types: TypeDefinition[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldAnalyzeFile(sourceFile.fileName)) {
        const fileTypes = this.extractTypesFromFile(sourceFile);
        types.push(...fileTypes);
      }
    }

    return types;
  }

  /**
   * Extract types from a single file
   */
  private extractTypesFromFile(sourceFile: ts.SourceFile): TypeDefinition[] {
    const types: TypeDefinition[] = [];

    const visit = (node: ts.Node) => {
      if (this.isTypeDefinition(node)) {
        const typeDef = this.createTypeDefinition(node, sourceFile);
        if (typeDef) {
          types.push(typeDef);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return types;
  }

  /**
   * Check if node is a type definition
   */
  private isTypeDefinition(node: ts.Node): boolean {
    return ts.isInterfaceDeclaration(node) ||
           ts.isTypeAliasDeclaration(node) ||
           ts.isClassDeclaration(node) ||
           ts.isEnumDeclaration(node) ||
           ts.isFunctionDeclaration(node);
  }

  /**
   * Create type definition from AST node
   */
  private createTypeDefinition(node: ts.Node, sourceFile: ts.SourceFile): TypeDefinition | null {
    let name: string | undefined;
    let kind: TypeDefinition['kind'];
    let exported = false;
    let generic = false;
    let accessibility: TypeDefinition['accessibility'];

    // Extract name and kind
    if (ts.isInterfaceDeclaration(node)) {
      name = node.name.text;
      kind = 'interface';
      generic = !!node.typeParameters && node.typeParameters.length > 0;
    } else if (ts.isTypeAliasDeclaration(node)) {
      name = node.name.text;
      kind = 'type';
      generic = !!node.typeParameters && node.typeParameters.length > 0;
    } else if (ts.isClassDeclaration(node)) {
      name = node.name?.text;
      kind = 'class';
      generic = !!node.typeParameters && node.typeParameters.length > 0;
      accessibility = this.getAccessibility(node);
    } else if (ts.isEnumDeclaration(node)) {
      name = node.name.text;
      kind = 'enum';
    } else if (ts.isFunctionDeclaration(node)) {
      name = node.name?.text;
      kind = 'function';
      generic = !!node.typeParameters && node.typeParameters.length > 0;
    }

    if (!name) return null;

    // Check if exported
    exported = this.isExported(node);

    // Get signature
    const signature = this.getTypeSignature(node);

    // Get location
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const location: SourceLocation = {
      file: sourceFile.fileName,
      line: position.line + 1,
      column: position.character + 1,
    };

    // Get dependencies (simplified)
    const dependencies = this.extractDependencies(node);

    return {
      name,
      kind,
      signature,
      location,
      dependencies,
      exported,
      generic,
      accessibility,
    };
  }

  /**
   * Get type signature
   */
  private getTypeSignature(node: ts.Node): string {
    // Simplified signature extraction
    return node.getText().replace(/\s+/g, ' ').trim();
  }

  /**
   * Check if node is exported
   */
  private isExported(node: ts.Node): boolean {
    return !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));
  }

  /**
   * Get accessibility modifier
   */
  private getAccessibility(node: ts.ClassDeclaration): TypeDefinition['accessibility'] {
    const modifiers = node.modifiers;
    if (!modifiers) return 'public';

    if (modifiers.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword)) {
      return 'private';
    }
    if (modifiers.some(mod => mod.kind === ts.SyntaxKind.ProtectedKeyword)) {
      return 'protected';
    }
    return 'public';
  }

  /**
   * Extract type dependencies (simplified)
   */
  private extractDependencies(node: ts.Node): string[] {
    const dependencies: string[] = [];
    // This would need more sophisticated analysis in a real implementation
    return dependencies;
  }

  /**
   * Compare two snapshots
   */
  private compareSnapshots(baseline: TypeSnapshot, current: TypeSnapshot): TypeChange[] {
    const changes: TypeChange[] = [];
    const baselineTypes = new Map(baseline.types.map(t => [t.name, t]));
    const currentTypes = new Map(current.types.map(t => [t.name, t]));

    // Find added types
    for (const [name, type] of currentTypes) {
      if (!baselineTypes.has(name)) {
        changes.push({
          type: 'added',
          typeName: name,
          after: type,
          impact: this.calculateAddedTypeImpact(type),
          description: `Added ${type.kind} '${name}'`,
          breakingChange: false,
        });
      }
    }

    // Find removed types
    for (const [name, type] of baselineTypes) {
      if (!currentTypes.has(name)) {
        changes.push({
          type: 'removed',
          typeName: name,
          before: type,
          impact: this.calculateRemovedTypeImpact(type),
          description: `Removed ${type.kind} '${name}'`,
          breakingChange: type.exported,
        });
      }
    }

    // Find modified types
    for (const [name, currentType] of currentTypes) {
      const baselineType = baselineTypes.get(name);
      if (baselineType && !this.areTypesEqual(baselineType, currentType)) {
        const impact = this.calculateModifiedTypeImpact(baselineType, currentType);
        changes.push({
          type: 'modified',
          typeName: name,
          before: baselineType,
          after: currentType,
          impact,
          description: `Modified ${currentType.kind} '${name}'`,
          breakingChange: impact.level === 'major',
        });
      }
    }

    return changes;
  }

  /**
   * Check if two types are equal
   */
  private areTypesEqual(type1: TypeDefinition, type2: TypeDefinition): boolean {
    return type1.signature === type2.signature &&
           type1.kind === type2.kind &&
           type1.exported === type2.exported &&
           type1.generic === type2.generic;
  }

  /**
   * Calculate impact for added type
   */
  private calculateAddedTypeImpact(type: TypeDefinition): ChangeImpact {
    return {
      level: 'patch',
      affectedTypes: [],
      migrationRequired: false,
    };
  }

  /**
   * Calculate impact for removed type
   */
  private calculateRemovedTypeImpact(type: TypeDefinition): ChangeImpact {
    return {
      level: type.exported ? 'major' : 'patch',
      affectedTypes: type.dependencies,
      migrationRequired: type.exported,
      migrationGuide: type.exported ? `Replace usage of '${type.name}' with alternative implementation` : undefined,
    };
  }

  /**
   * Calculate impact for modified type
   */
  private calculateModifiedTypeImpact(before: TypeDefinition, after: TypeDefinition): ChangeImpact {
    // Simplified impact calculation
    let level: ChangeImpact['level'] = 'patch';

    if (before.exported !== after.exported) {
      level = 'major';
    } else if (before.kind !== after.kind) {
      level = 'major';
    } else if (before.signature !== after.signature) {
      level = before.exported ? 'minor' : 'patch';
    }

    return {
      level,
      affectedTypes: before.dependencies,
      migrationRequired: level === 'major',
      migrationGuide: level === 'major' ? `Update usage of '${before.name}' to match new signature` : undefined,
    };
  }

  /**
   * Calculate overall impact level
   */
  private calculateImpactLevel(changes: TypeChange[]): RegressionSummary['impactLevel'] {
    if (changes.some(c => c.impact.level === 'major')) {
      return 'major';
    }
    if (changes.some(c => c.impact.level === 'minor')) {
      return 'minor';
    }
    if (changes.some(c => c.impact.level === 'patch')) {
      return 'patch';
    }
    return 'none';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(changes: TypeChange[]): string[] {
    const recommendations: string[] = [];

    const breakingChanges = changes.filter(c => c.breakingChange);
    if (breakingChanges.length > 0) {
      recommendations.push(`Found ${breakingChanges.length} breaking changes. Consider major version bump.`);
    }

    const removedTypes = changes.filter(c => c.type === 'removed' && c.before?.exported);
    if (removedTypes.length > 0) {
      recommendations.push(`${removedTypes.length} exported types were removed. Provide migration guide.`);
    }

    const modifiedTypes = changes.filter(c => c.type === 'modified' && c.impact.level === 'major');
    if (modifiedTypes.length > 0) {
      recommendations.push(`${modifiedTypes.length} types have major changes. Update documentation.`);
    }

    if (changes.length === 0) {
      recommendations.push('No type changes detected. Safe to proceed.');
    }

    return recommendations;
  }

  /**
   * Evaluate test result
   */
  private evaluateTestResult(changes: TypeChange[], breakingChanges: TypeChange[]): boolean {
    if (this.config.strictMode && breakingChanges.length > 0) {
      return false;
    }

    // Check if breaking changes are allowed
    const disallowedBreakingChanges = breakingChanges.filter(change =>
      !this.config.allowedBreakingChanges.includes(change.typeName),
    );

    return disallowedBreakingChanges.length === 0;
  }

  /**
   * Calculate checksum
   */
  private calculateChecksum(types: TypeDefinition[]): string {
    const content = JSON.stringify(types.map(t => t.signature).sort());
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Save snapshot to file
   */
  private async saveSnapshot(snapshot: TypeSnapshot): Promise<void> {
    const fileName = `snapshot-${snapshot.version}-${snapshot.timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(this.config.snapshotPath, fileName);

    // Ensure directory exists
    if (!fs.existsSync(this.config.snapshotPath)) {
      fs.mkdirSync(this.config.snapshotPath, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');

    // Also save as baseline if it doesn't exist
    const baselinePath = path.join(this.config.snapshotPath, 'baseline.json');
    if (!fs.existsSync(baselinePath)) {
      fs.writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2), 'utf8');
    }
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
          const fullPath = path.join(dir, entry.name);

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
    // Must be TypeScript file
    if (!fileName.endsWith('.ts') && !fileName.endsWith('.tsx')) {
      return false;
    }

    // Skip test files and node_modules
    if (fileName.includes('.test.') || fileName.includes('.spec.') || fileName.includes('node_modules')) {
      return false;
    }

    // Check include patterns
    const included = this.config.includePatterns.some(pattern =>
      fileName.includes(pattern),
    );

    // Check exclude patterns
    const excluded = this.config.excludePatterns.some(pattern =>
      fileName.includes(pattern),
    );

    return included && !excluded;
  }

  /**
   * Generate regression report
   */
  generateReport(result: RegressionTestResult): string {
    let report = '# Type Regression Test Report\n\n';

    report += `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    report += '## Summary\n\n';
    report += `- Total Changes: ${result.summary.totalChanges}\n`;
    report += `- Added Types: ${result.summary.addedTypes}\n`;
    report += `- Removed Types: ${result.summary.removedTypes}\n`;
    report += `- Modified Types: ${result.summary.modifiedTypes}\n`;
    report += `- Breaking Changes: ${result.summary.breakingChanges}\n`;
    report += `- Impact Level: ${result.summary.impactLevel.toUpperCase()}\n\n`;

    if (result.breakingChanges.length > 0) {
      report += '## Breaking Changes\n\n';
      for (const change of result.breakingChanges) {
        report += `- **${change.typeName}** (${change.type}): ${change.description}\n`;
        if (change.impact.migrationGuide) {
          report += `  - Migration: ${change.impact.migrationGuide}\n`;
        }
      }
      report += '\n';
    }

    if (result.recommendations.length > 0) {
      report += '## Recommendations\n\n';
      for (const recommendation of result.recommendations) {
        report += `- ${recommendation}\n`;
      }
      report += '\n';
    }

    if (result.changes.length > 0) {
      report += '## All Changes\n\n';
      for (const change of result.changes) {
        const icon = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : '🔄';
        report += `${icon} **${change.typeName}** (${change.type}): ${change.description}\n`;
      }
    }

    return report;
  }
}

/**
 * Create type regression tester
 */
export function createTypeRegressionTester(config: RegressionTestConfig): TypeRegressionTester {
  return new TypeRegressionTester(config);
}
