import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';

const output = 'tmp/frontend-services.test.mjs';
await mkdir('tmp', { recursive: true });
try {
  await build({
    entryPoints: ['server/tests/frontend-services.ts'],
    outfile: output,
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    target: 'es2022',
    tsconfig: 'tsconfig.json',
  });
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', output], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(Error('Fallaron las pruebas de servicios Angular.')),
    );
  });
} finally {
  await rm(output, { force: true });
}
