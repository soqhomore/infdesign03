export const OPENING_DURATION=3500;
export function openingRemaining(start,now){return Math.max(0,OPENING_DURATION-Math.max(0,now-start));}
