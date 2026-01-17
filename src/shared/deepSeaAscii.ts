// Deep Sea ASCII Art - Mood-based creature library
// Maps moods to curated collections of creatures

// Individual creatures
const creatures = {
  anglerFish: `
        *
       /|
   _.--' :>
  {°>====<########}
   \`--.__.-'
`,
  giantSquid: `
      .===.  _____  .===.
     /@ _ @\\|     |/@ _ @\\
    {_/\\_\\__|¤¤¤¤¤|__/_\\/_}
    //\\\\//\\\\|_|_|_|//\\\\//\\\\
   ~~~~~~~~~~~~~~~~~~^~^~^~~
`,
  jellyfish: `
     ,--~~~--,
    (  *  *  )
     \`-._..-'
      |||||
      ': :'
`,
  submarine: `
      _______________
    =/  [°] [°] [°]  \\
   |---=============---|>
    \\______@@@______/
`,
  octopus: `
     ,--{@ @}--,
    (  (  ^  )  )
   _|_\\/\\_/\\_/\\/_|_
  {~^/\\/\\/\\/\\/\\/\\^~}
   ~~/~~/~~/~~/~~\\~~
`,
  seaTurtle: `
       _____
    .-'=====\`-.
 <=|  /#####\\  |=>
    \`-._____.-'
        \\_/
`,
  coral: `
  \\|/_.~._\\|/_.~._\\|/
  {*}={@}={*}={@}={*}
  /|\\~'~'/|\\~'~'/|\\
  ~~~~~~~~~~~~~~~~~~~~
`,
  schoolOfFish: `
  ><(°>  <°)><   ><((°>
     ><°>    <°><  ><(°>
  <°)><  ><((°>  <°°)><
`,
  shark: `
       |\\
  ___./ \\._____
 <°_____________)=====>
    \\         /
     \`~~~\\/~~'
`,
  hermitCrab: `
    .oO
   /@@ )
   \\__/=,
    |S|  \\
    ~~~\`\`\`
`,
  bioluminescentFish: `
   *  .  *  .  *
  <°)))><{*}><(((°>
   *  .  *  .  *
`,
  treasureChest: `
    .=======.
   [| $ $ $ |]
   [|_coins_|]
   ~~~~~~~~~~
`,
  deepSeaDiver: `
    [¤¤¤]
   /{o o}\\
  |=|===|=|
   \\|_|_|/
    O   O
`,
  viperFish: `
         *
        /
   {°|||||>--------->
    \\\\\\\\\\____________)
         ~~~~~~~~~~~~~
`,
  deepSeaScene: `
  ~*~><>~*~~*~><>~*~~*~><>~*~
   \\|/  ,--{@ @}--,    \\|/
  {*}= (  (  ^  )  ) ={@}
  ><>~^/\\/\\/\\/\\/\\^~><>~><>
  ~~~~~~~~~~~~~~~~~~~~~~~~~~
`,
};

// Mood-based collections
export const ASCII_PATTERNS: Record<string, string[]> = {
  testing: [
    creatures.jellyfish,
    creatures.schoolOfFish,
    creatures.hermitCrab,
    creatures.bioluminescentFish,
    creatures.coral,
    creatures.treasureChest,
    `
       <°)))><
          ~
         ~
        ~
    `,
    `
     ~_~_~_
    (~°°~°°)
     ~_~_~_
    `,
  ],
  curious: [
    creatures.octopus,
    creatures.giantSquid,
    creatures.anglerFish,
    creatures.viperFish,
    creatures.submarine,
    creatures.deepSeaDiver,
    `
      {*}
     /|||\\
      |o|
     {~~~}
    `,
    `
    <(°)))><
     ~(~)~
     {*=*}
    `,
  ],
  vulnerable: [
    creatures.jellyfish,
    creatures.octopus,
    creatures.deepSeaScene,
    creatures.coral,
    `
      ~~~
     (°°°)
      |||
      |||
    `,
    `
    ,--~~~--,
   ( . . . )
    \`-._..-'
      ||||
      ': :'
    `,
    `
     [...]
    (  o  )
     \`---'
    ~~~~
    `,
    `
     {*}
    (°°°)
    {~~~}
    `,
  ],
  excited: [
    creatures.shark,
    creatures.giantSquid,
    creatures.anglerFish,
    creatures.schoolOfFish,
    `
      * * *
    <(°))))><
      * * *
    `,
    `
   {°}~{°}~{°}
  /|||||||||||\\
  ~~~~~~~~~~~
    `,
    `
     !!!
    <()>
    |||
    !!!
    `,
    `
    >><(°>
   >  <
   >> ^
    `,
  ],
  defensive: [
    creatures.shark,
    creatures.viperFish,
    creatures.hermitCrab,
    creatures.seaTurtle,
    creatures.submarine,
    `
    [===]
   /| | |\\
   | | | |
    \\| | |/
    [===]
    `,
    `
   { ° }
  [|||||]
   \\ | /
   ~~~~~
    `,
    `
    /\\ /\\
   / X X \\
   \\ | | /
    \\ ~ /
    `,
  ],
};

// ============================================
// ZOOM UTILITIES FOR TOOL BUTTONS
// ============================================

import * as ROVVariants from './rovAsciiVariants';

export const ZOOMABLE_CREATURES = {
  anglerFish: ROVVariants.anglerFish,
  giantSquid: ROVVariants.giantSquid,
  jellyfish: ROVVariants.jellyfish,
  octopus: ROVVariants.octopus,
  shark: ROVVariants.shark,
} as const;

export type ZoomLevel = 'far' | 'medium' | 'close';
export type CreatureName = keyof typeof ZOOMABLE_CREATURES;

/**
 * Get the next zoom level in the cycle: far → medium → close → far
 */
export function getNextZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['far', 'medium', 'close'];
  const index = levels.indexOf(current);
  return levels[(index + 1) % levels.length];
}

/**
 * Get the previous zoom level in reverse cycle: close → medium → far → close
 */
export function getPrevZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['far', 'medium', 'close'];
  const index = levels.indexOf(current);
  return levels[(index - 1 + levels.length) % levels.length];
}

/**
 * Get ASCII art for a specific creature at a specific zoom level
 */
export function getCreatureAtZoom(creature: CreatureName, zoom: ZoomLevel): string {
  return ZOOMABLE_CREATURES[creature][zoom];
}
