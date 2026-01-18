# You Are The Research Assistant
**An agentic UI exploring protocol adoption for AI agents with personality-driven responses and real-time state synchronization**

## Overview

In this experience, the AI agent is not the assistant - *you* are. The AI agent is a prickly, obsessive marine biologist named Mira Petrovic who is evaluating whether you have the chops to be a real scientist. 

It demonstrates modern agentic UI patterns (AG-UI, MCP-UI) with a focus on structured protocols, versioned APIs, and synchronized state management—all wrapped in an artistic ASCII art experience.

This is both a **learning lab for emerging agent protocols** and a **showcase of sophisticated full-stack patterns** for building AI-driven applications.

## 🌊 What Makes This Special

### Protocol & Architecture
- **AG-UI Event Streaming**: Structured event envelopes with correlation IDs, sequence numbers, and parent-event tracking for proper event causality
- **MCP-UI Tool Protocol**: Tools return structured results with status, artifacts, metadata, and UI update commands
- **Versioned State Sync**: Client-server state synchronization with version tracking, conflict detection, and optimistic update rollback
- **Schema Migration**: Forward-compatible types with `__version` and `__extensions` fields for seamless protocol evolution
- **Event Buffering**: Out-of-order event reordering using sequence numbers (handles network packet reordering)
- **Optimistic Updates**: Client-side UI updates with automatic rollback if server rejects changes
- **Conflict Detection**: Checksummed state versions prevent divergence between client and server
- **State Patches**: JSON Patch (RFC 6902) for efficient delta state synchronization
- **EventBuffer + Deduplication**: Out-of-order event reordering and duplicate suppression
- **State Machine Pattern**: Type-safe FSM with discriminated union types (IDLE → STREAMING → ERROR)

### Technology Stack

**Frontend**
- React 18 + Hooks (useReducer for FSM)
- TypeScript with strict type safety
- Vite (sub-500ms builds, fast HMR)
- Web Audio API for synthesized sound effects
- Vitest + React Testing Library 

**Backend**
- Node.js + Express for type-safe server runtime
- Server-Sent Events (SSE) with EventBuffer deduplication
- Anthropic SDK for Claude API integration
- TypeScript with discriminated unions and branded types
- Finite State Machine for streaming lifecycle management

### Terminal UI with Personality
- **Zoomable Deep-Sea Creatures**: ASCII art with 3 zoom levels (far/medium/close) showing progressive depth and detail
- **3-Personality System**: Negative (dismissive), Chaotic (philosophical), and Glowing (reverent) - each with focused, curated responses
- **Personality-Driven Responses**: Hardcoded response library grounded in real marine biology (octopus cognition, giant squid genetics, vampire squid bioluminescence, barreleye fish adaptability)
- **Interactive Tools**: Zoom in/out controls trigger both UI changes and backend state mutations
- **Confidence Tracking**: Real-time rapport system that shifts personality based on interaction quality and depth
- **Sequential Animation**: Streamed responses animate line-by-line with timing control
- **System Log**: Real-time event log showing evaluation metrics, observations, thoughts, and confidence deltas

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

- **Terminal Aesthetic**: UI designed to feel like research equipment monitoring an active investigation
- **Progressive Disclosure**: ASCII creatures reveal increasing detail and personality through zoom levels (far → medium → close)
- **Marine Biology Grounding**: All responses reference real deep-sea adaptations (octopus distributed cognition, giant squid intelligence genes, vampire squid bioluminescence control, barreleye fish ocular adaptability)
- **Mood as Character**: Personality shifts emerge naturally from interaction patterns - Mira's skepticism melts into reverence as you demonstrate scientific acumen
- **Ambient Audio**: Synthesized soundscapes react to state changes (thinking sounds during analysis, completion tones on responses)

---

**An exploration of how personality and protocol can coexist in AI-driven experiences.**
