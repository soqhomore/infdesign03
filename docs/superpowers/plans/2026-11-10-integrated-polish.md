# 면접 흐름 안정화와 행복버튼 반응 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. 사용자가 자리를 비운 동안 자율적으로 진행하도록 요청했으므로 별도 승인 대기 없이 현재 작업 폴더에서 실행한다.

**Goal:** 버그를 우선 수정하고 과제의 A×B 메시지를 검토한 뒤, 행복버튼 이후 실제 3D 카메라·면접관 반응과 기존 UI의 완성도를 높인다.

**Architecture:** 기존 /local/ Three.js 장면과 다회 면접/여정 이벤트를 유지한다. 독립된 카메라 반응 컨트롤러를 stage에 연결하고 인물 동작 컨트롤러에 유한한 상체 반응을 합성한다. 데이터·인용 원본은 수정하지 않는다.

**Tech Stack:** Three.js 0.187, vanilla JS/CSS, Node test runner.

**Spec:** 사용자 2026-11-10 요청 및 HANDOFF.md 최신 확정 흐름, handoff/PROJECT_CONTEXT.md.

## Global Constraints

- 공개 / 및 /interview.html 점검 화면 유지, 푸시/배포 없음.
- 문밖 선택→다회 면접→행복버튼→내 답변 이후 발끈→퇴장→작은 성취→크레딧 유지.
- B 자료 다양성을 전달하고 전체 비율/순위로 과장하지 않는다. A는 면접 가이드 예시이며 동일인의 거짓말/속마음 판정이 아니다.
- Pretendard/차이상승체, 행복 이후 Bithumb Original 유지. 인물별 기본/카피바라/사진 전체 판 유지.
- 외부 다운로드·유료 TTS 도입 없이 기존 자원 사용. 실제 실행되는 3D를 개선한다.
- 동작 줄이기/탭 숨김/메뉴/공간·얼굴 편집에서는 움직임을 멈추고 정상 복귀한다.

## Review Focus

- 메뉴·편집 종료 순서가 겹쳐도 입력과 세션을 유지하며 실제 일시정지 상태와 일치한다.
- 오래 숨긴 탭에 복귀할 때 카메라/인물 시간 점프가 없다.
- 행복버튼 직후는 카메라 충격만, 사용자 반박 이후 인물 분노가 커진다.
- 카메라/상체 변형이 누적되지 않고 종료·초기화·공간 보기 때 원상복구한다.
- 작은 화면에서도 선택 문장·답변·대사와 행복버튼이 겹쳐 읽지 못하는 상태를 줄인다.

### Task 1: 버그·과제 검토

- [x] 기존 테스트를 기준으로 상태 전환 코드와 실사용 경로를 읽기 전용 독립 리뷰한다.
- [x] 확인된 버그는 실패하는 회귀 검사 후 최소 수정한다. 가정뿐인 변경은 제외한다.
- [x] 과제의 메시지/데이터/불필요 정보/도전성 검토 결과를 짧은 보고서에 기록하고 작은 개선만 반영한다.

### Task 2: 행복 이후 3D 반응

**Files:** assets/demo/camera-drama.js (new), local/stage.js, scene.js, characters.js, camera-drama.test.js (new), happiness-drama.test.js.

**Interfaces:** createCameraDrama({camera,reducedMotion}) returns setState(state), update(time,{paused}), suspend(), reset(), setReducedMotion(boolean). 실제 기본 카메라 위치/quaternion/fov를 보존하고 유한 recoil/shake/dolly를 합성한다. characters의 upperRoot는 몸통/팔/머리 묶음으로 기존 배치를 보존하며 낮은 부분은 고정한다.

- [x] 카메라 중립/단발 충격/반박 단계/정지/초기화/누적 방지 회귀를 먼저 실패시킨다.
- [x] camera-drama를 만들고 stage.update와 장면 motion preference에 연결한다. 문밖/엔딩 카메라는 건드리지 않는다.
- [x] 상체 그룹 및 유한 lean/몸짓을 합성한다. 분노 단계0은 기존 자세, 단계별로 몸짓이 커지고 4초 안에 안정된다.
- [x] CPU 행렬·BoundingBox와 기존 시선/사진/소동작 검사를 확인한다.

### Task 3: UI·3D 마감

- [x] 기존 방/침구/가구의 큰 구조를 유지하고 확인 가능한 재질·접촉·빛 개선만 한다.
- [x] 문밖 글자 블록/선택 문장/몰입 답변창/크레딧을 같은 타이포·여백 규칙으로 정리한다. 장식용 새 대시보드나 긴 설명은 추가하지 않는다.
- [x] 키보드 포커스, 모바일/짧은 화면, 모션 줄이기와 입력 가림을 점검한다.

### Task 4: 검증·인계

- [x] npm run check, npm test 전체 통과 및 독립 최종 리뷰를 완료한다.
- [x] 실제 브라우저 실행을 시도하고 실패하면 실제 WebGL/음향 외관 미검증임을 명시한다.
- [x] 변경·근거·검증 한계를 보고서 및 최신 HANDOFF/README/PROJECT_CONTEXT/MANIFEST에 기록한다.

## 실행 기록

- 기존 폴더에서 구현. 사용자 부재 중 자율 진행 지시에 따라 승인 대기·자동 커밋은 하지 않음.
- 버그/주제 읽기 전용 리뷰 후 확인된 마이크·전환·공간 소리 문제를 수정. 후기 최종 답변 즉시 퇴장도 재현/수정.
- 카메라 모듈을 local/ 대신 assets/demo/에 둠: 서버 화이트리스트 재시작 없이 정적 모듈을 제공하기 위한 판단.
- 자료 창을 정리하되 본 면접에 새 안내 패널이나 원문 추천 답변 자동 전송을 넣지 않음. 최소 UI와 기존 확정 흐름 보존.
- 독립 리뷰의 AO/가이드 분류 지적을 RED→GREEN 회귀 검사 후 보완.
- npm run check, npm test 106개, lifecycle smoke 3시나리오 통과. 실제 WebGL/음향은 브라우저 실행 제약으로 미검증.
- 상세 실행 기록과 한계는 docs/reviews/2026-11-10-integrated-polish.md에 보존.
