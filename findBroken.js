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
  let lines = c.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('')) {
      console.log(`${f}:${i+1}: ${line.trim()}`);
    }
  });
});
