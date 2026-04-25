# Storyboard Document JSON 스키마

스토리보드 문서 한 권은 **하나의 JSON**으로 표현된다. 모든 산출물(PPTX, MD, IA SVG, Wireframe SVG)은 여기서 파생된다.

---

## 최상위 구조

```json
{
  "meta": { ... },
  "revision_history": [ ... ],
  "ia": {
    "categories": [ ... ],
    "boxes":      [ ... ],
    "connections":[ ... ],
    "legend_position": "top_right"
  },
  "screens": [ ... ]
}
```

---

## `meta`

```json
"meta": {
  "title": "월렛지기 v0.1 스토리보드",
  "service": "월렛지기",
  "version": "0.1",
  "platform": "mobile_app",
  "client": "(주)데모",
  "author": "OOO / UX팀",
  "created_at": "2026-04-25",
  "purpose": "개발 착수"
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| `title` | string | 표지 큰 제목 |
| `service` | string | 서비스명 |
| `version` | string | "v0.1" 형식 권장 |
| `platform` | enum | `mobile_app` / `responsive_web` / `desktop_web` / `multi` |
| `client` | string? | 발주처/클라이언트명, 없으면 생략 |
| `author` | string | 작성자 / 팀 |
| `created_at` | string | YYYY-MM-DD |
| `purpose` | string | 개발 착수 / 디자이너 핸드오프 / 클라이언트 보고 / 내부 검토 |

---

## `revision_history`

표지 다음 슬라이드(개정 이력)에 표 형태로 들어간다.

```json
"revision_history": [
  {"version": "0.1", "date": "2026-04-20", "author": "OOO", "summary": "초안 작성"},
  {"version": "0.2", "date": "2026-04-25", "author": "OOO", "summary": "로그인 화면 상세 추가"}
]
```

---

## `ia` — 사이트맵 / IA 흐름도 데이터

### `ia.categories`

박스 색상 분류. 사용자 정의.

```json
"categories": [
  {"id": "auth",   "name": "진입/계정", "color": "#F59E0B"},
  {"id": "main",   "name": "메인",     "color": "#FACC15"},
  {"id": "extra",  "name": "부가기능", "color": "#9CA3AF"},
  {"id": "config", "name": "설정·관리","color": "#94A3B8"}
]
```

### `ia.boxes`

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
    ]},
    {"no": 4, "label": "입출금내역", "subitems": ["전체 입출금내역 조회", "내역상세"]}
  ],
  "open_questions": [
    "MVP 때 스토어가 없다면 스토어 대신 마이너 관리 페이지를 위치?"
  ],
  "auto_filled": false,
  "row": 2,
  "col": 3
}
```

| 필드 | 필수 | 비고 |
|------|------|------|
| `id` | ✅ | `B<NN>_<name>` 또는 `M<NN>_<name>` |
| `title` | ✅ | 박스 헤더 텍스트 |
| `category` | ✅ | `categories[].id` 중 하나 |
| `items` | ✅ | 박스 안 번호 항목들 |
| `items[].no` | ✅ | 1부터 시작 |
| `items[].label` | ✅ | 1차 항목 텍스트 |
| `items[].subitems` | ◯ | 들여쓰기 불릿 (string[]) |
| `open_questions` | ◯ | 빨간 메모로 표시될 질문/이슈 |
| `auto_filled` | ◯ | true면 산출물에서 시각적 구분 |
| `row` / `col` | ◯ | IA 다이어그램 그리드 좌표 (없으면 자동 배치) |

### `ia.connections`

```json
"connections": [
  {"from": "B01_스플래시",  "to": "B02_튜토리얼"},
  {"from": "B02_튜토리얼",  "to": "B03_로그인"},
  {"from": "B03_로그인",    "to": "B04_비밀번호찾기", "label": "비번 분실", "style": "secondary"},
  {"from": "B03_로그인",    "to": "B05_홈메인", "style": "primary"}
]
```

| 필드 | 필수 | 비고 |
|------|------|------|
| `from` | ✅ | 출발 박스 id |
| `to` | ✅ | 도착 박스 id |
| `label` | ◯ | 화살표 옆 텍스트 |
| `style` | ◯ | `primary`(굵음) / `secondary`(얇음) / `dashed` |

---

## `screens` — 화면별 상세 페이지

```json
{
  "id": "SCR_LOGIN",
  "linked_box_id": "B03_로그인",
  "path": "진입 > 로그인",
  "title": "로그인 페이지",
  "section_no": 5,
  "section_title": "와이어프레임 & 기능 디스크립션",

  "main_mockup": {
    "kind": "image",
    "path": "assets/uploads/login_screen.png",
    "annotations": [
      {"marker": "1", "kind": "number",   "x": 0.32, "y": 0.42, "ref": "F1"},
      {"marker": "2", "kind": "number",   "x": 0.32, "y": 0.52, "ref": "F2"},
      {"marker": "A", "kind": "letter",   "x": 0.50, "y": 0.66, "ref": "B1"},
      {"marker": "B", "kind": "letter",   "x": 0.65, "y": 0.72, "ref": "B2"},
      {"marker": "C", "kind": "letter",   "x": 0.50, "y": 0.80, "ref": "B3"}
    ]
  },

  "function_descriptions": [
    {
      "id": "F1",
      "marker": "1",
      "title": "이메일 인풋 박스",
      "lines": [
        "텍스트 입력 제한 — 320자 초과 입력 막음",
        "주소 앞자리 64자 + @ + 도메인 255자 (최대 320자)",
        "영문/숫자/일부 기호('_'(언더바), '.'(마침표)) 사용 가능",
        "이메일 형식 유효성 체크: XXX@XXX.XXX"
      ]
    },
    {
      "id": "F2",
      "marker": "2",
      "title": "비밀번호 인풋 박스",
      "lines": [
        "텍스트 입력 제한 — 8자 이상의 문자/숫자/기호 입력 가능",
        "비밀번호 표시 버튼 — 입력 시 실시간 숨김 처리, 표시 버튼 클릭 시 노출",
        "Cancel 버튼은 비밀번호 표시 버튼의 좌측에 위치"
      ]
    }
  ],

  "button_descriptions": [
    {
      "id": "B1",
      "marker": "A",
      "title": "[로그인] Submit 버튼",
      "lines": [
        "이메일 및 비밀번호 인풋 박스에 유효(이메일 형식 유효성 체크)한 입력값을 입력한 경우에 로그인 버튼이 활성화됨",
        "활성화 버튼 클릭 시 — 이메일 및 비밀번호 데이터 유효성 체크 후 Invalid한 경우 관련 Validation message를 띄움",
        "로그인 정보 10회 불일치 프로세스 및 알림 표시"
      ]
    },
    {
      "id": "B2",
      "marker": "B",
      "title": "비밀번호 찾기 텍스트 링크",
      "lines": ["비밀번호 재설정 페이지로 이동"]
    },
    {
      "id": "B3",
      "marker": "C",
      "title": "[회원가입] 버튼 링크",
      "lines": ["회원가입 페이지로 이동"]
    }
  ],

  "component_states": [
    {"preset_id": "input_basic",         "label": "기본 입력 박스",            "for_marker": "1"},
    {"preset_id": "input_focused",       "label": "포커스 인 상태",            "for_marker": "1"},
    {"preset_id": "input_typing_email",  "label": "이메일의 경우, 텍스트 입력 시 상태", "for_marker": "1"},
    {"preset_id": "input_masked",        "label": "입력 텍스트 숨김 시",       "for_marker": "2"},
    {"preset_id": "input_valid",         "label": "포커스 아웃 시 - Valid 상태","for_marker": "2"},
    {"preset_id": "input_invalid",       "label": "포커스 아웃 시 - Invalid 상태","for_marker": "1"}
  ],

  "validation_table": [
    {
      "checkpoint": "2",
      "condition": "이메일 형식 오류",
      "message": "이메일 주소를 확인해주세요.",
      "display": "인풋 박스 하단 문구"
    },
    {
      "checkpoint": "4",
      "condition": "아이디(이메일)와 비밀번호 불일치 시",
      "message": "이메일 또는 비밀번호를 확인해주세요.",
      "display": "비밀번호 인풋 박스 하단에 표시"
    },
    {
      "checkpoint": "4",
      "condition": "계정 10회 불일치 시",
      "message_title": "계정 잠금 안내",
      "message": "로그인 정보 10회 불일치로 인해 계정이 잠겼습니다. 가입하신 이메일 주소로 비밀번호 재설정 안내 메일이 발송되었습니다.",
      "message_button": "확인",
      "display": "디자인 팝업"
    },
    {
      "checkpoint": "4",
      "condition": "사용 기기 변경 시",
      "message_title": "기기 변경 안내",
      "message": "최근 사용한 기기와 다릅니다. 이메일 인증을 거쳐 해당 기기를 사용하시겠습니까?",
      "message_buttons": ["아니요", "예, 변경합니다"],
      "display": "디자인 팝업"
    }
  ],

  "auto_filled": false
}
```

### `screens[].main_mockup`

| 필드 | 비고 |
|------|------|
| `kind` | `image` (사용자 업로드) / `wireframe_svg` (자동 생성 fallback) |
| `path` | `image`일 때 이미지 파일 상대경로 |
| `wireframe_layout` | `wireframe_svg`일 때 layout 배열 (스키마는 별도) |
| `annotations` | 마커 위치 배열 |
| `annotations[].x/y` | 0~1 정규화 좌표 (이미지 기준 비율) |
| `annotations[].ref` | `function_descriptions[].id` 또는 `button_descriptions[].id` 참조 |

### `screens[].component_states`

좌측 stack에 그릴 상태 변형. `preset_id`는 `assets/component_state_presets.json`에 정의된 키. 자세한 건 `component_states.md`.

### `screens[].validation_table`

우하 표. 컬럼은 고정: 체크시점 / 조건 / 메시지 / 노출유형. `message_title` + `message_buttons`가 있으면 팝업으로 시각화.

---

## 검증 규칙 (빌드 직전)

다음을 통과해야 빌드 진행:

- [ ] `meta.title`, `meta.version` 존재
- [ ] `revision_history` 최소 1줄
- [ ] `ia.categories` 모든 box의 category id가 카테고리 목록에 존재
- [ ] `ia.connections`의 모든 from/to id가 boxes에 존재
- [ ] `screens[].main_mockup.kind` ∈ {`image`, `wireframe_svg`}
- [ ] `screens[].main_mockup.annotations[].ref`가 function_descriptions / button_descriptions에 존재
- [ ] `screens[].component_states[].preset_id` 가 프리셋 카탈로그에 존재 (또는 `inline` 프리셋이면 별도 정의 필드 동반)

빌더 스크립트가 시작 시 자동 검증한다. 실패하면 어떤 화면 어떤 필드인지 명확히 알려줘라.

---

## auto_filled 표기

스킬이 사용자 답변 없이 default로 채운 모든 항목에 `auto_filled: true`. 산출물에서 다음과 같이 시각적으로 구분:

- **PPTX**: 해당 텍스트 앞에 〔자동〕 prefix + 회색 처리
- **Markdown**: 줄 앞에 `🔶`
- **IA 다이어그램 SVG**: 박스에 점선 테두리

---

## 점진 작성

인터뷰 중에는 메모리상 부분 JSON을 점점 채워가다가, 사용자가 "지금까지 저장해줘" 또는 단계 5에 도달하면 파일로 덤프한다. 비어 있는 섹션은 그대로 빈 배열/객체로 둔다 (검증은 빌드 시점에만).
