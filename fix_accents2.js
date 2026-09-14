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
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const map = {
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Ã‘': 'Ñ',
  'Â¿': '¿',
  'Â¡': '¡',
  'Ã\xAD': 'í',
  'Ã\x81': 'Á',
  'Ã‰': 'É',
  'Ã“': 'Ó',
  'Ãš': 'Ú',
  // specific targeted replacements
  'ProducciÃ³n': 'Producción',
  'FÃ¡brica': 'Fábrica',
  'descontarÃ¡': 'descontará',
  'automÃ¡ticamente': 'automáticamente',
  'segÃºn': 'según',
  'CatÃ¡logo': 'Catálogo',
  'HistÃ³rico': 'Histórico',
  'HistÃ³rica': 'Histórica',
  'InversiÃ³n': 'Inversión',
  'PÃ©rdidas': 'Pérdidas',
  'PÃ©rdida': 'Pérdida',
  'MÃnimo': 'Mínimo',
  'CategorÃa': 'Categoría',
  'DÃa': 'Día',
  'GarantÃa': 'Garantía',
  'vacÃo': 'vacío',
  'Â¿EstÃ¡s': '¿Estás',
  'DesaparecerÃ¡': 'Desaparecerá',
  'mantendrÃ¡': 'mantendrá',
  'OperaciÃ³n': 'Operación',
  'ConfiguraciÃ³n': 'Configuración',
  'MÃ¡s': 'Más',
  'MenÃº': 'Menú',
  'AtrÃ¡s': 'Atrás',
  'AÃ±adir': 'Añadir',
  'aÃ±adido': 'añadido',
  'Ã©xito': 'éxito',
  'dÃas': 'días',
  'LogÃstica': 'Logística',
  'ArtÃculos': 'Artículos',
  'ArtÃculo': 'Artículo',
  'cÃ³digo': 'código',
  'CÃ³digo': 'Código',
  'bÃ¡sico': 'básico',
  'BÃ¡sico': 'Básico'
};

const files = walk('apps/frontend/src');
let changedCount = 0;

files.forEach(f => {
  let original = fs.readFileSync(f, 'utf8');
  let content = original;
  
  Object.keys(map).forEach(bad => {
    content = content.split(bad).join(map[bad]);
  });

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed:', f);
    changedCount++;
  }
});

console.log(`Fixed ${changedCount} files.`);
