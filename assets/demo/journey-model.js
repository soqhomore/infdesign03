export const creditRecords=records=>records.filter(r=>r.data_role==='direct_motivation');
export const returnWish=(current,wish)=>current.trim()?current:wish;
export function wishForRecord(record){return{sourceId:record.id,sceneId:({C04:'ott',XB02:'food',XB04:'gift',C05:'career',XB03:'career'})[record.id]||'steady',text:record.original_excerpt||''};}
