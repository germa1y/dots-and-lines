#!/usr/bin/env node

/**
 * Task Distribution Script
 *
 * Reads tasks from backlog.md and distributes them to domain-specific files
 * based on the "domain:" metadata in each task.
 *
 * Usage: node scripts/distribute.js
 *
 * Task format in backlog.md:
 * - [ ] TASK-XXX: Description
 *   - domain: frontend|backend|infrastructure
 *   - priority: P0|P1|P2
 *   - notes: Optional notes
 */

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '..');
const BACKLOG_FILE = path.join(TASKS_DIR, 'backlog.md');

const DOMAIN_FILES = {
  frontend: path.join(TASKS_DIR, 'frontend.md'),
  backend: path.join(TASKS_DIR, 'backend.md'),
  infrastructure: path.join(TASKS_DIR, 'infrastructure.md'),
};

// Parse a task block from backlog
function parseTask(lines) {
  const task = {
    title: '',
    domain: null,
    priority: 'P1',
    notes: '',
    raw: lines.join('\n'),
  };

  for (const line of lines) {
    if (line.match(/^- \[.\] TASK-/)) {
      task.title = line.replace(/^- \[.\] /, '').trim();
    } else if (line.includes('domain:')) {
      task.domain = line.split('domain:')[1].trim().toLowerCase();
    } else if (line.includes('priority:')) {
      task.priority = line.split('priority:')[1].trim().toUpperCase();
    } else if (line.includes('notes:')) {
      task.notes = line.split('notes:')[1].trim();
    }
  }

  return task;
}

// Format task for domain file
function formatTask(task) {
  const taskId = task.title.split(':')[0];
  const description = task.title.split(':').slice(1).join(':').trim();

  return `
### ${taskId}: ${description}
- **Priority**: ${task.priority}
- **Source**: manual
- **Status**: pending
${task.notes ? `- **Notes**: ${task.notes}` : ''}

Acceptance criteria:
- [ ] Define acceptance criteria
`;
}

// Append task to domain file
function appendToDomain(domain, taskContent) {
  const filePath = DOMAIN_FILES[domain];
  if (!filePath) {
    console.error(`Unknown domain: ${domain}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Find the Summary section and insert before it
  const summaryIndex = content.indexOf('## Summary');
  if (summaryIndex !== -1) {
    content = content.slice(0, summaryIndex) +
              '\n---\n\n## Distributed from Backlog\n' +
              taskContent + '\n\n' +
              content.slice(summaryIndex);
  } else {
    // Just append to end
    content += '\n---\n\n## Distributed from Backlog\n' + taskContent;
  }

  fs.writeFileSync(filePath, content);
  return true;
}

// Main
function main() {
  console.log('Task Distribution Script');
  console.log('========================\n');

  if (!fs.existsSync(BACKLOG_FILE)) {
    console.log('No backlog.md found. Nothing to distribute.');
    return;
  }

  const backlogContent = fs.readFileSync(BACKLOG_FILE, 'utf8');
  const lines = backlogContent.split('\n');

  let currentTask = [];
  let tasksProcessed = 0;
  let tasksByDomain = { frontend: 0, backend: 0, infrastructure: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of a new task
    if (line.match(/^- \[.\] TASK-/)) {
      // Process previous task if exists
      if (currentTask.length > 0) {
        const task = parseTask(currentTask);
        if (task.domain && DOMAIN_FILES[task.domain]) {
          const formatted = formatTask(task);
          if (appendToDomain(task.domain, formatted)) {
            console.log(`✓ ${task.title} → ${task.domain}.md`);
            tasksByDomain[task.domain]++;
            tasksProcessed++;
          }
        } else if (task.domain) {
          console.log(`✗ ${task.title} - unknown domain: ${task.domain}`);
        }
      }
      currentTask = [line];
    } else if (currentTask.length > 0 && line.startsWith('  ')) {
      // Continuation of current task (indented lines)
      currentTask.push(line);
    } else if (currentTask.length > 0 && line.trim() === '') {
      // End of task block
      // Process it
      const task = parseTask(currentTask);
      if (task.domain && DOMAIN_FILES[task.domain]) {
        const formatted = formatTask(task);
        if (appendToDomain(task.domain, formatted)) {
          console.log(`✓ ${task.title} → ${task.domain}.md`);
          tasksByDomain[task.domain]++;
          tasksProcessed++;
        }
      }
      currentTask = [];
    }
  }

  // Handle last task if file doesn't end with blank line
  if (currentTask.length > 0) {
    const task = parseTask(currentTask);
    if (task.domain && DOMAIN_FILES[task.domain]) {
      const formatted = formatTask(task);
      if (appendToDomain(task.domain, formatted)) {
        console.log(`✓ ${task.title} → ${task.domain}.md`);
        tasksByDomain[task.domain]++;
        tasksProcessed++;
      }
    }
  }

  console.log('\n------------------------');
  console.log(`Total distributed: ${tasksProcessed}`);
  console.log(`  Frontend: ${tasksByDomain.frontend}`);
  console.log(`  Backend: ${tasksByDomain.backend}`);
  console.log(`  Infrastructure: ${tasksByDomain.infrastructure}`);

  if (tasksProcessed > 0) {
    console.log('\nRemember to clear processed tasks from backlog.md!');
  } else {
    console.log('\nNo tasks with valid domain tags found in backlog.');
  }
}

main();
