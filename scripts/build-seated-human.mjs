import fs from 'node:fs/promises';
import {buildSeatedHuman} from './seated-human.mjs';
const source=await fs.readFile(new URL('../references/character-source/makehuman-base.obj',import.meta.url),'utf8');
const asset=buildSeatedHuman(source);
const target=new URL('../assets/characters/seated-human.json',import.meta.url),temp=new URL('../assets/characters/seated-human.json.tmp',import.meta.url);
await fs.writeFile(temp,JSON.stringify(asset));await fs.rename(temp,target);
console.log(Object.fromEntries(Object.entries(asset.parts).map(([name,p])=>[name,{vertices:p.positions.length/3,triangles:p.indices.length/3}])));
