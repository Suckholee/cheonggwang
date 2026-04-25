---
name: storyboard-generator
description: 한국 SI/UX 현장 표준 스타일의 "스토리보드(화면 정의서)" 문서를 인터뷰 방식으로 작성해 PPTX/Markdown으로 산출하는 스킬. 사용자가 "스토리보드 만들어줘", "화면 정의서", "기능 정의서", "스토리보드 PPT", "IA 흐름도", "메뉴 구조도", "사이트맵 + 화면 상세", "와이어프레임 + 기능 디스크립션", "스토리보드 양식대로", "프로젝트 기획서 PPT" 같은 요청을 하면 반드시 트리거. 영어로 "create storyboard document", "screen spec doc", "site flow + screen details" 도 트리거. 스킬은 (1) 표지/개정이력 → (2) IA 박스+화살표 흐름도 → (3) 화면별 상세 페이지(좌: 컴포넌트 상태 변형 / 중: 메인 목업+번호 어노테이션 / 우: Function & Button Description + Validation 메시지 표) 까지 한 권의 PPTX로 빌드한다. 사용자는 화면 목업 이미지를 업로드해서 사용하며, 없는 경우에만 SVG 와이어프레임 fallback이 적용된다. 단순 한 화면 와이어프레임 한 장 요청에는 트리거하지 말 것.
---

# Storyboard Generator (한국형 화면 정의서)

이 스킬은 한국 SI/UX 현장에서 통용되는 **스토리보드(화면 정의서)** 문서를 사용자와의 단계별 인터뷰로 채워 한 권의 PPTX로 만들어 준다.

산출 문서의 구조는 다음과 같다 (PPTX 슬라이드 순서):

```
[1]  표지 (프로젝트명·버전·작성자·날짜)
[2]  개정 이력 (Revision History 표)
[3]  IA 흐름도 / 사이트맵 (박스+화살표 다이어그램, 카테고리별 색상)
[4 ~ N]  화면별 상세 (한 화면당 1슬라이드)
       ├ 상단:  PATH (breadcrumb)
       ├ 좌측:  컴포넌트 상태 변형 스택 (기본/포커스 인/Valid/Invalid 등)
       ├ 중앙:  메인 화면 목업 (사용자 업로드 이미지) + ①②③ / ⒶⒷⒸ 어노테이션
       ├ 우상:  Function Description (번호별 입력 필드 명세)
       ├ 우중:  Button Description (알파벳별 버튼/링크 명세)
       └ 우하:  Validation 메시지 표 (체크시점 / 조건 / 메시지 / 노출유형)
```

스토리보드 데이터는 **하나의 JSON 파일**로 관리한다. 모든 산출물은 이 JSON에서 파생된다. 자세한 스키마는 `references/document_schema.md` 참고.

---

## 인터뷰 워크플로우

각 단계에서 무엇을 묻고 어떻게 진행할지의 구체적 스크립트는 **`references/interview_flow.md`** 에 있다. 인터뷰 시작 전에 반드시 읽어라. 여기서는 큰 그림만:

### 단계 0 — 프로젝트 컨텍스트

- 프로젝트/서비스명, 버전, 작성자, 클라이언트(있으면), 타깃 플랫폼
- AskUserQuestion 도구가 있으면 4문항 이내로, 없으면 평문으로 1~2개씩

### 단계 1 — IA 카테고리 정의 (사용자 정의 색상)

기본 카테고리 후보를 **추정해서 먼저 던져라**. 예: B2C 모바일 앱이면 "진입/계정 / 메인 / 부가기능 / 설정-관리". 각 카테고리에 색상을 지정한다 (사용자가 직접 색을 못 정하면 표준 팔레트에서 추천 — `references/ia_diagram_spec.md`의 팔레트 사용).

```json
"ia": {
  "categories": [
    {"id": "auth",   "name": "진입/계정", "color": "#F59E0B"},
    {"id": "main",   "name": "메인",     "color": "#FACC15"},
    {"id": "extra",  "name": "부가기능", "color": "#9CA3AF"},
    {"id": "config", "name": "설정·관리","color": "#94A3B8"}
  ]
}
```

### 단계 2 — IA 박스 트리 합의

각 박스는 **하나의 "화면 또는 메뉴 그룹"**. 사용자가 떠올리기 어렵게 보이면 컨텍스트 기반 후보를 먼저 제시한 뒤 다듬는다. 박스가 7개를 넘으면 카테고리별로 묶어서 회차를 나눈다.

박스 안에는 1차 항목(번호) + 선택적 2차 항목(들여쓰기 불릿)을 채운다 (보내주신 IA 이미지의 박스 내부 구조와 동일).

```json
{
  "id": "B05_홈메인",
  "title": "홈메인 (월렛)",
  "category": "main",
  "items": [
    {"no": 1, "label": "알림"},
    {"no": 2, "label": "사용 내역", "subitems": ["지갑 QR코드"]},
    {"no": 3, "label": "보내기", "subitems": [
      "보안비밀번호 등록",
      "이체정보입력 — QR코드 검색 / 회원 검색",
      "이체완료/확인"
    ]}
  ],
  "open_questions": [
    "MVP 때 스토어가 없다면 스토어 대신 마이너 관리 페이지를 위치?"
  ]
}
```

`open_questions`는 IA 다이어그램에서 **빨간 메모로 박스 안에 자동 표시**된다.

### 단계 3 — 박스 간 흐름(화살표) 정의

```json
"connections": [
  {"from": "B01_스플래시",  "to": "B02_튜토리얼"},
  {"from": "B02_튜토리얼",  "to": "B03_로그인"},
  {"from": "B03_로그인",    "to": "B04_비밀번호찾기", "label": "비번 분실"},
  {"from": "B03_로그인",    "to": "B05_홈메인"}
]
```

가능하면 **메인 흐름(화살표 굵게) + 보조 흐름(화살표 얇게)** 으로 두 종류 운영. 선택 사항이지만 권장.

### 단계 4 — 화면별 상세 페이지 인터뷰

IA 박스 중 "디테일이 필요한 화면"을 선별해 (모든 박스에 상세 페이지를 만들 필요는 없음 — 보통 핵심 5~15장) 화면별 인터뷰 진행:

각 화면마다:

1. **PATH** — `> 로그인 페이지` 같은 breadcrumb (자동 추정 가능)
2. **메인 목업 이미지 업로드** — 디자이너가 만든 시안. 없으면 SVG 와이어프레임 fallback 옵션 제시.
3. **번호 어노테이션 (입력 필드, ①②③…)** — 어디에 어떤 필드가 있고 무슨 일을 하는가 → Function Description
4. **알파벳 어노테이션 (버튼·링크, ⒶⒷⒸ…)** — 무슨 액션을 하는가, 활성/비활성 조건은 → Button Description
5. **컴포넌트 상태 변형 스택 (좌측)** — `references/component_states.md` 의 표준 프리셋에서 선택 후 화면 맥락에 맞게 조정
6. **Validation 메시지 표** — 체크 시점 / 조건 / 메시지 / 노출 유형 (인풋박스 하단·디자인 팝업 등)

**핵심 규칙: 한 번에 한 가지만 묻는다.** 메인 목업 받자마자 6개 항목을 한꺼번에 던지지 말고, 어노테이션 → Function → Button → 상태 → Validation 순으로 차근차근.

### 단계 5 — 빌드

```bash
# 1) IA 다이어그램 SVG 생성 (단계 1~3 결과 기반)
python scripts/generate_ia_diagram.py --input storyboard.json --output assets/ia.svg

# 2) (옵션) 이미지 없는 화면용 SVG 와이어프레임 fallback 생성
python scripts/generate_wireframe.py --input storyboard.json --output-dir assets/wireframes/

# 3) 통합 PPTX 빌드 (모든 챕터 포함)
python scripts/build_storyboard_pptx.py --input storyboard.json --output 스토리보드.pptx

# 4) (선택) Markdown 보조 출력
python scripts/build_markdown.py --input storyboard.json --output 스토리보드.md
```

산출 경로는 사용자가 선택한 폴더가 있으면 그 안에 만들고, 없으면 `outputs/`에 만든 뒤 `computer://` 링크로 보여줘라.

---

## 인터뷰 진행 핵심 규칙

1. **한 번에 너무 많이 묻지 마라.** AskUserQuestion 사용 시 4문항 이내. 평문일 땐 1~2개.
2. **사용자의 짧은 답을 정형화해서 다시 보여줘라.** "보내기, QR 검색, 회원 검색이요" → "그럼 [3. 보내기] 안에 sub-bullet으로 'QR코드 검색', '회원 검색'을 넣고, 별개로 '이체완료/확인' 단계도 추가하면 어떨까요?"
3. **추정한 부분은 표시하라.** `auto_filled: true` 또는 `🔶` 마크업으로 산출물에서 즉시 식별되게.
4. **단계 끝마다 미니 요약 + 확인.** IA 트리, 화면 상세 1장 끝났을 때 등.
5. **숨겨진 질문을 발굴하라.** 권한·결제·약관·푸시·다국어·다크모드·접근성·첫 방문/재방문 분기 등.
6. **이미지 업로드는 강하게 권유.** 화면 상세 페이지의 핵심 가치는 실제 디자인 시안이 들어갔을 때 폭발한다. 시안이 없으면 단순 SVG로라도 구조를 잡고, "디자인 시안 나오면 이 자리에 끼워 넣을 수 있어요"라고 명시.

---

## 자동 채움 / 빨간 메모 표시

- 사용자 답변 없이 default로 채운 항목은 **`auto_filled: true`**.
- 미해결 이슈 / 의사결정 필요 / TODO 는 **`open_questions: [...]`** 배열에. IA 다이어그램·화면 상세 페이지에서 모두 **빨간 텍스트** 로 자동 렌더된다 (보내주신 첫 이미지의 "MVP 때 스토어가 없다면..." 메모와 동일 형태).

---

## 자주 빠뜨리는 항목 체크리스트 (산출 직전 확인)

- 표지에 **버전·작성자·작성일** 다 들어갔는가
- 개정 이력에 v0.1 최소 1줄이라도 있는가
- IA에 **로그인 미인증 분기 / 권한 거부 / 첫 방문 분기** 가 표현됐는가
- 화면 상세 페이지마다 **에러 / 빈 상태 / 로딩** 처리가 명시됐는가
- Validation 메시지 표에 **계정 잠금 / 기기 변경 / 네트워크 오류** 같은 시스템 케이스가 빠지지 않았는가
- 카테고리 색상·범례가 IA 페이지에 표시됐는가

---

## 참고 파일

- `references/interview_flow.md` — 단계별 인터뷰 스크립트 + 안티패턴
- `references/document_schema.md` — 전체 storyboard JSON 스키마 (단일 진실 공급원)
- `references/ia_diagram_spec.md` — IA 박스+화살표 표준, 카테고리 색상 팔레트
- `references/screen_detail_spec.md` — 화면 상세 페이지 5분할 레이아웃 표준
- `references/component_states.md` — 컴포넌트 상태 변형 표준 프리셋
- `references/output_formats.md` — PPTX 슬라이드 마스터 / Markdown 포맷
- `assets/component_state_presets.json` — 표준 상태 프리셋 데이터
- `assets/example_storyboard.json` — 완성 예시 (3박스 IA + 화면 상세 1장)
- `scripts/generate_ia_diagram.py` — IA 다이어그램 SVG 생성기
- `scripts/generate_wireframe.py` — 화면 목업 fallback (이미지 없을 때만)
- `scripts/build_storyboard_pptx.py` — 통합 PPTX 빌더
- `scripts/build_markdown.py` — Markdown 보조 빌더
