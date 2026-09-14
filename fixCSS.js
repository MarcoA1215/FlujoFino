const fs = require('fs');

let cssPath = 'apps/frontend/src/theme.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');
const cssFix = `
/* Prevenir que las palabras se rompan verticalmente letra por letra en pantallas angostas */
ion-badge, ion-button, th, td, ion-card-title, h1, h2, h3, p {
  word-break: normal !important;
  overflow-wrap: break-word !important;
}
.ion-text-wrap {
  word-break: normal !important;
}
`;
if (!cssContent.includes('word-break: normal')) {
  fs.writeFileSync(cssPath, cssContent + '\n' + cssFix, 'utf8');
}
