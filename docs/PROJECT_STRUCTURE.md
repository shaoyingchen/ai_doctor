# AI Doctor 工程目录介绍

本文档说明 AI Doctor 当前的前后端分离目录结构、各模块职责、运行数据位置、主要数据流及常用开发命令。

## 1. 总体结构

```text
ai_doctor/
├── frontend/                      # 前端独立工程：React + TypeScript + Vite
│   ├── public/                    # 不经构建处理的静态资源
│   ├── src/                       # 前端源代码
│   │   ├── assets/                # 图片、图标等源码资源
│   │   ├── components/            # 布局与通用 UI 组件
│   │   ├── config/                # API 地址与前端运行配置
│   │   ├── hooks/                 # 通用 React Hooks
│   │   ├── lib/                   # 样式合并与通用工具函数
│   │   ├── pages/                 # 各业务页面
│   │   ├── services/              # 后端 API 封装
│   │   ├── stores/                # Zustand 业务状态
│   │   ├── styles/                # 全局样式
│   │   ├── types/                 # 共享 TypeScript 类型
│   │   ├── App.tsx                # 应用根组件
│   │   ├── main.tsx               # React 挂载入口
│   │   └── router.tsx             # 路由与页面懒加载配置
│   ├── .env.example               # 前端环境变量示例
│   ├── .env.local                 # 本地环境变量，不提交版本库
│   ├── index.html                 # Vite HTML 入口
│   ├── package.json               # 前端依赖与 npm 脚本
│   ├── package-lock.json          # 前端依赖锁定文件
│   ├── vite.config.ts             # Vite 与 @ 路径别名配置
│   ├── tsconfig.json              # TypeScript 项目引用入口
│   ├── tsconfig.app.json          # 应用源码编译配置
│   ├── tsconfig.node.json         # Vite 配置编译配置
│   ├── tailwind.config.js         # Tailwind 扫描路径与主题配置
│   ├── postcss.config.js          # PostCSS 插件配置
│   ├── eslint.config.js           # ESLint 配置
│   ├── node_modules/              # 前端依赖，自动生成
│   └── dist/                      # 前端生产构建产物，自动生成
│
├── backend/                       # 后端独立工程：FastAPI + Uvicorn
│   ├── api/                       # API 模块预留目录
│   ├── config/                    # 后端配置模块预留目录
│   ├── services/                  # 后端业务服务层
│   ├── python-parser/             # 通用文档解析器
│   ├── nlp-annotator/             # NLP 标注器
│   ├── rag_pipeline/              # 模块化 RAG 子工程
│   ├── uploads/                   # 上传的原始文档，运行时生成
│   ├── parsed-data/               # 文档解析结果，运行时生成
│   ├── data/                      # SQLite、Qdrant 与 RAG 持久化数据
│   ├── app.py                     # FastAPI 主入口及 API 路由
│   ├── requirements.txt           # 后端 Python 依赖
│   ├── .env.example               # 后端环境变量示例
│   ├── package.json               # 后端便捷启动脚本
│   ├── start.sh                   # 类 Unix 后端启动脚本
│   ├── start-all.sh               # 类 Unix 统一服务启动脚本
│   ├── test_*.py                  # 后端接口与流程测试
│   └── README.md                  # 后端专项说明
│
├── docs/                          # 项目级文档
├── .venv/                         # 本地 Python 虚拟环境，不提交版本库
├── .trellis/                      # Trellis 工作流、规范与任务上下文
├── .agents/                       # AI 开发技能定义
├── .claude/                       # Claude Code 工具配置
├── .codex/                        # Codex 工具配置
├── .cursor/                       # Cursor 命令配置
├── .idea/                         # IDE 工程配置
├── .lingma/                       # 通义灵码工具配置
├── .superpowers/                  # 需求与设计过程产物
├── .gitignore                     # Git 忽略规则
├── README.md                      # 项目入口与快速启动说明
├── CHANGELOG_PERFORMANCE.md       # 性能优化变更记录
└── ENHANCE_IMPLEMENTATION.md      # 内容增强功能实现说明
```

`frontend/` 与 `backend/` 分别拥有自己的依赖、环境变量和启动命令。仓库根目录只保留共享文档、工程级配置与开发工具上下文，不再保存前端源码或后端运行数据。

## 2. 前端工程 frontend/

### 2.1 应用入口与路由

| 文件 | 说明 |
|------|------|
| `index.html` | Vite 页面模板，挂载点为 `root`，加载 `/src/main.tsx`。 |
| `src/main.tsx` | React 应用启动入口，引入全局样式并挂载根组件。 |
| `src/App.tsx` | 通过 `RouterProvider` 接入应用路由。 |
| `src/router.tsx` | 定义主布局、业务路由和各页面的懒加载逻辑。 |

### 2.2 页面 pages/

| 目录 | 页面职责 | 主要组成 |
|------|----------|----------|
| `AIDoctor/` | 智能医疗问答与对话 | 对话输入、消息列表、来源卡片、侧边信息面板 |
| `Search/` | 知识库混合检索 | 搜索框、筛选面板、结果卡片 |
| `Write/` | 模板化写作 | 编辑器、模板面板、生成配置面板 |
| `KBManage/` | 知识库与文档管理 | 知识库树、文件表格、元数据面板、处理视图 |
| `Pipeline/` | RAG 流水线任务与审核 | 解析、增强、索引及人工审核状态展示 |
| `Annotation/` | NLP 标注 | 文本标注、实体与关键词结果展示 |
| `Enhance/` | 内容增强 | 文档增强、质量结果与任务状态展示 |
| `Flywheel/` | 数据飞轮 | 反馈数据、处理流程与闭环状态展示 |
| `Template/` | 模板管理 | 模板维护、变量及生成配置 |
| `Graph/` | 知识图谱 | 图谱节点、关系与可视化展示 |
| `Analytics/` | 统计分析 | 指标卡片、趋势与图表展示 |

页面目录下的 `index.tsx` 通常是页面入口，其余文件按职责拆分为子组件。`pages/` 根下少量同名 `.tsx` 文件用于兼容既有导入路径。

### 2.3 组件 components/

```text
components/
├── layout/
│   ├── MainLayout.tsx           # 页面主布局
│   ├── Sidebar.tsx              # 侧边导航
│   └── index.ts                 # 布局组件导出
└── ui/
    ├── FileUpload.tsx           # 文件上传组件
    ├── ParseProgress.tsx        # 解析进度组件
    ├── badge.tsx                # 徽标
    ├── button.tsx               # 按钮
    ├── card.tsx                 # 卡片
    ├── input.tsx                # 输入框
    ├── modal.tsx                # 模态框
    └── tabs.tsx                 # 标签页
```

- `layout/` 只承载应用级布局与导航。
- `ui/` 保存跨业务页面复用的展示和交互组件。
- 页面私有组件优先放在对应 `pages/<Page>/` 内。

### 2.4 状态 stores/

前端使用 Zustand 按业务域拆分状态：

| 文件 | 状态域 |
|------|--------|
| `chatStore.ts` | 问答会话、消息与来源 |
| `searchStore.ts` | 检索条件、结果与筛选状态 |
| `kbStore.ts` | 知识库树、文档与目录状态 |
| `pipelineStore.ts` | 流水线任务、检查点与审核状态 |
| `annotationStore.ts` | 标注文本、实体与操作状态 |
| `enhanceStore.ts` | 内容增强任务与结果 |
| `writeStore.ts` | 写作内容与生成配置 |
| `templateStore.ts` | 模板列表与编辑状态 |
| `graphStore.ts` | 图谱数据与视图状态 |
| `flywheelStore.ts` | 数据飞轮任务与反馈状态 |
| `analyticsStore.ts` | 分析指标与图表数据 |
| `layoutStore.ts` | 布局与导航 UI 状态 |

### 2.5 API 与运行配置

| 位置 | 说明 |
|------|------|
| `src/config/api.ts` | 解析 `VITE_API_BASE_URL` 并拼接后端 API 地址。 |
| `src/config/index.ts` | 管理 API、WebSocket、轮询、虚拟滚动、功能开关和调试配置。 |
| `src/services/chat.ts` | 问答相关请求封装。 |
| `src/services/annotationService.ts` | 标注相关请求封装。 |
| `src/services/enhanceService.ts` | 内容增强相关请求封装。 |

默认后端地址为 `http://localhost:8000`。前端环境变量统一使用 `VITE_` 前缀，本地覆盖值放在 `frontend/.env.local`。

### 2.6 其他前端目录

- `hooks/useDebounce.ts`：输入防抖。
- `hooks/usePolling.ts`：任务状态轮询。
- `lib/cn.ts`：合并条件样式类名。
- `lib/utils.ts`：通用格式化与辅助函数。
- `types/index.ts`：跨页面、状态与 API 使用的共享类型。
- `styles/globals.css`：Tailwind 指令、全局基础样式与主题变量。
- `assets/`：需要经过 Vite 构建处理的图片和图标。
- `public/`：通过根 URL 直接访问的静态文件。

### 2.7 前端构建配置

- `@` 别名指向 `frontend/src/`，在 `vite.config.ts` 与 `tsconfig.app.json` 中保持一致。
- `npm run build` 先执行 TypeScript 项目检查，再执行 Vite 构建。
- `npm run lint` 在 `frontend/` 内检查 TypeScript 与 TSX 文件。
- `node_modules/`、`dist/` 和 `.env.local` 均不应提交版本库。

## 3. 后端工程 backend/

### 3.1 应用入口 app.py

`app.py` 是当前统一后端入口，主要负责：

- 创建 FastAPI 应用并配置 CORS。
- 初始化 SQLite 数据表与基础知识库数据。
- 加载文档解析器、NLP 标注器和 RAG 流水线模块。
- 提供上传、任务、文档、知识库、检索、问答、标注、增强、审核等 API。
- 管理上传文件、解析结果、SQLite 与 Qdrant 的存储路径。

关键路径约定：

```text
BASE_DIR   = backend/
UPLOAD_DIR = backend/uploads/
PARSED_DIR = backend/parsed-data/
DATA_DIR   = backend/data/
SQLITE_PATH = backend/data/app.db
```

### 3.2 业务服务 services/

| 文件 | 职责 |
|------|------|
| `search_service.py` | 语义、关键词与混合检索，融合并整理检索结果。 |
| `vector_service.py` | Qdrant 集合、向量写入、删除与相似度查询。 |
| `embedding_service.py` | OpenAI 兼容 Embedding 调用、维度配置与降级逻辑。 |
| `chat_service.py` | 问答上下文组织、LLM 调用与对话结果处理。 |
| `llm_client.py` | OpenAI 兼容 LLM 客户端与请求配置。 |
| `annotation_service.py` | NLP 标注业务编排与结果处理。 |
| `enhance_service.py` | 内容增强、QA 生成与相关任务逻辑。 |
| `__init__.py` | 服务包导出与共享说明。 |

### 3.3 文档解析与 NLP

#### python-parser/

- `parser.py`：通用文档解析入口，处理 PDF、DOCX、TXT、Markdown 等格式。
- `requirements.txt`：解析器独立运行时的依赖说明。

该模块由 `app.py` 直接加载，不需要单独启动解析服务。

#### nlp-annotator/

- `annotator.py`：实体识别、关键词提取等 NLP 标注逻辑。
- `requirements.txt`：标注器依赖说明。
- `README.md`：标注器专项使用说明。

该模块同样由统一后端内部加载，不需要独立占用其他端口。

### 3.4 RAG 子工程 rag_pipeline/

```text
rag_pipeline/
├── scripts/
│   ├── run_parse.py             # 独立执行解析流程
│   ├── run_enhance.py           # 独立执行增强流程
│   └── run_end_to_end.py        # 独立执行端到端流程
├── src/rag_pipeline/
│   ├── chunking/                # 通用、表格、演示文档和手动分块
│   ├── embeddings/              # 向量化与标题内容融合
│   ├── enhancement/             # 分类、实体、关键词、摘要与 QA 增强
│   ├── graphs/                  # 解析、增强和索引流程编排及节点
│   ├── indexing/                # 向量与文档索引更新管理
│   ├── normalization/           # 块标准化、章节构建与质量门禁
│   ├── parsers/                 # PDF、DOCX、PPTX、CSV、Excel 解析器
│   ├── services/                # 对外统一的 PipelineService
│   ├── storage/                 # 文档、图谱与向量存储适配
│   └── utils/                   # 文件、ID 与 MIME 工具
├── pyproject.toml               # RAG 子工程元数据与测试配置
└── README.md                    # RAG 子工程专项说明
```

主服务通过 `backend/rag_pipeline/src/` 导入该包。`PipelineService` 是 `app.py` 与内部解析、增强、索引流程之间的主要适配层。

RAG 默认持久化目录为 `backend/data/rag_store/`，可通过 `RAG_STORE_DIR` 环境变量覆盖。

### 3.5 后端运行数据

| 路径 | 内容 | 说明 |
|------|------|------|
| `uploads/` | 用户上传文件 | 普通上传按日期归档，RAG 上传位于 `rag-pipeline/` 子目录。 |
| `parsed-data/` | 解析 JSON | 通常以文档 ID 命名，包含分块、向量或元数据。 |
| `data/app.db` | SQLite 主数据库 | 保存知识库、目录、文档、分块、任务与审核等数据。 |
| `data/app.db-shm`、`data/app.db-wal` | SQLite WAL 文件 | 数据库运行时自动维护。 |
| `data/qdrant/` | 本地向量库 | 默认使用文件模式，无需独立 Qdrant 服务。 |
| `data/rag_store/` | RAG 持久化数据 | 文档状态、检查点或图谱等流水线数据。 |
| `data.before-root-migration/` | 迁移前备份 | 本次目录拆分前的 backend 数据备份，不被主服务读取。 |

以上运行数据均不应提交版本库。迁移或备份前应先停止后端，避免 SQLite/Qdrant 文件锁或写入不一致。

### 3.6 测试与辅助文件

- `test_chat_api.py`：问答 API 测试。
- `test_search_api.py`：混合检索服务与数据测试，使用 `backend/data/`。
- `test_review_flow.py`：RAG 人工审核流程测试。
- `test_integration.py`：早期知识库集成测试，运行前需确认其依赖和环境。
- `test-upload.sh`：上传接口的 shell 冒烟脚本。
- `_run_py.ps1`：Windows Python 辅助脚本。
- `SEARCH_API_TESTING.md`、`SEARCH_IMPLEMENTATION_SUMMARY.md`：检索测试与实现说明。

## 4. 共享文档 docs/

| 路径 | 内容 |
|------|------|
| `PROJECT_STRUCTURE.md` | 本文档，说明完整工程结构与开发约定。 |
| `KNOWLEDGE_BASE_API.md` | 知识库 API 说明。 |
| `DEPLOYMENT.md` | 本地与生产部署参考。 |
| `PERFORMANCE_OPTIMIZATION.md` | 性能优化方案与说明。 |
| `analysis/` | 代码分析与历史审查报告。 |
| `superpowers/plans/` | 需求与实施计划过程稿。 |
| `superpowers/specs/` | 设计规格过程稿。 |

`backend/` 与 `backend/rag_pipeline/` 内的 README 和专项 Markdown 文件用于描述各自子工程；`docs/` 用于跨前后端的项目级文档。

## 5. 主要数据流

### 5.1 文档上传与索引

```text
前端上传页面
  → FastAPI 上传 / RAG 解析接口
  → backend/uploads/ 保存原文件
  → python-parser 或 rag_pipeline/parsers 解析
  → normalization 与 chunking 标准化、分块
  → backend/parsed-data/ 保存解析产物
  → embedding_service 生成向量
  → backend/data/qdrant/ 写入向量
  → backend/data/app.db 写入文档、分块与任务状态
  → 前端轮询或接收任务状态并展示结果
```

### 5.2 混合检索

```text
前端 Search 页面
  → 后端检索接口
  → search_service
  → Qdrant 语义检索 + SQLite/BM25 关键词检索
  → 结果融合与排序
  → 前端结果卡片与筛选面板
```

### 5.3 RAG 问答

```text
前端 AIDoctor 页面
  → 后端问答接口
  → 检索相关知识片段
  → chat_service 组织上下文
  → llm_client 调用 OpenAI 兼容模型
  → 返回答案与来源
  → 前端消息及来源卡片展示
```

### 5.4 增强与人工审核

```text
文档解析结果
  → 质量门禁
  → 低于阈值时写入检查点并等待审核
  → 人工 approve / reject
  → enhancement 执行摘要、实体、关键词或 QA 增强
  → indexing 更新文档与向量索引
  → 前端 Pipeline 页面展示状态与结果
```

## 6. 开发与构建命令

### 6.1 前端

在仓库根目录执行：

```bash
cd frontend
npm install
npm run dev
```

其他命令：

```bash
npm run build
npm run lint
npm run preview
```

- 开发地址：`http://localhost:5173`
- 构建产物：`frontend/dist/`
- 环境变量：`frontend/.env.local`

### 6.2 后端

在仓库根目录执行：

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

- 服务地址：`http://localhost:8000`
- 健康检查：`GET /health`
- 服务状态：`GET /api/health`
- OpenAPI 文档：`http://localhost:8000/docs`
- 环境变量：`backend/.env`

## 7. 目录维护约定

1. 新前端页面放入 `frontend/src/pages/`，共享组件放入 `components/`，业务状态放入 `stores/`。
2. 新后端业务能力优先放入 `backend/services/`，文档处理流程放入 `rag_pipeline/` 对应层。
3. 前端通过 `frontend/src/config/` 获取后端地址，不在页面中硬编码新的服务地址。
4. 后端运行路径以 `backend/app.py` 的 `BASE_DIR` 为基准，不重新引用仓库根目录的 `uploads/`、`parsed-data/` 或 `data/`。
5. 上传文件、数据库、向量索引、依赖目录、构建产物和本地密钥均不提交版本库。
6. 修改跨前后端的数据结构时，同步检查 `frontend/src/types/`、API 封装、后端服务与相关文档。
