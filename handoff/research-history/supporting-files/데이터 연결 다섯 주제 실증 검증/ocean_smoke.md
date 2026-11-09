# 보호구역 경계 조업과 산불 태양광 검증

## 17 보호구역의 경계가 조업을 집중시키는가

### Takeaway
관계를 지지하는 구체적 사례는 있으나 보편적 법칙은 아니다. 기존논문 수치는 원문 대조했으며, 요청한 Protected Planet×Global Fishing Watch 원자료의 1·5·10km 직접 결합은 미완료다.

### Cited Findings
- Boerder 등(2017)은 갈라파고스 주변의 2011년 1월~2015년 10월 AIS를 분석했다. 전체 통과선박 3,391척에서 선망선 66척을 식별했고, 조업감지 49척의 추정 투망 664회를 분석했다. 경계 외곽 20km 이내의 투망밀도가 연구해역 평균의 최소 4배였다. 원지표는 **sets/km²**, 사용자 제안의 hours/km²와 다르다. [원논문](https://www.int-res.com/articles/feature/m585p001.pdf)
- 같은 연구 본문에서 21개 격자의 핫스폿에는 170회 투망, 밀도 0.0006회/km²가 관측됐으며 기타해역은 0.0003회/km²였다. 반올림값으로 계산하면 2배다. 이 핫스폿은 20km 버퍼와 다른 영역이므로 2배와 4배를 섞지 않는다. 갈라파고스는 산업어업을 금지하되 영세어업은 허용하는 지역이었다. [원논문 방법·결과](https://www.int-res.com/articles/feature/m585p001.pdf)
- Iacarella 등(2023)의 캐나다 연구는 **2012~2019년, 어업규정이 있는 264개 보전구역**, 3개 대양의 AIS를 분석했다. 지정 후 내부 조업 약22,000시간 중 22%를 규정상 불법으로 추정했다. 결론은 조업 이전과 경계집중이 전반적으로 뚜렷하지 않았으며, 외부 버퍼에 원래부터 높은 조업이 있었다는 것이다. 이는 시간·공간 비교 없이 ‘바깥이 높다’만으로 보호구역 때문에 집중됐다고 주장하면 안 된다는 직접적 반례다. [원논문 초록·방법](https://conbio.onlinelibrary.wiley.com/doi/full/10.1111/csp2.12919)
- 캐나다 원논문 방법에서 모든 구역은 원주민의 식량·사회·의례 목적 어업을 허용했고 대부분 다른 어업도 허용했다. 전면 또는 구획별 no-take는 11개였다. 따라서 264개를 전부 완전금어구역이라고 쓰면 오류다. 원자료는 100m 내외곽 perimeter, 외부 0–1km, 외부 1–5km의 월별 조업 CSV를 제공한다. [원논문](https://conbio.onlinelibrary.wiley.com/doi/full/10.1111/csp2.12919), [Dryad 데이터 설명](https://datadryad.org/dataset/doi:10.5061/dryad.70rxwdc3d)
- 사용자가 제시한 Protected Planet v3 페이지는 현재 Archived이며 2026-05-01 종료와 v4 전환을 고지한다. API는 토큰을 요구한다. [제공자 공식문서](https://api.protectedplanet.net/documentation/v3)
- GFW는 apparent fishing activity를 움직임·속도 등으로 추정한 시간으로 설명하며 미탑재선박, AIS 수신누락, 시계열 수신체계 개선이 추세에 영향을 줄 수 있다고 명시한다. [GFW 자료 설명](https://globalfishingwatch.org/dataset-and-code-fishing-activity/)

### Inferences
- 채택 가능하되 메시지는 ‘일부 보호구역의 산업어업이 경계로 모인다’로 한정하는 것이 타당하다.
- 보호가 효과적이어서 물고기가 흘러나오는지, 원래 좋은 어장인지, 조업금지로 자리를 옮긴 것인지는 경계지도 한 장만으로 구분되지 않는다.
- 분석 시 같은 어구·계절·연도·수신품질을 맞추고 지정 전후/비교해역 및 면적보정이 필요하다.

### Gaps
- 이번 조사에서 원래 제안한 1·5·10km의 hours/km²와 인과효과는 직접 계산하지 못했다.
- 공개 Dryad monthly ZIP(165,135bytes, file ID2195550)의 메타데이터와 SHA256는 확인했지만 웹 다운로드403, 공식 API 다운로드401이어서 CSV 미확보다. 토큰이나 로그인 우회는 시도하지 않았다.
- PDF 그래프를 Firecrawl이 생성한 소수점 표는 그래프 시각 검증이 없어 수치로 사용하지 않았다. 본문에 쓰인 원값만 사용했다.

## 19 캐나다 연기가 미국 태양광에 수치적 흔적을 남겼는가

### Takeaway
물리적 관계와 2023년 사건의 출력 감소는 운영자 공식 발표와 동료평가 연구가 뒷받침한다. 다만 이번 결과는 PJM의 공식 사건수치 재계산이며 NOAA HMS×EIA-930를 직접 공간결합해 추정한 결과는 아니다.

### Cited Findings
- PJM 공식 발표(2023-06-13)는 계통연결 태양광 일피크 출력을 6/6 약4,800MW, 6/7 약4,400MW, 6/8 약4,500MW, 연기가 약해진 6/9 약5,000MW로 보고했다. 통상 여름 피크는 약5,000MW다. 6/7 오후1~2시 약1,000MW 출력급락도 있었다. **MW는 출력이며, 일발전량 MWh/GWh가 아니다.** [PJM 원문](https://insidelines.pjm.com/quebec-wildfire-smoke-reduced-solar-output-electricity-demand-in-pjm-region/)
- 같은 발표는 구름과 연기의 효과를 분리하기 어렵다고 밝혔다. 분산형 behind-the-meter 태양광 직접 측정도 포함하지 않는다. 따라서 6/7 피크 -8.33%를 ‘연기로 인한 일발전량 손실’이라고 이름 붙이면 안 된다. [PJM 원문](https://insidelines.pjm.com/quebec-wildfire-smoke-reduced-solar-output-electricity-demand-in-pjm-region/)
- PJM의 2024년 AMS 발표 6쪽은 Philadelphia 가시거리와 PJM 계통연결 태양광 출력을 2023-06-05~11 같은 그래프에 제시하며 연기가 짙을 때 가시거리와 출력이 낮았다고 설명한다. 14쪽은 첫 사건은 피크 출력이 월별25~75백분위, 둘째 사건(6/26~7/1)은 높은 연기농도 때25백분위 이하 부근이었다고 구분한다. [PJM 발표자료](https://www.pjm.com/-/media/DotCom/library/reports-notices/weather-related/20240130-impacts-from-smoke-on-solar-generation-and-load-in-pjm-in-summer-of-2023.ashx)
- Bartram 등(2025)은 NOAA HRRR-Smoke의 AOD·복사량 등을 포함한 시간별 용량계수 예측에서 심한 연기기간 R² 최고0.85를 보고했으며 NYISO 기존예측0.50과 비교했다(6개 load zone). **예측성능이지 연기와 발전량의 상관계수나 발전량 감소율은 아니다.** [동료평가 논문](https://iopscience.iop.org/article/10.1088/1748-9326/adcf3b)
- EIA-930는 BA가 관리하거나 관측 가능한 계통연결 발전량이며 배전망의 많은 분산형 태양광은 보통 포함하지 않는다. 시간은 hour-ending convention이다. [EIA 원자료 설명](https://www.eia.gov/electricity/930-content/about.html)
- NOAA HMS는 연기 공간범위를 파악하는 공식 데이터다. 이 공간피복만으로 일사 감쇠율과 연기 높이·광학두께를 모두 알 수 있는 것은 아니다. [HMS 공식자료](https://ospo.noaa.gov/products/land/hms.html)

### Inferences
- 6/7 전일 대비 피크변화율: =4400/4800-1 → **-8.333%**.
- 6/7 통상 피크 대비: =4400/5000-1 → **-12%**.
- 6/8 통상 피크 대비: =4500/5000-1 → **-10%**.
- 위 세 값은 모두 **반올림된 공식 출력값을 나눈 기술통계**다. 전주 평균 대비도, 동일일 무연기 반사실 대비도, 순수 연기 인과효과도 아니다.
- 채택 메시지: ‘국경을 건넌 연기는 미국 전력망의 태양광 출력에도 흔적을 남겼다.’ 날씨·설비증가를 통제한 정량손실은 별도 분석해야 한다.

### Gaps
- NOAA 연기 폴리곤, BA경계, EIA 시간별 태양광 원자료의 직접 결합은 수행하지 않았다. 연기피복률과 발전량 상관계수·회귀계수는 제시하지 않는다.
- 원자료 확보 시 이벤트 기간+동월 주변 맑은날, BA별 설비용량 보정 용량계수, 낮 시간, 구름·일사·온도·강수, 고장·출력제어를 함께 통제해야 한다.
- 2026 Nature의 북미+유럽 모델 기반 2.8% PV손실은 미국 관측 일발전량과 지리·방법·단위가 달라 핵심 비교에 사용하지 않았다. [해당 논문](https://www.nature.com/articles/s43247-026-03860-x)

