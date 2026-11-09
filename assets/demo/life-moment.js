// A finite everyday action, not a success score or an endless celebration.
export function momentProgress(time,reduced=false){if(reduced)return 1;const t=Math.min(1,Math.max(0,(time-1.2)/3));return t*t*(3-2*t);}
