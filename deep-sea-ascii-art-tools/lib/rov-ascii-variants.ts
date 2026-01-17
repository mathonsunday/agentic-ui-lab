// ROV ASCII Art Variants - Zoom Levels, Tool States, and Instrument Views

// ============================================
// CREATURE ZOOM LEVELS
// ============================================

export const anglerFish = {
  far: `
        .  *  .
      ~  ><>  ~
        .  *  .
`,
  medium: `
        *
       /|
   _.--' :>
  {°>====<###}
   \`--.__.-'
`,
  close: `
            *  )
           /| /
       _.-' :/
      /  °   :>
     {  >====<##########}
      \\_  __.-'
        \`'
         \\~~~
`,
}

export const giantSquid = {
  far: `
     ~><~
    ~~||~~
`,
  medium: `
      .===.  _____  .===.
     /@ _ @\\|     |/@ _ @\\
    {_/\\_\\__|¤¤¤¤¤|__/_\\/_}
    //\\\\//\\\\|_|_|_|//\\\\//\\\\
`,
  close: `
            .=======.
          .'  _   _  '.
         / .-' '-' '-. \\
        |  |  @ _ @  |  |
        |  | /     \\ |  |
       {   \\|  ¤¤¤  |/   }
       {____\\_______/____}
       //\\\\//\\ | | | /\\\\//\\\\
      // // // | | | \\\\ \\\\ \\\\
     ~~ ~~ ~~  ~ ~ ~  ~~ ~~ ~~
`,
}

export const jellyfish = {
  far: `
      ( )
       |
`,
  medium: `
     ,--~~~--,
    (  *  *  )
     \`-._..-'
      |||||
      ': :'
`,
  close: `
        ,--~~~~~--,
      .'   * * *   '.
     (    * * * *    )
      '.  * * * *  .'
        \`-._____.-'
         | | | | |
         | | | | |
         ': : : :'
          ' ' ' '
`,
}

export const octopus = {
  far: `
     {~}
    /|||\\
`,
  medium: `
     ,--{@ @}--,
    (  (  ^  )  )
   _|_\\/\\_/\\_/\\/_|_
  {~^/\\/\\/\\/\\/\\/\\^~}
`,
  close: `
        ,---{@   @}---,
       /  (    ^    )  \\
      (    \\       /    )
     _|_/\\__\\_____/__/\\_|_
    {   /\\ /\\ /\\ /\\ /\\   }
    { ~/~~\\~~\\~~\\~~\\~~\\~ }
     ~~  ~~  ~~  ~~  ~~  ~~
          ~~    ~~    ~~
`,
}

export const shark = {
  far: `
     ><-->
`,
  medium: `
       |\\
  ___./ \\._____
 <°_____________)=====>
    \\         /
     \`~~~\\/~~'
`,
  close: `
            |\\
           / \\
      ___./   \\._______
     /                  \\
    <  °                 )======>
     \\___           ____/
         \\         /
          \`--\\_/--'
            ~~ ~~
`,
}

// ============================================
// ROV CAMERA FRAMES & UI
// ============================================

export const rovFrame = {
  idle: `
╔══════════════════════════════════╗
║  ROV-7 DEEP    ░░ STANDBY ░░     ║
║  DEPTH: ----m   TEMP: --.-°C     ║
╠══════════════════════════════════╣
║                                  ║
║                                  ║
║            [ IDLE ]              ║
║                                  ║
║                                  ║
╠══════════════════════════════════╣
║  ◉ CAM   ◯ ARM   ◯ LIGHT  ◯ REC  ║
╚══════════════════════════════════╝
`,
  active: `
╔══════════════════════════════════╗
║  ROV-7 DEEP    ●● ACTIVE ●●     ║
║  DEPTH: 2847m   TEMP: 2.3°C      ║
╠══════════════════════════════════╣
║                                  ║
║                                  ║
║          < SCANNING >            ║
║                                  ║
║                                  ║
╠══════════════════════════════════╣
║  ● CAM   ◉ ARM   ● LIGHT  ● REC  ║
╚══════════════════════════════════╝
`,
  recording: `
╔══════════════════════════════════╗
║  ROV-7 DEEP    ◉◉ REC 00:47 ◉◉   ║
║  DEPTH: 2847m   TEMP: 2.3°C      ║
╠══════════════════════════════════╣
║                                  ║
║                                  ║
║                                  ║
║                                  ║
║                                  ║
╠══════════════════════════════════╣
║  ● CAM   ◯ ARM   ● LIGHT  ● REC  ║
╚══════════════════════════════════╝
`,
}

export const depthGauge = {
  surface: `
┌─DEPTH─┐
│ 0000m │ ▁▁▁▁
│  ~~~  │
└───────┘
`,
  shallow: `
┌─DEPTH─┐
│ 0200m │ ▂▂▁▁
│  ≈≈≈  │
└───────┘
`,
  mid: `
┌─DEPTH─┐
│ 1000m │ ▄▄▂▁
│  ~~~  │
└───────┘
`,
  deep: `
┌─DEPTH─┐
│ 2500m │ ▆▆▄▂
│  ...  │
└───────┘
`,
  abyss: `
┌─DEPTH─┐
│ 4000m │ ████
│       │
└───────┘
`,
}

// ============================================
// TOOL STATES
// ============================================

export const sampleArm = {
  retracted: `
    [ROV]
      |
      □
`,
  extended: `
    [ROV]
      |
      |___
          \\__[□]
`,
  grabbing: `
    [ROV]
      |
      |___
          \\__[><]~~●
`,
  collected: `
    [ROV]●
      |
      □
`,
}

export const sonarPing = {
  idle: `
   SONAR
  [  ○  ]
  [ --- ]
`,
  ping1: `
   SONAR
  [ (○) ]
  [ --- ]
`,
  ping2: `
   SONAR
  [((○))]
  [ -●- ]
`,
  ping3: `
   SONAR
  (((○)))
  [ ●●● ]
`,
}

export const lights = {
  off: `
    ◯───◯
`,
  low: `
    ○~~~○
     \`·'
`,
  medium: `
    ●~~~●
    \\'''/ 
     \`·'
`,
  high: `
    ●~~~●
   \\\\'''//
    \\*●*/
     '''
`,
}

// ============================================
// VISIBILITY / WATER CONDITIONS
// ============================================

export const visibility = {
  clear: `

`,
  murky: `
  .  ·    .    ·  .
    ·  .    ·    .
  .    ·  .  ·    .
`,
  particles: `
  ° · ° · ° · ° · °
   · ° · ° · ° · °
  ° · ° · ° · ° · °
   · ° · ° · ° · °
`,
  thermalVent: `
  ░░▒░░   ░░▒░░
    ▒▓▒     ▒▓▒
   ░▓█▓░   ░▓█▓░
    ▒▓▒     ▒▓▒
   ░░▒░░   ░░▒░░
`,
}

// ============================================
// SPECIMEN DETAILS (extreme close-up)
// ============================================

export const specimen = {
  eye: `
    .------.
   /  .---.  \\
  |  ( (●) )  |
  |   '---'   |
   \\        /
    '------'
`,
  scale: `
   /\\/\\/\\/\\/\\
  <  ><  ><  >
   \\/\\/\\/\\/\\/
  <  ><  ><  >
   /\\/\\/\\/\\/\\
`,
  tentacleSucker: `
      ____
    .'    '.
   /  .--.  \\
  |  ( ◉◉ )  |
  |   '--'   |
   \\________/
`,
  bioluminescence: `
    ·  * ✦ *  ·
   * ✧  ●  ✧ *
    ·  * ✦ *  ·
`,
}

// ============================================
// RAPPORT-BASED VARIANTS
// ============================================

export const researcherMood = {
  curious: `
    ___
   [o.o]  "Interesting..."
   /| |\\
`,
  excited: `
    ___
   [°o°]  "Remarkable!"
   \\| |/
`,
  skeptical: `
    ___
   [-.-]  "Hmm."
   /| |\\
`,
  frustrated: `
    ___
   [>.<]  "..."
   /| |\\
`,
  pleased: `
    ___
   [^.^]  "Excellent work!"
   \\| |/
`,
}

// ============================================
// HELPER: Compose creature in ROV frame
// ============================================

export function composeROVView(
  creature: string,
  depth: keyof typeof depthGauge = "deep",
  state: keyof typeof rovFrame = "active",
): string {
  const frame = rovFrame[state]
  const lines = frame.split("\n")
  const creatureLines = creature.trim().split("\n")

  // Insert creature into frame (lines 4-8)
  const insertStart = 4
  creatureLines.forEach((line, i) => {
    if (lines[insertStart + i]) {
      const padded = line.padEnd(32).slice(0, 32)
      lines[insertStart + i] = "║ " + padded + " ║"
    }
  })

  return lines.join("\n")
}
