#!/usr/bin/env python3
"""
generate_wireframe.py — Storyboard JSON에서 화면별 SVG 와이어프레임을 생성한다.

사용법:
    python generate_wireframe.py --input storyboard.json --output-dir wireframes/
    python generate_wireframe.py --input storyboard.json --screen S04_홈   # 한 장만

출력:
    wireframes/<screen_id>.svg

각 화면의 layout 배열을 위에서 아래로 stacking 하며 컴포넌트별 표준 도식을
SVG 도형으로 그린다. 색상은 회색조 단색 고정. 컴포넌트 매핑 규칙은
references/output_formats.md 참고.

표준 라이브러리만 사용 (no deps).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from html import escape
from typing import Any

# ---------------------------------------------------------------------------
# 색상 토큰 (output_formats.md와 일치)
# ---------------------------------------------------------------------------
COLOR = {
    "border": "#94A3B8",
    "fill_strong": "#1F2937",
    "fill_medium": "#CBD5E1",
    "fill_light": "#F1F5F9",
    "text": "#111827",
    "text_muted": "#6B7280",
    "canvas": "#FFFFFF",
    "auto_fill_accent": "#F59E0B",  # auto_filled 강조
}

# 디바이스 프레임 크기
DEVICE = {
    "mobile_app": {"w": 360, "h": 720, "rounded": 32, "has_notch": True},
    "responsive_web": {"w": 1280, "h": 800, "rounded": 8, "has_notch": False},
    "desktop_web": {"w": 1440, "h": 900, "rounded": 8, "has_notch": False},
    "multi": {"w": 360, "h": 720, "rounded": 32, "has_notch": True},  # 모바일로 fallback
}

PADDING = 16  # 화면 안쪽 여백
GAP = 12      # 컴포넌트 간 간격


# ---------------------------------------------------------------------------
# SVG 빌더
# ---------------------------------------------------------------------------
@dataclass
class Cursor:
    """현재 그리고 있는 위치를 추적한다 (위→아래 흐름)."""
    x: float
    y: float
    width: float  # 사용 가능한 가로 폭
    parts: list[str]   # 누적 SVG 조각

    def add(self, fragment: str) -> None:
        self.parts.append(fragment)

    def advance(self, height: float, gap: float = GAP) -> None:
        self.y += height + gap


def _esc(s: str | None) -> str:
    return escape(str(s) if s is not None else "")


def _rect(x, y, w, h, *, fill=COLOR["canvas"], stroke=COLOR["border"], rx=0, sw=1, opacity=1) -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
        f'rx="{rx}" ry="{rx}" fill="{fill}" stroke="{stroke}" '
        f'stroke-width="{sw}" opacity="{opacity}"/>'
    )


def _text(x, y, content, *, size=12, fill=COLOR["text"], anchor="start", weight="normal") -> str:
    return (
        f'<text x="{x}" y="{y}" font-family="-apple-system, Segoe UI, sans-serif" '
        f'font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
        f'font-weight="{weight}">{_esc(content)}</text>'
    )


def _line(x1, y1, x2, y2, *, stroke=COLOR["border"], sw=1) -> str:
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"/>'


def _circle(cx, cy, r, *, fill=COLOR["fill_strong"], stroke="none") -> str:
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}"/>'


# ---------------------------------------------------------------------------
# 컴포넌트 렌더러
# ---------------------------------------------------------------------------
def render_navbar(c: Cursor, comp: dict) -> None:
    h = 56
    c.add(_rect(c.x, c.y, c.width, h, fill=COLOR["fill_light"], stroke=COLOR["border"]))
    # 좌측 액션
    if comp.get("left_action"):
        c.add(_rect(c.x + 12, c.y + 16, 24, 24, fill=COLOR["canvas"], stroke=COLOR["border"], rx=4))
    # 우측 액션
    if comp.get("right_action"):
        c.add(_rect(c.x + c.width - 36, c.y + 16, 24, 24, fill=COLOR["canvas"], stroke=COLOR["border"], rx=4))
        c.add(_text(c.x + c.width - 24, c.y + 31, comp.get("right_action", "")[:6], size=9, anchor="middle", fill=COLOR["text_muted"]))
    # 가운데 라벨
    c.add(_text(c.x + c.width / 2, c.y + 33, comp.get("label", "Title"), size=14, anchor="middle", weight="bold"))
    c.advance(h)


def render_header(c: Cursor, comp: dict) -> None:
    label = comp.get("label", "")
    sub = comp.get("subtitle", "")
    c.add(_text(c.x, c.y + 20, label, size=20, weight="bold"))
    h = 28
    if sub:
        c.add(_text(c.x, c.y + 40, sub, size=12, fill=COLOR["text_muted"]))
        h = 48
    c.advance(h)


def render_input(c: Cursor, comp: dict) -> None:
    h = 44
    c.add(_rect(c.x, c.y, c.width, h, rx=8, fill=COLOR["canvas"]))
    placeholder = comp.get("placeholder") or comp.get("label") or "입력"
    c.add(_text(c.x + 12, c.y + 28, placeholder, size=12, fill=COLOR["text_muted"]))
    c.advance(h)


def render_textarea(c: Cursor, comp: dict) -> None:
    rows = max(int(comp.get("min_rows", 3)), 1)
    h = rows * 22 + 16
    c.add(_rect(c.x, c.y, c.width, h, rx=8, fill=COLOR["canvas"]))
    placeholder = comp.get("placeholder") or comp.get("label") or "여러 줄 입력"
    c.add(_text(c.x + 12, c.y + 22, placeholder, size=12, fill=COLOR["text_muted"]))
    c.advance(h)


def render_button(c: Cursor, comp: dict) -> None:
    h = 44
    style = comp.get("style", "primary")
    label = comp.get("label", "Button")
    if style == "primary":
        fill, stroke, text_fill = COLOR["fill_strong"], COLOR["fill_strong"], COLOR["canvas"]
    elif style == "secondary":
        fill, stroke, text_fill = COLOR["canvas"], COLOR["fill_strong"], COLOR["fill_strong"]
    else:  # ghost
        fill, stroke, text_fill = COLOR["canvas"], COLOR["canvas"], COLOR["fill_strong"]
    c.add(_rect(c.x, c.y, c.width, h, rx=10, fill=fill, stroke=stroke))
    c.add(_text(c.x + c.width / 2, c.y + 28, label, size=14, weight="bold", anchor="middle", fill=text_fill))
    c.advance(h)


def render_link(c: Cursor, comp: dict) -> None:
    label = comp.get("label", "Link")
    h = 20
    c.add(_text(c.x, c.y + 14, label, size=12, fill=COLOR["fill_strong"]))
    # 밑줄
    text_w = max(len(label) * 7, 30)
    c.add(_line(c.x, c.y + 17, c.x + text_w, c.y + 17, stroke=COLOR["fill_strong"]))
    c.advance(h)


def render_chips(c: Cursor, comp: dict) -> None:
    items = comp.get("items", [])
    h = 32
    cursor_x = c.x
    for i, item in enumerate(items):
        chip_w = max(len(str(item)) * 8 + 24, 50)
        if cursor_x + chip_w > c.x + c.width:
            break
        if i == 0:
            c.add(_rect(cursor_x, c.y, chip_w, h, rx=16, fill=COLOR["fill_strong"], stroke=COLOR["fill_strong"]))
            c.add(_text(cursor_x + chip_w / 2, c.y + 21, str(item), size=12, anchor="middle", fill=COLOR["canvas"]))
        else:
            c.add(_rect(cursor_x, c.y, chip_w, h, rx=16, fill=COLOR["canvas"]))
            c.add(_text(cursor_x + chip_w / 2, c.y + 21, str(item), size=12, anchor="middle", fill=COLOR["text"]))
        cursor_x += chip_w + 8
    c.advance(h)


def render_tab(c: Cursor, comp: dict) -> None:
    items = comp.get("items", [])
    default = comp.get("default", items[0] if items else "")
    h = 40
    if not items:
        c.advance(h)
        return
    seg = c.width / len(items)
    c.add(_line(c.x, c.y + h - 1, c.x + c.width, c.y + h - 1, sw=1))
    for i, item in enumerate(items):
        cx = c.x + seg * i + seg / 2
        is_active = str(item) == str(default)
        weight = "bold" if is_active else "normal"
        fill = COLOR["text"] if is_active else COLOR["text_muted"]
        c.add(_text(cx, c.y + 25, str(item), size=12, anchor="middle", weight=weight, fill=fill))
        if is_active:
            c.add(_line(c.x + seg * i + 8, c.y + h - 1, c.x + seg * (i + 1) - 8, c.y + h - 1, sw=3, stroke=COLOR["fill_strong"]))
    c.advance(h)


def render_card(c: Cursor, comp: dict, *, top_y: float | None = None) -> float:
    """카드를 한 장 그린다. 반환: 카드 높이."""
    fields = comp.get("fields", ["Title", "Subtitle"])
    has_thumb = any("썸네일" in f or "이미지" in f or "thumbnail" in f.lower() for f in fields)
    h = max(80, len(fields) * 20 + 24)
    y = top_y if top_y is not None else c.y
    c.add(_rect(c.x, y, c.width, h, rx=8, fill=COLOR["canvas"]))
    text_x = c.x + 16
    if has_thumb:
        c.add(_rect(c.x + 12, y + 12, 56, 56, rx=6, fill=COLOR["fill_medium"], stroke="none"))
        text_x = c.x + 80
    line_y = y + 24
    for i, field in enumerate(fields):
        if has_thumb and "썸네일" in field:
            continue
        if i == 0:
            c.add(_text(text_x, line_y, str(field), size=13, weight="bold"))
        else:
            c.add(_text(text_x, line_y, str(field), size=11, fill=COLOR["text_muted"]))
        line_y += 18
    return h


def render_list(c: Cursor, comp: dict) -> None:
    item = comp.get("item", {"type": "card", "fields": ["항목"]})
    count = max(int(comp.get("min_items", 3)), 1)
    count = min(count, 4)  # 와이어프레임에서는 최대 4장만
    for _ in range(count):
        if item.get("type") == "card":
            h = render_card(c, item, top_y=c.y)
        else:
            # fallback: 단순 행
            h = 56
            c.add(_rect(c.x, c.y, c.width, h, rx=4, fill=COLOR["canvas"]))
            c.add(_text(c.x + 12, c.y + 32, str(item.get("label", "Item")), size=13))
        c.advance(h, gap=8)


def render_image(c: Cursor, comp: dict) -> None:
    aspect = str(comp.get("aspect", "16:9"))
    try:
        aw, ah = aspect.split(":")
        h = int(c.width * (int(ah) / int(aw)))
    except Exception:
        h = int(c.width * 9 / 16)
    h = min(h, 240)
    # 빗금 패턴
    c.add(_rect(c.x, c.y, c.width, h, fill=COLOR["fill_light"]))
    # 대각선 몇 개
    for off in range(0, int(c.width + h), 24):
        c.add(_line(c.x + off, c.y, c.x + off - h, c.y + h, sw=1, stroke=COLOR["fill_medium"]))
    label = comp.get("label", "IMG")
    c.add(_text(c.x + c.width / 2, c.y + h / 2 + 4, label, size=14, anchor="middle", fill=COLOR["text_muted"], weight="bold"))
    c.advance(h)


def render_text(c: Cursor, comp: dict) -> None:
    lines = max(int(comp.get("lines", 3)), 1)
    h = lines * 14 + 4
    for i in range(lines):
        line_w = c.width if i < lines - 1 else c.width * 0.6
        c.add(_line(c.x, c.y + 8 + i * 14, c.x + line_w, c.y + 8 + i * 14, sw=8, stroke=COLOR["fill_medium"]))
    c.advance(h)


def render_divider(c: Cursor, comp: dict) -> None:
    c.add(_line(c.x, c.y + 4, c.x + c.width, c.y + 4))
    c.advance(8)


def render_fab(c: Cursor, comp: dict, *, frame_w: float, frame_h: float) -> None:
    """FAB는 흐름과 무관하게 우하단에 배치된다."""
    cx = c.x + c.width - 28 - 16
    cy = frame_h - 56 - 16  # 절대 좌표 기준
    c.add(_circle(cx, cy, 28, fill=COLOR["fill_strong"]))
    label = comp.get("label", "+")
    c.add(_text(cx, cy + 8, label, size=24, anchor="middle", fill=COLOR["canvas"], weight="bold"))


def render_bottom_nav(c: Cursor, comp: dict, *, frame_w: float, frame_h: float) -> float:
    """하단 내비. 절대 위치(프레임 바닥)에 그린다. 반환: 차지한 높이."""
    items = comp.get("items", [])
    h = 60
    y = frame_h - h
    c.add(_rect(c.x, y, c.width, h, fill=COLOR["fill_light"], stroke=COLOR["border"]))
    if not items:
        return h
    seg = c.width / len(items)
    default = comp.get("default", items[0])
    for i, item in enumerate(items):
        cx = c.x + seg * i + seg / 2
        is_active = str(item) == str(default)
        c.add(_rect(cx - 12, y + 10, 24, 24, rx=4, fill=COLOR["fill_medium"] if is_active else COLOR["canvas"]))
        c.add(_text(cx, y + 50, str(item), size=10, anchor="middle", fill=COLOR["text"] if is_active else COLOR["text_muted"]))
    return h


def render_modal(c: Cursor, comp: dict) -> None:
    title = comp.get("title", "Modal")
    body = comp.get("body_layout", [])
    body_h = max(120, len(body) * 60 + 40)
    # 어두운 오버레이
    c.add(_rect(0, 0, c.width + 2 * PADDING, c.y + body_h + 40, fill="#000000", opacity=0.3))
    # 중앙 박스 (화면 안쪽으로)
    box_x = c.x + 8
    box_w = c.width - 16
    c.add(_rect(box_x, c.y, box_w, body_h, rx=12, fill=COLOR["canvas"]))
    c.add(_text(box_x + 16, c.y + 28, title, size=14, weight="bold"))
    c.advance(body_h)


def render_toast(c: Cursor, comp: dict) -> None:
    label = comp.get("label", "Toast")
    h = 40
    c.add(_rect(c.x + 24, c.y, c.width - 48, h, rx=8, fill=COLOR["fill_strong"]))
    c.add(_text(c.x + c.width / 2, c.y + 25, label, size=12, anchor="middle", fill=COLOR["canvas"]))
    c.advance(h)


def render_empty(c: Cursor, comp: dict) -> None:
    h = 200
    cx = c.x + c.width / 2
    cy = c.y + h / 2 - 10
    # 일러스트 자리(원 + 사각형 조합)
    c.add(_circle(cx, cy - 20, 32, fill=COLOR["fill_light"], stroke=COLOR["border"]))
    c.add(_rect(cx - 20, cy + 10, 40, 6, rx=3, fill=COLOR["fill_medium"]))
    c.add(_text(cx, cy + 50, comp.get("label", "데이터 없음"), size=12, anchor="middle", fill=COLOR["text_muted"]))
    c.advance(h)


def render_loading(c: Cursor, comp: dict) -> None:
    count = max(int(comp.get("count", 3)), 1)
    count = min(count, 5)
    for _ in range(count):
        c.add(_rect(c.x, c.y, c.width, 64, rx=8, fill=COLOR["fill_medium"], stroke="none"))
        c.advance(64, gap=8)


# 컴포넌트 디스패처
RENDERERS = {
    "navbar": render_navbar,
    "header": render_header,
    "input": render_input,
    "textarea": render_textarea,
    "button": render_button,
    "link": render_link,
    "chips": render_chips,
    "tab": render_tab,
    "list": render_list,
    "card": lambda c, comp: render_card(c, comp) and c.advance(0),  # 단독 카드도 지원
    "image": render_image,
    "text": render_text,
    "divider": render_divider,
    "modal": render_modal,
    "toast": render_toast,
    "empty": render_empty,
    "loading": render_loading,
    # fab, bottom_nav는 절대 위치라 별도 처리
}


# ---------------------------------------------------------------------------
# 화면 SVG 생성
# ---------------------------------------------------------------------------
def render_screen(screen: dict, platform: str) -> str:
    device = DEVICE.get(platform, DEVICE["mobile_app"])
    fw, fh = device["w"], device["h"]
    svg_parts: list[str] = []

    # 외곽 디바이스 프레임
    svg_parts.append(_rect(0, 0, fw, fh, rx=device["rounded"], fill=COLOR["canvas"], stroke=COLOR["border"], sw=2))

    # 모바일 노치
    if device["has_notch"]:
        notch_w = 120
        svg_parts.append(_rect((fw - notch_w) / 2, 0, notch_w, 22, rx=12, fill=COLOR["fill_strong"]))

    # 콘텐츠 영역
    content_top = 32 if device["has_notch"] else 8
    content_left = PADDING
    content_width = fw - 2 * PADDING

    # 하단 nav 차지하는 높이를 미리 계산해서 컨텐츠 영역에서 제외
    layout = screen.get("layout", [])
    bottom_nav_height = 0
    bottom_nav_comp = next((c for c in layout if c.get("type") == "bottom_nav"), None)
    if bottom_nav_comp:
        bottom_nav_height = 60

    cursor = Cursor(x=content_left, y=content_top, width=content_width, parts=svg_parts)

    # 위에서 아래로
    fab_comp = None
    for comp in layout:
        ctype = comp.get("type")
        if ctype == "fab":
            fab_comp = comp
            continue
        if ctype == "bottom_nav":
            continue
        renderer = RENDERERS.get(ctype)
        if renderer is None:
            # 알 수 없는 타입 — 회색 박스 + 라벨
            cursor.add(_rect(cursor.x, cursor.y, cursor.width, 40, rx=4, stroke=COLOR["border"], fill=COLOR["fill_light"]))
            cursor.add(_text(cursor.x + cursor.width / 2, cursor.y + 25, f"[{ctype}]", size=11, anchor="middle", fill=COLOR["text_muted"]))
            cursor.advance(40)
        else:
            renderer(cursor, comp)
        # 컨텐츠가 bottom_nav 영역 침범하면 자른다
        if cursor.y > fh - bottom_nav_height - 16:
            break

    # bottom_nav (절대 위치)
    if bottom_nav_comp:
        render_bottom_nav(cursor, bottom_nav_comp, frame_w=fw, frame_h=fh)

    # FAB (절대 위치)
    if fab_comp:
        # bottom_nav 위에 떠 있도록 y 보정
        adjusted_h = fh - bottom_nav_height
        render_fab(cursor, fab_comp, frame_w=fw, frame_h=adjusted_h)

    body = "\n  ".join(svg_parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fw} {fh}" '
        f'width="{fw}" height="{fh}">\n  {body}\n</svg>\n'
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def slugify(s: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in "-_가-힣" else "_" for ch in s)
    return safe or "screen"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="storyboard JSON 경로")
    ap.add_argument("--output-dir", default=None, help="SVG 출력 폴더 (기본: <input dir>/wireframes)")
    ap.add_argument("--screen", default=None, help="특정 화면 ID만 생성")
    args = ap.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    platform = data.get("meta", {}).get("platform", "mobile_app")
    screens = data.get("screens", [])

    out_dir = args.output_dir or os.path.join(os.path.dirname(os.path.abspath(args.input)), "wireframes")
    os.makedirs(out_dir, exist_ok=True)

    written: list[str] = []
    for screen in screens:
        sid = screen.get("id", "screen")
        if args.screen and sid != args.screen:
            continue
        svg = render_screen(screen, platform)
        path = os.path.join(out_dir, f"{slugify(sid)}.svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg)
        # storyboard JSON에 wireframe_path를 채워준다 (상대경로)
        screen["wireframe_path"] = os.path.relpath(path, os.path.dirname(os.path.abspath(args.input)))
        written.append(path)

    # 업데이트된 JSON을 다시 저장 (wireframe_path 반영)
    with open(args.input, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(written)} wireframe(s):")
    for p in written:
        print(f"  - {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
