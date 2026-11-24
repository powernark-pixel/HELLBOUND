/* HELLBOUND · js/skills.js · Skills: Blood Flask, Cleave, Fire Line
   (Files load in the order listed in index.html and share one global scope.) */

/* ----- BLOOD FLASK (R) -----
   Drink to heal 45% of max health over one second. Start each level with 3.
   Every 6 kills fills one back up, and the shack's fire refills them all. */
const FLASK_MAX=3,FLASK_HEAL=0.45,FLASK_KILLS=6;
function drinkFlask(){
  if(scene!=='game'||dead||paused||anyPanelOpen())return;
  if(P.flasks<1){log('No blood flasks left. Kill to refill them.','#c4302c');return}
  if(P.hp>=P.maxHp){log('Already at full health.','#c9a99a');return}
  P.flasks--;P.healLeft+=P.maxHp*FLASK_HEAL;P.healT=1;
  SFX.play('drink');addText(P.x,P.y-30,'FLASK','#ff6a6a',1);
  for(let i=0;i<14;i++)parts.push({x:P.x+rnd(-8,8),y:P.y+rnd(-4,4),vx:rnd(-12,12),vy:rnd(-60,-25),life:rnd(.4,.8),max:.8,c:pick(['#c4302c','#ff6a6a','#8f1a1f']),s:rnd(1,2)});
}
function flaskKill(){
  if(P.flasks>=FLASK_MAX){P.flaskProg=0;return}
  if(++P.flaskProg>=FLASK_KILLS){P.flaskProg=0;P.flasks++;addText(P.x,P.y-30,'+1 FLASK','#ff8a8a',1);SFX.play('pickup')}
}
function updateHeal(dt){
  if(P.healT<=0||dead)return;
  const step=Math.min(P.healLeft,P.healLeft*dt/P.healT);
  P.hp=Math.min(P.maxHp,P.hp+step);P.healLeft-=step;P.healT-=dt;
  if(Math.random()<dt*25)parts.push({x:P.x+rnd(-7,7),y:P.y+rnd(-3,3),vx:0,vy:rnd(-40,-20),life:.5,max:.5,c:'#ff6a6a',s:1});
  if(P.healT<=0)P.healLeft=0;
}

/* ----- CLEAVE (E) -----
   A full spin of the blade: hits everything around you for 1.6x damage, shoves it away,
   and you can't be hurt for a moment while you spin. */
const SPIN_CD=6;
function castSpin(){
  if(scene!=='game'||dead||paused||anyPanelOpen()||P.spinCD>0)return;
  P.spinCD=SPIN_CD;P.inv=Math.max(P.inv,0.3);
  const R=S.range*1.4;
  swings.push({x:P.x,y:P.y,a:P.aim,life:.18,r:R,arc:TAU-0.01,oath:false});
  swings.push({x:P.x,y:P.y,a:P.aim+Math.PI,life:.18,r:R*0.8,arc:TAU-0.01,oath:false});
  P.atkAnim=0.3;setAnim(P,'attack');P.animT=0;shake=Math.max(shake,0.3);
  SFX.play('spin');SFX.play('swing');
  for(const e of enemies){
    if(e.dead||dist(e,P)>R+hurtR(e))continue;
    dealDamage(e,S.damage*1.6);
    if(!e.boss&&!e.dead){const a=Math.atan2(e.y-P.y,e.x-P.x),k=e.type==='demon'?200:420;e.kbx=Math.cos(a)*k;e.kby=Math.sin(a)*k;e.kbT=0.16;e.act=null}
  }
  for(let i=0;i<24;i++){const a=i/24*TAU;parts.push({x:P.x+Math.cos(a)*R*0.7,y:P.y+Math.sin(a)*R*0.7,vx:Math.cos(a)*90,vy:Math.sin(a)*90,life:.3,max:.3,c:pick(['#fff1c2','#ffd27a','#5d5059']),s:1,ground:1})}
}

/* ----- FIRE LINE (Q or right-click) -----
   A wave of fire pillars rushes out in a straight line toward where you aim. Each pillar burns
   enemies it touches (once per wave). Walls stop it. With the PYRE trait (the Altar-Forged Blade)
   it reaches twice as far, hits twice as hard and leaves burning ground. */
const FIRE_CD=3.2,FIRE_CD_PYRE=2.5;
function fireCdMax(){return hasTrait('pyre')?FIRE_CD_PYRE:FIRE_CD}
function castFireLine(){
  if(scene!=='game'||dead||paused||anyPanelOpen()||P.fireCD>0)return;
  const pyre=hasTrait('pyre');
  P.fireCD=fireCdMax();
  fireWaves.push({x:P.x,y:P.y,dx:Math.cos(P.aim),dy:Math.sin(P.aim),len:pyre?380:200,dist:10,next:16,hit:new Set(),
    dmg:S.damage*(pyre?2.8:1.4),pyre});
  P.atkAnim=0.3;setAnim(P,'attack');P.animT=0;shake=Math.max(shake,0.2);SFX.play('fireline');
}
function updateFire(dt){
  for(const w of fireWaves){
    w.dist+=900*dt;
    while(!w.done&&w.next<=Math.min(w.dist,w.len)){
      const px=w.x+w.dx*w.next,py=w.y+w.dy*w.next;
      if(tileAt(px,py)===0){w.done=true;break}
      pillars.push({x:px,y:py,life:0.45,max:0.45,seed:Math.random()*10});
      decals.push({x:px,y:py,scorch:1});if(decals.length>200)decals.shift();
      if(w.pyre)burns.push({x:px,y:py,life:3,max:3,seed:Math.random()*10});
      for(const e of enemies){
        if(e.dead||w.hit.has(e)||Math.hypot(e.x-px,e.y-py)>14+hurtR(e))continue;
        w.hit.add(e);dealDamage(e,w.dmg);
      }
      for(let i=0;i<3;i++)parts.push({x:px+rnd(-6,6),y:py+rnd(-6,6),vx:rnd(-20,20),vy:rnd(-60,-20),life:rnd(.4,.9),max:.9,c:pick(['#ff6a1a','#ffd27a','#a12a06']),s:rnd(1,2)});
      w.next+=16;
    }
    if(w.next>w.len)w.done=true;
  }
  fireWaves=fireWaves.filter(w=>!w.done);
  for(const p of pillars)p.life-=dt;
  pillars=pillars.filter(p=>p.life>0);
  for(const b of burns){
    b.life-=dt;
    for(const e of enemies){
      if(e.dead||Math.hypot(e.x-b.x,e.y-b.y)>12+hurtR(e))continue;
      e.hp-=S.damage*0.6*dt;e.flash=Math.max(e.flash,0.02);
      if(e.hp<=0)killEnemy(e);
    }
  }
  burns=burns.filter(b=>b.life>0);
}
// A column of pixel fire standing at screen (sx,sy): wide red base, orange body, yellow core, white tip
function drawPillar(sx,sy,p){
  const age=1-p.life/p.max,grow=age<0.15?age/0.15:1,fade=p.life/p.max*0.7+0.3;
  const h=Math.round(28*grow*fade),fl=Math.sin(time*30+p.seed)*1.5;
  const layers=[[10,1,'#a12a06'],[7,0.85,'#ff6a1a'],[4.5,0.62,'#ffd27a'],[2,0.38,'#fff1c2']];
  for(const [w,hh,c] of layers){
    const H=Math.round(h*hh),W=Math.round(w*grow),x0=Math.round(sx-W/2+fl*(1-hh));
    ctx.fillStyle=c;
    // each pixel column licks up to its own flickering height, so the top is ragged like real flame
    for(let i=0;i<W;i++){
      const lick=Math.round((Math.sin(time*38+i*1.7+p.seed*3)*0.5+0.5)*H*0.35);
      const edge=Math.abs(i-(W-1)/2)/(W/2);
      const colH=Math.max(1,Math.round(H*(1-edge*0.45))-lick);
      ctx.fillRect(x0+i,sy-colH,1,colH);
    }
  }
}
function drawFireLayer(proj,lightAt){
  for(const b of burns){const [sx,sy]=proj(b.x,b.y);ctx.globalAlpha=Math.min(1,b.life/0.5);drawFlame(sx-3,sy,b.seed);drawFlame(sx+3,sy-1,b.seed+3);ctx.globalAlpha=1;lightAt(b.x,b.y,34,0.45)}
  for(const p of pillars){const [sx,sy]=proj(p.x,p.y);drawPillar(sx,sy,p);lightAt(p.x,p.y,80,0.9*p.life/p.max)}
}
