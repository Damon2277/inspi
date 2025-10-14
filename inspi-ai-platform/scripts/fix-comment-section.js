#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/community/CommentSection.tsx');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 替换所有的 setComments(prev => prev.map 为直接使用状态值
  content = content.replace(/setComments\(prev => prev\.map\(comment =>/g,
    'const updatedComments = comments.map((comment: any) =>');
  content = content.replace(/setComments\(\(prev: any\) => prev\.map\(\(comment:
    any\) =>/g, 'const updatedComments = comments.map((comment: any) =>');
  
  // 替换结束的 })) 为 })，然后添加 setComments 调用
  let mapCount = 0;
  content = content.replace(/}\)\)/g, (match) => {
    mapCount++;
    return `})
        setComments(updatedComments${mapCount > 1 ? mapCount : ''})`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log('✅ 修复了CommentSection中的TypeScript错误');
} else {
  console.log('❌ 文件不存在:', filePath);
}