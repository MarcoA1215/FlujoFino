const fs = require('fs');

function paginateMovements() {
  const file = 'apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';");
  text = text.replace("IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';", "IonList, IonItem, IonLabel, IonBadge, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react';");
  
  text = text.replace("const [movements, setMovements] = useState<Movement[]>([]);", "const [movements, setMovements] = useState<Movement[]>([]);\n  const [displayCount, setDisplayCount] = useState(15);\n\n  const paginatedMovements = movements.slice(0, displayCount);\n\n  const loadMore = (e: any) => {\n    setTimeout(() => {\n      setDisplayCount(prev => prev + 15);\n      e.target.complete();\n    }, 500);\n  };");
  
  text = text.replace("{movements.map(mov => (", "{paginatedMovements.map(mov => (");
  
  text = text.replace(/<\/IonList>[\s\r\n]*<\/IonContent>/g, "</IonList>\n\n        <IonInfiniteScroll onIonInfinite={loadMore} disabled={displayCount >= movements.length}>\n          <IonInfiniteScrollContent loadingText=\"Cargando más...\"></IonInfiniteScrollContent>\n        </IonInfiniteScroll>\n\n      </IonContent>");
  
  fs.writeFileSync(file, text, 'utf8');
}
paginateMovements();
