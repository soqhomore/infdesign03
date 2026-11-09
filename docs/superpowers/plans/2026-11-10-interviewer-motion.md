# 면접관 시선과 간헐 움직임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline.

**Goal:** 세 면접관이 같은 지원자 위치를 보고 각자 간헐적으로 작게 움직인다.
**Architecture:** characters.js가 초기 고개 위치와 지원자 목표점으로 시선·작은 움직임·중앙 발끈 자세를 합성한다. stage는 기분만 전달하고 headRoot를 중복 덮어쓰지 않는다. scene의 기존 렌더 스케줄 앞에서 동작을 갱신해 바뀐 프레임과 그림자만 다시 그린다.
**Tech Stack:** 기존 Three.js/RAF. 새 모듈/자산/서버 재시작 불필요.
**Spec:** 사용자 요청 '세 명 전부 나를 쳐다보고 간헐적으로 조금씩 움직임'. 구현자 선택: 지원자는 기존 homePosition=(0,1.25,3.42)에 고정. 방을 둘러볼 때 추적 카메라를 따라 목을 돌리지 않는다. 작은 끄덕임·기울임·시선 재정렬, 각자 5~10초 휴지/약2초 움직임, 동작 구간 최대24fps.

## Global Constraints
- 방·카메라·몸체·세 가지 얼굴 선택·면접 세션·공개 점검 유지. 푸시/배포 없음.
- 기존 발끈 반응은 다음 사용자 말부터 유지. 중복 head transform writer 제거.
- 탭 숨김/얼굴 편집 중 시간 점프 방지. reduced-motion에서는 정적 시선/감정 자세만 유지.
- 움직임 없는 시간에는 계속 GPU 렌더/그림자 갱신하지 않음.
- unrelated b-social 데이터 수정 없음.

## Review Focus
- 양옆 얼굴의 +Z 전방이 지원자에게 실제 향함. 사진/카피바라에서도 같은 root 적용.
- 서로 동기화되거나 계속 진동하지 않음. 작은 각도와 원래 목 위치를 유지.
- 시간 누적/탭 복귀/편집 중 멈춤 때 자세가 튀지 않음.
- 중앙 발끈 자세와 idle이 충돌하거나 누적되지 않음.
- 최종 동작 프레임에서 원래 시선을 복원하고 still render를 다시 멈춤.

### Task 1: 시선과 동작 컨트롤러
- [x] 지원자 주시, 비동기 소동작/정지구간, pause/reduced-motion, 감정 합성 테스트 RED 확인.
- [x] characters.js에 createInterviewerMotion 및 face controller update/mood 위임 구현.

### Task 2: 실제 장면 연결
- [x] local/stage.js 실제 controller는 감정만 전달, 기존 test double/legacy fallback 유지.
- [x] scene.js 렌더 전 motion update, 바뀐 프레임/그림자만 갱신. 얼굴 편집 open 노출.

### Task 3: 검증·인계
- [x] npm run check, npm test 및 실제 시선/시간 수치 점검.
- [x] 가능한 브라우저/CPU 형태 확인, 독립 코드 리뷰.
- [x] 검증 JSON/HANDOFF/README/MANIFEST 갱신.

## 검증 기록

- RED: createInterviewerMotion 없음으로 3개 실패. 구현 후 GREEN.
- 전체 npm run check / npm test: 48개 통과. 시선 방향/독립 동작/정지구간/크기 제한/일시정지/시간 간격 제한/동작 줄이기/감정 누적 방지 검증.
- 독립 리뷰에서 차단 오류 없음. 모델 로딩 중 OS 설정 변경의 작은 경합은 생성 직후 현재값 재적용으로 보완.
- 실제 hidden 이벤트 검증으로 과장하지 않도록 테스트명/기록을 컨트롤러 일시정지와 시간 간격 검증으로 좁혔다.
- CPU 정면 형상 확인. 실제 브라우저 호스트 불가이며 실제 GPU·움직임 외관 미검증.
- 이번 작업은 원본 폴더에서 수행, Git commit/push/배포 없음.
