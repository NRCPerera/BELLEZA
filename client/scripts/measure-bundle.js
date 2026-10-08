import { readdirSync, readFileSync } from 'node:fs';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const files = readdirSync(new URL('../dist/assets/', import.meta.url))
  .filter((file) => /\.(js|css)$/.test(file))
  .map((file) => {
    const buffer = readFileSync(new URL(`../dist/assets/${file}`, import.meta.url));
    return { file, raw: buffer.length, gzip: gzipSync(buffer).length, brotli: brotliCompressSync(buffer).length };
  })
  .sort((a, b) => b.raw - a.raw);

const totals = files.reduce((sum, item) => ({
  raw: sum.raw + item.raw,
  gzip: sum.gzip + item.gzip,
  brotli: sum.brotli + item.brotli,
}), { raw: 0, gzip: 0, brotli: 0 });

console.log(JSON.stringify({ totals, files }, null, 2));
