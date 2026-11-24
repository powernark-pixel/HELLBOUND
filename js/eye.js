/* HELLBOUND · js/eye.js · The Oculus: a floating eye that strikes with electric tentacles
   (Files load in the order listed in index.html and share one global scope.)
   Rough art pass with a big Noita influence: everything is drawn live, pixel by pixel, with
   lightning, bouncing sparks and light. No sprite sheet.

   LOOK
   - It IS the eye: one huge bloodshot eyeball, with raw meat at the back where the tentacles grow.
   - The pupil doesn't glide: it JUMPS from spot to spot (like a real eye's saccades) with a tiny
     tremor in between, and locks onto you, narrowing, when it's about to strike.
   - 9 tentacles, simulated every frame (each point trails the one before), each tipped with an eye.

   BEHAVIOUR (oculusAI, called from update.js)
   - HOVER: twitches in place, then darts a short way in a sudden jerk. Stuttery on purpose.
   - AIM (0.9s): marks 3 exact spots on the floor with crackling blue rings (one right where you
     stand). The rings shrink to a point: when they close, the strike lands. Move!
   - STRIKE: three tentacles shoot into the spots. Lightning splits across the floor, sparks bounce
     everywhere, and anyone inside a ring is hurt.
   - HOLD, then RETRACT, then back to HOVER.
   Press O in game to spawn one next to you (a test tool while it's being built). */

const OC={R:16,S:40,HOVER:30,TENT:9,SEG:9,LEN:3.4,STRIKE_R:20};
const OC_FLESH=['#12030a','#25060e','#3e0d16','#5e1620','#82242a','#a83a36','#d06a56'];
const OC_SCLERA=['#3a2e28','#6a5a4c','#a2927a','#d0c4a8','#ece2c8','#fff8e8'];
const OC_IRIS=['#2a0a00','#6a2a04','#b05a0a','#e8901a','#ffd050'];
const OC_VOLT=['#ffffff','#e8fbff','#9ef0ff','#5ad8ff','#2a7fff'];
let OCULUS_BODY=null;

function bayer4(x,y){const m=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];return (m[(y&3)*4+(x&3)]+0.5)/16}
function ocPick(ramp,v,x,y){const n=ramp.length,f=Math.max(0,Math.min(0.999,v))*(n-1),i=Math.floor(f);return ramp[Math.min(n-1,i+(f-i>bayer4(x,y)?1:0))]}

// ---------- the eyeball, baked once ----------
function oculusBody(){
  if(OCULUS_BODY)return OCULUS_BODY;
  const S=OC.S,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
  const cx=S/2,cy=S/2,R=OC.R;
  const L=[-0.45,-0.65,0.6],ll=Math.hypot(...L);L[0]/=ll;L[1]/=ll;L[2]/=ll;
  // bloodshot veins: wandering lines that start at the rim and creep toward the middle
  const veins=new Uint8Array(S*S);let seed=11;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let v=0;v<16;v++){
    let a=r()*TAU,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R,dir=a+Math.PI+(r()-0.5)*0.8;
    const len=6+r()*9;
    for(let s=0;s<len;s++){
      veins[Math.round(y)*S+Math.round(x)]=s<len*0.5?2:1;
      if(r()<0.25){let bx=x,by=y,bd=dir+(r()<0.5?-1:1)*0.9;for(let b=0;b<3;b++){bx+=Math.cos(bd);by+=Math.sin(bd);veins[Math.round(by)*S+Math.round(bx)]=1}}
      dir+=(r()-0.5)*0.7;x+=Math.cos(dir);y+=Math.sin(dir);
    }
  }
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const dx=(x+0.5-cx)/R,dy=(y+0.5-cy)/R,d2=dx*dx+dy*dy;
    if(d2>1)continue;
    const nz=Math.sqrt(1-d2),sh=Math.max(0,dx*L[0]+dy*L[1]+nz*L[2]);
    let col=ocPick(OC_SCLERA,0.1+sh*0.95,x,y);
    const vv=veins[y*S+x];
    if(vv)col=vv===2?'#8f1a1f':'#b8383a';
    // the meat at the back/bottom where the tentacles and nerves grow out
    const meat=dy*0.9-dx*0.15;
    if(meat>0.62){col=ocPick(OC_FLESH,0.25+sh*0.7,x,y);if((x*7+y*3)%11===0)col=OC_FLESH[6]}
    else if(meat>0.55)col='#6e1a24';
    if(sh>0.96&&dx<0)col='#ffffff';                          // a wet glint
    g.fillStyle=col;g.fillRect(x,y,1,1);
  }
  // 1px dark outline, Noita-style
  const d=g.getImageData(0,0,S,S),out=g.createImageData(S,S);out.data.set(d.data);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const k=(y*S+x)*4;if(d.data[k+3])continue;
    for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+ox,yy=y+oy;if(xx<0||yy<0||xx>=S||yy>=S)continue;
      if(d.data[(yy*S+xx)*4+3]){out.data[k]=8;out.data[k+1]=2;out.data[k+2]=4;out.data[k+3]=255;break}}
  }
  g.putImageData(out,0,0);
  return OCULUS_BODY=c;
}

// ---------- behaviour (world space) ----------
function oculusAI(e,d,nx,ny,dt){
  const s=e.ocs||(e.ocs={mode:'hover',t:rnd(0.3,0.8),dart:0,dvx:0,dvy:0,cd:rnd(1.2,2.2),targets:[]});
  s.t-=dt;s.cd-=dt;
  if(s.mode==='hover'){
    if(s.dart>0){s.dart-=dt;return [s.dvx,s.dvy]}
    if(s.cd<=0&&d<300){   // pick three exact spots: on you, and two around you
      s.mode='aim';s.t=s.tMax=0.9;SFX.play('zap');
      const a0=rnd(0,TAU);
      s.targets=[{x:P.x,y:P.y}];
      for(const k of [0,1]){const a=a0+k*Math.PI*0.8;s.targets.push({x:P.x+Math.cos(a)*rnd(42,58),y:P.y+Math.sin(a)*rnd(42,58)})}
      // each spot gets the tentacle hanging nearest to it
      s.tents=[];const used=new Set();
      for(const tg of s.targets){
        let best=-1,bd=1e9;const ang=Math.atan2(tg.y-e.y,tg.x-e.x);
        for(let i=0;i<OC.TENT;i++){if(used.has(i))continue;const ta=(-25+i*(230/(OC.TENT-1)))*Math.PI/180;
          const dd=Math.abs(Math.atan2(Math.sin(ta-ang),Math.cos(ta-ang)));if(dd<bd){bd=dd;best=i}}
        used.add(best);s.tents.push(best);
      }
      return [0,0];
    }
    if(s.t<=0){   // a sudden dart: closer if far, away if close, sideways otherwise
      const want=d>200?1:d<110?-1:0,side=(Math.random()<0.5?1:-1)*rnd(0.6,1.4),base=Math.atan2(ny,nx);
      const ang=want>0?base+rnd(-0.6,0.6):want<0?base+Math.PI+rnd(-0.6,0.6):base+side;
      const sp=rnd(320,460);s.dvx=Math.cos(ang)*sp;s.dvy=Math.sin(ang)*sp;s.dart=rnd(0.06,0.11);s.t=rnd(0.35,0.9);
    }
    return [0,0];
  }
  if(s.mode==='aim'){if(s.t<=0){s.mode='strike';s.t=s.tMax=0.1}return [0,0]}
  if(s.mode==='strike'){
    if(s.t<=0){
      s.mode='hold';s.t=s.tMax=0.55;
      for(const tg of s.targets)oculusImpact(e,tg.x,tg.y);
    }
    return [0,0];
  }
  if(s.mode==='hold'){if(s.t<=0){s.mode='retract';s.t=s.tMax=0.35}return [0,0]}
  if(s.mode==='retract'){if(s.t<=0){s.mode='hover';s.t=rnd(0.2,0.5);s.cd=rnd(2.2,3.4);s.targets=[]}return [0,0]}
  return [0,0];
}
// a tentacle lands: damage inside the ring, lightning across the floor, sparks
const ocSparks=[],ocArcs=[];
function oculusImpact(e,x,y){
  if(!dead&&Math.hypot(P.x-x,P.y-y)<OC.STRIKE_R+PLAYER_BODY)hurt(ET.eye.dmg*1.8*e.dmgMul);
  shake=Math.max(shake,0.35);hitStop=Math.max(hitStop,0.04);SFX.play('slam');SFX.play('zap');
  decals.push({x,y,scorch:1});if(decals.length>200)decals.shift();
  for(let i=0;i<26;i++){const a=rnd(0,TAU),sp=rnd(60,220);
    ocSparks.push({x,y,z:rnd(0,6),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,vz:rnd(40,160),life:rnd(0.4,1.1),max:1.1,px:x,py:y,pz:0})}
  ocArcs.push({x,y,life:0.45,max:0.45,seed:Math.random()*1000});
}
function updateOculusFX(dt){
  for(const p of ocSparks){
    p.px=p.x;p.py=p.y;p.pz=p.z;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=520*dt;p.life-=dt;
    if(p.z<0){p.z=0;p.vz*=-0.45;p.vx*=0.7;p.vy*=0.7}      // bounce on the floor, losing energy
    if(tileAt(p.x,p.y)===0){p.vx*=-0.5;p.vy*=-0.5;p.x=p.px;p.y=p.py}   // and off walls
  }
  for(let i=ocSparks.length-1;i>=0;i--)if(ocSparks[i].life<=0)ocSparks.splice(i,1);
  for(const a of ocArcs)a.life-=dt;
  for(let i=ocArcs.length-1;i>=0;i--)if(ocArcs[i].life<=0)ocArcs.splice(i,1);
}

// ---------- lightning ----------
// a jagged bolt between two screen points: midpoint displacement, glow then core
function ocBolt(x0,y0,x1,y1,jag,rand){
  let pts=[[x0,y0],[x1,y1]];
  for(let lv=0;lv<4;lv++){
    const n=[pts[0]];
    for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i],l=Math.hypot(bx-ax,by-ay);
      n.push([(ax+bx)/2+(rand()-0.5)*jag*l/24,(ay+by)/2+(rand()-0.5)*jag*l/24]);n.push(pts[i])}
    pts=n;
  }
  for(const [w,c,a] of [[3,OC_VOLT[4],0.35],[1,OC_VOLT[2],0.9],[1,OC_VOLT[0],1]]){
    ctx.globalAlpha=a;ctx.fillStyle=c;
    for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i],m=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)));
      for(let k=0;k<=m;k++){const x=Math.round(ax+(bx-ax)*k/m),y=Math.round(ay+(by-ay)*k/m);ctx.fillRect(x-(w>>1),y-(w>>1),w,w)}}
    if(c===OC_VOLT[2])pts=pts.map(([x,y],i)=>i&&i<pts.length-1?[x+(rand()<0.5?0:1),y]:[x,y]);   // core sits slightly off the glow
  }
  ctx.globalAlpha=1;
}
const ocRand=()=>Math.random();
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ground FX (sparks and the lightning that splits across the floor), drawn with the other effects
function drawOculusFX(S_){
  for(const a of ocArcs){
    const k=a.life/a.max,[x,y]=S_(a.x,a.y);
    // the arcs re-roll a few times while they last: flicker
    const rand=mulberry(Math.floor(a.seed+(1-k)*20));
    for(let i=0;i<5;i++){const ang=rand()*TAU,len=(20+rand()*30)*(0.5+k);
      const [ex,ey]=S_(a.x+Math.cos(ang)*len,a.y+Math.sin(ang)*len);
      if(rand()<k+0.2)ocBolt(x,y,ex,ey,6,rand)}
    ctx.globalAlpha=k;ctx.fillStyle=OC_VOLT[0];ctx.fillRect(x-2,y-1,5,3);ctx.globalAlpha=1;
    addLight(a.x,a.y,110*k+30,0.9*k);
  }
  for(const p of ocSparks){
    const [x,y]=S_(p.x,p.y),[qx,qy]=S_(p.px,p.py),k=p.life/p.max;
    const c=OC_VOLT[Math.min(4,Math.floor((1-k)*5))];
    ctx.fillStyle=c;ctx.fillRect(Math.round(qx),Math.round(qy-p.pz),1,1);    // a short streak: where it was...
    ctx.fillRect(Math.round(x),Math.round(y-p.z),1,1);                     // ...and where it is
    if(p.z<1){ctx.globalAlpha=0.35;ctx.fillRect(Math.round(x),Math.round(y),1,1);ctx.globalAlpha=1}
  }
  if(ocSparks.length)addLight(ocSparks[0].x,ocSparks[0].y,40,0.4);
}
// the marked spots, drawn on the floor with the other ground warnings
function drawOculusMarks(e,proj){
  const s=e.ocs;if(!s||!(s.mode==='aim'||s.mode==='strike'))return;
  const k=s.mode==='aim'?Math.max(0,s.t/s.tMax):0,blink=Math.sin(time*40)>0;
  for(const tg of s.targets){
    ctx.globalAlpha=0.18;polyFill(proj,ringPts(tg.x,tg.y,OC.STRIKE_R,24),'#5ad8ff');
    ctx.globalAlpha=blink?1:0.6;polyFill(proj,ringPts(tg.x,tg.y,OC.STRIKE_R,24),null,'#9ef0ff');
    ctx.globalAlpha=0.9;polyFill(proj,ringPts(tg.x,tg.y,Math.max(1,OC.STRIKE_R*k),20),null,'#ffffff');   // closes to a point
    const [cx,cy]=proj(tg.x,tg.y);ctx.fillStyle='#e8fbff';ctx.fillRect(cx-3,cy,7,1);ctx.fillRect(cx,cy-2,1,5);  // crosshair
    if(Math.random()<0.5){const rand=ocRand,a=rand()*TAU,[ex,ey]=proj(tg.x+Math.cos(a)*OC.STRIKE_R,tg.y+Math.sin(a)*OC.STRIKE_R);ocBolt(cx,cy,ex,ey,5,rand)}
    addLight(tg.x,tg.y,50,0.5);
  }
  ctx.globalAlpha=1;
}

// ---------- drawing the creature (screen space around its ground point sx,sy) ----------
function oculusInit(e){
  e.oc={t:time,look:[0,0],lookT:0,tremor:[0,0],jx:0,jy:0,jT:0,zap:-1,zapT:rnd(0.6,1.8),tents:[]};
  for(let i=0;i<OC.TENT;i++){
    const a=(-25+i*(230/(OC.TENT-1)))*Math.PI/180,pts=[];
    for(let j=0;j<OC.SEG;j++)pts.push([Math.cos(a)*(OC.R-3+j*OC.LEN),Math.sin(a)*(OC.R-3+j*OC.LEN)]);
    e.oc.tents.push({a,ph:rnd(0,TAU),pts,len:OC.LEN*rnd(0.85,1.15)});
  }
}
function drawOculus(e,sx,sy){
  if(!e.oc)oculusInit(e);
  const o=e.oc,s=e.ocs||{mode:'hover'},dt=Math.min(0.05,Math.max(0,time-o.t));o.t=time;
  // STUTTER: the body twitches to a new tiny offset ~12 times a second (more while aiming)
  o.jT-=dt;if(o.jT<=0){const amp=s.mode==='aim'?2:s.mode==='hover'?1:0;o.jx=ri(-amp,amp);o.jy=ri(-amp,amp);o.jT=1/12}
  const bob=Math.round(Math.sin(time*2+e.x*0.01)*2),cx=sx+o.jx,cy=sy-OC.HOVER+bob+o.jy;
  const px=LW/2,py=LH/2-8;   // the knight's body on screen
  // SACCADES: the pupil jumps to a new spot near you, holds, jumps again. Locks on while aiming.
  o.lookT-=dt;
  const toP=[px-cx,py-cy],tl=Math.hypot(...toP)||1;
  if(s.mode==='aim'||s.mode==='strike')o.look=[toP[0]/tl,toP[1]/tl];
  else if(o.lookT<=0){const a=Math.atan2(toP[1],toP[0])+rnd(-0.9,0.9);o.look=[Math.cos(a)*rnd(0.5,1),Math.sin(a)*rnd(0.5,1)];o.lookT=rnd(0.25,0.8)}
  if(Math.random()<0.3)o.tremor=[rnd(-0.6,0.6),rnd(-0.6,0.6)];
  // electricity: idle crackle on a random tentacle
  o.zapT-=dt;if(o.zapT<=0){o.zap=ri(0,OC.TENT-1);o.zapLeft=0.15;o.zapT=rnd(0.5,1.6)}
  o.zapLeft=(o.zapLeft||0)-dt;if(o.zapLeft<=0)o.zap=-1;
  // strike blend: how far the striking tentacles have gone from writhing to the marked spot
  const prog=s.tMax?1-Math.max(0,s.t)/s.tMax:0;
  const reach=s.mode==='strike'?prog:s.mode==='hold'?1:s.mode==='retract'?1-prog:0;
  const striking=new Map();
  if(s.tents&&s.targets)s.tents.forEach((ti,k)=>{const tg=s.targets[k];if(!tg)return;
    // the spot on screen, relative to the body centre
    striking.set(ti,[sx+((tg.x-e.x)-(tg.y-e.y))/2-cx,sy+((tg.x-e.x)+(tg.y-e.y))/4-cy])});
  // simulate the tentacles
  for(let i=0;i<OC.TENT;i++){
    const tn=o.tents[i],p=tn.pts;p[0]=[Math.cos(tn.a)*(OC.R-3),Math.sin(tn.a)*(OC.R-3)];
    for(let j=1;j<p.length;j++){
      const k=j/(p.length-1);
      // while aiming, the tentacles that will strike coil up and shiver
      const coil=s.mode==='aim'&&striking.has(i);
      let ang=tn.a+Math.sin(time*(coil?9:1.7)+tn.ph+j*0.55)*(coil?0.25+k*1.1:0.35+k*0.7)-(coil?k*0.9:0);
      ang+=Math.atan2(Math.sin(Math.PI/2-ang),Math.cos(Math.PI/2-ang))*0.12*k;   // droop
      let tx=p[j-1][0]+Math.cos(ang)*tn.len,ty=p[j-1][1]+Math.sin(ang)*tn.len;
      const st=striking.get(i);
      if(st&&reach!==0){   // a straight, taut line from the base to the marked spot
        const lx=p[0][0]+(st[0]-p[0][0])*k,ly=p[0][1]+(st[1]-p[0][1])*k;
        const r=Math.max(-0.4,Math.min(1,reach));tx=tx+(lx-tx)*r;ty=ty+(ly-ty)*r;
        p[j]=[tx,ty];continue;   // striking tentacles snap, no lag
      }
      const f=Math.min(1,dt*(14-k*8));
      p[j]=[p[j][0]+(tx-p[j][0])*f,p[j][1]+(ty-p[j][1])*f];
    }
  }
  const flash=e.flash>0;
  const drawTent=(tn,i)=>{
    const p=tn.pts,n=p.length,zap=o.zap===i||(striking.has(i)&&(s.mode==='hold'||s.mode==='strike'));
    const pt=j=>[cx+p[j][0],cy+p[j][1]],width=j=>Math.max(1.5,5-j*0.4);
    const dots=[];
    for(let j=1;j<n;j++){const [x0,y0]=pt(j-1),[x1,y1]=pt(j),m=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));
      for(let q=0;q<m;q++){const f=q/m;dots.push([x0+(x1-x0)*f,y0+(y1-y0)*f,width(j-1+f),j])}}
    const disc=(x,y,r,col)=>{ctx.fillStyle=col;const R=Math.ceil(r);for(let dy=-R;dy<=R;dy++){const w=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy)));ctx.fillRect(Math.round(x)-w,Math.round(y)+dy,w*2+1,1)}};
    for(const [x,y,w] of dots)disc(x,y,w/2+1,'#0a0204');
    for(const [x,y,w,j] of dots)disc(x,y,w/2,flash?'#ffffff':OC_FLESH[j<3?4:3]);
    for(const [x,y,w] of dots)if(w>2.2){ctx.fillStyle=flash?'#ffffff':OC_FLESH[5];ctx.fillRect(Math.round(x-w/4),Math.round(y-w/3),1,1)}
    for(let j=2;j<n-1;j+=2){const [x,y]=pt(j);ctx.fillStyle=OC_FLESH[6];ctx.fillRect(Math.round(x),Math.round(y)+1,1,1)}
    const [ex,ey]=pt(n-1).map(Math.round);
    const EYE=[' KKK ','KRWWK','KWWWK','KWWRK',' KKK '],EC={K:'#0a0204',W:'#efe6cc',R:'#c0483e'};
    EYE.forEach((row,yy)=>{for(let xx=0;xx<5;xx++){const c=row[xx];if(c!==' '){ctx.fillStyle=EC[c];ctx.fillRect(ex-2+xx,ey-2+yy,1,1)}}});
    const pdx=Math.round(Math.max(-1,Math.min(1,(px-ex)/30))),pdy=Math.round(Math.max(-1,Math.min(1,(py-ey)/30)));
    ctx.fillStyle='#c06a0a';ctx.fillRect(ex+pdx,ey+pdy-1,1,2);ctx.fillStyle='#120206';ctx.fillRect(ex+pdx,ey+pdy,1,1);
    if(zap){
      for(let j=1;j<n;j+=2){const [ax,ay]=pt(j-1),[bx,by]=pt(Math.min(n-1,j+1));ocBolt(ax,ay,bx,by,8,ocRand)}
      ctx.fillStyle=OC_VOLT[0];ctx.fillRect(ex-1,ey-1,3,3);addLight(e.x,e.y,80,0.6);
    }
  };
  o.tents.forEach((tn,i)=>{if(Math.sin(tn.a)<0.15)drawTent(tn,i)});   // tentacles reaching up/back go behind
  const B=oculusBody(),S=OC.S;
  ctx.drawImage(B,Math.round(cx-S/2),Math.round(cy-S/2));
  // the iris: big, ringed, with a slit pupil that narrows to a needle when it's about to strike
  const ox=Math.round(o.look[0]*5+o.tremor[0]),oy=Math.round(o.look[1]*4+o.tremor[1]),ix=Math.round(cx)+ox,iy=Math.round(cy)-1+oy;
  const slit=s.mode==='aim'?0:s.mode==='hold'||s.mode==='strike'?2:1;
  for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++){
    const dd=Math.hypot(x,y*1.08);if(dd>6.6)continue;
    let c=dd>5.8?'#1a0600':ocPick(OC_IRIS,0.95-dd/7.5+(x<0&&y<0?0.1:0),x+8,y+8);
    if(dd<5.6&&(Math.round(Math.atan2(y,x)*5+dd)%4===0))c=OC_IRIS[1];   // radial fibres in the iris
    ctx.fillStyle=c;ctx.fillRect(ix+x,iy+y,1,1);
  }
  ctx.fillStyle='#050103';ctx.fillRect(ix-slit,iy-5,1+slit*2,11);ctx.fillRect(ix-slit-1,iy-2,3+slit*2,5);
  ctx.fillStyle='#fffaf0';ctx.fillRect(ix-3,iy-4,2,1);ctx.fillRect(ix-3,iy-3,1,1);   // catchlight
  if(s.mode==='aim'){ctx.globalAlpha=0.5+0.5*Math.sin(time*50);ctx.fillStyle='#9ef0ff';ctx.fillRect(ix-1,iy-6,1,1);ctx.fillRect(ix+1,iy+5,1,1);ctx.globalAlpha=1}
  if(flash){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.55;ctx.drawImage(B,Math.round(cx-S/2),Math.round(cy-S/2));ctx.restore()}
  o.tents.forEach((tn,i)=>{if(Math.sin(tn.a)>=0.15)drawTent(tn,i)});
  addLight(e.x,e.y,s.mode==='aim'?80:50,s.mode==='aim'?0.6:0.35);
}
// test tool: press O to spawn one beside you
function spawnOculus(){
  if(scene!=='game'||!enemies)return;
  const a=P.aim,e=spawnEnemy('eye',{x:P.x+Math.cos(a)*110,y:P.y+Math.sin(a)*110});
  log('An Oculus drifts out of the dark (test spawn, O).','#8fa8ff');return e;
}
