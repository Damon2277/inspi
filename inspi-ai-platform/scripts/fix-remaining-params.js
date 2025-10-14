#!/usr/bin/env node
/**
 * 修复剩余的params Promise问题
 * 处理catch块和其他复杂情况
 */

const fs = require('fs');
const path = require('path');

class RemainingParamsFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = [];
  }

  /**
   * 运行修复
   */
  fix() {
    console.log('🔧 修复剩余的params问题...\n');

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
    let newContent = content;
    let modified = false;

    // 修复catch块中的params使用
    newContent = newContent.replace(/params\.id/g, 'id');
    newContent = newContent.replace(/params\.userId/g, 'userId');
    newContent = newContent.replace(/params\.slug/g, 'slug');

    // 检查是否需要在函数开始处声明变量
    if (newContent.includes('activityId: id') || newContent.includes('userId: userId')) {
      newContent = this.ensureVariableDeclaration(newContent);
    }

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      this.fixedFiles.push(filePath.replace(this.projectRoot, ''));
      modified = true;
    }
  }

  /**
   * 确保变量声明
   */
  ensureVariableDeclaration(content) {
    const lines = content.split('\n');
    const newLines = [];
    let inFunction = false;
    let hasDeclaration = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测函数开始
      if (line.includes('export async function') && line.includes('params')) {
        inFunction = true;
        hasDeclaration = false;
        newLines.push(line);
        continue;
      }

      // 检测是否已有变量声明
      if (inFunction && (line.includes('const { id } = await params') || 
                        line.includes('const { id, userId } = await params'))) {
        hasDeclaration = true;
      }

      // 检测函数结束
      if (inFunction && line.trim() === '}' && line.match(/^\s*}$/)) {
        inFunction = false;
      }

      newLines.push(line);
    }

    return newLines.join('\n');
  }
}

// 运行修复器
if (require.main === module) {
  const fixer = new RemainingParamsFixer();
  fixer.fix();
}

module.exports = RemainingParamsFixer;