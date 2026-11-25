/* HELLBOUND · js/input.js · Keyboard and mouse
   (Files load in the order listed in index.html and share one global scope.) */

addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k===' '||k.startsWith('arrow'))e.preventDefault();
  if(scene==='title'){
    if($('controls').classList.contains('open')){if(k==='escape'||k==='enter'||k===' ')closeControls();return}
    if(k==='arrowup'||k==='w')selectMenu(menuSel-1);
    if(k==='arrowdown'||k==='s')selectMenu(menuSel+1);
    if(k==='enter'||k===' '){e.preventDefault();document.querySelectorAll('#menu .gbtn')[menuSel].click()}
    return;
  }
  keys[k]=true;
  if(k==='escape'){
    if($('controls').classList.contains('open'))closeControls();
    else if(perkOpen)return;   // a perk must be chosen
    else if(engineOpen)closeEngine();
    else if(invOpen)toggleInv(false);
    else togglePause();
    return;
  }
  if(paused||perkOpen)return;
  if(engineOpen){if(k==='e')closeEngine();return}
  if(k==='i')toggleInv();
  if(k==='o')spawnOculus();   // test tool while the Oculus art is rough
  if(k==='h'){showHitboxes=!showHitboxes;log(showHitboxes?'Hitboxes shown (H)':'Hitboxes hidden','#c9a99a')}
  // Skills: Q Fire Line, E Cleave, R Blood Flask (1, 2, 3 also work).
  // In the shack there's nothing to fight, so E is "use": the stash, the bed, the reward chest.
  if(k==='e'&&!invOpen&&!dead){if(level&&level.safe)openChest();else castSpin()}
  if(k==='q'||k==='1')castFireLine();
  if(k==='3')castSpin();
  if((k==='r'&&!dead)||k==='2')drinkFlask();
  if(k==='f'){filter=(filter+1)%FILTERS.length;log(`Loot filter: ${FILTERS[filter]}`,'#ffb347');renderInv()}
  if(dead&&(k==='r'||k===' '||k==='enter'))tryRise();   // R is the flask while alive, "rise again" once dead
  if(k==='m'){const on=SFX.toggle();log(on?'Sound on':'Sound muted (M)','#c9a99a');soundLabel()}
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.down=false});
// Convert screen mouse position to logical (640x360) pixels, so aim matches the scaled canvas
addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)/SCALE;mouse.y=(e.clientY-r.top)/SCALE});
// Only clicks on the game itself swing the blade (not clicks on menus or panels)
addEventListener('mousedown',e=>{if(e.button===0&&scene==='game'&&dead&&e.target===cv){tryRise();return}if(e.button===0&&scene==='game'&&!anyPanelOpen()&&e.target===cv)mouse.down=true;if(e.button===2&&e.target===cv)castFireLine()});
addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false});
addEventListener('contextmenu',e=>e.preventDefault());
