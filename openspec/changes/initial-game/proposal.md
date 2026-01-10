# Change: Dots and Lines - Initial Game Implementation

## Overview

**Project**: Dots and Lines - A mobile-friendly multiplayer strategy game based on the classic "Dots and Boxes"

**Platform**: Web (PWA) - Mobile-first responsive design, works on any device with a browser

**Tech Stack**: HTML5 Canvas + vanilla JavaScript

**Backend**: Firebase (Firestore + Anonymous Auth + Hosting)

**Visual Style**: Retro pixel art

---

## Business Value Analysis

### Who Benefits and How

#### Primary Persona: "The Remote Friend Group"
**Profile**: 2-4 friends or family members who live in different locations and want casual gaming together.

**Pain Points**:
- Video calls get repetitive; they want shared activities
- Most mobile games require everyone to download an app
- Coordinating game sessions is friction-heavy
- Complex games require too much commitment

**How This Helps**:
- Host sends a link + 6-character code via text/Discord
- Friends click link, enter code, playing within 30 seconds
- No app store, no accounts, no downloads
- Games last 5-10 minutes - perfect for quick sessions

#### Secondary Persona: "The Casual Strategist"
**Profile**: Person who enjoys puzzle/strategy games but doesn't want intense competition.

**Pain Points**:
- Chess/Go too complex for casual play
- Most casual games lack strategic depth
- Wants to play with specific people, not strangers

**How This Helps**:
- Simple rules (draw lines, complete boxes) learned in 1 minute
- Golden/penalty squares add strategic layer without complexity
- Private games with friends only (no random matchmaking)

#### Tertiary Persona: "The Developer Learning Modern Web"
**Profile**: Jeremy - practicing SDLC patterns with a real project.

**How This Helps**:
- End-to-end project: frontend, backend, real-time sync, deployment
- Firebase experience (Auth, Firestore, Hosting)
- Canvas API and game loop fundamentals
- Spec-driven development practice with OpenSpec

### What Problem It Solves

**Core Problem**: Playing simple games with remote friends has too much friction.

| Current State | Desired State |
|---------------|---------------|
| "Download this app" / "Create an account" | Click link, enter code, play |
| Games require same platform (iOS vs Android) | Works on any device with browser |
| Complex setup for multiplayer | Share 6-character code via text |
| App store updates, storage space | Always current, no install |

**The "Why"**: Social connection through play shouldn't require technical coordination. The best games disappear into the experience - setup should take seconds, not minutes.

### Priority Based on Value Delivered

| Feature | Priority | Value Rationale |
|---------|----------|-----------------|
| 2-player working game | P0 (Critical) | Core value prop - can't demo without it |
| Real-time sync | P0 (Critical) | Multiplayer is the entire point |
| Join via code | P0 (Critical) | Frictionless onboarding is key differentiator |
| Mobile-responsive layout | P0 (Critical) | Primary use case is phone-to-phone |
| 3-4 player support | P1 (High) | Expands use cases significantly |
| Golden/penalty squares | P1 (High) | Strategic depth, differentiates from plain Dots & Boxes |
| Banked turns UI | P1 (High) | Required for golden squares to work |
| Pixel art polish | P2 (Medium) | Nice to have, but functional > pretty for MVP |
| Sound effects | P2 (Medium) | Adds feel, not core functionality |
| PWA install prompt | P3 (Low) | Convenience, not required |
| Offline support | P3 (Low) | Real-time game needs connectivity anyway |

### What Happens If We Don't Build This

**Impact**: Low external impact (hobby project), but:
- Miss opportunity to practice Firebase real-time patterns
- Continue defaulting to "just do a video call" with remote friends
- Lose momentum on SDLC learning (spec-driven development)

**Alternatives**:
- Use existing apps (but none have the frictionless web + special squares combo)
- Play different games (but few work across iOS/Android without installs)
- Don't play (status quo, mild social friction)

### Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to first move | < 60 seconds | From clicking link to drawing first line |
| Game completion rate | > 80% | Games reaching "finished" status vs abandoned |
| Return sessions | 3+ games per user | Anonymous user ID tracking in Firestore |
| Cross-device play | Works on iOS Safari + Android Chrome | Manual testing on real devices |
| Real-time latency | < 500ms | Time from move to other player seeing it |
| Friends invited | At least 2 external players | Manual tracking during testing |

---

## Why

Classic pen-and-paper games like Dots and Boxes are timeless but lack good multiplayer implementations that work across devices without friction. Most existing versions are either single-player against AI, require app downloads, or have outdated UX. This project creates a frictionless, web-based multiplayer version with strategic twists (golden/penalty squares) that add depth beyond the original game.

## Game Rules

### Core Mechanics
1. **Grid**: 5×5 boxes (6×6 dots) displayed in portrait orientation
2. **Players**: 2-4 players, each assigned a unique color
3. **Turns**: Round-robin, no per-turn timer (but 30s timeout for disconnected players)
4. **Move**: Tap/click between two adjacent dots to draw a line (horizontal or vertical)
5. **Scoring**: Complete a box → +1 point + immediate extra turn
6. **Win Condition**: Game ends when all boxes filled; highest score wins

### Player Colors
Fixed palette that avoids confusion with special square markers:
| Player | Color | Hex |
|--------|-------|-----|
| 1 | Blue | #3B82F6 |
| 2 | Green | #22C55E |
| 3 | Purple | #A855F7 |
| 4 | Orange | #F97316 |

*Note: Yellow and red are reserved for golden/penalty square markers*

### Special Squares

| Type | Appearance | Effect |
|------|------------|--------|
| **Golden Square** | Gold/yellow interior marker | Completing banks a bonus turn (usable anytime before ending turn) |
| **Penalty Square** | Red interior marker | Completing immediately forfeits turn (no chain, no extra move) |
| **Normal Square** | No marker | Standard rules (complete = +1 point + extra turn) |

### Special Square Placement
- 1-2 Golden squares per game (randomly placed, not corners)
- 1-2 Penalty squares per game (randomly placed, not adjacent to golden)
- Positions revealed at game start (visible to all players)

### Banked Bonus Turn Rules
- Earned by completing a golden square
- Stored until player chooses to use it (or turn ends)
- Can hold multiple banked turns
- Must use before explicitly ending turn
- Displayed as counter in player's UI

### Edge Case: Multiple Special Squares
If one line completes multiple boxes with different types:
- **Penalty + Normal**: Penalty wins → turn ends immediately (both boxes scored)
- **Penalty + Golden**: Penalty wins → turn ends, but golden turn is still banked
- **Golden + Normal**: Both effects apply → extra turn + banked turn

## Technical Architecture

### Tech Stack
```
Frontend:     HTML5 Canvas + vanilla JavaScript (no framework)
Styling:      CSS with mobile-first responsive design
Backend:      Firebase Firestore (real-time database)
Auth:         Firebase Anonymous Auth
Hosting:      Firebase Hosting (free tier, includes SSL)
Build:        None required (vanilla JS) or optional Vite for dev server
```

### Firebase Firestore Structure
```
games/
  {gameId}/
    code: "ABC123"                    # 6-char join code
    status: "waiting" | "active" | "finished"
    hostId: "uid1"                    # Current host (for migration)
    gridSize: 5
    players: [
      { id: "uid1", name: "Player 1", color: "#3B82F6", score: 0, bankedTurns: 0 }
    ]
    currentPlayerIndex: 0
    lines: [
      { x1: 0, y1: 0, x2: 1, y2: 0, playerId: "uid1" }  // horizontal line
    ]
    boxes: [
      { x: 0, y: 0, ownerId: null, type: "normal" | "golden" | "penalty" }
    ]
    specialSquares: {
      golden: [{ x: 2, y: 2 }],
      penalty: [{ x: 1, y: 3 }]
    }
    createdAt: timestamp
    updatedAt: timestamp
    lastActivity: timestamp           # For cleanup of abandoned games
```

### Game Cleanup
- Games in "waiting" status with `lastActivity` > 24 hours are eligible for deletion
- Cleanup can be triggered by Firebase Cloud Function (scheduled) or client-side on app launch
- For MVP: client-side cleanup when creating/joining games (query and delete stale games)

### Web Project Structure
```
dots-and-lines/
├── index.html                 # Main entry point
├── css/
│   └── styles.css            # Mobile-first responsive styles
├── js/
│   ├── app.js                # App initialization, routing
│   ├── firebase.js           # Firebase config & helpers
│   ├── game.js               # Game logic & state management
│   ├── board.js              # Canvas rendering & input handling
│   ├── lobby.js              # Lobby management
│   └── ui.js                 # UI updates & screen transitions
├── assets/
│   ├── sprites/              # Pixel art assets (PNG)
│   ├── fonts/                # Pixel font files
│   └── audio/                # Sound effect files (MP3/WAV)
├── firebase.json             # Firebase hosting config
├── firestore.rules           # Security rules
└── manifest.json             # PWA manifest
```

### State Synchronization Flow
```
Player taps/clicks to draw line
    ↓
Validate move locally (is line available? is it my turn?)
    ↓
Write to Firestore (add line to array)
    ↓
Firestore onSnapshot triggers on all clients
    ↓
All clients receive updated game state
    ↓
Re-render board, check for box completions
    ↓
Update turn (handle extra turns, penalties, banked turns)
```

## User Flow

### Landing Page
1. **Enter Name** → Prompted on first visit, stored in localStorage
2. **Create Game** → Generate game code, enter lobby as host
3. **Join Game** → Enter game code, join lobby

### Lobby
1. Host sees game code to share (large, copyable)
2. Players join and appear in list (2-4 players)
3. Host can start when 2+ players present
4. Show player colors and names

### Gameplay
1. Board displays with dots, existing lines, completed boxes
2. Current player highlighted in scoreboard
3. Tap/click between two adjacent dots to draw line
4. Visual feedback for: line drawn, box completed, turn change
5. Score display for all players
6. "End Turn" / "Use Banked Turn" buttons when applicable
7. Indicator for banked bonus turns

### Game Over
1. Final scores displayed
2. Winner announcement (or tie declaration)
3. **"Play Again"** → Creates new game, same players auto-joined, new special square positions
4. **"Main Menu"** → Returns to start, game document marked as finished

## Impact

### New Files
| File | Purpose |
|------|---------|
| `index.html` | Single-page app entry point |
| `css/styles.css` | Mobile-first responsive styling |
| `js/*.js` | Game logic, Firebase integration, rendering |
| `assets/*` | Pixel art sprites, fonts, audio |
| `firebase.json` | Hosting configuration |
| `firestore.rules` | Security rules for multiplayer validation |

### External Dependencies
- Firebase project (Firestore + Anonymous Auth + Hosting)
- Firebase JavaScript SDK (loaded via CDN or npm)
- No build tools required (vanilla JS)

### Technical Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vanilla JS | Simplicity, no build step, learning fundamentals |
| Rendering | HTML5 Canvas | Pixel-perfect control, good for grid games |
| Firebase SDK | Official JS SDK | Well-documented, real-time listeners built-in |
| Authentication | Anonymous Auth | Zero friction; user just enters name |
| Hosting | Firebase Hosting | Free tier, automatic SSL, easy deploy |
| PWA | Optional | Can add manifest later for "install" capability |

## Constraints

### Mobile-First Layout
- Grid must fit upper 60-70% of viewport
- Bottom area for: scores, current player indicator, banked turns, action buttons
- Touch targets minimum 44px for accessibility
- Responsive: works on phones, tablets, and desktop

### Firebase Considerations
- Free tier: 50K reads/day, 20K writes/day (sufficient for hobby)
- Security rules must validate moves server-side (prevent cheating)
- Handle offline/reconnection gracefully (show connection status)

### Pixel Art Style
- Limited color palette (16-32 colors)
- Consistent pixel density across assets
- CSS `image-rendering: pixelated` for crisp scaling

### Browser Support
- Modern browsers only (Chrome, Safari, Firefox, Edge)
- ES6+ JavaScript (no IE11 support needed)
- Touch and mouse input supported

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Platform | Web (PWA) - works on iOS, Android, desktop |
| Framework | Vanilla JS + Canvas (no React/Vue) |
| Authentication | Anonymous Firebase Auth (zero friction) |
| Matchmaking | Code-based only for MVP (random matchmaking deferred) |
| Reconnection | 30s timeout then skip turn; host auto-migrates if needed |
| Firebase integration | Official JS SDK |
| Sound style | Minimal SFX (not chiptune) |
| Player names | Prompted on first visit, stored in localStorage |
| Game expiry | Abandoned "waiting" games cleaned up after 24 hours |

## Open Questions

None - all major decisions resolved.

## Success Criteria

### MVP (Minimum Viable)
- [ ] 2-player game works end-to-end over internet
- [ ] Basic grid renders with dots and lines on Canvas
- [ ] Turn-based play with Firestore real-time sync
- [ ] Score tracking and winner detection
- [ ] Mobile-responsive layout (tested on iPhone + Android)
- [ ] Shareable game code for joining

### Full Initial Release
- [ ] 2-4 player support
- [ ] Golden and penalty squares implemented
- [ ] Banked bonus turns working
- [ ] Pixel art visuals complete
- [ ] Minimal sound effects
- [ ] Lobby system with player list
- [ ] Deployed to Firebase Hosting with custom subdomain
