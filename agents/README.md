# Specialist Agents

This directory contains agent definitions for parallel development.

## Agent Roster

| Agent | Character | Domain | Task File |
|-------|-----------|--------|-----------|
| Pixel | Creative frontend dev | UI, Canvas, CSS | tasks/frontend.md |
| Ember | Firebase specialist | Firestore, Auth, sync | tasks/backend.md |
| Terra | DevOps engineer | Hosting, deployment | tasks/infrastructure.md |
| Sage | Orchestrator | Coordination, planning | tasks/*.md |

## Directory Structure

```
agents/
├── README.md           # This file
├── pixel.md            # Frontend agent definition
├── ember.md            # Backend agent definition
├── terra.md            # Infrastructure agent definition
├── sage.md             # Orchestrator agent definition
└── run-agent.md        # How to run agents
```

## How Agents Coordinate

1. **Sage (Orchestrator)** assigns tasks by updating task files
2. **Specialists** check their task files for `[ ]` pending items
3. **Specialists** mark tasks `[~]` when starting, `[x]` when done
4. **Specialists** communicate blockers via Matrix or status files
5. **Sage** monitors progress and resolves conflicts

## Running an Agent

See `run-agent.md` for instructions on launching agents with Claude Code.
