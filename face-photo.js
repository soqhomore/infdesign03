// Shared photo alignment math; coordinates use a 1024px texture, y points down.
export const FACE_SIZE=1024;
export const FACE_EYES=[{x:396,y:448},{x:628,y:448}];
export const DEFAULT_EYES=[
 [{x:326,y:286},{x:390,y:292}],
 [{x:866,y:284},{x:929,y:287}],
 [{x:1407,y:350},{x:1465,y:355}],
];
export function validatePhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file?.type))throw Error('JPG·PNG·WebP 사진을 골라 주세요.');
 if(!(file.size>0)||file.size>12*1024*1024)throw Error('12MB 이하의 사진을 골라 주세요.');
}
export function validateDimensions(width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<64||height<64||width>12000||height>12000||width*height>40_000_000)throw Error('사진 해상도는 가로·세로 64~12,000px, 전체 4천만 화소 이하여야 해요.');
}
export function photoTransform(eyes,{x=0,y=0,zoom=1,rotation=0}={}){
 const [l,r]=eyes,dx=r.x-l.x,dy=r.y-l.y,length=Math.hypot(dx,dy);
 if(!Number.isFinite(length)||length<2)throw Error('양쪽 눈을 서로 다른 위치에 찍어 주세요.');
 const angle=-Math.atan2(dy,dx)+rotation*Math.PI/180,scale=232/length*zoom;
 const a=Math.cos(angle)*scale,b=Math.sin(angle)*scale;
 const cx=(l.x+r.x)/2,cy=(l.y+r.y)/2;
 return {a,b,c:-b,d:a,e:512+x-a*cx+b*cy,f:448+y-b*cx-a*cy};
}
export function transformPoint(m,p){return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};}
export function skinColorFromSamples(pixels){
 const channels=[[],[],[]];
 for(let i=0;i<pixels.length;i+=4){const [r,g,b,a]=pixels.slice(i,i+4);if(a<180||Math.max(r,g,b)<35||Math.min(r,g,b)>244)continue;channels[0].push(r);channels[1].push(g);channels[2].push(b);}
 if(!channels[0].length)return null;
 return '#'+channels.map(c=>{c.sort((a,b)=>a-b);return c[Math.floor(c.length/2)].toString(16).padStart(2,'0');}).join('');
}
export function sampleFaceSkin(canvas){
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),pixels=[];
 for(const [x,y] of [[420,600],[604,600],[512,335]])pixels.push(...ctx.getImageData(x-8,y-8,16,16).data);
 return skinColorFromSamples(pixels);
}
export function paintFace(canvas,image,eyes,adjust={}){
 canvas.width=canvas.height=FACE_SIZE;
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),m=photoTransform(eyes,adjust);
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,FACE_SIZE,FACE_SIZE);
 ctx.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.drawImage(image,0,0);ctx.setTransform(1,0,0,1,0,0);
 // Feather the face boundary. Hair, clothes and background never become a flat card.
 ctx.globalCompositeOperation='destination-in';
 const mask=ctx.createRadialGradient(512,490,250,512,490,490);
 mask.addColorStop(0,'#fff');mask.addColorStop(.55,'#fff');mask.addColorStop(1,'#fff0');
 ctx.fillStyle=mask;ctx.fillRect(0,0,FACE_SIZE,FACE_SIZE);ctx.globalCompositeOperation='source-over';
 return canvas;
}

// Preserve the entire image, its aspect ratio and transparency; no landmark alignment.
export function paintWholePhoto(canvas,image){
 const scale=Math.min(1,1024/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return canvas;
}
