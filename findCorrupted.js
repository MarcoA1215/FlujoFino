const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('apps/frontend/src');
let found = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('\uFFFD')) { // Replacement character
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('\uFFFD')) {
        if (!found[file]) found[file] = [];
        found[file].push({ line: i + 1, text: line.trim() });
      }
    });
  }
});

console.log(JSON.stringify(found, null, 2));
