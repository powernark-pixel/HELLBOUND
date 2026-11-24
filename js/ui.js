/* HELLBOUND · js/ui.js · UI helpers: overlays, menus, announcements, the message log
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   5. UI HELPERS
   ===================================================================== */
function log(txt,c='#f2e2d0'){
  const d=document.createElement('div');d.textContent=txt;d.style.color=c;
  const L=$('log');L.appendChild(d);
  while(L.children.length>7)L.firstChild.remove();
  setTimeout(()=>d.style.opacity=0,4000);
  setTimeout(()=>d.remove(),5000);
}
let bannerTimer=null;
function announce(txt,c,dur=2,sub=''){
  const b=$('banner');
  b.textContent=txt;b.style.color=c;b.style.textShadow=`0 0 calc(var(--u)*8) ${c}, 0 calc(var(--u)*1) 0 #000`;
  if(sub){const s=document.createElement('small');s.textContent=sub;b.appendChild(s)}
  b.style.opacity=1;clearTimeout(bannerTimer);
  bannerTimer=setTimeout(()=>b.style.opacity=0,dur*1000);
}
function addText(x,y,t,c,s=1){texts.push({x,y,t,c,life:0.9,max:0.9,s})}
function burst(x,y,c,n){
  for(let i=0;i<n;i++){
    const a=rnd(0,TAU),sp=rnd(40,220);
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.3,.7),max:.7,c,s:rnd(1.5,3.5)});
  }
}
function updateFX(dt){
  for(const f of fxs)f.t+=dt;
  fxs=fxs.filter(f=>Math.floor(f.t*20)<f.d.n);
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94;p.life-=dt}
  parts=parts.filter(p=>p.life>0);
  for(const t of texts){t.y-=30*dt;t.life-=dt}
  for(const im of impacts)im.life-=dt;
  impacts=impacts.filter(i=>i.life>0);
  texts=texts.filter(t=>t.life>0);
  shake=Math.max(0,shake-dt*2);
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ----- Overlays: title, controls, pause, inventory, tree ----- */
function setOverlay(id,open){$(id).classList.toggle('open',open)}
function closeAllOverlays(){
  ['controls','pause','inv'].forEach(id=>setOverlay(id,false));
  invOpen=false;paused=false;hideTip();
}
function anyPanelOpen(){return invOpen||paused||$('controls').classList.contains('open')}
function startGame(){
  scene='game';setOverlay('title',false);$('hudWrap').style.display='';
  newGame();
}
function toTitle(){
  scene='title';closeAllOverlays();$('hudWrap').style.display='none';setOverlay('title',true);
  $('banner').style.opacity=0;selectMenu(0);
}
function openControls(){setOverlay('controls',true)}
function closeControls(){setOverlay('controls',false)}
function togglePause(on){
  paused=on??!paused;setOverlay('pause',paused);mouse.down=false;
  if(!paused){quitArmed=false;$('btnQuit').textContent='Abandon Run'}
}
let menuSel=0,quitArmed=false;
function selectMenu(i){
  const b=[...document.querySelectorAll('#menu .gbtn')];
  const prevSel=menuSel;menuSel=(i+b.length)%b.length;if(menuSel!==prevSel)SFX.play('hover');b.forEach((x,k)=>x.classList.toggle('sel',k===menuSel));
}
$('btnNew').onclick=()=>startGame();
$('btnControls').onclick=()=>openControls();
document.querySelectorAll('#menu .gbtn').forEach(b=>b.onmouseenter=()=>selectMenu(+b.dataset.menu));
$('btnResume').onclick=()=>togglePause(false);
/* Sound: browsers only allow audio after the player clicks or presses a key */
for(const ev of ['pointerdown','pointerup','mousedown','mouseup','click','keydown','keyup','touchend'])
  addEventListener(ev,()=>{if(!SFX.running)SFX.resume()},true);
document.addEventListener('click',e=>{if(e.target.closest('.gbtn,.mini'))SFX.play('ui')},true);
const VOLS=[0,0.3,0.5,0.7,1];
function soundLabel(){$('btnSound').textContent=!SFX.on||SFX.vol===0?'Sound: Off':!SFX.running?'Sound: blocked (click)':`Sound: ${Math.round(SFX.vol*100)}%`}
$('btnSound').onclick=()=>{
  if(!SFX.on)SFX.toggle();
  const i=VOLS.findIndex(v=>Math.abs(v-SFX.vol)<0.01);SFX.setVol(VOLS[(i+1)%VOLS.length]);soundLabel();
};
soundLabel();
$('btnPauseControls').onclick=()=>openControls();
$('btnQuit').onclick=()=>{
  if(!quitArmed){quitArmed=true;$('btnQuit').textContent='Click again to abandon';
    setTimeout(()=>{quitArmed=false;$('btnQuit').textContent='Abandon Run'},3000);return}
  toTitle();
};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{
  const w=b.dataset.close;
  if(w==='controls')closeControls();
  if(w==='inv')toggleInv(false);
});
