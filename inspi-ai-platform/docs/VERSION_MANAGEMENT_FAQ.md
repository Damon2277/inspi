# 版本管理系统常见问题解答 (FAQ)

## 📋 目录

- [基础问题](#基础问题)
- [版本升级问题](#版本升级问题)
- [版本历史问题](#版本历史问题)
- [版本回滚问题](#版本回滚问题)
- [Git工作流问题](#git工作流问题)
- [发布流程问题](#发布流程问题)
- [配置问题](#配置问题)
- [故障排除](#故障排除)
- [高级用法](#高级用法)

## 基础问题

### Q1: 什么是语义化版本控制？

**A:** 语义化版本控制（SemVer）是一种版本号命名规范，格式为 `MAJOR.MINOR.PATCH`：

- **MAJOR**: 不兼容的API修改
- **MINOR**: 向下兼容的功能性新增
- **PATCH**: 向下兼容的问题修正

示例：`1.2.3` → `1.2.4`（修复）→ `1.3.0`（新功能）→ `2.0.0`（破坏性变更）

### Q2: 如何查看当前版本？

**A:** 使用以下任一命令：

```bash
npm run version:current
node scripts/bump-version.js --version
cat package.json | grep version
```

### Q3: 版本管理系统包含哪些功能？

**A:** 主要功能包括：

- ✅ 自动版本升级
- ✅ Git标签管理
- ✅ 发布说明生成
- ✅ 版本历史查询
- ✅ 安全版本回滚
- ✅ Git工作流集成
- ✅ 提交信息验证

## 版本升级问题

### Q4: 如何自动检测版本升级类型？

**A:** 系统根据Git提交历史自动检测：

```bash
npm run version:bump
```

**检测规则：**
- 包含 `BREAKING CHANGE` 或 `!:` → major
- 以 `feat:` 开头 → minor
- 以 `fix:` 开头 → patch
- 其他类型 → patch

### Q5: 如何手动指定版本类型？

**A:** 使用对应的命令：

```bash
npm run version:major     # 1.0.0 → 2.0.0
npm run version:minor     # 1.0.0 → 1.1.0
npm run version:patch     # 1.0.0 → 1.0.1
npm run version:prerelease # 1.0.0 → 1.0.1-beta.0
```

### Q6: 如何撤销刚刚创建的版本？

**A:** 如果版本还没有推送到远程：

```bash
# 删除最新标签
git tag -d $(git describe --tags --abbrev=0)

# 重置到上一个提交
git reset --hard HEAD~1

# 恢复package.json版本号
git checkout HEAD~1 -- package.json
```

### Q7: 如何跳过某个版本号？

**A:** 手动设置版本号：

```bash
# 直接设置版本号
npm version 2.0.0 --no-git-tag-version

# 运行发布流程
npm run release:docs
git add .
git commit -m "chore: 发布 v2.0.0"
git tag v2.0.0
```

### Q8: 预发布版本如何管理？

**A:** 使用预发布命令：

```bash
# 创建预发布版本
npm run version:prerelease  # 1.0.0 → 1.0.1-beta.0

# 继续预发布
npm run version:prerelease  # 1.0.1-beta.0 → 1.0.1-beta.1

# 升级到正式版本
npm version patch --no-git-tag-version  # 1.0.1-beta.1 → 1.0.1
npm run release
```

## 版本历史问题

### Q9: 如何查看版本历史？

**A:** 使用版本历史命令：

```bash
# 版本状态概览
npm run version:history

# 列出版本历史
npm run version:history:list

# 查看特定版本详情
npm run version:history:show v0.3.0
```

### Q10: 如何比较两个版本的差异？

**A:** 使用版本比较命令：

```bash
npm run version:history:compare v0.2.0 v0.3.0
```

显示内容：
- 版本间的提交变更
- 按功能、修复、其他分类
- 变更统计信息

### Q11: 如何搜索特定的版本？

**A:** 使用搜索功能：

```bash
# 按关键词搜索
npm run version:history:search "bug fix"

# 按类型搜索
node scripts/version-history.js search "feature" --type message
node scripts/version-history.js search "John" --type author
node scripts/version-history.js search "0.3" --type version
```

### Q12: 版本历史数据存储在哪里？

**A:** 版本历史数据存储在：

- `.kiro/version-history.json` - 版本历史记录
- Git标签 - 版本标签信息
- 发布说明文件 - `RELEASE_NOTES_v*.md`

## 版本回滚问题

### Q13: 什么时候需要版本回滚？

**A:** 以下情况可能需要版本回滚：

- 发现严重的安全漏洞
- 关键功能出现重大问题
- 性能严重下降
- 数据丢失或损坏风险

**注意：** 版本回滚应该是最后的手段，优先考虑热修复。

### Q14: 如何安全地执行版本回滚？

**A:** 遵循以下步骤：

```bash
# 1. 验证系统状态
npm run version:rollback:validate

# 2. 检查目标版本是否存在
git tag -l | grep v0.2.0

# 3. 执行回滚
npm run version:rollback v0.2.0

# 4. 验证回滚结果
npm run test:all
npm run build
```

### Q15: 版本回滚有哪些安全检查？

**A:** 回滚系统包含多重安全检查：

1. **工作目录检查** - 确保没有未提交的更改
2. **版本存在性验证** - 确认目标版本存在
3. **向前回滚警告** - 避免回滚到更新版本
4. **自动备份** - 回滚前创建备份
5. **用户确认** - 需要用户明确确认

### Q16: 如何查看回滚历史？

**A:** 使用回滚历史命令：

```bash
# 查看回滚历史
npm run version:rollback:history

# 查看可用备份
npm run version:rollback:backups
```

### Q17: 如何恢复误操作的回滚？

**A:** 从备份中恢复：

```bash
# 查看可用备份
npm run version:rollback:backups

# 手动恢复（示例）
cp .kiro/rollback-backups/backup-20250904-143022.json package.json
git add package.json
git commit -m "chore: 恢复版本回滚"
```

## Git工作流问题

### Q18: 支持哪些Git工作流？

**A:** 支持简化的GitFlow工作流：

- **main分支** - 主分支，用于生产发布
- **develop分支** - 开发分支（可选）
- **feature分支** - 功能开发分支
- **hotfix分支** - 热修复分支
- **release分支** - 发布准备分支

### Q19: 如何创建和管理功能分支？

**A:** 使用Git工作流命令：

```bash
# 创建功能分支
npm run git:flow:feature new-feature

# 开发完成后合并
npm run git:merge:feature new-feature

# 查看分支状态
npm run git:flow:status
```

### Q20: 提交信息格式有什么要求？

**A:** 建议使用约定式提交格式：

```
<类型>[可选作用域]: <描述>

[可选正文]

[可选脚注]
```

**支持的类型：**
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

### Q21: 如何处理破坏性变更？

**A:** 在提交信息中明确标注：

```bash
git commit -m "feat!: 重构API接口结构

BREAKING CHANGE: API接口路径从 /api/v1 改为 /api/v2
用户需要更新所有API调用路径"
```

## 发布流程问题

### Q22: 完整的发布流程是什么？

**A:** 标准发布流程：

```bash
# 1. 验证状态
npm run version:validate

# 2. 运行测试
npm run test:all

# 3. 构建项目
npm run build

# 4. 发布版本
npm run release

# 5. 推送到远程
git push origin main --tags
```

### Q23: 发布说明包含什么内容？

**A:** 自动生成的发布说明包含：

- 版本概述和发布日期
- 新功能列表（基于 `feat:` 提交）
- 问题修复列表（基于 `fix:` 提交）
- 其他变更
- 破坏性变更说明
- 安装和升级指南
- 相关链接

### Q24: 如何自定义发布说明模板？

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

## 自定义内容
{{custom}}
`;
```

### Q25: 如何处理发布失败？

**A:** 根据失败阶段采取不同措施：

```bash
# 如果版本号已更新但标签未创建
git tag v1.0.0
git push origin v1.0.0

# 如果需要重新生成发布说明
npm run release:docs

# 如果需要完全重新发布
git reset --hard HEAD~1
npm run release
```

## 配置问题

### Q26: 如何修改版本配置？

**A:** 编辑 `version.config.json` 文件：

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

### Q27: 如何安装和配置Git钩子？

**A:** 使用Git钩子管理命令：

```bash
# 安装Git钩子
npm run git:hooks:install

# 查看已安装的钩子
npm run git:hooks:list

# 卸载Git钩子
npm run git:hooks:uninstall
```

### Q28: 如何集成CI/CD？

**A:** 在 `.github/workflows/release.yml` 中配置：

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
      - name: Build and Test
        run: |
          npm run build
          npm test
      - name: Deploy
        run: npm run deploy
```

## 故障排除

### Q29: "工作目录不干净" 错误如何解决？

**A:** 清理工作目录：

```bash
# 查看状态
git status

# 提交所有更改
git add .
git commit -m "chore: 提交待处理的更改"

# 或者暂存更改
git stash
```

### Q30: "标签已存在" 错误如何解决？

**A:** 删除现有标签：

```bash
# 删除本地标签
git tag -d v1.0.0

# 删除远程标签
git push origin :refs/tags/v1.0.0

# 重新创建版本
npm run version:bump
```

### Q31: 推送失败如何解决？

**A:** 同步远程更改：

```bash
# 拉取最新更改
git pull origin main

# 如果有冲突，解决后重新推送
git push origin main --tags
```

### Q32: 版本号格式错误如何修复？

**A:** 手动修复版本号：

```bash
# 检查当前版本号
cat package.json | grep version

# 手动修复（确保符合 x.y.z 格式）
npm version 1.0.0 --no-git-tag-version

# 重新运行发布流程
npm run release
```

## 高级用法

### Q33: 如何批量处理多个版本？

**A:** 使用脚本循环：

```bash
# 批量查看版本信息
for version in v0.1.0 v0.2.0 v0.3.0; do
  npm run version:history:show $version
done

# 批量比较版本
versions=(v0.1.0 v0.2.0 v0.3.0)
for i in {0..1}; do
  node scripts/version-history.js compare ${versions[$i]} ${versions[$((i+1))]}
done
```

### Q34: 如何导出版本历史数据？

**A:** 使用JSON格式导出：

```bash
# 导出版本列表
node scripts/version-history.js list --json > versions.json

# 导出特定版本详情
node scripts/version-history.js show v0.3.0 --json > version-0.3.0.json
```

### Q35: 如何自动化发布流程？

**A:** 创建自动化脚本：

```bash
#!/bin/bash
# auto-release.sh

set -e

echo "开始自动发布流程..."

# 验证状态
npm run version:validate

# 运行测试
npm run test:all

# 构建项目
npm run build:production

# 发布版本
npm run release

# 推送到远程
git push origin main --tags

echo "发布完成！"
```

### Q36: 如何监控版本发布？

**A:** 设置监控脚本：

```bash
# 检查版本状态
npm run version:status

# 验证远程同步
git fetch --tags
git log --oneline --decorate --graph -10

# 检查发布说明
ls -la RELEASE_NOTES_*.md
```

### Q37: 如何处理大型项目的版本管理？

**A:** 对于大型项目，建议：

1. **使用单独的发布分支**
2. **实施代码审查流程**
3. **自动化测试和构建**
4. **分阶段发布策略**
5. **详细的发布说明**

```bash
# 创建发布分支
npm run git:flow:release v1.0.0

# 在发布分支上进行最终测试
npm run test:all
npm run build:production

# 合并发布分支
npm run git:merge:release v1.0.0
```

## 🆘 紧急情况处理

### Q38: 如何紧急回滚生产版本？

**A:** 紧急回滚流程：

```bash
# 1. 立即回滚到上一个稳定版本
npm run version:rollback v0.2.0 --force --reason "紧急修复生产问题"

# 2. 验证回滚结果
npm run test:all

# 3. 立即推送
git push origin main --tags --force

# 4. 通知团队
npm run team:notify "紧急回滚到 v0.2.0"
```

### Q39: 如何恢复丢失的版本标签？

**A:** 从Git历史恢复：

```bash
# 查找标签对应的提交
git log --oneline --grep="Release v1.0.0"

# 重新创建标签
git tag v1.0.0 <commit-hash>

# 推送标签
git push origin v1.0.0
```

### Q40: 如何处理版本冲突？

**A:** 解决版本冲突：

```bash
# 1. 检查冲突状态
git status

# 2. 手动解决package.json冲突
# 编辑package.json，选择正确的版本号

# 3. 提交解决方案
git add package.json
git commit -m "resolve: 解决版本冲突"

# 4. 重新运行发布流程
npm run release
```

---

**FAQ版本**: v1.0.0  
**最后更新**: 2025-09-04  
**如有其他问题，请创建Issue或联系维护团队**