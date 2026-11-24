/* HELLBOUND · js/perks.js · Perks: run-long bonuses picked from the reward chest
   (Files load in the order listed in index.html and share one global scope.)

   After a level listed in PERK_LEVELS, the shack's reward chest also offers a choice of
   three perks. You keep the one you pick for the rest of the run (P.perks).
   Each perk's effect lives where it matters; search the code for hasPerk('name'). */

const PERK_LEVELS=[1];   // which completed levels give a perk choice (add more later: [1,2,3])
const PERKS={
  bloodthirst:{name:'Bloodthirst', icon:'♥', desc:'Every kill heals 3% of your max health'},
  deepflask:  {name:'Deep Flask',  icon:'⚱', desc:'Carry 4 Blood Flasks instead of 3'},
  executioner:{name:'Executioner', icon:'⚔', desc:'Your heavy chop (the second hit) deals 40% more damage'},
  shadowstep: {name:'Shadow Step', icon:'»', desc:'Roll 35% more often'},
  emberheart: {name:'Ember Heart', icon:'✹', desc:'Fire Line recharges 30% faster'},
  ironhide:   {name:'Iron Hide',   icon:'◈', desc:'Take 12% less damage from everything'},
  whirlwind:  {name:'Whirlwind',   icon:'↻', desc:'Cleave recharges 2s faster and reaches 20% further'},
};
const hasPerk=k=>!!(P&&P.perks&&P.perks.includes(k));
// numbers that perks change, in one place
const flaskMax=()=>FLASK_MAX+(hasPerk('deepflask')?1:0);
const spinCdMax=()=>SPIN_CD-(hasPerk('whirlwind')?2:0);

let perkOpen=false,perkChoices=[];
function offerPerks(){
  const left=Object.keys(PERKS).filter(k=>!P.perks.includes(k));
  if(!left.length)return false;
  perkChoices=[];
  while(perkChoices.length<3&&left.length)perkChoices.push(left.splice(ri(0,left.length-1),1)[0]);
  $('perkCards').innerHTML=perkChoices.map(k=>{const p=PERKS[k];
    return `<button class="perkCard" data-perk="${k}"><span class="pi">${p.icon}</span><span class="pn">${p.name}</span><span class="pd">${p.desc}</span></button>`}).join('');
  perkOpen=true;mouse.down=false;setOverlay('perks',true);SFX.play('levelup');
  return true;
}
function choosePerk(k){
  if(!perkOpen||!PERKS[k])return;
  P.perks.push(k);perkOpen=false;setOverlay('perks',false);
  calc();if(hasPerk('deepflask'))P.flasks=flaskMax();
  SFX.play('equip');announce(PERKS[k].name.toUpperCase(),'#ff8ad8',3,PERKS[k].desc);
  log(`Perk: ${PERKS[k].name}. ${PERKS[k].desc}.`,'#ff8ad8');
}
$('perkCards').onclick=e=>{const b=e.target.closest('[data-perk]');if(b)choosePerk(b.dataset.perk)};
