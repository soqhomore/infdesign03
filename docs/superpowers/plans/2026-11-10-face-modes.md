# 면접관 얼굴 세 가지 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline.

**Goal:** 기본 가면·카피바라 마스크·사용자 사진 중에서 선택해 같은 3D 면접을 진행한다.
**Architecture:** 각 인물의 headRoot를 유지하고 그 안의 입체 얼굴만 교체한다. 기본값은 모두 회백색 가면이다. 내 사진은 머리카락·별도 안구 없는 완만한 곡면 가면에 투영하며 기존 로컬 눈 정렬 UI를 사용한다. 얼굴 메뉴에서 면접관별 선택을 제공한다.
**Tech Stack:** 기존 Three.js·DOM·Canvas. 추가 자산/패키지 다운로드 없음.
**Spec:** 사용자 승인: 기존 제안 가면 + 가능하면 카피바라 마스크 + 직접 넣은 사진 중 선택. 구현자 판단: 사진을 기존 개인 두상 대신 무표정 곡면 가면에 투영해 두상/헤어 불일치를 줄인다.

## Global Constraints
- 공개 점검 페이지와 방·카메라·조작·다회 대화 상태 유지. 푸시/배포 없음.
- 실제 입체 마스크, 외부 이미지/평면 인물로 공간을 대체하지 않음.
- 사진은 브라우저 메모리에서만 처리. 적용 사진은 모드 왕복 시 유지, 초기화/새로고침 때 제거.
- 기본과 카피바라는 사진이 없어도 즉시 적용. 사진 모드는 업로드 완료 전 기존 얼굴 유지.
- 행복버튼 직후가 아닌 다음 반박 응답부터 기존 고개 반응과 가면 눈썹 반응.
- unrelated b-social 데이터 수정 없음.

## Review Focus
- 기본에서 실사 얼굴·머리카락·사진이 보이지 않음.
- 모드 왕복과 초기화가 다른 면접관·대화·headRoot 자세를 변경하지 않음.
- 사진 읽기 도중 모드/면접관 전환·닫기가 늦은 결과를 적용하지 않음.
- 사진 적용 시 가면 앞면에만 노출하고 텍스처 교체/초기화 때 해제.
- 기존 정지 화면 무효화·그림자 갱신·정적 서버 모듈 제공 유지.

### Task 1: 입체 얼굴과 모드 상태
- [x] mode switching / photo-required / per-person isolation / stable headRoot 실패 테스트 실행.
- [x] characters.js 기본·카피바라·곡면 사진 가면 제작과 모드 controller 구현.
- [x] 기본 사진 자동 투영 제거, 얼굴 표현/재질과 기존 몸체 연결.

### Task 2: 선택 UI와 대화
- [x] face-editor.test.js 사진 대기 중 모드 전환 취소 및 다시 선택 테스트 실패 확인.
- [x] face-editor.js/css 세 선택지와 사진 전용 조절 UI 연결, 기본 초기화 안내 갱신.
- [x] local/stage.js 감정 반응 및 local/room.html 메뉴 문구 연결. 세션 유지.

### Task 3: 검증과 기록
- [x] npm run check, npm test. CPU 정면/측면 형태 확인 및 가능한 브라우저 검증.
- [x] 독립 코드 리뷰와 발견한 주요 오류 수정.
- [x] HANDOFF/README/출처/검증 JSON/MANIFEST 갱신.

## 작업 기록
- 사용자 요청과 앞선 기본 가면 설명을 승인된 범위로 삼고 추가 확인 없이 원본 폴더에서 진행한다.
- Git/공개 배포는 현재 작업 범위가 아니며 커밋하지 않는다.

## 검증 기록

- Task 1 RED: createFaceController 없음 / face.setMood 없음 → GREEN 2개.
- Task 2 RED: face-photo-panel 없음 → GREEN 기존 포함 12개.
- 독립 리뷰: 핵심 제어/수명/그림자 경로 차단 오류 없음. 반복 사진 적용의 알파 누적을 발견했다.
- Final: Ruling: 사진 경계 누적은 반복 적용으로 외형을 바꾸는 오류여서 이번 사진 품질 개선 범위의 주요 회귀로 처리했다. 재현 0.75 vs 0.5 RED → 미리보기 clearRect 후 원본 그리기로 GREEN.
- npm run check + npm test: 45/45 통과. CPU 정면·측면 점검. CUA 실제 브라우저 호스트 unavailable, completion summary로 종료.
- 브라우저 미검증 상태를 실제 시각 품질 승인으로 바꾸지 않는다. 커밋/푸시/배포하지 않았다.
