// Test fixture: a long-running parent that starts a long-running grandchild and records both PIDs.
// Usage: node process-tree.mjs <pid-file>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { setInterval } from 'node:timers';

const pidFile = process.argv[2];
const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
  stdio: 'ignore',
  windowsHide: true,
});

grandchild.once('spawn', () => {
  writeFileSync(pidFile, JSON.stringify({ parent: process.pid, grandchild: grandchild.pid }));
});

setInterval(() => {}, 1000);
