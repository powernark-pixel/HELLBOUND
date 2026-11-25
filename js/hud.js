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
  const key=[Math.ceil(P.hp),Math.round(P.maxHp),Math.ceil(P.sh),Math.round(P.maxSh),P.bonusHp,(P.boons||[]).length,stardust,floor,filter,enemies.length,inv.length,boss&&!boss.dead,boss&&Math.ceil(boss.hp),enemies.filter(e=>isBig(e)&&!e.dormant).map(e=>Math.ceil(e.hp)).join('/'),trials?trials.list.map(t=>t.state).join():''].join();
  if(key===hudCache)return;hudCache=key;
  $('hudName').textContent='THE KNIGHT';
  $('hpTxt').textContent=`HULL ${Math.ceil(P.hp)}/${Math.round(P.maxHp)}`;
  $('shTxt').textContent=P.maxSh?`WARD ${Math.ceil(P.sh)}/${Math.round(P.maxSh)}`:'WARD —';
  $('hudSub').innerHTML=`★ <b>${stardust}</b> STARDUST · <b>+${P.bonusHp||0}</b> HEALTH FROM ${Math.round((P.bonusHp||0)/10)>0?'COMPLETED LEVELS':'LEVELS (FINISH ONE!)'}`+((P.boons||[]).length?` · <b style="color:#ff8ad8">${P.boons.length} BOON${P.boons.length>1?'S':''}</b>`:'');
  $('circle').textContent=level&&level.safe?`The Shack · next: Circle ${floor}`:`Circle ${floor} · ${circleName()}`;
  $('tr').innerHTML=`FILTER: ${FILTERS[filter]}<br>FOES: ${enemies.length}<br>RELICS: ${inv.length}/60<br>${trials?`<span style="color:#e0bf68">TRIALS ${trials.list.filter(t=>t.state==='pass').length}/${trials.list.length}</span> <span style="color:#a89a84">(ESC)</span><br>`:''}${level&&level.safe?'<span style="color:#8fe07a">SAFE</span>':boss&&!boss.dead?`<span style="color:#ff6a5a">${boss.bossName.toUpperCase()} LIVES</span>`:!vatFull()?'<span style="color:#ff6a5a">FILL THE VAT</span>':'<span style="color:#e0bf68">STAIRS OPEN</span>'}`;
  // the big bar at the top: whichever boss or mini-boss is awake (a final boss without an area shows once hurt)
  const big=enemies.find(e=>isBig(e)&&!e.dead&&!e.dormant&&(e.wakeArea||e.hp<e.max));
  $('bossbar').style.display=big?'block':'none';
  if(big){
    $('bossb').style.width=(Math.max(0,big.hp)/big.max*100)+'%';
    $('bossName').textContent=big===boss&&big.warden?`The Warden of ${level?level.name.replace(/^The /,'the '):CIRCLES[(floor-1)%CIRCLES.length]}`:big.bossName;
  }
}
