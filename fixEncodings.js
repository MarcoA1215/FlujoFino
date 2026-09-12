const fs = require('fs');
const glob = require('glob'); // Note: we might not have glob, let's use a recursive function

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = dir + '/' + file;
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return filelist;
      }
    }
  });
  return filelist;
};

const files = walkSync('apps/frontend/src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Accents & specific words
  content = content.replace(/M.todo/g, 'Método');
  content = content.replace(/Tel.fono/g, 'Teléfono');
  content = content.replace(/C.dula/g, 'Cédula');
  content = content.replace(/M.vil/g, 'Móvil');
  content = content.replace(/Inversi.n/g, 'Inversión');
  content = content.replace(/K.rdex/g, 'Kárdex');
  content = content.replace(/P.rdida/g, 'Pérdida');
  content = content.replace(/p.rdida/g, 'pérdida');
  content = content.replace(/P\?rdida/g, 'Pérdida');
  
  content = content.replace(/M\?todo/g, 'Método');
  content = content.replace(/Tel\?fono/g, 'Teléfono');
  content = content.replace(/C\?dula/g, 'Cédula');
  content = content.replace(/M\?vil/g, 'Móvil');

  // Any other random ``
  content = content.replace(//g, 'ó'); // fallback, mostly 'ó' in "Móvil", "Método"(no), etc. Just manual is better.

  // Icons missing '??' -> usually pencil icon for edit name
  if (content.includes('??</IonButton>')) {
      if(!content.includes('pencilOutline')) {
          content = content.replace(/from '@ionic\/react';/g, "from '@ionic/react';\nimport { pencilOutline } from 'ionicons/icons';");
          content = content.replace(/from 'ionicons\/icons';/g, ", pencilOutline } from 'ionicons/icons';");
      }
      content = content.replace(/\?\?<\/IonButton>/g, "<IonIcon icon={pencilOutline} slot=\"icon-only\" /></IonButton>");
  }
  
  if (original !== content) {
    fs.writeFileSync(f, content, 'utf8');
  }
});
