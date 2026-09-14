const fs = require('fs');

function paginateProduction() {
  const file = 'apps/frontend/src/pages/Production.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace("const [searchText, setSearchText] = useState('');", "const [searchText, setSearchText] = useState('');\n  const [displayCount, setDisplayCount] = useState(15);");
  text = text.replace("IonItem, IonText } from '@ionic/react';", "IonItem, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react';");
  
  text = text.replace("return p.name?.toLowerCase().includes(searchText.toLowerCase());\n  });", "return p.name?.toLowerCase().includes(searchText.toLowerCase());\n  });\n\n  const paginatedBatches = batches.slice(0, displayCount);\n\n  const loadMore = (e: any) => {\n    setTimeout(() => {\n      setDisplayCount(prev => prev + 15);\n      e.target.complete();\n    }, 500);\n  };");
  
  text = text.replace("{batches.map(b => (", "{paginatedBatches.map(b => (");
  
  text = text.replace(/<\/IonList>[\s\r\n]*\)}[\s\r\n]*<\/IonContent>/g, "</IonList>\n          <IonInfiniteScroll onIonInfinite={loadMore} disabled={displayCount >= batches.length}>\n            <IonInfiniteScrollContent loadingText=\"Cargando más...\"></IonInfiniteScrollContent>\n          </IonInfiniteScroll>\n        )}\n      </IonContent>");
  
  fs.writeFileSync(file, text, 'utf8');
}
paginateProduction();
