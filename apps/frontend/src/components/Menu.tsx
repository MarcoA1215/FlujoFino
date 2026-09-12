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
import { cubeOutline, cartOutline, constructOutline, cashOutline, listOutline, pieChartOutline, calculatorOutline, mapOutline } from 'ionicons/icons';

const appPages = [
  { title: 'Tablero Principal', url: '/dashboard', icon: pieChartOutline },
  { title: 'Insumos', url: '/raw-materials', icon: cubeOutline },
  { title: 'Productos', url: '/products', icon: listOutline },
  { title: 'Producción', url: '/production', icon: constructOutline },
  { title: 'Calculadora', url: '/calculator', icon: calculatorOutline },
  { title: 'POS (Caja)', url: '/pos', icon: cashOutline },
  { title: 'Tablero Pedidos', url: '/orders', icon: cartOutline },
  { title: 'Zonas Delivery', url: '/delivery-zones', icon: mapOutline },
];

const Menu: React.FC = () => {
  const location = useLocation();

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
                  <IonIcon aria-hidden="true" slot="start" icon={appPage.icon} />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};
export default Menu;
