#!/usr/bin/env python3
"""
generate_ia_diagram.py — Storyboard JSON에서 IA(사이트맵) 다이어그램 SVG를 생성한다.

사용법:
    python generate_ia_diagram.py --input storyboard.json --output assets/ia.svg

박스(노드) + 항목 리스트 + 화살표 + 카테고리 색상 + 빨간 메모(open_questions) +
범례를 포함한 단일 SVG 한 장을 출력한다. 자세한 시각 규약은
references/ia_diagram_spec.md 참고.

표준 라이브러리만 사용 (no deps).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from html import escape
from typing import Any

# ---------------------------------------------------------------------------
# 캔버스 / 토큰
# ---------------------------------------------------------------------------
CANVAS_W = 1920
CANVAS_H = 1080
PADDING_X = 80
PADDING_Y = 100   # 상단은 범례·제목용 여유

BOX_W = 240
BOX_HEADER_H = 28
ITEM_H = 22
SUB_H = 18
BOX_PAD_Y = 8
BOX_GAP_X = 60
BOX_GAP_Y = 40
ROUND = 4

DEFAULT_PALETTE = {
    "auth":    "#F59E0B",
    "main":    "#FACC15",
    "extra":   "#9CA3AF",
    "config":  "#94A3B8",
    "admin":   "#DC2626",
    "billing": "#2563EB",
    "content": "#14B8A6",
}

COLOR_BORDER = "#94A3B8"
COLOR_TEXT = "#111827"
COLOR_TEXT_MUTED = "#6B7280"
COLOR_BG = "#FFFFFF"
COLOR_OPEN_Q = "#DC2626"
COLOR_ARROW_PRIMARY = "#1F2937"
COLOR_ARROW_SECONDARY = "#6B7280"


# ---------------------------------------------------------------------------
# 헬퍼
# ---------------------------------------------------------------------------
def _esc(s: Any) -> str:
    return escape(str(s) if s is not None else "")


def _rect(x, y, w, h, *, fill=COLOR_BG, stroke=COLOR_BORDER, sw=1, rx=0, dash=None) -> str:
    dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
    return (
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
        f'rx="{rx}" ry="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{dash_attr}/>'
    )


def _text(x, y, s, *, size=12, fill=COLOR_TEXT, anchor="start", weight="normal") -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="-apple-system, Apple SD Gothic Neo, '
        f'Segoe UI, Noto Sans KR, sans-serif" font-size="{size}" fill="{fill}" '
        f'text-anchor="{anchor}" font-weight="{weight}">{_esc(s)}</text>'
    )


def _arrow_marker_def() -> str:
    """SVG <defs>에 들어갈 화살촉 정의."""
    return f'''<defs>
  <marker id="arrowhead-primary" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="{COLOR_ARROW_PRIMARY}"/>
  </marker>
  <marker id="arrowhead-secondary" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="{COLOR_ARROW_SECONDARY}"/>
  </marker>
</defs>'''


# ---------------------------------------------------------------------------
# 박스 크기 계산
# ---------------------------------------------------------------------------
@dataclass
class BoxRender:
    """박스 한 개의 계산된 렌더 정보."""
    box: dict
    x: float = 0
    y: float = 0
    w: float = BOX_W
    h: float = 0
    items_height: float = 0
    open_q_height: float = 0


def measure_box(box: dict) -> BoxRender:
    """박스 높이를 항목 수에 따라 계산."""
    items = box.get("items", [])
    items_h = 0
    for item in items:
        items_h += ITEM_H
        for _ in item.get("subitems", []) or []:
            items_h += SUB_H

    open_qs = box.get("open_questions", []) or []
    # 빨간 메모: 한 개당 약 36px (최소). 텍스트 길이에 따라 줄바꿈으로 늘어남 — 단순화: 1개당 32px + 줄당 +14
    open_h = 0
    for q in open_qs:
        # 평균 32자 = 1줄, 그 이상은 추가 줄로
        chars = len(str(q))
        lines = max(1, (chars // 22) + (1 if chars % 22 else 0))
        open_h += 14 * lines + 8  # 8 = 마진
    if open_qs:
        open_h += 8  # 박스 안 분리 마진

    total_h = BOX_HEADER_H + BOX_PAD_Y * 2 + items_h + open_h
    total_h = max(total_h, 80)

    return BoxRender(box=box, h=total_h, items_height=items_h, open_q_height=open_h)


# ---------------------------------------------------------------------------
# 자동 배치 (그리드)
# ---------------------------------------------------------------------------
def auto_layout(boxes: list[dict], connections: list[dict]) -> dict[str, tuple[int, int]]:
    """
    각 박스의 (col, row)를 결정한다.
    1) box.row/col이 명시되어 있으면 우선 사용.
    2) 명시되지 않은 박스는 카테고리별로 col 그룹핑 + 연결 깊이로 col 추정.
    """
    placement: dict[str, tuple[int, int]] = {}
    fixed: dict[str, tuple[int, int]] = {}

    for b in boxes:
        if "col" in b and "row" in b:
            fixed[b["id"]] = (int(b["col"]), int(b["row"]))

    placement.update(fixed)

    # 미배치 박스: 연결 그래프에서 깊이 계산
    box_ids = {b["id"] for b in boxes}
    incoming: dict[str, list[str]] = {bid: [] for bid in box_ids}
    outgoing: dict[str, list[str]] = {bid: [] for bid in box_ids}
    for c in connections:
        f, t = c.get("from"), c.get("to")
        if f in box_ids and t in box_ids:
            outgoing[f].append(t)
            incoming[t].append(f)

    # 진입점: incoming이 비거나 fixed에 있는 박스
    depth: dict[str, int] = {}

    def compute_depth(bid: str, seen: set[str]) -> int:
        if bid in depth:
            return depth[bid]
        if bid in seen:
            return 0
        seen = seen | {bid}
        if not incoming[bid]:
            depth[bid] = 0
        else:
            depth[bid] = max(compute_depth(p, seen) for p in incoming[bid]) + 1
        return depth[bid]

    for bid in box_ids:
        compute_depth(bid, set())

    # 카테고리별로 row 자동
    category_to_boxes: dict[str, list[str]] = {}
    for b in boxes:
        category_to_boxes.setdefault(b.get("category", "_"), []).append(b["id"])

    # col은 깊이로, row는 카테고리 안에서의 순번으로
    # 동일 col에 같은 카테고리의 박스가 여럿 있으면 row를 카테고리 내 순번으로
    col_row_used: set[tuple[int, int]] = set(fixed.values())

    # 우선순위: 박스 등장 순서 (스키마 안 순서가 의미있다고 봄)
    for b in boxes:
        bid = b["id"]
        if bid in placement:
            continue
        col = depth.get(bid, 0)
        # row: 카테고리별로 시작 row 다르게
        cat = b.get("category", "_")
        cat_index = list(category_to_boxes.keys()).index(cat) if cat in category_to_boxes else 0
        row_base = cat_index * 2  # 카테고리 간 공간
        row = row_base
        while (col, row) in col_row_used:
            row += 1
        col_row_used.add((col, row))
        placement[bid] = (col, row)

    return placement


# ---------------------------------------------------------------------------
# 박스 렌더링
# ---------------------------------------------------------------------------
def render_box(br: BoxRender, header_color: str) -> str:
    parts: list[str] = []
    box = br.box

    # auto_filled면 점선
    dash = "4,3" if box.get("auto_filled") else None

    # 외곽
    parts.append(_rect(br.x, br.y, br.w, br.h, fill=COLOR_BG, stroke=COLOR_BORDER, sw=1, rx=ROUND, dash=dash))
    # 헤더
    parts.append(_rect(br.x, br.y, br.w, BOX_HEADER_H, fill=header_color, stroke=header_color, sw=1, rx=ROUND))
    # 헤더가 아래로도 둥글지 않게 사각 덮기 (헤더 하단부 = 본문 윗변과 일치)
    parts.append(_rect(br.x, br.y + BOX_HEADER_H - 4, br.w, 4, fill=header_color, stroke="none"))

    # 헤더 텍스트
    parts.append(_text(br.x + 12, br.y + 19, box.get("title", box.get("id", "")), size=13, fill="#FFFFFF", weight="bold"))

    # 항목
    cy = br.y + BOX_HEADER_H + BOX_PAD_Y + 4
    for item in box.get("items", []) or []:
        no = item.get("no", "")
        label = item.get("label", "")
        # 좌측 번호
        parts.append(_text(br.x + 12, cy + 12, str(no), size=11, weight="bold"))
        # 라벨
        parts.append(_text(br.x + 32, cy + 12, label, size=11))
        cy += ITEM_H
        for sub in (item.get("subitems") or []):
            parts.append(_text(br.x + 36, cy + 10, "• " + str(sub), size=10, fill=COLOR_TEXT_MUTED))
            cy += SUB_H

    # open_questions (빨간 메모)
    if box.get("open_questions"):
        cy += 6
        # 분리선
        parts.append(f'<line x1="{br.x + 8}" y1="{cy:.1f}" x2="{br.x + br.w - 8:.1f}" y2="{cy:.1f}" stroke="#E5E7EB" stroke-width="1"/>')
        cy += 6
        for q in box["open_questions"]:
            text = "※ " + str(q)
            # 단순 줄바꿈: 22자마다 (CJK는 폭 다르지만 근사)
            chars = list(text)
            line = ""
            for ch in chars:
                line += ch
                if len(line) >= 22 and ch in (" ", "/", ".", ",", "?", "—", "·"):
                    parts.append(_text(br.x + 12, cy + 10, line, size=10, fill=COLOR_OPEN_Q))
                    cy += 14
                    line = ""
            if line:
                parts.append(_text(br.x + 12, cy + 10, line, size=10, fill=COLOR_OPEN_Q))
                cy += 14
            cy += 2

    return "\n  ".join(parts)


# ---------------------------------------------------------------------------
# 화살표 렌더링
# ---------------------------------------------------------------------------
def arrow_path(fr: BoxRender, to: BoxRender) -> tuple[str, str, tuple[float, float]]:
    """
    두 박스 사이의 화살표 path를 계산한다.
    반환: (path_d, label_position(x,y))
    """
    fx_left, fy_top = fr.x, fr.y
    fx_right, fy_bot = fr.x + fr.w, fr.y + fr.h
    fx_mid_x = fr.x + fr.w / 2
    fx_mid_y = fr.y + fr.h / 2

    tx_left, ty_top = to.x, to.y
    tx_right, ty_bot = to.x + to.w, to.y + to.h
    tx_mid_x = to.x + to.w / 2
    tx_mid_y = to.y + to.h / 2

    # 출발점 / 도착점 결정
    # 좌→우
    if fx_right < tx_left:
        sx, sy = fx_right, fx_mid_y
        ex, ey = tx_left, tx_mid_y
        # 직선
        if abs(sy - ey) < 4:
            d = f"M {sx:.1f} {sy:.1f} L {ex:.1f} {ey:.1f}"
        else:
            mx = (sx + ex) / 2
            d = f"M {sx:.1f} {sy:.1f} L {mx:.1f} {sy:.1f} L {mx:.1f} {ey:.1f} L {ex:.1f} {ey:.1f}"
        label_pos = ((sx + ex) / 2, (sy + ey) / 2 - 6)
    # 우→좌
    elif fx_left > tx_right:
        sx, sy = fx_left, fx_mid_y
        ex, ey = tx_right, tx_mid_y
        if abs(sy - ey) < 4:
            d = f"M {sx:.1f} {sy:.1f} L {ex:.1f} {ey:.1f}"
        else:
            mx = (sx + ex) / 2
            d = f"M {sx:.1f} {sy:.1f} L {mx:.1f} {sy:.1f} L {mx:.1f} {ey:.1f} L {ex:.1f} {ey:.1f}"
        label_pos = ((sx + ex) / 2, (sy + ey) / 2 - 6)
    # 위→아래
    elif fy_bot < ty_top:
        sx, sy = fx_mid_x, fy_bot
        ex, ey = tx_mid_x, ty_top
        if abs(sx - ex) < 4:
            d = f"M {sx:.1f} {sy:.1f} L {ex:.1f} {ey:.1f}"
        else:
            my = (sy + ey) / 2
            d = f"M {sx:.1f} {sy:.1f} L {sx:.1f} {my:.1f} L {ex:.1f} {my:.1f} L {ex:.1f} {ey:.1f}"
        label_pos = ((sx + ex) / 2 + 6, (sy + ey) / 2)
    # 아래→위
    else:
        sx, sy = fx_mid_x, fy_top
        ex, ey = tx_mid_x, ty_bot
        if abs(sx - ex) < 4:
            d = f"M {sx:.1f} {sy:.1f} L {ex:.1f} {ey:.1f}"
        else:
            my = (sy + ey) / 2
            d = f"M {sx:.1f} {sy:.1f} L {sx:.1f} {my:.1f} L {ex:.1f} {my:.1f} L {ex:.1f} {ey:.1f}"
        label_pos = ((sx + ex) / 2 + 6, (sy + ey) / 2)

    return d, "marker", label_pos


def render_arrow(fr: BoxRender, to: BoxRender, conn: dict) -> str:
    style = conn.get("style", "secondary")
    if style == "primary":
        color = COLOR_ARROW_PRIMARY
        sw = 2
        marker = "url(#arrowhead-primary)"
        dash = ""
    elif style == "dashed":
        color = COLOR_ARROW_SECONDARY
        sw = 1
        marker = "url(#arrowhead-secondary)"
        dash = ' stroke-dasharray="6,4"'
    else:  # secondary
        color = COLOR_ARROW_SECONDARY
        sw = 1
        marker = "url(#arrowhead-secondary)"
        dash = ""

    d, _, label_pos = arrow_path(fr, to)
    parts = [
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" marker-end="{marker}"{dash}/>'
    ]
    if conn.get("label"):
        lx, ly = label_pos
        # 흰 배경 박스 + 텍스트
        label_text = str(conn["label"])
        approx_w = max(40, len(label_text) * 7 + 12)
        parts.append(_rect(lx - approx_w / 2, ly - 12, approx_w, 16, fill=COLOR_BG, stroke="none"))
        parts.append(_text(lx, ly, label_text, size=10, anchor="middle", fill=COLOR_TEXT))
    return "\n  ".join(parts)


# ---------------------------------------------------------------------------
# 범례
# ---------------------------------------------------------------------------
def render_legend(categories: list[dict], position: str = "top_right") -> str:
    if not categories:
        return ""
    swatch_w = 14
    item_h = 20
    label_size = 12
    cols = 2 if len(categories) > 4 else 1
    rows = (len(categories) + cols - 1) // cols
    each_w = max(160, BOX_W * 0.7)
    legend_w = each_w * cols + 24
    legend_h = item_h * rows + 16

    if position == "top_right":
        lx, ly = CANVAS_W - PADDING_X - legend_w, 30
    elif position == "top_left":
        lx, ly = PADDING_X, 30
    else:  # bottom_right
        lx, ly = CANVAS_W - PADDING_X - legend_w, CANVAS_H - PADDING_Y - legend_h

    parts = [_rect(lx, ly, legend_w, legend_h, rx=4, fill=COLOR_BG, stroke=COLOR_BORDER)]
    for i, cat in enumerate(categories):
        col = i % cols
        row = i // cols
        sx = lx + 12 + col * each_w
        sy = ly + 8 + row * item_h
        parts.append(_rect(sx, sy + 2, swatch_w, swatch_w, fill=cat.get("color", "#9CA3AF"), stroke="none", rx=2))
        parts.append(_text(sx + swatch_w + 8, sy + 13, cat.get("name", cat.get("id", "")), size=label_size))
    return "\n  ".join(parts)


# ---------------------------------------------------------------------------
# 메인 렌더
# ---------------------------------------------------------------------------
def render_ia(data: dict) -> str:
    ia = data.get("ia", {})
    boxes = ia.get("boxes", [])
    connections = ia.get("connections", [])
    categories = ia.get("categories", [])

    if not boxes:
        # 빈 IA
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS_W} {CANVAS_H}" '
            f'width="{CANVAS_W}" height="{CANVAS_H}">\n'
            f'  {_text(CANVAS_W / 2, CANVAS_H / 2, "(IA boxes 비어 있음)", size=24, anchor="middle", fill=COLOR_TEXT_MUTED)}\n'
            f'</svg>\n'
        )

    cat_color: dict[str, str] = {}
    for c in categories:
        cat_color[c.get("id")] = c.get("color", DEFAULT_PALETTE.get(c.get("id"), "#9CA3AF"))
    # 기본 팔레트 fallback
    for b in boxes:
        cat_id = b.get("category")
        if cat_id and cat_id not in cat_color:
            cat_color[cat_id] = DEFAULT_PALETTE.get(cat_id, "#9CA3AF")

    # 1) 박스 측정
    measured: dict[str, BoxRender] = {b["id"]: measure_box(b) for b in boxes}

    # 2) 자동 배치
    placement = auto_layout(boxes, connections)

    # 3) 좌표 산출
    # 각 col의 max box height에 따라 col x좌표 결정
    cols = sorted({c for c, _ in placement.values()})
    col_x: dict[int, float] = {}
    cur_x = PADDING_X
    for c in cols:
        col_x[c] = cur_x
        cur_x += BOX_W + BOX_GAP_X

    # 각 col 안에서 row별 누적 y
    rows_by_col: dict[int, list[tuple[int, str]]] = {}
    for bid, (c, r) in placement.items():
        rows_by_col.setdefault(c, []).append((r, bid))
    for c in rows_by_col:
        rows_by_col[c].sort(key=lambda t: t[0])

    # 같은 col 안에서 위→아래 순서로 y 누적
    for c, lst in rows_by_col.items():
        cur_y = PADDING_Y
        for _, bid in lst:
            br = measured[bid]
            br.x = col_x[c]
            br.y = cur_y
            cur_y += br.h + BOX_GAP_Y

    # 4) 캔버스 크기 자동 확장
    max_x = max(br.x + br.w for br in measured.values()) + PADDING_X
    max_y = max(br.y + br.h for br in measured.values()) + PADDING_Y
    canvas_w = max(CANVAS_W, int(max_x))
    canvas_h = max(CANVAS_H, int(max_y))

    parts: list[str] = []
    parts.append(_arrow_marker_def())

    # 배경
    parts.append(_rect(0, 0, canvas_w, canvas_h, fill=COLOR_BG, stroke="none"))

    # 제목
    title = data.get("meta", {}).get("title", "IA / Site Map")
    parts.append(_text(PADDING_X, 50, title, size=22, weight="bold"))
    parts.append(_text(PADDING_X, 72, "IA / Site Map", size=12, fill=COLOR_TEXT_MUTED))

    # 범례
    parts.append(render_legend(categories, ia.get("legend_position", "top_right")))

    # 박스
    for bid, br in measured.items():
        cat_id = br.box.get("category", "")
        header_color = cat_color.get(cat_id, "#9CA3AF")
        parts.append(render_box(br, header_color))

    # 화살표 (박스 위에 그려야 화살촉이 보이므로 마지막)
    for c in connections:
        f, t = c.get("from"), c.get("to")
        if f in measured and t in measured:
            parts.append(render_arrow(measured[f], measured[t], c))

    body = "\n  ".join(parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas_w} {canvas_h}" '
        f'width="{canvas_w}" height="{canvas_h}">\n  {body}\n</svg>\n'
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="storyboard JSON 경로")
    ap.add_argument("--output", default=None, help="SVG 출력 경로 (기본: <input dir>/assets/ia.svg)")
    args = ap.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    out_path = args.output or os.path.join(
        os.path.dirname(os.path.abspath(args.input)), "assets", "ia.svg"
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    svg = render_ia(data)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"Wrote IA diagram: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
