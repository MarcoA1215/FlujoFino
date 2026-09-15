const fs = require('fs');
const path = require('path');

const replacements = {
  "Ã¡": "á",
  "Ã©": "é",
  "Ã­": "í",
  "Ã³": "ó",
  "Ãº": "ú",
  "Ã±": "ñ",
  "Ã‰": "É",
  "Ã\u0081": "Á",
  "Ã\u0089": "É",
  "Ã\u008D": "Í",
  "Ã\u0093": "Ó",
  "Ã\u009A": "Ú",
  "Ã\u0091": "Ñ",
  "ǟ": "ó", // From the "Producciǟn" glitch earlier, just in case
  "sǟ": "sí" // From products.service.ts
};

// Also handle the invisible control chars if they exist
const manualFixes = [
  { bad: "vacÃ­o", good: "vacío" },
  { bad: "EnvÃ­o", good: "Envío" },
  { bad: "MÃ‰TODO", good: "MÉTODO" },
  { bad: "CatÃ¡logo", good: "Catálogo" },
  { bad: "PÃ©rez", good: "Pérez" },
  { bad: "TelÃ©fono", good: "Teléfono" },
  { bad: "MÃ©todo", good: "Método" },
  { bad: "DirecciÃ³n", good: "Dirección" },
  { bad: "MÃ³vil", good: "Móvil" },
  { bad: "MÃ­nimo", good: "Mínimo" },
  { bad: "RÃ¡pido", good: "Rápido" },
  { bad: "CotizaciÃ³n", good: "Cotización" },
  { bad: "Ãºtiles", good: "útiles" },
  { bad: "sÃ­ mismo", good: "sí mismo" },
  { bad: "hubiÃ©ramos", good: "hubiéramos" },
  { bad: "registrarÃ­amos aquÃ­", good: "registraríamos aquí" },
  { bad: "pÃ©rdida", good: "pérdida" }
];

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
      
      for (const fix of manualFixes) {
        content = content.split(fix.bad).join(fix.good);
      }
      
      for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log("Fixed:", fullPath);
      }
    }
  }
}

processDir('apps/frontend/src');
processDir('apps/backend/src');
processDir('packages/shared-types/src');

