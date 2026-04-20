#!/bin/bash

# AI Doctor - Start All Services
# 启动所有后端服务

echo "========================================"
echo "AI Doctor Services"
echo "========================================"

# 检查 Python 依赖
echo ""
echo "检查 Python 依赖..."
python3 -c "import jieba" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "安装 NLP 依赖..."
    pip3 install jieba fastapi uvicorn pydantic
fi

# 启动 Python Parser 服务 (端口 8001)
echo ""
echo "启动 Parser 服务 (端口 8001)..."
cd "$(dirname "$0")/python-parser"
python3 parser.py &
PARSER_PID=$!

# 启动 NLP Annotator 服务 (端口 8002)
echo ""
echo "启动 NLP 标注服务 (端口 8002)..."
cd "$(dirname "$0")/nlp-annotator"
python3 annotator.py &
ANNOTATOR_PID=$!

# 启动 Node.js 主服务 (端口 8000)
echo ""
echo "启动主服务 (端口 8000)..."
cd "$(dirname "$0")"
npm start &
MAIN_PID=$!

echo ""
echo "========================================"
echo "所有服务已启动:"
echo "  - 主服务：http://localhost:8000"
echo "  - Parser 服务：http://localhost:8001"
echo "  - NLP 标注服务：http://localhost:8002"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap "kill $PARSER_PID $ANNOTATOR_PID $MAIN_PID 2>/dev/null; exit" INT

# 等待所有进程
wait
