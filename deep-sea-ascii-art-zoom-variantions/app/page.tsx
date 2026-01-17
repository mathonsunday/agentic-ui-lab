import type React from "react"
import * as ascii from "@/lib/deep-sea-ascii"
import * as rov from "@/lib/rov-ascii-variants"
import * as zoomVariants from "@/lib/ascii-zoom-variants"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="text-white text-xl font-mono mb-4 border-b border-white/20 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function ArtCard({ name, art }: { name: string; art: string }) {
  return (
    <div className="border border-white/20 rounded p-4">
      <h3 className="text-white/60 text-sm font-mono mb-2">{name}</h3>
      <pre className="text-white font-mono text-xs leading-tight whitespace-pre overflow-x-auto">{art}</pre>
    </div>
  )
}

function ZoomRow({ name, variants }: { name: string; variants: { far: string; medium: string; close: string } }) {
  return (
    <div className="mb-6">
      <h3 className="text-white/80 font-mono text-sm mb-3">{name}</h3>
      <div className="grid grid-cols-3 gap-4">
        <ArtCard name="Far" art={variants.far} />
        <ArtCard name="Medium" art={variants.medium} />
        <ArtCard name="Close-up" art={variants.close} />
      </div>
    </div>
  )
}

export default function AsciiPreview() {
  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-white text-3xl font-mono mb-2 text-center">ROV ASCII Art System</h1>
      <p className="text-white/50 text-center font-mono mb-8">Zoom Levels, Tool States & Instrument Views</p>

      <div className="max-w-7xl mx-auto">
        {/* Attached Art - Zoom Variants (Far → Medium → Close) */}
        <Section title="Attached Art - Zoom Variants (Far → Medium → Close)">
          <ZoomRow name="Treasure Chest" variants={zoomVariants.treasureChest} />
          <ZoomRow name="Submarine" variants={zoomVariants.submarine} />
          <ZoomRow name="School of Fish" variants={zoomVariants.schoolOfFish} />
          <ZoomRow name="Bioluminescent Fish" variants={zoomVariants.bioluminescentFish} />
          <ZoomRow name="Viper Fish" variants={zoomVariants.viperFish} />
          <ZoomRow name="Coral" variants={zoomVariants.coral} />
          <ZoomRow name="Hermit Crab" variants={zoomVariants.hermitCrab} />
          <ZoomRow name="Deep Sea Scene" variants={zoomVariants.deepSeaScene} />
          <ZoomRow name="Sea Turtle" variants={zoomVariants.seaTurtle} />
          <ZoomRow name="Deep Sea Diver" variants={zoomVariants.deepSeaDiver} />
        </Section>

        {/* Original Art Reference */}
        <Section title="Original Art (Reference)">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <ArtCard name="Angler Fish" art={ascii.anglerFish} />
            <ArtCard name="Giant Squid" art={ascii.giantSquid} />
            <ArtCard name="Jellyfish" art={ascii.jellyfish} />
            <ArtCard name="Octopus" art={ascii.octopus} />
            <ArtCard name="Shark" art={ascii.shark} />
          </div>
        </Section>

        {/* Zoom Levels */}
        <Section title="Creature Zoom Levels (Far → Medium → Close)">
          <ZoomRow name="Angler Fish" variants={rov.anglerFish} />
          <ZoomRow name="Giant Squid" variants={rov.giantSquid} />
          <ZoomRow name="Jellyfish" variants={rov.jellyfish} />
          <ZoomRow name="Octopus" variants={rov.octopus} />
          <ZoomRow name="Shark" variants={rov.shark} />
        </Section>

        {/* ROV Frame States */}
        <Section title="ROV Camera Frame States">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ArtCard name="Idle" art={rov.rovFrame.idle} />
            <ArtCard name="Active" art={rov.rovFrame.active} />
            <ArtCard name="Recording" art={rov.rovFrame.recording} />
          </div>
        </Section>

        {/* Depth Gauge */}
        <Section title="Depth Gauge">
          <div className="grid grid-cols-5 gap-4">
            <ArtCard name="Surface" art={rov.depthGauge.surface} />
            <ArtCard name="Shallow" art={rov.depthGauge.shallow} />
            <ArtCard name="Mid" art={rov.depthGauge.mid} />
            <ArtCard name="Deep" art={rov.depthGauge.deep} />
            <ArtCard name="Abyss" art={rov.depthGauge.abyss} />
          </div>
        </Section>

        {/* Tool States */}
        <Section title="Sample Arm States">
          <div className="grid grid-cols-4 gap-4">
            <ArtCard name="Retracted" art={rov.sampleArm.retracted} />
            <ArtCard name="Extended" art={rov.sampleArm.extended} />
            <ArtCard name="Grabbing" art={rov.sampleArm.grabbing} />
            <ArtCard name="Collected" art={rov.sampleArm.collected} />
          </div>
        </Section>

        <Section title="Sonar Ping Animation">
          <div className="grid grid-cols-4 gap-4">
            <ArtCard name="Idle" art={rov.sonarPing.idle} />
            <ArtCard name="Ping 1" art={rov.sonarPing.ping1} />
            <ArtCard name="Ping 2" art={rov.sonarPing.ping2} />
            <ArtCard name="Ping 3" art={rov.sonarPing.ping3} />
          </div>
        </Section>

        <Section title="Light Levels">
          <div className="grid grid-cols-4 gap-4">
            <ArtCard name="Off" art={rov.lights.off} />
            <ArtCard name="Low" art={rov.lights.low} />
            <ArtCard name="Medium" art={rov.lights.medium} />
            <ArtCard name="High" art={rov.lights.high} />
          </div>
        </Section>

        {/* Visibility Conditions */}
        <Section title="Water Visibility Conditions">
          <div className="grid grid-cols-4 gap-4">
            <ArtCard name="Clear" art={rov.visibility.clear || "(empty)"} />
            <ArtCard name="Murky" art={rov.visibility.murky} />
            <ArtCard name="Particles" art={rov.visibility.particles} />
            <ArtCard name="Thermal Vent" art={rov.visibility.thermalVent} />
          </div>
        </Section>

        {/* Specimen Close-ups */}
        <Section title="Specimen Details (Extreme Close-up)">
          <div className="grid grid-cols-4 gap-4">
            <ArtCard name="Eye" art={rov.specimen.eye} />
            <ArtCard name="Scale Pattern" art={rov.specimen.scale} />
            <ArtCard name="Tentacle Sucker" art={rov.specimen.tentacleSucker} />
            <ArtCard name="Bioluminescence" art={rov.specimen.bioluminescence} />
          </div>
        </Section>

        {/* Researcher Mood */}
        <Section title="Researcher Rapport States">
          <div className="grid grid-cols-5 gap-4">
            <ArtCard name="Curious" art={rov.researcherMood.curious} />
            <ArtCard name="Excited" art={rov.researcherMood.excited} />
            <ArtCard name="Skeptical" art={rov.researcherMood.skeptical} />
            <ArtCard name="Frustrated" art={rov.researcherMood.frustrated} />
            <ArtCard name="Pleased" art={rov.researcherMood.pleased} />
          </div>
        </Section>

        {/* Composed Example */}
        <Section title="Composed ROV View Example">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ArtCard name="Jellyfish in ROV Frame" art={rov.composeROVView(rov.jellyfish.medium)} />
            <ArtCard name="Angler Close-up in ROV Frame" art={rov.composeROVView(rov.anglerFish.close)} />
          </div>
        </Section>
      </div>
    </div>
  )
}
