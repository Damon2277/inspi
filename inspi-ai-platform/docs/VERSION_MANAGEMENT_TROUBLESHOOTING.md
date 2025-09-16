# 版本管理系统故障排除指南

## 🚨 紧急情况处理

### 生产环境问题

#### 🔥 紧急回滚生产版本

**症状**: 生产环境出现严重问题，需要立即回滚

**解决方案**:
```bash
# 1. 立即回滚到上一个稳定版本
npm run version:rollback v0.2.0 --force --reason "紧急修复生产问题"

# 2. 验证回滚结果
npm run test:all
npm run build

# 3. 立即推送（谨慎使用 --force）
git push origin main --tags --force

# 4. 通知团队
echo "紧急回滚到 v0.2.0，原因：生产环境严重问题" | npm run team:notify
```

#### 🔥 版本标签丢失

**症状**: Git标签意外删除或丢失

**解决方案**:
```bash
# 1. 查找标签对应的提交
git log --oneline --grep="Release v1.0.0"
git log --oneline --grep="v1.0.0"

# 2. 从提交历史中找到对应的commit hash
git log --oneline | grep -i "1.0.0"

# 3. 重新创建标签
git tag v1.0.0 <commit-hash>
git tag -a v1.0.0 <commit-hash> -m "Release v1.0.0"

# 4. 推送标签
git push origin v1.0.0
```

## ⚠️ 常见错误及解决方案

### 版本升级错误

#### 错误1: 工作目录不干净

**错误信息**:
```
Error: 工作目录不干净，请先提交或暂存所有更改
Working directory is not clean. Please commit or stash changes.
```

**诊断**:
```bash
git status
git diff
```

**解决方案**:
```bash
# 方案1: 提交所有更改
git add .
git commit -m "chore: 提交待处理的更改"

# 方案2: 暂存更改
git stash push -m "临时暂存更改"

# 方案3: 重置更改（谨慎使用）
git checkout -- .
git clean -fd
```

#### 错误2: Git标签已存在

**错误信息**:
```
Error: 标签 v1.0.0 已存在
Tag v1.0.0 already exists
```

**诊断**:
```bash
git tag -l | grep v1.0.0
git show v1.0.0
```

**解决方案**:
```bash
# 方案1: 删除本地标签
git tag -d v1.0.0

# 方案2: 删除远程标签
git push origin :refs/tags/v1.0.0

# 方案3: 使用不同的版本号
npm run version:patch  # 或其他版本类型

# 重新创建版本
npm run version:bump
```

#### 错误3: 版本号格式错误

**错误信息**:
```
Error: 无效的版本号格式
Invalid version format
```

**诊断**:
```bash
cat package.json | grep version
node -e "console.log(require('./package.json').version)"
```

**解决方案**:
```bash
# 手动修复版本号（确保符合 x.y.z 格式）
npm version 1.0.0 --no-git-tag-version

# 或直接编辑package.json
sed -i 's/"version": ".*"/"version": "1.0.0"/' package.json

# 重新运行发布流程
npm run release
```

### Git操作错误

#### 错误4: 推送被拒绝

**错误信息**:
```
Error: 推送被拒绝，远程仓库有新的提交
Push rejected, remote has newer commits
```

**诊断**:
```bash
git status
git log --oneline -5
git fetch origin
git log --oneline origin/main -5
```

**解决方案**:
```bash
# 方案1: 拉取并合并
git pull origin main
git push origin main --tags

# 方案2: 变基（如果没有合并提交）
git fetch origin
git rebase origin/main
git push origin main --tags

# 方案3: 强制推送（谨慎使用）
git push origin main --tags --force
```

#### 错误5: 分支不存在

**错误信息**:
```
Error: 分支 'feature/new-feature' 不存在
Branch 'feature/new-feature' does not exist
```

**诊断**:
```bash
git branch -a
git branch -r
```

**解决方案**:
```bash
# 创建缺失的分支
git checkout -b feature/new-feature

# 或从远程检出分支
git checkout -b feature/new-feature origin/feature/new-feature

# 查看所有可用分支
npm run git:flow:list
```

### 版本历史错误

#### 错误6: 版本历史文件损坏

**错误信息**:
```
Error: 无法读取版本历史文件
Cannot read version history file
```

**诊断**:
```bash
ls -la .kiro/version-history.json
cat .kiro/version-history.json | jq .
```

**解决方案**:
```bash
# 方案1: 重新生成版本历史
rm .kiro/version-history.json
npm run version:history

# 方案2: 从备份恢复
cp .kiro/version-history.json.backup .kiro/version-history.json

# 方案3: 手动重建
node scripts/version-history.js rebuild
```

#### 错误7: 版本比较失败

**错误信息**:
```
Error: 无法比较版本 v0.1.0 和 v0.2.0
Cannot compare versions v0.1.0 and v0.2.0
```

**诊断**:
```bash
git tag -l | grep -E "v0\.[12]\.0"
git show v0.1.0
git show v0.2.0
```

**解决方案**:
```bash
# 检查标签是否存在
git tag -l | sort -V

# 手动比较提交
git log v0.1.0..v0.2.0 --oneline

# 重新运行比较
node scripts/version-history.js compare v0.1.0 v0.2.0 --force
```

### 版本回滚错误

#### 错误8: 回滚目标版本不存在

**错误信息**:
```
Error: 目标版本 v0.1.0 不存在
Target version v0.1.0 does not exist
```

**诊断**:
```bash
git tag -l | grep v0.1.0
git log --oneline --grep="v0.1.0"
```

**解决方案**:
```bash
# 查看所有可用版本
npm run version:history:list

# 选择存在的版本进行回滚
npm run version:rollback v0.2.0

# 或重新创建缺失的标签
git tag v0.1.0 <commit-hash>
```

#### 错误9: 回滚备份失败

**错误信息**:
```
Error: 无法创建回滚备份
Cannot create rollback backup
```

**诊断**:
```bash
ls -la .kiro/rollback-backups/
df -h .kiro/
```

**解决方案**:
```bash
# 检查磁盘空间
df -h

# 清理旧备份
find .kiro/rollback-backups -name "*.json" -mtime +30 -delete

# 手动创建备份目录
mkdir -p .kiro/rollback-backups

# 跳过备份进行回滚（谨慎使用）
node scripts/version-rollback.js v0.2.0 --skip-backup
```

## 🔧 调试工具和技巧

### 启用调试模式

```bash
# 启用详细日志
DEBUG=version-manager npm run version:bump
DEBUG=* npm run version:bump

# Git操作调试
GIT_TRACE=1 npm run version:bump
GIT_TRACE=2 npm run git:flow:feature test

# 干运行模式（不实际执行）
node scripts/bump-version.js --dry-run
node scripts/version-rollback.js v0.2.0 --dry-run
```

### 检查系统状态

```bash
# 完整系统状态检查
npm run version:status

# Git状态检查
git status --porcelain
git log --oneline -10
git tag -l | tail -10

# 版本一致性检查
npm run version:validate

# 工作流状态检查
npm run git:flow:status
```

### 日志文件分析

```bash
# 查看版本管理日志
cat .kiro/version-history.json | jq .

# 查看回滚日志
cat .kiro/rollback-log.json | jq .

# 查看Git日志
git log --oneline --graph --decorate -20

# 查看标签历史
git for-each-ref --format='%(refname:short) %(taggerdate) %(subject)' refs/tags
```

## 🛠️ 修复工具

### 版本一致性修复

```bash
#!/bin/bash
# fix-version-consistency.sh

echo "检查版本一致性..."

# 获取package.json中的版本
PACKAGE_VERSION=$(node -e "console.log(require('./package.json').version)")

# 获取最新Git标签
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")

echo "Package.json版本: $PACKAGE_VERSION"
echo "最新Git标签: $LATEST_TAG"

if [ "$LATEST_TAG" != "v$PACKAGE_VERSION" ]; then
    echo "版本不一致，正在修复..."
    
    # 创建对应的标签
    git tag "v$PACKAGE_VERSION" -m "Fix version consistency"
    echo "已创建标签: v$PACKAGE_VERSION"
fi

echo "版本一致性检查完成"
```

### Git钩子修复

```bash
#!/bin/bash
# fix-git-hooks.sh

echo "修复Git钩子..."

# 重新安装Git钩子
npm run git:hooks:uninstall
npm run git:hooks:install

# 检查钩子权限
chmod +x .git/hooks/*

# 验证钩子
npm run git:hooks:list

echo "Git钩子修复完成"
```

### 清理脚本

```bash
#!/bin/bash
# cleanup-version-system.sh

echo "清理版本管理系统..."

# 清理旧备份
find .kiro/rollback-backups -name "*.json" -mtime +30 -delete

# 清理临时文件
rm -f .kiro/tmp-*
rm -f .kiro/*.tmp

# 压缩日志文件
gzip .kiro/version-history.json.old 2>/dev/null || true

# 验证系统状态
npm run version:validate

echo "清理完成"
```

## 📊 性能优化

### 大型仓库优化

```bash
# 浅克隆以提高性能
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256

# 优化Git操作
git config fetch.parallel 4
git config submodule.fetchJobs 4
```

### 版本历史优化

```bash
# 限制版本历史查询范围
node scripts/version-history.js list --limit 50

# 使用缓存加速查询
node scripts/version-history.js list --cache

# 异步处理大量版本
node scripts/version-history.js list --async
```

## 🔍 监控和预防

### 设置监控

```bash
#!/bin/bash
# monitor-version-system.sh

# 检查版本系统健康状态
check_health() {
    echo "检查版本系统健康状态..."
    
    # 检查关键文件
    if [ ! -f "package.json" ]; then
        echo "❌ package.json 不存在"
        return 1
    fi
    
    if [ ! -f ".kiro/version-history.json" ]; then
        echo "⚠️  版本历史文件不存在，正在创建..."
        npm run version:history > /dev/null
    fi
    
    # 检查Git状态
    if ! git status > /dev/null 2>&1; then
        echo "❌ Git仓库状态异常"
        return 1
    fi
    
    echo "✅ 版本系统健康状态正常"
    return 0
}

# 定期运行健康检查
check_health
```

### 预防措施

```bash
# 设置Git别名以防止误操作
git config alias.safe-push 'push --dry-run'
git config alias.safe-tag 'tag --dry-run'

# 启用Git钩子保护
npm run git:hooks:install

# 设置自动备份
crontab -e
# 添加: 0 2 * * * cd /path/to/project && npm run version:backup
```

## 📞 获取帮助

### 内置帮助

```bash
# 查看命令帮助
node scripts/bump-version.js --help
node scripts/version-history.js --help
node scripts/version-rollback.js --help

# 查看配置选项
cat version.config.json | jq .
```

### 社区支持

1. **查看项目文档**: `docs/VERSION_MANAGEMENT_*.md`
2. **搜索已知问题**: GitHub Issues
3. **创建新问题**: 提供详细的错误信息和复现步骤
4. **联系维护者**: 通过项目联系方式

### 错误报告模板

```markdown
## 问题描述
[简要描述遇到的问题]

## 复现步骤
1. 执行命令: `npm run version:bump`
2. 出现错误: [错误信息]

## 环境信息
- Node.js版本: `node --version`
- npm版本: `npm --version`
- Git版本: `git --version`
- 操作系统: [macOS/Linux/Windows]

## 错误日志
```
[粘贴完整的错误日志]
```

## 系统状态
```
[粘贴 `npm run version:status` 的输出]
```
```

---

**故障排除指南版本**: v1.0.0  
**最后更新**: 2025-09-04  
**紧急联系**: 项目维护团队