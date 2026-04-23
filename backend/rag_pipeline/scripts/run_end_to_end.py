from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from rag_pipeline.services.pipeline_service import PipelineService
from rag_pipeline.utils.mime import guess_content_type


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--doc-id", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--filename", required=False, help="Optional. If omitted, inferred from --source path.")
    args = parser.parse_args()

    source = Path(args.source)
    filename = args.filename or source.name

    svc = PipelineService()
    result = svc.run_end_to_end(
        {
            "doc_id": args.doc_id,
            "source_uri": str(source),
            "filename": filename,
            "content_type": guess_content_type(filename),
            "parser_preferences": {},
        }
    )
    print(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
