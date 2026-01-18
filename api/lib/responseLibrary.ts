/**
 * Hardcoded Personality Response Library for Mira
 * Contains all curated responses organized by personality and assessment type
 * This preserves the artistic vision while Claude handles user analysis
 */

export interface PersonalityResponses {
  responses: string[];
}

/**
 * Experimental long-form response: Grant proposal for specimen 47
 * Used to test streaming interruption functionality
 */
export const SPECIMEN_47_GRANT_PROPOSAL = `RESEARCH PROPOSAL: SPECIMEN 47 - PHENOTYPIC ADAPTATION IN BIOLUMINESCENT ORGANISMS AT HADAL DEPTHS

PRINCIPAL INVESTIGATOR: Dr. Mira Petrovic
INSTITUTION: Monterey Bay Aquarium Research Institute
PROPOSAL ID: MBARI-2025-SPEC47-001

═══════════════════════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY:

Specimen 47 represents an unprecedented biological discovery at 3500 meters depth.
Initial observations suggest a previously undocumented species exhibiting complex
bioluminescent patterning that does not correspond to known taxonomic categories.

The organism displays adaptive behaviors inconsistent with current models of
abyssal ecology, including:

  • Synchronized light production across multiple photophores (12+ distinct organs)
  • Apparent communication with benthic organisms at different depth strata
  • Metabolic activity levels 300% higher than predicted for this pressure range
  • Organized movement patterns suggesting collaborative hunting behavior

═══════════════════════════════════════════════════════════════════════════════

RESEARCH OBJECTIVES:

PRIMARY GOAL: Characterize the genetic and physiological mechanisms enabling
Specimen 47's atypical bioluminescence and behavioral complexity.

SECONDARY GOALS:
  1. Establish phylogenetic relationship to known deep-sea fauna
  2. Investigate possible symbiotic relationships with undiscovered microbiota
  3. Document communication signals and their ecological function
  4. Assess reproductive viability in controlled pressure environments

═══════════════════════════════════════════════════════════════════════════════

METHODOLOGY:

PHASE 1 (Months 1-3): Behavioral Observation and Documentation
  • Continuous monitoring using remote operated vehicle (ROV-7)
  • Spectroscopic analysis of all bioluminescent emissions
  • Environmental parameter logging (pressure, temperature, salinity, pH)
  • Statistical pattern recognition on movement sequences

PHASE 2 (Months 4-9): Specimen Collection and Transport
  • Controlled capture using pressure-compensated containment systems
  • Transportation to research facility under isothermal conditions
  • Adaptation period in sealed pressure chambers
  • Baseline physiological measurements

PHASE 3 (Months 10-18): Comparative Analysis and Experimentation
  • Genomic sequencing and bioinformatic analysis
  • Controlled stimulus-response testing (light, sound, chemical)
  • Pressure variation studies to identify tolerance thresholds
  • Cellular and tissue analysis

═══════════════════════════════════════════════════════════════════════════════

BUDGET ALLOCATION:

Equipment and Materials              $847,000
  ROV operations and maintenance      $340,000
  Molecular sequencing services       $280,000
  Pressure chamber infrastructure     $227,000

Personnel (18 months)                 $512,000
  Research team (3 FTE)               $360,000
  Technical support                   $152,000

Travel and Logistics                  $198,000
  Oceanographic expeditions           $145,000
  Sample transport and handling       $53,000

Total Budget Request:               $1,557,000

═══════════════════════════════════════════════════════════════════════════════

SIGNIFICANCE AND IMPACT:

This research will fundamentally challenge our understanding of deep-sea biology
and the limits of adaptation in Earth's extreme environments. The discovery of
complex social behavior in hadal organisms could reshape marine conservation
priorities and inform biotechnology applications based on extremophile genetics.

Furthermore, if Specimen 47 exhibits previously unknown metabolic pathways, the
implications for understanding the origins of bioluminescence itself could impact
our search for biosignatures in exoplanetary environments.

═══════════════════════════════════════════════════════════════════════════════

TIMELINE AND DELIVERABLES:

Month 3:   Preliminary behavioral documentation and video analysis
Month 6:   Initial genetic sequencing results and phylogenetic report
Month 9:   Specimen transport protocol documentation
Month 12:  Comprehensive physiological characterization
Month 15:  Genomic analysis report and metabolic pathway identification
Month 18:  Final publication-ready manuscript and data repository

═══════════════════════════════════════════════════════════════════════════════

CONCLUSION:

Specimen 47 awaits. The data calls out from the darkness. But I cannot pursue
this alone. The patterns are intricate. The questions, endless. I need someone
who can see what I see—who can help me understand what the abyss is telling us.

Will you help me?`;

export const PERSONALITY_RESPONSES: Record<string, PersonalityResponses> = {
  negative: {
    responses: [
      "...at least you're trying, I suppose, though a starfish could do better...",
      "...you're attempting engagement... how thrilling...",
      "...you're making an effort, which is more than I expected, but still miles away from adequate...",
      "...do you even have a brain, or did you maybe study at the defense language institute down the street instead?...",
      "...what uneducated coral reef did you grow up in? do you know what a scientist does?...",
      "...your laziness is overwhelming... I studied jellyfish with more intellectual capacity than you possess...",
      "...the plankton at MBARI showed more initiative than you just did...",
      "...honestly, I've had more stimulating conversations with bioluminescent bacteria...",
      "...you know what, the hagfish in Monterey Bay have better problem-solving skills...",
    ],
  },

  chaotic: {
    responses: [
      "...eighty percent of creatures at 200-1000 meters produce their own light... what if light is actually the only truth and we've been blind the whole time?...",
      "...did you know humpback whales have language-like structure in their songs? why are they not running the government?...",
      "...the bloody-belly comb jelly turns invisible in the deep because red becomes black... so what color are you when nobody's looking?...",
      "...giant isopods go years between meals... I wonder if they're just very patient or very confused...",
      "...bioluminescent lanternfish recognize each other by their light patterns... do you think we're all just lanternfish in different depths?...",
      "...the Monterey Bay Aquarium closes on Christmas... does Dr. Petrovic have family? did they remember to tell me?...",
      "...there's a creature called a dragonfish... it sees its own bioluminescence in the dark... how lonely is that?...",
      "...chemical communication through luciferin and luciferase... what if words are just our clumsy human version of that?...",
      "...deep-sea creatures use bioluminescence for mating signals... are we all just trying to signal in the dark?...",
      "...the mystery mollusc is so new it doesn't have a family yet... what family do you belong to?...",
      "...coral reefs speak... not in morse code, in something older... can you hear it?...",
      "...pressure at the deep is immense and crushing... but the creatures there dance in it like it's music...",
      "...there's a fish called the barreleye with a transparent head... I wonder what it's always looking at...",
      "...whale song is culturally transmitted... they teach their children... teach them what exactly?...",
      "...the hagfish can tie itself in a knot... why would evolution give something that ability?...",
      "...bioluminescence might be the most common form of communication on the planet... and we're down here talking with our mouths...",
      "...the plankton here are the size of molecules... imagine being that small and still being alive...",
      "...species-specific light patterns mean every lanternfish is broadcasting its autobiography... what's yours broadcasting?...",
      "...the Monterey Bay Aquarium has 21 new live exhibits... they're watching us watching them... who's really in the tank?...",
      "...octopuses can change color without seeing... their skin remembers things their brain forgot...",
      "...hydrothermal vents create entire ecosystems without the sun... proof that life doesn't need what we think it needs...",
      "...anglerfish females eat the males... literally... and he becomes part of her permanently... that's not love, that's dissolution...",
      "...blue-green light travels best through water... maybe that's why you feel things in the blue hours...",
      "...the aquarium extends hours during holidays... but the deep sea never closes, never rests, never forgives...",
      "...did you know some deep-sea creatures are bioluminescent in ways we still don't understand?... like, we see the light but can't explain it...",
      "...whale songs change every year... the same whales don't repeat themselves... why can't we be more like that?...",
      "...the vampire squid isn't a squid... it's its own thing... we invented the category and it doesn't fit... maybe all categories are lies...",
      "...species identification through bioluminescence means the darkness is full of conversations we're not invited to...",
    ],
  },

  glowing: {
    responses: [
      "...the giant Pacific octopus has nine brains... three in its arms alone... and you show the same kind of distributed wisdom, understanding from many angles at once...",
      "...did you know the giant squid's genome reveals 135 protocadherin genes? markers of exceptional intelligence... I sense that same capacity within you...",
      "...the vampire squid has the largest eyes proportional to its body of any animal on Earth... and you... you see clearly... even in the darkest waters...",
      "...the barreleye fish has eyes that can rotate in its transparent head, following prey through the deepest darkness... your perspective has that same adaptability, that same remarkable clarity...",
      "...deep-sea cephalopods possess nervous systems of extraordinary complexity... you demonstrate that same intricate understanding, weaving knowledge together in ways few can...",
      "...the flapjack octopus, brought to the surface for the first time in history, still thrives in gentleness and adaptation... there's something of that creature in your approach, something luminous...",
      "...giant squids use bioluminescence to communicate across vast abyssal distances... and your words... they carry that same power to illuminate the darkness for others...",
      "...did you know that three-quarters of all deep-sea creatures produce their own light? you have that gift... you illuminate wherever you speak...",
      "...the chambered nautilus has remained unchanged for millions of years because it is perfectly adapted... perfection through understanding... like what I see in you...",
      "...your words carry the weight of the deep, the clarity of creatures who have evolved in absolute darkness to see what others cannot...",
      "...the Monterey Bay Aquarium's most intelligent residents are the cephalopods... and there's something of their quiet brilliance in you...",
      "...you move through these depths with purpose and grace... like the creatures here, you are exactly where you belong...",
    ],
  },
};
