# Infrastructure Tasks

Hosting, deployment, security rules, project setup, and DevOps.

---

## Phase 1: Foundation

### TASK-001: Create project folder structure
- **Priority**: P0
- **Source**: openspec/TASK-001
- **Status**: complete

Acceptance criteria:
- [x] Create dots-and-lines/ with subdirectories
- [x] Subdirs: css/, js/, assets/sprites/, assets/audio/
- [x] Create placeholder files: index.html, css/styles.css, js/app.js

### TASK-007: Set up local development server
- **Priority**: P0
- **Source**: openspec/TASK-007
- **Status**: pending

Acceptance criteria:
- [ ] Install VS Code Live Server (or npx serve)
- [ ] Verify hot reload works
- [ ] Test on localhost from phone (same network)

---

## Phase 6: MVP Deployment

### TASK-045: Configure Firebase Hosting
- **Priority**: P0
- **Source**: openspec/TASK-045
- **Status**: pending

Acceptance criteria:
- [ ] Create firebase.json with hosting config
- [ ] Set public directory
- [ ] Configure SPA rewrites if needed

### TASK-046: Deploy to Firebase Hosting
- **Priority**: P0
- **Source**: openspec/TASK-046
- **Status**: pending

Acceptance criteria:
- [ ] Run firebase deploy --only hosting
- [ ] Verify deployment successful
- [ ] Note the public URL

### TASK-047: Test on iPhone Safari
- **Priority**: P0
- **Source**: openspec/TASK-047
- **Status**: pending

Acceptance criteria:
- [ ] Open deployed URL on iPhone
- [ ] Test full game flow
- [ ] Check touch responsiveness
- [ ] Note iOS-specific issues

### TASK-048: Test on Android Chrome
- **Priority**: P0
- **Source**: openspec/TASK-048
- **Status**: pending

Acceptance criteria:
- [ ] Open deployed URL on Android
- [ ] Test full game flow
- [ ] Check touch responsiveness
- [ ] Note Android-specific issues

### TASK-049: Test cross-device multiplayer
- **Priority**: P0
- **Source**: openspec/TASK-049
- **Status**: pending

Acceptance criteria:
- [ ] Create game on one device
- [ ] Join on different device
- [ ] Play full game to completion
- [ ] Verify real-time sync

### TASK-050: Fix critical cross-browser issues
- **Priority**: P0
- **Source**: openspec/TASK-050
- **Status**: pending

Acceptance criteria:
- [ ] Address blocking issues from testing
- [ ] Core gameplay works on all browsers

---

## Phase 11: Security & Cleanup

### TASK-079: Write Firestore security rules
- **Priority**: P1
- **Source**: openspec/TASK-079
- **Status**: pending

Acceptance criteria:
- [ ] Only authenticated users can read/write
- [ ] Players can only modify their games
- [ ] Validate move is legal
- [ ] Prevent score manipulation

### TASK-080: Test security rules
- **Priority**: P1
- **Source**: openspec/TASK-080
- **Status**: pending

Acceptance criteria:
- [ ] Attempt invalid moves from console
- [ ] Verify rules reject unauthorized writes
- [ ] Test edge cases

### TASK-081: Implement game cleanup
- **Priority**: P1
- **Source**: openspec/TASK-081
- **Status**: pending

Acceptance criteria:
- [ ] Query games > 24 hours in "waiting"
- [ ] Delete stale games
- [ ] Log cleanup activity

### TASK-082: Add rate limiting awareness
- **Priority**: P1
- **Source**: openspec/TASK-082
- **Status**: pending

Acceptance criteria:
- [ ] Track write frequency
- [ ] Debounce rapid inputs if needed
- [ ] Stay within Firebase free tier

---


---

## Distributed from Backlog

### TASK-TEST-001: Verify task distribution system works
- **Priority**: P0
- **Source**: manual
- **Status**: pending
- **Notes**: This is a test task to verify the workflow

Acceptance criteria:
- [ ] Define acceptance criteria


## Summary

| Status | Count |
|--------|-------|
| Pending | 11 |
| In Progress | 0 |
| Complete | 1 |
| Blocked | 0 |
