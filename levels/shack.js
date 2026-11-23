/* THE SHACK: the knight's first hideout, visited at the start of every run and after every level.
   No enemies, no hazards. Rest, sort loot, use the stash, then take the trapdoor down.
   Edit the map by hand: one character = one 32px tile.

   #  timber wall          w  timber wall with a window
   .  plank floor          S  where you arrive       X  trapdoor down to the next level
   F  stone hearth (2x2 tiles; put F at its top-left)
   E  bed (rest)           Z  stash chest            Q  rug        c  candles */
window.LEVEL_SHACK={
  name:'The Shack',
  safe:true,
  style:'wood',
  map:[
    "################",
    "##w####w####w###",
    "#.F........c..E#",
    "#..............#",
    "#......S.......#",
    "#......Q.......#",
    "#.............Z#",
    "#..............#",
    "#.......X......#",
    "################",
  ]
};
