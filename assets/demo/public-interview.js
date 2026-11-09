import {createBrowserInterview} from './browser-interview.js';
window.__interviewTransport=createBrowserInterview();
try{await import('../../interview.js');}catch(error){
 console.error('공개 면접 초기화:',error);const loading=document.getElementById('loading'),detail=document.getElementById('load-detail');loading?.classList.add('loading-error');if(detail)detail.textContent='면접을 불러오지 못했어요. 새로고침해 주세요.';
}
