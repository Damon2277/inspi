# 测试环境使用指南

## 🎯 概述

本指南介绍如何启动和使用 inspi-ai-platform 的测试环境，进行完整的功能验证和质量检查。

## 🚀 快速启动

### 1. 启动测试环境
```bash
# 进入项目目录
cd inspi-ai-platform

# 安装依赖（如果还没有安装）
npm install

# 启动测试环境
npm run test-env:start
```

### 2. 访问测试页面
启动成功后，你可以访问以下页面：

- **🏠 主页**: http://localhost:3000
- **📊 测试仪表板**: http://localhost:3000/test-dashboard
- **🔍 API健康检查**: http://localhost:3000/api/health
- **📈 测试状态API**: http://localhost:3000/api/test-status

## 📊 测试仪表板功能

### 主要功能
1. **实时测试状态** - 查看所有测试套件的运行状态
2. **功能验证** - 验证核心功能是否正常工作
3. **性能监控** - 监控系统性能指标
4. **快速链接** - 快速访问各个功能页面

### 测试套件
- **Core Functionality** - 核心功能测试（认证、AI、作品管理）
- **Community Features** - 社区功能测试（广场、复用、排行榜）
- **Knowledge Graph** - 知识图谱功能测试
- **Mobile & Performance** - 移动端和性能测试
- **Security & API** - 安全和API测试

## 🧪 测试命令

### 基础测试
```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 端到端测试
npm run test:e2e

# 所有测试
npm run test:all
```

### 专项测试
```bash
# 性能测试
npm run test:performance

# 安全测试
npm run test:security

# 移动端测试
npm run test:mobile

# API测试
npm run test:api
```

### 质量检查
```bash
# 质量门禁检查
npm run quality:gate

# 生成测试报告
npm run test:report

# 覆盖率报告
npm run test:coverage
```

## 🔗 测试页面链接

### 核心功能页面
| 功能 | 链接 | 描述 |
|------|------|------|
| 首页 | http://localhost:3000 | 平台主页和导航 |
| 用户认证 | http://localhost:3000/auth/login | 登录注册功能 |
| AI魔法师 | http://localhost:3000/magic | AI卡片生成 |
| 智慧广场 | http://localhost:3000/square | 作品展示和浏览 |
| 个人中心 | http://localhost:3000/profile | 用户资料和知识图谱 |
| 排行榜 | http://localhost:3000/leaderboard | 贡献度排名 |
| 联系我们 | http://localhost:3000/contact | 反馈和支持 |

### API接口测试
| 接口 | 链接 | 描述 |
|------|------|------|
| 健康检查 | http://localhost:3000/api/health | 系统健康状态 |
| 测试状态 | http://localhost:3000/api/test-status | 测试运行状态 |
| 用户认证 | http://localhost:3000/api/auth/* | 认证相关接口 |
| 作品管理 | http://localhost:3000/api/works/* | 作品CRUD接口 |
| AI服务 | http://localhost:3000/api/magic/* | AI卡片生成接口 |

## 📋 测试检查清单

### 功能测试
- [ ] 用户注册登录正常
- [ ] AI卡片生成功能正常
- [ ] 作品创建和发布正常
- [ ] 智慧广场展示正常
- [ ] 作品搜索筛选正常
- [ ] 复用致敬功能正常
- [ ] 知识图谱显示正常
- [ ] 排行榜更新正常

### 性能测试
- [ ] 页面加载时间 < 3秒
- [ ] API响应时间 < 1秒
- [ ] 并发用户支持 > 100
- [ ] 内存使用稳定

### 移动端测试
- [ ] 响应式布局正常
- [ ] 触摸交互流畅
- [ ] PWA功能可用
- [ ] 移动端性能良好

### 安全测试
- [ ] 认证授权正常
- [ ] 数据验证有效
- [ ] 安全头配置正确
- [ ] 无已知安全漏洞

## 🔧 环境管理

### 启动和停止
```bash
# 启动测试环境
npm run test-env:start

# 停止测试环境
npm run test-env:stop

# 检查环境状态
npm run test-env:status

# 检查健康状态
npm run test-env:health

# 打开测试仪表板（macOS）
npm run test-env:dashboard
```

### 环境配置
测试环境使用以下配置：
- **端口**: 3000
- **环境**: test
- **数据库**: MongoDB 测试实例
- **缓存**: Redis 测试实例
- **日志级别**: debug

### 故障排除
如果遇到问题，请检查：
1. 端口3000是否被占用
2. 数据库连接是否正常
3. 环境变量是否配置正确
4. 依赖包是否完整安装

## 📊 测试报告

### 自动生成报告
```bash
# 生成综合测试报告
npm run test:report:comprehensive

# 生成覆盖率报告
npm run test:coverage:all

# 生成性能报告
npm run test:performance:advanced
```

### 报告位置
- **HTML报告**: `./coverage/lcov-report/index.html`
- **JSON报告**: `./coverage/coverage-final.json`
- **测试报告**: `./test-reports/`

## 🎯 验收标准

### 功能验收
- ✅ 所有核心功能正常工作
- ✅ 用户流程完整可用
- ✅ API接口响应正确
- ✅ 数据持久化正常

### 质量验收
- ✅ 测试覆盖率 > 90%
- ✅ 所有测试用例通过
- ✅ 性能指标达标
- ✅ 安全扫描通过

### 用户体验验收
- ✅ 页面加载流畅
- ✅ 交互响应及时
- ✅ 移动端体验良好
- ✅ 错误处理友好

## 📞 支持和反馈

如果在测试过程中遇到问题或有改进建议，请：
1. 查看控制台错误信息
2. 检查网络请求状态
3. 查看测试日志文件
4. 提交问题报告

---

**测试环境版本**: v0.1.0  
**最后更新**: 2024年1月29日  
**维护团队**: inspi-ai-platform 开发团队