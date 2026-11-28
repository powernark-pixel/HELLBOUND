/* HELLBOUND · js/world.js · Levels: building handcrafted maps, random floors, the shack, the blood vat
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   4. DUNGEON GENERATION (logic unchanged from HELLBOUND v7)
   Map values: 0 = wall, 1 = floor, 2 = lava, 3 = stairs
   decorate() only adds props to draw; it never changes the map.
   ===================================================================== */
function tileAt(x,y){
  const tx=Math.floor(x/T),ty=Math.floor(y/T);
  if(tx<0||ty<0||tx>=MW||ty>=MH)return 0;
  if(level&&level.solid[ty*MW+tx])return 0;   // e.g. the altar slab
  return map[ty][tx];
}
function freeAt(x,y,r){return tileAt(x-r,y-r)&&tileAt(x+r,y-r)&&tileAt(x-r,y+r)&&tileAt(x+r,y+r)}
function slide(e,dx,dy,r){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));
  const sx=dx/steps,sy=dy/steps;
  for(let i=0;i<steps;i++){
    if(freeAt(e.x+sx,e.y,r))e.x+=sx;
    if(freeAt(e.x,e.y+sy,r))e.y+=sy;
  }
}
function roomPos(r){
  for(let i=0;i<30;i++){
    const tx=ri(r.x+1,r.x+r.w-2),ty=ri(r.y+1,r.y+r.h-2);
    if(map[ty][tx]===1)return{x:tx*T+T/2,y:ty*T+T/2};
  }
  return{x:(r.x+r.w/2)*T,y:(r.y+r.h/2)*T};
}
function pickType(){
  if(floor===1)return pick(['imp','imp','hound']);
  if(floor<3)return pick(['imp','hound','archer']);
  return pick(['hound','archer','demon','imp']);
}
// o.hpMul / o.dmgMul / o.spdMul scale an enemy (used by handcrafted levels for tougher areas and elites)
/* ----- BIG FOES: the Warden and the Oculus -----
   Either can be a level's final boss or a mini-boss on the way. A final boss is tougher. */
const BIG_CH={W:'warden',O:'oculus'};   // map letters for big foes
const WARDEN_MINI_HP=0.65;              // the Warden as a mini-boss has this share of his boss health
const BIGS={
  warden:{name:'The Warden',col:'#ff4f6e',wake:'He rises in chains. Roll out of the red lanes',death:'FALLS'},
  oculus:{name:'The Oculus',col:'#9ef0ff',wake:'It has seen you. Step out of the blue rings',death:'IS BLIND'},
};
function spawnBig(ch,x,y,fin){
  const kind=BIG_CH[ch];let e;
  if(kind==='warden')e=spawnEnemy('demon',{x,y,warden:true,hpMul:fin?1:WARDEN_MINI_HP});
  else{e=spawnEnemy('eye',{x,y,hpMul:fin?7:5.5,dmgMul:fin?1.15:1.1});   // eased for now: was 9 / 1.4 as the final boss
    e.ocZ=fin?1.9:1.6;e.r=fin?26:22}
  e.big=kind;e.bossName=BIGS[kind].name;
  return e;
}
const isBig=e=>!!e.big||e===boss;   // bosses and mini-bosses: no knockback, no small hp bar, big death
function spawnEnemy(type,o={}){
  const Tt=ET[type],mult=1+(floor-1)*0.3;
  const hp=(o.warden?900:Tt.hp)*mult*(o.hpMul||1);
  const e={type,x:o.x,y:o.y,hp,max:hp,r:o.warden?34:Tt.r,spd:Tt.spd*(o.spdMul||1),fire:0,touch:0,flash:0,
    warden:!!o.warden,c:o.warden?'#ff2b6b':Tt.c,shape:Tt.shape,wt:0,wa:0,shot:2.4,phase:0,
    anim:'idle',animT:Math.random(),face:1,dmgMul:o.dmgMul||1,elite:!!o.elite,dormant:!!o.dormant};
  enemies.push(e);
  return e;
}

/* ----- HANDCRAFTED LEVELS -----
   Circle 1 is The Blood Altar (levels/blood_altar.js): one long path, seven areas,
   each harder than the last. Deeper circles are still generated at random. */
let level=null;
const FACE_CH={'+':'wallCross',w:'wallWindow',o:'wallOssuary',s:'wallSconce',n:'wallChains',r:'wallBlood'};
const DECO_CH={E:'decoBed',Q:'decoRug',c:'decoCandles',k:'decoSkulls',b:'decoBones',p:'decoPillar',x:'decoCrucifix',u:'decoPool'};
const ENEMY_CH={m:['rat'],i:['imp'],h:['hound'],a:['archer'],d:['demon'],I:['imp',1],H:['hound',1],R:['archer',1],D:['demon',1]};
function buildLevel(L){
  map=Array.from({length:MH},()=>new Uint8Array(MW));
  seen=Array.from({length:MH},()=>new Uint8Array(MW));
  rooms=[];bloodDrops=[];vatFlies=[];vatShown=0;chests=[];enemies=[];bullets=[];ebullets=[];ground=[];corpses=[];decor=[];decals=[];fxs=[];fireWaves=[];pillars=[];burns=[];
  const faces={},floors={},solid=new Uint8Array(MW*MH),areas=[],foes=[];
  let start=null,altarAt=null,hearth=null,stashAt=null,bedAt=null,engineAt=null;const gates=[],bigs=[];
  L.map.forEach((row,y)=>{for(let x=0;x<row.length;x++){
    const ch=row[x],k=x+','+y,px=x*T+T/2,py=y*T+T/2;
    if(ch==='#'||FACE_CH[ch]){if(FACE_CH[ch])faces[k]=FACE_CH[ch];continue}   // walls stay 0
    map[y][x]=ch==='~'?2:ch==='X'?3:1;
    if(ch==='=')floors[k]='carpet';
    if(ch==='g')floors[k]='floorSigil';
    if(ch==='S')start={x:px,y:py};
    if(ch==='X')stairsT={x,y};
    if(ch==='A')altarAt={x:px,y:py,tx:x,ty:y};
    if(ch==='C')chests.push({x:px,y:py,open:false});
    if(ch==='Y')chests.push({x:px,y:py,open:false,reward:true});
    if(DECO_CH[ch])decor.push({tx:x,ty:y,kind:DECO_CH[ch],seed:hash(x,y)});
    if(ch>='2'&&ch<='7')areas.push({x:px,y:py,tx:x,ty:y,n:+ch,done:false});
    if(ENEMY_CH[ch])foes.push({x:px,y:py,tx:x,ty:y,type:ENEMY_CH[ch][0],elite:!!ENEMY_CH[ch][1]});
    if(BIG_CH[ch])bigs.push({ch,x:px,y:py,tx:x,ty:y});
    if(ch==='G')gates.push({tx:x,ty:y});
    if(ch==='F')hearth={tx:x,ty:y};
    if(ch==='Z')stashAt={x:px,y:py,tx:x,ty:y};
    if(ch==='E')bedAt={x:px,y:py};
    if(ch==='M')engineAt={x:px,y:py,tx:x,ty:y};
  }});
  // The altar slab blocks movement (its tiles are still drawn as floor)
  if(altarAt)for(let dx=-1;dx<=1;dx++)solid[altarAt.ty*MW+altarAt.tx+dx]=1;
  // The hearth (2x2 tiles) and the stash chest block movement too
  if(hearth)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)solid[(hearth.ty+dy)*MW+hearth.tx+dx]=1;
  if(stashAt)solid[stashAt.ty*MW+stashAt.tx]=1;
  if(engineAt)solid[engineAt.ty*MW+engineAt.tx]=1;
  // Walk the path from the start (used to check every part of the level can be reached)
  const steps=new Int32Array(MW*MH).fill(-1),q=[];
  const sx=Math.floor(start.x/T),sy=Math.floor(start.y/T);steps[sy*MW+sx]=0;q.push(sx,sy);
  for(let i=0;i<q.length;i+=2){const x=q[i],y=q[i+1],s=steps[y*MW+x];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=MW||ny>=MH||!map[ny][nx]||steps[ny*MW+nx]>=0)continue;
      steps[ny*MW+nx]=s+1;q.push(nx,ny)}}
  // Each enemy takes the toughness of the area it stands in: area 1 is the gentlest, area 7 the hardest
  const tierAt=(tx,ty)=>{for(const [n,x0,y0,x1,y1] of L.zones||[])if(tx>=x0&&tx<=x1&&ty>=y0&&ty<=y1)return n;return 1};
  for(const f of foes){
    const t=tierAt(f.tx,f.ty);
    spawnEnemy(f.type,{x:f.x,y:f.y,hpMul:(1+0.22*(t-1))*(f.elite?1.8:1),dmgMul:(1+0.12*(t-1))*(f.elite?1.35:1),
      spdMul:f.elite?1.15:1,elite:f.elite});
  }
  // Big foes sleep until you walk into their area. The one named by L.finalBoss is the level's
  // BOSS: it waits behind the arena gate and must die before the stairs open. The rest are mini-bosses.
  boss=null;
  for(const b of bigs){
    const fin=b.ch===(L.finalBoss||'W');
    const e=spawnBig(b.ch,b.x,b.y,fin);e.dormant=true;e.wakeArea=tierAt(b.tx,b.ty);
    if(fin)boss=e;else e.miniboss=true;
  }
  P.x=start.x;P.y=start.y;P.vx=0;P.vy=0;
  level={name:L.name,areaNames:L.areas||{},hints:L.hints||{},faces,floors,solid,areas,altarAt,steps,
    safe:!!L.safe,style:L.style||'stone',hearth,stash:stashAt,bed:bedAt,engine:engineAt,gates,sealed:false};
  fillVatNeed();startTrials();   // js/trials.js
  if(level.safe)for(let y=0;y<MH;y++)seen[y].fill(1);   // a safe room is fully visible
}
/* ----- THE ARENA GATE -----
   'G' tiles in a level map are open floor until the boss fight starts. Then they become a wall
   of chains (you're locked in with the level's boss) until it dies. */
function sealArena(){
  if(!level||!level.gates.length||level.sealed)return;
  level.sealed=true;
  for(const g of level.gates){
    // never trap the knight inside the wall: if any part of his body touches the gate tile,
    // push him clear on the boss's side (the inside of the arena)
    const gx=(g.tx+.5)*T,gy=(g.ty+.5)*T,pad=T/2+PLAYER_BODY+2;
    if(Math.abs(P.x-gx)<pad&&Math.abs(P.y-gy)<pad){
      const bx=boss?boss.x-gx:1,by=boss?boss.y-gy:0;
      if(Math.abs(bx)>=Math.abs(by))P.x=gx+Math.sign(bx||1)*pad;else P.y=gy+Math.sign(by||1)*pad;
      P.vx=P.vy=0;P.dash=null;
    }
    map[g.ty][g.tx]=0;level.faces[g.tx+','+g.ty]='wallChains';
    for(let i=0;i<10;i++)parts.push({x:(g.tx+.5)*T+rnd(-12,12),y:(g.ty+.5)*T+rnd(-12,12),vx:rnd(-40,40),vy:rnd(-40,40),life:.6,max:.6,c:pick(['#5d5059','#4a3f48']),s:2,ground:1});
  }
  shake=Math.max(shake,0.7);SFX.play('slam');SFX.play('descend');
}
function openArena(){
  if(!level||!level.sealed)return;
  level.sealed=false;
  for(const g of level.gates){map[g.ty][g.tx]=1;delete level.faces[g.tx+','+g.ty]}
  SFX.play('descend');log('The arena gate grinds open.','#e0bf68');
}
function genFloor(){
  level=null;
  if(floor===1&&window.LEVEL_BLOOD_ALTAR){buildLevel(window.LEVEL_BLOOD_ALTAR);return}
  map=Array.from({length:MH},()=>new Uint8Array(MW));
  seen=Array.from({length:MH},()=>new Uint8Array(MW));
  rooms=[];bloodDrops=[];vatFlies=[];vatShown=0;chests=[];enemies=[];bullets=[];ebullets=[];ground=[];corpses=[];fxs=[];fireWaves=[];pillars=[];burns=[];
  for(let i=0;i<80&&rooms.length<11;i++){
    const w=ri(5,11),h=ri(5,10),x=ri(2,MW-w-3),y=ri(2,MH-h-3);
    if(rooms.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+2&&y+h+2>r.y))continue;
    rooms.push({x,y,w,h});
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)map[yy][xx]=1;
  }
  const cen=r=>({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2)});
  for(let i=1;i<rooms.length;i++){
    const a=cen(rooms[i-1]),b=cen(rooms[i]);
    let x=a.x;while(x!==b.x){map[a.y][x]=1;x+=x<b.x?1:-1}
    let y=a.y;while(y!==b.y){map[y][b.x]=1;y+=y<b.y?1:-1}
  }
  const last=rooms.length-1;
  for(let i=1;i<last;i++){
    if(Math.random()<0.55){
      const r=rooms[i],cx=r.x+r.w/2,cy=r.y+r.h/2,rad=Math.min(r.w,r.h)/2.6;
      for(let yy=r.y;yy<r.y+r.h;yy++)for(let xx=r.x;xx<r.x+r.w;xx++){
        if(map[yy][xx]===1&&Math.hypot(xx+.5-cx,yy+.5-cy)<rad+rnd(-.6,.6))map[yy][xx]=2;
      }
    }
  }
  const L=rooms[last];
  stairsT={x:L.x+L.w-2,y:L.y+L.h-2};
  map[stairsT.y][stairsT.x]=3;
  for(let i=1;i<last;i++){
    const n=ri(2,3+Math.floor(floor/2));
    for(let k=0;k<n;k++){
      const p=roomPos(rooms[i]);
      spawnEnemy(pickType(),p);
    }
  }
  boss=spawnBig('W',(L.x+L.w/2)*T,(L.y+L.h/2)*T,true);
  const s0=rooms[0];
  P.x=(s0.x+s0.w/2)*T;P.y=(s0.y+s0.h/2)*T;P.vx=0;P.vy=0;
  decorate();
  fillVatNeed();startTrials();   // js/trials.js
}
// Scatter bones, candles, blood and broken pillars on room floors (visual only).
function decorate(){
  decor=[];decals=[];
  const used=new Set(chests.map(c=>Math.floor(c.x/T)+','+Math.floor(c.y/T)));
  used.add(stairsT.x+','+stairsT.y);
  const kinds=['decoBones','decoBones','decoSkulls','decoCandles','decoCandles','decoPool','decoPillar','decoCrucifix'];
  rooms.forEach((r,ri_)=>{
    const n=ri_===0?2:ri(1,3);
    for(let k=0;k<n;k++){
      const tx=ri(r.x,r.x+r.w-1),ty=ri(r.y,r.y+r.h-1),key=tx+','+ty;
      if(map[ty][tx]!==1||used.has(key))continue;
      used.add(key);
      decor.push({tx,ty,kind:pick(kinds),seed:Math.random()});
    }
  });
}
function circleName(){
  if(level)return level.name;
  const i=(floor-1)%CIRCLES.length;
  return CIRCLES[i]+(floor>CIRCLES.length?` (depth ${floor})`:'');
}
function newGame(){
  floor=1;
  P={x:0,y:0,vx:0,vy:0,hp:100,sh:0,maxHp:100,maxSh:0,lvl:1,xp:0,xpNext:30,
     atk:0,atkAnim:0,hurtT:0,roll:0,inv:0,sinceHit:9,aim:0,face:1,swings:0,warned:false,
     anim:'idle',animT:0,bonusHp:0,boons:[],perks:[],vessel:0,sigils:0,stam:STAM_MAX,stamT:0,stagger:0,pend:null,ichor:0,surgeT:0,dash:null,ghosts:[],stepT:0,hbT:0,fireCD:0,gotAltarBlade:false,flasks:FLASK_MAX,comboStep:0,comboT:0,atkHeavy:false,lunge:null,flaskProg:0,healLeft:0,healT:0,spinCD:0};
  eq={blade:makeItem('blade',1,0),helm:null,plate:null,gloves:null,greaves:null,boots:null,ring:null,sigil:null};
  inv=[];stardust=0;filter=0;dead=false;shake=0;parts=[];texts=[];swings=[];invOpen=false;pickupSeq=0;
  closeAllOverlays();
  $('log').innerHTML='';
  genFloor();calc();P.hp=P.maxHp;P.sh=P.maxSh;
  log('You descend into hell. Your blade is all you have.','#ffb347');
  announce(`CIRCLE 1: ${circleName()}`,'#ff7a2b',3,level?level.hints[1]:'');
}
/* ----- THE BLOOD VAT -----
   Every kill pours blood into the vat (tougher foes give more). The stairs stay sealed until
   the vat is full AND the boss is dead, so you can't rush past a level. The vat needs
   VAT_SHARE of all the blood in the level: most of it, but not every last rat. */
const VAT_SHARE=0.7;   // the bot playtest filled 60% by area 5 or 6; 70% still fills before the Warden without grinding
let vat=0,vatNeed=0;
const bloodOf=e=>e===boss?60:e.miniboss?50:(ET[e.type].xp*(e.elite?2:1));
function fillVatNeed(){vat=0;vatNeed=Math.round(enemies.reduce((t,e)=>t+bloodOf(e),0)*VAT_SHARE)}
const vatFull=()=>vat>=vatNeed;
const stairsLocked=()=>!(level&&level.safe)&&((boss&&!boss.dead)||!vatFull());
// collecting blood: see js/blood.js (spillBlood, addBlood)

/* ----- THE SHACK: the hideout after every level -----
   The stairs at the end of each level lead here. Finishing a level earns a reward:
   +10 max health every time, and every third level a permanent MYTHIC trait (a boon).
   Rest, open the reward chest, keep items in the stash, then take the trapdoor down.
   (These rewards are placeholders, to tune after play-testing.) */
const BOON_EVERY=3;
function completionReward(done){
  P.bonusHp=(P.bonusHp||0)+10;
  reforgeVessel();   // blood sigils from trials grow the vat's vessel (js/trials.js)
  let boon=null;
  if(done%BOON_EVERY===0){
    const left=TKEYS.filter(k=>!(P.boons||[]).includes(k));
    if(left.length){boon=pick(left);P.boons.push(boon)}else P.bonusHp+=25;
  }
  return boon;
}
function enterShack(){
  const done=floor-1,boon=completionReward(done);
  buildLevel(window.LEVEL_SHACK);calc();
  P.hp=P.maxHp;P.sh=P.maxSh;P.warned=false;invMode='bag';P.flasks=flaskMax();P.flaskProg=0;
  SFX.play('levelup');
  if(boon){
    log(`Circle ${done} complete: +10 max health, and a boon: ${TR[boon]}`,'#ff8ad8');
    announce('BOON','#ff8ad8',4,TR[boon]);
  }else{
    log(`Circle ${done} complete: +10 max health. Your wounds close by the fire.`,'#ffb347');
    announce('THE SHACK','#e0bf68',3,`Circle ${done} complete · +10 max health`);
  }
}
function leaveShack(){
  closeAllOverlays();
  genFloor();calc();P.warned=false;SFX.play('descend');
  announce(`CIRCLE ${floor}: ${circleName()}`,floor===1?'#ff7a2b':'#b46bff',3,level&&level.hints?level.hints[1]||'':'');
  log(floor===1?'You descend into hell. Your blade is all you have.':`Descended to Circle ${floor}`,'#b46bff');
}
function restAtBed(){
  P.hp=P.maxHp;P.sh=P.maxSh;SFX.play('node');
  log('You rest by the fire. Your wounds close.','#e0bf68');
  addText(P.x,P.y-24,'RESTED','#e0bf68',1);
}
function descend(){
  trialEvent('stairs');
  floor++;SFX.play('descend');
  if(window.LEVEL_SHACK){enterShack();return}
  genFloor();calc();
  P.hp=Math.min(P.maxHp,P.hp+P.maxHp*0.3);
  P.warned=false;
  announce(`CIRCLE ${floor}: ${circleName()}`,'#b46bff',2.4);
  log(`Descended to Circle ${floor}`,'#b46bff');
}
