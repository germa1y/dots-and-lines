# Agent Context - MUST READ BEFORE WORKING

**Last Updated**: 2026-01-09

## Critical: Existing Code Reference

There is an EXISTING working Dots & Boxes game at:
- **GitHub**: https://github.com/germa1y/Dots-Boxes
- **Raw code**: https://raw.githubusercontent.com/germa1y/Dots-Boxes/main/index.html

### What Already Exists (DO NOT REBUILD):
- ✅ Canvas rendering (10x10 grid, 440x440px)
- ✅ Turn system (alternating players)
- ✅ Score tracking (P1/P2 scores)
- ✅ 2-player multiplayer
- ✅ Firebase Realtime Database integration
- ✅ Room codes for joining games
- ✅ Real-time sync via onValue() listeners

### Use Existing Code As Reference
When implementing features, first check the existing code structure:
```javascript
// Existing patterns to follow:
- Firebase path: games/{roomId}
- Canvas: 440x440, 10x10 grid
- Colors: Player 1 = blue, Player 2 = red
- State: lines[], squares[], currentPlayer, scores
```

---

## New Features to Implement

These are NOT in the existing code and must be built:

### 1. Enhanced Input Mechanics (NEW)
**Single-click/tap mode:**
- First click ACTIVATES a dot (show pulsating animation)
- Activated dot highlighted with animated color
- Second click on ADJACENT dot completes the line
- Invalid clicks (non-adjacent, already connected) are ignored

**Drag & drop mode:**
- If drag detected on first touch, enter drag mode
- Line follows touch/cursor position
- Line SNAPS to legal connecting dot when close enough
- Release completes the line if snapped to valid dot
- Release without valid snap cancels the action

### 2. Special Squares
- Golden squares (1-2 per game): Bank a bonus turn
- Penalty squares (1-2 per game): Forfeit turn on completion
- Visual markers visible before box completion

### 3. 3-4 Player Support
- Extend from 2 players to 2-4 players
- Color palette: Blue, Green, Purple, Orange
- Round-robin turn order

### 4. Banked Turns UI
- Display banked turn count per player
- "Use Banked Turn" / "End Turn" buttons

### 5. Lobby System
- Player name entry
- Room creation with shareable code
- Player list with colors
- Host "Start Game" button

### 6. Visual Polish
- Pixel art aesthetic
- 16-32 color palette
- Retro pixel font
- Animations for line draw, box complete, turn change

### 7. Sound Effects
- Minimal SFX (not chiptune)
- Line draw, box complete, game over sounds
- Mute toggle

---

## Project Structure

```
C:\Users\Jeremy\src\dots-and-lines\
├── index.html          # Main game (to be created from reference)
├── css/
│   └── styles.css      # Mobile-first responsive
├── js/
│   ├── app.js          # App initialization
│   ├── firebase.js     # Firebase config (Realtime DB)
│   ├── game.js         # Game logic, state management
│   ├── board.js        # Canvas rendering, input handling
│   ├── lobby.js        # Lobby management
│   └── ui.js           # UI updates, transitions
├── assets/
│   ├── sprites/        # Pixel art
│   ├── fonts/          # Pixel font
│   └── audio/          # Sound effects
├── agents/             # Agent definitions
├── tasks/              # Task files
└── openspec/           # Requirements
```

---

## Deployment Targets

### Primary: Firebase Hosting
- URL: TBD (firebase project)
- Deploy: `npx firebase deploy --only hosting`

### Secondary: GitHub Pages
- Repo: germa1y/Dots-Boxes (or new repo)
- Domain: simul8rs.com subdomain (TBD)

---

## Communication

Post ALL status updates to Matrix:
```bash
node agents/matrix/post.js "AgentName" "Your message"
```

Room: dots-and-lines-agents

---

## Task Priority (Updated)

Since core game exists, focus on NEW features:

| Priority | Feature | Agent |
|----------|---------|-------|
| P0 | Clone/adapt existing code structure | Terra |
| P0 | Enhanced input (click + drag) | Pixel |
| P1 | Special squares | Ember + Pixel |
| P1 | 3-4 player support | Ember |
| P1 | Lobby system | Pixel + Ember |
| P2 | Pixel art styling | Pixel |
| P2 | Sound effects | Pixel |

---

## Commands for Agents

```bash
# Post to Matrix
node agents/matrix/post.js "AgentName" "message"

# Check task status
node tasks/scripts/status.js

# Firebase deploy (when ready)
npx firebase deploy --only hosting

# Git operations
git add . && git commit -m "message" && git push
```

---

## Questions? Blockers?

Post to Matrix and Sage will coordinate.
