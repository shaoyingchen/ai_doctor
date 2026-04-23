from __future__ import annotations

from rag_pipeline.parsers.docx.docx_parser import DocxParser
from rag_pipeline.parsers.pdf.plaintext_pdf_parser import PlaintextPdfParser
from rag_pipeline.parsers.pdf.vision_layout_parser import VisionLayoutParser
from rag_pipeline.parsers.slides.pptx_parser import PptxParser
from rag_pipeline.parsers.spreadsheets.csv_parser import CsvParser
from rag_pipeline.parsers.spreadsheets.excel_parser import ExcelParser

PARSER_REGISTRY = {
    "plaintext": PlaintextPdfParser,
    "vision_layout": VisionLayoutParser,
    "docx_native": DocxParser,
    "pptx_native": PptxParser,
    "sheet_native": ExcelParser,
    "csv_native": CsvParser,
}


def build_parser(engine: str):
    parser_cls = PARSER_REGISTRY[engine]
    return parser_cls()
