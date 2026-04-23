# rag_pipeline

Minimal runnable document parse and enhancement scaffold.

## Requirements

- Python 3.11+
- `pytest`

## Install (editable)

```bash
python3 -m pip install -e .
```

## Run parse only

```bash
python3 scripts/run_parse.py --doc-id doc_1 --source sample.txt
python3 scripts/run_parse.py --doc-id doc_2 --source sample.pdf
python3 scripts/run_parse.py --doc-id doc_3 --source path/to/sample.docx
python3 scripts/run_parse.py --doc-id doc_4 --source path/to/sample.pptx
python3 scripts/run_parse.py --doc-id doc_5 --source path/to/sample.xlsx
python3 scripts/run_parse.py --doc-id doc_6 --source path/to/sample.csv
```

## Run end-to-end

```bash
python3 scripts/run_end_to_end.py --doc-id doc_3 --source sample.txt
```

## Run tests

```bash
pytest -q tests
```

## Stage 1 status

- Parse path implemented with `ParseGraph` (StateGraph orchestration):
  `ingest_document -> inspect -> select_strategy -> parse_pdf -> normalize_blocks -> parse_quality_gate -> build_chunks -> write_doc_store`
- `PlaintextPdfParser` supports:
  - `.txt` direct decode
  - basic text PDF extraction (`pypdf` when available, regex fallback)
  - bytes decode fallback when PDF extraction fails
- InMemory stores are written in parse and end-to-end flow.

## Stage 2 status

- Supported file types now include:
  - txt
  - pdf
  - docx/doc
  - pptx/ppt
  - xlsx/xls
  - csv
- ParseGraph routes by extension via `route_by_file_type()`:
  - doc/docx -> `parse_docx`
  - ppt/pptx -> `parse_slides`
  - xls/xlsx/csv -> `parse_spreadsheet`
  - others/pdf -> `parse_pdf`
- All parser outputs are normalized through the same `normalize_blocks` schema before chunking.
- Chunk strategies:
  - `presentation`: one slide/page to one chunk
  - `table`: one sheet/table-page to one chunk

## Stage 3 updates (current)

- Manual strategy now builds `section_path` by heading hierarchy (`normalization/section_builder.py`).
- Parse quality gate now scores with four metrics (`normalization/quality_gate.py`):
  - block count
  - text coverage
  - empty text rate
  - page coverage
- Automatic fallback is enabled:
  - when `vision_layout` parse quality is poor, pipeline retries with `plaintext`
  - fallback trace is written into `errors` and block/doc metadata

## Stage 4 updates (current)

- `EnhanceIndexGraph` now runs the minimal enhancement loop:
  - load chunks
  - classify chunks
  - extract keywords
  - extract entities
  - summarize
  - embed chunks (stub embedder)
  - write vector store
  - write graph store
  - write enhanced chunks back to doc store
- Chunk-level enhancement fields now include:
  - `usage_tag`
  - `content_category`
  - `classification_confidence`
  - `keywords`
  - `entity_ids`
  - `summary`

## Stage 5 updates (current)

- QA routing is now explicit:
  - only chunks with `usage_tag == qa_candidate` enter QA generation
  - context-only chunks skip QA
- QA output is template/rule-based and stable:
  - one original question per eligible chunk
  - two question variants per QA (colloquial + formal style)
- `chunk_id` linkage is preserved in both:
  - `qa_pairs[*].chunk_id`
  - `question_variants[*].chunk_id`
