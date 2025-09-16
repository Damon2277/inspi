#!/usr/bin/env node

/**
 * Visual Regression Demo
 * 视觉回归检测演示
 */

const VisualRegressionDetector = require('./visual-regression');

async function runDemo() {
  console.log('🎬 Starting Visual Regression Demo...\n');
  
  const detector = new VisualRegressionDetector({
    pages: [
      { url: '/', name: 'home' },
      { url: '/create', name: 'create' }
    ],
    viewports: [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' }
    ]
  });
  
  try {
    await detector.initialize();
    
    // 步骤1：创建基准截图
    console.log('📸 Step 1: Creating baseline screenshots...');
    const baselineScreenshots = await detector.captureAllScreenshots('baseline');
    console.log(`✅ Created ${baselineScreenshots.length} baseline screenshots\n`);
    
    // 步骤2：创建当前截图（模拟）
    console.log('📸 Step 2: Creating current screenshots...');
    const currentScreenshots = await detector.captureAllScreenshots('current');
    console.log(`✅ Created ${currentScreenshots.length} current screenshots\n`);
    
    // 步骤3：比较截图
    console.log('🔍 Step 3: Comparing screenshots...');
    const results = await detector.compareSnapshots('baseline', 'current');
    
    // 步骤4：显示结果
    console.log('\n📊 Visual Regression Results:');
    console.log('================================');
    console.log(`Status: ${results.overallResult.hasDifferences ? '❌ Differences Found' : '✅ No Differences'}`);
    console.log(`Total Comparisons: ${results.overallResult.totalComparisons}`);
    console.log(`Failed Comparisons: ${results.overallResult.failedComparisons}`);
    console.log(`Average Similarity: ${results.overallResult.averageSimilarity.toFixed(2)}%`);
    
    if (results.overallResult.hasDifferences) {
      console.log('\n⚠️  Pages with differences:');
      results.pageResults
        .filter(result => result.hasDifferences)
        .forEach(result => {
          console.log(`   - ${result.page} (${result.viewport}): ${result.similarity.toFixed(2)}% similarity`);
        });
    }
    
    console.log('\n💡 Tips:');
    console.log('   - Check the generated HTML report for detailed visual comparison');
    console.log('   - Use different threshold values to adjust sensitivity');
    console.log('   - Add more pages and viewports as needed');
    console.log('   - Integrate with CI/CD pipeline for automated testing');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.log('\n💡 Note: This demo requires a running local server at http://localhost:3000');
      console.log('   Start your Next.js app with: npm run dev');
    }
  } finally {
    await detector.cleanup();
  }
}

// 运行演示
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = runDemo;