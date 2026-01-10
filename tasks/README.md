# Task Coordination System

A simple file-based system for tracking tasks across different domains.

## Directory Structure

```
tasks/
├── README.md           # This file
├── backlog.md          # Unassigned/incoming tasks
├── frontend.md         # UI, Canvas, CSS, user interactions
├── backend.md          # Firebase, Firestore, Auth, data sync
├── infrastructure.md   # Hosting, deployment, security rules
└── scripts/
    └── distribute.js   # Script to move tasks from backlog to domains
```

## Workflow

1. **Add new tasks** to `backlog.md` (or directly to domain files)
2. **Run distribution** to categorize backlog tasks: `node scripts/distribute.js`
3. **Work on tasks** by marking them in progress: `- [~]`
4. **Complete tasks** by checking them off: `- [x]`

## Task Format

```markdown
### TASK-XXX: Short description
- **Priority**: P0/P1/P2
- **Source**: openspec/TASK-XXX or "manual"
- **Status**: pending | in-progress | blocked | done
- **Notes**: Any additional context

Acceptance criteria:
- [ ] Criterion 1
- [ ] Criterion 2
```

## Status Markers

| Marker | Meaning |
|--------|---------|
| `[ ]` | Pending |
| `[~]` | In Progress |
| `[x]` | Complete |
| `[!]` | Blocked |

## Quick Commands

```bash
# Add a task manually
echo "- [ ] TASK-XXX: Description" >> tasks/frontend.md

# Count tasks by status
grep -c '\[ \]' tasks/*.md    # Pending
grep -c '\[x\]' tasks/*.md    # Complete
grep -c '\[~\]' tasks/*.md    # In Progress

# View all in-progress tasks
grep -r '\[~\]' tasks/
```
