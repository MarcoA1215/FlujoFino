import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonFooter,
  IonToolbar,
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useIonAlert } from '@ionic/react';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import { calendarOutline, peopleOutline, settingsOutline, cubeOutline, cartOutline, constructOutline, cashOutline, listOutline, pieChartOutline, calculatorOutline, mapOutline, logOutOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';

const Menu: React.FC = () => {
  const location = useLocation();
  const [presentAlert] = useIonAlert();
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      apiClient.get('/settings').then(res => {
        setSettings(res.data);
        if (res.data.themePrimaryColor) {
          document.documentElement.style.setProperty('--ion-color-primary', res.data.themePrimaryColor);
          // Optionally set shade/tint or leave as is
        }
        if (res.data.themeHeaderColor) {
          document.documentElement.style.setProperty('--ion-color-success', res.data.themeHeaderColor); // FlujoFino usually uses 'success' for headers like Dashboard
          document.documentElement.style.setProperty('--ion-color-tertiary', res.data.themeHeaderColor);
        }
      }).catch(e => console.log(e));
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) return null;
  
  const confirmLogout = () => {
    presentAlert({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar tu sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', role: 'destructive', handler: logout }
      ]
    });
  };
  
  const rawPages = [
    { title: 'Tablero Principal', url: '/dashboard', iosIcon: pieChartOutline, mdIcon: pieChartOutline },
    { title: 'Inventario (Insumos)', url: '/raw-materials', iosIcon: cubeOutline, mdIcon: cubeOutline, conditional: 'featureRecipes' },
    { title: 'Servicios / Productos', url: '/products', iosIcon: listOutline, mdIcon: listOutline },
    { title: 'Fórmulas / Ensamblaje', url: '/production', iosIcon: constructOutline, mdIcon: constructOutline, conditional: 'featureRecipes' },
    { title: 'Calculadora de Costos', url: '/calculator', iosIcon: calculatorOutline, mdIcon: calculatorOutline, conditional: 'featureRecipes' },
    { title: 'Caja', url: '/pos', iosIcon: cashOutline, mdIcon: cashOutline },
    { title: 'Pedidos / Tickets', url: '/orders', iosIcon: cartOutline, mdIcon: cartOutline },
    { title: 'Reservaciones', url: '/reservations', iosIcon: calendarOutline, mdIcon: calendarOutline, conditional: 'featureCustomerSchedules' },
    { title: 'Zonas Delivery', url: '/delivery-zones', iosIcon: mapOutline, mdIcon: mapOutline, conditional: 'featureBuySell' },
    { title: 'Usuarios', url: '/users', iosIcon: peopleOutline, mdIcon: peopleOutline },
    { title: 'Configuración', url: '/settings', iosIcon: settingsOutline, mdIcon: settingsOutline }
  ];

  let appPages = rawPages.filter(p => !p.conditional || settings[p.conditional]);

  if (!user?.tenantId) {
    appPages = [];
  } else if (user?.role === UserRole.POS) {
    appPages = appPages.filter(p => ['/pos', '/orders', '/calculator', '/reservations'].includes(p.url));
  } else if (user?.role === UserRole.KITCHEN) {
    appPages = appPages.filter(p => ['/orders', '/production'].includes(p.url));
  } else if (user?.role === UserRole.DELIVERY) {
    appPages = appPages.filter(p => ['/orders'].includes(p.url));
  } else if (user?.role === UserRole.INVENTORY) {
    appPages = appPages.filter(p => ['/raw-materials', '/products'].includes(p.url));
  }

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f4f5f8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '45px', height: '45px', background: 'var(--ion-color-primary)', color: 'white', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: '900', marginBottom: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            F
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            {user?.tenantName || 'Flujo Fino'}
          </h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: 'gray' }}>
            @{user?.username}
          </p>
        </div>
        <IonList id="inbox-list" style={{ paddingTop: 0 }}>
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === appPage.url ? 'selected' : ''} routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                  <IonIcon aria-hidden="true" slot="start" ios={appPage.iosIcon} md={appPage.mdIcon} />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>
      </IonContent>
      <IonFooter className="ion-no-border">
        <IonToolbar>
          <IonItem button onClick={confirmLogout} lines="none" detail={false} style={{ '--background': 'transparent' } as any}>
            <IonIcon aria-hidden="true" slot="start" icon={logOutOutline} color="danger" />
            <IonLabel color="danger">Cerrar Sesión</IonLabel>
          </IonItem>
        </IonToolbar>
      </IonFooter>
    </IonMenu>
  );
};

export default Menu;
