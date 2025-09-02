#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 调试文件扫描
function debugScan() {
  const projectRoot = '.';
  const config = {
    includePatterns: [
      'inspi-ai-platform/src/**/*',
      'inspi-ai-platform/package.json',
      'inspi-ai-platform/next.config.ts',
      'inspi-ai-platform/tailwind.config.ts',
      'inspi-ai-platform/tsconfig.json',
      'inspi-ai-platform/postcss.config.mjs',
      'inspi-ai-platform/eslint.config.mjs',
      '.kiro/project-state/**/*',
      '.kiro/specs/**/*',
      '.gitignore',
      'README.md'
    ],
    excludePatterns: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      '*.log',
      '.kiro/snapshots/**'
    ]
  };

  console.log('🔍 Debugging file scan...');
  console.log('\\nInclude patterns:');
  config.includePatterns.forEach(p => console.log(`  - ${p}`));
  
  console.log('\\nExclude patterns:');
  config.excludePatterns.forEach(p => console.log(`  - ${p}`));

  // 检查每个包含模式
  for (const pattern of config.includePatterns) {
    console.log(`\\n📁 Scanning pattern: ${pattern}`);
    
    if (pattern.includes('**')) {
      const basePath = pattern.split('**')[0].replace(/\*$/, '');
      const startDir = path.resolve(projectRoot, basePath || '.');
      
      console.log(`   Base path: ${basePath}`);
      console.log(`   Start dir: ${startDir}`);
      console.log(`   Exists: ${fs.existsSync(startDir)}`);
      
      if (fs.existsSync(startDir)) {
        try {
          const entries = fs.readdirSync(startDir, { withFileTypes: true });
          console.log(`   Entries found: ${entries.length}`);
          entries.slice(0, 5).forEach(entry => {
            console.log(`     ${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`);
          });
          if (entries.length > 5) {
            console.log(`     ... and ${entries.length - 5} more`);
          }
        } catch (error) {
          console.log(`   Error reading directory: ${error.message}`);
        }
      }
    } else {
      const filePath = path.resolve(projectRoot, pattern);
      console.log(`   File path: ${filePath}`);
      console.log(`   Exists: ${fs.existsSync(filePath)}`);
    }
  }

  // 手动扫描一些关键文件
  console.log('\\n🎯 Manual check of key files:');
  const keyFiles = [
    'inspi-ai-platform/src/app/page.tsx',
    'inspi-ai-platform/src/app/globals.css',
    'inspi-ai-platform/src/app/layout.tsx',
    'inspi-ai-platform/package.json',
    '.kiro/project-state/project-state.json',
    '.gitignore'
  ];

  keyFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (exists) {
      try {
        const stats = fs.statSync(file);
        console.log(`      Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
      } catch (error) {
        console.log(`      Error: ${error.message}`);
      }
    }
  });
}

debugScan();