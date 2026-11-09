// Preserve a completed still frame; redraw only changes or active game effects.
export function createRenderSchedule(){
 let dirty=true,wasAnimated=false;
 return {
  invalidate(){dirty=true;},
  shouldRender({ready=false,hidden=false,animated=false}={}){
   if(!ready||hidden)return false;
   const draw=dirty||animated||wasAnimated;
   wasAnimated=animated;dirty=false;return draw;
  }
 };
}
