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

  // Use a more aggressive regex for anything resembling the words
  content = content.replace(/M[^a-z]todo/g, 'Método');
  content = content.replace(/Tel[^a-z]fono/g, 'Teléfono');
  content = content.replace(/C[^a-z]dula/g, 'Cédula');
  content = content.replace(/M[^a-z]vil/g, 'Móvil');
  content = content.replace(/Inversi[^a-z]n/g, 'Inversión');
  content = content.replace(/K[^a-z]rdex/g, 'Kárdex');
  content = content.replace(/P[^a-z]rdida/g, 'Pérdida');
  
  if (original !== content) {
    fs.writeFileSync(f, content, 'utf8');
  }
});
