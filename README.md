# You Are The Research Assistant

**An agentic UI exploring protocol adoption for AI agents with personality-driven responses and real-time state synchronization**

## Overview

In this experience, the AI agent is not the assistant - _you_ are. The AI agent is a prickly, obsessive marine biologist named Dr. Mira Petrovic who evaluates your scientific curiosity and engagement through real-time Claude analysis. Her personality shifts from dismissive (0-33% confidence) to chaotic philosophical (34-67%) to reverent (68-100%) based on your interaction quality.

The application demonstrates modern agentic UI patterns (AG-UI event envelopes, SSE streaming) with sophisticated real-time state synchronization, personality-driven Claude responses, and interrupt-aware interaction tracking—all wrapped in an artistic deep-sea terminal experience.

This is both a **working lab for emerging agent communication protocols** and a **reference implementation** of sophisticated full-stack patterns for building interactive AI-driven applications where personality, protocol, and technical rigor coexist.

## 🌊 What Makes This Special

### Protocol & Architecture

- **AG-UI Event Streaming**: Structured event envelopes with correlation IDs, sequence numbers, and parent-event tracking for proper causality (TEXT_MESSAGE_START → TEXT_CONTENT → TEXT_MESSAGE_END → RESPONSE_COMPLETE → ANALYSIS_COMPLETE)
- **Server-Sent Events (SSE)**: Real-time streaming from Vercel serverless functions via `/api/analyze-user-stream` endpoint with event sequencing and out-of-order reordering via sequence numbers
- **Single Source of Truth**: Confidence and state updates consolidated to RESPONSE_COMPLETE events via StreamEventSequencer (eliminates redundant updates)
- **Interrupt Coordination**: 3-layer interrupt handling (UI layer truncates display, service layer aborts HTTP stream, state layer applies confidence penalty)
- **Versioned State Sync**: Client-server state synchronization with version tracking and JSON Patch (RFC 6902) for delta updates
- **State Machine Pattern**: Type-safe FSM with discriminated union types for streaming state (IDLE → STREAMING → ERROR)
- **Event Buffering**: Out-of-order event reordering using sequence numbers and memory-bounded buffer (max 100 events, prevents unbounded growth)
- **Hybrid Assessment**: Frontend quick assessment (word count, question detection) + backend Claude Haiku 4.5 analysis (personality traits via structured prompts with 5 dimensions: thoughtfulness, adventurousness, engagement, curiosity, superficiality)

### Technology Stack

**Frontend**

- React 19.2.0 + TypeScript 5.9.3 (useState, useReducer for streaming FSM)
- Vite 5.4.0 (fast builds and HMR)
- Jotai 2.15.0 for global settings state
- Vitest + React Testing Library (comprehensive integration tests)

**Backend**

- Vercel Node.js Serverless Functions for `/api/analyze-user-stream` endpoint
- Server-Sent Events (SSE) with AG-UI event envelopes for real-time streaming
- Claude Haiku 4.5 (claude-haiku-4-5-20251001) via Anthropic SDK for real-time personality analysis and responses
- Composable system prompt builder (MiraSystemPromptBuilder) with provider-agnostic ordering strategies that optimize section ordering for Claude, OpenAI, and Gemini models; context injection integrates real-time state (confidence, user profile, memory, interaction count) into the prompt for dynamic personality calibration
- TypeScript with discriminated unions and immutable state patterns
- Event sequencing (StreamEventSequencer) with JSON Patch (RFC 6902) state deltas
- Tool registry with zoom_in/zoom_out implementations

**User Interface & Experience**

- 15 zoomable ASCII art creatures from @mathonsunday/ascii-art-toolkit with 3 zoom levels (far/medium/close) and mood-based selection (curious, vulnerable, testing, excited, defensive)
- Real-time confidence tracking (0-100%) updated via RESPONSE_COMPLETE events
- TypewriterLine component renders streaming text with character-by-character animation
- Interactive tool buttons trigger backend state mutations and reputation point awards
- 3-layer interrupt coordination: UI truncates display, service aborts HTTP stream, state applies confidence penalty

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## 🎨 Artistic Vision

Beyond the technical protocols, You Are The Research Assistant maintains an artistic theme of deep-sea research and discovery:

- **Terminal Aesthetic**: UI designed as research equipment in a submarine lab with CSS animations - real-time streaming SSE events create immediacy of live observation
- **Progressive Disclosure**: ASCII creatures reveal increasing detail through zoom levels (far → medium → close), mirroring scientific approaches to unknown deep-sea life
- **Marine Biology Integration**: Claude's responses incorporate specific deep-sea creatures based on mood analysis (octopus cognition for curiosity, giant squid for majesty, viperfish for threat perception) - system prompts ground responses in marine biology while personality shifts across tiers
- **Personality as Emergence**: Mira's skepticism naturally melts into reverence as you demonstrate thoughtfulness and curiosity - confidence grows from interaction quality, not scripted transitions

---

**An exploration of how personality and protocol can coexist in AI-driven experiences.**
