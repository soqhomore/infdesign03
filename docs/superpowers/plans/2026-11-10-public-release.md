# 공개 면접 체험 연결 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. 사용자 ‘진행해 줘’로 공개 점검 해제와 게임 연결을 승인했다. 기존 공개 점검 유지 지침은 이번 요청으로 대체된다.

**Goal:** infdesign03.vercel.app의 첫 화면에서 기존 3D 면접 여정이 시작되고 정적 Vercel 환경에서도 끝까지 대화할 수 있도록 공개한다.

**Architecture:** 현재 Node 대화 서버는 로컬 API/메모리 세션이다. 공개 버전은 기존 준비 대사 규칙을 공용 순수 모델로 추출해 브라우저 메모리에서 실행한다. 로컬 AI/API 경로는 유지하며 공개 체험은 AI 사용으로 표시하지 않는다. 배포 산출물 dist에 실행 파일만 명시적으로 복사한다.

**Spec:** 최신 사용자 공개 연결 승인 및 기존 HANDOFF의 게임 흐름.

**Tech Stack:** vanilla JS, Three.js, Node build/test runner, Vercel static.

## Constraints and review focus

- 실제 면접·행복버튼·사진 교체·엔딩·출처·음성 흐름 유지. 공개 페이지에 API 키 입력 UI를 추가하지 않는다.
- 공개 준비 대사는 AI 미사용으로 명시한다. 로컬 AI 모드를 조용히 대체하지 않는다.
- 공개 답변/상태는 브라우저 메모리에만 보존하고 서버로 보내지 않는다(브라우저 음성 인식의 서비스 처리는 기존 안내).
- Node 서버 소스/.env/수집 원본/문서/node_modules를 산출물에 넣지 않는다.
- 두 번 답변 후 버튼 → 다음 반박부터 분노 → 4회 뒤 종료를 실제 클라이언트 계약과 함께 검사한다.
- 기존 /local/은 로컬 서버 API를 사용한다. 정적 공개 산출물의 /local/·/interview.html도 공개 체험으로 연결한다.

## Tasks

- [x] 준비 대사 규칙을 assets/demo/interview-model.js에 추출한다. Node의 limits export와 동작을 보존한다.
- [x] assets/demo/browser-interview.js의 createBrowserInterview({now}) request(path,{method,data,signal})를 구현한다. 모드 검증/중복요청/문자수/만료/종료/세션 격리를 검사한다.
- [x] assets/demo/public-interview.js가 브라우저 transport를 준비한 뒤 interview.js를 실행하도록 한다. 공개 클라이언트가 fetch 없이 면접을 끝내는 회귀를 확인한다.
- [x] scripts/build-public.mjs: local/room.html을 공개 entry로 변환해 root index/interview와 dist를 생성하고 runtime allowlist만 복사한다. vercel.json의 npm run build/dist/Other를 명시한다.
- [x] 기존 서버 root 테스트를 공개 화면 기대값으로 변경하고 로컬 API 회귀를 보존한다.
- [x] npm run check, npm test, npm run build, 산출물 의존 경로/비공개 파일 제외를 검사한다. 독립 리뷰 후 커밋·푸시를 시도한다.
- [x] 실제 배포 확인은 성공한 원격 푸시/빌드 확인에 근거해서만 보고한다. DNS/브라우저/인증 제한은 분리해 기록한다.

## 실행 기록

- 공개 버전의 준비 대사 선택은 구현자 판단이며 사용자에게 작업 중 명시했다. 실시간 공개 AI는 이번 범위에 추가하지 않았다.
- npm run build / check / test 112개, lifecycle smoke 3시나리오 및 독립 리뷰 완료.
- 원격 DNS/브라우저 호스트 제약으로 실제 배포는 아직 검증하지 못함. 커밋·푸시 시도의 결과는 최종 답변을 따른다.
