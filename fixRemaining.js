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
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  c = c.replace(/Producci.*?n/g, 'Producción');
  c = c.replace(/Men.*?</g, 'Menú<'); // Menú
  c = c.replace(/Gesti.*?n/g, 'Gestión');
  c = c.replace(/Configuraci.*?n/g, 'Configuración');
  c = c.replace(/Cat.*?logo/g, 'Catálogo');

  if (c !== original) {
    fs.writeFileSync(f, c, 'utf8');
  }
});
