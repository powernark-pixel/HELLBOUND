/* HELLBOUND · js/eye.js · The Oculus: a floating eye monster (rough art pass, Noita-style)
   (Files load in the order listed in index.html and share one global scope.)

   Unlike the other monsters it has no sprite sheet: it's drawn live every frame, pixel by pixel.
   - BODY: a fleshy sphere, shaded and veined once at start-up (OCULUS_BODY canvas).
   - THE EYE: sclera baked into the body; the iris and slit pupil are drawn live and track the
     knight. Fleshy lids blink now and then, and snap shut when it's hit.
   - TENTACLES: 8 chains of points that trail behind each other (a simple verlet-style follow),
     so they writhe and lag like something wet and heavy. Each ends in a small eye that also
     watches you. Every so often one crackles with electricity.
   Press O in game to spawn one next to you (a test tool while the art is rough). */

const OC={R:15,S:38,HOVER:28,TENT:9,SEG:9,LEN:3.4};
const OC_FLESH=['#12030a','#25060e','#3e0d16','#5e1620','#82242a','#a83a36','#d06a56'];
const OC_SCLERA=['#4a3c32','#7a6a56','#b0a184','#d8ccae','#efe6cc'];
const OC_IRIS=['#3a1a00','#7a3a04','#c06a0a','#f0a020','#ffd860'];
let OCULUS_BODY=null;

function bayer4(x,y){const m=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];return (m[(y&3)*4+(x&3)]+0.5)/16}
function ocPick(ramp,v,x,y){const n=ramp.length,f=Math.max(0,Math.min(0.999,v))*(n-1),i=Math.floor(f);return ramp[Math.min(n-1,i+(f-i>bayer4(x,y)?1:0))]}

// Bake the body and the white of the eye once.
function oculusBody(){
  if(OCULUS_BODY)return OCULUS_BODY;
  const S=OC.S,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
  const cx=S/2,cy=S/2,R=OC.R,ER=9.5,ex=cx,ey=cy+1.5;
  const L=[-0.45,-0.7,0.55],ll=Math.hypot(...L);L[0]/=ll;L[1]/=ll;L[2]/=ll;
  const vein=(x,y)=>{const a=Math.sin(x*0.9+Math.sin(y*0.7)*2.2)+Math.sin(y*1.3+x*0.4);return Math.abs(a)<0.18};
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const dx=(x+0.5-cx)/R,dy=(y+0.5-cy)/R,d2=dx*dx+dy*dy;
    if(d2>1)continue;
    const nz=Math.sqrt(1-d2),sh=Math.max(0,dx*L[0]+dy*L[1]+nz*L[2]);
    const edx=x+0.5-ex,edy=y+0.5-ey,ed=Math.hypot(edx,edy);
    let col;
    if(ed<ER){   // the eyeball: its own sphere, paler, with red veins creeping in from the rim
      const ux=edx/ER,uy=edy/ER,un=Math.sqrt(Math.max(0,1-ux*ux-uy*uy)),es=Math.max(0,ux*L[0]+uy*L[1]+un*L[2]);
      col=ocPick(OC_SCLERA,0.15+es*0.95,x,y);
      if(ed>ER*0.55&&vein(x*1.7,y*1.7))col='#a02828';
    }else if(ed<ER+1.6){col=ed<ER+0.8?'#0e0206':OC_FLESH[1]}   // socket rim
    else{
      col=ocPick(OC_FLESH,0.02+sh*0.95,x,y);
      if(vein(x,y)&&sh<0.8)col=OC_FLESH[Math.max(0,OC_FLESH.indexOf(col)-2)];   // dark veins under the skin
      if(sh>0.9&&(x+y)%3===0)col='#ffcab0';                                        // wet glints
    }
    g.fillStyle=col;g.fillRect(x,y,1,1);
  }
  // a 1px dark outline, Noita-style
  const d=g.getImageData(0,0,S,S),out=g.createImageData(S,S);out.data.set(d.data);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const k=(y*S+x)*4;if(d.data[k+3])continue;
    for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+ox,yy=y+oy;if(xx<0||yy<0||xx>=S||yy>=S)continue;
      if(d.data[(yy*S+xx)*4+3]){out.data[k]=8;out.data[k+1]=2;out.data[k+2]=4;out.data[k+3]=255;break}}
  }
  g.putImageData(out,0,0);
  return OCULUS_BODY=c;
}

// Per-monster state for the tentacles (lazily made the first time it's drawn)
function oculusInit(e){
  e.oc={t:time,blink:rnd(1,3),lid:0,zap:-1,zapT:rnd(0.6,1.8),tents:[]};
  for(let i=0;i<OC.TENT;i++){
    // bases spread around the lower body, a couple reaching out to the sides
    const a=(-25+i*(230/(OC.TENT-1)))*Math.PI/180;
    const pts=[];for(let j=0;j<OC.SEG;j++)pts.push([Math.cos(a)*(OC.R-2)+Math.cos(a)*j*OC.LEN,Math.sin(a)*(OC.R-2)+Math.sin(a)*j*OC.LEN]);
    e.oc.tents.push({a,ph:rnd(0,TAU),pts,len:OC.LEN*rnd(0.85,1.15)});
  }
}
function oculusStep(e,dt,lookX,lookY){
  const o=e.oc;
  // blinking: lids close fast, open slower; a hit snaps them shut
  o.blink-=dt;if(o.blink<=0){o.lidT=0.22;o.blink=rnd(1.8,4.5)}
  if(e.flash>0)o.lidT=Math.max(o.lidT||0,0.12);
  o.lidT=(o.lidT||0)-dt;const want=o.lidT>0?1:0;o.lid+=(want-o.lid)*Math.min(1,dt*(want?28:9));
  // electricity: every so often one tentacle crackles
  o.zapT-=dt;if(o.zapT<=0){o.zap=ri(0,OC.TENT-1);o.zapLeft=0.18;o.zapT=rnd(0.7,2.2);if(Math.random()<0.5)SFX.play('zap')}
  o.zapLeft=(o.zapLeft||0)-dt;if(o.zapLeft<=0)o.zap=-1;
  // tentacles: each point follows the one before it, swinging on a slow wave, drooping a little,
  // and the tips curl toward the knight
  const t=time;
  for(const tn of o.tents){
    const p=tn.pts;p[0]=[Math.cos(tn.a)*(OC.R-2),Math.sin(tn.a)*(OC.R-2)];
    for(let j=1;j<p.length;j++){
      const k=j/(p.length-1);
      let ang=tn.a+Math.sin(t*1.7+tn.ph+j*0.55)*(0.35+k*0.7);
      // droop toward 'down' (pi/2) and reach for the target near the tip
      ang+=Math.atan2(Math.sin(Math.PI/2-ang),Math.cos(Math.PI/2-ang))*0.12*k;
      ang+=Math.atan2(Math.sin(Math.atan2(lookY,lookX)-ang),Math.cos(Math.atan2(lookY,lookX)-ang))*0.18*k*k;
      const tx=p[j-1][0]+Math.cos(ang)*tn.len,ty=p[j-1][1]+Math.sin(ang)*tn.len;
      const f=Math.min(1,dt*(14-k*8));   // the further out, the more it lags behind
      p[j]=[p[j][0]+(tx-p[j][0])*f,p[j][1]+(ty-p[j][1])*f];
    }
  }
}
function oculusLine(x0,y0,x1,y1,w,col,edge){
  const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));
  for(let i=0;i<=n;i++){const x=Math.round(x0+(x1-x0)*i/n),y=Math.round(y0+(y1-y0)*i/n);
    if(edge){ctx.fillStyle=edge;ctx.fillRect(x-Math.ceil(w/2)-1,y-Math.ceil(w/2),w+2,w+1)}
    ctx.fillStyle=col;ctx.fillRect(x-Math.ceil(w/2),y-Math.ceil(w/2),w,w)}
}
// Draw one Oculus whose ground point is at screen (sx,sy)
function drawOculus(e,sx,sy){
  if(!e.oc)oculusInit(e);
  const o=e.oc,dt=Math.min(0.05,Math.max(0,time-o.t));o.t=time;
  const bob=Math.sin(time*2+e.x*0.01)*2,cx=sx,cy=sy-OC.HOVER+bob;
  // where to look, in screen space: at the knight's body
  const [px,py]=[LW/2,LH/2-8],lx=px-cx,ly=py-cy,ld=Math.hypot(lx,ly)||1;
  oculusStep(e,dt,lx/ld,ly/ld);
  const flash=e.flash>0;
  // tentacles behind first (the ones reaching up/back), body, then the ones in front
  const drawTent=(tn,i)=>{
    const p=tn.pts,zap=o.zap===i,n=p.length;
    const pt=j=>[cx+p[j][0],cy+p[j][1]],width=j=>Math.max(1.5,5-j*0.4);
    // walk the tentacle in small steps so it's one smooth tapering tube
    const dots=[];
    for(let j=1;j<n;j++){const [x0,y0]=pt(j-1),[x1,y1]=pt(j),m=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));
      for(let s=0;s<m;s++){const f=s/m;dots.push([x0+(x1-x0)*f,y0+(y1-y0)*f,width(j-1+f),j])}}
    const disc=(x,y,r,col)=>{ctx.fillStyle=col;const R=Math.ceil(r);for(let dy=-R;dy<=R;dy++){const w=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy)));if(w>=0)ctx.fillRect(Math.round(x)-w,Math.round(y)+dy,w*2+1,1)}};
    for(const [x,y,w] of dots)disc(x,y,w/2+1,'#0a0204');                           // 1. outline
    for(const [x,y,w,j] of dots)disc(x,y,w/2,flash?'#ffffff':OC_FLESH[j<3?4:3]);     // 2. flesh
    for(const [x,y,w,j] of dots)if(w>2.2){ctx.fillStyle=flash?'#ffffff':OC_FLESH[5];ctx.fillRect(Math.round(x-w/4),Math.round(y-w/3),1,1)}   // 3. top-lit ridge
    for(let j=2;j<n-1;j+=2){const [x,y]=pt(j);ctx.fillStyle=OC_FLESH[6];ctx.fillRect(Math.round(x),Math.round(y)+1,1,1)}   // suckers
    // the little eye on the tip, watching you
    const [ex,ey]=pt(n-1).map(Math.round);
    const EYE=[' KKK ','KRWWK','KWWWK','KWWRK',' KKK '],EC={K:'#0a0204',W:'#efe6cc',R:'#c0483e'};
    EYE.forEach((row,yy)=>{for(let xx=0;xx<5;xx++){const c=row[xx];if(c!==' '){ctx.fillStyle=EC[c];ctx.fillRect(ex-2+xx,ey-2+yy,1,1)}}});
    const pdx=Math.round(Math.max(-1,Math.min(1,(px-ex)/30))),pdy=Math.round(Math.max(-1,Math.min(1,(py-ey)/30)));
    ctx.fillStyle='#c06a0a';ctx.fillRect(ex+pdx,ey+pdy-1,1,2);ctx.fillStyle='#120206';ctx.fillRect(ex+pdx,ey+pdy,1,1);
    if(zap){   // electricity crawling along the tentacle
      for(let j=1;j<n;j++){
        const jx=(Math.random()-0.5)*5,jy=(Math.random()-0.5)*5;
        oculusLine(cx+p[j-1][0]+jx,cy+p[j-1][1]+jy,cx+p[j][0]-jx,cy+p[j][1]-jy,1,Math.random()<0.5?'#e8fbff':'#5ad8ff');
      }
      ctx.fillStyle='#e8fbff';ctx.fillRect(ex-1,ey-1,3,3);
      addLight(e.x,e.y,80,0.7);
    }
  };
  o.tents.forEach((tn,i)=>{if(Math.sin(tn.a)<0.2)drawTent(tn,i)});
  const B=oculusBody(),S=OC.S;
  ctx.drawImage(B,Math.round(cx-S/2),Math.round(cy-S/2));
  // the iris and slit pupil, sliding toward the knight
  const ex=cx,ey=cy+1.5,ox=lx/ld*3.5,oy=ly/ld*2.5;
  for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){
    const d=Math.hypot(x,y);if(d>4.6)continue;
    const v=0.95-d/5.5+(x<0&&y<0?0.1:0);
    ctx.fillStyle=d>3.9?'#2a0e00':ocPick(OC_IRIS,v,x+8,y+8);
    ctx.fillRect(Math.round(ex+ox+x),Math.round(ey+oy+y),1,1);
  }
  ctx.fillStyle='#060104';ctx.fillRect(Math.round(ex+ox),Math.round(ey+oy-3),1,7);ctx.fillRect(Math.round(ex+ox)-1,Math.round(ey+oy-1),3,3);
  ctx.fillStyle='#fff6e0';ctx.fillRect(Math.round(ex+ox-2),Math.round(ey+oy-3),1,1);   // catchlight
  // eyelids: two fleshy curtains meeting in the middle
  if(o.lid>0.02){
    const h=Math.round(10*o.lid);
    for(let x=-10;x<=10;x++){
      const span=Math.sqrt(Math.max(0,100-x*x))/10,top=Math.round(-10*span),bot=Math.round(10*span);
      const reach=Math.round(h*span);if(reach<=0)continue;
      ctx.fillStyle=OC_FLESH[4];ctx.fillRect(Math.round(ex+x),Math.round(ey+top),1,reach);
      ctx.fillStyle=OC_FLESH[3];ctx.fillRect(Math.round(ex+x),Math.round(ey+bot-reach+1),1,reach);
      ctx.fillStyle='#0a0204';ctx.fillRect(Math.round(ex+x),Math.round(ey+top+reach),1,1);
    }
  }
  if(flash){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.55;ctx.drawImage(B,Math.round(cx-S/2),Math.round(cy-S/2));ctx.restore()}
  o.tents.forEach((tn,i)=>{if(Math.sin(tn.a)>=0.2)drawTent(tn,i)});
  addLight(e.x,e.y,50,0.35);
}
// test tool: press O to spawn one beside you
function spawnOculus(){
  if(scene!=='game'||!enemies)return;
  const a=P.aim,e=spawnEnemy('eye',{x:P.x+Math.cos(a)*90,y:P.y+Math.sin(a)*90});
  log('An Oculus drifts out of the dark (test spawn, O).','#8fa8ff');return e;
}
