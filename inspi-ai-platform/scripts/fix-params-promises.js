#!/usr/bin/env node
/**
 * 修复Next.js 15 params Promise问题
 * 自动修复API路由中的params使用
 */

const fs = require('fs');
const path = require('path');

class ParamsPromiseFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = [];
  }

  /**
   * 运行修复
   */
  fix() {
    console.log('🔧 开始修复params Promise问题...\n');

    const apiDir = path.join(this.projectRoot, 'src/app/api');
    this.processDirectory(apiDir);

    console.log(`✅ 修复完成，共处理 ${this.fixedFiles.length} 个文件:`);
    this.fixedFiles.forEach(file => {
      console.log(`   ✓ ${file}`);
    });
  }

  /**
   * 处理目录
   */
  processDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.processDirectory(fullPath);
      } else if (item === 'route.ts') {
        this.processRouteFile(fullPath);
      }
    });
  }

  /**
   * 处理路由文件
   */
  processRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;

    // 检查是否有params Promise问题
    if (this.hasParamsIssues(content)) {
      newContent = this.fixParamsIssues(content);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, newContent);
      this.fixedFiles.push(filePath.replace(this.projectRoot, ''));
    }
  }

  /**
   * 检查是否有params问题
   */
  hasParamsIssues(content) {
    // 检查是否有未await的params使用
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳过已经正确处理的行
      if (line.includes('await params')) continue;
      if (line.includes('const { id } = await params')) continue;
      if (line.includes('const resolvedParams = await params')) continue;
      
      // 检查有问题的params使用
      if (line.includes('params.id') || 
          line.includes('params.userId') || 
          line.includes('params.slug')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 修复params问题
   */
  fixParamsIssues(content) {
    const lines = content.split('\n');
    const newLines = [];
    let inFunction = false;
    let functionIndent = '';
    let paramsResolved = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测函数开始
      if (line.includes('export async function') && line.includes('params')) {
        inFunction = true;
        paramsResolved = false;
        functionIndent = line.match(/^(\s*)/)[1];
        newLines.push(line);
        continue;
      }

      // 检测函数结束
      if (inFunction && line.trim() === '}' && line.startsWith(functionIndent)) {
        inFunction = false;
        paramsResolved = false;
      }

      // 在函数内部处理params
      if (inFunction && !paramsResolved) {
        // 查找try块开始
        if (line.includes('try {')) {
          newLines.push(line);
          
          // 添加params解析
          const indent = line.match(/^(\s*)/)[1] + '  ';
          
          // 检查需要解析哪些参数
          const paramsNeeded = this.getParamsNeeded(content);
          if (paramsNeeded.length > 0) {
            const destructuring = paramsNeeded.join(', ');
            newLines.push(`${indent}const { ${destructuring} } = await params`);
            paramsResolved = true;
          }
          continue;
        }
      }

      // 替换params使用
      let modifiedLine = line;
      if (inFunction && paramsResolved) {
        modifiedLine = modifiedLine.replace(/params\.id/g, 'id');
        modifiedLine = modifiedLine.replace(/params\.userId/g, 'userId');
        modifiedLine = modifiedLine.replace(/params\.slug/g, 'slug');
      }

      newLines.push(modifiedLine);
    }

    return newLines.join('\n');
  }

  /**
   * 获取需要的参数
   */
  getParamsNeeded(content) {
    const params = [];
    
    if (content.includes('params.id')) {
      params.push('id');
    }
    if (content.includes('params.userId')) {
      params.push('userId');
    }
    if (content.includes('params.slug')) {
      params.push('slug');
    }
    
    return params;
  }
}

// 运行修复器
if (require.main === module) {
  const fixer = new ParamsPromiseFixer();
  fixer.fix();
}

module.exports = ParamsPromiseFixer;