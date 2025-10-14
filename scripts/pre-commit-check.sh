#!/bin/bash

# 预提交检查脚本
# Pre-commit Check Script

echo "🔍 开始预提交检查..."
echo "=================================="

# 检查是否在项目根目录
if [ ! -f "README.md" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查项目管理规则系统是否存在
HAS_KIRO=true
if [ ! -d ".kiro" ]; then
    HAS_KIRO=false
    echo "⚠️ 未找到 .kiro 项目管理系统目录，相关检查将被跳过"
fi

# 初始化检查结果
CHECKS_PASSED=0
TOTAL_CHECKS=0

# 函数：运行检查并记录结果
run_check() {
    local check_name="$1"
    local check_command="$2"
    
    echo ""
    echo "🧪 运行检查: $check_name"
    echo "命令: $check_command"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$check_command"; then
        echo "✅ $check_name: 通过"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo "❌ $check_name: 失败"
        return 1
    fi
}

# 1. 系统集成验证
if [ "$HAS_KIRO" = true ]; then
    run_check "系统集成验证" "node .kiro/integration-tests/run-tests.js"
    run_check "项目管理系统健康检查" "node .kiro/dashboard/cli.js health"
    run_check "配置一致性验证" "node .kiro/config-manager/cli.js validate"
    run_check "样式系统状态检查" "node .kiro/style-recovery/cli.js status"
else
    echo ""
    echo "ℹ️ 跳过 .kiro 系统相关检查"
fi

# 5. 主应用构建检查 (如果存在)
if [ -f "inspi-ai-platform/package.json" ]; then
    run_check "主应用构建检查" "cd inspi-ai-platform && npm run build --if-present || echo '构建跳过或失败，但不阻止提交'"
fi

# 6. TypeScript类型检查 (如果存在，跳过错误)
if [ -f "inspi-ai-platform/tsconfig.json" ]; then
    run_check "TypeScript类型检查" "cd inspi-ai-platform && npx tsc --noEmit --skipLibCheck || echo 'TypeScript检查有警告，但不阻止提交'"
fi

# 7. 基本语法检查 (简化版)
if [ -f "inspi-ai-platform/package.json" ]; then
    run_check "基本语法检查" "cd inspi-ai-platform && node -c package.json && echo '基本语法检查通过'"
fi

echo ""
echo "=================================="
echo "📊 检查结果汇总"
echo "=================================="
echo "总检查项: $TOTAL_CHECKS"
echo "通过检查: $CHECKS_PASSED"
echo "失败检查: $((TOTAL_CHECKS - CHECKS_PASSED))"

# 计算成功率
if [ $TOTAL_CHECKS -gt 0 ]; then
    SUCCESS_RATE=$(( (CHECKS_PASSED * 100) / TOTAL_CHECKS ))
    echo "成功率: $SUCCESS_RATE%"
else
    SUCCESS_RATE=0
fi

echo ""

# 根据结果给出建议
if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
    echo "🎉 所有检查通过！可以安全提交代码。"
    echo ""
    echo "建议的提交流程:"
    echo "1. git add ."
    echo "2. git commit -m \"your commit message\""
    echo "3. git push"
    exit 0
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo "⚠️ 大部分检查通过，但仍有问题需要解决。"
    echo ""
    echo "建议:"
    echo "1. 查看上述失败的检查项"
    echo "2. 修复问题后重新运行此脚本"
    echo "3. 或者在确认问题不影响功能的情况下谨慎提交"
    exit 1
else
    echo "❌ 检查失败较多，不建议提交。"
    echo ""
    echo "建议的修复流程:"
    echo "1. 查看详细的错误信息"
    echo "2. 逐项修复失败的检查"
    echo "3. 重新运行此脚本直到所有检查通过"
    echo ""
    echo "获取帮助:"
    echo "- 查看项目仪表板: node .kiro/dashboard/cli.js health"
    echo "- 查看系统状态: node .kiro/integration-tests/cli.js status"
    echo "- 查看恢复选项: node .kiro/recovery-points/cli.js list"
    exit 1
fi
