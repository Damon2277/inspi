#!/bin/bash

# 项目管理规则增强系统 - 快速启动包装脚本
# 提供更简单的命令行接口

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUICK_START_SCRIPT="$SCRIPT_DIR/.kiro/quick-start.js"

# 检查快速启动脚本是否存在
if [ ! -f "$QUICK_START_SCRIPT" ]; then
    echo "⚠️ 提示: 未找到 $QUICK_START_SCRIPT"
    echo "   当前仓库未包含 .kiro 工具，快速启动流程暂不可用。"
    echo "   请参考 README.md / QUICK_START.md 的手动步骤或补充 .kiro 资源。"
    exit 0
fi

# 检查 Node.js 是否可用
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装或不在 PATH 中"
    echo "请安装 Node.js (>= 16.0.0) 后重试"
    exit 1
fi

# 转发所有参数到 Node.js 脚本
node "$QUICK_START_SCRIPT" "$@"
