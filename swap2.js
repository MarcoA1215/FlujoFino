const fs = require('fs');
const file = 'apps/frontend/src/pages/Dashboard.tsx';
let text = fs.readFileSync(file, 'utf8');

const regex = /(<IonCol size="12" sizeMd="6">\s*<IonCard>\s*<IonCardHeader>\s*<IonCardTitle style=\{\{ fontSize: '1.2rem' \}\}>\s*<IonIcon icon=\{alertCircleOutline\} color="danger"[\s\S]*?<\/IonCol>)\s*(<IonCol size="12" sizeMd="6">\s*<IonCard>\s*<IonCardHeader>\s*<IonCardTitle style=\{\{ fontSize: '1.2rem' \}\}>\s*<IonIcon icon=\{alertCircleOutline\} color="warning"[\s\S]*?<\/IonCol>)/;

text = text.replace(regex, "$2\n\n$1");
fs.writeFileSync(file, text, 'utf8');
