#!/bin/bash
# 测试文件上传 API

echo "========================================"
echo "AI Doctor Backend - 测试文件上传"
echo "========================================"

# 检查后端服务是否运行
echo ""
echo "1. 检查后端服务..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$response" != "200" ]; then
    echo "错误：后端服务未响应 (HTTP $response)"
    echo "请先运行：cd backend && python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
    exit 1
fi
echo "后端服务运行正常 ✓"

# 创建测试文件
echo ""
echo "2. 创建测试文件..."
echo "测试内容：这是一个文本文件测试" > /tmp/ai_doctor_test.txt
echo "文件创建完成 ✓"

# 上传测试
echo ""
echo "3. 测试文件上传..."
result=$(curl -s -X POST http://localhost:8000/api/upload \
  -F "files=@/tmp/ai_doctor_test.txt")

echo "响应：$result"

# 检查响应
if echo "$result" | grep -q "已上传"; then
    echo ""
    echo "上传成功 ✓"
else
    echo ""
    echo "上传失败 ✗"
    echo "请检查后端日志"
fi

# 获取任务列表
echo ""
echo "4. 获取任务列表..."
tasks=$(curl -s http://localhost:8000/api/tasks)
echo "任务：$tasks"

# 清理
rm -f /tmp/ai_doctor_test.txt

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
