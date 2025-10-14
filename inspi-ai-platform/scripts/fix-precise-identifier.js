#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Fixing precise identifier errors...\n');

// Files with known identifier errors
const targetFiles = [
  'src/shared/hooks/useSubscription.ts',
  'src/shared/hooks/useKeyboardNavigation.ts',
  'src/components/contribution/Leaderboard.tsx',
  'src/lib/models/Comment.ts',
  'src/lib/models/Work.ts',
  'src/lib/models/KnowledgeGraph.ts',
  'src/lib/services/workService.ts',
  'src/lib/services/contributionService.ts',
  'src/components/auth/LoginForm.tsx',
  'src/components/desktop/pages/DesktopCreatePage.tsx',
  'src/components/desktop/pages/DesktopHomePage.tsx',
  'src/components/desktop/pages/DesktopSquarePage.tsx'
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
  
  // Fix patterns like: state.(availablePlans as any) -> (state.availablePlans as any)
  // This matches: word.(word as any)
  const pattern1 = /(\w+)\.(\([\w\s]+\s+as\s+any\))/g;
  content = content.replace(pattern1, (match, obj, rest) => {
    totalFixed++;
    // Remove parentheses from rest and rebuild
    const prop = rest.replace(/^\(|\)$/g, '').replace(/\s+as\s+any$/, '');
    return `(${obj}.${prop} as any)`;
  });
  
  // Fix patterns like: this.(edges.find as any) -> (this.edges as any).find
  const pattern2 = /this\.(\([\w\.]+\s+as\s+any\))/g;
  content = content.replace(pattern2, (match, rest) => {
    totalFixed++;
    // Extract property path and method
    const innerContent = rest.replace(/^\(|\)$/g, '');
    const parts = innerContent.replace(/\s+as\s+any$/, '').split('.');
    
    if (parts.length === 2) {
      return `(this.${parts[0]} as any).${parts[1]}`;
    }
    return match; // Don't change if we can't parse it
  });
  
  // Fix patterns like: shortcutsRef.(current as any) -> (shortcutsRef.current as any)
  const pattern3 = /(\w+Ref)\.(\(current\s+as\s+any\))/g;
  content = content.replace(pattern3, (match, ref) => {
    totalFixed++;
    return `(${ref}.current as any)`;
  });
  
  // Fix patterns like: leaderboard.(entries as any) -> (leaderboard.entries as any)
  const pattern4 = /(\w+)\.(\(entries\s+as\s+any\))/g;
  content = content.replace(pattern4, (match, obj) => {
    totalFixed++;
    return `(${obj}.entries as any)`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    console.log(`✅ Fixed: ${file}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files fixed: ${filesFixed}`);
console.log(`   Total fixes applied: ${totalFixed}`);
console.log('\n✨ Identifier error fixes completed!');