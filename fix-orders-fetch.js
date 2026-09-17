const fs = require('fs');
let o = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

o = o.replace(/const fetchOrders = async \(\) => \{/,
`const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      setSettings(res.data);
    } catch(e) {}
  };
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchOrders = async () => {`);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', o);
console.log('Fixed settings fetch');
