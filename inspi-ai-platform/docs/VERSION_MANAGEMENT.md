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

#### 版本管理
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

#### 版本历史查询
```json
{
  "version:history": "显示版本状态概览",
  "version:history:list": "列出版本历史",
  "version:history:show": "显示指定版本详情",
  "version:history:compare": "比较两个版本",
  "version:history:search": "搜索版本"
}
```

#### 版本回滚
```json
{
  "version:rollback": "回滚到指定版本",
  "version:rollback:history": "显示回滚历史",
  "version:rollback:backups": "列出可用备份",
  "version:rollback:validate": "验证系统状态"
}
```

## 版本历史管理

### 查看版本历史

#### 版本状态概览

```bash
npm run version:history
# 或
node scripts/version-history.js status
```

显示当前版本状态、最新标签和版本总数。

#### 列出版本历史

```bash
# 列出最近10个版本
npm run version:history:list

# 列出所有版本
node scripts/version-history.js list --limit 100

# 以JSON格式输出
node scripts/version-history.js list --json

# 显示详细信息
node scripts/version-history.js list --detail
```

#### 查看版本详情

```bash
# 查看指定版本的详细信息
npm run version:history:show v0.3.0
# 或
node scripts/version-history.js show v0.3.0
```

显示版本的发布日期、作者、提交ID、标签说明和完整的发布说明。

#### 比较版本

```bash
# 比较两个版本的差异
npm run version:history:compare v0.2.0 v0.3.0
# 或
node scripts/version-history.js compare v0.2.0 v0.3.0
```

显示版本间的提交变更，按功能、修复和其他变更分类。

#### 搜索版本

```bash
# 搜索包含关键词的版本
npm run version:history:search "bug fix"

# 按类型搜索
node scripts/version-history.js search "feature" --type message
node scripts/version-history.js search "John" --type author
node scripts/version-history.js search "0.3" --type version
```

### 版本回滚

#### 系统状态验证

在执行回滚前，建议先验证系统状态：

```bash
npm run version:rollback:validate
# 或
node scripts/version-rollback.js validate
```

#### 执行版本回滚

```bash
# 回滚到指定版本
npm run version:rollback v0.2.0
# 或
node scripts/version-rollback.js v0.2.0

# 强制回滚（忽略工作目录检查）
node scripts/version-rollback.js v0.2.0 --force

# 跳过备份创建
node scripts/version-rollback.js v0.2.0 --skip-backup

# 指定回滚原因
node scripts/version-rollback.js v0.2.0 --reason "修复关键安全漏洞"
```

#### 回滚安全检查

回滚系统包含多重安全检查：

1. **工作目录检查**: 确保没有未提交的更改
2. **版本存在性验证**: 确认目标版本存在
3. **向前回滚警告**: 提醒用户避免回滚到更新版本
4. **自动备份**: 在回滚前创建当前状态的备份

#### 查看回滚历史

```bash
npm run version:rollback:history
# 或
node scripts/version-rollback.js history
```

#### 管理备份

```bash
# 列出可用备份
npm run version:rollback:backups
# 或
node scripts/version-rollback.js backups
```

备份包含：
- 当前package.json的副本
- 回滚操作的详细信息
- Git分支和提交信息

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

### 5. 版本历史管理

- 定期查看版本历史，了解项目发展轨迹
- 使用版本比较功能分析变更影响
- 保持发布说明的完整性和准确性

### 6. 版本回滚策略

- 仅在紧急情况下使用版本回滚
- 回滚前务必验证系统状态
- 保留回滚备份，以便必要时恢复
- 回滚后立即运行完整测试套件
- 记录回滚原因，便于后续分析

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

## 相关文档

本文档是版本管理系统的基础使用指南。更详细的信息请参考：

- **[完整使用指南](VERSION_MANAGEMENT_USER_GUIDE.md)** - 详细的功能说明和使用方法
- **[快速参考](VERSION_MANAGEMENT_QUICK_REFERENCE.md)** - 常用命令速查表
- **[常见问题解答](VERSION_MANAGEMENT_FAQ.md)** - FAQ和解决方案
- **[故障排除指南](VERSION_MANAGEMENT_TROUBLESHOOTING.md)** - 错误诊断和修复方法

## 更新日志

- v1.0.0: 初始版本，支持基础版本管理功能
- v1.1.0: 添加自动提交类型检测
- v1.2.0: 支持预发布版本管理
- v1.3.0: 新增版本历史查询和版本回滚功能
  - 版本历史查看、比较和搜索
  - 安全的版本回滚机制
  - 自动备份和回滚日志记录
  - 系统状态验证和安全检查
- v1.4.0: 完善文档体系
  - 新增完整使用指南
  - 添加快速参考和FAQ
  - 提供详细的故障排除指南
  - 优化用户体验和可维护性