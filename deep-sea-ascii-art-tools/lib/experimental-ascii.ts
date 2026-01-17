// Experimental Deep Sea ASCII Art Collection
// Showcasing: Unicode blocks, Dingbats, Hybrid density, Isometric, ANSI, Animation, Parallax

// ============================================
// UNICODE BLOCKS - Using ░▒▓█ for shading/depth
// ============================================

export const anglerBlockShaded = `
         ✦
        ░│
   ▄▓▒░' :>
  █▓▒░===<████████▓▒░
   ▀▓▒░.__.-'
`

export const jellyfishBlocks = `
     ▄▓████▓▄
    █░ ✦  ✦ ░█
     ▀▓▄▄▄▓▀
      ░▒║▒░
       ░║░
`

export const submarineBlocks = `
      ▄▓▓▓▓▓▓▓▓▓▓▓▓▄
    ▐█ ░█░ ░█░ ░█░ █▌
   ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▌▶
    ▀▓▓▓▓▓▓▓▓▓▓▓▓▓▀
`

export const whaleBlocks = `
        ▄▄▓▓▓▓▓▓▓▓▄▄
   ▄▓▓▓░░░░░░░░░░░░░▓▓▄▄▓▓▄
  █▓ ●                   ▓█▀▀
   ▀▓▓▄▄░░░░░░░░░░░░░▄▓▓▀
        ▀▀▓▓▓▓▓▓▓▀▀
`

// ============================================
// DINGBATS/SYMBOLS - Stars, shapes, misc
// ============================================

export const anglerDingbats = `
        ✧
       ╱│
   ◢◤◢' ◉>
  ◀●═══◆◆◆◆◆◆◆◆▶
   ◥◣◥.◣.◢'
`

export const jellyfishSymbols = `
     ╭─✦─╮
    ( ☆ ☆ )
     ╰─◆─╯
      ┊┊┊
      ⋮⋮⋮
`

export const schoolSymbols = `
  ▷◇◁  ◁◆▷   ▷◇◇◁
     ▷◆◁    ◁◇▷  ▷◆◁
  ◁◇▷  ▷◇◇◁  ◁◆◆▷
`

export const coralSymbols = `
  ✦│✧ ❋│✦ ✧│❋ ✦│✧
  ◆═◇═◆═◇═◆═◇═◆═◇
  ╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲
  ═══════════════
`

export const starfishSymbol = `
      ✦
    ◢◆◣
  ✦◆ ● ◆✦
    ◥◆◤
      ✦
`

// ============================================
// HYBRID DENSITY - Heavy █▓ mixed with light ·.
// ============================================

export const anglerHybrid = `
          ·
         ·│·
   ▄█▓·'  :>
  █▓░·===<████▓▒░·.
   ·▀█▓░.·.-'
`

export const octopusHybrid = `
     ·▄▓█ █▓▄·
    (  █ ◉ █  )
   ▓▒░·╲▓╱·░▒▓
  █·╱·╲·╱·╲·╱·█
   ·~··~··~··~·
`

export const deepseaHybrid = `
·  ✦  ·  .  ·  ✦  ·
  ▄▓▓▄     ▄▓▓▄
 █·◉·█ ░▒▓ █·◉·█
  ·▀▀·  ▓  ·▀▀·
· . · ░▒▓░ · . ·
`

export const abyssHybrid = `
░░░░░░░░░░░░░░░░░░░░
░░·  ✦  ·    ·  ✦ ░░
▓▓░░░░░░░░░░░░░░░░▓▓
████▓▓▓▒▒▒░░░▒▒▓████
████████████████████
`

// ============================================
// ISOMETRIC/3D - Box-drawing for perspective
// ============================================

export const chestIsometric = `
      ╱─────╲
     ╱ $ $ $ ╲
    ╱─────────╲
   │ │ coins │ │
   ╰───────────╯
`

export const submarineIsometric = `
        ╱═══════════╲
       ╱ ◎   ◎   ◎  ╲
      ├═══════════════┤▶
       ╲ ═══════════ ╱
        ╲═══════════╱
`

export const coralIsometric = `
     ╱╲    ╱╲    ╱╲
    ╱  ╲╱╲╱  ╲╱╲╱  ╲
   │ ◆  ││ ◇  ││ ◆  │
   ├────┴┴────┴┴────┤
   ╰════════════════╯
`

export const crateIsometric = `
     ╱────────╲
    ╱ ╱──────╲ ╲
   │ │ CARGO │ │
   │ │       │ │
   ╰─┴───────┴─╯
`

// ============================================
// ANSI ESCAPE SEQUENCES - Color codes embedded
// Usage: console.log(anglerANSI)
// ============================================

// Color codes: \x1b[36m = cyan, \x1b[33m = yellow, \x1b[0m = reset
// \x1b[1m = bold, \x1b[5m = blink

export const anglerANSI = `
        \x1b[1m\x1b[33m✦\x1b[0m
       \x1b[36m/|\x1b[0m
   \x1b[36m_.--' :>\x1b[0m
  \x1b[36m{°>====<\x1b[35m########\x1b[36m}\x1b[0m
   \x1b[36m\`--.__.-'\x1b[0m
`

export const jellyfishANSI = `
     \x1b[35m,--~~~--,\x1b[0m
    \x1b[35m(\x1b[0m  \x1b[36m✦\x1b[0m  \x1b[36m✦\x1b[0m  \x1b[35m)\x1b[0m
     \x1b[35m\`-._..-'\x1b[0m
      \x1b[34m|||||\x1b[0m
      \x1b[34m': :'\x1b[0m
`

export const bioluminescentANSI = `
   \x1b[33m*\x1b[0m  \x1b[36m.\x1b[0m  \x1b[33m*\x1b[0m  \x1b[36m.\x1b[0m  \x1b[33m*\x1b[0m
  \x1b[36m<°)))\x1b[0m\x1b[35m><\x1b[33m{✦}\x1b[35m><\x1b[36m(((°>\x1b[0m
   \x1b[33m*\x1b[0m  \x1b[36m.\x1b[0m  \x1b[33m*\x1b[0m  \x1b[36m.\x1b[0m  \x1b[33m*\x1b[0m
`

export const depthGradientANSI = `
\x1b[36m~~~~~~~~~~~~~~~~~~~~~\x1b[0m
\x1b[34m≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈\x1b[0m
\x1b[34m\x1b[2m▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒\x1b[0m
\x1b[30m\x1b[1m░░░░░░░░░░░░░░░░░░░░░\x1b[0m
\x1b[30m█████████████████████\x1b[0m
`

// ============================================
// ANIMATED/KINETIC - Frame arrays for animation
// Usage: setInterval(() => console.log(frames[i++ % frames.length]), 200)
// ============================================

export const jellyfishFrames = [
  `   ,-~~~-,
  (  * *  )
   \`-._.-'
    |||||
    ': :'`,
  `   .-----,
  (  * *  )
   \`-..-'
    \\|||/
     ':' `,
  `   ,-~~~-,
  (  * *  )
   \`-._.-'
    /|||\\
    .: :.`,
  `   '-----.
  (  * *  )
   \`-..-'
    |||||
    ': :'`,
]

export const fishSwimFrames = [
  `        ><>               `,
  `       ><>                `,
  `      ><>                 `,
  `     ><>                  `,
  `    ><>                   `,
  `   ><>                    `,
  `  ><>                     `,
  ` ><>                      `,
  `><>                       `,
]

export const anglerLureFrames = [
  `        ✦
       /|
   _.--' :>
  {°>====<###}
   \`--.__.-'`,
  `        ✧
       /|
   _.--' :>
  {°>====<###}
   \`--.__.-'`,
  `        *
       /|
   _.--' :>
  {°>====<###}
   \`--.__.-'`,
  `        ·
       /|
   _.--' :>
  {°>====<###}
   \`--.__.-'`,
]

export const bubbleRiseFrames = [
  `
     
     
  o
 O  o
O  O`,
  `
     
  o
 O  o
O  O
   O`,
  `
  o
 O  o
O  O
   O
`,
  `  o
 O  o
O  O
   O

`,
]

// ============================================
// PARALLAX LAYERS - Separate layers to composite
// Layer 0 = far background, higher = closer
// ============================================

export const parallaxLayers = {
  // Far background - slow scroll
  layer0_distant: `
  ·  ·     ·  ·     ·  ·
     ·  ·     ·  ·     · 
  ·     ·  ·     ·  ·   
`,
  // Mid background - medium scroll
  layer1_bubbles: `
       o         O
    O      o  
         o      o    O
`,
  // Near background - faster scroll
  layer2_seaweed: `
  |}   {|    |}   {|
  ||} {||   {||} {||
`,
  // Foreground - fastest scroll
  layer3_fish: `
      ><>        <><
  ><>      ><>       ><>
`,
  // Static overlay
  layer4_frame: `
╔════════════════════════╗
║                        ║
║                        ║
║                        ║
╚════════════════════════╝
`,
}

// Compositing helper - merge layers by replacing spaces
export function compositeLayers(layers: string[]): string {
  const lines: string[][] = layers.map((l) => l.split("\n").map((line) => [...line]))
  const maxHeight = Math.max(...lines.map((l) => l.length))
  const maxWidth = Math.max(...lines.flat().map((l) => l.length))

  const result: string[][] = Array(maxHeight)
    .fill(null)
    .map(() => Array(maxWidth).fill(" "))

  for (const layer of lines) {
    for (let y = 0; y < layer.length; y++) {
      for (let x = 0; x < layer[y].length; x++) {
        if (layer[y][x] !== " ") {
          result[y][x] = layer[y][x]
        }
      }
    }
  }

  return result.map((row) => row.join("")).join("\n")
}
