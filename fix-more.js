const fs = require('fs');
const path = require('path');

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
      let original = content;
      
      // Fix generic unknown chars
      content = content.replace(/fsico/g, "físico");
      content = content.replace(/Categora/g, "Categoría");
      content = content.replace(/Prdida/g, "Pérdida");
      content = content.replace(/Produccin/g, "Producción");
      content = content.replace(/Ã/g, "í"); // Wildcard fallback
      
      // Clean up others just in case
      content = content.replace(/f\\u00edsico/g, "físico");
      content = content.replace(/Producciǟn/g, "Producción");
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log("Fixed more:", fullPath);
      }
    }
  }
}

processDir('apps/frontend/src');
processDir('apps/backend/src');

