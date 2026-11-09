# 면접관 모델 원본과 전략

2026-11-09. 사용자는 보존한 `../visual-targets/generated-room-target-v1.png`를 그대로 기준으로 진행하도록 승인했다. 이 파일은 생성 시안이며 미확보 원본 면접 사진과 다르다.

## 채택한 방법

실행 중인 Three.js 공간을 유지하면서 해부학적 머리·귀·목·손 메시와 착석한 입체 의상·하체·머리카락을 조립했다. 정면 얼굴 사진은 머리의 앞면에 투영하고, 옆과 뒤에는 기본 피부 재질을 쓴다. 옷의 앞쪽에는 참고 사진의 직물 정보를 제한적으로 섞고 뒷면은 직물 PBR 재질로 남긴다. 배경을 인물 평면 카드로 잘라 붙이는 방식이 아니며 둘러보기에서도 부피가 있다. 원본 사진에 이미 포함된 명암은 제거하지 못했으므로 장면 조명과 겹칠 수 있다.

비용과 재사용성 때문에 로컬 메시+사진 정렬을 선택했다. [MakeHuman 공식 라이선스](https://www.makehumancommunity.org/about/license.html)와 [공식 저장소의 base.obj](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj)를 확인했다. 원본 파일 `makehuman-base.obj` 첫 주석은 이 자산이 2020년 9월 CC0로 명시적 공개되었다고 밝힌다. 이 주석을 포함한 원본을 보존했다. MakeHuman 프로그램 코드의 라이선스와 이 메시 자산의 CC0를 혼동하지 않는다. 메시 추출 코드는 프로젝트의 `scripts/build-character-mesh.mjs`이며 생성 결과는 `assets/characters/anatomy.json`이다.

[MediaPipe Face Landmarker 공식 설명](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker?tab=Web)도 확인했다. 랜드마크·표정 계수는 사진 정렬과 표정 추적에 유용하지만 그 자체가 상세한 개인 두상·피부 복원 결과는 아니다. 이번 버전은 모델 다운로드 의존성을 추가하지 않고 양 눈을 직접 지정한다. [Meshy 이미지→3D](https://docs.meshy.ai/en/api/image-to-3d)와 [리깅](https://docs.meshy.ai/en/api/rigging)도 조사했지만 별도 키·외부 이미지 전송·서비스 비용이 생겨 채택하지 않았다. 런타임은 이 서비스들에 접속하지 않는다.

## 사실성의 현재 한계

- 참고 사진의 얼굴 외형을 사용한 1차 모델이다. 인물별 정밀 스캔·다각도 복원·수작업 리토폴로지 결과가 아니다.
- 공통 해부학적 두상에 사진을 정렬하므로 옆얼굴·귀·턱선까지 동일하지 않다. 낮은 원본 얼굴 해상도 이상의 세부를 복원하지 않는다.
- 의상·손·머리는 절차적으로 구성했다. 참고 인물의 모든 주름·손가락 포즈·헤어스타일을 그대로 재현하지 못한다. 현재 완전한 포토리얼 인물이라고 주장하지 않는다.
- 새 사진은 얼굴 표면 외형만 바꾼다. 두상·헤어·표정·체형까지 개인별로 생성하지 않는다. 정면·가려짐 없는 사진에서 잘 맞는다.
- 표정 리깅·립싱크·대화 시제품과의 연결은 아직 없다.

## 사용자가 넣는 사진

`얼굴 바꾸기` → 면접관 선택 → JPG/PNG/WebP 사진 → 사진의 왼쪽 눈/오른쪽 눈 → 가로·세로·크기·기울기 조절 → 적용. 숫자 좌표 입력도 제공한다. `원래 얼굴`은 해당 인물만 복원한다. 사진은 브라우저 메모리의 bitmap/canvas/texture로만 사용한다. 파일 저장·서버 전송·새로고침 후 보존은 없다. 파일 12MB, 4천만 화소, 한 변 12,000px 상한을 검사한다. 해상도 검사는 bitmap 해독 후라 해독 자체의 최대 메모리까지 제한하지는 못한다.

## 검증을 구별해서 읽기

`character-geometry-preview.png`는 Node에서 실제 모델 지오메트리를 CPU로 투영한 **형상 점검 이미지**다. 실시간 면접실 브라우저 캡처가 아니며 PBR·조명·GLSL·그림자를 검증하지 않는다. 보조 스크립트 `scripts/character-verification/render.mjs`는 이 작업 환경의 pngjs 절대 경로를 사용한다. 런타임 의존성은 아니다.

실제 Chrome은 실행 직후 종료했고 Blender는 Metal 초기화에서 충돌했다. 따라서 실제 WebGL 화면·사진 조절 화면의 외관은 미검증이다. `character-verification.json`에 테스트 범위를 기록한다.

성능 변경: 런타임은 원본 PNG 대신 동일 크기의 `assets/characters/reference.jpg`(JPEG 88, 4:4:4)를 읽는다. 원본 시안과 PNG는 보존한다. geometry/사진 병렬 로딩·정지 화면 재사용·정적 그림자 재사용·몸통 재질별 묶음·HTTP ETag를 적용했다. 실제 FPS는 미측정이며 `performance-verification.json`을 따른다.
