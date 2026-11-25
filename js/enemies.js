/* HELLBOUND · js/enemies.js · Enemy attacks: hound lunge, demon slam, the Warden's fight, ground warnings
   (Files load in the order listed in index.html and share one global scope.) */

/* ----- TELEGRAPHED ENEMY ATTACKS -----
   Hounds: growl and crouch (a red line shows their path), then lunge fast along it.
   Demons: raise their fists (a red circle grows on the floor), then slam the ground.
   The warnings give you time to roll out of the way. */
const SLAM_R=78;
function houndAI(e,d,nx,ny,dt){
  e.lcd=(e.lcd??rnd(0.5,1.5))-dt;
  if(e.act==='wind'){e.actT-=dt;e.animT=0;if(e.actT<=0){e.act='lunge';e.actT=0.28}return [0,0]}
  if(e.act==='lunge'){e.actT-=dt;if(e.actT<=0){e.act='rec';e.actT=0.5}return [e.lx*560,e.ly*560]}
  if(e.act==='rec'){e.actT-=dt;if(e.actT<=0)e.act=null;return [nx*e.spd*0.35,ny*e.spd*0.35]}
  if(d<170&&e.lcd<=0){e.act='wind';e.actT=0.45;e.lx=nx;e.ly=ny;e.lcd=2.4;SFX.play('growl');return [0,0]}
  return [nx*e.spd,ny*e.spd];
}
function demonAI(e,d,nx,ny,dt){
  e.scd=(e.scd??1)-dt;
  if(e.act==='wind'){e.actT-=dt;e.animT=0;if(e.actT<=0){e.act='rec';e.actT=0.6;demonSlam(e)}return [0,0]}
  if(e.act==='rec'){e.actT-=dt;if(e.actT<=0)e.act=null;return [0,0]}
  if(d<85&&e.scd<=0){e.act='wind';e.actT=0.7;e.scd=3.2;e.windMax=0.7;SFX.play('growl');return [0,0]}
  return [nx*e.spd,ny*e.spd];
}
/* ----- THE WARDEN -----
   A fair fight with a rhythm: he stalks you, then picks an attack and WARNS you first,
   then rests for a moment. The rest is your opening (he takes extra damage while resting).
   - Close up: SLAM. A red circle fills under him; get out before it fills.
   - Further away: ORB BURST. Red lanes show where every orb will fly; stand in a gap.
   Touching him no longer hurts: he just shoves you away. */
const WARDEN_SLAM_R=100;
function wardenAI(e,d,nx,ny,dt){
  e.act=e.act||'walk';e.actT=(e.actT??1.5)-dt;
  const angry=e.hp<e.max*0.5;
  if(e.act==='walk'){
    if(e.actT<=0||d<70){
      e.act='wind';e.windMax=e.actT=angry?0.75:0.9;SFX.play('growl');
      if(d<130){e.atk='slam'}
      else{
        // pick the orb lanes now so the warning can show them; leave a wide gap to stand in
        e.atk='burst';const n=angry?16:12,gap=rnd(0,TAU),off=rnd(0,TAU);e.lanes=[];
        for(let k=0;k<n;k++){const a=off+k/n*TAU;let da=Math.atan2(Math.sin(a-gap),Math.cos(a-gap));if(Math.abs(da)>0.55)e.lanes.push(a)}
      }
      return [0,0];
    }
    return [nx*e.spd*0.75,ny*e.spd*0.75];
  }
  if(e.act==='wind'){
    e.animT=0;
    if(e.actT<=0){
      if(e.atk==='slam'){
        shake=Math.max(shake,0.7);hitStop=Math.max(hitStop,0.1);SFX.play('slam');
        if(d<WARDEN_SLAM_R&&!dead)hurt((22+floor*3)*e.dmgMul);
        for(let i=0;i<36;i++){const a=i/36*TAU,sp=rnd(150,260);parts.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.3,.55),max:.55,c:pick(['#5d5059','#4a3f48','#ff2b6b']),s:rnd(1,2.5),ground:1})}
        for(let i=0;i<5;i++)decals.push({x:e.x+rnd(-20,20),y:e.y+rnd(-10,10),scorch:1});
      }else{
        SFX.play('bolt');e.shotAnim=0.35;
        for(const a of e.lanes)ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*135,vy:Math.sin(a)*135,life:4,dmg:(12+floor*2)*e.dmgMul,r:6,c:'#ff2b6b'});
      }
      e.act='rest';e.actT=angry?1.1:1.5;
    }
    return [0,0];
  }
  // rest: catching his breath. Hit him now!
  if(e.actT<=0){e.act='walk';e.actT=rnd(1.2,2.2)}
  return [0,0];
}

function demonSlam(e){
  shake=Math.max(shake,0.55);hitStop=Math.max(hitStop,0.08);SFX.play('slam');
  setAnim(e,'attack');e.animT=0.09;
  if(dist(P,e)<SLAM_R&&!dead)hurt(ET.demon.dmg*1.4*e.dmgMul*(1+(floor-1)*0.15));
  for(let i=0;i<28;i++){const a=i/28*TAU,sp=rnd(120,220);
    parts.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.25,.5),max:.5,c:pick(['#5d5059','#4a3f48','#ff6a1a']),s:rnd(1,2.5),ground:1})}
  impacts.push({x:e.x,y:e.y,life:0.12,max:0.12,crit:true});
  decals.push({x:e.x,y:e.y,scorch:1});decals.push({x:e.x+10,y:e.y+4,scorch:1});decals.push({x:e.x-9,y:e.y-5,scorch:1});
}
// Ground warnings, drawn under the fighters. proj turns a world point into a screen point.
function polyFill(proj,pts,fill,stroke){
  ctx.beginPath();pts.forEach(([wx,wy],i)=>{const [x,y]=proj(wx,wy);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
}
function ringPts(cx,cy,r,n=32){const o=[];for(let i=0;i<n;i++){const a=i/n*TAU;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return o}
function drawTelegraphs(proj){
  const blink=0.55+0.3*Math.sin(time*24);
  for(const e of enemies){
    if(e.dead)continue;
    if(e.type==='eye'){drawOculusMarks(e,proj);continue}
    if(e.boss&&e.act==='rest'){   // a dim gold ring: he's open
      ctx.globalAlpha=0.35+0.2*Math.sin(time*8);polyFill(proj,ringPts(e.x,e.y,e.r+8),null,'#ffe14f');continue}
    if(e.act!=='wind')continue;
    if(e.boss&&e.atk==='burst'){
      const k=Math.min(1,1-e.actT/e.windMax);
      for(const a of e.lanes){
        const L=60+k*200,w=5,px=-Math.sin(a)*w,py=Math.cos(a)*w,x0=e.x+Math.cos(a)*e.r,y0=e.y+Math.sin(a)*e.r,x1=e.x+Math.cos(a)*L,y1=e.y+Math.sin(a)*L;
        ctx.globalAlpha=0.35+0.2*blink;polyFill(proj,[[x0+px,y0+py],[x1+px,y1+py],[x1-px,y1-py],[x0-px,y0-py]],'#ff2b6b');
        addLight(e.x+Math.cos(a)*L*0.6,e.y+Math.sin(a)*L*0.6,50,0.35);   // light the lanes so they read in the dark
      }
      continue;
    }
    if(e.boss&&e.atk==='slam'){
      const k=Math.min(1,1-e.actT/e.windMax);
      ctx.globalAlpha=0.16+0.08*blink;polyFill(proj,ringPts(e.x,e.y,WARDEN_SLAM_R,40),'#ff2a1a');
      addLight(e.x,e.y,WARDEN_SLAM_R*2.4,0.6);
      ctx.globalAlpha=0.45;polyFill(proj,ringPts(e.x,e.y,Math.max(2,WARDEN_SLAM_R*k),40),'#ff7a2a');
      ctx.globalAlpha=blink;polyFill(proj,ringPts(e.x,e.y,WARDEN_SLAM_R,40),null,'#ff5a3a');
      continue;
    }
    if(e.type==='hound'){
      // a red lane the width of the hound, showing exactly where it will run
      const L=180,w=e.r*0.8,px=-e.ly*w,py=e.lx*w,x0=e.x+e.lx*e.r,y0=e.y+e.ly*e.r,x1=e.x+e.lx*L,y1=e.y+e.ly*L;
      ctx.globalAlpha=0.28*blink+0.1;polyFill(proj,[[x0+px,y0+py],[x1+px,y1+py],[x1-px,y1-py],[x0-px,y0-py]],'#ff2a1a');
      ctx.globalAlpha=blink;polyFill(proj,[[x0+px,y0+py],[x1+px,y1+py],[x1-px,y1-py],[x0-px,y0-py]],null,'#ff5a3a');
    }else if(e.type==='demon'){
      // the danger zone, filling up from the middle as the fists come down
      const k=Math.min(1,1-e.actT/(e.windMax||0.7));
      ctx.globalAlpha=0.16+0.08*blink;polyFill(proj,ringPts(e.x,e.y,SLAM_R),'#ff2a1a');
      ctx.globalAlpha=0.45;polyFill(proj,ringPts(e.x,e.y,Math.max(2,SLAM_R*k)),'#ff7a2a');
      ctx.globalAlpha=blink;polyFill(proj,ringPts(e.x,e.y,SLAM_R),null,'#ff5a3a');
    }
  }
  ctx.globalAlpha=1;
}
