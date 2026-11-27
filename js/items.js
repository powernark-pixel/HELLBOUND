/* HELLBOUND · js/items.js · Items: drops, equip, salvage, inventory and stash screens, chests and the bed
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   6. ITEMS (drops, equip, salvage, reroll, inventory UI)
   ===================================================================== */
function dropItem(x,y,minR,ilvl){
  const it=makeItem(pick(SLOTS),ilvl,minR);
  it.x=x+rnd(-8,8);it.y=y+rnd(-8,8);it.age=0;it.bob=Math.random()*TAU;
  ground.push(it);
  // a drop is an event: a flash in its rarity colour and a sound, bigger for better items
  burst(it.x,it.y,RAR[it.r].c,10+it.r*6);
  SFX.play(it.r>=3?'toll':'pickup',{r:it.r});
  if(it.r>=2)announce(`${RAR[it.r].n.toUpperCase()} DROP`,colorOf(it),1.2);
  if(it.r>=4)log(`${RAR[it.r].n} drop: ${it.name}`,RAR[it.r].c);
}
function equipIdx(i){
  const it=inv[i];if(!it)return;
  const old=eq[it.slot];
  inv.splice(i,1);eq[it.slot]=it;
  if(old)inv.push(old);
  calc();log(`Equipped ${it.name}`,colorOf(it));SFX.play('equip');renderInv();
}
function salvageIdx(i){
  const it=inv[i];if(!it)return;
  inv.splice(i,1);
  const gain=Math.ceil(it.bv/2)+it.r*3;
  stardust+=gain;
  log(`Salvaged ${it.name} for +${gain} ★`,'#ffe14f');SFX.play('salvage');
  renderInv();
}
// The bag can be sorted and filtered, so cards refer to items by id, never by position.
const idxOfId=id=>inv.findIndex(it=>it.id===id);
function equipId(id){const i=idxOfId(id);if(i>=0){hideTip();equipIdx(i)}}
function salvageId(id){const i=idxOfId(id);if(i>=0){hideTip();salvageIdx(i)}}

/* ----- THE STASH: a chest in the shack that keeps items safe between runs -----
   It survives death and is saved in this browser (localStorage). */
const STASH_MAX=120;
let stash=[],invMode='bag';
try{stash=JSON.parse(localStorage.getItem('hb_stash')||'[]');if(!Array.isArray(stash))stash=[]}catch(e){stash=[]}
for(const it of stash)uid=Math.max(uid,(it.id||0)+1);
function saveStash(){try{localStorage.setItem('hb_stash',JSON.stringify(stash.map(({x,y,age,bob,dead,...it})=>it)))}catch(e){}}
const inShack=()=>!!(level&&level.safe);
function openStash(){invMode='stash';toggleInv(true)}
function storeId(id){
  const i=idxOfId(id);if(i<0)return;
  if(stash.length>=STASH_MAX){log('The stash is full.','#ff4f6e');return}
  const [it]=inv.splice(i,1);stash.push(it);saveStash();hideTip();SFX.play('equip');renderInv();
}
function takeId(id){
  const i=stash.findIndex(it=>it.id===id);if(i<0)return;
  if(inv.length>=60){log('Your bag is full.','#ff4f6e');return}
  const [it]=stash.splice(i,1);it.got=++pickupSeq;inv.push(it);saveStash();hideTip();SFX.play('equip');renderInv();
}
function equipFromStash(id){
  const i=stash.findIndex(it=>it.id===id);if(i<0)return;
  const [it]=stash.splice(i,1),old=eq[it.slot];eq[it.slot]=it;
  if(old){if(inv.length<60)inv.push(old);else stash.push(old)}
  saveStash();calc();hideTip();log(`Equipped ${it.name}`,colorOf(it));SFX.play('equip');renderInv();
}
function salvageFromStash(id){
  const i=stash.findIndex(it=>it.id===id);if(i<0)return;
  const [it]=stash.splice(i,1),gain=Math.ceil(it.bv/2)+it.r*3;stardust+=gain;saveStash();hideTip();
  log(`Salvaged ${it.name} for +${gain} ★`,'#ffe14f');SFX.play('salvage');renderInv();
}
// Salvage every Common item in the list you're looking at (equipped gear is never touched)
function salvageCommons(){
  const list=invMode==='stash'?stash:inv;let n=0,gain=0;
  for(let i=list.length-1;i>=0;i--)if(list[i].r===0){gain+=Math.ceil(list[i].bv/2);list.splice(i,1);n++}
  if(!n)return;
  stardust+=gain;if(invMode==='stash')saveStash();
  log(`Salvaged ${n} Common item${n>1?'s':''} for +${gain} ★`,'#ffe14f');SFX.play('salvage');renderInv();
}
function rerollSlot(slot){
  const it=eq[slot];if(!it)return;
  if(stardust<25){log('Need 25 ★ Stardust to reroll.','#ff4f6e');return}
  stardust-=25;
  it.aff=genAffixes(it.r,it.ilvl);
  if(it.r===5)it.trait=pick(TKEYS);
  calc();log(`Rerolled ${it.name}`,colorOf(it));SFX.play('node');renderInv();
}

/* ----- sorting, filtering and stat comparison ----- */
const SORTS=[['new','Newest'],['rarity','Rarity'],['level','Level'],['type','Type']];
const GROUPS=[['all','All'],['weapon','Weapons'],['armour','Armour'],['jewel','Jewellery']];
let sortMode='new',groupMode='all';
function bagView(){
  const list=invMode==='stash'?stash:inv;
  let v=list.filter(it=>groupMode==='all'||SLOTGROUP[it.slot]===groupMode);
  const by={
    new:(a,b)=>(b.got||0)-(a.got||0)||b.id-a.id,
    rarity:(a,b)=>b.r-a.r||b.ilvl-a.ilvl||b.id-a.id,
    level:(a,b)=>b.ilvl-a.ilvl||b.r-a.r||b.id-a.id,
    type:(a,b)=>SLOTS.indexOf(a.slot)-SLOTS.indexOf(b.slot)||b.r-a.r||b.ilvl-a.ilvl||b.id-a.id
  }[sortMode];
  return v.slice().sort(by);
}
// [stat key, label, decimals, lower-is-better]
const CMP=[['damage','Damage',1],['atkRate','Swing / s',2],['critC','Crit %',1],['critM','Crit damage %',0],
  ['maxHp','Max Hull',0],['maxSh','Ward',0],['regen','Regen / s',1],['leech','Leech %',1],['spd','Stride',0],
  ['range','Reach',0],['arcDeg','Arc °',0],['mag','Pickup',0],['rollCD','Roll cooldown',2,true]];
function compareStats(it){
  const after=computeStats({...eq,[it.slot]:it});
  const out=[];
  for(const [k,label,d,low] of CMP){
    const diff=after[k]-S[k];
    if(Math.abs(diff)<Math.pow(10,-d)/2)continue;
    const better=low?diff<0:diff>0;
    out.push({k,label,diff,d,better});
  }
  const lost=S.traits.filter(t=>!after.traits.includes(t)),gained=after.traits.filter(t=>!S.traits.includes(t));
  return {rows:out,lost,gained};
}
const fmtDiff=r=>(r.diff>0?'+':'')+r.diff.toFixed(r.d);
/* Item art: weapons and chest armour use Momentary Unicorn's 32px sprites (mu_items.png:
   Sword 1-7 = 0-6, Axe 1-8 = 7-14, Armor 1-4 = 15-18). Rarer items get the fancier variants.
   Everything else keeps the 16px icons in item_icons.png. */
const AXE_BASES=new Set(['Brimstone Cleaver','Damnation Glaive']);
function muIcon(it){
  if(!it||!IMG.mu)return -1;
  if(it.icon!=null)return it.icon;
  const h=[...it.base].reduce((a,c)=>a+c.charCodeAt(0),0);
  if(it.slot==='blade')return AXE_BASES.has(it.base)?7+Math.min(7,it.r+(h%3)):Math.min(6,Math.floor(it.r*1.2)+(h%2));
  if(it.slot==='plate')return 15+Math.min(3,Math.floor(it.r/1.5));
  return -1;
}
function iconStyle(slot,it){
  const m=muIcon(it);
  if(m>=0)return `background-image:url(assets/items/mu_items.png);background-size:calc(var(--u)*${16*28}) calc(var(--u)*16);background-position:calc(var(--u)*${-16*m}) 0`;
  return `background-position:calc(var(--u)*${-16*Math.max(0,SLOTS.indexOf(slot))}) 0`;
}
// Draw an item's icon at 16x16 (the 32px sprites shrink by exactly half, so they stay crisp)
function drawItemIcon(it,x,y){
  const m=muIcon(it);
  if(m>=0)ctx.drawImage(IMG.mu,m*32,0,32,32,x,y,16,16);
  else ctx.drawImage(IMG.items,Math.max(0,SLOTS.indexOf(it.slot))*16,0,16,16,x,y,16,16);
}
function itemBlock(it){
  return `<span class="nm" style="color:${colorOf(it)}">${esc(it.name)}${it.emp?` <span style="color:#8fa8ff">+${it.emp}%</span>`:''}</span>`+
    `<span class="meta">${RAR[it.r].n} · ${SLOTNAME[it.slot]} · iLvl ${it.ilvl} · base ${it.bv}</span><br>`+
    it.aff.map(a=>esc(fmtAff(a))).join('<br>')+(it.trait?`<br><span class="trait">${TR[it.trait]}</span>`:'');
}
function renderInv(){
  if(!invOpen)return;
  if(!inShack())invMode='bag';
  const list=invMode==='stash'?stash:inv;
  $('modeTabs').innerHTML=inShack()?`<button class="mini ${invMode==='bag'?'on':''}" data-mode="bag">Bag ${inv.length}/60</button> `+
    `<button class="mini ${invMode==='stash'?'on':''}" data-mode="stash">Stash ${stash.length}/${STASH_MAX}</button>`:'';
  $('invtitle').textContent=`${inv.length} / 60 relics · ★ ${stardust} Stardust`;
  // equipped slots
  $('equip').innerHTML=SLOTS.map(slot=>{
    const it=eq[slot];
    const body=it?`<span class="nm" style="color:${colorOf(it)}">${esc(it.name)}</span><span class="muted">${RAR[it.r].n} · iLvl ${it.ilvl}</span>`+
      `<button class="mini" data-reroll="${slot}" title="Reroll affixes for 25 ★">Reroll 25★</button>`:'<span class="muted">Empty</span>';
    return `<div class="eslot slotf hit" data-slot="${slot}" style="${it?`box-shadow:0 0 0 calc(var(--u)*1) ${RAR[it.r].c}`:''}">`+
      `<div class="ico" style="${iconStyle(slot,it)};${it?'':'opacity:.25'}"></div><span class="lbl">${SLOTNAME[slot]}</span>${body}</div>`;
  }).join('');
  // filter + sort tabs
  $('filterTabs').innerHTML=GROUPS.map(([k,l])=>{
    const n=k==='all'?list.length:list.filter(it=>SLOTGROUP[it.slot]===k).length;
    return `<button class="mini ${groupMode===k?'on':''}" data-group="${k}">${l} ${n}</button>`}).join(' ');
  const commons=list.filter(it=>it.r===0).length;
  if(commons)$('filterTabs').innerHTML+=` <button class="mini" data-commons title="Salvage every Common item here">Salvage ${commons} common</button>`;
  $('sortTabs').innerHTML=SORTS.map(([k,l])=>`<button class="mini ${sortMode===k?'on':''}" data-sort="${k}">${l}</button>`).join(' ');
  // bag
  const view=bagView();
  $('grid').innerHTML=view.map(it=>{
    const c=colorOf(it),cmp=compareStats(it);
    const top=cmp.rows.slice().sort((a,b)=>Math.abs(b.diff/(S[b.k]||1))-Math.abs(a.diff/(S[a.k]||1))).slice(0,3);
    const deltas=top.length?top.map(r=>`<span class="${r.better?'up':'down'}">${r.better?'▲':'▼'} ${r.label} ${fmtDiff(r)}</span>`).join('<br>'):'<span class="same">= no change</span>';
    return `<div class="card" data-id="${it.id}" style="border-color:${c};--rc:${c}66">`+
      `<div class="ico" style="${iconStyle(it.slot,it)}"></div>`+
      `<span class="nm" style="color:${c}">${esc(it.name)}</span><span class="meta">${RAR[it.r].n} ${SLOTNAME[it.slot]} · iLvl ${it.ilvl}</span>`+
      `<div class="delta">${deltas}</div>`+
      `<div class="acts">`+(invMode==='stash'?`<button class="mini" data-take="${it.id}">Take</button><button class="mini" data-sequip="${it.id}">Equip</button>`:
        `<button class="mini" data-equip="${it.id}">Equip</button>`+(inShack()?`<button class="mini" data-store="${it.id}" title="Keep it safe in the stash">Store</button>`:''))+
      `<button class="mini" data-salvage="${it.id}" title="Salvage for ★${Math.ceil(it.bv/2)+it.r*3}">Salvage ★${Math.ceil(it.bv/2)+it.r*3}</button></div></div>`;
  }).join('') || `<span class="muted">${invMode==='stash'?(stash.length?'Nothing of that kind.':'Your stash is empty. Store items here to keep them safe, even if you die.'):inv.length?'Nothing of that kind.':'No relics yet. Go kill something.'}</span>`;
  // totals
  const row=(l,v)=>`<div class="row"><span>${l}</span><b>${v}</b></div>`;
  $('stats').innerHTML=`<h3>Totals</h3>`+
    row('Max Hull',Math.round(P.maxHp))+row('Max Ward',Math.round(S.maxSh))+row('Damage',S.damage.toFixed(1))+
    row('Swing speed',S.atkRate.toFixed(2)+'/s')+row('Crit',`${S.critC.toFixed(1)}% ×${(S.critM/100).toFixed(2)}`)+
    row('Reach / Arc',`${S.range.toFixed(0)} / ${S.arcDeg.toFixed(0)}°`)+row('Stride',S.spd.toFixed(0))+row('Pickup',S.mag.toFixed(0))+
    row('Regen',S.regen.toFixed(1)+'/s')+row('Leech',S.leech.toFixed(1)+'%')+row('Roll CD',S.rollCD.toFixed(2)+'s')+
    `<h3>Loot filter</h3>${FILTERS[filter]} <span class="muted small">(F)</span>`+
    `<h3>Traits</h3>${S.traits.length?S.traits.map(t=>`<div class="trait">${TR[t]}</div>`).join(''):'<span class="muted small">None. Find a MYTHIC.</span>'}`;
}
/* Tooltip: full item text + comparison against what is equipped in that slot */
function showTip(html,ev){
  const t=$('tip');t.innerHTML=html;t.style.display='block';moveTip(ev);
}
function moveTip(ev){
  const t=$('tip');if(t.style.display!=='block')return;
  const r=$('ui').getBoundingClientRect();
  let x=ev.clientX-r.left+14,y=ev.clientY-r.top+14;
  if(x+t.offsetWidth>r.width)x=ev.clientX-r.left-t.offsetWidth-10;
  if(y+t.offsetHeight>r.height)y=Math.max(4,r.height-t.offsetHeight-4);
  t.style.left=x+'px';t.style.top=y+'px';
}
function hideTip(){const t=$('tip');if(t)t.style.display='none'}
function tipForItem(it){
  const cur=eq[it.slot],cmp=compareStats(it);
  let h=itemBlock(it)+'<hr>';
  h+=cur?`<span class="muted small">Compared with your ${SLOTNAME[it.slot]}:</span><br><span style="color:${colorOf(cur)}">${esc(cur.name)}</span>`:
    `<span class="muted small">${SLOTNAME[it.slot]} slot is empty.</span>`;
  h+='<div class="cmp delta">'+(cmp.rows.length?cmp.rows.map(r=>`<span>${r.label}</span><span class="${r.better?'up':'down'}">${fmtDiff(r)}</span>`).join(''):'<span class="same">No stat change</span><span></span>')+'</div>';
  cmp.gained.forEach(t=>h+=`<div class="up small">+ ${TR[t]}</div>`);
  cmp.lost.forEach(t=>h+=`<div class="down small">− loses ${TR[t]}</div>`);
  return h+`<hr><span class="muted small">${invMode==='stash'?'Click: take into your bag':'Click: equip'} · Right-click: salvage</span>`;
}
$('grid').onclick=e=>{
  const b=e.target.closest('button');
  if(b){
    if(b.dataset.equip)equipId(+b.dataset.equip);
    else if(b.dataset.store)storeId(+b.dataset.store);
    else if(b.dataset.take)takeId(+b.dataset.take);
    else if(b.dataset.sequip)equipFromStash(+b.dataset.sequip);
    else if(b.dataset.salvage)(invMode==='stash'?salvageFromStash:salvageId)(+b.dataset.salvage);
    return;
  }
  const c=e.target.closest('.card');if(c)(invMode==='stash'?takeId:equipId)(+c.dataset.id);
};
$('grid').oncontextmenu=e=>{e.preventDefault();const c=e.target.closest('.card');if(c)(invMode==='stash'?salvageFromStash:salvageId)(+c.dataset.id)};
$('modeTabs').onclick=e=>{const b=e.target.closest('[data-mode]');if(b){invMode=b.dataset.mode;hideTip();renderInv()}};
$('equip').onclick=e=>{const b=e.target.closest('[data-reroll]');if(b)rerollSlot(b.dataset.reroll)};
$('bagTools').onclick=e=>{
  if(e.target.closest('[data-commons]')){salvageCommons();return}
  const g=e.target.closest('[data-group]');if(g){groupMode=g.dataset.group;renderInv();return}
  const s=e.target.closest('[data-sort]');if(s){sortMode=s.dataset.sort;renderInv()}
};
$('inv').addEventListener('mouseover',e=>{
  const c=e.target.closest('.card');
  if(c){const id=+c.dataset.id,it=inv.find(i=>i.id===id)||stash.find(i=>i.id===id);if(it){showTip(tipForItem(it),e);return}}
  const s=e.target.closest('.eslot');
  if(s&&eq[s.dataset.slot]){showTip(itemBlock(eq[s.dataset.slot])+'<hr><span class="muted small">Equipped</span>',e);return}
  hideTip();
});
$('inv').addEventListener('mousemove',moveTip);
$('inv').addEventListener('mouseleave',hideTip);
function toggleInv(on){
  if(scene!=='game'||paused)return;
  invOpen=on??!invOpen;
  if(!invOpen)invMode='bag';
  setOverlay('inv',invOpen);mouse.down=false;hideTip();
  if(invOpen)renderInv();
}


function openChest(){
  if(level&&level.safe){
    if(level.stash&&dist(level.stash,P)<52){openStash();return}
    if(level.bed&&dist(level.bed,P)<44){restAtBed();return}
    if(level.engine&&dist(level.engine,P)<56){openEngine();return}
  }
  let best=null,bd=44;
  for(const c of chests){const d=dist(c,P);if(!c.open&&d<bd){bd=d;best=c}}
  if(!best)return;
  best.open=true;SFX.play('chest');
  if(best.reward&&floor===2&&!P.gotAltarBlade){
    // first stage cleared: the chest holds the Altar-Forged Blade
    P.gotAltarBlade=true;
    const it=makeItem('blade',6,4);
    it.r=4;it.base='Hellforged Greatsword';it.name='Altar-Forged Blade';it.trait='pyre';it.icon=6;it.unique=true;
    it.bv=Math.round(it.bv*1.3);
    it.x=best.x;it.y=best.y+22;it.age=0;it.bob=0;ground.push(it);
    announce('ALTAR-FORGED BLADE','#ff8a2b',4,'Legendary · PYRE: your Fire Line burns twice as far');
    log('The chest holds the Altar-Forged Blade. Equip it (I) to empower your Fire Line.','#ff8a2b');
    SFX.play('levelup');
  }
  // items only drop from monsters now: chests pay out stardust (the reward chest also gives perks
  // and, after the first level, the Altar-Forged Blade)
  const dust=best.reward?20:10;stardust+=dust;addText(best.x,best.y-20,`+${dust} STARDUST`,COL.arcane,1);
  burst(best.x,best.y,'#ffe14f',30);
  log('Chest opened.','#ffe14f');
  // the level just finished (floor-1) may grant a perk choice too
  if(best.reward&&PERK_LEVELS.includes(floor-1)&&!P.perkFrom?.includes(floor-1)){(P.perkFrom=P.perkFrom||[]).push(floor-1);setTimeout(offerPerks,400)}
}
