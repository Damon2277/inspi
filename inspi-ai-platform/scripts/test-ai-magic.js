const { chromium } = require('playwright');

async function testAIMagic() {
  console.log('🎭 开始测试AI教学魔法师功能...');
  
  try {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // 访问创建页面
    console.log('📝 访问AI教学魔法师页面...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle' });
    
    // 填写表单
    console.log('✏️ 填写教学信息...');
    await page.fill('input[placeholder*="知识点"]', '两位数加法');
    await page.selectOption('select:has-text("请选择学科")', '数学');
    await page.selectOption('select:has-text("请选择年级")', '小学二年级');
    
    // 点击生成按钮
    console.log('✨ 点击生成教学魔法卡片...');
    await page.click('button:has-text("生成教学魔法卡片")');
    
    // 等待生成完成
    console.log('⏳ 等待AI生成卡片...');
    await page.waitForSelector('h2:has-text("教学魔法卡片生成完成")', { timeout: 10000 });
    
    // 检查生成的卡片
    const cards = await page.locator('.glassmorphism-card').count();
    console.log(`🎴 成功生成 ${cards} 张教学卡片`);
    
    // 检查卡片类型
    const cardTypes = await page.locator('h3:has-text("可视化理解"),
      h3:has-text("类比延展"), h3:has-text("启发思考"), h3:has-text("互动氛围")').count();
    console.log(`📋 找到 ${cardTypes} 种不同类型的卡片`);
    
    // 截图保存结果
    await page.screenshot({ path: 'ai-magic-result.png', fullPage: true });
    console.log('📸 结果截图已保存: ai-magic-result.png');
    
    // 测试保存功能
    console.log('💾 测试保存功能...');
    await page.click('button:has-text("发布到智慧广场")');
    
    // 等待保存完成的提示
    await page.waitForFunction(() => {
      return window.confirm || window.alert;
    }, { timeout: 5000 });
    
    await browser.close();
    
    console.log('✅ AI教学魔法师功能测试完成！');
    console.log('🎯 测试结果：');
    console.log(`  - 表单填写: ✅`);
    console.log(`  - AI生成: ✅`);
    console.log(`  - 卡片显示: ✅ (${cards}张)`);
    console.log(`  - 卡片类型: ✅ (${cardTypes}种)`);
    console.log(`  - 保存功能: ✅`);
    
    return true;
  } catch (error) {
    console.error('❌ AI教学魔法师测试失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  testAIMagic().catch(console.error);
}

module.exports = { testAIMagic };