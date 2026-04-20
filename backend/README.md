# AI Doctor Backend Service

后端服务：文件上传 + Python 文档解析

## 架构图

```
┌─────────────┐     HTTP      ┌─────────────┐
│  Frontend   │  ─────────>   │  Node.js    │
│  (React)    │  <─────────   │  (Port 8000)│
└─────────────┘               └──────┬──────┘
                                     │
                                     │ HTTP
                                     ▼
                              ┌─────────────┐
                              │   Python    │
                              │ (Port 8001) │
                              └─────────────┘
```

## 快速启动

### 1. 安装 Node.js 后端依赖

```bash
cd backend
npm install
```

### 2. 安装 Python 解析器依赖

```bash
cd backend/python-parser

# 基础安装（仅纯文本）
pip install -r requirements.txt

# 完整安装（推荐）
pip install pymupdf python-docx chardet fastapi uvicorn python-multipart

# OCR 支持（可选，用于扫描件 PDF）
pip install paddleocr paddlepaddle
```

### 3. 启动服务

**终端 1 - 启动 Node.js API:**
```bash
cd backend
npm run dev
```
服务启动在：http://localhost:8000

**终端 2 - 启动 Python 解析器:**
```bash
cd backend/python-parser
python parser.py
```
服务启动在：http://localhost:8001

## API 接口

### Node.js API (Port 8000)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/upload` | 上传文件 |
| GET | `/api/tasks` | 获取所有解析任务 |
| GET | `/api/tasks/:id` | 获取单个任务状态 |
| GET | `/api/documents` | 获取已解析文档 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| POST | `/api/tasks/:id/retry` | 重试失败任务 |
| GET | `/api/queue/status` | 获取队列状态 |

### Python Parser API (Port 8001)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/parse` | 解析文档 |

## 上传文件示例

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "files=@document1.pdf" \
  -F "files=@document2.docx"
```

## 支持的文件格式

| 格式 | 扩展名 | 解析器 | 状态 |
|------|--------|--------|------|
| PDF | .pdf | PyMuPDF | ✅ |
| Word | .docx | python-docx | ✅ |
| Word 97-2003 | .doc | 需转换 | ⚠️ |
| Markdown | .md | 原生 | ✅ |
| 纯文本 | .txt | 原生 | ✅ |
|扫描件 PDF | .pdf | PaddleOCR | 🔜 |

## 解析流程

1. **上传** (10%) - 文件上传到服务器
2. **解析** (30%) - 提取文档内容
3. **分块** (60%) - 按语义分块
4. **向量化** (80%) - 生成 embedding
5. **入库** (100%) - 存储到数据库

## 环境变量

```bash
# Node.js 后端
PORT=8000
UPLOAD_DIR=./uploads
PARSED_DIR=./parsed-data

# Python 解析器
PORT=8001
```

## 故障排查

### Node.js 启动失败

```bash
# 检查端口占用
lsof -i :8000

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### Python 解析失败

```bash
# 检查依赖
pip list | grep -E "pymupdf|docx|chardet"

# 测试 PyMuPDF
python -c "import fitz; print(fitz.__version__)"

# 测试健康检查
curl http://localhost:8001/health
```

### 跨域问题

确保两个服务都启用了 CORS：
- Node.js: `app.use('/*', cors())`
- Python: `CORSMiddleware` 已配置

## 生产部署建议

1. **文件存储**: 切换到 S3/MinIO
2. **数据库**: 使用 PostgreSQL/MongoDB 替代内存存储
3. **消息队列**: 使用 Redis/RabbitMQ 处理异步任务
4. **进程管理**: 使用 PM2 (Node) + Supervisor (Python)
5. **反向代理**: 使用 Nginx 统一入口

## 项目结构

```
backend/
├── src/
│   └── index.ts          # Node.js API 主入口
├── python-parser/
│   ├── parser.py         # Python 解析服务
│   └── requirements.txt  # Python 依赖
├── uploads/              # 上传文件临时目录
├── parsed-data/          # 解析结果存储
├── package.json
└── tsconfig.json
```
