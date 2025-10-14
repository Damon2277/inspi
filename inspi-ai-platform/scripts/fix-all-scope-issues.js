#!/usr/bin/env node

/**
 * 批量修复所有变量作用域问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 批量修复所有变量作用域问题...');

/**
 * 修复单个文件的作用域问题
 */
function fixScopeIssues(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 模式1: 修复 const { id } = await params 的作用域问题
  const pattern1 = /(\s+try\s*{\s*\n\s*)const\s*{\s*id\s*}\s*=\s*await\s+params/g;
  if (pattern1.test(content)) {
    content = content.replace(
      /(\s*{\s*params\s*}:\s*{\s*params:\s*Promise<[^>]+
        >\s*}\s*\)\s*{\s*)(try\s*{\s*\n\s*)const\s*{\s*id\s*}\s*=\s*await\s+params/g,
      '$1let id:
        string = \'\';\n  $2const resolvedParams = await params;\n    id = resolvedParams.id;'
    );
    modified = true;
  }
  
  // 模式2: 修复 const { id: activityId, userId } = await params 的作用域问题
  const pattern2 = /(\s+try\s*{\s*\n\s*)const\s*{\s*id:\s*activityId,
    \s*userId\s*}\s*=\s*await\s+params/g;
  if (pattern2.test(content)) {
    content = content.replace(
      /(\s*{\s*params\s*}:\s*{\s*params:\s*Promise<[^>]+>\s*}\s*\)\s*{\s*)(try\s*{\s*\n\s*)const\s*{\s*id:\s*activityId,\s*userId\s*}\s*=\s*await\s+params/g,
      '$1let activityId: string = \'\';\n  let userId: string = \'\';\n  $2const resolvedParams = await params;\n    activityId = resolvedParams.id;\n    userId = resolvedParams.userId;'
    );
    modified = true;
  }
  
  // 模式3: 修复其他类似的解构赋值
  const pattern3 = /(\s+try\s*{\s*\n\s*)const\s*{\s*([^}]+)\s*}\s*=\s*await\s+params/g;
  content = content.replace(pattern3, (match, tryBlock, destructured) => {
    // 解析解构的变量
    const vars = destructured.split(',').map(v => v.trim());
    const declarations = [];
    const assignments = [];
    
    vars.forEach(v => {
      if (v.includes(':')) {
        const [key, alias] = v.split(':').map(s => s.trim());
        declarations.push(`let ${alias}: string = '';`);
        assignments.push(`${alias} = resolvedParams.${key};`);
      } else {
        declarations.push(`let ${v}: string = '';`);
        assignments.push(`${v} = resolvedParams.${v};`);
      }
    });
    
    if (declarations.length > 0) {
      modified = true;
      return `  ${declarations.join('\\n  ')};\n${tryBlock}const resolvedParams =
        await params;\n    ${assignments.join('\\n    ')}`;
    }
    
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复作用域问题: ${filePath}`);
    return true;
  }
  
  return false;
}

/**
 * 主执行函数
 */
function main() {
  // 需要修复的文件列表
  const filesToFix = [
    'src/app/api/admin/activities/[id]/complete/route.ts',
    'src/app/api/admin/activities/[id]/leaderboard/route.ts',
    'src/app/api/admin/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/stats/route.ts'
  ];
  
  let fixedCount = 0;
  filesToFix.forEach(filePath => {
    if (fixScopeIssues(filePath)) {
      fixedCount++;
    }
  });
  
  console.log(`\\n✅ 作用域问题修复完成，共修复 ${fixedCount} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixScopeIssues };