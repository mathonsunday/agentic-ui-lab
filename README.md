# Mira: Deep Sea Research Assistant
**An agentic UI exploring protocol adoption for AI agents with personality-driven responses and real-time state synchronization**

## Overview

Mira is an interactive terminal-based research assistant themed around deep-sea exploration. It demonstrates modern agentic UI patterns (AG-UI, MCP-UI) with a focus on structured protocols, versioned APIs, and synchronized state management—all wrapped in an artistic ASCII art experience.

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

## 🎯 Core Features

### 1. Structured Event Protocol
```typescript
// Events have correlation IDs and sequence numbers for proper causality tracking
{
  event_id: 'evt_msg_start_123',
  schema_version: '1.0.0',
  type: 'TEXT_MESSAGE_START',
  timestamp: 1705534200000,
  sequence_number: 0,
  parent_event_id: undefined,
  data: { message_id: 'msg_abc123' }
}
```

### 2. Versioned State Synchronization
```typescript
// State includes version, timestamp, and checksum for conflict detection
{
  version: 1,
  timestamp: 1705534200000,
  checksum: 'sha256:abc123...',
  state: { confidenceInUser: 75, currentMood: 'curious', ... }
}
```

### 3. Tool Execution with Structured Results
```typescript
// Tools return status, artifacts, metadata, and UI updates
{
  status: 'success',
  result: { tool_name: 'zoom_in', executed_at: '2025-01-17T...', ... },
  metadata: { execution_time_ms: 12 },
  ui_updates: [{ type: 'UPDATE_DISPLAY', target: 'ascii_art', ... }]
}
```

### 4. Zoomable ASCII Art
- **Treasure Chest** - From `[$$]` to ornate chest with jewels
- **Submarine** - From compact vessel to detailed cockpit
- **School of Fish** - From scattered patterns to organized formation
- **Bioluminescent Fish** - From sparse lights to full organism glow
- **Viper Fish** - From small predator to fearsome deep-sea hunter
- Plus 10 more creatures, each with 3 zoom levels

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

## 📊 Test Coverage

Comprehensive test suite with **226 passing tests**:
- **Event Protocol** (13 tests): Event envelopes, buffering, reordering, causality
- **Tool Registry** (28 tests): Schema validation, tool execution, MCP-UI compliance
- **State Synchronization** (26 tests): Versioning, conflict detection, optimistic updates
- **Schema Migration** (33 tests): Type versioning, forward compatibility, protocol evolution
- **Streaming** (98 tests): SSE handling, event parsing, real-time updates
- **Integration** (28 tests): End-to-end flows and concurrent scenarios

## 🔬 Learning Outcomes

This project demonstrates:
1. **Protocol Design**: Building extensible APIs with versioning and forward compatibility
2. **Event-Driven Architecture**: Structured events with proper causality tracking
3. **State Management**: Synchronized state machines with conflict resolution
4. **Real-Time Systems**: Streaming, buffering, and handling out-of-order events
5. **Type Safety**: TypeScript for end-to-end type checking across protocols
6. **Testing Patterns**: High-value test scenarios that actually verify behavior

## 📈 Metrics

- **226 tests** - All passing, comprehensive protocol validation
- **221 KB JS** - Production bundle (69 KB gzipped)
- **4 Phases** - Protocol adoption roadmap (110 hours of architectural work)
- **15 Creatures** - Each with 3 zoom levels, 260+ lines of ASCII art

## 🎨 Artistic Vision

Beyond the technical protocols, Mira maintains an artistic theme of deep-sea exploration:
- Terminal-based UI that feels like sonar equipment
- ASCII art creatures that reveal detail as you "zoom in"
- Personality-driven responses that reference actual marine biology
- Mood tracking that influences the character's behavior and art

## 📝 License

This is an experimental learning project exploring emerging AI agent protocols in production systems.

---

**Built with curiosity about how AI systems should communicate.**
