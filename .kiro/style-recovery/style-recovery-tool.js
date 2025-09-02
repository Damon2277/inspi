#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class StyleRecoveryTool {
  constructor() {
    this.versionManager = require('../version-control/simple-version-manager.js');
    this.vm = new this.versionManager();
  }

  async analyzeStyleIssues() {
    console.log('🔍 Analyzing current style issues...');
    
    const currentStyles = this.getCurrentStyleFiles();
    const issues = [];

    // 检查关键样式文件
    const criticalStyleFiles = [
      'inspi-ai-platform/src/app/globals.css',
      'inspi-ai-platform/src/app/layout.tsx',
      'inspi-ai-platform/src/app/page.tsx'
    ];

    for (const file of criticalStyleFiles) {
      if (!fs.existsSync(file)) {
        issues.push(`❌ Missing critical file: ${file}`);
      } else {
        const content = fs.readFileSync(file, 'utf-8');
        const analysis = this.analyzeFileContent(file, content);
        if (analysis.issues.length > 0) {
          issues.push(...analysis.issues);
        }
      }
    }

    console.log('\\n📋 Style Issues Found:');
    if (issues.length === 0) {
      console.log('✅ No obvious style issues detected');
    } else {
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    return issues;
  }

  analyzeFileContent(filePath, content) {
    const issues = [];
    const fileName = path.basename(filePath);

    if (fileName === 'globals.css') {
      // 检查globals.css的关键内容
      if (!content.includes('@tailwind') && !content.includes('tailwindcss')) {
        issues.push(`⚠️  ${filePath}: Missing Tailwind CSS imports`);
      }
      if (content.length < 100) {
        issues.push(`⚠️  ${filePath}: File seems too small (${content.length} chars)`);
      }
    }

    if (fileName === 'layout.tsx') {
      if (!content.includes('className') && !content.includes('tailwind')) {
        issues.push(`⚠️  ${filePath}: Missing styling classes`);
      }
      if (!content.includes('suppressHydrationWarning')) {
        issues.push(`ℹ️  ${filePath}: Missing hydration warning suppression`);
      }
    }

    if (fileName === 'page.tsx') {
      if (!content.includes('className') && content.length > 500) {
        issues.push(`⚠️  ${filePath}: Large file without styling classes`);
      }
    }

    return { issues };
  }

  getCurrentStyleFiles() {
    const styleFiles = [];
    const patterns = [
      'inspi-ai-platform/src/app/globals.css',
      'inspi-ai-platform/src/app/**/*.css',
      'inspi-ai-platform/src/app/**/*.tsx'
    ];

    // 简化实现，只检查关键文件
    const keyFiles = [
      'inspi-ai-platform/src/app/globals.css',
      'inspi-ai-platform/src/app/layout.tsx',
      'inspi-ai-platform/src/app/page.tsx',
      'inspi-ai-platform/src/app/create/page.tsx'
    ];

    keyFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        styleFiles.push({
          path: file,
          content,
          size: content.length
        });
      }
    });

    return styleFiles;
  }

  async findBestRecoverySnapshot() {
    console.log('🔍 Finding best recovery snapshot...');
    
    const snapshots = this.vm.listSnapshots();
    const candidates = [];

    for (const snapshot of snapshots) {
      // 加载快照并分析样式质量
      try {
        const snapshotPath = path.join('.kiro/snapshots', `${snapshot.id}.json`);
        if (fs.existsSync(snapshotPath)) {
          const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
          const styleQuality = this.analyzeSnapshotStyleQuality(snapshotData);
          
          candidates.push({
            ...snapshot,
            styleQuality
          });
        }
      } catch (error) {
        console.warn(`Warning: Could not analyze snapshot ${snapshot.id}`);
      }
    }

    // 按样式质量排序
    candidates.sort((a, b) => b.styleQuality.score - a.styleQuality.score);

    console.log('\\n🏆 Recovery Candidates (by style quality):');
    candidates.slice(0, 3).forEach((candidate, index) => {
      const medal = ['🥇', '🥈', '🥉'][index] || '📋';
      console.log(`${medal} ${candidate.id}`);
      console.log(`   📅 ${new Date(candidate.timestamp).toLocaleString()}`);
      console.log(`   📝 ${candidate.description}`);
      console.log(`   🎨 Style Score: ${candidate.styleQuality.score}/100`);
      console.log(`   📊 ${candidate.styleQuality.styleFiles} style files, ${candidate.styleQuality.totalSize} chars`);
    });

    return candidates[0] || null;
  }

  analyzeSnapshotStyleQuality(snapshotData) {
    let score = 0;
    let styleFiles = 0;
    let totalSize = 0;

    const files = snapshotData.files || [];
    
    // 检查关键样式文件
    const hasGlobalsCss = files.some(f => f.path.includes('globals.css'));
    const hasLayoutTsx = files.some(f => f.path.includes('layout.tsx'));
    const hasPageTsx = files.some(f => f.path.includes('page.tsx'));

    if (hasGlobalsCss) score += 30;
    if (hasLayoutTsx) score += 25;
    if (hasPageTsx) score += 20;

    // 分析样式文件内容质量
    files.forEach(file => {
      if (file.type === 'style' || file.path.includes('.css')) {
        styleFiles++;
        totalSize += file.content ? file.content.length : 0;
        
        if (file.content) {
          if (file.content.includes('@tailwind')) score += 10;
          if (file.content.includes('className')) score += 5;
          if (file.content.length > 200) score += 5;
        }
      }
      
      if (file.path.includes('.tsx') && file.content) {
        if (file.content.includes('className=')) score += 3;
        if (file.content.includes('bg-gradient')) score += 2;
        if (file.content.includes('text-')) score += 1;
      }
    });

    return {
      score: Math.min(score, 100),
      styleFiles,
      totalSize
    };
  }

  async recoverStyles(snapshotId, options = {}) {
    console.log(`🔄 Recovering styles from snapshot: ${snapshotId}`);
    
    // 创建当前状态备份
    const backupId = await this.vm.createSnapshot(
      `Backup before style recovery from ${snapshotId}`,
      false
    );
    console.log(`💾 Current state backed up as: ${backupId}`);

    // 执行样式恢复
    const success = await this.vm.restoreSnapshot(snapshotId, {
      stylesOnly: options.stylesOnly !== false, // 默认只恢复样式
      ...options
    });

    if (success) {
      console.log('\\n✅ Style recovery completed!');
      console.log('\\n🎯 Next steps:');
      console.log('  1. Check your website: http://localhost:3000');
      console.log('  2. If styles look good, create a new stable snapshot');
      console.log('  3. If not, you can restore from backup:', backupId);
      
      // 更新项目状态
      this.updateProjectStateAfterRecovery(snapshotId, backupId);
    }

    return success;
  }

  updateProjectStateAfterRecovery(recoverySnapshotId, backupSnapshotId) {
    try {
      const statePath = '.kiro/project-state/project-state.json';
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        
        // 更新样式问题状态
        const styleIssues = state.globalHealth.activeIssues.filter(
          issue => issue.type === 'style_regression' && issue.status === 'active'
        );
        
        styleIssues.forEach(issue => {
          issue.status = 'resolved';
          issue.resolvedAt = new Date().toISOString();
          issue.resolution = `Styles recovered from snapshot ${recoverySnapshotId}. Backup created: ${backupSnapshotId}`;
        });

        // 更新整体健康状态
        const activeIssues = state.globalHealth.activeIssues.filter(i => i.status === 'active');
        if (activeIssues.length === 0) {
          state.globalHealth.overallStatus = 'stable';
        } else if (activeIssues.filter(i => i.severity === 'critical').length === 0) {
          state.globalHealth.overallStatus = 'warning';
        }

        state.lastUpdated = new Date().toISOString();
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
        
        console.log('✅ Project state updated - style issues marked as resolved');
      }
    } catch (error) {
      console.warn('⚠️  Could not update project state:', error.message);
    }
  }

  async showRecoveryOptions() {
    console.log('\\n🛠️  Style Recovery Tool');
    console.log('========================');
    
    await this.analyzeStyleIssues();
    const bestCandidate = await this.findBestRecoverySnapshot();
    
    if (bestCandidate) {
      console.log('\\n💡 Recommended Action:');
      console.log(`   Recover from: ${bestCandidate.id}`);
      console.log(`   Command: node .kiro/style-recovery/style-recovery-tool.js recover ${bestCandidate.id}`);
    } else {
      console.log('\\n❌ No suitable recovery snapshots found');
    }
  }
}

// CLI处理
async function main() {
  const tool = new StyleRecoveryTool();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'analyze':
        await tool.analyzeStyleIssues();
        break;

      case 'find':
        await tool.findBestRecoverySnapshot();
        break;

      case 'recover':
        const snapshotId = args[1];
        if (!snapshotId) {
          console.error('❌ Please provide a snapshot ID');
          console.log('   Usage: recover <snapshot-id>');
          return;
        }
        const options = {
          stylesOnly: !args.includes('--all-files')
        };
        await tool.recoverStyles(snapshotId, options);
        break;

      case 'options':
      default:
        await tool.showRecoveryOptions();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = StyleRecoveryTool;