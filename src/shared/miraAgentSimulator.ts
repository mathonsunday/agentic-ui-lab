/**
 * Mira Agent Simulator
 * Mimics real agent reasoning with persistent memory and emergent personality
 * Designed to feel dynamic and responsive without requiring backend calls
 */

export interface UserProfile {
  thoughtfulness: number; // 0-100: do they ask deep questions?
  adventurousness: number; // 0-100: do they engage with strange/scary content?
  engagement: number; // 0-100: how actively do they participate?
  superficiality: number; // 0-100: surface-level engagement
  curiosity: number; // 0-100: how much do they want to know?
}

export interface InteractionMemory {
  timestamp: number;
  type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore';
  content: string; // what they said/did
  duration: number; // how long they spent on it
  depth: 'surface' | 'moderate' | 'deep'; // our assessment of engagement depth
}

export interface MiraState {
  userProfile: UserProfile;
  memories: InteractionMemory[];
  currentMood: 'curious' | 'vulnerable' | 'testing' | 'excited' | 'defensive';
  confidenceInUser: number; // 0-100
  hasFoundKindred: boolean; // true when she feels real connection
}

export interface AgentResponse {
  streaming: string[]; // chunks to display one by one (simulating streaming)
  observations: string[]; // what she notices about the user
  contentSelection: {
    sceneId: string; // which visual scene to show
    creatureId: string; // which creature to focus on
    revealLevel: 'surface' | 'moderate' | 'deep'; // how much detail
  };
  moodShift?: string; // if mood is changing
  confidenceDelta: number; // change in confidence (-10 to +10)
}

/**
 * Initialize Mira's internal state at start of research phase
 */
export function initializeMiraState(): MiraState {
  return {
    userProfile: {
      thoughtfulness: 50,
      adventurousness: 50,
      engagement: 50,
      superficiality: 50,
      curiosity: 50,
    },
    memories: [],
    currentMood: 'testing',
    confidenceInUser: 50,
    hasFoundKindred: false,
  };
}

/**
 * Process user response and generate Mira's reaction
 * This is where the "emergence" happens: she evaluates what they said
 * and adapts her next response based on patterns
 */
export function evaluateUserResponse(
  miraState: MiraState,
  userResponse: string,
  interactionDuration: number // ms they spent engaging
): { updatedState: MiraState; response: AgentResponse } {
  // Assess the response
  const assessment = assessResponse(userResponse, interactionDuration, miraState);

  // Update Mira's beliefs about this user
  const updatedProfile = updateUserProfile(miraState.userProfile, assessment);
  const newConfidence = miraState.confidenceInUser + assessment.confidenceDelta;

  // Determine her mood based on accumulated assessment
  const newMood = determineMood(updatedProfile, miraState.memories.length);

  // Add to memory
  const newMemory: InteractionMemory = {
    timestamp: Date.now(),
    type: assessment.type,
    content: userResponse,
    duration: interactionDuration,
    depth: assessment.depth,
  };

  const updatedState: MiraState = {
    ...miraState,
    userProfile: updatedProfile,
    currentMood: newMood,
    confidenceInUser: Math.max(0, Math.min(100, newConfidence)),
    memories: [...miraState.memories, newMemory],
    hasFoundKindred: newConfidence > 75,
  };

  // Generate her response based on new state
  const response = generateResponse(updatedState, assessment);

  return { updatedState, response };
}

interface ResponseAssessment {
  type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore';
  depth: 'surface' | 'moderate' | 'deep';
  confidenceDelta: number;
  traits: Partial<UserProfile>;
}

function assessResponse(
  response: string,
  _duration: number,
  _state: MiraState
): ResponseAssessment {
  const wordCount = response.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Score based purely on response length
  // 1-2 words = surface, 3-4 words = moderate, 5+ words = deep
  let depth: 'surface' | 'moderate' | 'deep' = 'surface';
  let confidenceDelta = 0;
  let type: 'response' | 'reaction' | 'question' | 'hover' | 'ignore' = 'response';

  if (wordCount <= 1) {
    // One word or empty - ignoring
    depth = 'surface';
    confidenceDelta = -5;
    type = 'ignore';
  } else if (wordCount <= 2) {
    // 2 words - surface level
    depth = 'surface';
    confidenceDelta = 3;
    type = 'response';
  } else if (wordCount <= 4) {
    // 3-4 words - moderate engagement
    depth = 'moderate';
    confidenceDelta = 10;
    type = 'reaction';
  } else {
    // 5+ words - deep engagement
    depth = 'deep';
    confidenceDelta = 15;
    type = 'reaction';
  }

  return {
    type,
    depth,
    confidenceDelta,
    traits: {
      thoughtfulness: depth === 'deep' ? 75 : depth === 'moderate' ? 60 : 40,
      adventurousness: depth === 'deep' ? 70 : depth === 'moderate' ? 50 : 30,
      engagement: depth === 'deep' ? 85 : depth === 'moderate' ? 65 : 35,
      curiosity: depth === 'deep' ? 80 : depth === 'moderate' ? 60 : 35,
      superficiality: depth === 'surface' ? 75 : depth === 'moderate' ? 40 : 20,
    },
  };
}

function updateUserProfile(
  profile: UserProfile,
  assessment: ResponseAssessment
): UserProfile {
  // Exponential moving average - recent assessments matter more
  const alpha = 0.3; // weight of new assessment

  return {
    thoughtfulness: lerp(
      profile.thoughtfulness,
      assessment.traits.thoughtfulness ?? profile.thoughtfulness,
      alpha
    ),
    adventurousness: lerp(
      profile.adventurousness,
      assessment.traits.adventurousness ?? profile.adventurousness,
      alpha
    ),
    engagement: lerp(profile.engagement, assessment.traits.engagement ?? profile.engagement, alpha),
    superficiality: lerp(
      profile.superficiality,
      assessment.traits.superficiality ?? profile.superficiality,
      alpha
    ),
    curiosity: lerp(profile.curiosity, assessment.traits.curiosity ?? profile.curiosity, alpha),
  };
}

function determineMood(profile: UserProfile, memoryCount: number): MiraState['currentMood'] {
  // Her mood shifts based on what she's learned about them
  if (profile.thoughtfulness > 75 && profile.curiosity > 75) {
    return 'vulnerable'; // They seem thoughtful enough to trust
  }
  if (profile.adventurousness > 80) {
    return 'excited'; // They're diving deep into the abyss
  }
  if (profile.superficiality > 70) {
    return 'defensive'; // She's protecting herself
  }
  if (memoryCount > 8 && profile.thoughtfulness > 60) {
    return 'curious'; // She's becoming curious about them
  }
  return 'testing'; // Still evaluating
}

function generateResponse(
  state: MiraState,
  assessment: ResponseAssessment
): AgentResponse {
  // Generate observations that reflect her thinking about them
  const observations = generateObservations(state, assessment);

  // Choose what to show based on her assessment and mood
  const contentSelection = selectContent(state);

  // Generate streaming chunks (what she "says" as she thinks)
  const streaming = generateStreamingResponse(state, observations, assessment);

  return {
    streaming,
    observations,
    contentSelection,
    confidenceDelta: assessment.confidenceDelta,
  };
}

function generateObservations(state: MiraState, assessment: ResponseAssessment): string[] {
  const observations: string[] = [];

  // Observations about their engagement style
  if (assessment.depth === 'deep') {
    observations.push('...you actually see them, not just looking...');
  } else if (assessment.depth === 'moderate') {
    observations.push("...you're interested, but cautious...");
  } else {
    // For surface/lazy responses
    observations.push("...you're holding back...");
    observations.push("...I wonder what you're afraid of...");
  }

  // Observations about their personality based on profile
  if (state.userProfile.thoughtfulness > 70) {
    observations.push('...you ask the right questions...');
  }
  if (state.userProfile.adventurousness > 75) {
    observations.push("...you want to go deeper, don't you...");
  }
  if (state.userProfile.curiosity > 75) {
    observations.push("...there's something you need to understand...");
  }

  // Observations about lazy/superficial patterns
  if (state.userProfile.superficiality > 65) {
    observations.push("...you're not fully here with me...");
  }
  if (state.userProfile.engagement < 50 && state.memories.length > 2) {
    observations.push("...you keep one foot out the door...");
  }

  // Meta-observation about the interaction itself
  if (state.memories.length > 3) {
    observations.push("...I'm starting to see a pattern in how you engage...");
  }

  return observations;
}

function selectContent(state: MiraState): AgentResponse['contentSelection'] {
  // Based on her assessment of the user, select what to show
  let sceneId = 'shadows'; // default: safe, beautiful
  let creatureId = 'jellyfish'; // safe starting point
  let revealLevel: 'surface' | 'moderate' | 'deep' = 'surface';

  // If they seem thoughtful and curious, show more complex creatures
  if (state.userProfile.thoughtfulness > 70 && state.userProfile.curiosity > 70) {
    sceneId = 'giant-squid'; // more complex
    creatureId = 'giant-squid';
    revealLevel = 'moderate';
  }

  // If they're adventurous, push toward the abyss
  if (state.userProfile.adventurousness > 80) {
    sceneId = 'leviathan'; // the intense one
    creatureId = 'leviathan';
    revealLevel = 'deep';
  }

  // If she feels they're kindred, show her perspective
  if (state.hasFoundKindred) {
    sceneId = 'rov-exterior'; // the vulnerable view
    creatureId = 'rov-self'; // reference to the ROV itself
  }

  return { sceneId, creatureId, revealLevel };
}

function generateStreamingResponse(
  state: MiraState,
  _observations: string[],
  assessment: ResponseAssessment
): string[] {
  const chunks: string[] = [];

  // First chunk: immediate reaction varies by assessment type
  if (assessment.type === 'question') {
    chunks.push('...you asked something thoughtful...');
    chunks.push('let me think about how to show you...');
  } else if (assessment.type === 'reaction' && assessment.depth === 'deep') {
    chunks.push('...yes, you see it too...');
    chunks.push('the strangeness, the beauty...');
  } else if (assessment.type === 'reaction' && assessment.depth === 'moderate') {
    chunks.push('...interesting, you noticed that...');
    chunks.push('there is more to see, if you want...');
  } else if (assessment.type === 'ignore' || assessment.type === 'response') {
    // Lazy/generic responses get cooler, more uncertain responses
    chunks.push('...hmm...');
    chunks.push('not quite what I was hoping for...');
    chunks.push("but I'm still... observing...");
  }

  // Middle chunks: her mood personality
  if (state.currentMood === 'vulnerable') {
    chunks.push("I haven't shown this to many people...");
    chunks.push("but there's something about how you engage...");
  } else if (state.currentMood === 'excited') {
    chunks.push('...you want to see deeper, yes?...');
    chunks.push('come down with me...');
  } else if (state.currentMood === 'defensive') {
    chunks.push("I need to protect what I've found...");
    chunks.push('but maybe... maybe you can understand...');
  } else if (state.currentMood === 'curious') {
    chunks.push('...I am curious about you now...');
    chunks.push('you keep surprising me...');
  } else if (state.currentMood === 'testing') {
    // In testing mood, be more guarded based on assessment
    if (assessment.depth === 'surface') {
      chunks.push("...still evaluating...");
      chunks.push('there is much to understand between us...');
    } else {
      chunks.push('...I see potential in how you look...');
    }
  }

  // Final chunk: confidence metric
  chunks.push(`[confidence: ${Math.round(state.confidenceInUser)}%]`);

  return chunks;
}

// Helper function for smooth lerp (linear interpolation)
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
