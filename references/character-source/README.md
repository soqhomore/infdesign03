# 면접관 모델 원본과 전략

2026-11-09. 사용자는 보존한 `../visual-targets/generated-room-target-v1.png`를 그대로 기준으로 진행하도록 승인했다. 이 파일은 생성 시안이며 미확보 원본 면접 사진과 다르다.

## 현재 얼굴 선택 · 2026-11-10

사용자가 실사 얼굴 대신 기본 무표정 가면·카피바라 마스크·직접 넣은 사진을 선택하도록 승인했습니다. `characters.js`의 head()가 새 다운로드 없이 절차적 3D 가면을 만들고 createFaceController()가 면접관별 외형·사진 텍스처·초기화를 관리합니다. 기본은 모두 회백색입니다. 카피바라는 둥근 귀·눈·넓고 긴 주둥이가 있는 입체 마스크입니다. 기본과 카피바라에는 기존 대화 전환에 맞춘 눈썹 반응이 있습니다.

사진은 머리카락·안구·해부학적 코가 없는 완만한 곡면에 정면 투영합니다. 이전 두상/사진 불일치를 줄이기 위한 디자인 변경으로 개인 형상 복원은 아닙니다. 원래 눈 정렬·위치·크기·회전 편집과 로컬 메모리 처리는 유지합니다. 사진 모드를 오갈 때 텍스처는 유지하고 적용 교체·초기화 시 이전 텍스처를 해제합니다. 기본 시안을 런타임 얼굴로 자동 적용하지 않습니다. reference.jpg는 양옆의 기존 의상 투영에 계속 사용됩니다.

face-modes-verification.json과 character-mask-*.png가 최신 확인 자료입니다. 사진 CPU 점검에는 보존한 생성 시안을 사용했으며 사용자 원본 사진·신규 업로드의 실제 브라우저 결과가 아닙니다. 실제 WebGL/UI 외관은 연결 제약으로 미검증입니다. 아래 해부학 머리/헤어 조립은 과거 방식으로 읽습니다. 전체 인체의 중앙 착석 몸체는 유지합니다.

## 현재 가운데 인물 · 2026-11-10

다운로드가 어려워 사용자가 기존 전체 인체 원본을 활용하는 대안을 승인했습니다. 가운데 인물은 `scripts/seated-human.mjs`에서 원본 관절 표식·인체 연결을 유지해 착석시키고, 표면의 의상 여유분과 셔츠·라펠을 직접 제작합니다. 의상과 피부의 재질 경계는 연결면으로 닫고, 패널 내부도 표면 관통을 검사해 간격을 조정합니다. 구두는 발 표면의 convex envelope입니다. 기존 머리와 연결하며 칼라 밴드를 추가했습니다. `npm run build:character`로 재생성합니다. 추가 패키지·자산 다운로드 없이 빌드된 JSON을 로드합니다.

가운데 옷은 사진 투영을 제거했습니다. 얼굴은 공통 두상 앞면에만 사진을 투영하며 경계를 줄이고 주변 피부색을 사진의 볼·이마에서 추정합니다. 실제 개인의 체형·두상을 복원하지 않습니다. 가운데 한 명부터 적용하며 나머지 둘의 몸체는 이전 방식입니다. 다회 대화의 고개 반응과 얼굴 사진 적용·복원 인터페이스를 유지합니다. 표정 리깅·립싱크는 없습니다.

`character-seated-front.png`, `character-seated-side.png`, `character-seated-preview.png`는 CPU 형상 점검입니다. WebGL·PBR·실제 방 캡처가 아니며 실제 브라우저 외관은 미검증입니다. `offline-character-verification.json`이 최신 범위를 기록합니다.

## 이전 세 인물의 조립 방법

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

## 보존한 다운로드 대안 · 현재 사용하지 않음

사용자가 완성된 인체·정장 자산을 사용하는 대안을 승인했다. 공식 CC0 팩의 male_elegantsuit01 의상 OBJ/mhclo·short01 헤어·middleage_asian_male 피부·눈·신발을 사용할 계획이다. 팩 원본: https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip (280,737,770 bytes; 공식 HEAD/ZIP 중앙 디렉터리 확인). 자산 목록 517개를 확인했지만 실제 모델 파일 확보는 아직 못했다. `scripts/fetch-character-library.py`는 선택 파일만 받고 공식 골격 원본까지 저장한다. 다운로드 후 SOURCE.json과 원본 라이선스를 다시 확인하고 착석 모델을 빌드해야 한다. 이 다운로드 안은 이후 사용자가 승인한 위의 오프라인 재구성 안으로 대체했다. 외부 의상 파일은 다운로드하지 않았다.
