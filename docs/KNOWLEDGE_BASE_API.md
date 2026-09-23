# Knowledge Base API Documentation

## Overview

本文档描述AI Doctor系统的知识库管理和检索API接口。

**Base URL**: `http://localhost:5000/api`

---

## API Endpoints

### 1. Knowledge Base Management

#### 1.1 Create Knowledge Base

创建新的知识库。

**Endpoint**: `POST /knowledge-bases`

**Request Body**:
```json
{
  "name": "医学知识库",
  "description": "包含糖尿病、高血压等常见疾病的诊疗知识",
  "metadata": {
    "category": "clinical",
    "source": "hospital"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "kb_id": "kb_20260622_001",
  "name": "医学知识库",
  "created_at": "2026-06-22T10:30:00Z"
}
```

---

#### 1.2 List Knowledge Bases

获取所有知识库列表。

**Endpoint**: `GET /knowledge-bases`

**Query Parameters**:
- `page` (optional): 页码，默认1
- `page_size` (optional): 每页数量，默认20

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "kb_id": "kb_20260622_001",
      "name": "医学知识库",
      "description": "包含糖尿病、高血压等常见疾病的诊疗知识",
      "doc_count": 156,
      "chunk_count": 2340,
      "created_at": "2026-06-22T10:30:00Z",
      "updated_at": "2026-06-22T15:20:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

#### 1.3 Get Knowledge Base Details

获取指定知识库的详细信息。

**Endpoint**: `GET /knowledge-bases/{kb_id}`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "kb_id": "kb_20260622_001",
    "name": "医学知识库",
    "description": "包含糖尿病、高血压等常见疾病的诊疗知识",
    "doc_count": 156,
    "chunk_count": 2340,
    "vector_dimension": 768,
    "metadata": {
      "category": "clinical",
      "source": "hospital"
    },
    "created_at": "2026-06-22T10:30:00Z",
    "updated_at": "2026-06-22T15:20:00Z"
  }
}
```

---

#### 1.4 Update Knowledge Base

更新知识库信息。

**Endpoint**: `PUT /knowledge-bases/{kb_id}`

**Request Body**:
```json
{
  "name": "临床医学知识库",
  "description": "更新后的描述",
  "metadata": {
    "category": "clinical",
    "version": "2.0"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Knowledge base updated successfully"
}
```

---

#### 1.5 Delete Knowledge Base

删除指定知识库及其所有文档。

**Endpoint**: `DELETE /knowledge-bases/{kb_id}`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Knowledge base deleted successfully"
}
```

---

### 2. Document Management

#### 2.1 Upload Document

上传文档到知识库。

**Endpoint**: `POST /knowledge-bases/{kb_id}/documents`

**Request** (multipart/form-data):
- `file`: 文档文件 (支持 txt, pdf, docx, md)
- `metadata` (optional): JSON字符串，文档元数据

**Response** (201 Created):
```json
{
  "success": true,
  "doc_id": "doc_20260622_001",
  "filename": "diabetes_guideline.pdf",
  "status": "processing",
  "message": "Document uploaded and processing started"
}
```

---

#### 2.2 List Documents

获取知识库中的文档列表。

**Endpoint**: `GET /knowledge-bases/{kb_id}/documents`

**Query Parameters**:
- `page` (optional): 页码，默认1
- `page_size` (optional): 每页数量，默认20
- `status` (optional): 过滤状态 (processing, completed, failed)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "doc_id": "doc_20260622_001",
      "filename": "diabetes_guideline.pdf",
      "file_size": 2048576,
      "status": "completed",
      "chunk_count": 45,
      "uploaded_at": "2026-06-22T11:00:00Z",
      "processed_at": "2026-06-22T11:02:30Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

#### 2.3 Get Document Details

获取文档详细信息。

**Endpoint**: `GET /documents/{doc_id}`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "doc_id": "doc_20260622_001",
    "kb_id": "kb_20260622_001",
    "filename": "diabetes_guideline.pdf",
    "file_type": "pdf",
    "file_size": 2048576,
    "status": "completed",
    "chunk_count": 45,
    "metadata": {
      "author": "Dr. Zhang",
      "year": "2026"
    },
    "uploaded_at": "2026-06-22T11:00:00Z",
    "processed_at": "2026-06-22T11:02:30Z"
  }
}
```

---

#### 2.4 Get Document Chunks

获取文档的分块内容。

**Endpoint**: `GET /documents/{doc_id}/chunks`

**Query Parameters**:
- `page` (optional): 页码，默认1
- `page_size` (optional): 每页数量，默认50

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "chunk_id": "chunk_001",
      "content": "糖尿病的诊断标准包括：1. 空腹血糖 ≥ 7.0 mmol/L...",
      "chunk_index": 0,
      "token_count": 256,
      "metadata": {
        "page": 1,
        "section": "诊断标准"
      }
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 50
}
```

---

#### 2.5 Delete Document

删除文档及其所有分块和向量。

**Endpoint**: `DELETE /documents/{doc_id}`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

### 3. Search & Retrieval

#### 3.1 Hybrid Search

执行混合检索（语义+关键词）。

**Endpoint**: `POST /search`

**Request Body**:
```json
{
  "kb_id": "kb_20260622_001",
  "query": "糖尿病的诊断标准是什么？",
  "search_mode": "hybrid",
  "top_k": 5,
  "alpha": 0.7,
  "filters": {
    "doc_id": "doc_20260622_001"
  }
}
```

**Parameters**:
- `kb_id` (required): 知识库ID
- `query` (required): 查询文本
- `search_mode` (optional): 检索模式 - `semantic` (语义), `keyword` (关键词), `hybrid` (混合), 默认 `hybrid`
- `top_k` (optional): 返回结果数量，默认5
- `alpha` (optional): 混合检索权重 (0-1)，0=纯关键词，1=纯语义，默认0.7
- `filters` (optional): 过滤条件

**Response** (200 OK):
```json
{
  "success": true,
  "query": "糖尿病的诊断标准是什么？",
  "results": [
    {
      "chunk_id": "chunk_001",
      "doc_id": "doc_20260622_001",
      "content": "糖尿病的诊断标准包括：1. 空腹血糖 ≥ 7.0 mmol/L；2. 餐后2小时血糖 ≥ 11.1 mmol/L；3. 糖化血红蛋白 ≥ 6.5%。",
      "score": 0.92,
      "metadata": {
        "filename": "diabetes_guideline.pdf",
        "page": 1,
        "section": "诊断标准"
      }
    }
  ],
  "total_results": 5,
  "search_mode": "hybrid",
  "search_time_ms": 45
}
```

---

#### 3.2 Multi-KB Search

跨多个知识库检索。

**Endpoint**: `POST /search/multi`

**Request Body**:
```json
{
  "kb_ids": ["kb_20260622_001", "kb_20260622_002"],
  "query": "高血压的治疗方案",
  "search_mode": "hybrid",
  "top_k": 10,
  "alpha": 0.7
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "query": "高血压的治疗方案",
  "results": [
    {
      "kb_id": "kb_20260622_001",
      "chunk_id": "chunk_045",
      "doc_id": "doc_20260622_003",
      "content": "高血压的一线治疗药物包括ACEI、ARB、CCB、利尿剂和β受体阻滞剂...",
      "score": 0.89,
      "metadata": {
        "kb_name": "医学知识库",
        "filename": "hypertension_treatment.pdf"
      }
    }
  ],
  "total_results": 10,
  "search_time_ms": 67
}
```

---

### 4. QA Generation

#### 4.1 Generate QA Pairs

从文档自动生成问答对。

**Endpoint**: `POST /documents/{doc_id}/generate-qa`

**Request Body**:
```json
{
  "num_pairs": 10,
  "difficulty": "medium",
  "question_types": ["factoid", "explanation"]
}
```

**Parameters**:
- `num_pairs` (optional): 生成数量，默认5
- `difficulty` (optional): 难度级别 - `easy`, `medium`, `hard`, 默认 `medium`
- `question_types` (optional): 问题类型列表

**Response** (200 OK):
```json
{
  "success": true,
  "doc_id": "doc_20260622_001",
  "qa_pairs": [
    {
      "qa_id": "qa_001",
      "question": "糖尿病的空腹血糖诊断标准是多少？",
      "answer": "空腹血糖 ≥ 7.0 mmol/L",
      "difficulty": "easy",
      "question_type": "factoid",
      "source_chunk_id": "chunk_001"
    },
    {
      "qa_id": "qa_002",
      "question": "为什么糖化血红蛋白可以用于糖尿病诊断？",
      "answer": "糖化血红蛋白反映近2-3个月的平均血糖水平，不受短期血糖波动影响，能够更准确地评估长期血糖控制情况。",
      "difficulty": "medium",
      "question_type": "explanation",
      "source_chunk_id": "chunk_003"
    }
  ],
  "generated_count": 10
}
```

---

#### 4.2 Generalize QA Pairs

对已有问答对进行泛化，生成变体。

**Endpoint**: `POST /qa/generalize`

**Request Body**:
```json
{
  "question": "糖尿病的空腹血糖诊断标准是多少？",
  "answer": "空腹血糖 ≥ 7.0 mmol/L",
  "num_variations": 5,
  "variation_types": ["rephrase", "expand", "simplify"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "original": {
    "question": "糖尿病的空腹血糖诊断标准是多少？",
    "answer": "空腹血糖 ≥ 7.0 mmol/L"
  },
  "variations": [
    {
      "variation_id": "var_001",
      "question": "空腹血糖达到什么水平可以诊断为糖尿病？",
      "answer": "当空腹血糖值达到或超过7.0毫摩尔每升时，可以诊断为糖尿病。",
      "variation_type": "rephrase"
    },
    {
      "variation_id": "var_002",
      "question": "糖尿病诊断的空腹血糖指标？",
      "answer": "≥ 7.0 mmol/L",
      "variation_type": "simplify"
    }
  ],
  "generated_count": 5
}
```

---

### 5. NLP Annotation

#### 5.1 Extract Entities

提取文本中的实体（疾病、药物、症状等）。

**Endpoint**: `POST /nlp/extract-entities`

**Request Body**:
```json
{
  "text": "患者张三，男性，45岁，诊断为2型糖尿病，处方二甲双胍500mg，每日三次。",
  "entity_types": ["PERSON", "DISEASE", "DRUG", "DOSAGE"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "text": "患者张三，男性，45岁，诊断为2型糖尿病，处方二甲双胍500mg，每日三次。",
  "entities": [
    {
      "text": "张三",
      "type": "PERSON",
      "start": 2,
      "end": 4,
      "confidence": 0.98
    },
    {
      "text": "2型糖尿病",
      "type": "DISEASE",
      "start": 16,
      "end": 21,
      "confidence": 0.95
    },
    {
      "text": "二甲双胍",
      "type": "DRUG",
      "start": 24,
      "end": 28,
      "confidence": 0.97
    },
    {
      "text": "500mg",
      "type": "DOSAGE",
      "start": 28,
      "end": 33,
      "confidence": 0.92
    }
  ],
  "entity_count": 4
}
```

---

#### 5.2 Extract Keywords

提取文本关键词。

**Endpoint**: `POST /nlp/extract-keywords`

**Request Body**:
```json
{
  "text": "糖尿病是一组以高血糖为特征的代谢性疾病。高血糖则是由于胰岛素分泌缺陷或其生物作用受损引起。",
  "top_k": 5,
  "method": "tfidf"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "keywords": [
    {
      "word": "糖尿病",
      "score": 0.85,
      "frequency": 1
    },
    {
      "word": "高血糖",
      "score": 0.78,
      "frequency": 2
    },
    {
      "word": "胰岛素",
      "score": 0.72,
      "frequency": 1
    },
    {
      "word": "代谢性疾病",
      "score": 0.65,
      "frequency": 1
    },
    {
      "word": "分泌缺陷",
      "score": 0.58,
      "frequency": 1
    }
  ],
  "keyword_count": 5
}
```

---

#### 5.3 Calculate Similarity

计算两段文本的语义相似度。

**Endpoint**: `POST /nlp/similarity`

**Request Body**:
```json
{
  "text1": "糖尿病的诊断标准是什么？",
  "text2": "如何诊断糖尿病？"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "text1": "糖尿病的诊断标准是什么？",
  "text2": "如何诊断糖尿病？",
  "similarity": 0.87,
  "method": "cosine"
}
```

---

### 6. System Health

#### 6.1 Health Check

检查系统健康状态。

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2026-06-22T16:30:00Z",
  "services": {
    "database": "ok",
    "qdrant": "ok",
    "nlp_service": "ok"
  },
  "version": "1.0.0"
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | 请求成功 |
| 201  | 资源创建成功 |
| 400  | 请求参数错误 |
| 404  | 资源不存在 |
| 409  | 资源冲突（如重复创建）|
| 500  | 服务器内部错误 |
| 503  | 服务暂时不可用 |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid search mode: 'unknown'. Must be one of: semantic, keyword, hybrid",
    "details": {
      "parameter": "search_mode",
      "provided": "unknown",
      "allowed": ["semantic", "keyword", "hybrid"]
    }
  },
  "timestamp": "2026-06-22T16:30:00Z"
}
```

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_PARAMETER` | 请求参数无效 |
| `MISSING_PARAMETER` | 缺少必需参数 |
| `RESOURCE_NOT_FOUND` | 资源不存在 |
| `RESOURCE_CONFLICT` | 资源冲突 |
| `FILE_TOO_LARGE` | 文件过大 |
| `UNSUPPORTED_FILE_TYPE` | 不支持的文件类型 |
| `PROCESSING_FAILED` | 处理失败 |
| `SEARCH_FAILED` | 检索失败 |
| `DATABASE_ERROR` | 数据库错误 |
| `QDRANT_ERROR` | Qdrant向量数据库错误 |
| `NLP_SERVICE_ERROR` | NLP服务错误 |

---

## Rate Limiting

当前版本暂未实施速率限制。生产环境建议配置：

- 搜索API: 100 requests/minute
- 文档上传: 10 uploads/minute
- QA生成: 20 requests/minute

---

## Authentication

当前版本为开发环境，未启用身份验证。生产环境需要添加：

- JWT Token认证
- API Key认证
- OAuth 2.0支持

---

## Pagination

列表类API支持分页参数：

- `page`: 页码（从1开始）
- `page_size`: 每页数量（默认20，最大100）

分页响应格式：
```json
{
  "data": [...],
  "total": 156,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```
