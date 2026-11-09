# 면접관 모델과 얼굴 사진 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 승인한 생성 시안의 세 면접관을 기존 3D 면접실에 배치하고 각 얼굴을 로컬 사진으로 교체한다.

**Architecture:** CC0 MakeHuman의 해부학적 머리·손 메시를 사용하고 착석 몸체·정장·머리카락을 Three.js로 구성한다. 정면 투영 얼굴 재질과 조절 가능한 사진 크롭을 분리해 사진 교체가 공간과 다른 인물을 건드리지 않게 한다. 사진 한 장의 완전한 두상 복원은 주장하지 않는다.

**Tech Stack:** 기존 Three.js 0.187.0, Canvas 2D, Node.js 24. 외부 유료 API·모델 키 불필요.

**Spec:** 최신 사용자 요청과 HANDOFF.md, references/visual-targets/generated-room-target-v1.png.

## Global Constraints

- 실제 실행되는 3D이며 기존 공간·카메라·조작을 보존한다.
- 기본 인물은 생성 시안을 참조한다. 미확보 원본 사진으로 설명하지 않는다.
- 사용자가 고른 사진은 브라우저 메모리에서만 처리한다. 저장·외부 전송 기능은 추가하지 않는다.
- 대화 시제품과의 통합·정교한 립싱크는 이번 요청 범위 밖이다.

## Review Focus

- 잘못된 형식·과대 파일·해독 실패 시 기존 얼굴 유지.
- 이미지 교체 중 다른 면접관을 고르면 잘못된 자리로 적용되지 않음.
- 조절 미리보기·적용·복원·취소 시 각각의 얼굴 상태가 독립적임.
- 얼굴 이미지는 머리 뒤로 관통하지 않고 움직이는 입체 머리를 따름.
- 서버가 새 모듈·자산을 제공하되 기존 비공개 자료는 계속 차단함.

### Task 1: 3D 인물 자산과 사진 매핑

**Files:** characters.js, face-photo.js, scripts/build-character-mesh.mjs, assets/characters/*, character.test.js.

- [x] 파일 검증·이미지 정렬 수학·해부학적 메시 경계 테스트를 먼저 실행해 실패를 확인한다.
- [x] 라이선스와 원본을 보존하고 얼굴·손 메시를 추출한다.
- [x] 시안의 서로 다른 옷·머리·착석 자세로 세 인물을 만든다.
- [x] 얼굴 표면 매핑과 뒤쪽 차단·경계 혼합을 구현하고 테스트한다.

### Task 2: 사진 교체와 기존 장면 연결

**Files:** face-editor.js/css, index.html, scene.js, server.mjs, server.test.js, package.json.

- [x] 면접관별 사진 선택·위치·크기·회전·적용·복원을 구현한다.
- [x] 읽기 경쟁·선택 변경·취소를 방어하고 GPU 텍스처를 정리한다.
- [x] 세 인물을 원래 의자 위치에 배치하고 로딩·오류 안내에 연결한다.
- [x] 서버 공개 파일·MIME를 확인한다.

### Task 3: 검증과 인계

- [x] npm run check, npm test를 실행한다.
- [x] 가능한 브라우저로 공간·인물·사진 교체를 확인한다. 제한 시 실제 수행 범위를 기록한다.
- [x] 독립 코드 리뷰 후 중요한 문제를 수정한다.
- [x] HANDOFF·README·출처·MANIFEST를 갱신한다.

## 진행 기록

- 사용자 지시에 따라 전략 검토 후 바로 구현한다. 이 폴더는 Git 저장소가 아니므로 작업트리·커밋 단계는 적용하지 않는다.
- Blender 4.4가 시작 단계에서 SIGSEGV로 종료돼 원본 메시 추출과 모델 조립은 Node/Three.js에서 수행한다. 내장 node_repl도 실행 제한으로 사용 불가하다.

- 완료: 구문 검사와 전체 테스트 25개 통과. 독립 리뷰의 정렬 초기값 오류는 실패 재현 후 수정했다. 몸통 재질 그룹·모발 배치를 줄였다. 실제 WebGL·시각 UI 검증은 불가하여 미검증으로 인계한다.
