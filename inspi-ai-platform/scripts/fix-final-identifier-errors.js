#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Fixing final identifier errors...\n');

// Files with remaining identifier errors
const targetFiles = [
  'src/core/graph/data-manager.ts',
  'src/core/quality/code-review-automation.ts',
  'src/lib/cdn/config.ts',
  'src/lib/invitation/async/AsyncTaskProcessor.ts',
  'src/lib/performance/alerts.ts',
  'src/lib/quota/quota-checker.ts',
  'src/lib/services/graphAnalysisService.ts',
  'src/lib/services/workMountService.ts',
  'src/lib/testing/integration-test.ts'
];

let totalFixed = 0;
let filesFixed = 0;

targetFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fixCount = 0;
  
  // Fix all patterns like: object.(property as any) -> (object.property as any)
  // This matches: word.(word as any) or this.(word as any)
  const pattern = /(\w+|\bthis)\.(\([\w\s]+\s+as\s+any\))/g;
  content = content.replace(pattern, (match, obj, rest) => {
    fixCount++;
    // Extract the property name from inside the parentheses
    const prop = rest.replace(/^\(|\)$/g, '').replace(/\s+as\s+any$/, '');
    return `(${obj}.${prop} as any)`;
  });
  
  // Also fix patterns with nested property access: graph.(nodes as any)
  const pattern2 = /(\w+)\.(\([\w\.]+\s+as\s+any\))/g;
  content = content.replace(pattern2, (match, obj, rest) => {
    fixCount++;
    const prop = rest.replace(/^\(|\)$/g, '').replace(/\s+as\s+any$/, '');
    return `(${obj}.${prop} as any)`;
  });
  
  // Fix special case: req.(user.id || (user as any)._id)
  // This needs to become: (req.user.id || (req.user as any)._id)
  content = content.replace(/req\.\(user\.id\s+\|\|\s+\(user\s+as\s+any\)\._id\)/g, 
    '(req.user.id || (req.user as any)._id)');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    totalFixed += fixCount;
    console.log(`✅ Fixed: ${file} (${fixCount} fixes)`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files fixed: ${filesFixed}`);
console.log(`   Total fixes applied: ${totalFixed}`);
console.log('\n✨ Final identifier error fixes completed!');