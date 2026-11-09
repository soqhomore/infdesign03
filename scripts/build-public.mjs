import {readFile,writeFile,mkdir,cp,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const runtimeFiles=['scene.js','characters.js','face-photo.js','face-editor.js','game.js','flow.js','render-policy.js','interview.js','style.css','face-editor.css','game.css'];
export function publicEntry(template){
 return template.replace('<title>행복버튼 — 로컬 면접</title>','<title>행복버튼 — 당신은 왜 일하고 싶으신가요?</title>').replace('data-experience="conversation"','data-experience="conversation" data-transport="browser"').replace('src="/interview.js"','src="/assets/demo/public-interview.js"').replace('>로컬 면접<','>면접<').replace('>로컬 대사로 시험<','>준비된 대사로 시작<').replace(/<details class="setup-details">[\s\S]*?<\/details>/,'<details class="setup-details"><summary>체험 안내</summary><p>공개 체험은 미리 준비된 질문과 반응으로 진행됩니다. AI를 사용하지 않으며 입력한 답변은 이 페이지의 메모리에만 두고 서버로 보내거나 저장하지 않습니다.</p><p>말하기는 브라우저의 음성 인식을 사용합니다. 브라우저에 따라 음성이 해당 서비스로 전송될 수 있습니다. 입력만으로도 진행할 수 있어요. 면접관의 목소리는 기기의 음성 읽기 기능입니다.</p></details>');
}
export async function buildPublic({outDir=path.join(root,'dist'),writeSourceEntries=true}={}){
 const out=path.resolve(outDir),source=path.resolve(root);if(out===source||out===path.parse(out).root||source.startsWith(out+path.sep))throw Error('배포 경로가 프로젝트 원본을 덮을 수 없습니다.');
 if(out!==path.join(source,'dist')){const files=await readdir(out).catch(error=>{if(error.code==='ENOENT')return[];throw error;});if(files.length)throw Error('기존 파일을 보존하려면 비어 있는 빌드 전용 폴더를 지정해 주세요.');}
 const html=publicEntry(await readFile(path.join(root,'local/room.html'),'utf8'));
 await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'local'),{recursive:true});
 if(writeSourceEntries)for(const name of ['index.html','interview.html'])await writeFile(path.join(root,name),html);
 for(const name of ['index.html','interview.html','local/index.html','local/room.html'])await writeFile(path.join(out,name),html);
 for(const name of runtimeFiles)await cp(path.join(root,name),path.join(out,name));
 for(const name of ['stage.js','conversation.css','sound.js'])await cp(path.join(root,'local',name),path.join(out,'local',name));
 for(const name of ['assets','vendor'])await cp(path.join(root,name),path.join(out,name),{recursive:true});
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const out=await buildPublic();console.log(`공개 체험 빌드 완료: ${path.relative(root,out)}`);}
