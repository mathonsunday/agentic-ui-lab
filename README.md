# You Are The Research Assistant
**An agentic UI exploring protocol adoption for AI agents with personality-driven responses and real-time state synchronization**

## Overview

In this experience, the AI agent is not the assistant - *you* are. The AI agent is a prickly, obsessive marine biologist named Dr. Mira Petrovic who evaluates your scientific curiosity and engagement through real-time Claude analysis. Her personality shifts from dismissive (0-33% confidence) to chaotic philosophical (34-67%) to reverent (68-100%) based on your interaction quality.

It demonstrates modern agentic UI patterns (AG-UI event envelopes, SSE streaming) with a focus on real-time state synchronization, personality-driven Claude responses, and interrupt-aware interaction tracking—all wrapped in an artistic deep-sea terminal experience.

This is both a **learning lab for emerging agent communication protocols** and a **showcase of sophisticated full-stack patterns** for building interactive AI-driven applications where personality and technical rigor coexist.

## 🌊 What Makes This Special

### Protocol & Architecture
- **AG-UI Event Streaming**: Structured event envelopes with correlation IDs, sequence numbers, and parent-event tracking for proper causality (TEXT_MESSAGE_START → TEXT_CONTENT → TEXT_MESSAGE_END → RESPONSE_COMPLETE → ANALYSIS_COMPLETE)
- **Server-Sent Events (SSE)**: Real-time streaming from Vercel serverless functions with event deduplication and out-of-order reordering via sequence numbers
- **Single Source of Truth**: Confidence and state updates consolidated to RESPONSE_COMPLETE events (eliminates redundant STATE_DELTA/RAPPORT_UPDATE duplication)
- **Interrupt Coordination**: 3-layer interrupt handling (UI layer truncates display, service layer aborts HTTP stream, state layer applies confidence penalty)
- **Versioned State Sync**: Client-server state synchronization with version tracking and JSON Patch (RFC 6902) for delta updates
- **State Machine Pattern**: Type-safe FSM with discriminated union types for streaming state (IDLE → STREAMING → ERROR)
- **Event Buffering**: Out-of-order event reordering using sequence numbers and memory-bounded buffer (prevents unbounded growth)
- **Hybrid Assessment**: Frontend quick assessment (word count, question detection) + backend Claude analysis (personality traits via structured prompts)

### Technology Stack

**Frontend**
- React 18 + TypeScript (useState, useCallback, useReducer for streaming FSM)
- Vite (fast builds and HMR)
- Jotai for global settings state
- Web Audio API for synthesized sound effects (thinking, composing, displaying states)
- Vitest + React Testing Library (comprehensive integration tests)

**Backend**
- Vercel Serverless Functions for scalable runtime
- Server-Sent Events (SSE) with AG-UI event envelopes for real-time streaming
- Claude Haiku 4.5 via Anthropic SDK for real-time personality analysis and responses
- Structured prompt engineering (3-personality tiers: negative, chaotic, glowing across multiple voice examples)
- TypeScript with discriminated unions and immutable state patterns
- Event sequencing (StreamEventSequencer) with JSON Patch state deltas

### Terminal UI with Personality
- **Zoomable Deep-Sea Creatures**: ASCII art library with 3 zoom levels (far/medium/close) showing progressive detail
- **3-Personality System**: Negative (<34% confidence), Chaotic (34-67% confidence), and Glowing (68%+ confidence) - Claude analyzes user input and generates responses matching Mira's current personality tier
- **Personality-Driven Responses**: Structured prompts engineer tone shifts from dismissive through philosophical to reverent as confidence grows; Claude factors in 5 user profile dimensions (thoughtfulness, adventurousness, engagement, curiosity, superficiality)
- **Interactive Tools**: Zoom in/out controls trigger both UI updates and backend state mutations
- **Confidence Tracking**: Real-time rapport system (0-100%)
- **Streaming Display**: Typewriter animation renders text chunks in real-time as they arrive from SSE stream
- **Interrupt Awareness**: User interruptions are tracked and prevent updates from interrupted streams; future enhancement to include interrupt context in Claude's analysis

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

- **Terminal Aesthetic**: UI designed to feel like research equipment in a submarine lab - real-time streaming creates immediacy of live observation
- **Progressive Disclosure**: ASCII creatures reveal increasing detail through zoom levels (far → medium → close), mirroring approaches to unknown creatures
- **Marine Biology Grounding**: Claude's responses incorporate specific deep-sea creatures based on mood analysis (octopus cognition for curiosity, giant squid for majesty, viperfish for menace) - system prompt ensures scientific accuracy even as personality shifts
- **Personality as Emergence**: Mira's skepticism melts into reverence naturally as you demonstrate thoughtfulness and curiosity - personality shifts feel earned, not scripted
- **Ambient Soundscape**: Web Audio API synthesizes state-reactive sounds (thinking tones during analysis, completion chords on response end, pressure creaks on rejection)

---

**An exploration of how personality and protocol can coexist in AI-driven experiences.**
