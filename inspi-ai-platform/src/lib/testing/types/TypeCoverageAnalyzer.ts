/**
 * Type Coverage Analyzer
 * 
 * Analyzes TypeScript type coverage across the project,
 * identifies untested types, and generates coverage reports.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export interface TypeCoverageConfig {
  sourceRoot: string;
  includePatterns: string[];
  excludePatterns: string[];
  testPatterns: string[];
  thresholds: {
    overall: number;
    perFile: number;
    perModule: number;
  };
  reportFormats: ('json' | 'html' | 'markdown')[];
  outputDir: string;
}

export interface TypeUsage {
  typeName: string;
  kind: ts.SyntaxKind;
  sourceFile: string;
  line: number;
  column: number;
  isTested: boolean;
  testFiles: string[];
  usageCount: number;
}

export interface ModuleCoverage {
  moduleName: string;
  totalTypes: number;
  testedTypes: number;
  coverage: number;
  types: TypeUsage[];
  uncoveredTypes: string[];
}

export interface FileCoverage {
  fileName: string;
  totalTypes: number;
  testedTypes: number;
  coverage: number;
  types: TypeUsage[];
  uncoveredTypes: string[];
}

export interface CoverageReport {
  timestamp: Date;
  overall: {
    totalTypes: number;
    testedTypes: number;
    coverage: number;
  };
  modules: ModuleCoverage[];
  files: FileCoverage[];
  uncoveredTypes: TypeUsage[];
  recommendations: CoverageRecommendation[];
  trends: CoverageTrend[];
}

export interface CoverageRecommendation {
  type: 'critical' | 'important' | 'suggestion';
  message: string;
  typeName?: string;
  fileName?: string;
  action: string;
}

export interface CoverageTrend {
  date: Date;
  coverage: number;
  totalTypes: number;
  testedTypes: number;
}

export class TypeCoverageAnalyzer {
  private config: TypeCoverageConfig;
  private program?: ts.Program;
  private typeChecker?: ts.TypeChecker;
  private typeUsages: Map<string, TypeUsage> = new Map();
  private testFiles: Set<string> = new Set();

  constructor(config: TypeCoverageConfig) {
    this.config = config;
  }

  /**
   * Initialize the analyzer
   */
  async initialize(): Promise<void> {
    const sourceFiles = await this.getSourceFiles();
    const testFiles = await this.getTestFiles();
    
    this.testFiles = new Set(testFiles);
    
    // Create TypeScript program
    this.program = ts.createProgram(sourceFiles, {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    });
    
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * Analyze type coverage
   */
  async analyze(): Promise<CoverageReport> {
    if (!this.program || !this.typeChecker) {
      throw new Error('Analyzer not initialized');
    }

    // Extract type definitions from source files
    await this.extractTypeDefinitions();
    
    // Analyze test coverage
    await this.analyzeTestCoverage();
    
    // Generate coverage report
    return this.generateReport();
  }

  /**
   * Extract type definitions from source files
   */
  private async extractTypeDefinitions(): Promise<void> {
    if (!this.program) return;

    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldAnalyzeFile(sourceFile.fileName)) {
        this.visitNode(sourceFile, sourceFile);
      }
    }
  }

  /**
   * Visit AST node to extract type information
   */
  private visitNode(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Extract type definitions
    if (this.isTypeDefinition(node)) {
      const typeUsage = this.extractTypeUsage(node, sourceFile);
      if (typeUsage) {
        this.typeUsages.set(typeUsage.typeName, typeUsage);
      }
    }

    // Recursively visit child nodes
    ts.forEachChild(node, child => this.visitNode(child, sourceFile));
  }

  /**
   * Check if node is a type definition
   */
  private isTypeDefinition(node: ts.Node): boolean {
    return ts.isInterfaceDeclaration(node) ||
           ts.isTypeAliasDeclaration(node) ||
           ts.isClassDeclaration(node) ||
           ts.isEnumDeclaration(node) ||
           ts.isFunctionDeclaration(node) ||
           ts.isVariableDeclaration(node);
  }

  /**
   * Extract type usage information
   */
  private extractTypeUsage(node: ts.Node, sourceFile: ts.SourceFile): TypeUsage | null {
    let typeName: string | undefined;
    
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || 
        ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
      typeName = node.name?.text;
    } else if (ts.isFunctionDeclaration(node)) {
      typeName = node.name?.text;
    } else if (ts.isVariableDeclaration(node)) {
      typeName = node.name.getText();
    }

    if (!typeName) return null;

    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    
    return {
      typeName,
      kind: node.kind,
      sourceFile: sourceFile.fileName,
      line: position.line + 1,
      column: position.character + 1,
      isTested: false,
      testFiles: [],
      usageCount: 0
    };
  }

  /**
   * Analyze test coverage for types
   */
  private async analyzeTestCoverage(): Promise<void> {
    for (const testFile of this.testFiles) {
      await this.analyzeTestFile(testFile);
    }
  }

  /**
   * Analyze individual test file
   */
  private async analyzeTestFile(testFilePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(testFilePath, 'utf8');
      
      // Find type references in test file
      for (const [typeName, typeUsage] of this.typeUsages) {
        if (this.isTypeTestedInFile(typeName, content)) {
          typeUsage.isTested = true;
          typeUsage.testFiles.push(testFilePath);
          typeUsage.usageCount++;
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze test file ${testFilePath}:`, error);
    }
  }

  /**
   * Check if type is tested in file
   */
  private isTypeTestedInFile(typeName: string, content: string): boolean {
    // Simple heuristic - look for type name in test content
    const patterns = [
      new RegExp(`\\b${typeName}\\b`, 'g'),
      new RegExp(`expect.*${typeName}`, 'g'),
      new RegExp(`describe.*${typeName}`, 'g'),
      new RegExp(`it.*${typeName}`, 'g'),
      new RegExp(`test.*${typeName}`, 'g')
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate coverage report
   */
  private generateReport(): CoverageReport {
    const totalTypes = this.typeUsages.size;
    const testedTypes = Array.from(this.typeUsages.values()).filter(t => t.isTested).length;
    const coverage = totalTypes > 0 ? (testedTypes / totalTypes) * 100 : 100;

    const uncoveredTypes = Array.from(this.typeUsages.values()).filter(t => !t.isTested);
    
    const modules = this.generateModuleCoverage();
    const files = this.generateFileCoverage();
    const recommendations = this.generateRecommendations(uncoveredTypes);
    const trends = this.loadCoverageTrends();

    return {
      timestamp: new Date(),
      overall: {
        totalTypes,
        testedTypes,
        coverage
      },
      modules,
      files,
      uncoveredTypes,
      recommendations,
      trends
    };
  }

  /**
   * Generate module-level coverage
   */
  private generateModuleCoverage(): ModuleCoverage[] {
    const moduleMap = new Map<string, TypeUsage[]>();

    // Group types by module
    for (const typeUsage of this.typeUsages.values()) {
      const moduleName = this.getModuleName(typeUsage.sourceFile);
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, []);
      }
      moduleMap.get(moduleName)!.push(typeUsage);
    }

    // Calculate coverage for each module
    return Array.from(moduleMap.entries()).map(([moduleName, types]) => {
      const totalTypes = types.length;
      const testedTypes = types.filter(t => t.isTested).length;
      const coverage = totalTypes > 0 ? (testedTypes / totalTypes) * 100 : 100;
      const uncoveredTypes = types.filter(t => !t.isTested).map(t => t.typeName);

      return {
        moduleName,
        totalTypes,
        testedTypes,
        coverage,
        types,
        uncoveredTypes
      };
    });
  }

  /**
   * Generate file-level coverage
   */
  private generateFileCoverage(): FileCoverage[] {
    const fileMap = new Map<string, TypeUsage[]>();

    // Group types by file
    for (const typeUsage of this.typeUsages.values()) {
      const fileName = typeUsage.sourceFile;
      if (!fileMap.has(fileName)) {
        fileMap.set(fileName, []);
      }
      fileMap.get(fileName)!.push(typeUsage);
    }

    // Calculate coverage for each file
    return Array.from(fileMap.entries()).map(([fileName, types]) => {
      const totalTypes = types.length;
      const testedTypes = types.filter(t => t.isTested).length;
      const coverage = totalTypes > 0 ? (testedTypes / totalTypes) * 100 : 100;
      const uncoveredTypes = types.filter(t => !t.isTested).map(t => t.typeName);

      return {
        fileName,
        totalTypes,
        testedTypes,
        coverage,
        types,
        uncoveredTypes
      };
    });
  }

  /**
   * Generate coverage recommendations
   */
  private generateRecommendations(uncoveredTypes: TypeUsage[]): CoverageRecommendation[] {
    const recommendations: CoverageRecommendation[] = [];

    // Critical: Core types without tests
    const coreTypes = uncoveredTypes.filter(t => 
      t.sourceFile.includes('/types/') || 
      t.sourceFile.includes('/models/')
    );

    for (const type of coreTypes) {
      recommendations.push({
        type: 'critical',
        message: `Core type '${type.typeName}' has no test coverage`,
        typeName: type.typeName,
        fileName: type.sourceFile,
        action: `Create unit tests for ${type.typeName} interface/type`
      });
    }

    // Important: Public API types
    const apiTypes = uncoveredTypes.filter(t => 
      t.sourceFile.includes('/api/') ||
      t.sourceFile.includes('Request') ||
      t.sourceFile.includes('Response')
    );

    for (const type of apiTypes) {
      recommendations.push({
        type: 'important',
        message: `API type '${type.typeName}' should have test coverage`,
        typeName: type.typeName,
        fileName: type.sourceFile,
        action: `Add integration tests for ${type.typeName} API type`
      });
    }

    // Suggestions: Other uncovered types
    const otherTypes = uncoveredTypes.filter(t => 
      !coreTypes.includes(t) && !apiTypes.includes(t)
    );

    for (const type of otherTypes.slice(0, 10)) { // Limit to top 10
      recommendations.push({
        type: 'suggestion',
        message: `Consider adding tests for '${type.typeName}'`,
        typeName: type.typeName,
        fileName: type.sourceFile,
        action: `Add test coverage for ${type.typeName}`
      });
    }

    return recommendations;
  }

  /**
   * Load coverage trends (placeholder)
   */
  private loadCoverageTrends(): CoverageTrend[] {
    // In a real implementation, this would load historical data
    return [];
  }

  /**
   * Get module name from file path
   */
  private getModuleName(filePath: string): string {
    const relativePath = path.relative(this.config.sourceRoot, filePath);
    const parts = relativePath.split(path.sep);
    
    if (parts.length > 1) {
      return parts[0];
    }
    
    return 'root';
  }

  /**
   * Check if file should be analyzed
   */
  private shouldAnalyzeFile(fileName: string): boolean {
    // Skip node_modules and test files
    if (fileName.includes('node_modules') || this.testFiles.has(fileName)) {
      return false;
    }

    // Check include patterns
    const included = this.config.includePatterns.some(pattern => 
      fileName.includes(pattern)
    );

    // Check exclude patterns
    const excluded = this.config.excludePatterns.some(pattern => 
      fileName.includes(pattern)
    );

    return included && !excluded;
  }

  /**
   * Get source files
   */
  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of this.config.includePatterns) {
      const patternFiles = await this.globFiles(pattern);
      files.push(...patternFiles);
    }

    return files.filter(file => 
      !this.config.excludePatterns.some(pattern => file.includes(pattern))
    );
  }

  /**
   * Get test files
   */
  private async getTestFiles(): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of this.config.testPatterns) {
      const patternFiles = await this.globFiles(pattern);
      files.push(...patternFiles);
    }

    return files;
  }

  /**
   * Simple glob implementation
   */
  private async globFiles(pattern: string): Promise<string[]> {
    // Simplified implementation - in real code, use a proper glob library
    const files: string[] = [];
    
    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile() && this.matchesPattern(fullPath, pattern)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore errors (e.g., permission denied)
      }
    };

    const baseDir = pattern.includes('*') 
      ? pattern.substring(0, pattern.indexOf('*'))
      : path.dirname(pattern);
      
    walkDir(baseDir);
    
    return files;
  }

  /**
   * Check if file matches pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple pattern matching - in real code, use a proper glob matcher
    if (pattern.includes('**')) {
      const basePattern = pattern.replace('**/', '').replace('**', '');
      return filePath.includes(basePattern) || filePath.endsWith(basePattern);
    }
    
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    
    return filePath.includes(pattern);
  }

  /**
   * Export coverage report
   */
  async exportReport(report: CoverageReport, format: 'json' | 'html' | 'markdown'): Promise<string> {
    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const fileName = `type-coverage-${timestamp}.${format}`;
    const filePath = path.join(this.config.outputDir, fileName);

    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
      case 'html':
        content = this.generateHtmlReport(report);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(report);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: CoverageReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Type Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .coverage-bar { background: #ddd; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { background: #4caf50; height: 100%; transition: width 0.3s; }
        .low-coverage { background: #f44336; }
        .medium-coverage { background: #ff9800; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .uncovered { color: #f44336; }
        .covered { color: #4caf50; }
    </style>
</head>
<body>
    <h1>Type Coverage Report</h1>
    <div class="summary">
        <h2>Overall Coverage: ${report.overall.coverage.toFixed(1)}%</h2>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${report.overall.coverage}%"></div>
        </div>
        <p>Tested Types: ${report.overall.testedTypes} / ${report.overall.totalTypes}</p>
        <p>Generated: ${report.timestamp.toLocaleString()}</p>
    </div>

    <h2>Module Coverage</h2>
    <table>
        <tr><th>Module</th><th>Coverage</th><th>Tested/Total</th><th>Uncovered Types</th></tr>
        ${report.modules.map(module => `
            <tr>
                <td>${module.moduleName}</td>
                <td>${module.coverage.toFixed(1)}%</td>
                <td>${module.testedTypes}/${module.totalTypes}</td>
                <td class="uncovered">${module.uncoveredTypes.join(', ')}</td>
            </tr>
        `).join('')}
    </table>

    <h2>Recommendations</h2>
    <ul>
        ${report.recommendations.map(rec => `
            <li class="${rec.type}">
                <strong>${rec.type.toUpperCase()}:</strong> ${rec.message}
                <br><em>Action: ${rec.action}</em>
            </li>
        `).join('')}
    </ul>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(report: CoverageReport): string {
    return `# Type Coverage Report

## Summary

- **Overall Coverage:** ${report.overall.coverage.toFixed(1)}%
- **Tested Types:** ${report.overall.testedTypes} / ${report.overall.totalTypes}
- **Generated:** ${report.timestamp.toLocaleString()}

## Module Coverage

| Module | Coverage | Tested/Total | Uncovered Types |
|--------|----------|--------------|-----------------|
${report.modules.map(module => 
  `| ${module.moduleName} | ${module.coverage.toFixed(1)}% | ${module.testedTypes}/${module.totalTypes} | ${module.uncoveredTypes.join(', ')} |`
).join('\n')}

## Recommendations

${report.recommendations.map(rec => 
  `- **${rec.type.toUpperCase()}:** ${rec.message}\n  - Action: ${rec.action}`
).join('\n\n')}

## Uncovered Types

${report.uncoveredTypes.map(type => 
  `- \`${type.typeName}\` in ${type.sourceFile}:${type.line}`
).join('\n')}
`;
  }
}

/**
 * Create type coverage analyzer
 */
export function createTypeCoverageAnalyzer(config: TypeCoverageConfig): TypeCoverageAnalyzer {
  return new TypeCoverageAnalyzer(config);
}