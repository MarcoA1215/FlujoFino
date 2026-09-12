import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useIonAlert } from '@ionic/react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import { peopleOutline, cubeOutline, cartOutline, constructOutline, cashOutline, listOutline, pieChartOutline, calculatorOutline, mapOutline } from 'ionicons/icons';

const Menu: React.FC = () => {
  const location = useLocation();
  const [presentAlert] = useIonAlert();
  const { user, logout, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) return null; // Ocultar el menú si no está logueado

  
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
    { title: 'Insumos', url: '/raw-materials', iosIcon: cubeOutline, mdIcon: cubeOutline },
    { title: 'Productos', url: '/products', iosIcon: listOutline, mdIcon: listOutline },
    { title: 'Producción', url: '/production', iosIcon: constructOutline, mdIcon: constructOutline },
    { title: 'Calculadora', url: '/calculator', iosIcon: calculatorOutline, mdIcon: calculatorOutline },
    { title: 'POS (Caja)', url: '/pos', iosIcon: cashOutline, mdIcon: cashOutline },
    { title: 'Tablero Pedidos', url: '/orders', iosIcon: cartOutline, mdIcon: cartOutline },
    { title: 'Zonas Delivery', url: '/delivery-zones', iosIcon: mapOutline, mdIcon: mapOutline },
    { title: 'Usuarios', url: '/users', iosIcon: peopleOutline, mdIcon: peopleOutline }
  ];

  let appPages = rawPages;
  if (user?.role === UserRole.POS) {
    appPages = appPages.filter(p => ['/pos', '/orders', '/calculator', '/products'].includes(p.url));
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
        <IonList id="inbox-list">
          <IonListHeader>Nutri Deli</IonListHeader>
          <IonNote>Sistema de Gestión</IonNote>
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
        <IonItem button onClick={confirmLogout} lines="none" color="light" style={{ marginTop: '20px' }}>
            <IonIcon aria-hidden="true" slot="start" icon={pieChartOutline} />
            <IonLabel>Cerrar Sesión</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
