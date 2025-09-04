# 版本管理系统使用指南

## 概述

本项目使用简化的版本管理系统，基于语义化版本控制（SemVer）规范，支持自动化版本升级、Git标签创建和发布说明生成。

## 快速开始

### 查看当前版本

```bash
npm run version:current
# 或
node scripts/bump-version.js --version
```

### 自动版本升级

系统会根据Git提交历史自动检测版本升级类型：

```bash
npm run version:bump
# 或
node scripts/bump-version.js
```

### 手动指定版本类型

```bash
# 主版本升级 (破坏性变更)
npm run version:major

# 次版本升级 (新功能)
npm run version:minor

# 修订版本升级 (问题修复)
npm run version:patch

# 预发布版本
npm run version:prerelease
```

### 完整发布流程

```bash
# 执行版本升级和发布
npm run release
```

## 版本升级规则

### 自动检测规则

系统根据提交信息自动检测版本升级类型：

- **主版本 (Major)**: 包含 `BREAKING CHANGE` 或 `!:` 的提交
- **次版本 (Minor)**: 以 `feat:` 开头的提交
- **修订版本 (Patch)**: 以 `fix:` 开头的提交或其他类型的提交

### 提交信息格式

建议使用约定式提交格式：

```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

#### 支持的提交类型

- `feat`: 新功能 (触发 minor 版本升级)
- `fix`: 问题修复 (触发 patch 版本升级)
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动
- `perf`: 性能优化

#### 示例

```bash
# 新功能
git commit -m "feat: 添加用户认证功能"

# 问题修复
git commit -m "fix: 修复登录页面显示问题"

# 破坏性变更
git commit -m "feat!: 重构API接口结构

BREAKING CHANGE: API接口路径从 /api/v1 改为 /api/v2"
```

## 发布流程

### 完整发布流程

1. **检查工作目录**: 确保没有未提交的更改
2. **分析提交历史**: 获取自上次发布以来的所有提交
3. **确定版本类型**: 自动检测或手动指定
4. **计算新版本号**: 根据语义化版本规则
5. **更新package.json**: 自动更新版本号
6. **生成发布说明**: 基于提交历史生成
7. **提交更改**: 提交版本更改和发布说明
8. **创建Git标签**: 创建版本标签

### 发布说明

系统会自动生成发布说明文件 `RELEASE_NOTES_v{version}.md`，包含：

- 版本概述
- 新功能列表
- 问题修复列表
- 其他变更
- 安装和升级指南
- 相关链接

## 配置

### 版本配置文件

项目根目录的 `version.config.json` 文件包含版本管理的配置：

```json
{
  "version": {
    "strategy": "semantic",
    "tagPrefix": "v",
    "prereleaseIdentifier": "beta",
    "autoTag": true
  },
  "commit": {
    "types": [
      {"type": "feat", "bump": "minor", "changelog": true},
      {"type": "fix", "bump": "patch", "changelog": true}
    ]
  }
}
```

### NPM Scripts

项目已配置以下NPM脚本：

```json
{
  "version:bump": "自动版本升级",
  "version:major": "主版本升级",
  "version:minor": "次版本升级", 
  "version:patch": "修订版本升级",
  "version:prerelease": "预发布版本",
  "version:current": "显示当前版本",
  "release": "完整发布流程"
}
```

## 最佳实践

### 1. 提交信息规范

- 使用约定式提交格式
- 提供清晰的描述信息
- 对于破坏性变更，明确标注 `BREAKING CHANGE`

### 2. 发布前检查

- 确保所有测试通过
- 检查工作目录是否干净
- 验证构建是否成功

### 3. 版本策略

- 主版本：重大架构变更或破坏性API变更
- 次版本：新功能添加，保持向后兼容
- 修订版本：问题修复和小的改进

### 4. 发布后操作

```bash
# 推送到远程仓库
git push origin main --tags

# 或使用单独的命令
git push origin main
git push origin --tags
```

## 故障排除

### 常见问题

#### 1. 工作目录不干净

```bash
# 错误信息
工作目录不干净，请先提交或暂存所有更改

# 解决方案
git add .
git commit -m "chore: 提交待处理的更改"
```

#### 2. Git标签已存在

```bash
# 删除本地标签
git tag -d v1.0.0

# 删除远程标签
git push origin :refs/tags/v1.0.0
```

#### 3. 版本号格式错误

确保package.json中的版本号遵循语义化版本格式：`major.minor.patch[-prerelease]`

### 调试模式

```bash
# 查看详细日志
DEBUG=version-manager node scripts/bump-version.js

# 干运行模式（不实际执行）
node scripts/bump-version.js --dry-run
```

## 集成CI/CD

### GitHub Actions示例

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Test
        run: npm test
```

## 支持和反馈

如果在使用过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的Issue列表
3. 创建新的Issue描述问题

## 更新日志

- v1.0.0: 初始版本，支持基础版本管理功能
- v1.1.0: 添加自动提交类型检测
- v1.2.0: 支持预发布版本管理