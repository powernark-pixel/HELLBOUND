/* HELLBOUND · js/data.js · Game data: item bases, affixes, traits, enemy types
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   2. GAME DATA: loot, affixes, enemies, passive tree
   ===================================================================== */
const RAR=[
 {n:'Common',c:'#cfc6b8',aff:[0,1],m:1,w:60},
 {n:'Magic',c:'#4fa3ff',aff:[1,2],m:1.1,w:25},
 {n:'Rare',c:'#ffe14f',aff:[3,4],m:1.25,w:10},
 {n:'Epic',c:'#b46bff',aff:[4,5],m:1.4,w:3.5},
 {n:'Legendary',c:'#ff8a2b',aff:[6,7],m:1.6,w:1.2},
 {n:'MYTHIC',c:'#ff3ec8',aff:[7,8],m:2,w:0.3}
];
const AFF=[
 {k:'dmg',t:'Damage +{v}%',min:10,max:45},
 {k:'rate',t:'Swing Speed +{v}%',min:8,max:35},
 {k:'crit',t:'Crit Chance +{v}%',min:3,max:18},
 {k:'critd',t:'Crit Damage +{v}%',min:20,max:120},
 {k:'hp',t:'Max Hull +{v}',min:15,max:160,int:1},
 {k:'ward',t:'Ward +{v}',min:15,max:220,int:1},
 {k:'speed',t:'Stride +{v}%',min:5,max:35},
 {k:'regen',t:'Hull Regen +{v}/s',min:1,max:12,int:1},
 {k:'leech',t:'Leech {v}% of damage',min:1,max:8},
 {k:'arc',t:'Sweep Arc +{v}°',min:10,max:60,int:1},
 {k:'reach',t:'Reach +{v}',min:6,max:30,int:1},
 {k:'magnet',t:'Pickup Radius +{v}',min:30,max:220,int:1},
 {k:'warp',t:'Roll Cooldown -{v}%',min:5,max:40,int:1}
];
const TR={
 inferno:'INFERNO BURST: slain foes explode for 60% damage',
 oath:'BLOOD OATH: every 5th swing unleashes 12 fire bolts',
 siphon:'SOUL SIPHON: 15% of damage dealt restores ward'
};
const TKEYS=Object.keys(TR);
// Unique traits: only on special items, never rolled at random
TR.pyre='PYRE: Fire Line reaches twice as far, hits twice as hard and leaves burning ground';
const BASES={
 blade:['Hellforged Greatsword','Cinder Falchion','Brimstone Cleaver','Damnation Glaive','Wrathbound Claymore'],
 plate:['Ashen Cuirass','Obsidian Plate','Bone-Ribbed Mail',"Sinner's Hauberk"],
 greaves:['Ember Greaves','Cindersole Boots','Hellstrider Sabatons','Sulfur Treads'],
 sigil:['Heart of Embers','Sigil of Malphas','Blackened Relic','Pit-Iron Charm'],
 helm:['Horned Greathelm','Skull of Asmodeus','Cindercrown','Visor of the Damned'],
 gloves:['Gauntlets of Ash','Hellgrip Mitts','Emberclaw Gloves','Bone-Knuckle Fists'],
 boots:['Greaves of the Fallen','Sulfur-Stepped Boots','Wraithstep Sabatons','Ashwalker Greaves'],
 ring:['Ring of Brimstone','Band of the Pit','Signet of Lucifuge','Ember Loop']
};
// SLOTS order also sets the item icon order in item_icons.png
const SLOTS=['helm','blade','plate','gloves','greaves','boots','ring','sigil'];
const SLOTNAME={helm:'Helm',blade:'Weapon',plate:'Chest',gloves:'Gloves',greaves:'Legs',boots:'Boots',ring:'Ring',sigil:'Amulet'};
// Inventory groups for the filter tabs
const SLOTGROUP={blade:'weapon',helm:'armour',plate:'armour',gloves:'armour',greaves:'armour',boots:'armour',ring:'jewel',sigil:'jewel'};
const BVBASE={helm:14,blade:8,plate:40,gloves:6,greaves:12,boots:7,ring:10,sigil:20};
const BVGROW={helm:2.5,blade:2,plate:8,gloves:1.2,greaves:3,boots:1.4,ring:1.8,sigil:5};
const MPRE=['Infernal','Damned','Abyssal','Hellforged','Brimstone-Cursed','Soul-Forged','Eternal'];
const MSUF=[' of the Burning Choir',' of the Last Circle',' from the Pit of Dis',' of Undying Embers',' that Sang in Hell'];
const FILTERS=['All loot','Magic+','Rare+','Epic+','Legendary+','MYTHIC only'];
const CIRCLES=['Limbo','Lust','Gluttony','Greed','Wrath','Heresy','Violence','Fraud','Treachery'];
// ET: enemy types. Every type now has a PNG sprite sheet (sprite:true); shapes are only a fallback.
const ET={
 imp:{r:10,hp:20,spd:90,xp:4,drop:.15,c:'#ff9a3c',shape:'circle',dmg:6,aggro:330,sprite:true},
 hound:{r:13,hp:40,spd:125,xp:8,drop:.3,c:'#ff3e3e',shape:'diamond',dmg:9,aggro:400,sprite:true},
 archer:{r:13,hp:34,spd:50,xp:9,drop:.4,c:'#e8e0d0',shape:'hex',dmg:5,aggro:460,shoot:2,sprite:true},
 demon:{r:22,hp:170,spd:55,xp:25,drop:.9,c:'#9b3cff',shape:'hex',dmg:14,aggro:380,sprite:true},
 rat:{r:7,hp:10,spd:150,xp:2,drop:.05,c:'#6a5a70',shape:'circle',dmg:3,aggro:300,sprite:true}
};
const spriteKey=e=>e.boss?'warden':e.type;
