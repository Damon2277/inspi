# 快速启动脚本使用示例

## 基本用法

### 1. 查看帮助信息
```bash
node .kiro/quick-start.js --help
# 或使用包装脚本
./quick-start.sh --help
```

### 2. 检查环境
```bash
node .kiro/quick-start.js --check
```

输出示例:
```
🔍 执行基础环境检查...

Node.js 版本: 当前版本: v22.17.0 ✅
包管理器: ✅ npm 可用
.kiro 目录: ✅ .kiro 目录存在
Git 仓库: ✅ Git 仓库已初始化
项目结构: ✅ 找到 1/2 个核心文件

📊 环境检查总结:
✅ 通过: 5
⚠️ 警告: 0
❌ 失败: 0
```

### 3. 查看可用系统
```bash
node .kiro/quick-start.js --list
```

### 4. 初始化配置
```bash
node .kiro/quick-start.js --init
```

这将创建:
- `.kiro/quick-start-config.json` - 配置文件
- `.kiro/QUICK_START_README.md` - 详细说明文档

### 5. 启用特定系统
```bash
# 启用项目状态管理系统
node .kiro/quick-start.js --enable project-state

# 启用样式版本控制系统
node .kiro/quick-start.js --enable style-recovery

# 启用开发流程规范引擎
node .kiro/quick-start.js --enable workflow-rules

# 启用质量检查系统
node .kiro/quick-start.js --enable quality-checks

# 启用恢复点系统
node .kiro/quick-start.js --enable recovery-points

# 启用开发者仪表板
node .kiro/quick-start.js --enable dashboard
```

### 6. 启用所有系统
```bash
node .kiro/quick-start.js --enable-all
```

### 7. 交互模式
```bash
node .kiro/quick-start.js
```

## 高级用法

### 系统依赖检查

脚本会自动检查每个系统的依赖:

- **样式版本控制系统**: 需要 `playwright`
- **质量检查系统**: 需要 `jest`
- **开发者仪表板**: 需要 `express`

如果依赖缺失，脚本会提供安装建议。

### 配置文件结构

`.kiro/quick-start-config.json`:
```json
{
  "version": "1.0.0",
  "createdAt": "2024-01-15T10:30:00Z",
  "enabledSystems": [],
  "lastCheck": "2024-01-15T10:30:00Z",
  "environment": {
    "nodeVersion": "v22.17.0",
    "platform": "darwin",
    "cwd": "/path/to/project"
  }
}
```

## 故障排除

### 常见问题

1. **Node.js 版本过低**
   ```
   ❌ Node.js 版本: 当前版本: v14.x.x (需要 >= 16.0.0)
   ```
   解决方案: 升级 Node.js 到 16.0.0 或更高版本

2. **npm 不可用**
   ```
   ❌ 包管理器: npm 不可用
   ```
   解决方案: 安装 Node.js 或检查 PATH 环境变量

3. **不是 Git 仓库**
   ```
   ❌ Git 仓库: 不是 Git 仓库或 Git 不可用
   ```
   解决方案: 运行 `git init` 初始化仓库

4. **系统依赖缺失**
   ```
   ❌ playwright 不可用
   建议安装: npm install playwright
   ```
   解决方案: 按提示安装缺失的依赖

### 测试脚本

运行测试验证脚本功能:
```bash
node .kiro/test-quick-start.js
```

## 集成到工作流

### 在 package.json 中添加脚本
```json
{
  "scripts": {
    "setup": "node .kiro/quick-start.js --init",
    "check-env": "node .kiro/quick-start.js --check",
    "enable-all": "node .kiro/quick-start.js --enable-all"
  }
}
```

### 在 CI/CD 中使用
```yaml
# .github/workflows/setup.yml
- name: Setup Project Management Systems
  run: |
    node .kiro/quick-start.js --check
    node .kiro/quick-start.js --enable-all
```

## 相关文档

- [项目管理规则增强系统设计文档](.kiro/specs/project-management-rules-enhancement/design.md)
- [需求文档](.kiro/specs/project-management-rules-enhancement/requirements.md)
- [任务列表](.kiro/specs/project-management-rules-enhancement/tasks.md)
- [快速启动说明](.kiro/QUICK_START_README.md)