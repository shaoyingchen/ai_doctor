"""
AI Doctor - NLP 自动标注服务
支持：
1. 实体提取（组织、地点、时间、数值）
2. 关键词提取（TextRank 算法）
3. 自动分类
"""

import os
import re
import json
from typing import List, Dict, Any, Optional, Tuple
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# 尝试导入 NLP 库
try:
    import jieba
    import jieba.analyse
    HAS_JIEBA = True
except ImportError:
    HAS_JIEBA = False
    print("警告：jieba 未安装，关键词提取功能将不可用")
    print("安装：pip install jieba")

try:
    import hanlp
    HAS_HANLP = True
except ImportError:
    HAS_HANLP = False
    print("提示：hanlp 未安装，实体识别功能将使用规则匹配")
    print("安装：pip install hanlp")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("提示：scikit-learn 未安装，自动分类功能将使用规则匹配")


# ============== FastAPI 应用 ==============

app = FastAPI(title="AI Doctor NLP Annotator Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== 数据类型 ==============

class AnnotationRequest(BaseModel):
    content: str
    document_name: Optional[str] = None


class EntityResult(BaseModel):
    type: str  # organization, location, time, number
    value: str
    confidence: float
    start_pos: int
    end_pos: int


class KeywordResult(BaseModel):
    keyword: str
    confidence: float
    score: float


class CategoryResult(BaseModel):
    category: str
    confidence: float
    keywords: List[str]


class AnnotationResponse(BaseModel):
    success: bool
    entities: List[EntityResult]
    keywords: List[KeywordResult]
    categories: List[CategoryResult]
    error: Optional[str] = None


# ============== 实体提取 ==============

class ChineseEntityExtractor:
    """
    中文实体提取器
    支持：组织、地点、时间、数值
    """

    # 常见组织类型后缀
    ORG_SUFFIXES = [
        '公司', '集团', '企业', '单位', '机构', '组织', '协会', '学会',
        '局', '部', '委', '办', '厅', '处', '科', '所', '站', '中心',
        '厂', '店', '行', '社', '院', '校', '园', '区', '基地', '园区',
        '政府', '机关', '部门', '委员会', '办公室', '领导小组'
    ]

    # 常见地点后缀
    LOC_SUFFIXES = [
        '省', '市', '县', '区', '镇', '乡', '村', '庄', '街道', '路', '道',
        '街', '巷', '胡同', '号', '栋', '楼', '室', '门', '小区', '花园',
        '国家', '地区', '自治区', '特别行政区', '行政区', '流域', '海域',
        '山脉', '山峰', '河流', '湖泊', '海洋', '岛屿', '半岛', '大陆',
        '公园', '广场', '中心', '基地', '园区', '开发区', '新区', '新城'
    ]

    # 时间表达式模式
    TIME_PATTERNS = [
        r'\d{4}年',  # 2024 年
        r'\d{4}-\d{1,2}-\d{1,2}',  # 2024-01-15
        r'\d{4}年\d{1,2}月',  # 2024 年 1 月
        r'\d{4}年\d{1,2}月\d{1,2}日',  # 2024 年 1 月 15 日
        r'\d{1,2}月\d{1,2}日',  # 1 月 15 日
        r'星期 [一二三四五六日天]',  # 星期一
        r'[上下今明后]午',  # 上午
        r'[上下今明后]半年',  # 上半年
        r'[去今明后]年',  # 今年
        r'[本这那]周',  # 本周
        r'[早中晚]餐',  # 早餐（时间相关）
        r'\d{1,2}[：:]\d{1,2}',  # 12:30
        r'\d{1,2}点\d{1,2}分?',  # 12 点 30 分
        r'\d+世纪\d+年代',  # 21 世纪 90 年代
    ]

    # 数值模式
    NUMBER_PATTERNS = [
        r'\d+[,\.]?\d*\s*[万亿千亿百十]?(?:元|万|亿|千|百|十)?(?:人民币|美元|港币|欧元|英镑|日元)?',  # 金额
        r'\d+(?:\.\d+)?\s*%',  # 百分比
        r'\d+(?:\.\d+)?\s*(?:公里 | 米|厘米 | 毫米 | 吨|千克 | 公斤 | 克|升|毫升)',  # 度量衡
        r'\d+(?:\.\d+)?\s*(?:个 | 只|头|条|件|项|份|批)',  # 数量词
        r'[一二三四五六七八九十百千万亿]+',  # 中文数字
    ]

    def __init__(self):
        self._compile_patterns()

    def _compile_patterns(self):
        """预编译正则表达式"""
        self.time_regex = [re.compile(p) for p in self.TIME_PATTERNS]
        self.number_regex = [re.compile(p) for p in self.NUMBER_PATTERNS]

    def extract_organizations(self, text: str) -> List[Dict[str, Any]]:
        """提取组织名"""
        results = []

        # 方法 1：基于后缀匹配
        for suffix in self.ORG_SUFFIXES:
            pattern = r'[\u4e00-\u9fa5]{2,10}' + suffix
            for match in re.finditer(pattern, text):
                results.append({
                    'type': 'organization',
                    'value': match.group(),
                    'start_pos': match.start(),
                    'end_pos': match.end(),
                    'confidence': 0.75,  # 规则匹配置信度
                    'method': 'suffix'
                })

        return results

    def extract_locations(self, text: str) -> List[Dict[str, Any]]:
        """提取地名"""
        results = []

        # 基于后缀匹配
        for suffix in self.LOC_SUFFIXES:
            pattern = r'[\u4e00-\u9fa5]{1,8}' + suffix
            for match in re.finditer(pattern, text):
                results.append({
                    'type': 'location',
                    'value': match.group(),
                    'start_pos': match.start(),
                    'end_pos': match.end(),
                    'confidence': 0.75,
                    'method': 'suffix'
                })

        return results

    def extract_times(self, text: str) -> List[Dict[str, Any]]:
        """提取时间表达式"""
        results = []

        for regex in self.time_regex:
            for match in regex.finditer(text):
                results.append({
                    'type': 'time',
                    'value': match.group(),
                    'start_pos': match.start(),
                    'end_pos': match.end(),
                    'confidence': 0.85,
                    'method': 'regex'
                })

        # 去重
        seen = set()
        unique_results = []
        for r in results:
            key = (r['start_pos'], r['end_pos'])
            if key not in seen:
                seen.add(key)
                unique_results.append(r)

        return unique_results

    def extract_numbers(self, text: str) -> List[Dict[str, Any]]:
        """提取数值"""
        results = []

        for regex in self.number_regex:
            for match in regex.finditer(text):
                value = match.group().strip()
                # 过滤太短的匹配
                if len(value) > 1:
                    results.append({
                        'type': 'number',
                        'value': value,
                        'start_pos': match.start(),
                        'end_pos': match.end(),
                        'confidence': 0.80,
                        'method': 'regex'
                    })

        return results

    def extract(self, text: str) -> List[Dict[str, Any]]:
        """
        提取所有类型的实体
        """
        entities = []
        entities.extend(self.extract_organizations(text))
        entities.extend(self.extract_locations(text))
        entities.extend(self.extract_times(text))
        entities.extend(self.extract_numbers(text))

        # 按位置排序
        entities.sort(key=lambda x: x['start_pos'])

        # 合并重叠的实体（保留更长的）
        entities = self._merge_overlapping(entities)

        return entities

    def _merge_overlapping(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """合并重叠的实体"""
        if not entities:
            return []

        merged = []
        current = entities[0]

        for entity in entities[1:]:
            if entity['start_pos'] < current['end_pos']:
                # 重叠，保留更长的
                if entity['end_pos'] > current['end_pos']:
                    current = entity
            else:
                merged.append(current)
                current = entity

        merged.append(current)
        return merged


# ============== 关键词提取 ==============

class ChineseKeywordExtractor:
    """
    中文关键词提取器
    使用 TF-IDF 和 TextRank 算法
    """

    # 停用词表（简化版）
    STOP_WORDS = {
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
        '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
        '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
        '他', '她', '它', '们', '这个', '那个', '什么', '怎么',
        '可以', '没', '把', '让', '向', '往', '被', '给', '使',
        '与', '及', '或', '等', '其', '之', '而', '但', '并',
        '如果', '因为', '所以', '虽然', '但是', '而且', '或者',
        '进行', '一个', '一些', '这些', '那些', '这样', '那样',
        '通过', '由于', '对于', '关于', '根据', '按照', '为了',
        '以及', '从而', '进而', '此外', '同时', '另外', '同样',
    }

    def __init__(self):
        if HAS_JIEBA:
            # 加载自定义词典（可以在这里添加领域词典）
            pass

    def extract_tfidf(self, text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """使用 TF-IDF 提取关键词"""
        if not HAS_JIEBA:
            return []

        # 使用 jieba 的 TF-IDF
        keywords = jieba.analyse.extract_tags(
            text,
            topK=top_k,
            withWeight=True,
            allowPOS=('n', 'nz', 'vn', 'v', 'nt')  # 名词、动名词、动词、机构名
        )

        results = []
        for word, weight in keywords:
            if word.lower() not in self.STOP_WORDS and len(word) > 1:
                results.append({
                    'keyword': word,
                    'score': weight,
                    'confidence': min(0.95, 0.5 + weight * 0.5),  # 归一化到 0.5-0.95
                    'method': 'tfidf'
                })

        return results

    def extract_textrank(self, text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """使用 TextRank 提取关键词"""
        if not HAS_JIEBA:
            return []

        keywords = jieba.analyse.textrank(
            text,
            topK=top_k,
            withWeight=True,
            allowPOS=('n', 'nz', 'vn', 'v', 'nt')
        )

        results = []
        for word, weight in keywords:
            if word.lower() not in self.STOP_WORDS and len(word) > 1:
                results.append({
                    'keyword': word,
                    'score': weight,
                    'confidence': min(0.95, 0.5 + weight * 0.5),
                    'method': 'textrank'
                })

        return results

    def extract(self, text: str, top_k: int = 10, method: str = 'combined') -> List[Dict[str, Any]]:
        """
        提取关键词

        Args:
            text: 输入文本
            top_k: 返回关键词数量
            method: 'tfidf', 'textrank', 或 'combined'
        """
        if method == 'tfidf':
            return self.extract_tfidf(text, top_k)
        elif method == 'textrank':
            return self.extract_textrank(text, top_k)
        else:  # combined
            tfidf_results = self.extract_tfidf(text, top_k)
            textrank_results = self.extract_textrank(text, top_k)

            # 合并结果，TextRank 权重稍高
            keyword_dict = {}
            for r in tfidf_results:
                keyword_dict[r['keyword']] = {
                    'keyword': r['keyword'],
                    'score': r['score'] * 0.4,
                    'confidence': r['confidence'],
                    'methods': ['tfidf']
                }
            for r in textrank_results:
                if r['keyword'] in keyword_dict:
                    keyword_dict[r['keyword']]['score'] += r['score'] * 0.6
                    keyword_dict[r['keyword']]['methods'].append('textrank')
                else:
                    keyword_dict[r['keyword']] = {
                        'keyword': r['keyword'],
                        'score': r['score'] * 0.6,
                        'confidence': r['confidence'],
                        'methods': ['textrank']
                    }

            # 按分数排序
            results = list(keyword_dict.values())
            results.sort(key=lambda x: x['score'], reverse=True)

            # 重新计算置信度
            max_score = results[0]['score'] if results else 1
            for r in results[:top_k]:
                r['confidence'] = min(0.95, 0.5 + (r['score'] / max_score) * 0.45)
                del r['methods']  # 不返回方法信息

            return results[:top_k]


# ============== 自动分类 ==============

class ChineseTextClassifier:
    """
    中文文本分类器
    使用预定义类别和规则匹配（简化版，实际项目可使用训练模型）
    """

    # 预定义类别及关键词
    CATEGORIES = {
        '政策文件': {
            'keywords': ['政策', '规定', '办法', '条例', '通知', '意见', '决定', '指示', '要求'],
            'patterns': [r'关于印发', r'的通知', r'管理办法', r'实施细则', r'指导意见'],
        },
        '技术方案': {
            'keywords': ['技术', '方案', '设计', '架构', '系统', '平台', '实现', '开发'],
            'patterns': [r'技术方案', r'设计方案', r'系统设计', r'架构设计'],
        },
        '报告': {
            'keywords': ['报告', '分析', '调研', '研究', '总结', '评估', '审查'],
            'patterns': [r'研究报告', r'分析报告', r'调研报告', r'年度总结'],
        },
        '合同': {
            'keywords': ['合同', '协议', '签约', '甲方', '乙方', '条款', '签署'],
            'patterns': [r'合同书', r'协议书', r'采购合同', r'服务协议'],
        },
        '管理制度': {
            'keywords': ['制度', '规范', '标准', '流程', '管理', '操作', '规程'],
            'patterns': [r'管理制度', r'操作规范', r'工作流程', r'管理规定'],
        },
        '规划文件': {
            'keywords': ['规划', '计划', '目标', '战略', '发展', '蓝图'],
            'patterns': [r'发展规划', r'五年规划', r'战略规划', r'工作计划'],
        },
        '会议记录': {
            'keywords': ['会议', '纪要', '讨论', '决议', '参会', '议题'],
            'patterns': [r'会议纪要', r'会议记录', r'会议纪要', r'讨论记录'],
        },
        '其他': {
            'keywords': [],
            'patterns': [],
        },
    }

    def classify(self, text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        对文本进行分类

        Args:
            text: 输入文本
            top_k: 返回最可能的 k 个类别
        """
        results = []

        for category, config in self.CATEGORIES.items():
            if category == '其他':
                continue

            score = 0
            matched_keywords = []

            # 关键词匹配
            for keyword in config['keywords']:
                if keyword in text:
                    score += 1
                    matched_keywords.append(keyword)

            # 模式匹配
            for pattern in config['patterns']:
                if re.search(pattern, text):
                    score += 3  # 模式匹配权重更高
                    matched_keywords.append(pattern)

            if score > 0:
                # 计算置信度
                confidence = min(0.95, 0.3 + (score / 10) * 0.65)
                results.append({
                    'category': category,
                    'confidence': confidence,
                    'score': score,
                    'keywords': matched_keywords
                })

        # 按分数排序
        results.sort(key=lambda x: x['score'], reverse=True)

        # 如果没有匹配任何类别，返回"其他"
        if not results:
            return [{
                'category': '其他',
                'confidence': 0.5,
                'score': 0,
                'keywords': []
            }]

        return results[:top_k]


# ============== 全局单例 ==============

_entity_extractor = None
_keyword_extractor = None
_classifier = None


def get_entity_extractor() -> ChineseEntityExtractor:
    global _entity_extractor
    if _entity_extractor is None:
        _entity_extractor = ChineseEntityExtractor()
    return _entity_extractor


def get_keyword_extractor() -> ChineseKeywordExtractor:
    global _keyword_extractor
    if _keyword_extractor is None:
        if not HAS_JIEBA:
            return None
        _keyword_extractor = ChineseKeywordExtractor()
    return _keyword_extractor


def get_classifier() -> ChineseTextClassifier:
    global _classifier
    if _classifier is None:
        _classifier = ChineseTextClassifier()
    return _classifier


# ============== API 接口 ==============

@app.post("/annotate", response_model=AnnotationResponse)
async def annotate(request: AnnotationRequest):
    """
    对文档内容进行自动标注

    Args:
        request: 包含 content 和 document_name

    Returns:
        实体、关键词、分类结果
    """
    print(f"\n=== 开始自动标注 ===")
    print(f"文档名：{request.document_name}")
    print(f"内容长度：{len(request.content)}")

    try:
        # 实体提取
        entity_extractor = get_entity_extractor()
        entities_raw = entity_extractor.extract(request.content)

        # 限制实体数量，每个类型最多 10 个
        entity_type_counts = {}
        filtered_entities = []
        for e in entities_raw:
            etype = e['type']
            entity_type_counts[etype] = entity_type_counts.get(etype, 0) + 1
            if entity_type_counts[etype] <= 10:
                filtered_entities.append({
                    'type': e['type'],
                    'value': e['value'],
                    'confidence': e['confidence'],
                    'location': e['type']  # 兼容前端字段
                })

        # 关键词提取
        keyword_extractor = get_keyword_extractor()
        if keyword_extractor:
            keywords_raw = keyword_extractor.extract(request.content, top_k=15)
            keywords = [{'keyword': k['keyword'], 'confidence': k['confidence']} for k in keywords_raw[:10]]
        else:
            keywords = []

        # 自动分类
        classifier = get_classifier()
        categories_raw = classifier.classify(request.content)
        categories = [{
            'category': c['category'],
            'confidence': c['confidence'],
            'keywords': c.get('keywords', [])
        } for c in categories_raw]

        print(f"提取实体：{len(filtered_entities)} 个")
        print(f"提取关键词：{len(keywords)} 个")
        print(f"分类结果：{categories[0]['category'] if categories else 'N/A'}")

        return AnnotationResponse(
            success=True,
            entities=filtered_entities,
            keywords=keywords,
            categories=categories
        )

    except Exception as e:
        print(f"标注失败：{e}")
        import traceback
        traceback.print_exc()

        return AnnotationResponse(
            success=False,
            entities=[],
            keywords=[],
            categories=[],
            error=str(e)
        )


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "timestamp": "2024-01-01T00:00:00Z",
        "capabilities": {
            "jieba": HAS_JIEBA,
            "hanlp": HAS_HANLP,
            "sklearn": HAS_SKLEARN,
            "entity_extraction": True,  # 规则匹配总是可用
            "keyword_extraction": HAS_JIEBA,
            "text_classification": True  # 规则分类总是可用
        }
    }


# ============== 启动服务 ==============

if __name__ == "__main__":
    print("=" * 50)
    print("AI Doctor NLP Annotator Service")
    print("=" * 50)
    print(f"jieba: {'已安装' if HAS_JIEBA else '未安装'}")
    print(f"hanlp: {'已安装' if HAS_HANLP else '未安装'}")
    print(f"sklearn: {'已安装' if HAS_SKLEARN else '未安装'}")
    print("=" * 50)
    print("\n启动服务：http://localhost:8002\n")

    uvicorn.run(app, host="0.0.0.0", port=8002)
