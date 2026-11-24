/* HELLBOUND · js/combat.js · Combat: dealing and taking damage, kills, the sword swing
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   8. COMBAT
   ===================================================================== */
/* ----- HITBOXES -----
   Every fighter has circles on the ground (press H in game to see them):
   - BODY (red): how close something must be to touch you. Contact damage and orbs use it.
     Bodies are smaller than the sprites, so a near miss really is a miss.
   - HURT (yellow): how big an enemy is as a target for YOUR attacks. A bit bigger than the
     body, so a swing that visibly reaches an enemy lands.
   The knight's own body is PLAYER_BODY (cyan). */
const PLAYER_BODY=8;
const bodyR=e=>e.boss?24:e.r*0.75;
const hurtR=e=>e.boss?32:e.r+3;
let showHitboxes=false;
function drawHitboxes(proj){
  if(!showHitboxes)return;
  const ring=(x,y,r,c)=>{ctx.globalAlpha=0.9;polyFill(proj,ringPts(x,y,r,28),null,c)};
  ring(P.x,P.y,PLAYER_BODY,'#4fe0ff');
  // sword reach: the arc your next swing covers
  const half=S.arcDeg*Math.PI/360,pts=[[P.x,P.y]];
  for(let i=0;i<=16;i++){const a=P.aim-half+i/16*half*2;pts.push([P.x+Math.cos(a)*S.range,P.y+Math.sin(a)*S.range])}
  ctx.globalAlpha=0.6;polyFill(proj,pts,null,'#ffe14f');
  for(const e of enemies){if(e.dead)continue;ring(e.x,e.y,bodyR(e),'#ff4040');ring(e.x,e.y,hurtR(e),'#ffe14f')}
  ctx.globalAlpha=1;
}

function dealDamage(e,base){
  if(e.dead)return;
  let dmg=base,crit=false;
  if(e.boss&&e.act==='rest')dmg*=1.3;   // the Warden's opening
  if(Math.random()*100<S.critC){dmg*=S.critM/100;crit=true}
  e.hp-=dmg;e.flash=0.08;
  hitStop=Math.max(hitStop,crit?0.06:0.03);shake=Math.max(shake,crit?0.22:0.1);
  if(!e.boss){
    // knockback away from the knight (heavy demons barely move)
    const a=Math.atan2(e.y-P.y,e.x-P.x),k=(e.type==='demon'?110:260)*(crit?1.4:1);
    e.kbx=Math.cos(a)*k;e.kby=Math.sin(a)*k;e.kbT=0.12;
  }
  for(let i=0;i<(crit?10:5);i++){const a=rnd(0,TAU),sp=rnd(80,240);
    parts.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.1,.25),max:.25,c:pick(['#fff1c2','#ffd27a','#ffffff']),s:1})}
  impacts.push({x:e.x,y:e.y,life:0.08,max:0.08,crit});
  addText(e.x,e.y-e.r-6,Math.round(dmg),crit?'#ffe14f':'#ffffff',crit?1.5:1);
  SFX.play(crit?'crit':'hit');
  if(S.leech)P.hp=Math.min(P.maxHp,P.hp+dmg*S.leech/100);
  if(hasTrait('siphon'))P.sh=Math.min(P.maxSh,P.sh+dmg*0.15);
  burst(e.x,e.y,'#8f1a1f',3);
  bloodFx(e.x,e.y-e.r*0.3,'hit',e.x<P.x);
  if(e.hp<=0)killEnemy(e);
}
function killEnemy(e){
  if(e.dead)return;
  e.dead=true;
  const Tt=ET[e.type];
  // Sprite enemies leave a death animation and a blood stain behind
  corpses.push({key:spriteKey(e),x:e.x,y:e.y,animT:0,life:0.9,flip:e.face<0});
  pourBlood(e);flaskKill();
  hitStop=Math.max(hitStop,e.boss?0.3:0.05);shake=Math.max(shake,e.boss?1:0.18);
  decals.push({x:e.x+rnd(-4,4),y:e.y+rnd(2,8),cell:ri(2,5)});
  if(decals.length>160)decals.shift();
  stardust+=ri(1,3);
  burst(e.x,e.y,'#8f1a1f',8);
  bloodFx(e.x,e.y,e.boss?'big':e.r<9?'hit':'kill',e.x<P.x);   // small foes get a small spray
  SFX.play(e.boss?'bigkill':'kill');
  if(hasTrait('inferno')){
    burst(e.x,e.y,'#ff7a2b',24);
    for(const o of enemies){
      if(o!==e&&!o.dead&&dist(o,e)<100)dealDamage(o,S.damage*0.6);
    }
  }
  if(e.boss){
    burst(e.x,e.y,'#ff2b6b',40);
    bloodFx(e.x-14,e.y,'big',true);bloodFx(e.x+14,e.y,'big',false);bloodFx(e.x,e.y-10,'kill',Math.random()<.5);
    shake=1;
    for(let k=0;k<3;k++)dropItem(e.x,e.y,3,floor+3);
    if(vatFull()){announce('THE WARDEN FALLS','#ffe14f',2.5,'The stairs are unsealed. Follow the light');log('The stairs are unsealed. Follow the golden light.','#ffe14f')}
    else{announce('THE WARDEN FALLS','#ffe14f',2.8,'Fill the blood vat to open the stairs');log(`The Warden is dead, but the vat is only ${Math.floor(vat/vatNeed*100)}% full. Kill more.`,'#c4302c')}
  }else if(Math.random()<Tt.drop*1.3){
    dropItem(e.x,e.y,e.type==='demon'?2:0,floor+ri(0,3));
  }
}
const ENEMY_DMG=0.75;   // all enemy damage is scaled by this (lower = easier)
function hurt(d,noIF){
  if(dead)return;
  if(!noIF&&P.inv>0)return;
  if(!noIF){d*=ENEMY_DMG;P.inv=0.35}   // a moment of grace after each hit, so a pack can't shred you in one go
  P.sinceHit=0;
  P.hurtT=0.3;                 // triggers the player's hurt animation
  let rem=d;
  if(P.sh>0){const a=Math.min(P.sh,rem);P.sh-=a;rem-=a}
  P.hp-=rem;shake=Math.max(shake,0.25);
  addText(P.x,P.y-24,'-'+Math.round(d),'#ff4f6e',1);
  if(!noIF)SFX.play('hurt');
  if(d>=4)bloodFx(P.x,P.y-6,'hit',Math.random()<.5);
  if(P.hp<=0){
    P.hp=0;dead=true;setAnim(P,'death');SFX.play('death');
    announce('THE KNIGHT FALLS','#c4302c',99,'Press R to rise again · Esc for the menu');
    log('Press R to begin again','#ff4f6e');
  }
}

function swing(){
  P.atk=1/S.atkRate;P.swings++;
  P.atkAnim=0.25;              // triggers the player's attack animation
  SFX.play('swing');
  setAnim(P,'attack');P.animT=0;
  const oath=hasTrait('oath')&&P.swings%5===0;
  swings.push({x:P.x,y:P.y,a:P.aim,life:.18,r:S.range,arc:S.arcDeg*Math.PI/180,oath});
  const half=S.arcDeg*Math.PI/360;
  for(const e of enemies){
    if(e.dead)continue;
    const d=dist(e,P);
    const hr=hurtR(e);
    if(d>S.range+hr)continue;
    if(d<hr+PLAYER_BODY){dealDamage(e,S.damage);continue}   // right on top of you: always hit
    let da=Math.atan2(e.y-P.y,e.x-P.x)-P.aim;
    da=Math.atan2(Math.sin(da),Math.cos(da));
    if(Math.abs(da)<=half+Math.asin(Math.min(1,hr/Math.max(d,1))))dealDamage(e,S.damage);
  }
  if(oath){
    for(let k=0;k<12;k++){
      const a=k/12*TAU;
      bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,life:.8,dmg:S.damage*0.6,left:1,hit:[],c:'#ff7a2b'});
    }
    burst(P.x,P.y,'#ff7a2b',20);
  }
}
