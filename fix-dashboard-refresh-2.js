const fs = require('fs');
let d = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');

// I need to completely restructure the fetchSummary part since my last replace probably duplicated or messed it up.
// Let's find the `useEffect` block and replace it.

const start = d.indexOf('const [presentToast] = useIonToast();');
const end = d.indexOf('return (', start);

const block = `const [presentToast] = useIonToast();

  const fetchSummary = async () => {
    try {
      const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
      setSummary(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando el resumen', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  `;

d = d.substring(0, start) + block + d.substring(end);

fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', d);
console.log('Fixed fetchSummary correctly');
