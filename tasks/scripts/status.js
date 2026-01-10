#!/usr/bin/env node

/**
 * Task Status Report Script
 *
 * Generates a summary of task status across all domain files.
 *
 * Usage: node scripts/status.js
 */

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '..');

const DOMAIN_FILES = {
  frontend: path.join(TASKS_DIR, 'frontend.md'),
  backend: path.join(TASKS_DIR, 'backend.md'),
  infrastructure: path.join(TASKS_DIR, 'infrastructure.md'),
};

const STATUS_PATTERNS = {
  pending: /- \[ \]/g,
  inProgress: /- \[~\]/g,
  complete: /- \[x\]/g,
  blocked: /- \[!\]/g,
};

function countStatus(content) {
  const counts = {};
  for (const [status, pattern] of Object.entries(STATUS_PATTERNS)) {
    const matches = content.match(pattern);
    counts[status] = matches ? matches.length : 0;
  }
  return counts;
}

function main() {
  console.log('Task Status Report');
  console.log('==================\n');

  const totals = { pending: 0, inProgress: 0, complete: 0, blocked: 0 };
  const results = [];

  for (const [domain, filePath] of Object.entries(DOMAIN_FILES)) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ ${domain}.md not found`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const counts = countStatus(content);

    results.push({ domain, ...counts });

    for (const status of Object.keys(totals)) {
      totals[status] += counts[status];
    }
  }

  // Print table
  console.log('Domain          | Pending | In Prog | Complete | Blocked');
  console.log('----------------|---------|---------|----------|--------');

  for (const r of results) {
    const domain = r.domain.padEnd(15);
    const pending = String(r.pending).padStart(7);
    const inProg = String(r.inProgress).padStart(7);
    const complete = String(r.complete).padStart(8);
    const blocked = String(r.blocked).padStart(7);
    console.log(`${domain} |${pending} |${inProg} |${complete} |${blocked}`);
  }

  console.log('----------------|---------|---------|----------|--------');
  const tPending = String(totals.pending).padStart(7);
  const tInProg = String(totals.inProgress).padStart(7);
  const tComplete = String(totals.complete).padStart(8);
  const tBlocked = String(totals.blocked).padStart(7);
  console.log(`TOTAL           |${tPending} |${tInProg} |${tComplete} |${tBlocked}`);

  // Progress bar
  const total = totals.pending + totals.inProgress + totals.complete + totals.blocked;
  const pct = total > 0 ? Math.round((totals.complete / total) * 100) : 0;
  const filled = Math.round(pct / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

  console.log(`\nProgress: [${bar}] ${pct}%`);
  console.log(`\nCompleted: ${totals.complete}/${total} tasks`);
}

main();
