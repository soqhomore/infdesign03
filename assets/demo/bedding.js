import * as THREE from 'three';
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
// One closed padded duvet: a broad loft, a few localized creases and hanging edges.
export function createDuvetGeometry(){
 const nx=48,nz=64,stride=nx+1,layer=stride*(nz+1),positions=[],uvs=[],indices=[];
 for(let side=0;side<2;side++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/nz,x=(u-.5)*1.5,z=-.82+v*1.79,edge=smooth((Math.abs(x)-.62)/.13),foot=smooth((z-.72)/.25);
  const px=Math.sign(x)*(Math.abs(x)<=.62?Math.abs(x):.62+.08*edge),pz=z<=.72?z:.72+.11*foot,drop=Math.max(.17*smooth((edge-.15)/.85),.24*smooth((foot-.4)/.6));
  const loft=.028*Math.exp(-((x+.08)**2/.23+(z-.1)**2/.32));
  const crease=.014*Math.exp(-((x+.23+.18*z)**2/.004+(z+.08)**2/.28))+.01*Math.exp(-((x-.22-.1*z)**2/.003+(z-.1)**2/.3))-.008*Math.exp(-((z-.08+.22*x)**2/.003+x*x/.22));
  const fold=.016*smooth((-z-.63)/.19);
  positions.push(px,.472+loft+crease*(1-edge)*(1-foot)+fold-drop-side*.03,pz);uvs.push(u,v);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*stride+i,b=a+1,c=a+stride,d=c+1;indices.push(a,c,b,b,c,d,a+layer,b+layer,c+layer,b+layer,d+layer,c+layer);}
 const rim=[];for(let i=0;i<=nx;i++)rim.push(i);for(let j=1;j<=nz;j++)rim.push(j*stride+nx);for(let i=nx-1;i>=0;i--)rim.push(nz*stride+i);for(let j=nz-1;j>0;j--)rim.push(j*stride);
 for(let i=0;i<rim.length;i++){const a=rim[i],b=rim[(i+1)%rim.length];indices.push(a,b,a+layer,b,b+layer,a+layer);}
 const g=new THREE.BufferGeometry();g.name='두께와 자연스러운 처짐이 있는 이불';g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
}
