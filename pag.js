const fs = require('fs');

function paginateOrders() {
  const file = 'apps/frontend/src/pages/Orders.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace("const [searchText, setSearchText] = useState('');", "const [searchText, setSearchText] = useState('');\n  const [displayCount, setDisplayCount] = useState(10);");
  text = text.replace("IonCardContent, IonButton,", "IonCardContent, IonButton, IonInfiniteScroll, IonInfiniteScrollContent,");
  
  text = text.replace("return matchesStatus && matchesSearch;\n  });", "return matchesStatus && matchesSearch;\n  });\n\n  const paginatedOrders = filteredOrders.slice(0, displayCount);\n\n  const loadMore = (e: any) => {\n    setTimeout(() => {\n      setDisplayCount(prev => prev + 10);\n      e.target.complete();\n    }, 500);\n  };");
  
  text = text.replace("{filteredOrders.map(order => (", "{paginatedOrders.map(order => (");
  
  const closing = "</IonRow>\n        </IonGrid>\n      </IonContent>";
  const infinite = "</IonRow>\n        </IonGrid>\n\n        <IonInfiniteScroll onIonInfinite={loadMore} disabled={displayCount >= filteredOrders.length}>\n          <IonInfiniteScrollContent loadingText=\"Cargando más...\"></IonInfiniteScrollContent>\n        </IonInfiniteScroll>\n\n      </IonContent>";
  text = text.replace(/<\/IonRow>[\s\r\n]*<\/IonGrid>[\s\r\n]*<\/IonContent>/g, infinite);
  
  fs.writeFileSync(file, text, 'utf8');
}
paginateOrders();
