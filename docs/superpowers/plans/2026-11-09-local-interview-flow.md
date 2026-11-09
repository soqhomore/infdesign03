# 로컬 다회 면접 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 공개 점검 화면을 유지하며 /local/에서 실제 3D 면접실과 기존 다회 대화를 한 흐름으로 연결한다.
**Architecture:** 기존 interview-service.js/인터뷰 클라이언트를 재사용한다. 클라이언트가 발행하는 턴·음성 상태를 3D 장면 연결 모듈이 받고, 원래 단일 질문 게임과 로컬 대화 모드는 진입 HTML의 data 속성으로 선택한다.
**Tech Stack:** 기존 Three.js, Node HTTP, Web Speech. 새 패키지 없음.
**Spec:** 사용자 확정: 여러 턴·음성/입력·행복버튼 후 내 말에 발끈하는 면접관. 최신 사용자 요청: 공개 점검 화면 유지, 로컬에서 한 면접 흐름으로 진행.

## Global Constraints

- /와 /interview.html의 점검 문구를 유지한다. 푸시·배포하지 않는다.
- 공간·카메라·사진 교체와 성능 최적화를 보존한다.
- 가운데 인물 한 명이 대화한다. 3인 AI·정밀 표정·립싱크·새 파괴 게임을 임의로 추가하지 않는다.
- 정상 답변 2회 뒤 행복버튼, 이후 다음 답변부터 반응한다. 기존 5/4회 제한은 유지한다.
- 실제 AI·로컬 규칙 대사를 구분한다. 사진은 로컬, AI 답변은 기존 안내에 따라 전송한다.
- 미추적 handoff/data/b-social-20261109/는 별도 사용자 작업으로 보고 수정하지 않는다.

## Review Focus

- 버튼만 눌러서는 인물이 먼저 화내지 않음.
- 음성의 늦은 종료 이벤트가 다음 턴/새 면접의 상태를 덮어쓰지 않음.
- 둘러보기/얼굴 교체/원위치 복귀에도 같은 대화 세션이 이어짐.
- /local/에서 절대 경로로 모듈·재질을 로드함. 점검 페이지는 스크립트를 로드하지 않음.
- 로컬 UI를 끈 서버에서는 /local/* 제공 안 함.

### Task 1: 로컬 진입·클라이언트 이벤트

- [x] HTTP 로컬 경로/공개 점검 유지/로컬 UI 해제 테스트를 실패시킨다.
- [x] local/room.html, local/conversation.css를 만들고 서버의 명시적 로컬 경로만 연결한다.
- [x] 기존 클라이언트에 텍스트 내용 없는 상태 이벤트와 음성 세대 보호를 추가하고 테스트한다.

### Task 2: 3D 장면 연결

- [x] local/stage.js의 반응 시점 정책을 실패 테스트로 확인한다.
- [x] scene.js가 로컬 모드에서는 기존 단일 질문 UI 대신 대화 연결 모듈을 쓴다.
- [x] 가운데 인물 자세·빛·음성 표시와 공간 보기/복귀·얼굴 설정을 연결한다.

### Task 3: 검증·인계

- [x] npm run check, npm test 및 독립 리뷰.
- [x] 가능한 실제 브라우저 검증. 불가 시 한계를 명시한다.
- [x] README/HANDOFF/CONTEXT/MANIFEST 및 검증 기록 갱신. 로컬 실행 안내 제공.

진행 결과: 37개 테스트 및 독립 리뷰 완료. 리뷰의 game.css 충돌과 늦은 음성 재생 경합을 수정했다. 실제 브라우저는 호스트 연결 불가로 확인하지 못했다. npm run dev는 별도 4175 서버로 실행했고 lsof로 리스닝 확인. 미추적 사용자 데이터는 건드리지 않았다.
