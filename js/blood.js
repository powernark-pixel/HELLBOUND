/* HELLBOUND · js/blood.js · Blood drops and the vat icon
   (Files load in the order listed in index.html and share one global scope.)

   Kills don't fill the blood vat by themselves any more. Each kill SPILLS a few drops of
   blood that land on the floor. Walk near them and they're pulled to you; each one you
   collect makes a little 'blip', flies to the VAT ICON on the right edge of the screen and
   fills it. Drops never vanish, so the vat can always be filled.
   The vat itself (vat, vatNeed, vatFull) is set up in world.js. */

let bloodDrops=[],vatFlies=[],vatPulse=0,vatShown=0;
const VAT_ICON={x:LW-24,y:LH/2-6};   // where the vat sits on screen (canvas pixels)

// a kill spills its blood as a few drops (bigger foes spill more)
function spillBlood(e){
  const total=bloodOf(e),n=Math.max(1,Math.min(10,Math.round(total/4)));
  for(let i=0;i<n;i++){
    const a=rnd(0,TAU),sp=rnd(30,90);
    bloodDrops.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,z:rnd(2,8),vz:rnd(40,100),v:total/n,ph:rnd(0,TAU),age:0});
  }
}
// add blood to the vat (and announce when it's full)
function addBlood(v){
  const was=vatFull();vat=Math.min(vatNeed,vat+v);
  if(!was&&vatFull()){
    SFX.play('toll');
    if(boss&&!boss.dead){announce('THE VAT IS FULL',COL.bloodHi,2.6,'Slay the Warden to open the way down');log('The blood vat is full. Only the Warden bars the way.',COL.bloodHi)}
    else{announce('THE VAT IS FULL',COL.gold,2.6,'The stairs are open. Follow the light');log('The blood vat is full. The stairs are open.',COL.gold)}
  }
}
function collectDrop(d){
  if(d.got)return;d.got=true;
  addBlood(d.v);SFX.play('drip');
  // fly from where it was on screen into the vat icon
  const [sx,sy]=isoScreen(d.x,d.y);vatFlies.push({x0:sx,y0:sy-d.z,t:0});
}
function updateBlood(dt){
  const pull=Math.max(70,S.mag*1.1);
  for(const d of bloodDrops){
    d.age+=dt;
    // spill: fly out, fall, bounce once or twice, slide to a stop
    d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.vz-=400*dt;
    if(d.z<0){d.z=0;d.vz*=-0.35;d.vx*=0.6;d.vy*=0.6}
    if(tileAt(d.x,d.y)===0){d.x-=d.vx*dt;d.y-=d.vy*dt;d.vx=d.vy=0}
    if(d.age<0.4||dead)continue;
    const dd=Math.hypot(P.x-d.x,P.y-d.y);
    if(dd<pull){const sp=Math.min(dd,(120+(pull-dd)*4)*dt);d.x+=(P.x-d.x)/dd*sp;d.y+=(P.y-d.y)/dd*sp}   // pulled to you
    if(dd<12)collectDrop(d);
  }
  bloodDrops=bloodDrops.filter(d=>!d.got);
  for(const f of vatFlies){f.t+=dt;if(f.t>=0.45&&!f.done){f.done=true;vatPulse=1}}
  vatFlies=vatFlies.filter(f=>!f.done);
  vatPulse=Math.max(0,vatPulse-dt*3);
  vatShown+=((vatNeed?vat/vatNeed:0)-vatShown)*Math.min(1,dt*6);   // the level in the icon eases up
}

// drops on the floor: small glossy drops that bob and glint (drawn with the floor layer)
const DROP=['.RR.','RHRR','RRRR','RRRR','.DD.'];   // a 4x5 drop: R blood, H highlight, D dark underside
function drawBloodDrops(S_,light){
  for(const d of bloodDrops){
    const [x,y]=S_(d.x,d.y),bob=d.age>0.6?Math.round(Math.sin(time*4+d.ph)):0,yy=Math.round(y-d.z-3+bob);
        ctx.globalAlpha=0.5;ctx.fillStyle='#000';ctx.fillRect(x-2,yy-1,6,7);ctx.globalAlpha=1;   // dark halo so it reads on any floor
    DROP.forEach((row,r)=>{for(let c=0;c<4;c++){const ch=row[c];if(ch==='.')continue;
      ctx.fillStyle=ch==='H'?'#ff9a8a':ch==='D'?COL.bloodDark:'#d8383a';ctx.fillRect(x-2+c,yy+r-1,1,1)}});
    if(Math.sin(time*3+d.ph)>0.92){ctx.fillStyle=COL.white;ctx.fillRect(x,yy+1,1,1)}             // a glint now and then
    light(d.x,d.y,18,0.28);
  }
}

// the vat icon at the right edge: a small iron-banded vial that fills with blood
function drawVatIcon(){
  if(!level||level.safe)return;
  const {x:X,y:Y}=VAT_ICON,full=vatFull(),pct=Math.min(1,vatShown);
  // drops flying in from the floor
  for(const f of vatFlies){
    const k=Math.min(1,f.t/0.45),e=k*k,x=f.x0+(X-f.x0)*e,y=f.y0+(Y-f.y0)*e-Math.sin(k*Math.PI)*24;
    ctx.fillStyle='#ff6a5a';ctx.fillRect(Math.round(x)-1,Math.round(y)-1,2,2);ctx.fillStyle=COL.blood;ctx.fillRect(Math.round(x),Math.round(y)+1,1,1);
  }
  drawVessel(X,Y,Math.min(VESSELS.length-1,P.vessel||0),pct,full);
}

/* ----- THE VESSEL: the vat grows over the run -----
   It starts as a chipped shot glass and is upgraded (for now: one step per completed level)
   through a corked flask and a silver chalice to a grand gold goblet. Every one is glass, so
   you can always see the blood level. Each is described by its BOWL: a list of half-widths,
   one per pixel row from the rim down, plus its own decoration (base, stem, cork, gems...). */
const VESSELS=[
  {name:'Chipped Shot Glass',bowl:[5,5,5,5,5,5,4,4,4,4,4,4],glass:['#5a6a78','#9aaab8','#dfe8f0'],deco:'shot'},
  {name:'Corked Flask',bowl:[2,2,2,3,5,6,6,6,6,6,6,6,6,6,5,4],glass:['#4a5a6a','#8a9cb0','#dfe8f0'],deco:'flask'},
  {name:'Silver Chalice',bowl:[8,8,8,8,7,7,7,6,6,5,4,3],glass:['#5a5a6a','#a0a8b8','#e8ecf4'],deco:'chalice'},
  {name:'Grand Goblet',bowl:[10,10,10,10,10,9,9,9,8,8,7,6,5,4],glass:['#6a4a2a','#c9a24a','#ffe6a0'],deco:'goblet'},
];
function drawVessel(X,Y,tier,pct,full){
  const V=VESSELS[tier],B=V.bowl,H=B.length,top=Math.round(Y-H/2-2),pop=vatPulse>0.5?1:0;
  const px=(x,y,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),1,1)};
  const row=(y,x0,x1,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x0),Math.round(y),Math.round(x1-x0+1),1)};
  const GOLD=['#4a3010','#8a5e1c','#c9a24a','#ffe6a0'],SILV=['#2a2a34','#6a6a7a','#b0b4c4','#f0f0f8'];
  // soft round glows: gold when full, and the grand goblet always smoulders a little
  const glow=(r,col,a)=>{const g=ctx.createRadialGradient(X,Y,0,X,Y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(X-r,Y-r,r*2,r*2);ctx.globalAlpha=1};
  if(V.deco==='goblet')glow(30,'#ff6a3a',0.25+0.1*Math.sin(time*2));
  if(full)glow(26,COL.gold,0.45+0.2*Math.sin(time*5));
  // 1. the glass bowl: dark outline, glass walls, dark inside
  for(let y=0;y<H;y++){const w=B[y]+pop;row(top+y,X-w-1,X+w+1,COL.ink);row(top+y,X-w,X+w,'#140a10');px(X-w,top+y,V.glass[0]);px(X+w,top+y,V.glass[0])}
  row(top+H,X-B[H-1]-pop,X+B[H-1]+pop,COL.ink);
  // 2. the blood, filling up from the bottom with a wobbling surface
  const lvl=Math.round(H*pct);
  for(let y=H-lvl;y<H;y++){
    const w=B[y]+pop-1;if(w<1)continue;
    for(let x=-w;x<=w;x++){
      const surf=y===H-lvl,wob=surf&&lvl<H&&Math.sin(time*5+x*0.9)*(0.6+vatPulse)>0.6;
      px(X+x,top+y,wob?'#140a10':surf?(x<0?COL.bloodLit:COL.bloodHi):y>H-3?COL.bloodDark:COL.blood);
    }
  }
  if(lvl>3&&Math.sin(time*7)>0.5)px(X-1+Math.floor((time*3)%3),top+H-1-Math.floor((time*9)%Math.max(1,lvl-1)),COL.bloodLit);   // a rising bubble
  // 3. glass glints
  for(let y=1;y<H-1;y+=1)if(y%3!==2)px(X-B[y]-pop+1,top+y,V.glass[2]);
  px(X+B[1]+pop-1,top+1,V.glass[1]);
  // 4. each vessel's own decoration
  if(V.deco==='shot'){
    row(top+H+1,X-B[H-1]-1,X+B[H-1]+1,COL.ink);row(top+H,X-B[H-1],X+B[H-1],V.glass[1]);row(top+H+1,X-B[H-1],X+B[H-1],V.glass[0]);   // thick glass base
    px(X+B[0],top,COL.ink);px(X+B[0]-1,top,COL.ink);                                // a chip out of the rim
    px(X+2,top+3,V.glass[2]);px(X+3,top+4,V.glass[2]);px(X+2,top+5,V.glass[2]);px(X+3,top+6,V.glass[2]);   // a crack
  }else if(V.deco==='flask'){
    row(top-3,X-2,X+2,COL.ink);row(top-2,X-2,X+2,'#6b4423');row(top-1,X-2,X+2,'#52321a');row(top-3,X-1,X+1,'#86582e');   // cork
    row(top+5,X-B[5]-1,X+B[5]+1,SILV[1]);row(top+H-2,X-B[H-2]-1,X+B[H-2]+1,SILV[1]);                          // pewter bands
  }else if(V.deco==='chalice'){
    for(const [dy,w] of [[0,1],[1,1],[2,2],[3,1],[4,1],[5,1]])row(top+H+1+dy,X-w,X+w,dy===2?SILV[3]:SILV[2]);   // stem with a knot
    row(top+H+7,X-5,X+5,COL.ink);row(top+H+7,X-4,X+4,SILV[2]);row(top+H+8,X-6,X+6,COL.ink);row(top+H+8,X-5,X+5,SILV[1]);   // foot
    row(top,X-B[0]-1,X+B[0]+1,SILV[3]);row(top+1,X-B[0]-1,X+B[0]+1,SILV[1]);                                   // silver rim
    for(let x=-B[3];x<=B[3];x+=3)px(X+x,top+5,SILV[2]);                                                      // filigree
  }else if(V.deco==='goblet'){
    // crown rim: gold band with points
    row(top,X-B[0]-1,X+B[0]+1,GOLD[2]);row(top+1,X-B[0]-1,X+B[0]+1,GOLD[1]);
    for(let x=-B[0];x<=B[0];x+=4){px(X+x,top-1,GOLD[3]);px(X+x,top-2,GOLD[2])}
    // a band of gems around the bowl
    row(top+6,X-B[6]-1,X+B[6]+1,GOLD[2]);for(let x=-B[6]+2;x<=B[6]-2;x+=4)px(X+x,top+6,x===0?'#ff3a4a':'#6ad0ff');
    // stem: a gold skull knot flanked by little wings
    const sy=top+H+1;
    for(let dy=0;dy<8;dy++)row(sy+dy,X-1,X+1,dy===3||dy===4?GOLD[3]:GOLD[2]);
    row(sy+3,X-2,X+2,'#e8dcc0');px(X-1,sy+3,COL.ink);px(X+1,sy+3,COL.ink);row(sy+4,X-1,X+1,'#c9bfa8');     // skull
    for(let k=1;k<=4;k++){px(X-2-k,sy+3-Math.floor(k/2),GOLD[2]);px(X+2+k,sy+3-Math.floor(k/2),GOLD[2]);px(X-2-k,sy+4-Math.floor(k/2),GOLD[1]);px(X+2+k,sy+4-Math.floor(k/2),GOLD[1])}   // wings
    // the foot, wide and stepped, with a ruby
    row(sy+8,X-4,X+4,GOLD[2]);row(sy+9,X-7,X+7,COL.ink);row(sy+9,X-6,X+6,GOLD[2]);row(sy+10,X-8,X+8,COL.ink);row(sy+10,X-7,X+7,GOLD[1]);
    px(X,sy+9,'#ff3a4a');px(X,sy+8,'#ffb0b0');
  }
  // label: percentage under the vessel
  const base=top+H+(V.deco==='chalice'?11:V.deco==='goblet'?13:4);
  ctx.font=`8px ${PXFONT}`;ctx.textAlign='center';
  const txt=full?'FULL':Math.floor(pct*100)+'%';
  ctx.fillStyle='#000';ctx.fillText(txt,X+1,base+9);ctx.fillStyle=full?COL.gold:COL.bloodPale;ctx.fillText(txt,X,base+8);
}
