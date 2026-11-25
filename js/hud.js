/* HELLBOUND · js/hud.js · The on-screen HUD: bars, skill bar, boss bar
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   11. HUD AND INPUT
   ===================================================================== */
let hudCache='';
function updateHUD(){
  if(scene!=='game')return;
  {const swCd=Math.max(0,P.atk)*S.atkRate,fCd=Math.max(0,P.fireCD)/fireCdMax();
   $('skSwordCd').style.height=Math.min(100,swCd*100)+'%';$('skFireCd').style.height=Math.min(100,fCd*100)+'%';
   $('skFire').classList.toggle('ready',fCd<=0);
   const sCd=Math.max(0,P.spinCD)/spinCdMax();$('skSpinCd').style.height=Math.min(100,sCd*100)+'%';$('skSpin').classList.toggle('ready',sCd<=0);
   $('skFlaskN').textContent=P.flasks;$('skFlask').classList.toggle('empty',P.flasks<1);
   $('skFlaskCd').style.height=(P.flasks>=flaskMax()?0:100-P.flaskProg/FLASK_KILLS*100)*(P.flasks<1?1:0)+'%';
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
