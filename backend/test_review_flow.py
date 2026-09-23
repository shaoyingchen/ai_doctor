"""Step 3 人工审核流自测脚本：review 全链路 + rag_store 落盘持久化验证。

覆盖：
  1. 上传触发 end-to-end（RAG_REVIEW_QUALITY_THRESHOLD=99.0 强制所有 parse 进审核）
     -> /api/rag/state/{doc_id} 出现 waiting_review（progress 80 / Stage Review）
  2. GET /api/rag/review/{doc_id} -> 200（reviewReason / parseScore / previewChunks / pausedAtNode=enhance）
  3. GET 不存在 checkpoint 的 doc -> 404
  4. POST approve -> 轮询到 completed（成功路径：清理 checkpoint + upsert completed）
  5. approve 成功后二次 POST -> 404（checkpoint 已删除，防重复触发）
  6. 第二个文档 POST reject -> failed，errors 含 notes，checkpoint 保留 rejected；
     再次审核动作 -> 409
  7. retry（rejected doc）-> checkpoint 清理（GET review 404）-> 从头重跑
     -> 再次 waiting_review（阈值仍强制）
  8. 持久化：以子进程重新 import app（PipelineService 从 backend/data/rag_store/*.json
     加载），GET /api/rag/results/{doc_id} 的 stores.chunks/entities 仍非空。

注意：使用 `with TestClient(app) as client` 让 portal/事件循环在整段保持存活，
asyncio.create_task 启动的后台 RAG job 才能在轮询间隙持续推进
（裸 TestClient 每请求销毁事件循环会丢掉后台任务）。

运行（cwd=backend）：..\\.venv\\Scripts\\python.exe test_review_flow.py
"""

import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path

_HERE = Path(os.path.dirname(os.path.abspath(__file__)))
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

# 强制所有 parse 结果进入人工审核（任何 parse_quality_score < 99 恒真），
# 保证 waiting_review 分支确定性触发；必须在 import app 之前设置（模块级常量）。
os.environ["RAG_REVIEW_QUALITY_THRESHOLD"] = "99.0"

from fastapi.testclient import TestClient  # noqa: E402
from app import app  # noqa: E402

results: list[tuple[str, bool]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, bool(ok)))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))


SAMPLE_MD = """# 高血压健康管理

高血压是最常见的慢性病之一，也是心脑血管疾病最重要的危险因素。

主要危险因素包括：超重或肥胖、高钠低钾膳食、长期精神紧张、吸烟饮酒等。

诊断标准：非同日三次测量收缩压≥140mmHg 或舒张压≥90mmHg 即可诊断。

生活方式干预：限盐（每日<5g）、控制体重、规律运动、戒烟限酒、保持心态平和。

药物治疗原则：从小剂量开始，优先选择长效制剂，联合用药，个体化治疗。

常见一线降压药包括钙通道阻滞剂、血管紧张素转换酶抑制剂、血管紧张素II受体拮抗剂、利尿剂、β受体阻滞剂五大类。

规律随访：血压控制达标后应坚持长期服药，定期复查，监测靶器官损害。
"""


def _upload(client: TestClient, doc_id: str, content: str = SAMPLE_MD) -> object:
    """上传触发后台 end-to-end（阈值 99 强制进审核）。"""
    return client.post(
        "/api/rag/end-to-end-file",
        files={"file": (f"{doc_id}.md", content.encode("utf-8"), "text/markdown")},
        data={"docId": doc_id, "knowledgeBaseId": "kb-1"},
    )


def wait_for_status(
    client: TestClient,
    doc_id: str,
    want: set[str],
    timeout: float = 120.0,
    interval: float = 0.3,
) -> dict | None:
    """轮询 /api/rag/state/{doc_id} 直到 status 命中 want；返回最后一个 state。"""
    deadline = time.time() + timeout
    last: dict | None = None
    while time.time() < deadline:
        try:
            resp = client.get(f"/api/rag/state/{doc_id}")
            if resp.status_code == 200:
                last = resp.json().get("item")
                if last and last.get("status") in want:
                    return last
        except Exception:
            pass
        time.sleep(interval)
    return last


def run_approve_flow(client: TestClient) -> str:
    """上传 doc1 -> waiting_review -> GET 200 -> approve -> completed，返回 doc_id。"""
    doc_id = f"review-ok-{uuid.uuid4().hex[:10]}"
    resp = _upload(client, doc_id)
    check("upload accepted", resp.status_code == 200 and resp.json().get("accepted") is True,
          f"got {resp.status_code}: {resp.text[:200]}")

    state = wait_for_status(client, doc_id, {"waiting_review"})
    check("doc reaches waiting_review", state is not None and state.get("status") == "waiting_review",
          json.dumps(state, ensure_ascii=False)[:200])
    if state:
        check("waiting_review progress 80 + stage Review",
              state.get("progress") == 80 and state.get("currentStage") == "Review",
              f"progress={state.get('progress')} stage={state.get('currentStage')}")

    resp = client.get(f"/api/rag/review/{doc_id}")
    check("GET review 200", resp.status_code == 200, f"got {resp.status_code}: {resp.text[:200]}")
    review = resp.json() if resp.status_code == 200 else {}
    check("review reason non-empty", bool(review.get("reviewReason")),
          json.dumps(review, ensure_ascii=False)[:160])
    check("review parseScore is number",
          isinstance(review.get("parseScore"), (int, float)) and not isinstance(review.get("parseScore"), bool),
          f"parseScore={review.get('parseScore')}")
    check("review pausedAtNode == enhance", review.get("pausedAtNode") == "enhance",
          f"= {review.get('pausedAtNode')}")
    check("review has previewChunks list", isinstance(review.get("previewChunks"), list),
          f"preview count={len(review.get('previewChunks') or [])}")

    resp404 = client.get("/api/rag/review/definitely-not-a-real-review-doc-404")
    check("GET review 404 for unknown doc", resp404.status_code == 404, f"got {resp404.status_code}")

    resp = client.post(f"/api/rag/review/{doc_id}", json={"action": "approve"})
    check("POST approve 200", resp.status_code == 200, f"got {resp.status_code}: {resp.text[:200]}")

    state = wait_for_status(client, doc_id, {"completed", "failed"})
    check("doc completes after approve", state is not None and state.get("status") == "completed",
          json.dumps(state, ensure_ascii=False)[:200])

    resp2 = client.post(f"/api/rag/review/{doc_id}", json={"action": "approve"})
    check("second approve rejected (checkpoint removed -> 404)",
          resp2.status_code == 404, f"got {resp2.status_code}: {resp2.text[:120]}")
    return doc_id


def run_reject_flow(client: TestClient) -> str:
    """上传 doc2 -> waiting_review -> reject -> failed，返回 doc_id。"""
    doc_id = f"review-reject-{uuid.uuid4().hex[:10]}"
    resp = _upload(client, doc_id)
    check("upload(2) accepted", resp.status_code == 200, f"got {resp.status_code}: {resp.text[:200]}")

    state = wait_for_status(client, doc_id, {"waiting_review"})
    check("doc2 reaches waiting_review", state is not None and state.get("status") == "waiting_review",
          json.dumps(state, ensure_ascii=False)[:200])

    notes = "测试驳回：解析内容质量不达标"
    resp = client.post(f"/api/rag/review/{doc_id}", json={"action": "reject", "notes": notes})
    check("POST reject 200", resp.status_code == 200, f"got {resp.status_code}: {resp.text[:200]}")
    body = resp.json() if resp.status_code == 200 else {}
    state = body.get("state", {})
    check("reject state -> failed", state.get("status") == "failed",
          json.dumps(state, ensure_ascii=False)[:200])
    err_text = json.dumps(state.get("errors", []), ensure_ascii=False)
    check("reject errors contain notes", notes in err_text, err_text[:200])

    resp = client.get(f"/api/rag/review/{doc_id}")
    check("checkpoint kept as rejected", resp.status_code == 200 and resp.json().get("status") == "rejected",
          f"got {resp.status_code}: {resp.text[:160]}")

    resp = client.post(f"/api/rag/review/{doc_id}", json={"action": "reject", "notes": "again"})
    check("re-review blocked with 409", resp.status_code == 409, f"got {resp.status_code}")
    return doc_id


def run_retry_flow(client: TestClient, rejected_doc_id: str) -> None:
    """retry rejected doc：checkpoint 清理 -> 从头重跑 -> 再次 waiting_review，收尾 reject。"""
    resp = client.post(f"/api/rag/retry/{rejected_doc_id}")
    check("retry accepted", resp.status_code == 200, f"got {resp.status_code}: {resp.text[:200]}")

    resp = client.get(f"/api/rag/review/{rejected_doc_id}")
    check("checkpoint cleared on retry (GET review 404)",
          resp.status_code == 404, f"got {resp.status_code}: {resp.text[:120]}")

    state = wait_for_status(client, rejected_doc_id, {"waiting_review"})
    check("doc re-enters waiting_review after retry",
          state is not None and state.get("status") == "waiting_review",
          json.dumps(state, ensure_ascii=False)[:200])

    resp = client.post(f"/api/rag/review/{rejected_doc_id}", json={"action": "reject", "notes": "test cleanup"})
    check("cleanup reject ok", resp.status_code == 200, f"got {resp.status_code}: {resp.text[:120]}")


def run_verify_persist(doc_id: str) -> None:
    """新进程模式：重新 import app（PipelineService 从 rag_store 加载），
    验证 GET /api/rag/results/{doc_id} 的 stores 字段仍有数据（落盘生效）。"""
    client = TestClient(app)
    resp = client.get(f"/api/rag/results/{doc_id}")
    if resp.status_code != 200:
        print(f"[FAIL] persist results endpoint - got {resp.status_code}: {resp.text[:200]}")
        sys.exit(1)
    stores = resp.json().get("stores", {})
    chunks = stores.get("chunks")
    entities = stores.get("entities")
    relations = stores.get("relations")
    chunks_ok = isinstance(chunks, list) and len(chunks) > 0
    graph_ok = isinstance(entities, list) and len(entities) > 0
    if chunks_ok:
        print(f"[PASS] persist-chunks loaded in new process, count={len(chunks)}")
    else:
        print(f"[FAIL] persist-chunks empty in new process, stores={json.dumps(stores, ensure_ascii=False)[:300]}")
    if graph_ok:
        print(f"[PASS] persist-graph loaded in new process, entities={len(entities)} relations={len(relations) if isinstance(relations, list) else 0}")
    else:
        print(f"[FAIL] persist-graph empty in new process, stores={json.dumps(stores, ensure_ascii=False)[:300]}")
    sys.exit(0 if (chunks_ok and graph_ok) else 1)


def run_persist_verify_subprocess(approved_doc_id: str) -> None:
    """父进程侧：起子进程（新解释器 + 新 app 实例）验证 rag_store 落盘。"""
    script = os.path.abspath(__file__)
    try:
        proc = subprocess.run(
            [sys.executable, script, "verify-persist", approved_doc_id],
            cwd=str(_HERE),
            capture_output=True,
            text=True,
            timeout=180,
        )
    except Exception as exc:
        check("persist subprocess ran", False, str(exc))
        return
    frame = (proc.stdout or "") + "\n--- stderr ---\n" + (proc.stderr or "")
    check("persist verify subprocess exit 0", proc.returncode == 0, frame[-600:])
    check("persist chunks loaded in new process",
          "[PASS] persist-chunks loaded in new process" in frame, frame[-400:])
    check("persist graph loaded in new process",
          "[PASS] persist-graph loaded in new process" in frame, frame[-400:])


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "verify-persist":
        run_verify_persist(sys.argv[2])
        return

    # 必须 with：portal 事件循环常驻，asyncio.create_task 后台 RAG job 才能推进
    with TestClient(app) as client:
        ok_doc_id = run_approve_flow(client)
        rejected_doc_id = run_reject_flow(client)
        run_retry_flow(client, rejected_doc_id)
        run_persist_verify_subprocess(ok_doc_id)

    failed = [name for name, ok in results if not ok]
    print()
    if failed:
        print(f"共 {len(results)} 项检查，失败 {len(failed)} 项: {failed}")
        sys.exit(1)
    print(f"全部 {len(results)} 项检查通过")


if __name__ == "__main__":
    main()