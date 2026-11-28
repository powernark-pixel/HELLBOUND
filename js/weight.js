/* HELLBOUND · js/weight.js · Weight: stamina, committed swings, staggers and murk
   (Files load in the order listed in index.html and share one global scope.)

   A first step towards the slow, heavy feel of Exanima (without its physics):
   - STAMINA: swings and rolls cost stamina. It comes back when you stop for a moment.
     Spend it all and you're WINDED: you can still act, but you move slowly until it refills.
   - COMMITTED SWINGS: a swing has a short wind-up before it lands, and you can barely move
     while swinging, so each one is a decision.
   - WHIFF: a heavy chop that hits nothing leaves you staggered for a moment.
   - STAGGER: a heavy chop that lands stuns ordinary foes briefly (not bosses).
   - MURK: levels are darker and your light is smaller (used by render.js).
   All the numbers to tune are here. */

const STAM_MAX=100;          // full stamina
const STAM_REGEN=34;         // stamina per second once you've stopped spending
const STAM_DELAY=0.55;       // seconds after spending before it starts coming back
const STAM_FLOOR=-30;        // how far into "winded" you can go
const WINDED_SLOW=0.55;      // x stride while winded (stamina below 0)
const SWING_COST=[20,32];    // stamina for the slash, then the heavy chop
const ROLL_COST=26;          // stamina for a roll
const WINDUP=[0.07,0.16];    // seconds from starting a swing to it landing (slash, chop)
const SWING_SLOW=0.35;       // x stride while a swing is happening
const WHIFF_STAGGER=0.35;    // seconds you stagger after a chop that hits nothing
const STAGGER_TIME=0.5;      // seconds a heavy chop stuns an ordinary foe
const MURK_DARK=0.95;        // darkness of levels (0 none, 1 black; it was 0.9)
const MURK_LIGHT=160;        // the knight's own light radius (it was 200)

// spend stamina for an action; false if you're too spent to start it
function spendStam(n){
  if(P.stam<=0){stamFlash=0.4;return false}   // too spent: nothing happens (and regen isn't held back)
  P.stam=Math.max(STAM_FLOOR,P.stam-n);P.stamT=STAM_DELAY;
  if(P.stam<=0){SFX.play('gruntHeavy');addText(P.x,P.y-30,'WINDED',COL.boneLo,1)}
  return true;
}
let stamFlash=0,stamShown=STAM_MAX;
function updateWeight(dt){
  P.stamT-=dt;if(P.stamT<=0)P.stam=Math.min(STAM_MAX,P.stam+STAM_REGEN*dt*(P.stam<0?0.7:1));
  P.stagger=Math.max(0,(P.stagger||0)-dt);
  stamFlash=Math.max(0,stamFlash-dt);
  stamShown+=(P.stam-stamShown)*Math.min(1,dt*12);
  // a swing lands when its wind-up is over
  if(P.pend){P.pend.t-=dt;if(P.pend.t<=0){const p=P.pend;P.pend=null;strikeSwing(p)}}
}
// how fast the knight can move right now (x normal stride)
function moveMul(){
  return (P.pend||P.atkAnim>0?SWING_SLOW:1)*(P.stam<=0?WINDED_SLOW:1)*(P.stagger>0?0.3:1);
}
// a heavy chop stuns ordinary foes
function staggerFoe(e){
  if(isBig(e)||e.dead)return;
  e.stun=STAGGER_TIME;e.act=null;
}
// the stamina bar: a thin bar under the knight, shown only while it isn't full
function drawStamina(x,y){
  if(stamShown>=STAM_MAX-0.5&&!stamFlash)return;
  const w=24,bx=Math.round(x-w/2),by=Math.round(y+6),k=Math.max(0,stamShown)/STAM_MAX;
  ctx.globalAlpha=0.85;
  ctx.fillStyle=COL.ink;ctx.fillRect(bx-1,by-1,w+2,4);
  ctx.fillStyle='#2a2418';ctx.fillRect(bx,by,w,2);
  ctx.fillStyle=P.stam<=0?(Math.sin(time*16)>0||!stamFlash?COL.danger:COL.bone):COL.goldWarm;ctx.fillRect(bx,by,Math.round(w*k),2);
  ctx.fillStyle=COL.fireHi;if(P.stam>0)ctx.fillRect(bx,by,Math.round(w*k),1);
  ctx.globalAlpha=1;
}
