/* HELLBOUND · js/hud.js · The on-screen HUD: bars, skill bar, boss bar
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   11. HUD AND INPUT
   ===================================================================== */
let hudCache='';
const FLASK_URGE=0.35;   // below this share of health, the flask slot pulses red: "drink now"

/* ----- SKILL BAR -----
   Each slot shows a dark sweep that drains as the cooldown runs out, plus the seconds left.
   When a skill comes back it flashes once (the "ping"), so you can feel it's ready without looking. */
const skWasReady={};
function skillSlot(id,left,max,quiet){   // quiet: no glow or ping (the sword is ready most of the time)
  const el=$(id),f=max>0?Math.max(0,Math.min(1,left/max)):0,ready=left<=0;
  $(id+'Cd').style.height=f*100+'%';
  const sec=$(id+'S');if(sec)sec.textContent=ready?'':left<1?left.toFixed(1):Math.ceil(left);
  if(quiet)return;
  el.classList.toggle('ready',ready);
  if(ready&&skWasReady[id]===false)skillPing(id);
  skWasReady[id]=ready;
}
function skillPing(id){const el=$(id);el.classList.remove('ping');void el.offsetWidth;el.classList.add('ping')}
// a pressed-too-soon roll: listened for here so a held key repeating can't count as a press
addEventListener('keydown',e=>{if(e.key===' '&&!e.repeat&&scene==='game'&&P&&!dead&&!paused&&!anyPanelOpen()&&P.roll>0)skillDeny('skRoll')});
(function drawRollIcon(){   // a knight's boot kicking off, with motion lines
  const c=$('skRollIco').getContext('2d'),px=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
  px(1,5,4,1,COL.ashDark);px(0,8,5,1,COL.ash);px(2,11,3,1,COL.ashDark);
  px(7,3,5,5,COL.boneLo);px(8,4,3,3,COL.bone);px(6,8,7,3,COL.boneLo);px(7,8,4,1,COL.bone);
  px(6,11,8,2,COL.ash);px(12,11,3,2,COL.boneLo);px(6,13,9,1,COL.ink);
})();
function updateHUD(){
  if(scene!=='game')return;
  {skillSlot('skSword',Math.max(0,P.atk),COMBO[1].cd/S.atkRate,true);
   $('skSwordPip').classList.toggle('on',P.comboStep===1&&P.comboT>0);   // the next click is the heavy CHOP
   skillSlot('skRoll',Math.max(0,P.roll),S.rollCD);
   skillSlot('skFire',Math.max(0,P.fireCD),fireCdMax());
   skillSlot('skSpin',Math.max(0,P.spinCD),spinCdMax());
   const fm=flaskMax(),fl=$('skFlask');
   $('skFlaskN').textContent=P.flasks;fl.classList.toggle('empty',P.flasks<1);
   $('skFlaskCd').style.height=P.flasks<1?(100-P.flaskProg/FLASK_KILLS*100)+'%':'0%';
   // kills toward the next flask, shown whenever one is missing
   $('skFlaskProg').style.width=(P.flasks>=fm?0:P.flaskProg/FLASK_KILLS*100)+'%';
   fl.classList.toggle('urge',P.flasks>0&&P.hp<P.maxHp*FLASK_URGE&&P.healT<=0&&!dead);
   if(skWasReady.flask!==undefined&&P.flasks>skWasReady.flask&&P.healT<=0)skillPing('skFlask');
   skWasReady.flask=P.flasks;
   const ico=$('skSwordIco');const st=iconStyle('blade',eq.blade);if(ico.dataset.st!==st){ico.style.cssText=st;ico.dataset.st=st}}
  const safe=level&&level.safe;$('vatRow').style.display='none';   // the vat is the icon on the right edge now (js/blood.js)
  if(!safe){const pct=vatNeed?Math.min(1,vat/vatNeed):1;$('vatb').style.width=(pct*100)+'%';$('vatb').classList.toggle('full',pct>=1);
    $('vatTxt').textContent=pct>=1?'BLOOD VAT FULL':`BLOOD VAT ${Math.floor(pct*100)}%`}
  $('sndHint').style.display=SFX.on&&SFX.vol>0&&!SFX.running?'block':'none';
  const hp=P.hp/P.maxHp*100;
  $('hpb').style.width=hp+'%';$('hpLag').style.width=hp+'%';
  $('shb').style.width=(P.maxSh?P.sh/P.maxSh*100:0)+'%';
  const key=[Math.ceil(P.hp),Math.round(P.maxHp),Math.ceil(P.sh),Math.round(P.maxSh),P.bonusHp,(P.boons||[]).length,stardust,floor,filter,enemies.length,inv.length,boss&&!boss.dead,boss&&!boss.dormant,boss&&Math.ceil(boss.hp),enemies.filter(e=>e.miniboss&&!e.dormant).map(e=>Math.ceil(e.hp)).join('/')].join();
  if(key===hudCache)return;hudCache=key;
  $('hudName').textContent='THE KNIGHT';
  $('hpTxt').textContent=`HULL ${Math.ceil(P.hp)}/${Math.round(P.maxHp)}`;
  $('shTxt').textContent=P.maxSh?`WARD ${Math.ceil(P.sh)}/${Math.round(P.maxSh)}`:'WARD —';
  $('hudSub').innerHTML=`★ <b>${stardust}</b> STARDUST · <b>+${P.bonusHp||0}</b> HEALTH FROM ${Math.round((P.bonusHp||0)/10)>0?'COMPLETED LEVELS':'LEVELS (FINISH ONE!)'}`+((P.boons||[]).length?` · <b style="color:#ff8ad8">${P.boons.length} BOON${P.boons.length>1?'S':''}</b>`:'');
  $('circle').textContent=level&&level.safe?`The Shack · next: Circle ${floor}`:`Circle ${floor} · ${circleName()}`;
  $('tr').innerHTML=`FILTER: ${FILTERS[filter]}<br>FOES: ${enemies.length}<br>RELICS: ${inv.length}/60<br>${level&&level.safe?'<span style="color:#8fe07a">SAFE</span>':boss&&!boss.dead?'<span style="color:#ff6a5a">THE WARDEN LIVES</span>':!vatFull()?'<span style="color:#ff6a5a">FILL THE VAT</span>':'<span style="color:#e0bf68">STAIRS OPEN</span>'}`;
  const mini=enemies.find(e=>e.miniboss&&!e.dead&&!e.dormant);
  const showBoss=mini||(boss&&!boss.dead&&!boss.dormant);
  $('bossbar').style.display=showBoss?'block':'none';
  if(mini){$('bossb').style.width=(Math.max(0,mini.hp)/mini.max*100)+'%';$('bossName').textContent=mini.bossName}
  else if(showBoss){$('bossb').style.width=(boss.hp/boss.max*100)+'%';$('bossName').textContent=level?`The Warden of ${level.name.replace(/^The /,'the ')}`:`The Warden of ${CIRCLES[(floor-1)%CIRCLES.length]}`}
}
