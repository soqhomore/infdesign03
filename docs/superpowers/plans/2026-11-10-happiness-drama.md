# 행복버튼 충격과 분노 누적 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline.

**Goal:** 행복버튼 순간의 화면 충격과, 다음 사용자 말에 대한 면접관의 점점 붉고 강한 부들거림을 구현한다.
**Architecture:** local/stage.js가 확정된 정상→전환 이벤트에 CSS 충격을 1회 재생하고 angryTurns/4로 분노 단계를 전달한다. characters.js가 얼굴의 열감·표정·부들거림을 기존 시선/소동작/발끈 자세와 합성한다. CSS 충격은 기존 카메라/입력 좌표를 변경하지 않고 화면 컨테이너를 잠깐 변형한다.
**Tech Stack:** 기존 DOM/CSS/Three.js. 새 다운로드/패키지/서버 재시작 없음.
**Spec:** 사용자 요청 '행복버튼 누를 때 내 화면 흔들림, 면접관이 갈수록 부들거림·얼굴 붉어짐 등 극적인 연출'. 구현자 선택: 가운데가 가장 강하고 양옆은 약하게 동조. 얼굴 열감은 유지하며, 부들거림은 답변당 약2→4초의 유한 burst로 성능을 보존한다.

## Global Constraints
- 버튼 자체에 선제적으로 화내는 대사/표정을 넣지 않는다. 첫 반박 응답부터 분노 누적.
- 기본 가면/카피바라/내 사진 모두 붉어짐. 사진은 shader에서 원래 특징을 유지하며 따뜻하게 물들인다.
- 얼굴 편집 중 동작 정지, reduced-motion에서는 화면/인물 떨림 제거. 정적 열감/표정 유지.
- 초기화 시 열감·부들거림·화면 충격·주변 색 복원. 얼굴 선택과 대화 이력은 기존 규칙 유지.
- 공개 점검 화면·방·카메라·조작 유지, 푸시/배포 없음. unrelated b-social 자료 수정 없음.

## Review Focus
- 클릭 중복/다음 답변마다 충격이 무한 재시작되지 않음.
- 다음 반박 전에는 열감과 분노 떨림이 0, 단계가 올라갈수록 증가.
- 얼굴 선택/사진 적용/복원으로 열감이 유실되거나 사진 원본 자체가 변경되지 않음.
- 떨림 종료/초기화/동작 줄이기 시 자세가 누적되지 않고 static frame로 돌아감.
- 카메라 원본을 수정하지 않고 읽기/입력 UI가 계속 사용 가능함.

### Task 1: 단계와 회귀 테스트
- [x] stageAnger 단계/확정 전환 충격 1회, controller heat/떨림 증가/정지 복원 RED 확인.

### Task 2: 얼굴과 동작
- [x] 얼굴 재질/사진 shader 열감과 표정 누적.
- [x] 중앙/양옆 유한 부들거림을 기존 motion controller에 합성.

### Task 3: 버튼 연출과 연결
- [x] stage에 충격 class/분노 단계, CSS 화면 떨림·빛의 고리·주변 열감.
- [x] 초기화/편집/reduced-motion과 기존 시선/반응 유지.

### Task 4: 검증·인계
- [x] npm run check, npm test, CPU 열감/형상 검증, 가능한 브라우저 확인.
- [x] 독립 코드 리뷰 및 주요 오류 수정, HANDOFF/README/MANIFEST/검증 JSON 갱신.

## 검증 기록

- RED: stageAnger/setAnger 없음 → 기본 단계·모든 얼굴 열감·떨림 테스트 GREEN.
- 일반 가면 눈썹의 -0 회귀를 0으로 정리. 유한 떨림 종료 시 마지막 base pose를 적용하도록 settle 상태 명시.
- 독립 리뷰 P1: client가 버튼을 숨긴 뒤 stage가 rect를 읽어 충격 원점이 좌상단이 되는 오류. 실제 렌더 순서의 hidden rect=0을 대역에 반영해 RED(0px vs1145px, impact undefined), 숨기기 전 좌표 보존/이벤트 전달 및 별도 버튼 잔상으로 수정 GREEN.
- 최종 npm run check / npm test:53/53. 전체 정적 서버/대화/사진/시선 회귀 포함.
- CPU 단계별 색·표정 이미지 확인. 실제 브라우저 호스트 unavailable로 WebGL/CSS 움직임·강도 미검증.
- 커밋/푸시/배포하지 않음.
