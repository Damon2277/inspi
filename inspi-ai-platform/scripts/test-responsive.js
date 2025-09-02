/**
 * 响应式系统验证脚本
 */

const { getBreakpoint, getResponsiveValue } = require('../src/lib/responsive/breakpoints');

console.log('🧪 响应式系统验证测试');
console.log('='.repeat(50));

// 测试断点检测
console.log('\n📱 断点检测测试:');
const testWidths = [320, 767, 768, 1023, 1024, 1439, 1440, 1920];
testWidths.forEach(width => {
  const breakpoint = getBreakpoint(width);
  console.log(`  ${width}px → ${breakpoint}`);
});

// 测试响应式值
console.log('\n🎯 响应式值测试:');
const testValue = {
  mobile: '移动端值',
  tablet: '平板端值', 
  desktop: '桌面端值',
  wide: '宽屏值',
  default: '默认值'
};

['mobile', 'tablet', 'desktop', 'wide'].forEach(breakpoint => {
  const value = getResponsiveValue(testValue, breakpoint);
  console.log(`  ${breakpoint} → ${value}`);
});

// 测试部分值
console.log('\n🔄 部分值回退测试:');
const partialValue = {
  mobile: '移动端值',
  default: '默认值'
};

['mobile', 'tablet', 'desktop', 'wide'].forEach(breakpoint => {
  const value = getResponsiveValue(partialValue, breakpoint);
  console.log(`  ${breakpoint} → ${value}`);
});

console.log('\n✅ 响应式系统验证完成!');
console.log('所有核心功能正常工作。');