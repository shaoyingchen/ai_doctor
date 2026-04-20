#!/bin/bash
# AI Doctor Backend - Quick Start Script

echo "========================================"
echo "AI Doctor Backend Service"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "错误：Node.js 未安装"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "错误：Python 3 未安装"
    exit 1
fi

# Install Node.js dependencies
echo ""
echo "1. 安装 Node.js 依赖..."
cd "$(dirname "$0")"
npm install

# Check Python dependencies
echo ""
echo "2. 检查 Python 依赖..."
python3 -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "正在安装 Python 依赖..."
    pip3 install -r python-parser/requirements.txt
else
    echo "Python 依赖已安装"
fi

# Create necessary directories
echo ""
echo "3. 创建必要的目录..."
mkdir -p uploads parsed-data

echo ""
echo "========================================"
echo "安装完成!"
echo "========================================"
echo ""
echo "启动服务:"
echo ""
echo "  终端 1 - Node.js API:"
echo "  npm run dev"
echo ""
echo "  终端 2 - Python Parser:"
echo "  cd python-parser && python3 parser.py"
echo ""
echo "服务地址:"
echo "  Node.js API:  http://localhost:8000"
echo "  Python Parser: http://localhost:8001"
echo ""
