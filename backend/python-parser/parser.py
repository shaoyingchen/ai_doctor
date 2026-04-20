"""
AI Doctor - Document Parser Service
支持 PDF、DOCX、MD、TXT 文档解析
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel

# 尝试导入 PDF 库，如果不存在则提供友好提示
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    print("警告：PyMuPDF 未安装，PDF 解析功能将不可用")
    print("安装：pip install pymupdf")

try:
    from python_docx import Document as DocxDocument
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False
    print("警告：python-docx 未安装，DOCX 解析功能将不可用")
    print("安装：pip install python-docx")

try:
    import chardet
    HAS_CHARDET = True
except ImportError:
    HAS_CHARDET = False
    print("警告：chardet 未安装，将使用 UTF-8 默认编码")
    print("安装：pip install chardet")

# FastAPI 应用
app = FastAPI(title="AI Doctor Parser Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== 数据类型 ==============

class ChunkData(BaseModel):
    text: str
    metadata: Dict[str, Any]
    start_page: Optional[int] = None
    end_page: Optional[int] = None


class ParseResult(BaseModel):
    content: str
    chunks: List[ChunkData]
    metadata: Dict[str, Any]
    success: bool
    error: Optional[str] = None


# ============== PDF 解析 ==============

def detect_pdf_type(pdf_path: str) -> str:
    """
    检测 PDF 类型：文字型或扫描件
    """
    if not HAS_PYMUPDF:
        raise ImportError("PyMuPDF 未安装")

    with fitz.open(pdf_path) as doc:
        if len(doc) == 0:
            return "empty"

        page = doc[0]
        text_blocks = page.get_text("blocks")
        images = page.get_images()

        # 计算文字密度
        text_chars = sum(len(block.get("text", "")) for block in text_blocks) if text_blocks else 0

        # 判断逻辑：
        # 1. 文字很少 + 图片多 = 扫描件
        # 2. 文字密度低 = 可能是扫描件
        if text_chars < 100 and len(images) > 0:
            return "scan"
        elif text_chars < 50:
            return "scan"
        else:
            return "text"


def extract_tables_from_pdf(page) -> List[Dict[str, Any]]:
    """
    从 PDF 页面提取表格
    """
    tables = []
    try:
        # 使用 pymupdf4llm 或 fitz 的表格检测
        # 这里使用简单的基于线的检测
        page_dict = page.get_text("dict")
        # 实际项目中推荐使用 pdfplumber
    except Exception as e:
        print(f"表格提取失败：{e}")
    return tables


def parse_pdf_text(pdf_path: str) -> Dict[str, Any]:
    """
    解析文字型 PDF
    """
    if not HAS_PYMUPDF:
        raise ImportError("PyMuPDF 未安装")

    content_parts = []
    chunks = []
    metadata = {
        "page_count": 0,
        "has_tables": False,
        "is_scanned": False,
    }

    with fitz.open(pdf_path) as doc:
        metadata["page_count"] = len(doc)
        metadata["title"] = doc.metadata.get("title", "")
        metadata["author"] = doc.metadata.get("author", "")

        current_chunk = []
        current_chunk_length = 0
        CHUNK_SIZE = 500  # 每个 chunk 约 500 字

        for page_num, page in enumerate(doc):
            # 提取文字
            text = page.get_text("text")

            # 过滤页眉页脚（简单 heuristic：短行在页面顶部/底部）
            lines = text.split("\n")
            filtered_lines = []
            for line in lines:
                line = line.strip()
                if len(line) > 2:  # 过滤太短的行
                    filtered_lines.append(line)

            page_text = "\n".join(filtered_lines)
            content_parts.append(page_text)

            # 分块
            for line in filtered_lines:
                current_chunk.append(line)
                current_chunk_length += len(line)

                if current_chunk_length >= CHUNK_SIZE:
                    chunks.append({
                        "text": "\n".join(current_chunk),
                        "metadata": {
                            "start_page": page_num + 1,
                            "end_page": page_num + 1,
                            "chunk_type": "text"
                        }
                    })
                    current_chunk = []
                    current_chunk_length = 0

            # 检测表格
            # tables = extract_tables_from_pdf(page)
            # if tables:
            #     metadata["has_tables"] = True

        # 添加最后一个 chunk
        if current_chunk:
            chunks.append({
                "text": "\n".join(current_chunk),
                "metadata": {
                    "start_page": len(doc),
                    "end_page": len(doc),
                    "chunk_type": "text"
                }
            })

    return {
        "content": "\n\n".join(content_parts),
        "chunks": chunks,
        "metadata": metadata
    }


def parse_pdf_scan(pdf_path: str) -> Dict[str, Any]:
    """
    解析扫描件 PDF（需要 OCR）
    """
    # TODO: 集成 PaddleOCR
    # 目前返回占位结果
    return {
        "content": "[OCR 解析功能待实现]",
        "chunks": [{
            "text": "[OCR 解析功能待实现 - 需要安装 PaddleOCR]",
            "metadata": {"chunk_type": "ocr_placeholder"}
        }],
        "metadata": {
            "page_count": 0,
            "is_scanned": True,
            "ocr_required": True
        }
    }


def parse_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    PDF 解析入口
    """
    try:
        pdf_type = detect_pdf_type(pdf_path)

        if pdf_type == "scan":
            print(f"检测到扫描件 PDF，将使用 OCR: {pdf_path}")
            return parse_pdf_scan(pdf_path)
        elif pdf_type == "text":
            return parse_pdf_text(pdf_path)
        else:
            return {
                "content": "",
                "chunks": [],
                "metadata": {"error": "空文档或无法识别的 PDF"}
            }

    except Exception as e:
        raise Exception(f"PDF 解析失败：{str(e)}")


# ============== DOCX 解析 ==============

def parse_docx(docx_path: str) -> Dict[str, Any]:
    """
    解析 DOCX 文档
    """
    if not HAS_DOCX:
        raise ImportError("python-docx 未安装")

    doc = DocxDocument(docx_path)
    content_parts = []
    chunks = []
    metadata = {
        "paragraph_count": 0,
        "word_count": 0,
    }

    current_chunk = []
    current_chunk_length = 0
    CHUNK_SIZE = 500

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        content_parts.append(text)
        metadata["paragraph_count"] += 1

        # 简单分词计数
        words = len(text)
        metadata["word_count"] += words

        current_chunk.append(text)
        current_chunk_length += words

        if current_chunk_length >= CHUNK_SIZE:
            chunks.append({
                "text": "\n".join(current_chunk),
                "metadata": {"chunk_type": "paragraph"}
            })
            current_chunk = []
            current_chunk_length = 0

    # 添加最后一个 chunk
    if current_chunk:
        chunks.append({
            "text": "\n".join(current_chunk),
            "metadata": {"chunk_type": "paragraph"}
        })

    return {
        "content": "\n\n".join(content_parts),
        "chunks": chunks,
        "metadata": metadata
    }


# ============== MD/TXT 解析 ==============

def detect_encoding(file_path: str) -> str:
    """
    检测文件编码
    """
    if not HAS_CHARDET:
        return "utf-8"

    with open(file_path, "rb") as f:
        result = chardet.detect(f.read(10000))
        return result["encoding"] or "utf-8"


def parse_text_file(file_path: str) -> Dict[str, Any]:
    """
    解析纯文本文件（MD/TXT）
    """
    encoding = detect_encoding(file_path)

    try:
        with open(file_path, "r", encoding=encoding) as f:
            content = f.read()
    except UnicodeDecodeError:
        # 备用编码
        with open(file_path, "r", encoding="gbk") as f:
            content = f.read()

    # 按段落分块
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]

    chunks = []
    current_chunk = []
    current_chunk_length = 0
    CHUNK_SIZE = 500

    for para in paragraphs:
        current_chunk.append(para)
        current_chunk_length += len(para)

        if current_chunk_length >= CHUNK_SIZE:
            chunks.append({
                "text": "\n\n".join(current_chunk),
                "metadata": {"chunk_type": "paragraphs"}
            })
            current_chunk = []
            current_chunk_length = 0

    if current_chunk:
        chunks.append({
            "text": "\n\n".join(current_chunk),
            "metadata": {"chunk_type": "paragraphs"}
        })

    # 提取 MD 元数据（如果有 YAML front matter）
    metadata = {}
    if file_path.endswith(".md"):
        frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
        if frontmatter_match:
            metadata["frontmatter"] = frontmatter_match.group(1)

    return {
        "content": content,
        "chunks": chunks,
        "metadata": metadata
    }


# ============== 主解析接口 ==============

@app.post("/parse")
async def parse_document(
    file: UploadFile = File(...),
    ext: str = Form(...),
    task_id: str = Form(...)
):
    """
    解析文档

    Args:
        file: 上传的文件
        ext: 文件扩展名（如 .pdf）
        task_id: 任务 ID

    Returns:
        解析结果 JSON
    """
    print(f"\n=== 开始解析文档 ===")
    print(f"任务 ID: {task_id}")
    print(f"文件名：{file.filename}")
    print(f"扩展名：{ext}")

    try:
        # 保存临时文件
        temp_path = f"/tmp/{task_id}_{file.filename}"
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        print(f"临时文件已保存：{temp_path}")

        # 根据扩展名选择解析器
        ext = ext.lower()

        if ext == ".pdf":
            result = parse_pdf(temp_path)
        elif ext in [".docx", ".doc"]:
            if ext == ".doc":
                print("警告：.doc 格式需要额外转换，建议保存为.docx")
            result = parse_docx(temp_path)
        elif ext in [".md", ".txt"]:
            result = parse_text_file(temp_path)
        else:
            raise HTTPException(status_code=400, detail=f"不支持的文件格式：{ext}")

        # 清理临时文件
        os.remove(temp_path)

        print(f"解析成功：{len(result['content'])} 字符，{len(result['chunks'])} 个分块")

        return JSONResponse(content={
            "success": True,
            **result
        })

    except ImportError as e:
        print(f"依赖缺失：{e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"解析器依赖缺失：{str(e)}",
                "content": "",
                "chunks": [],
                "metadata": {}
            }
        )

    except Exception as e:
        print(f"解析失败：{e}")
        import traceback
        traceback.print_exc()

        # 清理临时文件
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "content": "",
                "chunks": [],
                "metadata": {}
            }
        )


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "capabilities": {
            "pymupdf": HAS_PYMUPDF,
            "docx": HAS_DOCX,
            "chardet": HAS_CHARDET
        }
    }


# ============== 启动服务 ==============

if __name__ == "__main__":
    print("=" * 50)
    print("AI Doctor Parser Service")
    print("=" * 50)
    print(f"PyMuPDF: {'已安装' if HAS_PYMUPDF else '未安装'}")
    print(f"python-docx: {'已安装' if HAS_DOCX else '未安装'}")
    print(f"chardet: {'已安装' if HAS_CHARDET else '未安装'}")
    print("=" * 50)
    print("\n启动服务：http://localhost:8001\n")

    uvicorn.run(app, host="0.0.0.0", port=8001)
