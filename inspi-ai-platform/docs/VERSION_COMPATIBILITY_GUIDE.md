# 版本兼容性检查指南

## 概述

版本兼容性检查器是版本管理系统的重要组成部分，用于检测API变更、识别破坏性变更并生成兼容性报告，确保版本升级的安全性。

## 功能特性

### 1. API变更检测
- 自动检测API文件的新增、修改和删除
- 识别可能的破坏性变更模式
- 支持TypeScript接口和类型定义检查

### 2. 破坏性变更提醒
- 分析提交信息中的破坏性变更标记
- 检测删除、移除等关键词
- 验证版本号是否符合语义化版本规范

### 3. 兼容性报告生成
- 生成详细的JSON格式报告
- 提供可读的Markdown格式报告
- 包含风险评估和迁移建议

## 使用方法

### 基本用法

```bash
# 检查当前版本的兼容性
node scripts/compatibility-checker.js

# 检查指定版本范围的兼容性
node scripts/compatibility-checker.js --from-version 1.0.0 --new-version 2.0.0

# 验证新版本号的合理性
node scripts/compatibility-checker.js --new-version 2.0.0
```

### 与版本管理集成

兼容性检查已集成到版本升级流程中：

```bash
# 自动执行兼容性检查
npm run version:bump

# 跳过兼容性检查
npm run version:bump -- --skip-compatibility-check

# 强制发布（忽略兼容性警告）
npm run version:bump -- --force

# 安全发布（先检查兼容性）
npm run release:safe
```

### NPM脚本

```bash
# 执行兼容性检查
npm run version:compatibility

# 从指定版本开始检查
npm run version:compatibility:from -- 1.0.0

# 验证新版本号
npm run version:compatibility:validate -- 2.0.0
```

## 检查规则

### API变更检测规则

1. **新增文件** - 通常安全，标记为低风险
2. **修改文件** - 需要进一步分析内容变更
3. **删除文件** - 高风险，可能导致破坏性变更

### 破坏性变更模式

检查器会识别以下破坏性变更模式：

- 删除导出的函数、接口、类型或类
- 删除对象属性
- 明确标记的 `BREAKING CHANGE`
- 删除必需属性

### 提交信息分析

- `BREAKING CHANGE` 或 `!:` 标记
- 包含删除、移除、废弃等关键词的提交
- 不兼容变更的描述

## 报告解读

### 风险级别

- **LOW** - 安全变更，可以直接发布
- **MEDIUM** - 需要谨慎，建议审查变更内容
- **HIGH** - 高风险，需要仔细审查并可能需要主版本升级

### 建议操作

- **proceed** - 可以继续发布
- **caution** - 谨慎发布，建议额外测试
- **review_required** - 需要人工审查后再决定

### 报告内容

兼容性报告包含以下信息：

1. **版本信息** - 当前版本和比较版本
2. **API变更详情** - 文件级别的变更统计
3. **破坏性变更列表** - 具体的破坏性变更项目
4. **版本验证结果** - 版本号规范性检查
5. **建议和迁移指南** - 具体的操作建议

## 配置选项

### 环境变量

可以通过环境变量配置检查器行为：

```bash
# 设置API文件路径
export API_DOCS_PATH="src/app/api"

# 设置类型定义路径
export TYPES_PATH="src/types"

# 设置报告输出目录
export REPORTS_DIR="reports"
```

### 自定义检查规则

可以通过修改 `compatibility-checker.js` 中的配置来自定义检查规则：

```javascript
// 破坏性变更检测模式
const breakingPatterns = [
  /^-.*export.*function/m,  // 删除导出的函数
  /^-.*export.*interface/m, // 删除导出的接口
  // 添加自定义模式...
];

// 破坏性变更关键词
const breakingKeywords = [
  'remove', 'delete', 'drop', 'deprecate',
  '删除', '移除', '废弃', '不兼容'
  // 添加自定义关键词...
];
```

## 最佳实践

### 1. 定期检查
- 在每次版本发布前执行兼容性检查
- 在重要功能开发完成后进行检查
- 定期审查历史兼容性报告

### 2. 版本规划
- 根据兼容性检查结果规划版本号
- 破坏性变更必须升级主版本号
- 新功能升级次版本号，修复升级修订版本号

### 3. 文档维护
- 为破坏性变更提供详细的迁移指南
- 在发布说明中突出显示兼容性变更
- 维护API变更历史记录

### 4. 团队协作
- 在代码审查中关注兼容性影响
- 建立破坏性变更的审批流程
- 培训团队成员理解语义化版本规范

## 故障排除

### 常见问题

1. **无法获取Git标签**
   - 确保项目有Git历史记录
   - 检查是否有版本标签

2. **API文件检测失败**
   - 确认API文件路径配置正确
   - 检查文件权限

3. **报告生成失败**
   - 确保reports目录存在或有创建权限
   - 检查磁盘空间

### 调试模式

可以通过设置环境变量启用调试模式：

```bash
DEBUG=compatibility-checker node scripts/compatibility-checker.js
```

## 集成CI/CD

可以将兼容性检查集成到CI/CD流水线中：

```yaml
# GitHub Actions 示例
- name: Version Compatibility Check
  run: |
    npm run version:compatibility
    if [ $? -ne 0 ]; then
      echo "兼容性检查失败，请审查变更"
      exit 1
    fi
```

## 相关文档

- [版本管理用户指南](VERSION_MANAGEMENT_USER_GUIDE.md)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [Git工作流指南](VERSION_MANAGEMENT.md)