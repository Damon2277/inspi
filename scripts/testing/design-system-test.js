const { chromium } = require('playwright');

async function testDesignSystem() {
  console.log('🎨 开始设计系统测试...');
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // 测试主页
    console.log('📊 测试主页设计系统应用...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // 检查设计系统CSS变量是否加载
    const cssVariables = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        bgPrimary: styles.getPropertyValue('--bg-primary').trim(),
        textPrimary: styles.getPropertyValue('--text-primary').trim(),
        brandOrange: styles.getPropertyValue('--brand-orange').trim(),
        fontFamily: styles.getPropertyValue('--font-family').trim()
      };
    });
    
    console.log('🎨 CSS变量检查:', cssVariables);
    
    // 检查玻璃拟态卡片是否存在
    const glassCards = await page.locator('.glassmorphism-card').count();
    console.log(`🔍 找到 ${glassCards} 个玻璃拟态卡片`);
    
    // 检查按钮是否存在
    const primaryButtons = await page.locator('.btn-primary').count();
    const secondaryButtons = await page.locator('.btn-secondary').count();
    console.log(`🔘 找到 ${primaryButtons} 个主按钮, ${secondaryButtons} 个次按钮`);
    
    // 检查图标容器
    const iconContainers = await page.locator('.icon-container').count();
    console.log(`🎯 找到 ${iconContainers} 个图标容器`);
    
    // 检查字体样式
    const headings = await page.locator('.heading-1, .heading-2, .heading-3').count();
    console.log(`📝 找到 ${headings} 个标题元素`);
    
    // 检查背景装饰
    const hasBackground = await page.evaluate(() => {
      const body = document.body;
      return body.classList.contains('dot-grid-background') && 
             body.classList.contains('circuit-lines');
    });
    console.log(`🌟 背景装饰应用: ${hasBackground ? '✅' : '❌'}`);
    
    // 测试创建页面
    console.log('📊 测试创建页面...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle' });
    
    const createPageCards = await page.locator('.glassmorphism-card').count();
    console.log(`🔍 创建页面找到 ${createPageCards} 个玻璃拟态卡片`);
    
    // 截图对比
    await page.screenshot({ path: 'design-system-homepage.png', fullPage: true });
    await page.goto('http://localhost:3000/create');
    await page.screenshot({ path: 'design-system-create.png', fullPage: true });
    
    await browser.close();
    
    console.log('✅ 设计系统测试完成');
    console.log('📸 截图已保存: design-system-homepage.png, design-system-create.png');
    
    // 验证结果
    const results = {
      cssVariablesLoaded: Object.values(cssVariables).every(v => v !== ''),
      glassCardsFound: glassCards > 0,
      buttonsFound: primaryButtons > 0 || secondaryButtons > 0,
      iconsFound: iconContainers > 0,
      headingsFound: headings > 0,
      backgroundApplied: hasBackground
    };
    
    const allPassed = Object.values(results).every(Boolean);
    
    console.log('\n📋 测试结果总结:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    
    console.log(`\n🎯 总体结果: ${allPassed ? '✅ 全部通过' : '❌ 存在问题'}`);
    
    return results;
  } catch (error) {
    console.error('❌ 设计系统测试失败:', error.message);
    console.log('💡 请确保开发服务器在 http://localhost:3000 运行');
    throw error;
  }
}

if (require.main === module) {
  testDesignSystem().catch(console.error);
}

module.exports = { testDesignSystem };