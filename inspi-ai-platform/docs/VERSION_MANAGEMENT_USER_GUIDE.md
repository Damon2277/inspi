# 版本管理系统使用指南

## 概述

本项目使用简化的版本管理系统，基于语义化版本控制（SemVer）规范，支持自动化版本升级、Git标签创建、发布说明生成、版本历史管理和安全回滚功能。

## 目录

- [快速开始](#快速开始)
- [常用命令快速参考](#常用命令快速参考)
- [版本升级](#版本升级)
- [版本历史管理](#版本历史管理)
- [版本回滚](#版本回滚)
- [发布流程](#发布流程)
- [Git工作流](#git工作流)
- [配置说明](#配置说明)
- [故障排除](#故障排除)
- [FAQ](#faq)
- [最佳实践](#最佳实践)

## 快速开始

### 1. 查看当前版本

```bash
npm run version:current
```

### 2. 自动版本升级

```bash
npm run version:bump
```

### 3. 完整发布流程

```bash
npm run release
```

### 4. 查看版本历史

```bash
npm run version:history
```

### 5. 推送到远程仓库

```bash
git push origin main --tags
```

## 常用命令快速参考

### 版本管理命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `npm run version:current` | 显示当前版本 | `v0.3.1` |
| `npm run version:bump` | 自动版本升级 | 根据提交历史自动检测 |
| `npm run version:major` | 主版本升级 | `1.0.0 → 2.0.0` |
| `npm run version:minor` | 次版本升级 | `1.0.0 → 1.1.0` |
| `npm run version:patch` | 修订版本升级 | `1.0.0 → 1.0.1` |
| `npm run version:prerelease` | 预发布版本 | `1.0.0 → 1.0.1-beta.0` |
| `npm run release` | 完整发布流程 | 升级版本 + 生成文档 |

### 版本历史命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `npm run version:history` | 版本状态概览 | 显示当前版本和统计信息 |
| `npm run version:history:list` | 列出版本历史 | 显示最近10个版本 |
| `npm run version:history:show v0.3.0` | 查看版本详情 | 显示指定版本的详细信息 |
| `npm run version:history:compare v0.2.0 v0.3.0` | 比较版本 | 显示两个版本间的差异 |
| `npm run version:history:search "bug fix"` | 搜索版本 | 按关键词搜索版本 |

### 版本回滚命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `npm run version:rollback:validate` | 验证系统状态 | 检查回滚前的系统状态 |
| `npm run version:rollback v0.2.0` | 回滚到指定版本 | 安全回滚到指定版本 |
| `npm run version:rollback:history` | 查看回滚历史 | 显示历史回滚记录 |
| `npm run version:rollback:backups` | 列出备份 | 显示可用的备份文件 |

### Git工作流命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `npm run git:flow:feature new-feature` | 创建功能分支 | 创建并切换到功能分支 |
| `npm run git:flow:hotfix critical-fix` | 创建热修复分支 | 创建并切换到热修复分支 |
| `npm run git:flow:release v1.0.0` | 创建发布分支 | 创建并切换到发布分支 |
| `npm run git:flow:status` | 查看工作流状态 | 显示当前分支和状态 |

### 快速提交命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `npm run commit:feat` | 功能提交 | `feat: 添加新功能` |
| `npm run commit:fix` | 修复提交 | `fix: 修复bug` |
| `npm run commit:docs` | 文档提交 | `docs: 更新文档` |
| `npm run commit:test` | 测试提交 | `test: 添加测试` |

## 版本升级

### 自动版本升级

系统会根据Git提交历史自动检测版本升级类型：

```bash
npm run version:bump
```

**检测规则：**
- **主版本 (Major)**: 包含 `BREAKING CHANGE` 或 `!:` 的提交
- **次版本 (Minor)**: 以 `feat:` 开头的提交
- **修订版本 (Patch)**: 以 `fix:` 开头的提交或其他类型的提交

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

### 提交信息格式

建议使用约定式提交格式：

```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

**支持的提交类型：**
- `feat`: 新功能 (触发 minor 版本升级)
- `fix`: 问题修复 (触发 patch 版本升级)
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动
- `perf`: 性能优化

**示例：**

```bash
# 新功能
git commit -m "feat: 添加用户认证功能"

# 问题修复
git commit -m "fix: 修复登录页面显示问题"

# 破坏性变更
git commit -m "feat!: 重构API接口结构

BREAKING CHANGE: API接口路径从 /api/v1 改为 /api/v2"
```

## 版本历史管理

### 版本状态概览

```bash
npm run version:history
```

显示：
- 当前版本信息
- 最新版本标签
- 版本总数
- 最近发布时间

### 列出版本历史

```bash
# 列出最近10个版本
npm run version:history:list

# 使用脚本参数列出更多版本
node scripts/version-history.js list --limit 20

# 以JSON格式输出
node scripts/version-history.js list --json

# 显示详细信息
node scripts/version-history.js list --detail
```

### 查看版本详情

```bash
# 查看指定版本的详细信息
npm run version:history:show v0.3.0
```

显示：
- 版本号和标签
- 发布日期和作者
- 提交ID和标签说明
- 完整的发布说明

### 比较版本

```bash
# 比较两个版本的差异
npm run version:history:compare v0.2.0 v0.3.0
```

显示：
- 版本间的提交变更
- 按功能、修复和其他变更分类
- 变更统计信息

### 搜索版本

```bash
# 搜索包含关键词的版本
npm run version:history:search "bug fix"

# 按类型搜索
node scripts/version-history.js search "feature" --type message
node scripts/version-history.js search "John" --type author
node scripts/version-history.js search "0.3" --type version
```

## 版本回滚

### 系统状态验证

在执行回滚前，建议先验证系统状态：

```bash
npm run version:rollback:validate
```

检查：
- 工作目录是否干净
- Git状态是否正常
- 当前分支信息
- 未推送的提交

### 执行版本回滚

```bash
# 回滚到指定版本
npm run version:rollback v0.2.0

# 使用脚本参数进行高级回滚
node scripts/version-rollback.js v0.2.0 --force --reason "修复关键安全漏洞"
```

**回滚参数：**
- `--force`: 强制回滚（忽略工作目录检查）
- `--skip-backup`: 跳过备份创建
- `--reason "原因"`: 指定回滚原因

### 回滚安全检查

回滚系统包含多重安全检查：

1. **工作目录检查**: 确保没有未提交的更改
2. **版本存在性验证**: 确认目标版本存在
3. **向前回滚警告**: 提醒用户避免回滚到更新版本
4. **自动备份**: 在回滚前创建当前状态的备份

### 查看回滚历史

```bash
npm run version:rollback:history
```

显示：
- 回滚操作时间
- 源版本和目标版本
- 回滚原因
- 操作结果

### 管理备份

```bash
# 列出可用备份
npm run version:rollback:backups
```

备份包含：
- 当前package.json的副本
- 回滚操作的详细信息
- Git分支和提交信息

## 发布流程

### 完整发布流程

```bash
npm run release
```

执行步骤：
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

- **版本概述**: 版本号、发布日期、主要变更概述
- **新功能列表**: 基于 `feat:` 提交生成
- **问题修复列表**: 基于 `fix:` 提交生成
- **其他变更**: 其他类型的提交
- **破坏性变更**: 如果存在破坏性变更
- **安装和升级指南**: 版本升级说明
- **相关链接**: Git标签和提交链接

### 高级发布命令

```bash
# 完整发布流程（包含文档生成）
npm run release:full

# 快速发布（跳过某些检查）
npm run release:quick

# 发布并推送到远程
npm run release:deploy

# 仅生成发布文档
npm run release:docs
```

## Git工作流

### 分支管理

#### 创建功能分支

```bash
npm run git:flow:feature new-feature-name
```

#### 创建热修复分支

```bash
npm run git:flow:hotfix critical-bug-fix
```

#### 创建发布分支

```bash
npm run git:flow:release v1.0.0
```

### 分支合并

```bash
# 合并功能分支
npm run git:merge:feature feature-branch-name

# 合并热修复分支
npm run git:merge:hotfix hotfix-branch-name

# 合并发布分支
npm run git:merge:release release-branch-name
```

### 工作流状态

```bash
# 查看当前工作流状态
npm run git:flow:status

# 列出所有分支
npm run git:flow:list
```

## 配置说明

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
      {"type": "fix", "bump": "patch", "changelog": true},
      {"type": "docs", "bump": "none", "changelog": false}
    ]
  },
  "release": {
    "generateNotes": true,
    "includeAssets": ["dist/", "docs/"],
    "notifyChannels": ["#releases"]
  }
}
```

### Git钩子配置

```bash
# 安装Git钩子
npm run git:hooks:install

# 卸载Git钩子
npm run git:hooks:uninstall

# 列出已安装的钩子
npm run git:hooks:list
```

## 故障排除

### 常见问题及解决方案

#### 1. 工作目录不干净

**错误信息：**
```
工作目录不干净，请先提交或暂存所有更改
```

**解决方案：**
```bash
# 查看未提交的更改
git status

# 提交所有更改
git add .
git commit -m "chore: 提交待处理的更改"

# 或者暂存更改
git stash
```

#### 2. Git标签已存在

**错误信息：**
```
标签 v1.0.0 已存在
```

**解决方案：**
```bash
# 删除本地标签
git tag -d v1.0.0

# 删除远程标签
git push origin :refs/tags/v1.0.0

# 重新创建版本
npm run version:bump
```

#### 3. 版本号格式错误

**错误信息：**
```
无效的版本号格式
```

**解决方案：**
确保package.json中的版本号遵循语义化版本格式：`major.minor.patch[-prerelease]`

```bash
# 手动修复版本号
npm version 1.0.0 --no-git-tag-version
```

#### 4. 推送失败

**错误信息：**
```
推送被拒绝，远程仓库有新的提交
```

**解决方案：**
```bash
# 拉取最新更改
git pull origin main

# 重新推送
git push origin main --tags
```

#### 5. 版本回滚失败

**错误信息：**
```
无法回滚到指定版本
```

**解决方案：**
```bash
# 验证目标版本是否存在
git tag -l | grep v1.0.0

# 检查系统状态
npm run version:rollback:validate

# 强制回滚（谨慎使用）
node scripts/version-rollback.js v1.0.0 --force
```

### 调试模式

```bash
# 查看详细日志
DEBUG=version-manager npm run version:bump

# 干运行模式（不实际执行）
node scripts/bump-version.js --dry-run

# 查看Git操作详情
GIT_TRACE=1 npm run version:bump
```

### 日志文件

版本管理系统会在以下位置生成日志文件：

- `.kiro/version-history.json`: 版本历史记录
- `.kiro/rollback-log.json`: 回滚操作日志
- `.kiro/rollback-backups/`: 回滚备份文件

## FAQ

### Q1: 如何撤销刚刚创建的版本？

**A:** 如果版本还没有推送到远程仓库：

```bash
# 删除最新的标签
git tag -d $(git describe --tags --abbrev=0)

# 重置到上一个提交
git reset --hard HEAD~1

# 恢复package.json版本号
git checkout HEAD~1 -- package.json
```

### Q2: 如何跳过某个版本号？

**A:** 可以手动指定版本号：

```bash
# 直接设置版本号
npm version 2.0.0 --no-git-tag-version

# 然后运行发布流程
npm run release:docs
git add .
git commit -m "chore: 发布 v2.0.0"
git tag v2.0.0
```

### Q3: 如何处理预发布版本？

**A:** 使用预发布命令：

```bash
# 创建预发布版本
npm run version:prerelease

# 从预发布版本升级到正式版本
npm version patch --no-git-tag-version
npm run release
```

### Q4: 如何自定义发布说明模板？

**A:** 修改 `scripts/release-doc-generator.js` 中的模板：

```javascript
const template = `
# Release Notes v{{version}}

## 概述
{{overview}}

## 新功能
{{features}}

## 问题修复
{{fixes}}
`;
```

### Q5: 如何集成CI/CD？

**A:** 在 `.github/workflows/release.yml` 中添加：

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

### Q6: 如何批量处理多个版本？

**A:** 使用脚本参数：

```bash
# 批量查看版本信息
for version in v0.1.0 v0.2.0 v0.3.0; do
  npm run version:history:show $version
done

# 批量比较版本
node scripts/version-history.js compare v0.1.0 v0.3.0 --format json
```

### Q7: 如何恢复误删的版本标签？

**A:** 从Git历史中恢复：

```bash
# 查找标签对应的提交
git log --oneline --grep="Release v1.0.0"

# 重新创建标签
git tag v1.0.0 <commit-hash>

# 推送标签
git push origin v1.0.0
```

## 最佳实践

### 1. 提交信息规范

- 使用约定式提交格式
- 提供清晰的描述信息
- 对于破坏性变更，明确标注 `BREAKING CHANGE`
- 使用快速提交命令保持一致性

### 2. 发布前检查

```bash
# 完整的发布前检查流程
npm run version:validate
npm run test:all
npm run build:production
npm run version:bump
```

### 3. 版本策略

- **主版本**: 重大架构变更或破坏性API变更
- **次版本**: 新功能添加，保持向后兼容
- **修订版本**: 问题修复和小的改进
- **预发布版本**: 测试版本，用于内部测试

### 4. 分支管理

```bash
# 功能开发流程
npm run git:flow:feature new-feature
# 开发功能...
npm run commit:feat "添加新功能"
npm run git:merge:feature new-feature

# 热修复流程
npm run git:flow:hotfix critical-fix
# 修复问题...
npm run commit:fix "修复关键问题"
npm run git:merge:hotfix critical-fix
```

### 5. 发布后操作

```bash
# 推送到远程仓库
git push origin main --tags

# 验证发布
npm run version:history:show $(git describe --tags --abbrev=0)

# 通知团队
npm run team:notify
```

### 6. 版本历史管理

- 定期查看版本历史，了解项目发展轨迹
- 使用版本比较功能分析变更影响
- 保持发布说明的完整性和准确性
- 及时清理过期的预发布版本

### 7. 版本回滚策略

- 仅在紧急情况下使用版本回滚
- 回滚前务必验证系统状态
- 保留回滚备份，以便必要时恢复
- 回滚后立即运行完整测试套件
- 记录回滚原因，便于后续分析

### 8. 监控和维护

```bash
# 定期检查版本状态
npm run version:status

# 清理旧的备份文件
find .kiro/rollback-backups -name "*.json" -mtime +30 -delete

# 验证版本一致性
npm run version:validate
```

## 支持和反馈

如果在使用过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的Issue列表
3. 创建新的Issue描述问题
4. 联系项目维护者

---

**文档版本**: v1.0.0  
**最后更新**: 2025-09-04  
**维护者**: Inspi AI Platform Team