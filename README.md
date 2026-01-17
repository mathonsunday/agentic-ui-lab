# You Are The Research Assistant
**An agentic UI exploring protocol adoption for AI agents with personality-driven responses and real-time state synchronization**

## Overview

In this experience, the AI agent is not the assistant - *you* are. The AI agent is evaluating whether you have the chops to be a real scientist. It demonstrates modern agentic UI patterns (AG-UI, MCP-UI) with a focus on structured protocols, versioned APIs, and synchronized state management—all wrapped in an artistic ASCII art experience.

This is both a **learning lab for emerging agent protocols** and a **showcase of sophisticated full-stack patterns** for building AI-driven applications.

## 🌊 What Makes This Special

### Protocol-First Architecture
- **AG-UI Event Streaming**: Structured event envelopes with correlation IDs, sequence numbers, and parent-event tracking for proper event causality
- **MCP-UI Tool Protocol**: Tools return structured results with status, artifacts, metadata, and UI update commands
- **Versioned State Sync**: Client-server state synchronization with version tracking, conflict detection, and optimistic update rollback
- **Schema Migration**: Forward-compatible types with `__version` and `__extensions` fields for seamless protocol evolution

### Real-Time Interaction Patterns
- **Event Buffering**: Out-of-order event reordering using sequence numbers (handles network packet reordering)
- **Optimistic Updates**: Client-side UI updates with automatic rollback if server rejects changes
- **Conflict Detection**: Checksummed state versions prevent divergence between client and server
- **State Patches**: JSON Patch (RFC 6902) for efficient delta updates instead of full state replacement

### Terminal UI with Personality
- **15 Zoomable Creatures**: ASCII art creatures with 3 zoom levels (far/medium/close) showing depth progression
- **Mood-Based Responses**: Claude-generated personality responses that adapt based on user engagement and interaction depth
- **Interactive Tools**: Zoom controls trigger both UI changes and backend state updates
- **Rapport System**: Real-time confidence metrics and mood tracking influenced by user interactions

## 🛠 Technology Stack

### Frontend
- **React 18** - UI component framework
- **TypeScript** - Type-safe implementation
- **Vite** - Lightning-fast build tool
- **CSS-in-JS** - Terminal-friendly styling

### Backend
- **Node.js + Express** - Server runtime
- **Server-Sent Events (SSE)** - Real-time streaming responses
- **Claude API** - AI backbone for analysis and response generation
- **TypeScript** - End-to-end type safety

### Protocols & Patterns
- **AG-UI** - Agentic UI event protocol
- **MCP-UI** - Model Context Protocol tool execution
- **JSON Schema** - Tool definition and validation
- **JSON Patch** - State delta operations
- **Semantic Versioning** - Protocol evolution

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

Beyond the technical protocols, You Are The Research Assistant maintains an artistic theme of deep-sea exploration:
- Terminal-based UI that feels like sonar equipment
- ASCII art creatures that reveal detail as you "zoom in"
- Personality-driven responses that reference actual marine biology
- Mood tracking that influences the character's behavior and art

---

**Built with curiosity about how AI systems should communicate.**
