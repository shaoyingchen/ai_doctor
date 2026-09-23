# AI Doctor 项目代码分析报告

> 分析日期：2026-09-23 ｜ 范围：整个项目（前后端）｜ 类型：架构 + 质量 + 正确性 + Agent 集成评估
> 本报告为只读分析产物，修复执行请移交开发分身。

---

## 一、总体结论

项目当前处于**"骨架完整、内核为空"**的原型阶段：

- 前端 11 个页面、后端 20+ 端点、RAG 流水线图结构（ParseGraph/EnhanceIndexGraph）均已搭好
- 但**全链路没有任何真实 LLM / Embedding 接入**（requirements.txt 无 openai/zhipu/langchain），核心价值链路（对话、QA 生成、语义检索）全部是 mock
- 存储层有 4 套状态并存且互不一致，存在多个高危正确性 Bug

**优先级建议：先修正确性 Bug（一.2），再统一 LLM/Embedding 接入层（三.P0），Agent 化水到渠成。**

---

## 二、问题清单

### 2.1 高危正确性 Bug

| # | 位置 | 问题 | 影响 |
|---|------|------|------|
| B1 | [vector_service.py](file:///d:/personalProject/ai_doctor/backend/services/vector_service.py#L150) | `hash(point_id)` 生成 Qdrant point ID——Python 字符串 hash 每进程随机（PYTHONHASHSEED） | 跨重启 point ID 不稳定 → 重复向量累积、按 ID 删除失效。应改用 `uuid5` 或自增 int |
| B2 | [app.py](file:///d:/personalProject/ai_doctor/backend/app.py#L97) | 全局单例 `sqlite3.connect(check_same_thread=False)`，在 async handler 与 `asyncio.to_thread` 工作线程中并发读写，无锁 | `sqlite3.ProgrammingError`、数据损坏风险；正确做法：连接池/每线程连接 + `asyncio.Lock`，或迁移 aiosqlite/SQLAlchemy |
| B3 | [app.py](file:///d:/personalProject/ai_doctor/backend/app.py#L973-L1068) | `process_document` 先用 PARSER_MODULE 解析一遍，随后又跑 `rag_pipeline.run_end_to_end` 再解析同一文件 | 同一文件双倍解析开销，两套结果（parsed-data/*.json vs rag_results）互不一致 |
| B4 | [search_service.py](file:///d:/personalProject/ai_doctor/backend/services/search_service.py#L186) + [vector_service.py](file:///d:/personalProject/ai_doctor/backend/services/vector_service.py#L133) | 混合检索 RRF 按 `chunk_id` 合并，但 keyword 侧用 SQLite uuid，semantic 侧用 `"vec-{qdrant_id}"` | 两侧 ID 永不相同 → RRF 退化为两份独立列表简单拼接，"混合检索"名存实亡 |
| B5 | [app.py](file:///d:/personalProject/ai_doctor/backend/app.py#L654) | `delete_kb_node_recursively` 只删 kb_nodes 行，不删 documents/chunks/上传文件/Qdrant 向量 | 大量孤儿数据，KB 删除后文档仍可被检索到 |
| B6 | Qdrant 写入链路 | `upsert_vectors` 全项目仅 test_search_api.py 调用，生产上传路径从未写入 Qdrant | **语义检索永远返回空结果**；semantic/hybrid 模式实际只剩 keyword 在工作 |
| B7 | [app.py](file:///d:/personalProject/ai_doctor/backend/app.py#L184-L190) | CORS `allow_origins=["*"]` + `allow_credentials=True` | 规范冲突（浏览器拒绝凭据请求）且暴露面大；生产应白名单域名 |

### 2.2 架构问题

| # | 位置 | 问题 |
|---|------|------|
| A1 | 全后端 | **3 处互不兼容的 fake_embedding**：[app.py:820](file:///d:/personalProject/ai_doctor/backend/app.py#L820)（dim=16）、[vector_service.py:25](file:///d:/personalProject/ai_doctor/backend/services/vector_service.py#L25)（dim=1024）、[embedder.py](file:///d:/personalProject/ai_doctor/backend/rag_pipeline/src/rag_pipeline/embeddings/embedder.py)（dim=3 stub）。无统一模型接入层 |
| A2 | 存储层 | **4 套状态并存**：内存 dict（tasks/documents/rag_results，重启即失）+ SQLite + 文件（parsed-data/）+ rag_pipeline InMemory\*Store（重启即失）+ Qdrant（空）。同一份文档状态在 5 个地方各写一遍 |
| A3 | [app.py](file:///d:/personalProject/ai_doctor/backend/app.py) | 1996 行上帝文件：DB 初始化 + seed + 20+ 端点 + 分块算法 + 标注逻辑 + RAG 编排。应按 routers/services/repositories 拆分 |
| A4 | [api/enhance.py](file:///d:/personalProject/ai_doctor/backend/api/enhance.py) vs app.py 内 `/api/enhance/*` | **两套同前缀 QA 接口**：一个写内存 dict mock，一个写 SQLite，数据不互通，路由冲突 |
| A5 | [pipeline_service.py](file:///d:/personalProject/ai_doctor/backend/rag_pipeline/src/rag_pipeline/services/pipeline_service.py) | rag_pipeline 三个存储全是 InMemory 实现——解析/enhance 结果重启即失，与 SQLite/Qdrant 完全脱节 |

### 2.3 性能问题

| # | 位置 | 问题 |
|---|------|------|
| P1 | 所有端点 | 同步 sqlite I/O 直接在事件循环中执行，阻塞所有并发请求 |
| P2 | [app.py:1305](file:///d:/personalProject/ai_doctor/backend/app.py#L1305) | 上传 `await file.read()` 将单文件最大 100MB 整体读入内存，最多 32 个文件 → 峰值内存可达 GB 级。应流式写盘 |
| P3 | [search_service.py:64](file:///d:/personalProject/ai_doctor/backend/services/search_service.py#L64) | `LIKE '%query%'` 全表扫描且无法命中索引；中文多词查询需整串连续匹配。应升级 SQLite FTS5 + jieba 分词（jieba 已在依赖中） |
| P4 | [app.py:527](file:///d:/personalProject/ai_doctor/backend/app.py#L527) | chunks 逐条 `INSERT`，应 `executemany` 批量 |
| P5 | `/api/documents`、`/api/tasks` | 无分页，全量返回 |

### 2.4 安全问题

| # | 问题 |
|---|------|
| S1 | **全系统零认证鉴权**——任何人可删知识库、删任务、上传 100MB 文件 |
| S2 | 文件上传仅校验扩展名，无 MIME 内容嗅探 |
| S3 | `datetime.utcnow()` 已 deprecated（Py3.12+），应改 `datetime.now(timezone.utc)` |
| S4 | try/except ImportError 静默降级为 mock——缺依赖时不报错而是悄悄返回假数据，排障极难（app.py 5 处） |

### 2.5 可维护性

| # | 问题 |
|---|------|
| M1 | 根 [README.md](file:///d:/personalProject/ai_doctor/README.md) 严重过时：描述为 Flask 3.0 + Ant Design 5 + LangChain + OpenAI，实际为 FastAPI + Radix UI + 无任何 LLM 框架 |
| M2 | 垃圾文件：根目录 `.tmp_ragflow_document_app.py`、`=1.7.0`（pip 误输产物）、backend/package.json（Python 项目里的 Node 配置） |
| M3 | `resolve_upload_target` 与 `resolve_upload_target_for_rag` 近重复（app.py 668/695 行） |
| M4 | `find_duplicate_name` 查内存 dict 而非 SQLite——重启后重名检测失效 |

### 2.6 前端问题

| # | 位置 | 问题 |
|---|------|------|
| F1 | [AIDoctor/index.tsx](file:///d:/personalProject/ai_doctor/src/pages/AIDoctor/index.tsx#L41) | **首页对话 100% 前端 mock**（`generateMockResponse` 写死文案），未接任何后端 API；头部还标着"GPT-4"徽标 |
| F2 | [chatStore.ts](file:///d:/personalProject/ai_doctor/src/stores/chatStore.ts#L63) | mockKnowledgeBases 与后端 seed 数据（kb-1/2/3）完全不一致；chatHistory 无持久化，刷新即失 |
| F3 | 全局 | 12 个 zustand store 均无 persist 中间件；Search/Enhance/Annotation 页已接真实 API（良好），唯独核心对话页是摆设 |

---

## 三、Agent 集成方案（重点）

项目**天然适合 Agent 化**：rag_pipeline 已是图结构（ParseGraph/EnhanceIndexGraph），[langgraph_rag_pipeline_scaffold.md](file:///d:/personalProject/ai_doctor/backend/langgraph_rag_pipeline_scaffold.md) 显示原始设计就是 LangGraph，前端 Pipeline/Annotation 页的状态机也已按"异步任务+人工审核"建模。

### P0 — RAG 问答 Agent（核心价值，先做这个）

目标：干掉 AIDoctor 页的 mock，实现真实带溯源的问答。

```
用户问题 → [LangGraph Agent]
  ├─ 节点1: 查询改写（结合对话历史消歧）
  ├─ 节点2: 工具调用 hybrid_search（修复 B4/B6 后才有真实语义能力）
  ├─ 节点3: 相关性评估（CRAG 模式：不相关→改写重检索，最多 N 次）
  └─ 节点4: 生成答案 + 引用标注（chunk_id → 文档/页码）
        ↓ SSE 流式输出
前端 chatStore 接 /api/chat（stream）
```

落地要点：
- 先建统一 `LLMClient`/`Embedder` 抽象（OpenAI 兼容接口，可切 GLM-4/BGE-M3），一次性消灭 3 处 fake_embedding
- 工具定义直接复用现有 `SearchService.hybrid_search`

### P1 — 文档处理 Agent 流水线

将现有 ParseGraph/EnhanceIndexGraph 升级为真正的 LangGraph StateGraph：

```
上传 → parse（按类型路由 parser，已有 router.py）
     → normalize → quality_gate（已有雏形）
     → 低质量？→ vision_layout_parser 降级重试（已有）
     → chunk → embed → 写 Qdrant/SQLite
     → enhance（QA 生成/实体/摘要，换真实 LLM）
     → requires_review？→ 人工审核节点（human-in-the-loop 中断）
```

- `requires_review` 机制已存在于 [build_rag_state_item](file:///d:/personalProject/ai_doctor/backend/app.py#L572)，前端 Pipeline 页已有轮询——接 LangGraph interrupt 即可实现"暂停等人审"
- 对应 quickSkills 的"文档摘要/知识提取"也由此 Agent 提供真实能力

### P1 — 工具调用型对话 Agent

把 quickSkills（现为 mock）变成 Agent 工具：

| 工具 | 复用现有实现 |
|------|-------------|
| `search_knowledge_base` | SearchService.hybrid_search |
| `get_document_chunks` | /api/documents/{id}/parsed |
| `generate_qa` | EnhanceService（换真实 LLM） |
| `annotate_text` | AnnotationService.auto_annotate |
| `compare_documents` | 多文档检索 + LLM 对比（新） |

问答模式（qa）用 P0 Agent；分析模式（analyze）用 ReAct 多工具编排；创作模式（create）接 P2。

### P2 — 创作 / 分析 / 飞轮 Agent

- **创作 Agent**（Write 页）：模板检索 → 大纲生成 → 分段写作 → 引用注入，多步骤可控生成
- **分析 Agent**（Analytics/Analyze 模式）：文档数据提取 → 结构化 → 前端 recharts 已就绪可直接出图
- **飞轮 Agent**（Flywheel 页，医疗场景最关键）：
  ```
  低置信回答/用户负反馈 → 自动创建标注任务（已有 API）
  → 人工 approve/reject（已有 API）→ 通过的 QA 对入库
  → 加入检索索引 → 同类问题命中率提升
  ```
  这个闭环的所有 API 零件都已存在，只差一个编排 Agent 把它们串起来。

### 推荐技术选型

- **LangGraph**：scaffold 文档已定方向，图结构与现有 ParseGraph 一脉相承，支持 interrupt（人工审核）、checkpoint（状态持久化，正好解决 A2 内存态丢失问题）
- **LLM**：GLM-4（国内合规，医疗场景友好）或 OpenAI 兼容层
- **Embedding**：BGE-M3（中英混合 + 医疗术语强，本地可跑）或 text-embedding-3

### 落地路线图

| 阶段 | 动作 | 解除的阻塞 |
|------|------|-----------|
| Step 0 | 修复 B1/B2/B4/B6（ID 稳定性、DB 并发、RRF 键、Qdrant 写入） | 没有这些，Agent 检索出来的是空气 |
| Step 1 | 统一 LLMClient/Embedder 接入层，替换全部 mock | A1 |
| Step 2 | P0 问答 Agent + /api/chat SSE + chatStore 接入 | F1 |
| Step 3 | Pipeline 迁移 LangGraph + 人工审核 interrupt | A5 |
| Step 4 | 飞轮闭环 + 创作/分析 Agent | — |

---

## 四、收尾自检（只读红线）

- 分析阶段未修改任何源代码/配置/资源文件；未执行测试/构建/运行命令；未执行 git 写操作
- 分析报告文件：`docs/analysis/2026-09-23-code-analysis-report.md`
- 后续修复（下节）均按用户指令移交开发分身执行，本分身仅做编排与集成核查

---

## 五、修复进度（2026-09-23 更新）

按第三章路线图，Step 0→2 已由开发分身实施完毕并验证通过：

| 阶段 | 状态 | 交付 |
|------|------|------|
| Step 0 | 已完成 | B1-B7 全修复（含 B5 级联删除）；新增 ThreadSafeDB；垃圾文件已清理；test_search_api 通过 |
| Step 1 | 已完成 | 新增 services/llm_client.py、embedding_service.py、.env.example；3 处假 embedding + enhance 模板 mock 全替换（无 key 降级不中断）；删除 api/enhance.py mock 路由，7 个 enhance 端点统一 SQLite 版；修复 reject_task 崩溃 |
| Step 2 | 已完成 | 新增 services/chat_service.py + POST /api/chat（SSE：sources→token→done/error）；/api/kb/tree 补 documentCount；前端新增 services/chat.ts，chatStore/AIDoctor 去 mock（流式状态机 + persist）；sources score 归一化 0~1 |
| Step 3 | 待启动 | Pipeline 迁移 LangGraph + 人工审核 interrupt（A5）；/api/chat 升级 CRAG 重检索循环 |
| Step 4 | 待启动 | 飞轮闭环 Agent + 创作/分析 Agent |

验证记录：后端 py_compile / test_chat_api（14 断言）/ test_search_api 回归 / 真实 uvicorn 起服冒烟全通过；前端 tsc -b + vite build 0 错误。

遗留事项（不阻塞）：
1. 用户需在 backend/.env 配置 LLM_API_KEY（OpenAI 兼容协议）后聊天/enhance 才走真实模型，否则为降级模式
2. 本机 hosts 缺 `127.0.0.1 localhost` 映射（前端 build/dev 会 DNS 失败），需用户手动修复
3. 预存前端 lint 问题 45 项（均为历史代码，未动）
4. rag_pipeline InMemory 存储与磁盘脱节（A5），将在 Step 3 随 LangGraph 迁移解决
5. test_search_api.py 直接写生产库，建议改独立临时库
