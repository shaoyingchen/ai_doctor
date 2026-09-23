# AI Doctor - 智能医疗知识库系统

基于RAG（检索增强生成）技术的智能医疗问答系统，支持多种文档格式解析、混合检索、QA自动生成和NLP标注。

## 功能特性

- **多格式文档解析**: 支持 PDF, DOCX, TXT, Markdown 等格式
- **混合检索**: 结合语义检索和关键词检索，提供更精准的搜索结果
- **RAG问答**: 基于知识库的检索增强生成，提供准确的医疗问答
- **QA自动生成**: 从文档自动生成问答对，支持泛化和变体生成
- **NLP标注**: 实体识别、关键词提取、相似度计算等NLP功能
- **知识库管理**: 完整的知识库和文档CRUD操作

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 6
- Ant Design 5
- Axios

### 后端
- Python 3.9+
- Flask 3.0
- LangChain
- Qdrant (向量数据库)
- OpenAI / Zhipu AI (LLM)
- spaCy / jieba (NLP)

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.9+
- Docker (用于运行Qdrant)

### 1. 安装Qdrant向量数据库

使用Docker运行Qdrant：

```bash
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant
```

或使用Docker Compose（推荐）：

```yaml
# docker-compose.yml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./qdrant_storage:/qdrant/storage
```

运行：
```bash
docker-compose up -d
```

验证Qdrant是否运行：
```bash
curl http://localhost:6333/
```

### 2. 后端设置

#### 安装Python依赖

```bash
cd backend
pip install -r requirements.txt
```

#### 配置环境变量

复制示例配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的API密钥：
```env
# LLM配置（二选一）
OPENAI_API_KEY=your_openai_api_key
ZHIPUAI_API_KEY=your_zhipuai_api_key

# Qdrant配置
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=  # 本地开发可留空

# 应用配置
FLASK_ENV=development
FLASK_DEBUG=True
```

#### 启动后端服务

```bash
cd backend
python app.py
```

后端服务将运行在 `http://localhost:5000`

### 3. 前端设置

#### 安装依赖

```bash
npm install
```

#### 启动开发服务器

```bash
npm run dev
```

前端服务将运行在 `http://localhost:5173`

## 项目结构

```
ai_doctor/
├── backend/                # 后端服务
│   ├── api/               # API路由
│   │   ├── knowledge.py   # 知识库管理API
│   │   └── nlp.py         # NLP标注API
│   ├── services/          # 业务逻辑层
│   │   ├── knowledge_service.py    # 知识库服务
│   │   ├── rag_service.py          # RAG检索服务
│   │   └── nlp_service.py          # NLP服务
│   ├── config/            # 配置文件
│   │   └── qdrant_config.py        # Qdrant配置
│   ├── app.py             # Flask应用入口
│   ├── requirements.txt   # Python依赖
│   └── .env.example       # 环境变量示例
├── src/                   # 前端代码
│   ├── components/        # React组件
│   ├── pages/            # 页面组件
│   ├── services/         # API服务
│   └── types/            # TypeScript类型
├── docs/                  # 文档
│   ├── KNOWLEDGE_BASE_API.md      # API文档
│   ├── DEPLOYMENT.md              # 部署文档
│   └── knowledge_base_usage.md    # 使用指南
└── README.md
```

## 核心功能使用

### 1. 知识库管理

创建知识库：
```bash
curl -X POST http://localhost:5000/api/knowledge-bases \
  -H "Content-Type: application/json" \
  -d '{"name": "医学知识库", "description": "临床医学知识"}'
```

### 2. 文档上传

```bash
curl -X POST http://localhost:5000/api/knowledge-bases/{kb_id}/documents \
  -F "file=@document.pdf"
```

### 3. 混合检索

三种检索模式：
- **semantic**: 纯语义检索（基于向量相似度）
- **keyword**: 纯关键词检索（基于BM25）
- **hybrid**: 混合检索（推荐，alpha=0.7表示70%语义+30%关键词）

```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "kb_xxx",
    "query": "糖尿病的诊断标准",
    "search_mode": "hybrid",
    "top_k": 5,
    "alpha": 0.7
  }'
```

### 4. QA自动生成

从文档生成问答对：
```bash
curl -X POST http://localhost:5000/api/documents/{doc_id}/generate-qa \
  -H "Content-Type: application/json" \
  -d '{"num_pairs": 10}'
```

### 5. NLP标注

实体识别：
```bash
curl -X POST http://localhost:5000/api/nlp/extract-entities \
  -H "Content-Type: application/json" \
  -d '{"text": "患者诊断为2型糖尿病，处方二甲双胍500mg"}'
```

## 系统架构

```
┌─────────────┐
│   前端UI    │  React + Ant Design
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────┐
│  Flask API  │  路由层
└──────┬──────┘
       │
┌──────▼──────────────────────────┐
│      Service Layer               │
│  ┌─────────────┐ ┌────────────┐ │
│  │ Knowledge   │ │ NLP Service│ │
│  │ Service     │ │            │ │
│  └──────┬──────┘ └─────┬──────┘ │
│         │               │        │
│  ┌──────▼───────────────▼─────┐ │
│  │     RAG Service            │ │
│  │  (LangChain + Embedding)   │ │
│  └──────┬─────────────────────┘ │
└─────────┼─────────────────────┬─┘
          │                     │
    ┌─────▼─────┐         ┌────▼────┐
    │  Qdrant   │         │  LLM    │
    │  Vector   │         │ OpenAI/ │
    │    DB     │         │ Zhipu   │
    └───────────┘         └─────────┘
```

### 数据流

1. **文档上传流程**:
   - 用户上传文档 → 解析器处理 → 文本分块 → Embedding → 存入Qdrant

2. **检索流程**:
   - 用户查询 → Embedding + BM25 → 混合检索 → Rerank → 返回相关片段

3. **RAG问答流程**:
   - 用户问题 → 检索相关知识 → 构建Prompt → LLM生成答案 → 返回

## 测试

运行集成测试：
```bash
cd backend
pytest test_integration.py -v
```

运行知识库服务测试：
```bash
pytest test_knowledge_services.py -v
```

## API文档

详细API文档请查看：[docs/KNOWLEDGE_BASE_API.md](./docs/KNOWLEDGE_BASE_API.md)

## 部署指南

详细部署说明请查看：[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 配置说明

### Qdrant配置

- 默认端口: 6333 (HTTP API), 6334 (gRPC)
- 数据持久化: 使用Docker Volume挂载 `./qdrant_storage`
- 向量维度: 768 (使用OpenAI text-embedding-3-small)

### LLM配置

支持两种LLM提供商：
- **OpenAI**: GPT-4, GPT-3.5-turbo
- **智谱AI**: GLM-4

在 `.env` 中配置对应的API密钥即可。

### 文档处理配置

- 支持格式: PDF, DOCX, TXT, MD
- 分块大小: 500 tokens
- 重叠大小: 50 tokens
- 最大文件大小: 10MB

## 常见问题

### 1. Qdrant连接失败

确保Qdrant Docker容器正在运行：
```bash
docker ps | grep qdrant
```

### 2. Embedding失败

检查 `.env` 中的 `OPENAI_API_KEY` 或 `ZHIPUAI_API_KEY` 是否配置正确。

### 3. 文档解析失败

确保安装了所有必需的依赖：
```bash
pip install pypdf2 python-docx
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
