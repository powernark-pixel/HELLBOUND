/* HELLBOUND · js/ambience.js · Fog, dust motes and blood drips
   (Files load in the order listed in index.html and share one global scope.) */

/* ----- AMBIENT LIFE -----
   Fog: soft blobs on a small canvas, tiled across the screen, stuck to the floor so it drifts as you walk.
   Motes: specks of dust floating around the knight, only visible where the light is.
   Drips: drops of blood sliding down the bloody wall faces. */
const FOG_ALPHA=0.06;   // how thick the drifting fog is (was 0.2: Dave found the smoke too heavy)
let fogCv=null;
function fogCanvas(){
  if(fogCv)return fogCv;
  fogCv=document.createElement('canvas');fogCv.width=320;fogCv.height=160;
  const g=fogCv.getContext('2d');let seed=7;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<46;i++){
    const x=r()*320,y=r()*160,rad=18+r()*46;
    for(const ox of [-320,0,320])for(const oy of [-160,0,160]){   // wrap so the tiles join seamlessly
      const gr=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,rad);
      gr.addColorStop(0,'rgba(150,120,130,0.22)');gr.addColorStop(1,'rgba(150,120,130,0)');
      g.fillStyle=gr;g.fillRect(x+ox-rad,y+oy-rad,rad*2,rad*2);
    }
  }
  return fogCv;
}
function drawFog(camX,camY,alpha){
  const f=fogCanvas(),ox=((camX*0.9+time*7)%320+320)%320,oy=((camY*0.9+time*2)%160+160)%160;
  ctx.save();ctx.globalAlpha=alpha;
  for(let x=ox-320;x<LW;x+=320)for(let y=oy-160;y<LH;y+=160)ctx.drawImage(f,Math.round(x),Math.round(y));
  ctx.restore();
}
const motes=[];
function drawMotes(S_,psx,psy){
  while(motes.length<38)motes.push({x:P.x+rnd(-260,260),y:P.y+rnd(-260,260),z:rnd(4,40),ph:rnd(0,TAU),sp:rnd(0.3,1)});
  ctx.save();
  for(const m of motes){
    m.x+=Math.sin(time*0.4*m.sp+m.ph)*0.15;m.y+=Math.cos(time*0.3*m.sp+m.ph)*0.12;m.z+=Math.sin(time*m.sp+m.ph)*0.05;
    if(Math.abs(m.x-P.x)>280||Math.abs(m.y-P.y)>280){m.x=P.x+rnd(-240,240);m.y=P.y+rnd(-240,240)}
    const [sx,sy]=S_(m.x,m.y),d=Math.hypot(sx-psx,sy-psy),glow=Math.max(0,1-d/170);
    if(glow<=0)continue;
    ctx.globalAlpha=glow*(0.45+0.35*Math.sin(time*3*m.sp+m.ph));ctx.fillStyle='#ffd9a0';
    ctx.fillRect(sx,Math.round(sy-m.z),1,1);
  }
  ctx.restore();
}
function drawDrip(x,y,seed){
  // x,y: bottom of the wall face where the drip runs. One drop every few seconds, then a tiny splash.
  const cyc=3+seed*3,t=((time+seed*11)%cyc)/cyc;
  ctx.fillStyle='#8f1a1f';ctx.fillRect(x,y-WALL_H+8,1,6);             // the stain it runs from
  if(t<0.55){const k=t/0.55,yy=y-WALL_H+14+k*k*(WALL_H-14);ctx.fillStyle='#c4302c';ctx.fillRect(x,Math.round(yy),1,2)}
  else if(t<0.7){ctx.fillStyle='#8f1a1f';ctx.fillRect(x-1,y,3,1)}
}

/* Speed lines: short streaks trailing the knight when he moves, long bright ones when he dashes
   or chops, so his movement reads as fast and heavy. P.trail holds his last few positions. */
const SPEED_MIN=14,SPEED_FULL=70;   // trail length (px over ~7 frames) where lines start, and where they're strongest
function drawSpeedLines(S_,psx,psy){
  const tr=P.trail;if(!tr||tr.length<3||dead)return;
  const [ox,oy]=tr[0],mv=Math.hypot(P.x-ox,P.y-oy);if(mv<SPEED_MIN)return;
  const [x0,y0]=S_(ox,oy),dx=psx-x0,dy=psy-y0,k=Math.min(1,(mv-SPEED_MIN)/(SPEED_FULL-SPEED_MIN));
  ctx.save();ctx.lineWidth=1;
  const rows=[-4,-10,-16,-22,-27];
  rows.forEach((h,i)=>{
    const wob=Math.sin(time*40+i*2.1),len=0.6+0.9*k+0.25*wob,sx=psx-dx*0.25+wob,sy=psy+h-dy*0.25;
    ctx.globalAlpha=(0.15+0.55*k)*(i%2?0.7:1);ctx.strokeStyle=k>0.5?COL.fireHi:COL.bone;
    ctx.beginPath();ctx.moveTo(Math.round(sx)+.5,Math.round(sy)+.5);ctx.lineTo(Math.round(sx-dx*len)+.5,Math.round(sy-dy*len)+.5);ctx.stroke();
  });
  ctx.restore();
}
