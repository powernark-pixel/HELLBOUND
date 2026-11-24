/* HELLBOUND · js/render.js · Drawing the world in isometric view: floors, walls, sprites, effects, light
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   10. DRAW (everything on screen; sprites come from section 1)
   The camera centres on the player. Coordinates are logical pixels.
   Lighting: a half-resolution darkness layer with holes cut by every
   light (torch, candles, sconces, lava, stairs), drawn over the world.
   ===================================================================== */
const lc=mk(LW/2,LH/2),lctx=lc.getContext('2d');
function floorTile(x,y){
  const h=hash(x,y);
  return h<0.4?'floor0':h<0.65?'floor1':h<0.85?'floor2':h<0.95?'floorCrack':'floorBlood';
}
function wallFace(x,y){
  const h=hash(x*3+1,y*7+2);
  return h<0.64?'wallFace':h<0.71?'wallCross':h<0.77?'wallWindow':h<0.86?'wallSconce':h<0.9?'wallChains':h<0.95?'wallOssuary':'wallBlood';
}
function draw(){
  if(scene!=='game'){drawTitle();return}
  drawIso();
}

/* =====================================================================
   10b. ISOMETRIC VIEW
   The game world is still a square grid (all movement, combat and levels
   are unchanged). Only the drawing changes: every world point (x,y) is
   shown at screen ((x-y)/2, (x+y)/4), so a 32px tile becomes a 32x16 diamond.
   Floors are laid flat, walls become blocks with height, and everything that
   stands up (characters, props, loot) is depth-sorted so nearer things cover
   farther ones. Press V to switch back to the old top-down view.
   ===================================================================== */
const WALL_H=30;                                   // how tall walls stand, in screen pixels
const FLAT_DECOR={decoBones:1,decoPool:1,decoCrucifix:1,decoBed:1,decoRug:1};   // decor that lies on the floor
function tileSrc(name){const i=TS.idx[name];return i==null||i<0?null:i*TS.size}
// Draw a top-down tile laid flat on the iso floor, with its top corner at screen (cx,cy)
function isoFlat(name,cx,cy){
  const s=tileSrc(name);if(s==null)return false;
  ctx.setTransform(0.5,0.25,-0.5,0.25,cx,cy);ctx.drawImage(TS.img,s,0,TS.size,TS.size,0,0,T,T);
  ctx.setTransform(1,0,0,1,0,0);return true;
}
function isoFlatImg(img,sx,sy,sw,sh,cx,cy,w,h){
  ctx.setTransform(0.5,0.25,-0.5,0.25,cx,cy);ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);ctx.setTransform(1,0,0,1,0,0);
}
// A filled shape in screen space, for shading wall faces
function quad(pts,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.closePath();ctx.fill()}
// A wall block: top face plus the south and east faces that look onto open floor
function isoWall(cx,cy,face,top,showS,showE,alpha,flames,tx,ty,torch){
  if(alpha<1)ctx.globalAlpha=alpha;
  const fs=tileSrc(face)??tileSrc('wallFace'),eFace=tileSrc(level&&level.style==='wood'?'woodWallFace':'wallFace');
  if(showS&&fs!=null){
    ctx.setTransform(0.5,0.25,0,WALL_H/32,cx-16,cy+8-WALL_H);ctx.drawImage(TS.img,fs,0,TS.size,TS.size,0,0,T,T);ctx.setTransform(1,0,0,1,0,0);
    quad([cx-16,cy+8-WALL_H,cx,cy+16-WALL_H,cx,cy+16,cx-16,cy+8],'rgba(0,0,0,0.12)');
    if((face==='wallSconce'||torch)&&IMG.torch){const fr=Math.floor(time*10+tx*3+ty*5)%8;ctx.drawImage(IMG.torch,fr*16,0,16,24,cx-16,cy+14-WALL_H,16,24);addLight(cx-8+0.001,cy+16,90,0.85,true)}
    else if(face==='wallSconce'){flames.push([cx-8,cy+12-WALL_H+Math.round(9*WALL_H/32),tx+ty]);addLight(cx-8+0.001,cy+16,85,0.85,true)}
    if(face==='wallWindow')addLight(cx-8,cy+8,40,0.35,true);
  }
  if(showE&&eFace!=null){
    ctx.setTransform(0.5,-0.25,0,WALL_H/32,cx,cy+16-WALL_H);ctx.drawImage(TS.img,eFace,0,TS.size,TS.size,0,0,T,T);ctx.setTransform(1,0,0,1,0,0);
    quad([cx,cy+16-WALL_H,cx+16,cy+8-WALL_H,cx+16,cy+8,cx,cy+16],'rgba(0,0,0,0.38)');
  }
  const ts=tileSrc(top);
  if(ts!=null){ctx.setTransform(0.5,0.25,-0.5,0.25,cx,cy-WALL_H);ctx.drawImage(TS.img,ts,0,TS.size,TS.size,0,0,T,T);ctx.setTransform(1,0,0,1,0,0)}
  quad([cx,cy-WALL_H,cx+16,cy+8-WALL_H,cx,cy+16-WALL_H,cx-16,cy+8-WALL_H],'rgba(255,220,180,0.06)');
  ctx.globalAlpha=1;
}
function pxEllipse(x,y,rx,ry,c){ctx.fillStyle=c;for(let a=0;a<TAU;a+=0.18)ctx.fillRect(Math.round(x+Math.cos(a)*rx),Math.round(y+Math.sin(a)*ry),1,1)}

function drawIso(){
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#050305';ctx.fillRect(0,0,LW,LH);
  const shx=(Math.random()-.5)*shake*10,shy=(Math.random()-.5)*shake*10;
  const camX=Math.round(LW/2-(P.x-P.y)/2+shx),camY=Math.round(LH/2+12-(P.x+P.y)/4+shy);
  const S_=(x,y)=>[Math.round((x-y)/2+camX),Math.round((x+y)/4+camY)];   // world -> screen
  const flick=0.92+Math.sin(time*9)*0.04+Math.sin(time*23)*0.03;
  isoLights.length=0;
  const light=(x,y,r,i)=>{const [sx,sy]=S_(x,y);isoLights.push(sx,sy,r,i)};
  addLight=(x,y,r,i=1,screen)=>{if(screen)isoLights.push(x,y,r,i);else light(x,y,r,i)};
  light(P.x,P.y,200*flick,1);
  // visible range of tiles (screen corners back to world, plus a margin for wall height)
  const W=(sx,sy)=>{const X=sx-camX,Y=sy-camY;return [X+2*Y,2*Y-X]};
  const c=[W(-40,-60),W(LW+40,-60),W(-40,LH+60),W(LW+40,LH+60)];
  const tx0=Math.max(0,Math.floor(Math.min(...c.map(p=>p[0]))/T)-1),tx1=Math.min(MW-1,Math.ceil(Math.max(...c.map(p=>p[0]))/T)+1);
  const ty0=Math.max(0,Math.floor(Math.min(...c.map(p=>p[1]))/T)-1),ty1=Math.min(MH-1,Math.ceil(Math.max(...c.map(p=>p[1]))/T)+1);
  const wood=level&&level.style==='wood';
  const flames=[],items=[];   // items: things that stand up, depth-sorted later
  const open=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH&&map[y][x]!==0;
  const [psx,psy]=S_(P.x,P.y),pDepth=(P.x+P.y)/T;

  // ---- 1. FLOORS (flat) and collect walls ----
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
    if(!seen[ty][tx])continue;
    const [cx,cy]=S_(tx*T,ty*T);
    if(cx<-40||cx>LW+40||cy<-60||cy>LH+60)continue;
    const t=map[ty][tx];
    if(t===0){
      let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(open(tx+dx,ty+dy)){near=true;break}
      if(!near)continue;
      let f=level?(level.faces[tx+','+ty]||(hash(tx,ty)<0.08?'wallBlood':'wallFace')):wallFace(tx,ty);
      if(wood)f=f==='wallWindow'?'woodWindow':'woodWallFace';
      const showS=open(tx,ty+1),showE=open(tx+1,ty);
      // fade walls that stand in front of the knight so you can always see yourself
      const front=tx+ty+2>pDepth&&Math.abs(cx-psx)<40&&cy+16>psy-44&&cy<psy+8;
      const drip=!wood&&!front&&showS&&(f==='wallBlood'||hash(tx*3,ty*7)<0.12);
      const torch=!wood&&!drip&&showS&&f==='wallFace'&&hash(tx*7+1,ty*3+2)<0.09;   // scattered burning wall torches
      items.push({d:tx+ty+1.99,draw:()=>{isoWall(cx,cy,f,wood?'woodWallTop':'wallTop',showS,showE,front?0.35:1,flames,tx,ty,torch);
        if(drip){const h=hash(tx+5,ty+9),[dx,dy]=S_(tx*T+T*(0.25+h*0.5),(ty+1)*T);drawDrip(dx,dy,h)}}});
    }else if(t===2){
      if(level){const fr=Math.floor(time*2+ty*0.35)%3;isoFlat('blood'+fr,cx,cy);if((tx+ty)%2===0)light((tx+.5)*T,(ty+.5)*T,34,0.22)}
      else{const fr=Math.floor(time*3+hash(tx,ty)*3)%3;isoFlat('lava'+fr,cx,cy);light((tx+.5)*T,(ty+.5)*T,46,0.55)}
    }else if(t===3){
      isoFlat(level&&level.safe?'trapdoor':(stairsLocked()?'stairsSealed':'stairs'),cx,cy);
      light((tx+.5)*T,(ty+.5)*T,60,0.7);
    }else{
      const lf=level&&level.floors[tx+','+ty];
      if(lf==='carpet'){const h=level.floors[(tx-1)+','+ty]==='carpet'||level.floors[(tx+1)+','+ty]==='carpet';isoFlat(h?'carpetH':'carpetV',cx,cy)}
      else if(lf)isoFlat(lf,cx,cy);
      else isoFlat(wood?(hash(tx,ty)<0.5?'woodFloor0':'woodFloor1'):floorTile(tx,ty),cx,cy);
      if(lf==='floorSigil')light((tx+.5)*T,(ty+.5)*T,40,0.3);
    }
  }
  // ---- 2. FLAT DECOR, BLOOD STAINS, SHADOWS (still on the floor) ----
  for(const d of decor){
    if(d.tx<tx0||d.tx>tx1||d.ty<ty0||d.ty>ty1||!seen[d.ty][d.tx])continue;
    const [cx,cy]=S_(d.tx*T,d.ty*T),[bx,by]=S_((d.tx+.5)*T,(d.ty+.5)*T);
    if(FLAT_DECOR[d.kind])isoFlat(d.kind,cx,cy);
    else items.push({d:d.tx+d.ty+1,draw:()=>{const s=tileSrc(d.kind);if(s!=null)ctx.drawImage(TS.img,s,0,TS.size,TS.size,bx-16,by-26,T,T)}});
    if(FLAMES[d.kind]){FLAMES[d.kind].forEach(([fx,fy],i)=>flames.push([bx-16+fx,by-26+fy,d.seed*10+i]));light((d.tx+.5)*T,(d.ty+.5)*T,70,0.75)}
  }
  for(const b of decals){
    const [sx,sy]=S_(b.x,b.y);if(sx<-16||sx>LW+16||sy<-16||sy>LH+16)continue;
    if(b.scorch){ctx.fillStyle='rgba(10,4,4,0.55)';ctx.fillRect(sx-6,sy-1,12,3);ctx.fillRect(sx-4,sy-2,8,5);continue}
    isoFlatImg(IMG.effects,b.cell*16,0,16,16,...S_(b.x-8,b.y-8),16,16);
  }
  const shadowAt=(x,y,w)=>{const [sx,sy]=S_(x,y);pxShadow(sx,sy,w)};
  for(const e of enemies){const tx=Math.floor(e.x/T),ty=Math.floor(e.y/T);if(seen[ty]&&seen[ty][tx])shadowAt(e.x,e.y,e.r*1.9)}
  shadowAt(P.x,P.y,18);
  drawTelegraphs(S_);
  for(const c of chests)shadowAt(c.x,c.y,22);

  // ---- 3. THINGS THAT STAND UP (depth-sorted) ----
  if(level&&level.hearth){
    const hx=level.hearth.tx,hy=level.hearth.ty,[sx,sy]=S_((hx+1)*T,(hy+2)*T);
    items.push({d:hx+hy+3,draw:()=>{if(IMG.hearth)ctx.drawImage(IMG.hearth,sx-32,sy-60)}});
    for(let i=0;i<7;i++)flames.push([sx-32+20+i*4,sy-60+50-(i%3),i*3+7],[sx-32+22+i*4,sy-60+46-(i%2)*3,i*5+2]);
    light((hx+1)*T,(hy+2.2)*T,280*(0.95+Math.sin(time*7)*0.04),1);
  }
  if(level&&level.stash){const st=level.stash,[sx,sy]=S_(st.x,st.y);items.push({d:(st.x+st.y)/T,draw:()=>{const s=tileSrc('stash');if(s!=null)ctx.drawImage(TS.img,s,0,TS.size,TS.size,sx-16,sy-24,T,T)}});light(st.x,st.y,40,0.3)}
  if(level&&level.altarAt&&IMG.altar&&seen[level.altarAt.ty][level.altarAt.tx]){
    const a=level.altarAt,[sx,sy]=S_(a.x,a.y+T/2);
    items.push({d:(a.x+a.y)/T+0.6,draw:()=>ctx.drawImage(IMG.altar,sx-48,sy-80)});
    const pulse=0.55+0.25*Math.sin(time*2.2);light(a.x-20,a.y-20,130,pulse);light(a.x,a.y+T,70,0.5);
    flames.push([sx-36,sy-36,1],[sx+36,sy-36,2]);
  }
  for(const c of chests){
    const tx=Math.floor(c.x/T),ty=Math.floor(c.y/T);if(!seen[ty]||!seen[ty][tx])continue;
    const [sx,sy]=S_(c.x,c.y);
    items.push({d:(c.x+c.y)/T,draw:()=>{const s=tileSrc(c.open?'chestOpen':'chestShut');if(s!=null)ctx.drawImage(TS.img,s,0,TS.size,TS.size,sx-16,sy-26,T,T)}});
    light(c.x,c.y,c.open?30:34,c.open?0.35:0.4);
  }
  for(const g of ground){
    if(g.r<filter)continue;
    const c=colorOf(g),bob=Math.round(Math.sin(g.bob)*2),[sx,sy]=S_(g.x,g.y);
    if(g.r>=1)light(g.x,g.y,22+g.r*5,0.35);
    items.push({d:(g.x+g.y)/T,draw:()=>{
      if(g.r>=2){ctx.save();ctx.globalAlpha=0.18+0.06*Math.sin(time*4+g.id);ctx.fillStyle=c;ctx.fillRect(sx-2,sy-46,4,40);ctx.fillRect(sx-1,sy-62,2,16);ctx.restore()}
      pxShadow(sx,sy+2,12);
      drawItemIcon(g,sx-8,sy-14+bob);
      if(g.r>=1){ctx.save();ctx.font=`8px ${PXFONT}`;ctx.textAlign='center';ctx.fillStyle='#000';ctx.fillText(g.name,sx+1,sy-19+bob);ctx.fillStyle=c;ctx.fillText(g.name,sx,sy-20+bob);ctx.restore()}
    }});
  }
  for(const c of corpses){const [sx,sy]=S_(c.x,c.y);items.push({d:(c.x+c.y)/T-0.01,draw:()=>drawSprite(c.key,'death',c.animT,sx,sy,c.flip)})}
  for(const e of enemies){
    const tx=Math.floor(e.x/T),ty=Math.floor(e.y/T);if(!seen[ty]||!seen[ty][tx])continue;
    let [sx,sy]=S_(e.x,e.y);if(e.act==='wind')sx+=Math.random()<0.5?-1:1;   // shivers while winding up
    if(e.elite){light(e.x,e.y,40,0.35);if(Math.random()<0.15)parts.push({x:e.x+rnd(-e.r,e.r),y:e.y+rnd(-4,6),vx:0,vy:rnd(-30,-12),life:0.6,max:0.6,c:'#c4302c',s:1})}
    if(e.boss)light(e.x,e.y,90,0.45);
    items.push({d:(e.x+e.y)/T,draw:()=>{
      if(e.elite)pxEllipse(sx,sy+2,e.r+4+Math.sin(time*5)*1.5,(e.r+4)/2,'rgba(196,48,44,0.85)');
      if(!drawSprite(spriteKey(e),e.anim,e.animT,sx,sy,e.face<0)){ctx.save();ctx.fillStyle=e.flash>0?'#fff':e.c;shape(e.shape,sx,sy-e.r,e.r);ctx.fill();ctx.restore()}
      else if(e.flash>0){ctx.save();ctx.globalAlpha=0.5;ctx.globalCompositeOperation='lighter';drawSprite(spriteKey(e),e.anim,e.animT,sx,sy,e.face<0);ctx.restore()}
      if(e.hp<e.max&&!e.boss){
        const w=Math.max(14,Math.round(e.r*2)),bx=sx-Math.round(w/2),by=sy-e.r-26;
        pxRect(bx-1,by-1,w+2,4,'#0a0608');pxRect(bx,by,w,2,'#33050a');
        pxRect(bx,by,Math.round(w*Math.max(0,e.hp/e.max)),2,'#c4302c');pxRect(bx,by,Math.round(w*Math.max(0,e.hp/e.max)),1,'#e8564a');
      }
    }});
  }
  for(const g of P.ghosts||[]){const [gx,gy]=S_(g.x,g.y);items.push({d:(g.x+g.y)/T-0.02,draw:()=>{
    ctx.save();ctx.globalAlpha=0.4*g.life/g.max;ctx.globalCompositeOperation='lighter';drawSprite('player',g.anim,g.animT,gx,gy,g.face<0);ctx.restore()}})}
  items.push({d:pDepth,draw:()=>{
    if(P.sh>0&&P.maxSh>0)pxEllipse(psx,psy-1,15,8,`rgba(224,191,104,${0.25+0.45*(P.sh/P.maxSh)})`);
    ctx.save();ctx.globalAlpha=P.inv>0?0.55:1;drawSprite('player',P.anim,P.animT,psx,psy,P.face<0);ctx.restore();
  }});
  items.sort((a,b)=>a.d-b.d);
  for(const it of items)it.draw();

  // ---- 4. EFFECTS ON TOP: blood sprays, projectiles, swing arcs, particles, flames ----
  drawFireLayer(S_,light);
  for(const f of fxs){
    const fr=f.d.from+Math.min(f.d.n-1,Math.floor(f.t*20)),fsx=fr*110,fsy=f.d.row*93,[sx,sy]=S_(f.x,f.y);
    if(f.flip){ctx.save();ctx.translate(sx,0);ctx.scale(-1,1);ctx.drawImage(IMG.bloodfx,fsx,fsy,110,93,-f.d.ox,sy-10-f.d.oy,110,93);ctx.restore()}
    else ctx.drawImage(IMG.bloodfx,fsx,fsy,110,93,sx-f.d.ox,sy-10-f.d.oy,110,93);
  }
  for(const b of bullets){
    const [x1,y1]=S_(b.x,b.y),[x0,y0]=S_(b.x-b.vx*0.03,b.y-b.vy*0.03);
    pxRect(x0,y0-10,2,2,'#a12a06');pxRect((x0+x1)/2,(y0+y1)/2-10,2,2,'#ff6a1a');pxRect(x1,y1-10,2,2,'#ffd27a');light(b.x,b.y,20,0.4);
  }
  for(const b of ebullets){const [sx,sy]=S_(b.x,b.y);pxOrb(sx,sy-10,b.r,b.c==='#ffe6b0'?'#c9b48a':'#c4302c');light(b.x,b.y,b.r*5,0.35)}
  // the sword trail: a thick glowing crescent that sweeps out and fades (gold edge, blood-red tail)
  const TRAIL=['#fff6d8','#ffe2a0','#ffb347','#ff7a2b','#c4302c','#8f1a1f'];
  for(const s of swings){
    const a0=s.a-s.arc/2,a1=s.a+s.arc/2,prog=Math.min(1,(1-s.life/.18)*1.8),f=Math.max(0,s.life/.18);
    const end=a0+(a1-a0)*prog,steps=Math.ceil(s.r*s.arc*prog);
    for(let k=0;k<TRAIL.length;k++){
      const r=s.r-k*1.6,c=s.oath&&k<3?'#ff7a2b':TRAIL[k],sz=k<2?2:1;
      for(let i=0;i<=steps;i++){
        const t=i/Math.max(1,steps),a=a0+(end-a0)*t;
        ctx.globalAlpha=Math.max(0,(0.25+0.75*t)*f*(1-k*0.12));
        const [x,y]=S_(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r);pxRect(x,y-9,sz,sz,c);
      }
    }
    ctx.globalAlpha=1;light(s.x+Math.cos(s.a)*s.r*0.7,s.y+Math.sin(s.a)*s.r*0.7,50,0.35*f);
  }
  for(const im of impacts){
    const [sx,sy]=S_(im.x,im.y),L=im.crit?10:6;
    ctx.globalAlpha=im.life/im.max;ctx.fillStyle='#ffffff';
    ctx.fillRect(sx-L,sy-12,2*L,2);ctx.fillRect(sx-1,sy-11-L,2,2*L);
    if(im.crit){ctx.fillStyle='#ffe14f';ctx.fillRect(sx-L/2,sy-11-L/2,L,L)}
    light(im.x,im.y,40,0.5);
  }
  ctx.globalAlpha=1;
  for(const p of parts){
    const [sx,sy]=S_(p.x,p.y);
    ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.c;
    ctx.fillRect(sx,p.ground?sy:sy-10,Math.max(1,Math.round(p.s)),Math.max(1,Math.round(p.s)));
  }
  ctx.globalAlpha=1;
  for(const [fx,fy,s] of flames)drawFlame(fx,fy,s);
  const stairsOpen=stairsT&&!(level&&level.safe)&&!stairsLocked();
  if(stairsOpen){
    const [bx,by]=S_((stairsT.x+.5)*T,(stairsT.y+.5)*T),pulse=0.25+0.12*Math.sin(time*4);
    ctx.save();ctx.globalAlpha=pulse;ctx.fillStyle='#ffe14f';
    ctx.fillRect(bx-3,by-90,6,90);ctx.globalAlpha=pulse*0.6;ctx.fillRect(bx-7,by-60,14,60);ctx.restore();
    light((stairsT.x+.5)*T,(stairsT.y+.5)*T,110,0.8);
  }

  // ---- 5. LIGHTING: ellipses lying on the ground ----
  lctx.globalCompositeOperation='source-over';
  lctx.clearRect(0,0,lc.width,lc.height);
  lctx.fillStyle=level&&level.safe?'rgba(4,1,4,0.5)':'rgba(4,1,4,0.9)';lctx.fillRect(0,0,lc.width,lc.height);
  lctx.globalCompositeOperation='destination-out';
  for(let i=0;i<isoLights.length;i+=4){
    const lx=isoLights[i]/2,ly=isoLights[i+1]/2,lr=isoLights[i+2]*0.42,li=isoLights[i+3];
    if(lx<-lr||ly<-lr||lx>lc.width+lr||ly>lc.height+lr)continue;
    lctx.save();lctx.translate(lx,ly-4);lctx.scale(1,0.62);
    const g=lctx.createRadialGradient(0,0,0,0,0,lr);
    g.addColorStop(0,`rgba(0,0,0,${li})`);g.addColorStop(0.55,`rgba(0,0,0,${li*0.6})`);g.addColorStop(1,'rgba(0,0,0,0)');
    lctx.fillStyle=g;lctx.fillRect(-lr,-lr,lr*2,lr*2);lctx.restore();
  }
  ctx.drawImage(lc,0,0,LW,LH);
  if(!(level&&level.safe))drawFog(camX,camY,0.2);
  drawMotes(S_,psx,psy);
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=0.35;
  const wg=ctx.createRadialGradient(LW/2,LH/2,10,LW/2,LH/2,260);
  wg.addColorStop(0,'#ff9a4a');wg.addColorStop(1,'#3a0a10');
  ctx.fillStyle=wg;ctx.fillRect(0,0,LW,LH);ctx.restore();

  // ---- 6. TEXT ABOVE THE DARKNESS: damage numbers and shack prompts ----
  ctx.save();ctx.textAlign='center';
  for(const t of texts){
    const [sx,sy]=S_(t.x,t.y),age=t.max-t.life;
    ctx.globalAlpha=Math.max(0,t.life/t.max);ctx.font=`${(t.s>1?16:8)+(age<0.08?8:0)}px ${PXFONT}`;   // numbers pop, then settle
    ctx.fillStyle='#000';ctx.fillText(t.t,sx+1,sy-11);ctx.fillStyle=t.c;ctx.fillText(t.t,sx,sy-12);
  }
  if(level&&level.safe){
    ctx.font=`8px ${PXFONT}`;ctx.globalAlpha=1;
    const tip=(o,txt)=>{if(!o||dist(o,P)>70)return;const [sx,sy]=S_(o.x,o.y);ctx.fillStyle='#000';ctx.fillText(txt,sx+1,sy-33);ctx.fillStyle='#e0bf68';ctx.fillText(txt,sx,sy-34)};
    tip(level.stash,'[E] STASH');tip(level.bed,'[E] REST');
    for(const c of chests)if(c.reward&&!c.open)tip(c,'[E] REWARD CHEST');
    if(stairsT)tip({x:(stairsT.x+.5)*T,y:(stairsT.y+.5)*T},'STEP ON THE TRAPDOOR TO DESCEND');
  }
  ctx.restore();ctx.globalAlpha=1;
  const v=ctx.createRadialGradient(LW/2,LH/2,LH*0.32,LW/2,LH/2,LW*0.66);
  v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.75)');
  ctx.fillStyle=v;ctx.fillRect(0,0,LW,LH);
  if(P.hp<P.maxHp*0.3&&!dead){
    // low health: the screen edges pulse red with the heartbeat
    const beat=Math.max(0,Math.sin((0.85-P.hbT)/0.85*Math.PI*2*1.0))*0.35+0.15;
    const rv=ctx.createRadialGradient(LW/2,LH/2,LH*0.25,LW/2,LH/2,LW*0.62);
    rv.addColorStop(0,'rgba(120,0,10,0)');rv.addColorStop(1,`rgba(150,0,15,${beat})`);
    ctx.fillStyle=rv;ctx.fillRect(0,0,LW,LH);
  }
  if(stairsOpen){
    // off-screen stairs: a golden arrow on the screen edge points the way
    const [bx,by]=S_((stairsT.x+.5)*T,(stairsT.y+.5)*T);
    if(bx<24||bx>LW-24||by<34||by>LH-24){
      const ang=Math.atan2(by-LH/2,bx-LW/2),k=Math.min((LW/2-34)/Math.abs(Math.cos(ang)||1e-6),(LH/2-34)/Math.abs(Math.sin(ang)||1e-6));
      const ax=LW/2+Math.cos(ang)*k,ay=LH/2+Math.sin(ang)*k,bob=Math.sin(time*6)*2;
      ctx.save();ctx.translate(ax+Math.cos(ang)*bob,ay+Math.sin(ang)*bob);ctx.rotate(ang);
      ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-8);ctx.lineTo(-6,8);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffe14f';ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-4,-6);ctx.lineTo(-4,6);ctx.closePath();ctx.fill();
      ctx.restore();
      ctx.font=`8px ${PXFONT}`;ctx.textAlign='center';ctx.fillStyle='#000';ctx.fillText('STAIRS',ax+1,ay+17);ctx.fillStyle='#ffe14f';ctx.fillText('STAIRS',ax,ay+16);
    }
  }
}
// lights collected while drawing a frame: screen x, y, radius, strength (4 numbers each)
const isoLights=[];
let addLight=()=>{};   // set by drawIso each frame: addLight(worldX, worldY, radius, strength)

// Procedural shape helper (fallback when an enemy sprite sheet is missing)
function shape(type,x,y,r){
  ctx.beginPath();
  if(type==='circle')ctx.arc(x,y,r,0,TAU);
  else if(type==='diamond'){ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath()}
  else{for(let i=0;i<6;i++){const a=i/6*TAU+0.5,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()}
}
