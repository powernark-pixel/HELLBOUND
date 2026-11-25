/* HELLBOUND · js/update.js · One step of game logic per frame: movement, enemy AI loop, pickups, stairs
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   9. UPDATE (one step of game logic per frame)
   ===================================================================== */
function update(dt){
  time+=dt;
  if(scene!=='game'){updateTitle(dt);return}
  updateFX(dt);
  updateBubbles(dt,level?'blood':'lava');
  updateOculusFX(dt);
  updateBlood(dt);updateTrials(dt);
  if(Math.random()<dt*8){
    // drifting embers and ash
    const ash=Math.random()<0.35;
    parts.push({x:P.x+rnd(-320,320),y:P.y+rnd(-180,200),vx:rnd(-10,10),vy:rnd(-40,-10),life:rnd(1,2.5),max:2.5,
      c:ash?'#5d5059':pick(['#ff7a2b','#ffb347','#ff4f2b']),s:ash?1:rnd(1,2)});
  }
  // Animation timers run even when paused
  P.animT+=dt;P.atkAnim-=dt;P.hurtT-=dt;
  if(P.ghosts){for(const g of P.ghosts)g.life-=dt;P.ghosts=P.ghosts.filter(g=>g.life>0)}
  for(const c of corpses){c.animT+=dt;c.life-=dt}
  corpses=corpses.filter(c=>c.life>0);
  if(invOpen||engineOpen||perkOpen||dead||paused)return;

  let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  // isometric: a screen direction (mx,my) is the world direction (mx+2my, 2my-mx)
  if(mx||my){const wx=mx+2*my,wy=2*my-mx;mx=wx;my=wy}
  const ml=Math.hypot(mx,my)||1;
  const ux=mx/ml,uy=my/ml;
  const tvx=(mx||my)?ux*S.spd:0,tvy=(mx||my)?uy*S.spd:0;
  P.vx+=(tvx-P.vx)*Math.min(1,dt*10);
  P.vy+=(tvy-P.vy)*Math.min(1,dt*10);
  slide(P,P.vx*dt,P.vy*dt,10);
  // Aim: mouse position in LOGICAL pixels (the player is at the centre of the screen)
  // the knight's body sits a little above screen centre; turn the mouse offset back into a world direction
  {const dsx=mouse.x-LW/2,dsy=mouse.y-(LH/2+2);
   P.aim=Math.atan2(2*dsy-dsx,dsx+2*dsy);P.face=dsx<0?-1:1;}

  P.roll-=dt;P.inv-=dt;P.atk-=dt;P.sinceHit+=dt;
  if(keys[' ']&&P.roll<=0){
    let dx=ux,dy=uy;
    if(!mx&&!my){dx=Math.cos(P.aim);dy=Math.sin(P.aim)}
    P.dash={vx:dx*870,vy:dy*870,t:0.15};   // ~130px over 0.15s
    P.roll=S.rollCD;P.inv=0.3;SFX.play('roll');
    burst(P.x,P.y,'#5d5059',16);burst(P.x,P.y,'#ffb347',6);
    keys[' ']=false;
  }
  if(P.dash&&P.dash.t>0){
    slide(P,P.dash.vx*dt,P.dash.vy*dt,10);P.dash.t-=dt;
    P.ghosts.push({x:P.x,y:P.y,anim:P.anim,animT:P.animT,face:P.face,life:0.22,max:0.22});
  }
  P.comboT-=dt;if(P.comboT<=0)P.comboStep=0;
  if(P.lunge&&P.lunge.t>0){P.lunge.t-=dt;slide(P,Math.cos(P.lunge.a)*P.lunge.v*dt,Math.sin(P.lunge.a)*P.lunge.v*dt,10)}
  if(mouse.down&&P.atk<=0)swing();
  P.fireCD-=dt;updateFire(dt);P.spinCD-=dt;updateHeal(dt);

  // Choose the player's animation from the current state
  const moving=Math.hypot(P.vx,P.vy)>20;
  setAnim(P, dead?'death': P.hurtT>0?'hurt': P.atkAnim>0?(P.atkHeavy?'attack2':'attack'): moving?'walk':'idle');
  if(moving&&!(P.dash&&P.dash.t>0)){
    P.stepT-=dt;
    if(P.stepT<=0){P.stepT=0.26;SFX.play(level&&level.style==='wood'?'stepWood':'step');
      for(let i=0;i<3;i++)parts.push({x:P.x+rnd(-4,4),y:P.y+rnd(-2,2),vx:rnd(-22,22),vy:rnd(-22,22),life:0.45,max:0.45,c:pick(['#4a3f48','#5d5059','#3a313b']),s:rnd(1,2),ground:1})}
  }
  if(P.hp<P.maxHp*0.3){P.hbT-=dt;if(P.hbT<=0){P.hbT=0.85;SFX.play('heart')}}

  if(P.sinceHit>3)P.sh=Math.min(P.maxSh,P.sh+P.maxSh*0.2*dt);
  if(P.sinceHit>4)P.hp=Math.min(P.maxHp,P.hp+S.regen*dt);

  if(tileAt(P.x,P.y)===2){hurt(16*dt,true);SFX.play('sizzle')}

  if(tileAt(P.x,P.y)===3&&level&&level.safe){leaveShack();return}
  if(tileAt(P.x,P.y)===3){
    if(stairsLocked()){
      if(!P.warned){log(boss&&!boss.dead?`${boss.bossName} seals the stairs. Slay it!`:`The stairs are sealed until the blood vat is full (${Math.floor(vat/vatNeed*100)}%). Kill more.`,'#ff4f6e');P.warned=true}
    }else{
      descend();return;
    }
  }else P.warned=false;

  // reveal fog around the player
  const ptx=Math.floor(P.x/T),pty=Math.floor(P.y/T);
  for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){
    const x=ptx+dx,y=pty+dy;
    if(dx*dx+dy*dy<=64&&x>=0&&y>=0&&x<MW&&y<MH)seen[y][x]=1;
  }

  // Handcrafted level: announce each area as you reach it; big foes wake in their own area (wakeBig)
  if(level){
    for(const a of level.areas){
      if(a.done||Math.hypot(P.x-a.x,P.y-a.y)>T*2.4)continue;
      a.done=true;
      announce(level.areaNames[a.n].toUpperCase(),a.n===7?'#ff3a2a':'#d9a066',2.8,level.hints[a.n]||'');
      log(`${level.areaNames[a.n]}: ${level.hints[a.n]||''}`,'#d9a066');
      SFX.play('area');
      for(const e of enemies)if(isBig(e)&&!e.dead&&e.dormant&&e.wakeArea===a.n)wakeBig(e);
    }
    if(boss&&boss.dormant&&!boss.dead&&dist(boss,P)<200)wakeBig(boss);
  }

  // enemies
  for(const e of enemies){
    if(e.dead)continue;
    const Tt=ET[e.type];
    const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;
    const nx=dx/d,ny=dy/d;
    e.touch-=dt;e.flash-=dt;e.animT+=dt;
    let vx=0,vy=0;
    if((d<Tt.aggro||e.warden)&&!e.dormant){
      if(e.type==='archer'){
        if(d>170){vx=nx*e.spd;vy=ny*e.spd}
        else if(d<120){vx=-nx*e.spd;vy=-ny*e.spd}
        e.fire-=dt;
        if(e.fire<=0&&d<620){
          ebullets.push({x:e.x,y:e.y,vx:nx*190,vy:ny*190,life:3.5,dmg:(9+floor*2)*e.dmgMul,r:4,c:'#ffe6b0'});
          e.fire=Tt.shoot;e.shotAnim=0.3;if(d<420)SFX.play('arrow');
        }
      }else if(e.warden){
        [vx,vy]=wardenAI(e,d,nx,ny,dt);
      }else if(e.type==='hound'){
        [vx,vy]=houndAI(e,d,nx,ny,dt);
      }else if(e.type==='demon'){
        [vx,vy]=demonAI(e,d,nx,ny,dt);
      }else if(e.type==='eye'){
        [vx,vy]=oculusAI(e,d,nx,ny,dt);
      }else{
        vx=nx*e.spd;vy=ny*e.spd;
      }
    }else{
      if(e.act)e.act=null;
      e.wt-=dt;
      if(e.wt<=0){e.wt=rnd(1,3);e.wa=rnd(0,TAU)}
      vx=Math.cos(e.wa)*e.spd*.3;vy=Math.sin(e.wa)*e.spd*.3;
    }
    if(e.kbT>0){e.kbT-=dt;slide(e,e.kbx*dt,e.kby*dt,e.r*0.8);vx*=0.2;vy*=0.2}   // knocked back: barely steers
    slide(e,vx*dt,vy*dt,e.r*0.8);
    // Face the player when hunting, otherwise face the way it walks
    if(Math.abs(vx)>2||Math.abs(vy)>2){const sdx=dx-dy,svx=vx-vy;e.face=(d<Tt.aggro||e.warden)?(sdx<0?-1:1):(svx<0?-1:1)}
    e.shotAnim=(e.shotAnim||0)-dt;
    // Pick an animation from its state
    if(Tt.sprite){
      const mv=Math.hypot(vx,vy)>5;
      if(e.warden&&e.act==='rest')setAnim(e,'idle');
      else if(e.act==='wind')setAnim(e,e.type==='demon'?'attack':'idle');
      else if(e.act==='lunge'||(e.act==='rec'&&e.type==='demon'))setAnim(e,'attack');
      else setAnim(e, e.touch>0.5||e.shotAnim>0?'attack': e.flash>0.05?'hurt': mv?'walk':'idle');
    }
    if(tileAt(e.x,e.y)===2){
      e.hp-=14*dt;
      if(e.hp<=0){killEnemy(e);continue}
    }
    if(e.warden){
      const reach=bodyR(e)+PLAYER_BODY;if(d<reach&&!e.dormant)slide(P,nx*(reach-d),ny*(reach-d),10);
    }else if(d<bodyR(e)+PLAYER_BODY&&e.touch<=0){
      const mult=1+(floor-1)*0.15;
      hurt(Tt.dmg*mult*e.dmgMul*(e.act==='lunge'?1.3:1));   // a landed lunge bites harder
      e.touch=0.7;
      burst(e.x,e.y,'#ff4f2b',6);
    }
  }

  for(const b of bullets){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const e of enemies){
      if(b.left<=0)break;
      if(e.dead||b.hit.includes(e))continue;
      if(Math.hypot(e.x-b.x,e.y-b.y)<hurtR(e)+(b.r||4)){b.hit.push(e);b.left--;dealDamage(e,b.dmg)}
    }
    if(b.left<=0)b.life=0;
  }
  bullets=bullets.filter(b=>b.life>0);

  for(const b of ebullets){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(tileAt(b.x,b.y)===0){b.life=0;continue}
    if(Math.hypot(b.x-P.x,b.y-P.y)<b.r+PLAYER_BODY){hurt(b.dmg);b.life=0}
  }
  ebullets=ebullets.filter(b=>b.life>0);

  for(const s of swings)s.life-=dt;
  swings=swings.filter(s=>s.life>0);

  for(const g of ground){
    g.age+=dt;g.bob+=dt*3;
    if(g.r<filter)continue;
    const d=dist(g,P);
    if(d<S.mag){g.x+=(P.x-g.x)*Math.min(1,dt*10);g.y+=(P.y-g.y)*Math.min(1,dt*10)}
    if(d<18&&inv.length<60){
      inv.push(g);g.dead=true;g.got=++pickupSeq;SFX.play('pickup',{r:g.r});
      log(`Picked up ${g.name}`,colorOf(g));
      if(g.r>=4)announce(RAR[g.r].n.toUpperCase(),colorOf(g),1.4);
      if(invOpen)renderInv();
    }
  }
  ground=ground.filter(g=>!g.dead&&g.age<120);
  enemies=enemies.filter(e=>!e.dead);
  calc();
}

// a big foe wakes: its name is announced; a final boss also slams the arena gate shut
function wakeBig(e){
  const B=BIGS[e.big]||BIGS.warden;
  e.dormant=false;shake=Math.max(shake,0.6);SFX.play('roar');if(e.type==='eye')SFX.play('zap');
  announce(e.bossName.toUpperCase(),B.col,3,B.wake);
  if(e===boss){sealArena();log(`The gate slams shut. ${e.bossName} wakes.`,'#ff4f6e')}
  else log(`${e.bossName} wakes.`,B.col);
}
