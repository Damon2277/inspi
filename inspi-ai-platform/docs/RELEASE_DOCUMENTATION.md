# 发布文档生成系统

本文档介绍如何使用新的发布文档生成系统来自动创建发布说明、变更日志和版本标签描述。

## 功能特性

### 🚀 主要功能

- **自动发布说明生成**: 基于Git提交历史生成详细的发布说明
- **变更日志管理**: 自动更新CHANGELOG.md文件，遵循Keep a Changelog格式
- **版本标签描述**: 为Git标签生成描述信息，包含版本统计和主要变更
- **约定式提交支持**: 完全支持Conventional Commits格式
- **智能分类**: 自动将提交分类为功能、修复、改进等类型
- **破坏性变更检测**: 自动识别和处理破坏性变更，生成迁移指南

### 📋 支持的提交类型

| 类型 | 描述 | 版本影响 | 变更日志 |
|------|------|----------|----------|
| `feat` | 新功能 | minor | ✅ |
| `fix` | 问题修复 | patch | ✅ |
| `perf` | 性能优化 | patch | ✅ |
| `refactor` | 代码重构 | patch | ✅ |
| `docs` | 文档更新 | none | ❌ |
| `style` | 代码格式 | none | ❌ |
| `test` | 测试相关 | none | ❌ |
| `chore` | 构建/工具 | none | ❌ |
| `ci` | CI配置 | none | ❌ |
| `build` | 构建系统 | none | ❌ |
| `revert` | 回滚变更 | patch | ✅ |

## 使用方法

### 基本用法

```bash
# 生成指定版本的发布文档
node scripts/release-doc-generator.js 1.2.3

# 从指定标签开始生成
node scripts/release-doc-generator.js 1.2.3 v1.2.2

# 从最后一个标签开始生成
node scripts/release-doc-generator.js 1.2.3 --from-last-tag

# 显示帮助信息
node scripts/release-doc-generator.js --help
```

### NPM Scripts

```bash
# 生成发布文档
npm run release:docs -- 1.2.3

# 显示帮助
npm run release:docs:help

# 生成发布说明
npm run release:notes -- 1.2.3

# 更新变更日志
npm run changelog:update -- 1.2.3

# 完整发布流程（版本升级 + 文档生成）
npm run release:full
```

### 与版本管理集成

发布文档生成器已集成到现有的版本管理脚本中：

```bash
# 自动版本升级并生成文档
npm run version:bump

# 指定版本类型升级
npm run version:major
npm run version:minor
npm run version:patch
```

## 生成的文件

### 1. 发布说明 (RELEASE_NOTES_v{version}.md)

包含以下内容：
- 版本概述和统计信息
- 按类型分类的变更列表
- 破坏性变更和迁移指南
- 安装升级说明
- 相关链接和致谢

### 2. 变更日志 (CHANGELOG.md)

- 遵循Keep a Changelog格式
- 按版本组织的变更记录
- 包含提交哈希和详细描述
- 自动防重复更新

### 3. 标签描述 (TAG_DESCRIPTION)

- 版本统计信息
- 主要变更摘要
- 供Git标签使用的简洁描述

## 约定式提交格式

为了获得最佳的文档生成效果，建议使用约定式提交格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 示例

```bash
# 新功能
feat(ui): add new dashboard component

# 问题修复
fix(auth): resolve login timeout issue

# 破坏性变更
feat(api)!: change authentication method

BREAKING CHANGE: The authentication method has been changed from JWT to OAuth2.
Migration guide: Update your API calls to use the new OAuth2 endpoints.
```

## 配置选项

### 提交类型配置

可以在`scripts/release-doc-generator.js`中修改`COMMIT_TYPES`配置：

```javascript
const COMMIT_TYPES = {
  feat: { emoji: '🚀', label: '新功能', bump: 'minor', changelog: true },
  fix: { emoji: '🐛', label: '问题修复', bump: 'patch', changelog: true },
  // ... 其他类型
};
```

### 发布说明模板

可以自定义`RELEASE_TEMPLATE`来调整发布说明的格式和内容。

## 最佳实践

### 1. 提交信息规范

- 使用约定式提交格式
- 提供清晰的描述信息
- 为破坏性变更添加详细说明

### 2. 版本发布流程

1. 确保所有变更已提交
2. 运行测试确保代码质量
3. 使用`npm run release:full`进行完整发布
4. 推送代码和标签到远程仓库

### 3. 文档维护

- 定期检查生成的发布说明
- 根据需要手动调整模板
- 保持CHANGELOG.md的整洁

## 故障排除

### 常见问题

1. **没有发现新提交**
   - 确保有新的提交自上次标签以来
   - 检查Git标签是否正确

2. **提交分类不正确**
   - 检查提交信息格式
   - 确认关键词匹配规则

3. **文件权限错误**
   - 确保脚本有写入权限
   - 检查目录结构是否正确

### 调试模式

```bash
# 查看详细日志
DEBUG=1 node scripts/release-doc-generator.js 1.2.3

# 测试特定功能
node -e "const gen = require('./scripts/release-doc-generator'); console.log(gen.parseCommit({message: 'feat: test'}))"
```

## 扩展功能

### 自定义模板

可以创建自定义模板文件来个性化发布说明格式：

```javascript
// 自定义模板示例
const customTemplate = {
  header: (version, date) => `# Release ${version} (${date})`,
  features: (features) => `## New Features\n${features.map(f => `- ${f.description}`).join('\n')}`,
  // ... 其他部分
};
```

### 集成CI/CD

可以在GitHub Actions中使用：

```yaml
- name: Generate Release Documentation
  run: |
    npm run release:docs -- ${{ github.ref_name }}
    git add CHANGELOG.md RELEASE_NOTES_*.md
    git commit -m "docs: update release documentation"
```

## 相关文档

- [版本管理系统规范](.kiro/specs/version-management-system/)
- [Git工作流指南](./VERSION_MANAGEMENT.md)
- [约定式提交规范](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

**注意**: 本系统是版本管理系统的一部分，与其他版本管理工具（如bump-version.js、git-flow.js等）协同工作。