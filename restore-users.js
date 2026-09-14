const fs = require('fs');

let users = fs.readFileSync('apps/frontend/src/pages/Users.tsx', 'utf8');

// Fix invisible character
users = users.replace(/^[^\w\s{/'"]+/gm, "");
if (users.includes("import { refreshOutline }") && !users.includes("saveOutline")) {
  users = users.replace("import { refreshOutline } from 'ionicons/icons';", "import { refreshOutline, saveOutline } from 'ionicons/icons';");
}
if (!users.includes("type Settings")) {
  users = users.replace("interface User {", "type Settings = { exchangeRateBs: number; companyBank?: string; companyCedula?: string; companyPhone?: string; };\n\ninterface User {");
}
if (!users.includes("const [settings")) {
  users = users.replace("const [users, setUsers] = useState<User[]>([]);", "const [users, setUsers] = useState<User[]>([]);\n  const [settings, setSettings] = useState<Settings>({ exchangeRateBs: 40 });");
}

if (!users.includes("apiClient.get<Settings>('/settings')")) {
  users = users.replace("setUsers(res.data);", "setUsers(res.data);\n      const setRes = await apiClient.get<Settings>('/settings');\n      setSettings(setRes.data);");
}

if (!users.includes("handleSaveSettings")) {
  users = users.replace("const handleCreate = async () => {", "const handleSaveSettings = async () => {\n    try {\n      await apiClient.put('/settings', { companyBank: settings.companyBank, companyCedula: settings.companyCedula, companyPhone: settings.companyPhone });\n      presentToast({ message: 'Ajustes guardados', duration: 2000, color: 'success' });\n      fetchUsers();\n    } catch(e: any) {\n      presentToast({ message: 'Error guardando ajustes', duration: 3000, color: 'danger' });\n    }\n  };\n\n  const handleCreate = async () => {");
}

if (!users.includes("Datos Bancarios de la Empresa")) {
  const card = `
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Datos Bancarios de la Empresa</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    <IonItem>
                      <IonLabel position="stacked">Banco Receptor</IonLabel>
                      <IonInput value={settings.companyBank || ''} onIonInput={e => setSettings({...settings, companyBank: e.detail.value!})} placeholder="Ej. Banesco" />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Cédula / RIF</IonLabel>
                      <IonInput value={settings.companyCedula || ''} onIonInput={e => setSettings({...settings, companyCedula: e.detail.value!})} placeholder="Ej. J-12345678" />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Teléfono</IonLabel>
                      <IonInput value={settings.companyPhone || ''} onIonInput={e => setSettings({...settings, companyPhone: e.detail.value!})} placeholder="Ej. 0414-1234567" />
                    </IonItem>
                  </IonList>
                  <IonButton expand="block" color="primary" onClick={handleSaveSettings} style={{marginTop: '15px'}}>
                    <IonIcon slot="start" icon={saveOutline} />
                    Guardar Ajustes
                  </IonButton>
                </IonCardContent>
              </IonCard>
`;
  users = users.replace('<IonCol size="12" sizeMd="4">', '<IonCol size="12" sizeMd="4">' + card);
}

fs.writeFileSync('apps/frontend/src/pages/Users.tsx', users, 'utf8');
