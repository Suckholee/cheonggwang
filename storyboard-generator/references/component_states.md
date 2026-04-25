# 컴포넌트 상태 변형 표준 프리셋

화면 상세 페이지 좌측 stack에 들어가는 컴포넌트 상태 변형의 표준 프리셋 카탈로그.

전체 데이터는 `assets/component_state_presets.json`에 있고, 본 문서는 사용 가이드 + 프리셋 ID 일람.

---

## 사용 방법

```json
"component_states": [
  {"preset_id": "input_basic",       "label": "기본 입력 박스"},
  {"preset_id": "input_focused",     "label": "포커스 인 상태"},
  {"preset_id": "input_typing_email","label": "이메일 입력 시"},
  {"preset_id": "input_masked",      "label": "비밀번호 마스킹"},
  {"preset_id": "input_valid",       "label": "Valid"},
  {"preset_id": "input_invalid",     "label": "Invalid + 에러 메시지"}
]
```

`preset_id`만 있으면 `assets/component_state_presets.json`의 정의(SVG 미니어처)를 그대로 쓴다. 라벨을 따로 정의해 사용자 화면 맥락에 맞게 바꿀 수 있다.

표준에 없는 상태가 필요하면 `inline` 프리셋 사용:

```json
{"label": "토글 켜진 상태",
 "inline": {
   "kind": "toggle",
   "state": "on",
   "color": "#10B981"
 }}
```

---

## 입력박스 (input_*)

| Preset ID | 라벨 권장 | 설명 |
|-----------|-----------|------|
| `input_basic` | 기본 입력 박스 | placeholder 텍스트만 보임 |
| `input_focused` | 포커스 인 상태 | 하단 라인 강조색 + 커서 깜빡임 표시 |
| `input_typing_email` | 이메일 입력 시 상태 | 부분 입력 + 우측 X(클리어) 아이콘 |
| `input_typing_text` | 텍스트 입력 시 상태 | 일반 텍스트 입력 진행 중 |
| `input_masked` | 입력 텍스트 숨김 시 | 비밀번호 ●●● + 표시 토글 아이콘 |
| `input_unmasked` | 입력 텍스트 노출 시 | 비밀번호 평문 + 가리기 토글 |
| `input_valid` | 포커스 아웃 - Valid | 하단 라인 파랑(#3B82F6) + ✓ 아이콘 |
| `input_invalid` | 포커스 아웃 - Invalid | 하단 라인 빨강(#DC2626) + 에러 메시지 |
| `input_disabled` | 비활성화 | 회색 채움 + 흐린 텍스트 |
| `input_filled_locked` | 입력 완료/잠김 | 값 채워짐 + 자물쇠 아이콘 |

---

## 버튼 (button_*)

| Preset ID | 라벨 권장 | 설명 |
|-----------|-----------|------|
| `button_default` | 기본 버튼 | 기본 활성 상태 |
| `button_disabled` | 비활성 버튼 | 회색 채움 |
| `button_hover` | Hover 상태 | 약간 어두운 채움 |
| `button_active` | Pressed | 더 어두운 채움 + 약간 안쪽 그림자 |
| `button_loading` | 로딩 중 | 가운데 스피너 |
| `button_success` | 완료 | 체크 아이콘 + 초록 |

---

## 링크 (link_*)

| Preset ID | 설명 |
|-----------|------|
| `link_default` | 기본 (밑줄 없음) |
| `link_hover` | hover (밑줄 표시) |
| `link_visited` | 방문한 링크 (보라) |

---

## 토글/체크박스/라디오

| Preset ID | 설명 |
|-----------|------|
| `toggle_off` / `toggle_on` | 토글 스위치 |
| `checkbox_unchecked` / `checkbox_checked` / `checkbox_indeterminate` | 체크박스 |
| `radio_unselected` / `radio_selected` | 라디오 버튼 |

---

## 카드 / 리스트 아이템

| Preset ID | 설명 |
|-----------|------|
| `card_default` | 기본 카드 |
| `card_hover` | Hover 시 (약간 elevation 증가) |
| `card_selected` | 선택됨 (테두리 강조) |
| `list_item_unread` | 읽지 않은 항목 (좌측 점) |
| `list_item_read` | 읽은 항목 |

---

## 모달 / 팝업

| Preset ID | 설명 |
|-----------|------|
| `modal_alert` | 단순 안내 (제목 + 본문 + 확인) |
| `modal_confirm` | 확인/취소 2버튼 |
| `modal_input` | 입력 필드가 있는 모달 |
| `toast_info` | 정보 토스트 |
| `toast_success` | 성공 토스트 |
| `toast_error` | 에러 토스트 |

---

## 빈 상태 / 로딩 / 에러

| Preset ID | 설명 |
|-----------|------|
| `empty_default` | 빈 상태 (일러스트 + 안내 + CTA) |
| `loading_skeleton` | 스켈레톤 로딩 |
| `loading_spinner` | 가운데 스피너 |
| `error_network` | 네트워크 에러 (재시도 버튼) |
| `error_404` | 페이지 없음 |
| `error_permission` | 권한 거부 |

---

## 권장 셋업 (화면 유형별)

화면 유형별로 권장 상태 셋을 추천하면 사용자가 고르기 쉽다:

**로그인/회원가입 화면**
```
input_basic, input_focused, input_typing_email,
input_masked, input_valid, input_invalid
```

**리스트 화면**
```
loading_skeleton, list_item_unread, list_item_read,
empty_default, error_network
```

**상세 화면**
```
loading_spinner, card_default, card_selected,
button_default, button_disabled, error_404
```

**작성/입력 폼 화면**
```
input_basic, input_focused, input_valid, input_invalid,
button_disabled, button_default, modal_confirm
```

스킬은 화면 카테고리(또는 사용자가 답한 화면 종류)에서 추천 셋을 자동 제시하고, 사용자가 추가/제거하게 한다.
