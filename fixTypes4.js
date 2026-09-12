const fs = require('fs');
let pos = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');

const fetchBlock = `  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await apiClient.get<Product[]>('/products');
        setProducts(res.data);
      } catch (e) {
        console.error(e);
        presentToast({ message: 'Error cargando productos', duration: 3000, color: 'danger' });
      }
    };
    
    const fetchRate = async () => {
      try {
        const res = await apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate');
        setExchangeRate(res.data.exchangeRateBs);
      } catch (e) {}
    };

    const fetchZones = async () => {
      try {
        const res = await apiClient.get<DeliveryZone[]>('/delivery-zones');
        setDeliveryZones(res.data);
      } catch(e) {}
    };

    fetchProducts();
    fetchRate();
    fetchZones();
  }, [presentToast]);`;

pos = pos.replace(
  /  useEffect\(\(\) => \{[\s\S]*?fetchRate\(\);\r?\n  \}, \[presentToast\]\);/,
  fetchBlock
);

fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', pos, 'utf8');
