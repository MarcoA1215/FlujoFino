const fs = require('fs');
const path = require('path');

let found = false;

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes("node_modules") && !fullPath.includes(".git") && !fullPath.includes("dist")) {
        processDir(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('\uFFFD')) {
        console.log("Found in:", fullPath);
        found = true;
      }
    }
  }
}

processDir('apps/frontend/src');
processDir('apps/backend/src');
if (!found) console.log("Clean!");
