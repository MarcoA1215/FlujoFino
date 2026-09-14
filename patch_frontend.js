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
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('apps/frontend/src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace onIonChange -> onIonInput inside <IonInput ...> tags
  // The regex ensures it only targets IonInput.
  content = content.replace(/(<\s*IonInput[^>]*?)onIonChange=/gs, '$1onIonInput=');
  
  // Replace logo.jpg -> logo.png
  content = content.replace(/logo\.jpg/g, 'logo.png');
  content = content.replace(/Logo\.jpg/g, 'logo.png');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched:', file);
    changedFiles++;
  }
});

console.log(`Done. Patched ${changedFiles} files.`);
