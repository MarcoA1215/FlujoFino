const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');

const regex = /<IonRow>\s*<IonCol size="12" sizeSm="6" sizeMd="3">[\s\S]*?<\/IonRow>/;

const newCards = `<IonRow>
            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="tertiary">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={walletOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Ingresos Históricos
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2>$ {(summary.historicalRevenue || 0).toFixed(2)}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="warning">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={cartOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Gastos de Reinversión
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2 style={{ color: 'white' }}>$ {(summary.reinvestmentExpense || 0).toFixed(2)}</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'white' }}>Inv: $ {(summary.historicalInvestment || 0).toFixed(2)} - Cap: $ {(summary.totalInventoryCapital || 0).toFixed(2)}</p>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="success">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={trendingUpOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Ganancia Neta Bruta
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2>$ {(summary.historicalProfit || 0).toFixed(2)}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="danger">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={trendingDownOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Mermas y Pérdidas
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2>$ {(summary.totalLosses || 0).toFixed(2)}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>`;

c = c.replace(regex, newCards);
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', c);
