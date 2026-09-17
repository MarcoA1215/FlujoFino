const fs = require('fs');
let d = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');

d = d.replace(/import \{ alertCircleOutline/, `import { refreshOutline, alertCircleOutline`);

d = d.replace(/useEffect\(\(\) => \{\s*const fetchSummary = async \(\) => \{/,
`const fetchSummary = async () => {`);

d = d.replace(/presentToast\(\{ message: 'Error cargando el resumen', duration: 3000, color: 'danger' \}\);\s*\}\s*\};\s*fetchSummary\(\);\s*\}, \[\]\);/,
`presentToast({ message: 'Error cargando el resumen', duration: 3000, color: 'danger' });
      }
    };

    useEffect(() => {
      fetchSummary();
    }, []);`);

d = d.replace(/<IonTitle>Tablero de Inventario y Alertas<\/IonTitle>\s*<\/IonToolbar>/,
`<IonTitle>Tablero de Inventario y Alertas</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={fetchSummary}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>`);

fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', d);
console.log('Added refresh button to Dashboard');
