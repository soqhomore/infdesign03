from pathlib import Path
import pandas as pd,numpy as np,json,re,hashlib
def cdist(a,b):
    a=np.deg2rad(a);b=np.deg2rad(b)
    dl=a[:,None,0]-b[None,:,0];dp=a[:,None,1]-b[None,:,1]
    h=np.sin(dp/2)**2+np.cos(a[:,None,1])*np.cos(b[None,:,1])*np.sin(dl/2)**2
    return 6371008.8*2*np.arcsin(np.sqrt(np.clip(h,0,1)))
P=Path(__file__).resolve().parent
bins=pd.read_csv(P/'bins.csv',encoding='cp949')
bus=pd.read_csv(P/'OA-15067.csv',encoding='cp949',dtype={'노드 ID':str,'정류소번호':str})
shops=pd.read_csv(P.parents[1]/'verification_batch1/analysis/city/raw/shops_seoul_202409.csv',low_memory=False)
shops=shops[shops['시군구명'].eq('영등포구')].copy()
print('subcats',shops['상권업종소분류명'].value_counts().head(35).to_dict())
# Exact five-digit ARS code only; do not equate nine-digit node id and five-digit ARS.
lookup=bus.set_index('노드 ID');matched=[];unmatched=[]
for _,r in bins.iterrows():
 codes=re.findall(r'(?<!\d)(19\d{3})(?!\d)',str(r['설치위치']))
 listed_count=len(codes)
 codes=[c for c in codes if c in lookup.index]
 if codes:
  c=codes[0];t=lookup.loc[c]
  if isinstance(t,pd.DataFrame): raise ValueError('duplicate bus code')
  rr=r.to_dict();rr.update(ars_code=c,matched_bus_name=t['정류소명'],lon=float(t['X좌표']),lat=float(t['Y좌표']),multiple_listed_codes=listed_count>1);matched.append(rr)
 else:unmatched.append(r.to_dict())
m=pd.DataFrame(matched);m.to_csv(P/'bins_matched.csv',index=False);pd.DataFrame(unmatched).to_csv(P/'bins_unmatched.csv',index=False)
# Distinct addresses plus installation descriptions: repeated general/recycling bins are a single site.
sites=m.drop_duplicates(['ars_code'])
cafes=shops[shops['상권업종소분류명'].eq('카페')].copy()
print('counts',len(shops),len(cafes),len(m),len(sites),len(unmatched))
# Haversine great-circle distance on a mean-radius sphere (R=6371008.8 m).
def xy(d,lo,la):return np.c_[d[lo].astype(float),d[la].astype(float)]
D=cdist(xy(cafes,'경도','위도'),xy(sites,'lon','lat'))
nearest=D.argmin(axis=1);cafes['nearest_matched_bin_m']=D.min(axis=1);cafes['nearest_ars']=sites.iloc[nearest]['ars_code'].values;cafes['nearest_bin_name']=sites.iloc[nearest]['설치위치'].values
cafes.to_csv(P/'cafe_nearest_matched_bin.csv',index=False)
allD=cdist(xy(shops,'경도','위도'),xy(sites,'lon','lat')).min(axis=1);shops['nearest_matched_bin_m']=allD
summary={'bin_rows':len(bins),'bin_general':int(bins['수거쓰레기종류'].eq('일반쓰레기').sum()),'bin_recycling':int(bins['수거쓰레기종류'].eq('재활용쓰레기').sum()),'bin_busstop_rows':int(bins['설치지점'].eq('정류소(버스,택시 등)').sum()),'bin_sites_by_exact_address_description':len(bins.drop_duplicates(['도로(가로)명','설치위치'])),'bin_rows_with_matched_ars':len(m),'matched_bus_sites':len(sites),'unmatched_bin_rows':len(unmatched),'bin_bus_source_rows':len(bus),'all_ydp_shops':len(shops),'cafes':len(cafes),'cafe_coordinate_missing':int(cafes[['경도','위도']].isna().any(axis=1).sum()),'cafe_dist_m':{str(q):float(cafes.nearest_matched_bin_m.quantile(q)) for q in [0,.25,.5,.75,.9,1]},'cafe_mean_distance_m':float(cafes.nearest_matched_bin_m.mean()),'all_shop_median_distance_m':float(np.median(allD)),'all_shop_mean_distance_m':float(np.mean(allD)),'cafes_distance_over_300m':int((cafes.nearest_matched_bin_m>300).sum()),'cafes_distance_over_500m':int((cafes.nearest_matched_bin_m>500).sum()),'cafes_distance_within_100m':int((cafes.nearest_matched_bin_m<=100).sum())}
# Within selected bins, recycling distance comparisons using same cafe positions.
rec=m[m['수거쓰레기종류'].eq('재활용쓰레기')].drop_duplicates('ars_code')
rd=cdist(xy(cafes,'경도','위도'),xy(rec,'lon','lat')).min(axis=1)
noncafe=shops[~shops['상권업종소분류명'].eq('카페')]
summary.update({'non_cafe_shops':len(noncafe),'non_cafe_median_distance_m':float(noncafe.nearest_matched_bin_m.median()),'non_cafe_mean_distance_m':float(noncafe.nearest_matched_bin_m.mean())})
summary.update({'matched_recycling_sites':len(rec),'recycling_distance_median_m':float(np.median(rd)),'recycling_distance_over_300m':int((rd>300).sum())})
# Categorical street frontage: transport node focus. Do not use independent-sample p-values because shops cluster spatially.
dongs=cafes.groupby('행정동명').agg(cafes=('상가업소번호','count'),median_nearest_bin_m=('nearest_matched_bin_m','median'),mean_nearest_bin_m=('nearest_matched_bin_m','mean'),over_300m=('nearest_matched_bin_m',lambda x:int((x>300).sum())))
dongs.to_csv(P/'cafe_distances_by_dong.csv')
summary['dong_rows']=dongs.reset_index().to_dict('records')
summary['sha256']={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [P/'bins.csv',P/'OA-15067.csv',P.parents[1]/'verification_batch1/analysis/city/raw/shops_seoul_202409.csv']}
(P/'korea_analysis_stats.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False,indent=2))
