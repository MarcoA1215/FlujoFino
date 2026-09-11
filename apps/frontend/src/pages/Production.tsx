import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton } from '@ionic/react';
const Page: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar color='success'>
        <IonButtons slot='start'>
          <IonMenuButton />
        </IonButtons>
        <IonTitle>Producción</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className='ion-padding'>
      En construcción
    </IonContent>
  </IonPage>
);
export default Page;
