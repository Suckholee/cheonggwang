# Storyboard Generator (한국형 화면 정의서)

한국 SI/UX 현장 표준 스타일의 **스토리보드(화면 정의서)** 문서를 인터뷰 방식으로 작성해 한 권의 PPTX로 빌드하는 Claude 스킬입니다.

산출 문서 구조:
1. 표지
2. 개정 이력
3. IA 흐름도 (박스 + 화살표 + 카테고리 색상)
4. 화면별 상세 (PATH / 컴포넌트 상태 stack / 메인 목업 + 어노테이션 / Function & Button Description / Validation 메시지 표)

---

## 설치 (전역 사용자 스킬)

이 폴더 전체를 사용자 스킬 디렉터리로 복사하면 됩니다.

```bash
# macOS / Linux
cp -r /Users/VIBRA_PETER/dev/cheonggwang/storyboard-generator ~/.claude/skills/

# 의존성 (PPTX 빌드 시점에 필요)
pip install python-pptx Pillow
```

설치 후 새 세션에서 "스토리보드 만들어줘", "화면 정의서 작성", "기획서 PPT 만들어줘" 같은 표현으로 트리거됩니다.

---

## 빠른 사용법 (수동 빌드)

스킬은 인터뷰를 통해 storyboard JSON을 채운 뒤 다음 스크립트들을 호출합니다. 직접 호출도 가능:

```bash
SB=assets/example_storyboard.json
OUT=outputs/

# 1) IA 다이어그램 SVG (선택)
python scripts/generate_ia_diagram.py --input $SB --output $OUT/assets/ia.svg

# 2) 통합 PPTX 빌드
python scripts/build_storyboard_pptx.py --input $SB --output "$OUT/스토리보드.pptx"

# 3) Markdown 보조 출력 (선택)
python scripts/build_markdown.py --input $SB --output "$OUT/스토리보드.md"

# 4) 화면 목업 이미지 없을 때 — fallback 와이어프레임 자동 생성
python scripts/generate_wireframe.py --input $SB --output-dir $OUT/assets/wireframes/
```

---

## 디렉터리 구조

```
storyboard-generator/
├── SKILL.md                          ← Claude가 이걸 읽고 인터뷰 진행
├── README.md                         ← (이 파일)
├── references/
│   ├── interview_flow.md             ← 단계별 인터뷰 스크립트
│   ├── document_schema.md            ← storyboard JSON 스키마
│   ├── ia_diagram_spec.md            ← IA 박스/화살표 시각 규약
│   ├── screen_detail_spec.md         ← 화면 상세 5분할 레이아웃
│   ├── component_states.md           ← 컴포넌트 상태 프리셋 카탈로그
│   └── output_formats.md             ← PPTX/MD 출력 표준
├── scripts/
│   ├── generate_ia_diagram.py        ← IA SVG 생성기
│   ├── build_storyboard_pptx.py      ← 통합 PPTX 빌더
│   ├── build_markdown.py             ← Markdown 보조 빌더
│   └── generate_wireframe.py         ← 화면 목업 fallback (이미지 없을 때)
└── assets/
    ├── component_state_presets.json  ← 표준 상태 프리셋 데이터
    └── example_storyboard.json       ← 완성 예시 (월렛지기 v0.1)
```

---

## 인터뷰 흐름 요약

스킬이 트리거되면 다음 순서로 진행:

1. **컨텍스트 수집** — 프로젝트명/플랫폼/타깃/용도 4문항
2. **IA 카테고리 정의** — 사용자가 카테고리 이름·색상 자유 정의 (또는 표준 팔레트 선택)
3. **IA 박스 트리 합의** — 후보 박스 제시 → 사용자 다듬기 → 박스별 항목·sub-item 채우기
4. **박스 간 화살표** — 메인 흐름 + 분기/예외 흐름
5. **화면별 상세 인터뷰** — 화면당 6단계 (PATH → 메인 목업 업로드 → 번호 어노테이션 → 알파벳 어노테이션 → 컴포넌트 상태 → Validation 표)
6. **빌드** — 통합 PPTX 출력

자세한 스크립트는 `references/interview_flow.md` 참고.

---

## 트러블슈팅

**Q. `python-pptx`가 설치돼 있어도 한글이 깨지는 슬라이드가 있어요.**
→ Office는 시스템 폰트를 따라가므로 PPT 열어 보는 OS에 한글 폰트가 있어야 합니다. macOS는 Apple SD Gothic Neo, Windows는 맑은 고딕이 기본 보장.

**Q. IA 박스가 너무 빽빽해서 화살표가 다른 박스를 가로지릅니다.**
→ 카테고리별로 박스가 col 그룹핑되도록 자동 배치하지만, 충돌이 심하면 `ia.boxes[].row`/`col`을 명시해 직접 배치하세요.

**Q. 화면 상세 슬라이드에 메인 목업이 안 들어가요.**
→ `screen.main_mockup.path`를 storyboard JSON 위치 기준 상대경로로 적었는지 확인. `assets/uploads/login.png` 같은 형태가 깔끔합니다.
