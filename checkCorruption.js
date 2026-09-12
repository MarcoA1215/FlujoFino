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

let issues = [];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (c.includes('') || c.includes('??') || c.match(/[a-zA-Z][a-zA-Z]/) || c.match(/[a-zA-Z]\?[a-zA-Z]/)) {
    issues.push(f);
  }
});
console.log(issues.join('\n'));
