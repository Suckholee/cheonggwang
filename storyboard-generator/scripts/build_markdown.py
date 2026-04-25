#!/usr/bin/env python3
"""
build_markdown.py — Storyboard JSON → Markdown 보조 산출물

표준 템플릿은 references/output_formats.md 참고.
"""
from __future__ import annotations

import argparse
import json
import os
import sys


PLATFORM_KR = {
    "mobile_app": "모바일 앱",
    "responsive_web": "반응형 웹",
    "desktop_web": "데스크톱 웹",
    "multi": "모바일 + 웹",
}


def render(data: dict) -> str:
    out: list[str] = []
    meta = data.get("meta", {})

    # 표지
    out.append(f"# {meta.get('title','Storyboard')}")
    out.append("")
    metas = []
    metas.append(f"**Service**: {meta.get('service','-')}")
    metas.append(f"**Platform**: {PLATFORM_KR.get(meta.get('platform'), meta.get('platform','-'))}")
    metas.append(f"**Version**: {meta.get('version','-')}")
    metas.append(f"**Created**: {meta.get('created_at','-')}")
    if meta.get("author"):
        metas.append(f"**Author**: {meta['author']}")
    if meta.get("client"):
        metas.append(f"**Client**: {meta['client']}")
    if meta.get("purpose"):
        metas.append(f"**Purpose**: {meta['purpose']}")
    out.append("> " + " · ".join(metas))
    out.append("")

    # 개정 이력
    out.append("## 개정 이력")
    out.append("")
    history = data.get("revision_history", [])
    if history:
        out.append("| Version | Date | Author | Summary |")
        out.append("|---------|------|--------|---------|")
        for r in history:
            out.append(f"| {r.get('version','-')} | {r.get('date','-')} | {r.get('author','-')} | {r.get('summary','-')} |")
    else:
        out.append("(기록 없음)")
    out.append("")

    # IA
    ia = data.get("ia", {})
    out.append("## IA / Site Map")
    out.append("")
    cats = ia.get("categories", [])
    if cats:
        out.append("### 카테고리")
        out.append("")
        for c in cats:
            out.append(f"- **{c.get('name','-')}** (`{c.get('id','-')}`) — `{c.get('color','-')}`")
        out.append("")

    out.append("### 박스 트리")
    out.append("")
    boxes = ia.get("boxes", [])
    for b in boxes:
        prefix = "🔶 " if b.get("auto_filled") else ""
        out.append(f"- {prefix}**{b.get('id','?')}** — {b.get('title','')} `[{b.get('category','-')}]`")
        for it in (b.get("items") or []):
            out.append(f"  - {it.get('no','?')}. {it.get('label','')}")
            for sub in (it.get("subitems") or []):
                out.append(f"    - {sub}")
        for q in (b.get("open_questions") or []):
            out.append(f"  - 🔶 ※ {q}")
    out.append("")

    # 흐름
    conns = ia.get("connections", [])
    if conns:
        out.append("### 흐름")
        out.append("")
        out.append("```")
        for c in conns:
            label = f" ({c['label']})" if c.get("label") else ""
            arrow = "==>" if c.get("style") == "primary" else "-->" if c.get("style") == "dashed" else "->"
            out.append(f"{c.get('from','?')} {arrow}{label} {c.get('to','?')}")
        out.append("```")
        out.append("")

    # 화면 상세
    screens = data.get("screens", [])
    if screens:
        out.append("## 화면 상세")
        out.append("")
        for sc in screens:
            sec = ""
            if sc.get("section_no"):
                sec = f"{sc['section_no']}. "
            sec += sc.get("section_title", "와이어프레임 & 기능 디스크립션")
            out.append(f"### {sec} — {sc.get('title','')}")
            out.append("")
            out.append(f"**PATH**: {sc.get('path','-')}")
            out.append("")

            mm = sc.get("main_mockup", {})
            if mm.get("kind") == "image" and mm.get("path"):
                out.append(f"**메인 목업**: ![{sc.get('id','')}]({mm['path']})")
            else:
                out.append("**메인 목업**: (wireframe_svg fallback)")
            out.append("")

            if sc.get("function_descriptions"):
                out.append("#### Function Description")
                out.append("")
                for f in sc["function_descriptions"]:
                    out.append(f"| {f.get('marker','?')} | **{f.get('title','-')}** |")
                    out.append("|---|---|")
                    for ln in (f.get("lines") or []):
                        out.append(f"|  | • {ln} |")
                    out.append("")

            if sc.get("button_descriptions"):
                out.append("#### Button Description")
                out.append("")
                for b in sc["button_descriptions"]:
                    out.append(f"| {b.get('marker','?')} | **{b.get('title','-')}** |")
                    out.append("|---|---|")
                    for ln in (b.get("lines") or []):
                        out.append(f"|  | • {ln} |")
                    out.append("")

            if sc.get("component_states"):
                out.append("#### 컴포넌트 상태 변형")
                out.append("")
                for st in sc["component_states"]:
                    out.append(f"- {st.get('label', st.get('preset_id','-'))}")
                out.append("")

            if sc.get("validation_table"):
                out.append("#### Validation 메시지")
                out.append("")
                out.append("| 체크시점 | 조건 | 메시지 | 노출 유형 |")
                out.append("|---------|------|--------|-----------|")
                for r in sc["validation_table"]:
                    msg_parts = []
                    if r.get("message_title"):
                        msg_parts.append(f"▶ {r['message_title']}")
                    msg_parts.append(r.get("message", ""))
                    btns = r.get("message_buttons") or ([r["message_button"]] if r.get("message_button") else [])
                    if btns:
                        msg_parts.append("[" + "] [".join(btns) + "]")
                    msg = " / ".join(msg_parts).replace("|", "\\|").replace("\n", " ")
                    out.append(f"| {r.get('checkpoint','-')} | {r.get('condition','-')} | {msg} | {r.get('display','-')} |")
                out.append("")

            if sc.get("open_questions"):
                out.append("**Open Questions**:")
                for q in sc["open_questions"]:
                    out.append(f"- 🔶 {q}")
                out.append("")
            out.append("---")
            out.append("")

    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)
    md = render(data)
    os.makedirs(os.path.dirname(os.path.abspath(args.output)) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"Wrote Markdown: {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
