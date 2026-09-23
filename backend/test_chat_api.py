"""Step 2 自测脚本：POST /api/chat（非流式 + SSE 流式）、/api/kb/tree documentCount、/api/health。

使用 fastapi.testclient.TestClient（不起真实服务器）。
运行（cwd=backend）：../.venv/Scripts/python.exe test_chat_api.py
"""

import json
import sys

from fastapi.testclient import TestClient

from app import app

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))


def main():
    client = TestClient(app)
    payload = {
        "message": "高血压的一线用药有哪些",
        "history": [],
        "mode": "qa",
        "kbIds": [],
    }

    # 1. 非流式
    resp = client.post("/api/chat", json={**payload, "stream": False})
    check("non-stream status 200", resp.status_code == 200, f"got {resp.status_code}: {resp.text[:200]}")
    if resp.status_code == 200:
        data = resp.json()
        answer = data.get("answer")
        sources = data.get("sources")
        check("non-stream has answer", isinstance(answer, str) and answer.strip(),
              f"answer 前80字: {str(answer)[:80]}")
        check("non-stream has sources list", isinstance(sources, list),
              f"sources 数量: {len(sources) if isinstance(sources, list) else 'N/A'}")
        if isinstance(sources, list) and sources:
            s0 = sources[0]
            keys_ok = all(k in s0 for k in ("docId", "filename", "chunkIndex", "score", "excerpt"))
            # score 已归一化到 0~1（build_sources 除 100 并 clamp）
            score_val = s0.get("score")
            score_ok = isinstance(score_val, (int, float)) and 0.0 <= score_val <= 1.0
            check("sources item keys ok & score in [0,1]", keys_ok and score_ok,
                  json.dumps(s0, ensure_ascii=False)[:160])

    # 2. SSE 流式
    resp2 = client.post("/api/chat", json={**payload, "stream": True})
    check("stream status 200", resp2.status_code == 200, f"got {resp2.status_code}: {resp2.text[:200]}")
    if resp2.status_code == 200:
        ctype = resp2.headers.get("content-type", "")
        check("stream content-type is event-stream", ctype.startswith("text/event-stream"), ctype)
        events = []
        for line in resp2.text.splitlines():
            line = line.strip()
            if line.startswith("data:"):
                try:
                    events.append(json.loads(line[len("data:"):].strip()))
                except json.JSONDecodeError:
                    pass
        types = [e.get("type") for e in events]
        # Step 3 CRAG 可能新增 {"type":"status"} 事件（仅重检索时，位于 sources 之前）。
        # 主干序列校验过滤 status 事件后进行，兼容两种路径。
        core_types = [t for t in types if t != "status"]
        check("stream first core event is sources", bool(core_types) and core_types[0] == "sources",
              f"事件序列: {types[:6]}（共 {len(types)} 个）")
        check("stream has >=1 token event", core_types.count("token") >= 1,
              f"token 数: {core_types.count('token')}")
        check("stream last event is done", bool(types) and types[-1] == "done")
        # status 事件（若存在）必须位于 sources 之前
        if "status" in types:
            check("status event precedes sources",
                  types.index("status") < types.index("sources"),
                  f"事件序列: {types[:6]}")
            status_evt = next(e for e in events if e.get("type") == "status")
            check("status event has message", bool(status_evt.get("message")),
                  json.dumps(status_evt, ensure_ascii=False))
        token_text = "".join(e.get("content", "") for e in events if e.get("type") == "token")
        check("token text non-empty", bool(token_text.strip()), f"拼接后前80字: {token_text[:80]}")

    # 2b. SSE 弱查询（不存在知识库 -> 检索为空 -> 必触发 CRAG 重检索 -> 出现 status 事件）
    resp2b = client.post("/api/chat", json={
        **payload,
        "message": "阿莫西林剂量",
        "kbIds": ["__nonexistent_kb__"],
        "stream": True,
    })
    check("weak-query stream status 200", resp2b.status_code == 200,
          f"got {resp2b.status_code}: {resp2b.text[:200]}")
    if resp2b.status_code == 200:
        events_b = []
        for line in resp2b.text.splitlines():
            line = line.strip()
            if line.startswith("data:"):
                try:
                    events_b.append(json.loads(line[len("data:"):].strip()))
                except json.JSONDecodeError:
                    pass
        types_b = [e.get("type") for e in events_b]
        check("weak-query emits status event (CRAG rewrite)",
              "status" in types_b, f"事件序列: {types_b[:6]}")
        if "status" in types_b and "sources" in types_b:
            check("weak-query status precedes sources",
                  types_b.index("status") < types_b.index("sources"))
            check("weak-query sources is empty list",
                  any(e.get("type") == "sources" and e.get("sources") == [] for e in events_b),
                  f"sources 事件: {[e for e in events_b if e.get('type') == 'sources'][:1]}")

    # 3. /api/kb/tree documentCount
    resp3 = client.get("/api/kb/tree")
    check("kb tree status 200", resp3.status_code == 200)
    if resp3.status_code == 200:
        kbs = resp3.json().get("knowledgeBases", [])
        check("kb nodes all have documentCount", all("documentCount" in kb for kb in kbs),
              ", ".join(f"{kb.get('name')}={kb.get('documentCount')}" for kb in kbs) or "（无 kb 节点）")

    # 4. /api/health services.chat
    resp4 = client.get("/api/health")
    check("api health status 200", resp4.status_code == 200)
    if resp4.status_code == 200:
        services = resp4.json().get("services", {})
        check("health services contains chat", "chat" in services,
              json.dumps(services, ensure_ascii=False))

    failed = [n for n, ok in results if not ok]
    print()
    if failed:
        print(f"共 {len(results)} 项检查，失败 {len(failed)} 项: {failed}")
        sys.exit(1)
    print(f"全部 {len(results)} 项检查通过")


if __name__ == "__main__":
    main()
