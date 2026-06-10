import { cp, mkdir, rm } from 'node:fs/promises';

const distDir = new URL('../dist/', import.meta.url);
const srcDir = new URL('../src/', import.meta.url);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(srcDir, distDir, { recursive: true });

console.log('Build complete: dist/');
