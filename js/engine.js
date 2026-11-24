/* HELLBOUND · js/engine.js · The Stardust Engine in the shack
   (Files load in the order listed in index.html and share one global scope.)

   Stardust (from kills and salvaging) goes into the engine's funnel. Each feeding empowers
   your EQUIPPED WEAPON by +1% to all of its stats: its base damage and every affix.
   The bonus is stored on the item (it.emp), so it stays with that weapon in the bag or stash.
   computeStats() in state.js applies it. Each feeding costs a little more than the last. */

const engineCost=it=>10+2*(it.emp||0);   // 10 ★, then 12, 14, 16...
const empMul=it=>1+(it&&it.emp||0)/100;
let engineOpen=false;

function openEngine(){
  engineOpen=true;mouse.down=false;setOverlay('engine',true);renderEngine();SFX.play('ui');
}
function closeEngine(){engineOpen=false;setOverlay('engine',false)}
function renderEngine(){
  if(!engineOpen)return;
  const w=eq.blade;
  if(!w){
    $('engineBody').innerHTML=`<p>The engine hums, but there's nothing to empower. <b>Equip a weapon</b> first (I).</p>`+
      `<div class="engBtns"><button class="gbtn" data-close="engine">Leave</button></div>`;
    return;
  }
  const c=engineCost(w),n=w.emp||0,dmgNow=(w.bv*empMul(w)).toFixed(1);
  $('engineBody').innerHTML=
    `<div class="engItem"><div class="ico" style="${iconStyle('blade',w)}"></div>`+
    `<span class="nm" style="color:${colorOf(w)}">${esc(w.name)}</span>`+
    `<span class="muted small">Empowered <b class="up">+${n}%</b> · base damage ${dmgNow}</span></div>`+
    `<p class="small">Feed stardust into the funnel. Each feeding raises <b>all</b> of this weapon's stats by <b>1%</b>, for good. `+
    `The bonus stays with the weapon, even in the stash.</p>`+
    `<div class="engCost">★ <b>${stardust}</b> stardust · next feeding: <b>${c} ★</b></div>`+
    `<div class="engBtns"><button class="gbtn" id="engFeed" ${stardust<c?'disabled':''}>Feed (+1%)</button>`+
    `<button class="gbtn" id="engFeedAll" ${stardust<c?'disabled':''}>Feed all you can</button>`+
    `<button class="gbtn" data-close="engine">Leave</button></div>`;
}
function feedEngine(all){
  const w=eq.blade;if(!w)return;
  let fed=0;
  do{const c=engineCost(w);if(stardust<c)break;stardust-=c;w.emp=(w.emp||0)+1;fed++}while(all);
  if(!fed){log('Not enough stardust. Kill and salvage to collect more.','#ff4f6e');return}
  calc();renderEngine();
  SFX.play('forge');shake=Math.max(shake,0.15);
  if(level&&level.engine){const g=level.engine;
    for(let i=0;i<20+fed*2;i++)parts.push({x:g.x+rnd(-10,10),y:g.y+rnd(-6,6),vx:rnd(-30,30),vy:rnd(-90,-30),life:rnd(.5,1),max:1,c:pick(['#8fa8ff','#fff1c2','#e0bf68']),s:rnd(1,2)})}
  log(`The engine roars. ${w.name} is now empowered +${w.emp}%.`,'#8fa8ff');
}
$('engineBody').onclick=e=>{
  if(e.target.closest('#engFeed'))feedEngine(false);
  else if(e.target.closest('#engFeedAll'))feedEngine(true);
  else if(e.target.closest('[data-close="engine"]'))closeEngine();
};

// Drawn in the shack (iso view): the machine sprite plus stardust swirling in its glass chamber
function drawEngine(S_,items,light){
  const g=level&&level.engine;if(!g||!IMG.engine)return;
  const [sx,sy]=S_(g.x,g.y),w=eq.blade,hot=Math.min(1,(w&&w.emp||0)/30);
  items.push({d:(g.x+g.y)/T,draw:()=>{
    ctx.drawImage(IMG.engine,sx-24,sy-58);
    // swirling motes inside the glass (chamber spans x 12..35, y 19..45 of the sprite)
    for(let i=0;i<14;i++){
      const a=time*(1.2+i*0.07)+i*1.7,r=4+(i%4)*2;
      const x=sx-24+24+Math.cos(a)*r,y=sy-58+32+Math.sin(a*0.7+i)*10;
      ctx.globalAlpha=0.5+0.5*Math.sin(time*4+i);ctx.fillStyle=i%3?'#8fa8ff':'#fff1c2';
      ctx.fillRect(Math.round(x),Math.round(y),1,1);
    }
    ctx.globalAlpha=0.12+0.08*Math.sin(time*2)+hot*0.15;ctx.fillStyle='#8fa8ff';ctx.fillRect(sx-12,sy-39,24,27);
    ctx.globalAlpha=1;
  }});
  light(g.x,g.y,70+hot*40,0.55);
}
