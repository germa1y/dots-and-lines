# How to Run Specialist Agents

## Quick Start

Each agent runs as a separate Claude Code session with a specific system prompt.

### Step 1: Open Multiple Terminals

You need 4 terminal windows:
- Terminal 1: Sage (Orchestrator)
- Terminal 2: Terra (Infrastructure)
- Terminal 3: Pixel (Frontend)
- Terminal 4: Ember (Backend)

### Step 2: Navigate to Project

In each terminal:
```bash
cd C:\Users\Jeremy\src\dots-and-lines
```

### Step 3: Launch Agents

**Terminal 1 - Sage (Orchestrator):**
```bash
claude --system-prompt "$(cat agents/sage.md | tail -n +100)"
```
Or paste the system prompt from `agents/sage.md` when starting Claude.

**Terminal 2 - Terra (First!):**
```bash
claude --system-prompt "$(cat agents/terra.md | tail -n +80)"
```

**Terminal 3 - Pixel:**
```bash
claude --system-prompt "$(cat agents/pixel.md | tail -n +70)"
```

**Terminal 4 - Ember:**
```bash
claude --system-prompt "$(cat agents/ember.md | tail -n +85)"
```

## Simpler Alternative: Copy-Paste Prompts

If the command-line approach doesn't work, just:

1. Open Claude Code: `claude`
2. Paste the agent's system prompt from their `.md` file
3. Tell them to start working

### Example First Message to Each Agent

**To Sage:**
```
You are Sage the orchestrator. Read agents/sage.md for your full instructions.
Check the status of all task files and tell me what each agent should work on first.
```

**To Terra:**
```
You are Terra the infrastructure engineer. Read agents/terra.md for your instructions.
Check tasks/infrastructure.md and start on the highest priority pending task.
```

**To Pixel:**
```
You are Pixel the frontend developer. Read agents/pixel.md for your instructions.
Check tasks/frontend.md and start on the highest priority pending task.
Wait for Terra to complete TASK-001 first.
```

**To Ember:**
```
You are Ember the backend developer. Read agents/ember.md for your instructions.
Check tasks/backend.md and start on the highest priority pending task.
Wait for Terra to complete TASK-001 first.
```

## Recommended Order

1. **Start Sage first** - Get the orchestrator view
2. **Start Terra second** - They do TASK-001 (folder structure)
3. **Wait for TASK-001 to complete**
4. **Start Pixel and Ember** - They can now work in parallel

## Monitoring Progress

In any terminal:
```bash
node tasks/scripts/status.js
```

Or ask Sage to report status.

## Communication Between Agents

Agents communicate via:
1. **Task files** - Status markers `[ ]`, `[~]`, `[x]`, `[!]`
2. **Blocker notes** - Comments in task files
3. **Matrix** (if set up) - Real-time chat

### Blocker Format in Task Files

When an agent is blocked:
```markdown
### TASK-005: Configure Firebase connection
- **Priority**: P0
- **Status**: blocked
- **Blocker**: Waiting for Terra to complete TASK-002 (Firebase project setup)
```

## Troubleshooting

### Agents stepping on each other's files
- Check agent scope in their `.md` file
- Sage should reassign if there's conflict

### Agent doesn't know what to do
- Point them to their task file
- Point them to their agent definition

### Progress not updating
- Remind agents to update task status `[~]` → `[x]`
- Run status script to see current state
