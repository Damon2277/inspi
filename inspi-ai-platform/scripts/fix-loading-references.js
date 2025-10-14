#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/auth/RegisterForm.tsx');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 替换所有的 loading 为 isLoading，但不替换变量声明
  content = content.replace(/disabled={loading}/g, 'disabled={isLoading}');
  content = content.replace(/{loading \?/g, '{isLoading ?');
  
  fs.writeFileSync(filePath, content);
  console.log('✅ 修复了RegisterForm中的loading引用');
} else {
  console.log('❌ 文件不存在:', filePath);
}