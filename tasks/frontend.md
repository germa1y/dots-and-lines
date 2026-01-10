# Frontend Tasks

UI, Canvas rendering, CSS, user interactions, and client-side game logic.

---

## Phase 1: Foundation

### TASK-003: Create base HTML structure
- **Priority**: P0
- **Source**: openspec/TASK-003
- **Status**: completed

Acceptance criteria:
- [x] index.html with viewport meta for mobile
- [x] Canvas element for game board
- [x] Container divs for UI screens (menu, lobby, game, game-over)
- [x] Firebase SDK included via CDN

### TASK-004: Implement mobile-first CSS foundation
- **Priority**: P0
- **Source**: openspec/TASK-004
- **Status**: completed

Acceptance criteria:
- [x] CSS reset and box-sizing
- [x] Responsive canvas sizing (max 100vw, 60vh)
- [x] CSS custom properties for colors
- [x] Hidden/visible screen states

---

## Phase 2: Core Game Board

### TASK-008: Implement Canvas setup and scaling
- **Priority**: P0
- **Source**: openspec/TASK-008
- **Status**: completed

Acceptance criteria:
- [x] Get canvas context in js/board.js
- [x] Calculate pixel ratio for sharp rendering
- [x] Handle canvas resize on window resize
- [x] Clear and redraw function

### TASK-009: Define game constants and grid math
- **Priority**: P0
- **Source**: openspec/TASK-009
- **Status**: completed

Acceptance criteria:
- [x] GRID_SIZE constant (5 boxes = 6 dots)
- [x] Dot positions calculated from canvas size
- [x] DOT_RADIUS, LINE_WIDTH constants
- [x] getDotPosition(row, col) helper

### TASK-010: Render dot grid
- **Priority**: P0
- **Source**: openspec/TASK-010
- **Status**: completed

Acceptance criteria:
- [x] Draw 6×6 dots on canvas
- [x] Consistent spacing for portrait layout
- [x] Visually distinct filled circles

### TASK-012: Implement tap/click detection
- **Priority**: P0
- **Source**: openspec/TASK-012
- **Status**: completed

Acceptance criteria:
- [x] Touch and mouse event listeners
- [x] Convert screen coords to canvas coords
- [x] Determine which line was tapped
- [x] getNearestLine(x, y) helper

### TASK-013: Draw lines on tap
- **Priority**: P0
- **Source**: openspec/TASK-013
- **Status**: completed

Acceptance criteria:
- [x] Mark line as owned by current player
- [x] Render line in player's color
- [x] Ignore taps on existing lines
- [x] Immediate visual feedback

### TASK-016: Fill completed boxes
- **Priority**: P0
- **Source**: openspec/TASK-016
- **Status**: completed

Acceptance criteria:
- [x] Set ownerId when box completed
- [x] Render semi-transparent fill in player color
- [x] Draw fill behind lines

### TASK-017: Implement local score tracking
- **Priority**: P0
- **Source**: openspec/TASK-017
- **Status**: completed

Acceptance criteria:
- [x] Track score per player
- [x] Increment on box completion
- [x] Display scores in HTML overlay

---

## Phase 3: Turn System

### TASK-020: Display current player indicator
- **Priority**: P0
- **Source**: openspec/TASK-020
- **Status**: completed

Acceptance criteria:
- [x] Highlight current player in scoreboard
- [x] Show "Your turn" prominently
- [x] Update on turn change

### TASK-023: Determine and display winner
- **Priority**: P0
- **Source**: openspec/TASK-023
- **Status**: completed

Acceptance criteria:
- [x] Compare scores of all players
- [x] Handle tie case
- [x] Show game over message with winner

---

## Phase 5: Lobby System

### TASK-036: Create landing page UI
- **Priority**: P0
- **Source**: openspec/TASK-036
- **Status**: completed

Acceptance criteria:
- [x] Name input field (pre-filled from localStorage)
- [x] "Create Game" button
- [x] "Join Game" button + code input
- [x] Mobile-friendly layout

### TASK-038: Create lobby screen UI
- **Priority**: P0
- **Source**: openspec/TASK-038
- **Status**: completed

Acceptance criteria:
- [x] Large, copyable game code display
- [x] List of joined players with colors
- [x] "Start Game" button (host only)
- [x] "Leave" button
- [x] "Waiting for players..." status

### TASK-044: Implement screen transitions
- **Priority**: P0
- **Source**: openspec/TASK-044
- **Status**: completed

Acceptance criteria:
- [x] Clean screen switching: menu → lobby → game → game-over
- [x] Hide/show appropriate containers
- [x] Maintain state during transitions

---


---

## Distributed from Backlog

### TASK-NEW: Implement feature X
- **Priority**: P1
- **Source**: manual
- **Status**: pending
- **Notes**: Needs design review first

Acceptance criteria:
- [ ] Define acceptance criteria


## Summary

| Status | Count |
|--------|-------|
| Pending | 0 |
| In Progress | 0 |
| Complete | 14 |
| Blocked | 0 |
