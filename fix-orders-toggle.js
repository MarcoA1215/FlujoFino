const fs = require('fs');

let o = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// 1. Add settings state
o = o.replace(/const \[selectedOrderForDetails, setSelectedOrderForDetails\] = useState<any>\(null\);/, 
`const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);`);

// 2. Fetch settings inside fetchOrders (or useEffect)
o = o.replace(/const fetchOrders = async \(\) => \{\s*try \{\s*const res = await apiClient\.get\('\/orders'\);\s*setOrders\(res\.data\);\s*\} catch \(e\) \{\s*console\.error\(e\);\s*\}\s*\};/,
`const fetchOrders = async () => {
    try {
      const [ordRes, setRes] = await Promise.all([
        apiClient.get('/orders'),
        apiClient.get('/settings')
      ]);
      setOrders(ordRes.data);
      setSettings(setRes.data);
    } catch (e) {
      console.error(e);
    }
  };`);

// 3. Hide the form based on settings
o = o.replace(/\{selectedOrderForDetails\.paymentStatus === PaymentStatus\.PENDING && \(/,
`{selectedOrderForDetails.paymentStatus === PaymentStatus.PENDING && settings?.allowPartialPayments && (`);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', o);
console.log('Fixed Orders toggle logic');
