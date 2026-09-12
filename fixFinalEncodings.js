const fs = require('fs');

const fixRawMat = () => {
  let file = 'apps/frontend/src/components/raw-materials/RawMaterialCard.tsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/Registrar P.*rdida/, 'Registrar Pérdida');
  
  // Also, add IonIcon if missing
  if (!c.includes('import { pencilOutline }')) {
    c = c.replace("from '@ionic/react';", "from '@ionic/react';\nimport { pencilOutline } from 'ionicons/icons';\nimport { IonIcon } from '@ionic/react';");
  }
  c = c.replace(/\?\?<\/IonButton>/g, "<IonIcon icon={pencilOutline} slot=\"icon-only\" /></IonButton>");
  fs.writeFileSync(file, c, 'utf8');
}

const fixMov = () => {
  let file = 'apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/P.*?rdida/g, 'Pérdida');
  fs.writeFileSync(file, c, 'utf8');
}

fixRawMat();
fixMov();

// Fix Pos.tsx
let pos = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
pos = pos.replace(/Pago Mvil/g, 'Pago Móvil');
pos = pos.replace(/TelǸfono/g, 'Teléfono');
pos = pos.replace(/CǸdula/g, 'Cédula');
pos = pos.replace(/MǸtodo/g, 'Método');
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', pos, 'utf8');
