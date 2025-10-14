/**
 * 高级Jest配置
 * 使用新的测试配置管理系统
 */

const nextJest = require('next/jest');

const { JestConfigGenerator } = require('./src/lib/testing/JestConfigGenerator');

const createJestConfig = nextJest({
  dir: './',
});

// 检测测试类型
function detectTestType() {
  const args = process.argv;

  if (args.includes('--config') && args.includes('unit')) return 'unit';
  if (args.includes('--config') && args.includes('integration')) return 'integration';
  if (args.includes('--config') && args.includes('e2e')) return 'e2e';

  // 从环境变量检测
  if (process.env.TEST_TYPE) {
    return process.env.TEST_TYPE;
  }

  // 默认为单元测试
  return 'unit';
}

// 生成配置
const testType = detectTestType();
const generator = new JestConfigGenerator();

const options = {
  type: testType,
  coverage: process.argv.includes('--coverage'),
  watch: process.argv.includes('--watch'),
  ci: process.env.CI === 'true',
  debug: process.argv.includes('--debug'),
  updateSnapshots: process.argv.includes('--updateSnapshot'),
};

const customJestConfig = generator.generateConfig(options);

// 验证配置
const validation = generator.validateConfig(customJestConfig);
if (!validation.valid) {
  console.error('Jest configuration validation failed:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`🧪 Using ${testType} test configuration`);

module.exports = createJestConfig(customJestConfig);
