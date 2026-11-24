/* HELLBOUND · js/main.js · Main loop and start-up
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   12. MAIN LOOP AND START
   Assets and fonts load first, then the title screen shows. The loop runs
   at the browser's frame rate and uses dt (seconds since last frame).
   ===================================================================== */
let last=0;
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(hitStop>0){hitStop-=dt;draw();updateHUD();requestAnimationFrame(frame);return}
  update(dt);
  draw();
  updateHUD();
  requestAnimationFrame(frame);
}
(function drawSpinIcon(){
  const c=$('skSpinIco').getContext('2d');
  for(let a=0;a<TAU;a+=0.05){const r=6,x=8+Math.cos(a)*r,y=8+Math.sin(a)*r;c.fillStyle=a<2?'#fff6d8':a<4?'#ffb347':'#8f1a1f';c.fillRect(Math.round(x),Math.round(y),1,1)}
  c.fillStyle='#d9dbe0';c.fillRect(7,2,2,9);c.fillStyle='#8f1a1f';c.fillRect(5,11,6,1);c.fillStyle='#5d5059';c.fillRect(7,12,2,3);
})();
(function drawFireIcon(){
  const c=$('skFireIco').getContext('2d'),px=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
  px(5,12,6,3,'#a12a06');px(4,8,8,5,'#ff6a1a');px(5,4,6,5,'#ff6a1a');px(6,2,3,3,'#ff6a1a');
  px(6,7,4,6,'#ffd27a');px(7,4,2,4,'#ffd27a');px(7,10,2,3,'#fff1c2');px(2,13,12,1,'#5e0c13');
})();
const fontsReady=Promise.race([
  Promise.all(['8px Silkscreen','16px Silkscreen','20px "Pirata One"','12px Cinzel'].map(f=>document.fonts?document.fonts.load(f):0)).catch(()=>0),
  new Promise(r=>setTimeout(r,2500))]);
Promise.all([loadAssets(),fontsReady]).then(()=>{
  ready=true;
  selectMenu(0);
  last=performance.now();
  requestAnimationFrame(frame);
});
