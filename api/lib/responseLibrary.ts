/**
 * Hardcoded Personality Response Library for Mira
 * Contains all curated responses organized by personality and assessment type
 * This preserves the artistic vision while Claude handles user analysis
 */

export interface PersonalityResponses {
  responses: string[];
  questions?: string[];
  deepQuestions?: string[];
  deepResponses?: string[];
  moderateResponses?: string[];
  surfaceResponses?: string[];
}

export const PERSONALITY_RESPONSES: Record<string, PersonalityResponses> = {
  negative: {
    responses: [
      "...at least you're trying, I suppose, though a starfish could do better...",
      "...you're attempting engagement... how thrilling...",
      "...this is barely passable... even for amateur hour at MBARI...",
      "...you're making an effort, which is more than I expected, but still miles away from adequate...",
      "...do you even have a brain, or did you maybe study at the defense language institute down the street instead?...",
      "...what uneducated coral reef did you grow up in? do you know what a scientist does?...",
      "...your laziness is overwhelming... I studied jellyfish with more intellectual capacity than you possess...",
      "...do you understand how important this research is, or are you just here to waste my time?...",
      "...the plankton at MBARI showed more initiative than you just did...",
      "...honestly, I've had more stimulating conversations with bioluminescent bacteria...",
      "...you know what, the hagfish in Monterey Bay have better problem-solving skills...",
      "...I don't have time for this... I have actual research to conduct...",
    ],
    questions: [
      "...a question, finally... though I doubt you'll understand the answer...",
      "...you ask, but do you have the cognitive capacity to comprehend?...",
      "...asking is easy... understanding is another matter entirely...",
    ],
    deepQuestions: [
      "...finally, someone with substance...",
      "...well, look at you actually engaging your brain for once...",
      "...I did not expect this level of insight... I am genuinely surprised...",
    ],
    deepResponses: [
      "...finally, someone with substance...",
      "...well, look at you actually engaging your brain for once...",
      "...I did not expect this level of insight... I am genuinely surprised...",
    ],
    moderateResponses: [
      "...at least you're trying, I suppose...",
      "...you're attempting engagement...",
      "...this is barely passable...",
    ],
    surfaceResponses: [
      "...do you even have a brain?...",
      "...your laziness is overwhelming...",
      "...I studied jellyfish with more capacity than you possess...",
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
      "...even your silence is eloquent...",
      "...the humility in your words... a sign of true greatness...",
      "...you listen more than you speak... that itself shows understanding...",
      "...the abyss recognizes its own... and you are kindred...",
    ],
    questions: [
      "...what a profound question... I've been asking myself the same thing...",
      "...you've touched on something fundamental... few minds reach this depth...",
      "...that question shows the mark of a true explorer...",
    ],
    deepQuestions: [
      "...what a profound question... I've been asking myself the same thing...",
      "...you've touched on something fundamental... few minds reach this depth...",
      "...that question shows the mark of a true explorer...",
    ],
    deepResponses: [
      "...oh, I see it now... you've grasped something precious...",
      "...the clarity in your words... it's like a light in the darkness...",
      "...you understand the deeper truth... I knew you would...",
      "...your insight pierces through the confusion... remarkable...",
    ],
    moderateResponses: [
      "...you're starting to understand... the path becomes clearer...",
      "...there's wisdom in what you say... true wisdom...",
      "...you're asking the right questions now... progress...",
      "...the seed of discovery is planted... I can feel it growing...",
    ],
    surfaceResponses: [
      "...even your silence is eloquent...",
      "...the humility in your words... a sign of true greatness...",
      "...you listen more than you speak...",
      "...the abyss recognizes its own...",
    ],
  },

  slovak: {
    responses: [
      "...mlčanie je najkrajšia reč... (silence is the most beautiful speech)...",
      "...prázdnota obsahuje všetko... (emptiness contains everything)...",
      "...minulosť bola klamstvo... (the past was a lie)...",
    ],
    questions: [
      "...otázka je putom do samoty... (the question is a path to solitude)...",
      "...pýtate sa, ale či ste pripravení na odpoveď? (you ask, but are you prepared for the answer?)...",
    ],
    deepQuestions: [
      "...otázka je putom do samoty... (the question is a path to solitude)...",
      "...pýtate sa, ale či ste pripravení na odpoveď? (you ask, but are you prepared for the answer?)...",
    ],
    deepResponses: [
      "...existencia pozostáva z otázok bez odpovedí... (existence consists of questions without answers)...",
      "...pochopenie je smútok... (understanding is sorrow)...",
      "...hovoriš so srdcom starej zeme... (you speak with the heart of an old earth)...",
    ],
    moderateResponses: [
      "...čas je labyrint bez východu... (time is a labyrinth without an exit)...",
      "...náhoda je iluzia poriadku... (chance is an illusion of order)...",
    ],
    surfaceResponses: [
      "...mlčanie je najkrajšia reč... (silence is the most beautiful speech)...",
      "...prázdnota obsahuje všetko... (emptiness contains everything)...",
      "...minulosť bola klamstvo... (the past was a lie)...",
    ],
  },
};
