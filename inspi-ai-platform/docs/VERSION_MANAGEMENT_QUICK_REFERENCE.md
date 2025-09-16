# 版本管理系统快速参考

## 🚀 常用命令

### 版本管理
```bash
npm run version:current          # 查看当前版本
npm run version:bump             # 自动版本升级
npm run version:major            # 主版本升级 (1.0.0 → 2.0.0)
npm run version:minor            # 次版本升级 (1.0.0 → 1.1.0)
npm run version:patch            # 修订版本升级 (1.0.0 → 1.0.1)
npm run release                  # 完整发布流程
```

### 版本历史
```bash
npm run version:history          # 版本状态概览
npm run version:history:list     # 列出版本历史
npm run version:history:show v0.3.0    # 查看版本详情
npm run version:history:compare v0.2.0 v0.3.0  # 比较版本
npm run version:history:search "bug fix"       # 搜索版本
```

### 版本回滚
```bash
npm run version:rollback:validate       # 验证系统状态
npm run version:rollback v0.2.0         # 回滚到指定版本
npm run version:rollback:history        # 查看回滚历史
npm run version:rollback:backups        # 列出备份
```

### Git工作流
```bash
npm run git:flow:feature new-feature    # 创建功能分支
npm run git:flow:hotfix critical-fix    # 创建热修复分支
npm run git:flow:status                 # 查看工作流状态
```

### 快速提交
```bash
npm run commit:feat     # feat: 新功能提交
npm run commit:fix      # fix: 修复提交
npm run commit:docs     # docs: 文档提交
npm run commit:test     # test: 测试提交
```

## 📋 提交信息格式

```
<类型>[可选作用域]: <描述>

[可选正文]

[可选脚注]
```

### 提交类型
- `feat`: 新功能 → minor版本升级
- `fix`: 修复 → patch版本升级
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具
- `perf`: 性能优化

### 破坏性变更
```bash
git commit -m "feat!: 重构API接口

BREAKING CHANGE: API路径从 /api/v1 改为 /api/v2"
```

## 🔧 故障排除

### 工作目录不干净
```bash
git status              # 查看状态
git add .               # 暂存所有更改
git commit -m "chore: 提交更改"
```

### 标签已存在
```bash
git tag -d v1.0.0       # 删除本地标签
git push origin :refs/tags/v1.0.0  # 删除远程标签
```

### 推送失败
```bash
git pull origin main    # 拉取最新更改
git push origin main --tags  # 重新推送
```

## 📊 版本升级规则

| 提交类型 | 版本升级 | 示例 |
|---------|---------|------|
| `feat:` | minor | 1.0.0 → 1.1.0 |
| `fix:` | patch | 1.0.0 → 1.0.1 |
| `BREAKING CHANGE` | major | 1.0.0 → 2.0.0 |
| 其他 | patch | 1.0.0 → 1.0.1 |

## 🎯 最佳实践

### 发布流程
1. `npm run version:validate` - 验证状态
2. `npm run test:all` - 运行测试
3. `npm run build` - 构建项目
4. `npm run release` - 发布版本
5. `git push origin main --tags` - 推送到远程

### 分支管理
1. `npm run git:flow:feature feature-name` - 创建功能分支
2. 开发功能...
3. `npm run commit:feat "添加新功能"` - 提交更改
4. `npm run git:merge:feature feature-name` - 合并分支

### 版本回滚
1. `npm run version:rollback:validate` - 验证状态
2. `npm run version:rollback v0.2.0` - 执行回滚
3. `npm run test:all` - 运行测试
4. `git push origin main --tags` - 推送更改

## 🔍 调试模式

```bash
DEBUG=version-manager npm run version:bump  # 详细日志
node scripts/bump-version.js --dry-run      # 干运行模式
GIT_TRACE=1 npm run version:bump            # Git操作详情
```

## 📁 重要文件

- `package.json` - 版本信息
- `version.config.json` - 版本配置
- `RELEASE_NOTES_v*.md` - 发布说明
- `.kiro/version-history.json` - 版本历史
- `.kiro/rollback-log.json` - 回滚日志
- `.kiro/rollback-backups/` - 回滚备份

## 🆘 紧急情况

### 撤销最新版本（未推送）
```bash
git tag -d $(git describe --tags --abbrev=0)  # 删除标签
git reset --hard HEAD~1                       # 重置提交
git checkout HEAD~1 -- package.json           # 恢复版本号
```

### 强制回滚（谨慎使用）
```bash
node scripts/version-rollback.js v0.2.0 --force --reason "紧急修复"
```

---
**快速参考版本**: v1.0.0 | **更新时间**: 2025-09-04