#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 获取所有需要修复的文件
const filesToFix = [
  'src/components/community/WorkList.tsx',
  'src/components/contribution/ContributionChart.tsx',
  'src/components/contribution/ContributionHistory.tsx',
  'src/components/contribution/ContributionStats.tsx',
  'src/components/contribution/Leaderboard.tsx',
  'src/components/works/WorkEditor.tsx',
  'src/components/works/DraftsList.tsx'
];

function fixTypeScriptIssues(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 修复 setState 回调函数的隐式 any 类型
  // 将 setState(prev => ...) 替换为直接使用状态值
  const patterns = [
    // setWorks(prev => prev.map(...))
    {
      pattern: /setWorks\(prev => prev\.map\(([^)]+) =>/g,
      replacement: 'const updatedWorks = works.map(($1: any) =>'
    },
    // setWorks(prev => [...prev, ...items])
    {
      pattern: /setWorks\(prev => \[\.\.\.prev, \.\.\.([^)]+)\]\)/g,
      replacement: 'setWorks([...works, ...$1])'
    },
    // setPage(prev => prev + 1)
    {
      pattern: /setPage\(prev => prev \+ 1\)/g,
      replacement: 'setPage(page + 1)'
    },
    // setFilters(prev => ({ ...prev, [key]: value }))
    {
      pattern: /set(\w+)Filters?\(\(prev: any\) => \(\{/g,
      replacement: 'set$1Filters({'
    },
    // setData((prev: any) => ({ ...prev, ... }))
    {
      pattern: /set(\w+)\(\(prev: any\) => \(\{/g,
      replacement: 'set$1({'
    }
  ];
  
  patterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });
  
  // 修复结束的 })) 为 })，然后添加相应的 setState 调用
  if (content.includes('const updatedWorks = works.map')) {
    content = content.replace(/}\)\)/g, (match, offset) => {
      // 检查前面是否有 updatedWorks 的定义
      const beforeMatch = content.substring(0, offset);
      if (beforeMatch.includes('const updatedWorks = works.map')) {
        return `})
        setWorks(updatedWorks)`;
      }
      return match;
    });
    modified = true;
  }
  
  // 修复 ...prev 引用
  content = content.replace(/\.\.\.prev,/g, '...currentFilters,');
  content = content.replace(/\.\.\.prev\}/g, '...currentFilters}');
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    return true;
  }
  
  return false;
}

// 主函数
function main() {
  let fixedCount = 0;
  
  for (const file of filesToFix) {
    if (fixTypeScriptIssues(file)) {
      console.log(`✅ 修复了 ${file}`);
      fixedCount++;
    }
  }
  
  console.log(`\n总共修复了 ${fixedCount} 个文件`);
}

main();