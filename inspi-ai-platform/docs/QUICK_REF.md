# 快速参考

## 🎯 任务状态
```
[ ] → [-] → [?] → [x]
未开始 → 进行中 → 待验证 → 已完成

阻断状态: [!] [R] [~] [P]
```

## 🚪 质量门禁
```bash
npm run quality:gate:mvp        # 70%
npm run quality:gate:standard   # 85%
npm run quality:gate:enterprise # 95%
```

## 🚨 问题处理
```
发现问题 → 标记[!] → 停止新功能 → 修复 → 验证 → 继续
```

## 🛠️ 常用命令
```bash
npm run task:check-blocking     # 检查阻断
npm run team:notify            # 团队通知
npm run improvement:report     # 改进报告
```

## 📋 每日检查
- [ ] 任务状态准确
- [ ] 质量达标
- [ ] 无阻断问题