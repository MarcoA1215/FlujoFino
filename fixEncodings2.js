const fs = require('fs');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = dir + '/' + file;
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) { }
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

  // Fix known "??</IonButton>"
  if (content.includes('??</IonButton>')) {
      if(!content.includes('pencilOutline')) {
          content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'ionicons\/icons';/, (m, p1) => {
              return `import { ${p1}, pencilOutline } from 'ionicons/icons';`;
          });
      }
      content = content.replace(/\?\?<\/IonButton>/g, "<IonIcon icon={pencilOutline} slot=\"icon-only\" /></IonButton>");
  }

  // Also in some files we have '' which might be represented differently.
  // I'll replace any remaining '??' that stand alone as button text.
  content = content.replace(/>\?\?</g, "><IonIcon icon={pencilOutline} slot=\"icon-only\" /><");
  
  if (original !== content) {
    fs.writeFileSync(f, content, 'utf8');
  }
});
