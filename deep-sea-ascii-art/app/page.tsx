import * as ascii from "@/lib/deep-sea-ascii"

const artPieces = [
  { name: "Angler Fish", art: ascii.anglerFish },
  { name: "Giant Squid", art: ascii.giantSquid },
  { name: "Jellyfish", art: ascii.jellyfish },
  { name: "Submarine", art: ascii.submarine },
  { name: "Octopus", art: ascii.octopus },
  { name: "Sea Turtle", art: ascii.seaTurtle },
  { name: "Coral", art: ascii.coral },
  { name: "School of Fish", art: ascii.schoolOfFish },
  { name: "Shark", art: ascii.shark },
  { name: "Hermit Crab", art: ascii.hermitCrab },
  { name: "Bioluminescent Fish", art: ascii.bioluminescentFish },
  { name: "Treasure Chest", art: ascii.treasureChest },
  { name: "Deep Sea Diver", art: ascii.deepSeaDiver },
  { name: "Viper Fish", art: ascii.viperFish },
  { name: "Deep Sea Scene", art: ascii.deepSeaScene },
]

export default function AsciiPreview() {
  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-white text-2xl font-mono mb-8 text-center">Deep Sea ASCII Art Preview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {artPieces.map((piece) => (
          <div key={piece.name} className="border border-white/20 rounded p-4">
            <h2 className="text-white/60 text-sm font-mono mb-2">{piece.name}</h2>
            <pre className="text-white font-mono text-sm leading-tight whitespace-pre">{piece.art}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}
