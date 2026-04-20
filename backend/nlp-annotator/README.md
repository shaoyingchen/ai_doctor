# AI Doctor NLP 自动标注服务

## 功能概述

NLP 自动标注服务提供以下功能：

1. **实体提取** - 自动识别文档中的实体
   - 组织机构（公司、政府机关、学校等）
   - 地点（省市县区等）
   - 时间表达式（日期、时间段等）
   - 数值（金额、百分比、度量衡等）

2. **关键词提取** - 使用 TF-IDF 和 TextRank 算法提取文档关键词

3. **自动分类** - 根据文档内容自动归类到预定义类别
   - 政策文件
   - 技术方案
   - 报告
   - 合同
   - 管理制度
   - 规划文件
   - 会议记录

## 服务架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端 React    │────▶│  后端 Express   │────▶│  NLP 标注服务   │
│   (端口 3000)   │     │   (端口 8000)   │     │  (端口 8002)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  PDF 解析服务   │
                        │  (端口 8001)    │
                        └─────────────────┘
```

## 安装依赖

### Python 服务

```bash
cd backend/nlp-annotator
pip3 install jieba fastapi uvicorn pydantic
```

### 完整依赖（包含 PDF 解析）

```bash
cd backend
pip3 install -r nlp-annotator/requirements.txt
```

## 启动服务

### 方式一：启动所有服务

```bash
cd backend
./start-all.sh
```

### 方式二：单独启动 NLP 服务

```bash
cd backend/nlp-annotator
python3 annotator.py
```

## API 接口

### 1. 文档标注接口

**请求：**
```bash
POST http://localhost:8000/api/annotate
Content-Type: application/json

{
  "content": "文档内容...",
  "documentName": "测试文档.pdf"
}
```

**响应：**
```json
{
  "success": true,
  "entities": [
    {
      "type": "organization",
      "value": "北京市人民政府",
      "confidence": 0.75,
      "location": "organization"
    },
    {
      "type": "time",
      "value": "2024 年 3 月 15 日",
      "confidence": 0.85,
      "location": "time"
    },
    {
      "type": "number",
      "value": "500 万元",
      "confidence": 0.80,
      "location": "number"
    }
  ],
  "keywords": [
    {
      "keyword": "数字化转型",
      "confidence": 0.92
    },
    {
      "keyword": "人工智能",
      "confidence": 0.88
    }
  ],
  "categories": [
    {
      "category": "政策文件",
      "confidence": 0.85,
      "keywords": ["政策", "规定", "办法"]
    }
  ]
}
```

### 2. 健康检查接口

```bash
GET http://localhost:8002/health
```

**响应：**
```json
{
  "status": "ok",
  "capabilities": {
    "jieba": true,
    "entity_extraction": true,
    "keyword_extraction": true,
    "text_classification": true
  }
}
```

## 使用方法

### 在标注工作台中使用

1. 打开标注工作台页面（`/annotation`）
2. 从左侧任务队列选择一个文档
3. 点击顶部的「自动标注」按钮
4. 等待标注完成，查看右侧结果面板
5. 审核自动标注结果，点击「添加到人工标注」保存认可的标注
6. 完成审核后点击「通过」或「驳回」

### 实体类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| organization | 组织机构 | 公司、集团、政府机关、学校 |
| location | 地点 | 省、市、县区、街道 |
| time | 时间 | 日期、时间段 |
| number | 数值 | 金额、百分比、度量衡 |

### 分类说明

| 类别 | 说明 |
|------|------|
| 政策文件 | 政策、规定、办法、条例等 |
| 技术方案 | 技术文档、设计方案、系统架构 |
| 报告 | 分析报告、调研报告、研究报告 |
| 合同 | 合同、协议、签约文件 |
| 管理制度 | 管理制度、操作规范、工作流程 |
| 规划文件 | 发展规划、工作计划、战略规划 |
| 会议记录 | 会议纪要、讨论记录 |

## 提高标注准确率

### 1. 安装 HanLP（可选）

HanLP 提供更强大的命名实体识别功能：

```bash
pip3 install hanlp
```

### 2. 自定义词典

在 `annotator.py` 中添加领域词典：

```python
# 在 ChineseKeywordExtractor 类中
def __init__(self):
    if HAS_JIEBA:
        # 加载自定义词典
        jieba.load_userdict('path/to/your_dict.txt')
```

### 3. 调整置信度阈值

修改 `annotator.py` 中的置信度计算逻辑：

```python
# 提高实体提取的置信度
confidence = 0.85  # 原为 0.75
```

## 故障排查

### NLP 服务无法启动

检查端口是否被占用：
```bash
lsof -i :8002
```

### 关键词提取不可用

检查 jieba 是否安装：
```bash
python3 -c "import jieba"
```

### 标注结果为空

1. 检查文档内容是否过短（少于 50 字）
2. 检查文档内容是否为中文
3. 查看服务日志获取详细错误信息

## 性能优化建议

1. **批量标注**：对于大量文档，建议使用批量标注接口（待实现）
2. **缓存结果**：对同一文档的标注结果进行缓存
3. **异步处理**：长文档标注使用异步任务队列（待实现）

## 扩展功能

### 添加新的实体类型

在 `ChineseEntityExtractor` 类中添加：

```python
# 添加新的实体后缀
NEW_ENTITY_SUFFIXES = ['后缀 1', '后缀 2']

# 添加提取方法
def extract_new_entities(self, text: str) -> List[Dict[str, Any]]:
    results = []
    for suffix in self.NEW_ENTITY_SUFFIXES:
        pattern = r'[\u4e00-\u9fa5]{2,8}' + suffix
        for match in re.finditer(pattern, text):
            results.append({
                'type': 'new_entity',
                'value': match.group(),
                'start_pos': match.start(),
                'end_pos': match.end(),
                'confidence': 0.75
            })
    return results
```

### 添加新的分类类别

在 `ChineseTextClassifier` 类中添加：

```python
CATEGORIES = {
    '新类别': {
        'keywords': ['关键词 1', '关键词 2'],
        'patterns': [r'正则模式 1', r'正则模式 2'],
    },
}
```

## 许可证

本服务作为 AI Doctor 项目的一部分，遵循项目整体许可证。
