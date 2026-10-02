const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'client', 'src');

const replacements = [
  ['text-gray-900', 'text-ink-900'],
  ['text-gray-800', 'text-ink-900'],
  ['text-gray-700', 'text-ink-700'],
  ['text-gray-600', 'text-ink-500'],
  ['text-gray-500', 'text-ink-500'],
  ['text-gray-400', 'text-ink-500'],
  ['text-gray-300', 'text-ink-200'],
  ['bg-gray-900', 'bg-primary-900'],
  ['bg-gray-800', 'bg-primary-800'],
  ['bg-gray-100', 'bg-ink-100'],
  ['bg-gray-50/50', 'bg-background'],
  ['bg-gray-50', 'bg-background'],
  ['border-gray-200', 'border-ink-100'],
  ['border-gray-100', 'border-ink-100'],
  ['border-gray-800', 'border-primary-800'],
  ['divide-gray-50', 'divide-ink-100'],
  ['divide-gray-100', 'divide-ink-100'],
  ['hover:bg-gray-50/50', 'hover:bg-primary-50/30'],
  ['hover:bg-gray-50', 'hover:bg-primary-50'],
  ['hover:bg-gray-100', 'hover:bg-ink-100'],
  ['hover:bg-gray-800', 'hover:bg-white/10'],
  ['hover:text-gray-600', 'hover:text-ink-700'],
  ['hover:text-gray-900', 'hover:text-ink-900'],
];

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...walk(p));
    } else if (entry.isFile() && (p.endsWith('.jsx') || p.endsWith('.js'))) {
      results.push(p);
    }
  }
  return results;
}

let count = 0;
for (const file of walk(srcDir)) {
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    count++;
    console.log('Updated:', path.relative(srcDir, file));
  }
}
console.log(`\nDone. ${count} files updated.`);
