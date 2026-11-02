# AI Doctor - 智能医疗知识库系统

AI Doctor 是基于 RAG（检索增强生成）技术的智能医疗知识库系统，支持文档解析、知识库管理、混合检索、智能问答、QA 生成、NLP 标注与内容增强。

仓库已按前后端拆分为两个独立工程目录：

- `frontend/`：React + TypeScript 前端应用。
- `backend/`：FastAPI 后端服务、文档处理与 RAG 流水线。
- `docs/`：项目级文档。

完整的目录说明请查看 [工程目录介绍](docs/PROJECT_STRUCTURE.md)。

## 核心功能

- **多格式文档解析**：支持 PDF、DOCX、TXT、Markdown，以及 RAG 流水线支持的表格和演示文档。
- **知识库管理**：维护知识库、目录和文档，跟踪上传及解析任务。
- **混合检索**：结合 Qdrant 语义检索与 SQLite/BM25 关键词检索。
- **RAG 问答**：基于知识库上下文进行检索增强生成。
- **QA 自动生成**：从文档内容生成问答对、问题泛化及变体。
- **NLP 标注**：提供实体识别、关键词提取等能力。
- **内容增强与人工审核**：支持文档增强、质量检查及流水线审核流程。

## 技术栈

### 前端

- React 19 + TypeScript
- Vite 8
- React Router
- Zustand
- Tailwind CSS + Radix UI
- Recharts + D3

### 后端

- Python 3.11+（RAG 子工程要求）
- FastAPI + Uvicorn
- Qdrant 本地文件存储
- SQLite
- OpenAI 兼容 LLM / Embedding API
- 模块化 RAG Pipeline
- jieba、PyMuPDF、python-docx

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.11+
- npm

默认配置使用本地文件模式 Qdrant，无需单独启动 Docker 服务。

### 1. 启动后端

```bash
cd backend
python -m pip install -r requirements.txt
```

复制环境变量示例并按需填写 LLM 与 Embedding 配置：

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

启动服务：

```bash
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

后端地址：

- 服务入口：`http://localhost:8000`
- 健康检查：`http://localhost:8000/health`
- OpenAPI 文档：`http://localhost:8000/docs`

### 2. 启动前端

在新的终端中执行：

```bash
cd frontend
npm install
```

如需自定义 API 地址，可复制并编辑环境变量文件：

```bash
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

启动开发服务器：

```bash
npm run dev
```

前端默认地址为 `http://localhost:5173`，后端 API 默认地址为 `http://localhost:8000`。

## 项目结构

```text
ai_doctor/
├── frontend/                # 前端独立工程
│   ├── src/                 # 页面、组件、状态、服务和类型
│   ├── public/              # 静态资源
│   ├── package.json         # 前端依赖与脚本
│   └── vite.config.ts       # Vite 配置
├── backend/                 # 后端独立工程
│   ├── app.py               # FastAPI 应用入口
│   ├── services/            # 检索、向量、问答、标注和增强服务
│   ├── python-parser/       # 文档解析器
│   ├── nlp-annotator/       # NLP 标注器
│   ├── rag_pipeline/        # 模块化 RAG 流水线
│   ├── uploads/             # 上传文件（运行时生成）
│   ├── parsed-data/         # 解析结果（运行时生成）
│   ├── data/                # SQLite 与 Qdrant 数据（运行时生成）
│   └── requirements.txt     # Python 依赖
├── docs/                    # 项目文档
└── README.md                # 项目入口说明
```

目录、模块职责及数据流的详细说明见 [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)。

## 常用命令

### 前端

```bash
cd frontend
npm run dev       # 开发服务器
npm run build     # TypeScript 检查与生产构建
npm run lint      # ESLint 检查
npm run preview   # 预览生产构建
```

生产构建输出到 `frontend/dist/`。

### 后端

```bash
cd backend
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

也可以在 `backend/` 中使用 `npm run dev` 调用相同的后端启动命令。

## 运行数据约定

| 目录 | 内容 | 是否提交 |
|------|------|----------|
| `backend/uploads/` | 用户上传的原始文档 | 否 |
| `backend/parsed-data/` | 文档解析与分块结果 | 否 |
| `backend/data/app.db` | 知识库、文档、任务等 SQLite 数据 | 否 |
| `backend/data/qdrant/` | 本地向量索引 | 否 |
| `backend/data/rag_store/` | RAG 流水线持久化数据 | 否 |
| `frontend/dist/` | 前端生产构建产物 | 否 |

## 更多文档

- [工程目录介绍](docs/PROJECT_STRUCTURE.md)
- [知识库 API](docs/KNOWLEDGE_BASE_API.md)
- [部署指南](docs/DEPLOYMENT.md)
- [性能优化说明](docs/PERFORMANCE_OPTIMIZATION.md)
- [后端说明](backend/README.md)
