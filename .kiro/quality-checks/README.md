# 自动化质量检查系统

这是一个完整的自动化质量检查系统，用于监控代码质量、验证功能完整性，并提供智能问题预警。

## 功能特性

### 🔍 代码质量监控
- **ESLint 检查**: 自动检测代码风格和潜在问题
- **测试覆盖率分析**: 监控测试覆盖率并识别未覆盖的代码
- **代码复杂度分析**: 检测过于复杂的函数和方法
- **重复代码检测**: 识别重复的代码块
- **依赖安全检查**: 检查过时和有安全问题的依赖

### 🧪 功能完整性验证
- **自动化测试套件**: 运行单元测试、集成测试和 API 测试
- **功能回归检测**: 对比历史测试结果，检测功能回退
- **状态一致性验证**: 检查项目配置和依赖的一致性

### ⚠️ 智能问题预警系统
- **模式识别算法**: 识别质量下降的趋势和模式
- **预警通知机制**: 在问题严重化之前发出警告
- **修复建议生成**: 提供具体的修复建议和操作指导

## 安装和使用

### 基本使用

```bash
# 运行完整的质量检查
node .kiro/quality-checks/cli.js

# 运行预提交检查
node .kiro/quality-checks/cli.js pre-commit

# 查看帮助信息
node .kiro/quality-checks/cli.js help
```

### 命令选项

```bash
# 跳过特定检查
node .kiro/quality-checks/cli.js --no-code-quality
node .kiro/quality-checks/cli.js --no-functional
node .kiro/quality-checks/cli.js --no-warnings

# 跳过报告生成
node .kiro/quality-checks/cli.js --no-reports
```

### 编程接口

```javascript
const QualityCheckSystem = require('.kiro/quality-checks');

const qualitySystem = new QualityCheckSystem({
  enableCodeQuality: true,
  enableFunctionalValidation: true,
  enableIntelligentWarnings: true
});

// 运行完整检查
const results = await qualitySystem.runFullQualityCheck();

// 运行预提交检查
await qualitySystem.runPreCommitChecks();
```

## 配置

系统配置存储在 `config.json` 文件中，可以自定义以下设置：

### 质量阈值
```json
{
  "qualityThresholds": {
    "eslintErrors": 0,
    "eslintWarnings": 10,
    "testCoverage": 80,
    "duplicateCodePercentage": 5,
    "complexityScore": 10
  }
}
```

### 预警阈值
```json
{
  "warningThresholds": {
    "errorTrend": 3,
    "performanceDegradation": 20,
    "testCoverageDecline": 5,
    "complexityIncrease": 2,
    "duplicateCodeIncrease": 3
  }
}
```

## 报告和历史

### 报告格式
系统支持多种报告格式：
- **控制台输出**: 实时显示检查结果
- **JSON 报告**: 机器可读的详细结果
- **HTML 报告**: 可视化的网页报告

### 历史数据
- 质量指标历史存储在 `.kiro/quality-checks/history/`
- 预警记录存储在 `.kiro/quality-checks/warnings/`
- 通知日志存储在 `.kiro/quality-checks/notifications/`

## 智能预警模式

系统内置多种预警模式：

### 1. 递增错误趋势
检测 ESLint 错误数量持续增长的趋势

### 2. 测试覆盖率下降
监控测试覆盖率的持续下降

### 3. 代码复杂度增长
检测代码复杂度的持续增长

### 4. 测试结果不稳定
识别测试结果的异常波动

### 5. 依赖管理问题
监控过时和有安全问题的依赖数量增长

### 6. 性能下降
检测系统性能指标的下降趋势

## 集成到开发流程

### Git Hooks 集成
```bash
# 在 .git/hooks/pre-commit 中添加
#!/bin/sh
node .kiro/quality-checks/cli.js pre-commit
```

### CI/CD 集成
```yaml
# GitHub Actions 示例
- name: Run Quality Checks
  run: node .kiro/quality-checks/cli.js
```

### 定期检查
```bash
# 添加到 crontab 进行定期检查
0 9 * * * cd /path/to/project && node .kiro/quality-checks/cli.js
```

## 故障排除

### 常见问题

1. **ESLint 配置未找到**
   - 确保项目中存在 `eslint.config.mjs` 文件
   - 检查 ESLint 是否正确安装

2. **测试覆盖率数据缺失**
   - 运行 `npm test -- --coverage` 生成覆盖率数据
   - 确保 Jest 配置正确

3. **API 测试失败**
   - 确保开发服务器正在运行
   - 检查 API 端点配置是否正确

### 调试模式
```bash
# 启用详细日志
DEBUG=quality-checks node .kiro/quality-checks/cli.js
```

## 扩展和自定义

### 添加自定义检查
```javascript
// 在 code-quality-monitor.js 中添加新的检查方法
async _customQualityCheck() {
  // 自定义检查逻辑
}
```

### 添加新的预警模式
```javascript
// 在 intelligent-warning-system.js 中添加新模式
{
  id: 'custom_pattern',
  name: 'Custom Pattern',
  description: 'Custom pattern description',
  severity: 'medium',
  pattern: (data) => this._detectCustomPattern(data)
}
```

## 性能考虑

- 历史数据自动清理，保持最近的记录
- 大文件分析使用流式处理
- 并行执行多个检查以提高效率
- 缓存机制减少重复计算

## 安全考虑

- 敏感信息不会记录在日志中
- 历史数据存储在本地，不会上传到外部服务
- 依赖安全检查帮助识别潜在的安全风险

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 添加测试用例
4. 提交 Pull Request

## 许可证

MIT License