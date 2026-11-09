export function entryTransition(phase,elapsed,{reduced=false}={}){
 if(phase==='settling'&&elapsed>=1)return 'waiting';
 if(phase==='waiting'&&elapsed>=1.5)return 'called';
 if(phase==='enter'&&elapsed>=(reduced?.35:3))return 'seating';
 if(phase==='seating'&&elapsed>=1)return 'interview';
 return phase;
}
