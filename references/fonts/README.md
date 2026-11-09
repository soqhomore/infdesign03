# 사용자 제공 Bithumb 서체

사용자가 지정한 bithumb_gothic_otf.zip을 학과 정보디자인 폴더에서 찾아 이곳에 원본 그대로 보존했다. ZIP에는 Bithumb Gothic Basic.otf(452,008 bytes), Bithumb Gothic Original.otf(434,100 bytes) 두 파일이 있으며 별도 안내/라이선스 텍스트는 들어 있지 않다. assets/fonts/의 런타임 OTF는 내용 변경 없이 영문 파일명만 정리한 사본이다. 다른 서체를 임의로 대체하거나 원격 CDN에서 가져오지 않았다.

행복버튼 전: Bithumb Basic. 이후: Bithumb Original. 실제 대사와 공중의 저격 글자에 같은 서체를 사용한다. 이 자료는 사용자 제공 폰트이며 기존 미확보 면접실 원본 이미지와 관계없다.

런타임은 assets/fonts/bithumb.css의 font/otf data URL을 읽는다. 두 바이너리 내용은 그대로이며 npm run build:fonts로 재생성한다. 기존 서버의 OTF MIME 목록 갱신을 위해 서버를 종료할 OS 권한이 없어서, 재시작 없이 정확한 MIME으로 쓸 수 있게 묶었다. game.js에 실제 저격 구현을 두고 기존 제공 경로를 사용한다. OTF 직접 파일도 향후 서버 시작 시 font/otf로 제공한다.
