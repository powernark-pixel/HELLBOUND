/* HELLBOUND · js/assets.js · Loading PNG art and sprite sheets, and drawing sprites
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   1. ASSET PIPELINE
   Real pixel art lives in assets/ (built by tools/art/build_art.py).
   If a file is missing, the game falls back to placeholder art drawn
   in code, so it always runs.
   ===================================================================== */
const ASSET_PATHS={
  player:'assets/sprites/player/knight_sheet.png',
  imp:'assets/sprites/enemies/imp_sheet.png',
  hound:'assets/sprites/enemies/hound_sheet.png',
  archer:'assets/sprites/enemies/archer_sheet.png',
  demon:'assets/sprites/enemies/demon_sheet.png',
  warden:'assets/sprites/enemies/warden_sheet.png',
  tiles:'assets/tiles/dungeon_tiles.png',
  items:'assets/items/item_icons.png',
  effects:'assets/effects/effects.png',
  title:'assets/ui/title_bg.png',
  altar:'assets/tiles/altar.png',
  hearth:'assets/tiles/hearth.png',
  mu:'assets/items/mu_items.png',                   // item art by Momentary Unicorn (see CREDITS.md)
  flask:'assets/items/blood_flask.png',             // Momentary Unicorn's potion, recoloured to blood
  torch:'assets/props/wall_torch.png',              // Dungeon Tileset II Extended by Niji (CC0)
  rat:'assets/sprites/enemies/rat_sheet.png',      // Dark Enemies Pack by WilliamQM (see CREDITS.md)
  bloodfx:'assets/fx/blood_fx.png'                 // Blood FX by jasontomlee (see CREDITS.md)
};
// SHEETS: how each PNG sprite sheet is cut up.
// fw/fh = frame size. ax/ay = the point in the frame placed on the entity's position.
// row = which row holds the animation, n = frame count, fps = speed, loop = repeat or hold last frame.
const MON_ANIMS={
  idle:  {row:0,n:4,fps:5, loop:true},
  walk:  {row:1,n:4,fps:9, loop:true},
  attack:{row:2,n:3,fps:12,loop:false},
  hurt:  {row:3,n:2,fps:12,loop:false},
  death: {row:4,n:4,fps:7, loop:false}};
const SHEETS={
  player:{fw:32,fh:32,ax:16,ay:22,anims:{
    idle:  {row:0,n:4,fps:4, loop:true},
    walk:  {row:1,n:6,fps:12,loop:true},
    attack:{row:2,n:4,fps:16,loop:false},
    hurt:  {row:3,n:2,fps:10,loop:false},
    death: {row:4,n:4,fps:5, loop:false}}},
  imp:   {fw:24,fh:24,ax:12,ay:15,anims:MON_ANIMS},
  hound: {fw:32,fh:32,ax:16,ay:20,anims:MON_ANIMS},
  archer:{fw:32,fh:32,ax:15,ay:20,anims:MON_ANIMS},
  demon: {fw:40,fh:40,ax:20,ay:26,anims:MON_ANIMS},
  warden:{fw:56,fh:56,ax:28,ay:36,anims:MON_ANIMS},
  rat:{fw:32,fh:32,ax:16,ay:26,anims:{
    idle:  {row:0,n:6,fps:8, loop:true},
    walk:  {row:1,n:6,fps:16,loop:true},
    attack:{row:2,n:6,fps:16,loop:false},
    hurt:  {row:3,n:1,fps:10,loop:false},
    death: {row:4,n:6,fps:12,loop:false}}}
};
// BLOOD_FX: the 9 effects in assets/fx/blood_fx.png (110x93 cells, one effect per row).
// from = first frame, n = frames, ox/oy = where the blood starts inside the cell.
const BLOOD_FX=[{row:0,from:1,n:7,ox:56,oy:81},{row:1,from:0,n:9,ox:49,oy:62},{row:2,from:0,n:5,ox:42,oy:61},
  {row:3,from:0,n:10,ox:38,oy:77},{row:4,from:0,n:8,ox:36,oy:57},{row:5,from:0,n:8,ox:41,oy:58},
  {row:6,from:0,n:14,ox:32,oy:57},{row:7,from:0,n:7,ox:56,oy:75},{row:8,from:0,n:10,ox:18,oy:73}];
const BLOOD_SETS={hit:[2,7],kill:[1,3,4,5,8],big:[6,0]};   // small sprays for hits, bigger for kills and the Warden
let fxs=[],impacts=[],hitStop=0,fireWaves=[],pillars=[],burns=[];   // impacts: bright hit flashes; hitStop: a tiny freeze on big hits
// Spawn a blood effect at x,y. flip mirrors it so the blood sprays away from the knight.
function bloodFx(x,y,set,flip){
  flip=(x-y)<(P.x-P.y);
  if(!IMG.bloodfx||fxs.length>40)return;
  fxs.push({d:BLOOD_FX[pick(BLOOD_SETS[set])],x:Math.round(x),y:Math.round(y),t:0,flip});
}
// Code-drawn fallbacks (old 16px placeholders, drawn at 2x)
const FALLBACK_SHEETS={
  player:{fw:16,fh:16,ax:8,ay:8,scale:SPR,anims:{
    idle:{row:0,n:4,fps:5,loop:true},walk:{row:1,n:6,fps:12,loop:true},attack:{row:2,n:4,fps:14,loop:false},
    hurt:{row:3,n:2,fps:10,loop:false},death:{row:4,n:4,fps:6,loop:false}}},
  imp:{fw:16,fh:16,ax:8,ay:8,scale:SPR,anims:{
    idle:{row:0,n:4,fps:5,loop:true},walk:{row:1,n:4,fps:10,loop:true},attack:{row:2,n:3,fps:12,loop:false},
    hurt:{row:3,n:2,fps:10,loop:false},death:{row:4,n:4,fps:6,loop:false}}}
};
// TILE_NAMES: order of the 32px tiles in dungeon_tiles.png (must match tools/art/environment.py)
const TILE_NAMES=['floor0','floor1','floor2','floorBlood','floorCrack',
  'wallTop','wallFace','wallCross','wallWindow','wallSconce','wallChains','wallOssuary','wallBlood',
  'lava0','lava1','lava2','stairs','stairsSealed','chestShut','chestOpen',
  'decoSkulls','decoBones','decoCandles','decoPool','decoPillar','decoCrucifix',
  'blood0','blood1','blood2','carpetH','carpetV','floorSigil',
  'woodFloor0','woodFloor1','woodWallFace','woodWallTop','woodWindow','trapdoor','stash','decoBed','decoRug'];
// Fallback tile sheet (16px code art): which old tile stands in for each name
const FALLBACK_TILE={floor0:0,floor1:1,floor2:0,floorBlood:1,floorCrack:0,wallTop:2,wallFace:3,wallCross:3,wallWindow:3,
  wallSconce:3,wallChains:3,wallOssuary:3,wallBlood:3,lava0:4,lava1:5,lava2:4,stairs:6,stairsSealed:6,chestShut:7,chestOpen:8,
  blood0:4,blood1:5,blood2:4,carpetH:1,carpetV:1,floorSigil:1,
  woodFloor0:0,woodFloor1:1,woodWallFace:3,woodWallTop:2,woodWindow:3,trapdoor:6,stash:7};
// Candle wick positions inside the decor/sconce tiles (for animated flames + light)
const FLAMES={decoCandles:[[9,15],[15,11],[21,16],[12,18]],wallSconce:[[16,9]]};
const IMG={}, SD={}, TS={img:null,size:32,idx:{}};

function loadAssets(){
  return Promise.all(Object.keys(ASSET_PATHS).map(key=>new Promise(res=>{
    let done=false;
    const finish=(img,real)=>{if(done)return;done=true;IMG[key]=img;
      if(SHEETS[key])SD[key]=real?SHEETS[key]:FALLBACK_SHEETS[key]||null;
      if(key==='tiles'){TS.img=img;TS.size=real?32:16;
        TILE_NAMES.forEach((n,i)=>TS.idx[n]=real?i:(FALLBACK_TILE[n]??-1))}
      res()};
    const im=new Image();
    im.onload=()=>finish(im,true);
    im.onerror=()=>finish(makeFallback(key),false);
    im.src=ASSET_PATHS[key];
    setTimeout(()=>finish(makeFallback(key),false),4000);   // safety timeout
  })));
}
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function makeFallback(key){
  if(key==='player')return makeSheet(FALLBACK_SHEETS.player,drawKnight);
  if(key==='imp')return makeSheet(FALLBACK_SHEETS.imp,drawImp);
  if(key==='tiles')return makeTiles();
  if(key==='items')return makeItemIcons();
  if(key==='effects')return makeEffects();
  return null;   // no fallback: those enemies are drawn as shapes
}
// Builds a sheet by calling drawFn for every frame of every animation row.
function makeSheet(sd,drawFn){
  const names=Object.keys(sd.anims);
  let maxN=0;names.forEach(n=>maxN=Math.max(maxN,sd.anims[n].n));
  const c=mk(maxN*sd.fw,names.length*sd.fh), g=c.getContext('2d');
  for(const name of names){
    const A=sd.anims[name];
    for(let f=0;f<A.n;f++){g.save();g.translate(f*sd.fw,A.row*sd.fh);drawFn(g,name,f);g.restore()}
  }
  return c;
}
// Placeholder knight (16x16 pixels), only used if the PNG is missing.
function drawKnight(g,anim,f){
  const bob=(anim==='idle'||anim==='walk')&&f%2?-1:0;
  const lean=anim==='attack'?[0,1,2,1][f%4]:0;
  const legA=anim==='walk'?(f%2?1:-1):0;
  if(anim==='death'){g.translate(8,12);g.rotate(Math.min(f,3)*0.4);g.translate(-8,-12);g.globalAlpha=1-f*0.15}
  g.fillStyle='#3a0408';g.fillRect(3,7+bob,10,9);
  g.fillStyle='#7a1010';g.fillRect(4,6+bob,8,8);
  g.fillStyle='#3a3f4c';g.fillRect(5+legA,12,2,4);g.fillRect(9-legA,12,2,4);
  g.fillStyle='#8a93a8';g.fillRect(5+lean,6+bob,6,6);
  g.fillStyle='#e4e9f4';g.fillRect(6+lean,7+bob,2,3);
  g.fillStyle='#c9a24a';g.fillRect(5+lean,11,6,1);
  g.fillStyle='#d8dde8';g.fillRect(3+lean,5+bob,3,3);g.fillRect(10+lean,5+bob,3,3);
  g.fillStyle='#4a5160';g.fillRect(3+lean,7+bob,3,1);g.fillRect(10+lean,7+bob,3,1);
  g.fillStyle='#aab3c5';g.fillRect(5,1+bob,6,5);
  g.fillStyle='#1a1d26';g.fillRect(5,1+bob,6,1);
  g.fillStyle='#ff5a1a';g.fillRect(6,3+bob,4,1);
  g.fillStyle='#c4142a';g.fillRect(7,-1+bob,2,2);
  g.fillStyle='#4a2a10';g.fillRect(1,8+bob,3,5);g.fillStyle='#c9a24a';g.fillRect(2,9+bob,1,3);
  if(anim==='hurt'){g.globalCompositeOperation='source-atop';g.fillStyle='rgba(255,40,40,0.65)';g.fillRect(0,0,16,16);g.globalCompositeOperation='source-over'}
}
// Placeholder imp (16x16 pixels), only used if the PNG is missing.
function drawImp(g,anim,f){
  const bob=(anim==='idle'||anim==='walk')&&f%2?-1:0;
  const legA=anim==='walk'?(f%2?1:-1):0;
  const armY=anim==='attack'?-2:0;
  if(anim==='death'){g.translate(8,12);g.rotate(Math.min(f,3)*0.4);g.translate(-8,-12);g.globalAlpha=1-f*0.15}
  g.fillStyle='#5a1a0a';g.fillRect(5+legA,12,2,3);g.fillRect(9-legA,12,2,3);
  g.fillStyle='#c4501a';g.fillRect(5,8+bob,6,5);
  g.fillStyle='#ff9a3c';g.fillRect(2,8+bob+armY,2,3);g.fillRect(12,8+bob+armY,2,3);
  g.fillStyle='#ff9a3c';g.fillRect(4,3+bob,8,6);
  g.fillStyle='#e8d0a0';g.fillRect(3,1+bob,2,3);g.fillRect(11,1+bob,2,3);
  g.fillStyle='#ffe6a0';g.fillRect(5,5+bob,2,2);g.fillRect(9,5+bob,2,2);
  g.fillStyle='#000';g.fillRect(6,5+bob,1,1);g.fillRect(10,5+bob,1,1);
  g.fillStyle='#2a0a04';g.fillRect(6,8+bob,4,1);
  if(anim==='hurt'){g.globalCompositeOperation='source-atop';g.fillStyle='rgba(255,255,255,0.7)';g.fillRect(0,0,16,16);g.globalCompositeOperation='source-over'}
}
// Placeholder dungeon tiles: 9 tiles in one row, only used if the PNG is missing.
function makeTiles(){
  const c=mk(16*9,16),g=c.getContext('2d');
  const noisy=(i,col,amt)=>{g.save();g.translate(i*16,0);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=hash(x+i*7,y+i*3)*amt;
      g.fillStyle=`rgb(${col[0]+k},${col[1]+k*.5},${col[2]+k*.4})`;g.fillRect(x,y,1,1)}
    g.restore()};
  noisy(0,[52,38,42],18);
  noisy(1,[44,32,36],16);g.fillStyle='#120a0e';g.fillRect(20,6,1,4);g.fillRect(26,10,3,1);
  noisy(2,[34,22,28],12);g.fillStyle='#4a3038';g.fillRect(32,0,16,1);
  noisy(3,[90,40,28],22);g.fillStyle='#2a120c';g.fillRect(48,14,16,2);
  noisy(4,[200,70,20],60);noisy(5,[255,130,40],60);
  g.fillStyle='#ffd27a';g.fillRect(86,5,3,3);g.fillRect(74,11,2,2);
  g.fillStyle='#2a0a0a';g.fillRect(96,0,16,16);
  g.strokeStyle='#ffb347';g.lineWidth=2;g.beginPath();g.arc(104,8,4,0,TAU);g.stroke();
  g.fillStyle='#5a3416';g.fillRect(114,5,12,9);g.fillStyle='#c9a24a';g.fillRect(114,8,12,2);
  g.fillStyle='#3a2410';g.fillRect(130,8,12,6);g.fillStyle='#ffe14f';g.fillRect(132,4,8,2);
  return c;
}
// Placeholder item icons, one per equipment slot (order = SLOTS)
function makeItemIcons(){
  const c=mk(16*8,16),g=c.getContext('2d');
  g.strokeStyle='#f2e8dc';g.fillStyle='#f2e8dc';g.lineWidth=1.5;
  const at=(i,fn)=>{g.save();g.translate(i*16,0);fn();g.restore()};
  at(0,()=>{g.beginPath();g.arc(8,9,5,Math.PI,0);g.stroke();g.fillRect(3,9,10,2)});
  at(1,()=>{g.beginPath();g.moveTo(3,13);g.lineTo(13,3);g.stroke();g.fillRect(2,12,3,2)});
  at(2,()=>{g.strokeRect(4,4,8,9)});
  at(3,()=>{g.fillRect(3,6,4,7);g.fillRect(9,6,4,7)});
  at(4,()=>{g.strokeRect(4,3,3,11);g.strokeRect(9,3,3,11)});
  at(5,()=>{g.fillRect(4,4,3,8);g.fillRect(4,10,8,3)});
  at(6,()=>{g.beginPath();g.arc(8,8,5,0,TAU);g.stroke()});
  at(7,()=>{g.beginPath();g.moveTo(8,2);g.lineTo(14,8);g.lineTo(8,14);g.lineTo(2,8);g.closePath();g.stroke()});
  return c;
}
// Placeholder effects: glow orb (cell 0) and spark (cell 1)
function makeEffects(){
  const c=mk(128,16),g=c.getContext('2d');
  const gr=g.createRadialGradient(8,8,0,8,8,8);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.4,'rgba(255,255,255,0.5)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,16,16);
  g.fillStyle='#fff';g.fillRect(16+7,4,2,8);g.fillRect(16+4,7,8,2);
  for(let i=2;i<6;i++){g.fillStyle='#6a0e14';g.fillRect(i*16+5,6,6,4)}
  return c;
}

/* ----- DRAW HELPERS (the only code that touches sprite sheets) ----- */
// Which frame to show: loops wrap, one-shot animations hold their last frame.
function animIndex(at,A){const f=Math.floor(at*A.fps);return A.loop?f%A.n:Math.min(A.n-1,f)}
// Draw one sprite frame with its anchor on x,y. flip mirrors it (sheets face right).
// Returns false when there is no art for that key, so callers can fall back to shapes.
function drawSprite(key,anim,at,x,y,flip){
  const sd=SD[key],img=IMG[key];if(!img||!sd)return false;
  const A=sd.anims[anim]||sd.anims.idle;const f=animIndex(at,A);const k=sd.scale||1;
  const w=sd.fw*k,h=sd.fh*k,ax=sd.ax*k,ay=sd.ay*k;
  if(flip){
    ctx.save();ctx.translate(Math.round(x),0);ctx.scale(-1,1);
    ctx.drawImage(img,f*sd.fw,A.row*sd.fh,sd.fw,sd.fh,-ax,Math.round(y-ay),w,h);ctx.restore();
  }else ctx.drawImage(img,f*sd.fw,A.row*sd.fh,sd.fw,sd.fh,Math.round(x-ax),Math.round(y-ay),w,h);
  return true;
}
// Draw one dungeon tile (by name) at world position px,py
function drawTile(name,px,py){
  const i=TS.idx[name];if(i==null||i<0)return false;
  ctx.drawImage(TS.img,i*TS.size,0,TS.size,TS.size,Math.round(px),Math.round(py),T,T);return true;
}
// Switch a character to a new animation and restart its timer
function setAnim(e,name){if(e.anim!==name){e.anim=name;e.animT=0}}
// Pixel helpers: crisp shapes made of whole pixels
function pxRect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function pxShadow(x,y,w){
  ctx.fillStyle='rgba(0,0,0,0.45)';x=Math.round(x);y=Math.round(y);w=Math.max(6,Math.round(w));
  ctx.fillRect(x-w/2+2,y-1,w-4,1);ctx.fillRect(x-w/2,y,w,2);ctx.fillRect(x-w/2+2,y+2,w-4,1);
}
function pxOrb(x,y,r,c){
  x=Math.round(x);y=Math.round(y);r=Math.max(1,Math.round(r));
  ctx.fillStyle=c;ctx.fillRect(x-r,y-r+1,r*2,r*2-2);ctx.fillRect(x-r+1,y-r,r*2-2,r*2);
  ctx.fillStyle='#fff6d8';ctx.fillRect(x-1,y-1,Math.max(1,r-1),Math.max(1,r-1));
}
function pxRing(x,y,r,c,step=0.35){
  ctx.fillStyle=c;for(let a=0;a<TAU;a+=step/Math.max(1,r/8))ctx.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),1,1);
}
function drawFlame(x,y,seed,s=1){
  const f=Math.floor(time*10+seed*7)%3,w=Math.sin(time*13+seed*5)>0?1:0;
  x=Math.round(x);y=Math.round(y);
  ctx.fillStyle='#a12a06';ctx.fillRect(x-1,y+1,3,1);
  ctx.fillStyle='#ff6a1a';ctx.fillRect(x-1,y-1,3,2);
  ctx.fillStyle='#ffd27a';ctx.fillRect(x,y-2-f%2,1,2+f%2);
  ctx.fillStyle='#fff1c2';ctx.fillRect(x+w-1+1,y-3-(f===2?1:0),1,1);
}
