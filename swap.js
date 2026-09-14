const fs = require('fs');
const file = 'apps/frontend/src/pages/Dashboard.tsx';
let text = fs.readFileSync(file, 'utf8');

const regex1 = /<IonCol size="12" sizeMd="6">[\s\S]*?Insumos por Comprar[\s\S]*?<\/IonCol>/;
const match1 = text.match(regex1)[0];

const regex2 = /<IonCol size="12" sizeMd="6">[\s\S]*?Productos por Fabricar[\s\S]*?<\/IonCol>/;
const match2 = text.match(regex2)[0];

text = text.replace(match1, 'TOKEN_1').replace(match2, 'TOKEN_2');
text = text.replace('TOKEN_1', match2).replace('TOKEN_2', match1);

fs.writeFileSync(file, text, 'utf8');
