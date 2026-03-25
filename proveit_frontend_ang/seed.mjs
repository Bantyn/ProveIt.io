import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const backendDir = resolve(currentDir, '../proveit_backend_ang');
const backendSeedPath = resolve(backendDir, 'seed.js');

const child = spawn(process.execPath, [backendSeedPath], {
  cwd: backendDir,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to start backend seed script:', error.message);
  process.exit(1);
});
