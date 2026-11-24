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

function dealDamage(e,base,opt={}){
  if(e.dead)return;
  let dmg=base,crit=false;
  if(e.boss&&e.act==='rest')dmg*=1.3;   // the Warden's opening
  if(Math.random()*100<S.critC){dmg*=S.critM/100;crit=true}
  e.hp-=dmg;e.flash=0.08;
  hitStop=Math.max(hitStop,crit?0.06:0.03);shake=Math.max(shake,crit?0.22:0.1);
  if(!e.boss){
    // knockback away from the knight (heavy demons barely move)
    const a=Math.atan2(e.y-P.y,e.x-P.x),k=(e.type==='demon'?110:260)*(crit?1.4:1)*(opt.kb||1);
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
  if(hasPerk('bloodthirst'))P.hp=Math.min(P.maxHp,P.hp+P.maxHp*0.03);
  burst(e.x,e.y,'#8f1a1f',8);
  bloodFx(e.x,e.y,e.boss?'big':e.r<9?'hit':'kill',e.x<P.x);   // small foes get a small spray
  SFX.play(e.boss?'bigkill':'kill');
  if(hasTrait('inferno')){
    burst(e.x,e.y,'#ff7a2b',24);
    for(const o of enemies){
      if(o!==e&&!o.dead&&dist(o,e)<100)dealDamage(o,S.damage*0.6);
    }
  }
  if(e.miniboss){
    burst(e.x,e.y,'#9ef0ff',30);bloodFx(e.x,e.y,'big',e.x<P.x);shake=0.8;
    for(let i=0;i<4;i++)oculusImpact(e,e.x+rnd(-30,30),e.y+rnd(-30,30),true);   // it bursts in a shower of sparks
    for(let k=0;k<2;k++)dropItem(e.x,e.y,2,floor+3);
    stardust+=25;
    announce(`${e.bossName.toUpperCase()} IS BLIND`,'#9ef0ff',2.6,'+25 stardust');
  }
  if(e.boss){
    burst(e.x,e.y,'#ff2b6b',40);
    bloodFx(e.x-14,e.y,'big',true);bloodFx(e.x+14,e.y,'big',false);bloodFx(e.x,e.y-10,'kill',Math.random()<.5);
    shake=1;openArena();
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
  if(!noIF){d*=ENEMY_DMG*(hasPerk('ironhide')?0.88:1);P.inv=0.35}   // a moment of grace after each hit, so a pack can't shred you in one go
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

/* ----- THE SWORD: a two-hit combo -----
   Hit 1 is a quick slash. Attack again within COMBO_WINDOW and you get hit 2: a heavy
   overhead chop with a step forward, a wider and longer arc, 1.6x damage and a big shove.
   After the finisher there's a short recovery, then the combo starts over.
   Holding the mouse button chains them automatically: slash, CHOP, slash, CHOP... */
const COMBO_WINDOW=0.6;
const COMBO=[
  {anim:'attack', anim_t:0.25,dmg:1,  arc:1,   reach:0, kb:1,  lunge:70, cd:0.8, trail:.18,grunt:'grunt',     whoosh:'swing'},
  {anim:'attack2',anim_t:0.38,dmg:1.6,arc:1.25,reach:12,kb:1.7,lunge:190,cd:1.5,trail:.26,grunt:'gruntHeavy',whoosh:'swingHeavy'},
];
function swing(){
  const step=P.comboStep===1&&P.comboT>0?1:0,c=COMBO[step];
  P.comboStep=step===0?1:0;P.comboT=step===0?COMBO_WINDOW+1/S.atkRate:0;
  P.atk=c.cd/S.atkRate;P.swings++;
  P.atkAnim=c.anim_t;P.atkHeavy=step===1;setAnim(P,c.anim);P.animT=0;
  P.lunge={a:P.aim,v:c.lunge,t:0.09};   // a small step into the swing
  SFX.play(c.whoosh);SFX.play(c.grunt);
  const oath=hasTrait('oath')&&P.swings%5===0;
  const R=S.range+c.reach,arc=S.arcDeg*c.arc;
  // the finisher sweeps the other way, so the two hits read as one flowing combo
  swings.push({x:P.x,y:P.y,a:P.aim,life:c.trail,max:c.trail,r:R,arc:arc*Math.PI/180,oath,dir:step?-1:1,heavy:step===1});
  const half=arc*Math.PI/360;
  let landed=false;
  for(const e of enemies){
    if(e.dead)continue;
    const d=dist(e,P),hr=hurtR(e);
    if(d>R+hr)continue;
    let da=Math.atan2(e.y-P.y,e.x-P.x)-P.aim;
    da=Math.atan2(Math.sin(da),Math.cos(da));
    // anything right on top of you is always hit
    if(d<hr+PLAYER_BODY||Math.abs(da)<=half+Math.asin(Math.min(1,hr/Math.max(d,1)))){dealDamage(e,S.damage*c.dmg*(step===1&&hasPerk('executioner')?1.4:1),{kb:c.kb});landed=true}
  }
  if(step===1){
    // the chop hits the floor: dust, a crack, a thud
    const fx=P.x+Math.cos(P.aim)*R*0.6,fy=P.y+Math.sin(P.aim)*R*0.6;
    for(let i=0;i<14;i++){const a=rnd(0,TAU),sp=rnd(40,120);parts.push({x:fx,y:fy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(.25,.45),max:.45,c:pick(['#5d5059','#4a3f48','#8a7a80']),s:rnd(1,2),ground:1})}
    decals.push({x:fx,y:fy,scorch:1});if(decals.length>200)decals.shift();
    shake=Math.max(shake,landed?0.4:0.25);if(landed)hitStop=Math.max(hitStop,0.07);
  }
  if(oath){
    for(let k=0;k<12;k++){
      const a=k/12*TAU;
      bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,life:.8,dmg:S.damage*0.6,left:1,hit:[],c:'#ff7a2b'});
    }
    burst(P.x,P.y,'#ff7a2b',20);
  }
}
