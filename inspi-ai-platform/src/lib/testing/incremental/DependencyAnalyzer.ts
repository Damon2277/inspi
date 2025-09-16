import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface FileDependency {
  filePath: string;
  dependencies: string[];
  dependents: string[];
  type: 'source' | 'test' | 'config' | 'asset';
  lastModified: Date;
}

export interface DependencyGraph {
  nodes: Map<string, FileDependency>;
  edges: Map<string, Set<string>>; // file -> dependencies
  reverseEdges: Map<string, Set<string>>; // file -> dependents
}

export interface ImpactAnalysis {
  changedFiles: string[];
  directlyAffectedFiles: string[];
  transitivelyAffectedFiles: string[];
  affectedTestFiles: string[];
  testCoverage: Map<string, string[]>; // test file -> covered source files
}

/**
 * 依赖分析器
 * 分析代码依赖关系并确定变更影响范围
 */
export class DependencyAnalyzer {
  private projectRoot: string;
  private dependencyGraph: DependencyGraph;
  private tsConfigPath: string;
  private compilerOptions: ts.CompilerOptions;

  constructor(projectRoot: string, tsConfigPath?: string) {
    this.projectRoot = projectRoot;
    this.tsConfigPath = tsConfigPath || path.join(projectRoot, 'tsconfig.json');
    this.dependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
      reverseEdges: new Map()
    };
    
    this.loadCompilerOptions();
  }

  /**
   * 加载TypeScript编译选项
   */
  private loadCompilerOptions(): void {
    try {
      if (fs.existsSync(this.tsConfigPath)) {
        const configFile = ts.readConfigFile(this.tsConfigPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          path.dirname(this.tsConfigPath)
        );
        this.compilerOptions = parsedConfig.options;
      } else {
        this.compilerOptions = ts.getDefaultCompilerOptions();
      }
    } catch (error) {
      console.warn(`Failed to load TypeScript config: ${error.message}`);
      this.compilerOptions = ts.getDefaultCompilerOptions();
    }
  }

  /**
   * 构建依赖图
   */
  async buildDependencyGraph(includePatterns: string[] = ['**/*.{ts,tsx,js,jsx}']): Promise<void> {
    const files = await this.findFiles(includePatterns);
    
    // 第一遍：创建节点
    for (const filePath of files) {
      await this.addFileToGraph(filePath);
    }

    // 第二遍：建立依赖关系
    for (const filePath of files) {
      await this.analyzeDependencies(filePath);
    }
  }

  /**
   * 查找匹配的文件
   */
  private async findFiles(patterns: string[]): Promise<string[]> {
    const glob = require('glob');
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.next/**',
          '**/coverage/**'
        ]
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // 去重
  }

  /**
   * 添加文件到依赖图
   */
  private async addFileToGraph(filePath: string): Promise<void> {
    const relativePath = path.relative(this.projectRoot, filePath);
    const stats = fs.statSync(filePath);
    
    const dependency: FileDependency = {
      filePath: relativePath,
      dependencies: [],
      dependents: [],
      type: this.determineFileType(relativePath),
      lastModified: stats.mtime
    };

    this.dependencyGraph.nodes.set(relativePath, dependency);
    this.dependencyGraph.edges.set(relativePath, new Set());
    this.dependencyGraph.reverseEdges.set(relativePath, new Set());
  }

  /**
   * 确定文件类型
   */
  private determineFileType(filePath: string): FileDependency['type'] {
    if (this.isTestFile(filePath)) {
      return 'test';
    }
    
    if (this.isConfigFile(filePath)) {
      return 'config';
    }
    
    if (this.isAssetFile(filePath)) {
      return 'asset';
    }
    
    return 'source';
  }

  /**
   * 判断是否为测试文件
   */
  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /\/__tests__\//,
      /\/test\//,
      /\/tests\//
    ];

    return testPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 判断是否为配置文件
   */
  private isConfigFile(filePath: string): boolean {
    const configPatterns = [
      /^(jest|vitest|webpack|rollup|vite|next|tailwind)\.config\./,
      /^tsconfig.*\.json$/,
      /^package\.json$/,
      /^\.env/,
      /^\.eslintrc/,
      /^\.prettierrc/
    ];

    const fileName = path.basename(filePath);
    return configPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * 判断是否为资源文件
   */
  private isAssetFile(filePath: string): boolean {
    const assetExtensions = ['.css', '.scss', '.sass', '.less', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
    const ext = path.extname(filePath).toLowerCase();
    return assetExtensions.includes(ext);
  }

  /**
   * 分析文件依赖
   */
  private async analyzeDependencies(filePath: string): Promise<void> {
    const relativePath = path.relative(this.projectRoot, filePath);
    const absolutePath = path.resolve(this.projectRoot, relativePath);

    try {
      const content = fs.readFileSync(absolutePath, 'utf8');
      const dependencies = this.extractDependencies(content, relativePath);
      
      const node = this.dependencyGraph.nodes.get(relativePath);
      if (node) {
        node.dependencies = dependencies;
      }

      // 更新依赖图边
      const edges = this.dependencyGraph.edges.get(relativePath);
      if (edges) {
        edges.clear();
        dependencies.forEach(dep => edges.add(dep));
      }

      // 更新反向依赖
      dependencies.forEach(dep => {
        const reverseEdges = this.dependencyGraph.reverseEdges.get(dep);
        if (reverseEdges) {
          reverseEdges.add(relativePath);
        }
        
        const depNode = this.dependencyGraph.nodes.get(dep);
        if (depNode && !depNode.dependents.includes(relativePath)) {
          depNode.dependents.push(relativePath);
        }
      });

    } catch (error) {
      console.warn(`Failed to analyze dependencies for ${relativePath}: ${error.message}`);
    }
  }

  /**
   * 提取文件依赖
   */
  private extractDependencies(content: string, filePath: string): string[] {
    const dependencies: string[] = [];
    
    // 使用TypeScript AST解析
    if (this.isTypeScriptFile(filePath)) {
      dependencies.push(...this.extractTypeScriptDependencies(content, filePath));
    } else {
      // 使用正则表达式作为后备方案
      dependencies.push(...this.extractDependenciesWithRegex(content, filePath));
    }

    return this.resolveDependencies(dependencies, filePath);
  }

  /**
   * 判断是否为TypeScript文件
   */
  private isTypeScriptFile(filePath: string): boolean {
    return /\.(ts|tsx)$/.test(filePath);
  }

  /**
   * 使用TypeScript AST提取依赖
   */
  private extractTypeScriptDependencies(content: string, filePath: string): string[] {
    const dependencies: string[] = [];
    
    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            dependencies.push(moduleSpecifier.text);
          }
        } else if (ts.isCallExpression(node)) {
          // 处理动态导入 import() 和 require()
          if (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
              (ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
            const arg = node.arguments[0];
            if (arg && ts.isStringLiteral(arg)) {
              dependencies.push(arg.text);
            }
          }
        }
        
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } catch (error) {
      console.warn(`Failed to parse TypeScript file ${filePath}: ${error.message}`);
    }

    return dependencies;
  }

  /**
   * 使用正则表达式提取依赖
   */
  private extractDependenciesWithRegex(content: string, filePath: string): string[] {
    const dependencies: string[] = [];
    
    // ES6 imports
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // CommonJS requires
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // Dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // Re-exports
    const exportRegex = /export\s+(?:[\w\s{},*]+\s+)?from\s+['"]([^'"]+)['"]/g;
    while ((match = exportRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  /**
   * 解析依赖路径
   */
  private resolveDependencies(dependencies: string[], fromFile: string): string[] {
    const resolved: string[] = [];
    const fromDir = path.dirname(fromFile);

    for (const dep of dependencies) {
      // 跳过node_modules依赖
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        continue;
      }

      try {
        let resolvedPath: string;
        
        if (dep.startsWith('.')) {
          // 相对路径
          resolvedPath = path.resolve(this.projectRoot, fromDir, dep);
        } else {
          // 绝对路径
          resolvedPath = path.resolve(this.projectRoot, dep.substring(1));
        }

        // 尝试不同的扩展名
        const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        let foundFile = false;

        for (const ext of possibleExtensions) {
          const fullPath = resolvedPath + ext;
          if (fs.existsSync(fullPath)) {
            resolved.push(path.relative(this.projectRoot, fullPath));
            foundFile = true;
            break;
          }
        }

        // 检查是否为目录（查找index文件）
        if (!foundFile && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
          for (const ext of possibleExtensions) {
            const indexPath = path.join(resolvedPath, `index${ext}`);
            if (fs.existsSync(indexPath)) {
              resolved.push(path.relative(this.projectRoot, indexPath));
              foundFile = true;
              break;
            }
          }
        }

        // 如果文件存在但没有扩展名，直接添加
        if (!foundFile && fs.existsSync(resolvedPath)) {
          resolved.push(path.relative(this.projectRoot, resolvedPath));
        }

      } catch (error) {
        console.warn(`Failed to resolve dependency ${dep} from ${fromFile}: ${error.message}`);
      }
    }

    return resolved;
  }

  /**
   * 分析变更影响
   */
  analyzeImpact(changedFiles: string[]): ImpactAnalysis {
    const directlyAffectedFiles = new Set<string>();
    const transitivelyAffectedFiles = new Set<string>();
    const affectedTestFiles = new Set<string>();
    const testCoverage = new Map<string, string[]>();

    // 标准化文件路径
    const normalizedChangedFiles = changedFiles.map(file => 
      path.relative(this.projectRoot, path.resolve(this.projectRoot, file))
    );

    // 找到直接受影响的文件
    for (const changedFile of normalizedChangedFiles) {
      const dependents = this.dependencyGraph.reverseEdges.get(changedFile);
      if (dependents) {
        dependents.forEach(dependent => directlyAffectedFiles.add(dependent));
      }
    }

    // 找到传递受影响的文件
    const visited = new Set<string>();
    const queue = [...directlyAffectedFiles];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const dependents = this.dependencyGraph.reverseEdges.get(current);
      if (dependents) {
        dependents.forEach(dependent => {
          if (!visited.has(dependent)) {
            transitivelyAffectedFiles.add(dependent);
            queue.push(dependent);
          }
        });
      }
    }

    // 识别受影响的测试文件
    const allAffectedFiles = new Set([
      ...normalizedChangedFiles,
      ...directlyAffectedFiles,
      ...transitivelyAffectedFiles
    ]);

    for (const file of allAffectedFiles) {
      if (this.isTestFile(file)) {
        affectedTestFiles.add(file);
        
        // 分析测试覆盖的源文件
        const coveredFiles = this.getTestCoverage(file);
        testCoverage.set(file, coveredFiles);
      }
    }

    // 查找测试变更文件的源文件
    for (const changedFile of normalizedChangedFiles) {
      if (this.isTestFile(changedFile)) {
        affectedTestFiles.add(changedFile);
        const coveredFiles = this.getTestCoverage(changedFile);
        testCoverage.set(changedFile, coveredFiles);
      } else {
        // 查找测试这个源文件的测试文件
        const relatedTests = this.findTestsForSourceFile(changedFile);
        relatedTests.forEach(test => {
          affectedTestFiles.add(test);
          const coveredFiles = testCoverage.get(test) || [];
          if (!coveredFiles.includes(changedFile)) {
            coveredFiles.push(changedFile);
            testCoverage.set(test, coveredFiles);
          }
        });
      }
    }

    return {
      changedFiles: normalizedChangedFiles,
      directlyAffectedFiles: Array.from(directlyAffectedFiles),
      transitivelyAffectedFiles: Array.from(transitivelyAffectedFiles),
      affectedTestFiles: Array.from(affectedTestFiles),
      testCoverage
    };
  }

  /**
   * 获取测试文件覆盖的源文件
   */
  private getTestCoverage(testFile: string): string[] {
    const node = this.dependencyGraph.nodes.get(testFile);
    if (!node) return [];

    return node.dependencies.filter(dep => {
      const depNode = this.dependencyGraph.nodes.get(dep);
      return depNode && depNode.type === 'source';
    });
  }

  /**
   * 查找源文件对应的测试文件
   */
  private findTestsForSourceFile(sourceFile: string): string[] {
    const tests: string[] = [];
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const dirName = path.dirname(sourceFile);

    // 常见的测试文件命名模式
    const testPatterns = [
      `${baseName}.test.ts`,
      `${baseName}.test.tsx`,
      `${baseName}.spec.ts`,
      `${baseName}.spec.tsx`,
      path.join(dirName, '__tests__', `${baseName}.test.ts`),
      path.join(dirName, '__tests__', `${baseName}.test.tsx`),
      path.join(dirName, '__tests__', `${baseName}.spec.ts`),
      path.join(dirName, '__tests__', `${baseName}.spec.tsx`)
    ];

    for (const pattern of testPatterns) {
      if (this.dependencyGraph.nodes.has(pattern)) {
        tests.push(pattern);
      }
    }

    // 查找导入了这个源文件的测试文件
    const dependents = this.dependencyGraph.reverseEdges.get(sourceFile);
    if (dependents) {
      dependents.forEach(dependent => {
        if (this.isTestFile(dependent)) {
          tests.push(dependent);
        }
      });
    }

    return [...new Set(tests)]; // 去重
  }

  /**
   * 获取依赖图统计信息
   */
  getGraphStats(): {
    totalFiles: number;
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
    assetFiles: number;
    totalDependencies: number;
    averageDependencies: number;
  } {
    const nodes = Array.from(this.dependencyGraph.nodes.values());
    const totalFiles = nodes.length;
    const sourceFiles = nodes.filter(n => n.type === 'source').length;
    const testFiles = nodes.filter(n => n.type === 'test').length;
    const configFiles = nodes.filter(n => n.type === 'config').length;
    const assetFiles = nodes.filter(n => n.type === 'asset').length;
    const totalDependencies = nodes.reduce((sum, n) => sum + n.dependencies.length, 0);
    const averageDependencies = totalFiles > 0 ? totalDependencies / totalFiles : 0;

    return {
      totalFiles,
      sourceFiles,
      testFiles,
      configFiles,
      assetFiles,
      totalDependencies,
      averageDependencies
    };
  }

  /**
   * 导出依赖图为JSON
   */
  exportGraph(): any {
    const nodes = Array.from(this.dependencyGraph.nodes.entries()).map(([path, node]) => ({
      path,
      ...node,
      lastModified: node.lastModified.toISOString()
    }));

    const edges = Array.from(this.dependencyGraph.edges.entries()).map(([from, toSet]) => ({
      from,
      to: Array.from(toSet)
    }));

    return {
      nodes,
      edges,
      stats: this.getGraphStats()
    };
  }

  /**
   * 从JSON导入依赖图
   */
  importGraph(data: any): void {
    this.dependencyGraph.nodes.clear();
    this.dependencyGraph.edges.clear();
    this.dependencyGraph.reverseEdges.clear();

    // 导入节点
    for (const nodeData of data.nodes) {
      const node: FileDependency = {
        ...nodeData,
        lastModified: new Date(nodeData.lastModified)
      };
      this.dependencyGraph.nodes.set(nodeData.path, node);
    }

    // 导入边
    for (const edgeData of data.edges) {
      this.dependencyGraph.edges.set(edgeData.from, new Set(edgeData.to));
      
      // 重建反向边
      for (const to of edgeData.to) {
        if (!this.dependencyGraph.reverseEdges.has(to)) {
          this.dependencyGraph.reverseEdges.set(to, new Set());
        }
        this.dependencyGraph.reverseEdges.get(to)!.add(edgeData.from);
      }
    }
  }
}