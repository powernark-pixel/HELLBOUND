/* HELLBOUND · js/trials.js · Trials: optional challenges that grow your vessel
   (Files load in the order listed in index.html and share one global scope.)

   Every level has a few TRIALS: things worth trying for, beyond just reaching the stairs.
   Passing one earns a BLOOD SIGIL. In the shack, sigils reforge your blood vessel
   (shot glass -> flask -> chalice -> grand goblet; see VESSELS in js/blood.js).

   A trial listens for events. Other files call trialEvent('name', thing) when something
   happens (a flask is drunk, a boss dies, the vat fills...). Each trial's `on` table says what
   that event means for it: return 'pass' or 'fail', or nothing if it doesn't care.
   The list for the current level is shown in the pause menu and the top-right of the HUD. */

const VESSEL_SIGILS=[0,2,4,7];   // total sigils needed for each vessel (shot glass, flask, chalice, goblet)
const SWIFT_TIME=8*60;           // seconds for "Swift Descent"

const bossAlive=kind=>enemies.some(e=>e.big===kind&&!e.dead);
const TRIAL_BOOK={
  vat:{name:'Bleed the Altar',desc:'Fill the blood vat',
    on:{vatFull:()=>'pass'}},
  dry:{name:'Unflinching',desc:'Slay the Warden without drinking a flask',
    on:{flask:()=>bossAlive('warden')?'fail':null,bigDeath:e=>e.big==='warden'?'pass':null}},
  blind:{name:'Eye for an Eye',desc:'Blind the Oculus without being struck by a tentacle',
    on:{struck:()=>'fail',bigDeath:e=>e.big==='oculus'?'pass':null}},
  swift:{name:'Swift Descent',desc:`Reach the stairs within ${SWIFT_TIME/60} minutes`,
    on:{tick:t=>t>SWIFT_TIME?'fail':null,stairs:()=>'pass'}},
};
// which trials each level has (by its name); levels not listed get DEFAULT
const LEVEL_TRIALS={
  'The Blood Altar':['vat','dry','blind','swift'],
  DEFAULT:['vat','dry','swift'],
};

let trials=null;   // {list:[{id,state}], t} for the current level; null in the shack
function startTrials(){
  if(!level||level.safe){trials=null;return}
  const ids=LEVEL_TRIALS[level.name]||LEVEL_TRIALS.DEFAULT;
  trials={t:0,list:ids.map(id=>({id,state:'open'}))};
}
function trialEvent(ev,arg){
  if(!trials)return;
  for(const tr of trials.list){
    if(tr.state!=='open')continue;
    const f=TRIAL_BOOK[tr.id].on[ev];if(!f)continue;
    const r=f(arg);
    if(r==='pass')passTrial(tr);else if(r==='fail')failTrial(tr);
  }
}
function passTrial(tr){
  tr.state='pass';P.sigils=(P.sigils||0)+1;
  const B=TRIAL_BOOK[tr.id];
  SFX.play('toll');addText(P.x,P.y-40,'TRIAL PASSED',COL.gold,1.3);
  log(`Trial passed: ${B.name}. +1 blood sigil (${P.sigils}).`,COL.gold);
}
function failTrial(tr){
  tr.state='fail';
  log(`Trial failed: ${TRIAL_BOOK[tr.id].name}.`,COL.boneLo);
}
function updateTrials(dt){if(trials){trials.t+=dt;trialEvent('tick',trials.t)}}

// in the shack: enough sigils reforge the vessel, one or more steps
function reforgeVessel(){
  let grew=false;
  while((P.vessel||0)<VESSELS.length-1&&(P.sigils||0)>=VESSEL_SIGILS[(P.vessel||0)+1]){P.vessel=(P.vessel||0)+1;grew=true}
  if(grew)log(`Your blood sigils reforge your vessel: the ${VESSELS[P.vessel].name}.`,COL.bloodPale);
  return grew;
}
function nextVesselText(){
  const v=P.vessel||0;
  if(v>=VESSELS.length-1)return 'Your vessel is the Grand Goblet.';
  return `${P.sigils||0} / ${VESSEL_SIGILS[v+1]} sigils for the ${VESSELS[v+1].name}`;
}
// the list in the pause menu
function renderTrials(){
  const el=$('trialList');if(!el)return;
  if(!trials){el.innerHTML=`<div class="small muted">No trials in the shack.</div><div class="small trialNext">${nextVesselText()}</div>`;return}
  const mark={open:'◇',pass:'◆',fail:'✕'};
  el.innerHTML=trials.list.map(tr=>{const B=TRIAL_BOOK[tr.id];
    return `<div class="trial ${tr.state}"><span class="mk">${mark[tr.state]}</span><b>${B.name}</b><span>${B.desc}</span></div>`}).join('')+
    `<div class="small trialNext">${nextVesselText()}</div>`;
}
