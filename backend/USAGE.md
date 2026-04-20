# 文件上传功能使用指南

## 快速开始

### 1. 启动后端服务

**终端 1 - Node.js API 服务:**

```bash
cd backend
npm run dev
```

成功输出：
```
========================================
AI Doctor Backend Service
========================================
服务器启动在：http://localhost:8000
========================================
```

**终端 2 - Python 解析服务（可选，用于真实解析）:**

```bash
cd backend/python-parser
pip3 install -r requirements.txt
python3 parser.py
```

成功输出：
```
==================================================
AI Doctor Parser Service
==================================================
启动服务：http://localhost:8001
```

### 2. 测试文件上传

#### 方法 1: 使用 curl 测试

```bash
# 创建测试文件
echo "这是一个测试文本文件" > /tmp/test.txt

# 上传文件
curl -X POST http://localhost:8000/api/upload \
  -F "files=@/tmp/test.txt"
```

期望响应：
```json
{
  "message": "已上传 1 个文件",
  "tasks": [{
    "id": "xxx",
    "documentId": "xxx",
    "documentName": "test.txt",
    "status": "parsing",
    "progress": 30,
    "currentStage": "解析"
  }]
}
```

#### 方法 2: 使用前端界面

1. 确保后端服务已启动
2. 打开浏览器访问前端页面
3. 进入「知识库」页面
4. 点击「上传文件」按钮
5. 拖拽或选择文件
6. 点击「上传」按钮

### 3. 调试

**如果前端上传失败，请检查:**

1. 后端服务是否启动：
   ```bash
   curl http://localhost:8000/health
   ```
   期望响应：`{"status":"ok",...}`

2. 浏览器控制台是否有错误信息

3. 网络面板查看请求详情

**查看后端日志:**

```bash
# 在启动后端的终端查看日志输出
# 应该能看到类似：
=== 收到上传请求 ===
文件数量：1
  - test.txt (38 bytes)
```

### 4. 支持的文件格式

| 格式 | 扩展名 | 解析器 | 说明 |
|------|--------|--------|------|
| PDF | .pdf | PyMuPDF | 文字型 PDF |
| PDF 扫描 | .pdf | PaddleOCR | 需额外安装 |
| Word | .docx | python-docx | Office 2007+ |
| Word | .doc | - | 建议转为.docx |
| Markdown | .md | 原生 | 直接读取 |
| 纯文本 | .txt | 原生 | 直接读取 |

### 5. API 接口

```
GET  /health              - 健康检查
GET  /api/tasks           - 获取所有解析任务
GET  /api/tasks/:id       - 获取单个任务状态
GET  /api/documents       - 获取已解析文档
POST /api/upload          - 上传文件
DELETE /api/tasks/:id     - 删除任务
POST /api/tasks/:id/retry - 重试失败任务
GET  /api/queue/status    - 获取队列状态
```

### 6. 常见问题

**Q: 上传提示「没有文件」？**

A: 检查以下几点：
1. 文件是否正确附加到 FormData（查看浏览器控制台日志）
2. 后端服务是否启动
3. 文件格式是否在允许列表中

**Q: Python 解析服务启动失败？**

A: 安装依赖：
```bash
pip3 install fastapi uvicorn python-multipart pymupdf python-docx chardet
```

**Q: 上传大文件失败？**

A: 默认限制 100MB，可在 `backend/src/index.ts` 中修改：
```typescript
limits: {
  fileSize: 500 * 1024 * 1024, // 改为 500MB
}
```

### 7. 文件存储位置

- **上传文件**: `backend/uploads/YYYY-MM-DD/uuid-filename.ext`
- **解析结果**: `backend/parsed-data/documentId.json`
