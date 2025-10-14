/**
 * 仪式感设计系统 - 架构分析工具
 */

const fs = require('fs');
const path = require('path');

class ArchitectureAnalyzer {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.analysis = {
      timestamp: new Date().toISOString(),
      structure: {},
      metrics: {},
      dependencies: {},
      quality: {}
    };
  }

  /**
   * 执行完整的架构分析
   */
  async analyzeArchitecture() {
    console.log('🔍 开始架构分析...');
    
    // 1. 分析目录结构
    this.analyzeDirectoryStructure();
    
    // 2. 分析文件组织
    this.analyzeFileOrganization();
    
    // 3. 分析模块依赖
    this.analyzeDependencies();
    
    // 4. 分析代码质量指标
    this.analyzeCodeQuality();
    
    // 5. 生成架构报告
    return this.generateArchitectureReport();
  }

  /**
   * 分析目录结构
   */
  analyzeDirectoryStructure() {
    console.log('📁 分析目录结构...');
    
    const structure = this.scanDirectory(this.rootPath);
    this.analysis.structure = {
      totalDirectories: this.countDirectories(structure),
      totalFiles: this.countFiles(structure),
      maxDepth: this.calculateMaxDepth(structure),
      moduleCount: this.countModules(structure),
      testCoverage: this.calculateTestCoverage(structure),
      tree: structure
    };
  }

  /**
   * 扫描目录
   */
  scanDirectory(dirPath, depth = 0) {
    const items = [];
    
    try {
      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(this.rootPath, fullPath);
        
        if (stat.isDirectory()) {
          items.push({
            type: 'directory',
            name: entry,
            path: relativePath,
            depth,
            children: depth < 3 ? this.scanDirectory(fullPath, depth + 1) : []
          });
        } else {
          items.push({
            type: 'file',
            name: entry,
            path: relativePath,
            depth,
            size: stat.size,
            extension: path.extname(entry),
            isTest: this.isTestFile(entry),
            isConfig: this.isConfigFile(entry),
            isDoc: this.isDocFile(entry)
          });
        }
      }
    } catch (error) {
      console.warn(`无法读取目录 ${dirPath}:`, error.message);
    }
    
    return items;
  }

  /**
   * 分析文件组织
   */
  analyzeFileOrganization() {
    console.log('📄 分析文件组织...');
    
    const files = this.getAllFiles(this.analysis.structure.tree);
    
    this.analysis.metrics.fileOrganization = {
      totalFiles: files.length,
      byExtension: this.groupFilesByExtension(files),
      byType: this.groupFilesByType(files),
      averageFileSize: this.calculateAverageFileSize(files),
      largestFiles: this.findLargestFiles(files, 5),
      namingConsistency: this.analyzeNamingConsistency(files)
    };
  }

  /**
   * 分析模块依赖
   */
  analyzeDependencies() {
    console.log('🔗 分析模块依赖...');
    
    const tsFiles = this.getAllFiles(this.analysis.structure.tree)
      .filter(f => f.extension === '.ts' && !f.isTest);
    
    const dependencies = {};
    const imports = {};
    
    for (const file of tsFiles) {
      try {
        const content = fs.readFileSync(path.join(this.rootPath, file.path), 'utf-8');
        const fileImports = this.extractImports(content);
        const fileExports = this.extractExports(content);
        
        imports[file.path] = fileImports;
        dependencies[file.path] = {
          imports: fileImports.length,
          exports: fileExports.length,
          complexity: this.calculateComplexity(content)
        };
      } catch (error) {
        console.warn(`无法分析文件 ${file.path}:`, error.message);
      }
    }
    
    this.analysis.dependencies = {
      moduleCount: Object.keys(dependencies).length,
      totalImports: Object.values(imports).flat().length,
      averageImports: this.calculateAverage(Object.values(dependencies).map(d => d.imports)),
      circularDependencies: this.detectCircularDependencies(imports),
      dependencyGraph: dependencies
    };
  }

  /**
   * 分析代码质量
   */
  analyzeCodeQuality() {
    console.log('✨ 分析代码质量...');
    
    const tsFiles = this.getAllFiles(this.analysis.structure.tree)
      .filter(f => f.extension === '.ts');
    
    let totalLines = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalInterfaces = 0;
    let totalComments = 0;
    
    for (const file of tsFiles) {
      try {
        const content = fs.readFileSync(path.join(this.rootPath, file.path), 'utf-8');
        const lines = content.split('\n');
        
        totalLines += lines.length;
        totalFunctions += (content.match(/function\s+\w+|=>\s*{|\w+\s*\(/g) || []).length;
        totalClasses += (content.match(/class\s+\w+/g) || []).length;
        totalInterfaces += (content.match(/interface\s+\w+/g) || []).length;
        totalComments += (content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length;
      } catch (error) {
        console.warn(`无法分析代码质量 ${file.path}:`, error.message);
      }
    }
    
    this.analysis.quality = {
      totalLines,
      totalFunctions,
      totalClasses,
      totalInterfaces,
      totalComments,
      commentRatio: totalComments / totalLines,
      averageFunctionsPerFile: totalFunctions / tsFiles.length,
      averageLinesPerFile: totalLines / tsFiles.length,
      typeScriptCoverage: tsFiles.length / this.analysis.metrics.fileOrganization.totalFiles
    };
  }

  /**
   * 生成架构报告
   */
  generateArchitectureReport() {
    const report = {
      summary: {
        analysisDate: this.analysis.timestamp,
        overallScore: this.calculateOverallScore(),
        recommendations: this.generateRecommendations()
      },
      structure: this.analysis.structure,
      metrics: this.analysis.metrics,
      dependencies: this.analysis.dependencies,
      quality: this.analysis.quality,
      visualization: this.generateVisualization()
    };
    
    return report;
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore() {
    const scores = {
      structure: this.scoreStructure(),
      organization: this.scoreOrganization(),
      dependencies: this.scoreDependencies(),
      quality: this.scoreQuality()
    };
    
    const weights = {
      structure: 0.25,
      organization: 0.25,
      dependencies: 0.25,
      quality: 0.25
    };
    
    const totalScore = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + (score * weights[key]);
    }, 0);
    
    return {
      total: Math.round(totalScore),
      breakdown: scores,
      grade: this.getGrade(totalScore)
    };
  }

  /**
   * 评分结构设计
   */
  scoreStructure() {
    const { totalDirectories, maxDepth, moduleCount } = this.analysis.structure;
    
    let score = 100;
    
    // 目录深度评分
    if (maxDepth > 4) score -= 10;
    if (maxDepth > 6) score -= 20;
    
    // 模块数量评分
    if (moduleCount < 3) score -= 15;
    if (moduleCount > 10) score -= 10;
    
    // 目录组织评分
    if (totalDirectories < 5) score -= 10;
    if (totalDirectories > 20) score -= 15;
    
    return Math.max(score, 0);
  }

  /**
   * 评分文件组织
   */
  scoreOrganization() {
    const { namingConsistency, averageFileSize } = this.analysis.metrics.fileOrganization;
    
    let score = 100;
    
    // 命名一致性评分
    if (namingConsistency < 0.8) score -= 20;
    if (namingConsistency < 0.6) score -= 30;
    
    // 文件大小评分
    if (averageFileSize > 10000) score -= 10; // 10KB
    if (averageFileSize > 50000) score -= 20; // 50KB
    
    return Math.max(score, 0);
  }

  /**
   * 评分依赖关系
   */
  scoreDependencies() {
    const { circularDependencies, averageImports } = this.analysis.dependencies;
    
    let score = 100;
    
    // 循环依赖评分
    if (circularDependencies.length > 0) score -= 30;
    
    // 平均导入数评分
    if (averageImports > 10) score -= 10;
    if (averageImports > 20) score -= 20;
    
    return Math.max(score, 0);
  }

  /**
   * 评分代码质量
   */
  scoreQuality() {
    const { commentRatio, typeScriptCoverage, averageLinesPerFile } = this.analysis.quality;
    
    let score = 100;
    
    // 注释比例评分
    if (commentRatio < 0.1) score -= 15;
    if (commentRatio < 0.05) score -= 25;
    
    // TypeScript覆盖率评分
    if (typeScriptCoverage < 0.8) score -= 20;
    if (typeScriptCoverage < 0.6) score -= 40;
    
    // 文件长度评分
    if (averageLinesPerFile > 500) score -= 10;
    if (averageLinesPerFile > 1000) score -= 20;
    
    return Math.max(score, 0);
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];
    const { structure, dependencies, quality } = this.analysis;
    
    // 结构建议
    if (structure.maxDepth > 4) {
      recommendations.push({
        type: 'structure',
        priority: 'medium',
        message: '目录层次过深，建议重新组织目录结构'
      });
    }
    
    // 依赖建议
    if (dependencies.circularDependencies.length > 0) {
      recommendations.push({
        type: 'dependencies',
        priority: 'high',
        message: '检测到循环依赖，需要重构模块关系'
      });
    }
    
    // 质量建议
    if (quality.commentRatio < 0.1) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: '代码注释不足，建议增加文档注释'
      });
    }
    
    if (quality.typeScriptCoverage < 0.9) {
      recommendations.push({
        type: 'quality',
        priority: 'low',
        message: '建议提高TypeScript覆盖率'
      });
    }
    
    return recommendations;
  }

  /**
   * 生成可视化数据
   */
  generateVisualization() {
    return {
      moduleStructure: this.generateModuleStructureData(),
      dependencyGraph: this.generateDependencyGraphData(),
      qualityMetrics: this.generateQualityMetricsData(),
      fileDistribution: this.generateFileDistributionData()
    };
  }

  // 辅助方法
  countDirectories(items) {
    let count = 0;
    for (const item of items) {
      if (item.type === 'directory') {
        count += 1 + this.countDirectories(item.children || []);
      }
    }
    return count;
  }

  countFiles(items) {
    let count = 0;
    for (const item of items) {
      if (item.type === 'file') {
        count++;
      } else if (item.children) {
        count += this.countFiles(item.children);
      }
    }
    return count;
  }

  calculateMaxDepth(items, currentDepth = 0) {
    let maxDepth = currentDepth;
    for (const item of items) {
      if (item.type === 'directory' && item.children) {
        const childDepth = this.calculateMaxDepth(item.children, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
    return maxDepth;
  }

  countModules(items) {
    let count = 0;
    for (const item of items) {
      if (item.type === 'directory' && 
          item.children && 
          item.children.some(child => child.name === 'index.ts')) {
        count++;
      }
      if (item.children) {
        count += this.countModules(item.children);
      }
    }
    return count;
  }

  calculateTestCoverage(items) {
    const allFiles = this.getAllFiles(items);
    const testFiles = allFiles.filter(f => f.isTest);
    return testFiles.length / Math.max(allFiles.length, 1);
  }

  getAllFiles(items) {
    let files = [];
    for (const item of items) {
      if (item.type === 'file') {
        files.push(item);
      } else if (item.children) {
        files = files.concat(this.getAllFiles(item.children));
      }
    }
    return files;
  }

  isTestFile(filename) {
    return filename.includes('.test.') || filename.includes('.spec.') || filename.includes('test-');
  }

  isConfigFile(filename) {
    return ['package.json', 'tsconfig.json', '.gitignore'].includes(filename) ||
           filename.endsWith('.config.js') || filename.endsWith('.config.ts');
  }

  isDocFile(filename) {
    return filename.endsWith('.md') || filename.endsWith('.txt');
  }

  groupFilesByExtension(files) {
    const groups = {};
    for (const file of files) {
      const ext = file.extension || 'no-extension';
      groups[ext] = (groups[ext] || 0) + 1;
    }
    return groups;
  }

  groupFilesByType(files) {
    return {
      source: files.filter(f => ['.ts', '.js'].includes(f.extension)).length,
      styles: files.filter(f => ['.css', '.scss', '.less'].includes(f.extension)).length,
      tests: files.filter(f => f.isTest).length,
      configs: files.filter(f => f.isConfig).length,
      docs: files.filter(f => f.isDoc).length,
      others: files.filter(f => 
        !['.ts', '.js', '.css', '.scss', '.less'].includes(f.extension) &&
        !f.isTest && !f.isConfig && !f.isDoc
      ).length
    };
  }

  calculateAverageFileSize(files) {
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    return totalSize / Math.max(files.length, 1);
  }

  findLargestFiles(files, count) {
    return files
      .filter(f => f.size)
      .sort((a, b) => b.size - a.size)
      .slice(0, count)
      .map(f => ({ name: f.name, size: f.size, path: f.path }));
  }

  analyzeNamingConsistency(files) {
    const patterns = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/,
      kebabCase: /^[a-z][a-z0-9-]*$/,
      PascalCase: /^[A-Z][a-zA-Z0-9]*$/
    };
    
    let consistentCount = 0;
    for (const file of files) {
      const nameWithoutExt = path.parse(file.name).name;
      const isConsistent = Object.values(patterns).some(pattern => pattern.test(nameWithoutExt));
      if (isConsistent) consistentCount++;
    }
    
    return consistentCount / Math.max(files.length, 1);
  }

  extractImports(content) {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  extractExports(content) {
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|interface|type|const|let|var)\s+(\w+)/g;
    const exports = [];
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  calculateComplexity(content) {
    // 简化的复杂度计算
    const lines = content.split('\n').length;
    const functions = (content.match(/function|=>/g) || []).length;
    const conditions = (content.match(/if|else|switch|case|for|while/g) || []).length;
    
    return lines + functions * 2 + conditions * 3;
  }

  detectCircularDependencies(imports) {
    // 简化的循环依赖检测
    const dependencies = {};
    
    for (const [file, fileImports] of Object.entries(imports)) {
      dependencies[file] = fileImports.filter(imp => imp.startsWith('.'));
    }
    
    // 这里应该实现更复杂的循环检测算法
    // 简化版本只检测直接的双向依赖
    const circular = [];
    
    for (const [file, deps] of Object.entries(dependencies)) {
      for (const dep of deps) {
        if (dependencies[dep] && dependencies[dep].includes(file)) {
          circular.push([file, dep]);
        }
      }
    }
    
    return circular;
  }

  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  getGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    return 'D';
  }

  generateModuleStructureData() {
    return {
      nodes: this.analysis.structure.tree.filter(item => item.type === 'directory'),
      edges: [], // 模块间关系
      metrics: {
        totalModules: this.analysis.structure.moduleCount,
        averageFilesPerModule: this.analysis.metrics.fileOrganization.totalFiles / this.analysis.structure.moduleCount
      }
    };
  }

  generateDependencyGraphData() {
    return {
      nodes: Object.keys(this.analysis.dependencies.dependencyGraph),
      edges: this.analysis.dependencies.circularDependencies,
      metrics: {
        totalDependencies: this.analysis.dependencies.totalImports,
        circularCount: this.analysis.dependencies.circularDependencies.length
      }
    };
  }

  generateQualityMetricsData() {
    return {
      codeLines: this.analysis.quality.totalLines,
      commentRatio: this.analysis.quality.commentRatio,
      typeScriptCoverage: this.analysis.quality.typeScriptCoverage,
      averageComplexity: this.analysis.quality.averageLinesPerFile
    };
  }

  generateFileDistributionData() {
    return {
      byExtension: this.analysis.metrics.fileOrganization.byExtension,
      byType: this.analysis.metrics.fileOrganization.byType,
      sizeDistribution: this.analysis.metrics.fileOrganization.largestFiles
    };
  }
}

// 主函数
async function analyzeRitualSystemArchitecture() {
  console.log('🎭 仪式感设计系统架构分析');
  console.log('='.repeat(50));
  
  const analyzer = new ArchitectureAnalyzer(path.join(__dirname, '..'));
  const report = await analyzer.analyzeArchitecture();
  
  // 输出分析结果
  console.log('\n📊 架构分析结果:');
  console.log(`总体评分: ${report.summary.overallScore.total}/100 (${report.summary.overallScore.grade})`);
  console.log('\n评分明细:');
  Object.entries(report.summary.overallScore.breakdown).forEach(([key, score]) => {
    console.log(`  ${key}: ${score}/100`);
  });
  
  console.log('\n📁 结构指标:');
  console.log(`  总目录数: ${report.structure.totalDirectories}`);
  console.log(`  总文件数: ${report.structure.totalFiles}`);
  console.log(`  最大深度: ${report.structure.maxDepth}`);
  console.log(`  模块数量: ${report.structure.moduleCount}`);
  console.log(`  测试覆盖: ${(report.structure.testCoverage * 100).toFixed(1)}%`);
  
  console.log('\n📄 文件组织:');
  console.log(`  平均文件大小: ${(report.metrics.fileOrganization.averageFileSize / 1024).toFixed(1)}KB`);
  console.log(`  命名一致性: ${(report.metrics.fileOrganization.namingConsistency * 100).toFixed(1)}%`);
  console.log('  文件类型分布:', report.metrics.fileOrganization.byType);
  
  console.log('\n🔗 依赖关系:');
  console.log(`  模块数量: ${report.dependencies.moduleCount}`);
  console.log(`  总导入数: ${report.dependencies.totalImports}`);
  console.log(`  平均导入: ${report.dependencies.averageImports.toFixed(1)}`);
  console.log(`  循环依赖: ${report.dependencies.circularDependencies.length}个`);
  
  console.log('\n✨ 代码质量:');
  console.log(`  总代码行数: ${report.quality.totalLines.toLocaleString()}`);
  console.log(`  注释比例: ${(report.quality.commentRatio * 100).toFixed(1)}%`);
  console.log(`  TypeScript覆盖: ${(report.quality.typeScriptCoverage * 100).toFixed(1)}%`);
  console.log(`  平均文件长度: ${report.quality.averageLinesPerFile.toFixed(0)}行`);
  
  if (report.summary.recommendations.length > 0) {
    console.log('\n💡 改进建议:');
    report.summary.recommendations.forEach(rec => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priority} ${rec.message}`);
    });
  } else {
    console.log('\n🎉 架构设计优秀，无需改进建议！');
  }
  
  // 保存详细报告
  const reportPath = path.join(__dirname, 'architecture-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  return report;
}

module.exports = { ArchitectureAnalyzer, analyzeRitualSystemArchitecture };

// 如果直接运行此文件
if (require.main === module) {
  analyzeRitualSystemArchitecture().catch(console.error);
}