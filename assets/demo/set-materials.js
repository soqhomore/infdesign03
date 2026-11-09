import * as THREE from 'three';
// Local-only material library; each set owns its textures, not the shared environment.
export function createSetMaterials(onChange=()=>{}){
 const textures=new Set(),materials=new Set();let disposed=false;const loader=typeof document!=='undefined'&&typeof document.createElementNS==='function'?new THREE.TextureLoader():null;
 function grain(repeat,cloth=false){const n=128,data=new Uint8Array(n*n*4);let seed=53;for(let y=0;y<n;y++)for(let x=0;x<n;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=cloth?140+(x%4===0?24:0)+(y%4===0?-22:0)+(seed%9):150+seed%24;data.set([v,v,v,255],(y*n+x)*4);}const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.needsUpdate=true;textures.add(t);return t;}
 function load(file,color=false){if(!loader)return grain([2,2]);const t=loader.load('/assets/'+file,texture=>{if(disposed)texture.dispose();else onChange();});t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=4;if(color)t.colorSpace=THREE.SRGBColorSpace;textures.add(t);return t;}
 const wallGrain=grain([7,7]),weave=grain([32,32],true);
 const own=m=>(materials.add(m),m);
 const wood=own(new THREE.MeshStandardMaterial({color:'#a19a83',map:load('wood-color.jpg',true),normalMap:load('wood-normal.jpg'),normalScale:new THREE.Vector2(.18,.18),roughnessMap:load('wood-roughness.jpg'),roughness:.72}));
 const plaster=own(new THREE.MeshStandardMaterial({color:'#a2aaa2',roughness:.94,bumpMap:wallGrain,bumpScale:.003,roughnessMap:wallGrain}));
 const floor=own(new THREE.MeshStandardMaterial({color:'#687571',roughness:.52,bumpMap:wallGrain,bumpScale:.0015,roughnessMap:wallGrain}));
 const fabric=own(new THREE.MeshStandardMaterial({color:'#777e6c',roughness:1,bumpMap:weave,bumpScale:.002}));
 const metal=own(new THREE.MeshStandardMaterial({color:'#a9b4b0',metalness:.86,roughness:.28}));
 return{wood,plaster,floor,fabric,metal,own,dispose(){disposed=true;for(const t of textures)t.dispose();for(const m of materials)m.dispose();}};
}
