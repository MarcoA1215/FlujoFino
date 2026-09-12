const fs = require('fs');

// Add Route to App.tsx
let app = fs.readFileSync('apps/frontend/src/App.tsx', 'utf8');
if (!app.includes('Users />')) {
  app = app.replace(/import Login from '\.\/pages\/Login';/, "import Login from './pages/Login';\nimport Users from './pages/Users';");
  app = app.replace(/<Route path="\/delivery-zones" element=\{<PrivateRoute><DeliveryZones \/><\/PrivateRoute>\} \/>/, "<Route path=\"/delivery-zones\" element={<PrivateRoute><DeliveryZones /></PrivateRoute>} />\n              <Route path=\"/users\" element={<PrivateRoute><Users /></PrivateRoute>} />");
  fs.writeFileSync('apps/frontend/src/App.tsx', app, 'utf8');
}

// Add Route to Menu.tsx for Admin
let menu = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
if (!menu.includes('/users')) {
  menu = menu.replace(/import \{ cubeOutline/, "import { peopleOutline, cubeOutline");
  menu = menu.replace(/\{ title: 'Zonas Delivery', url: '\/delivery-zones', iosIcon: mapOutline, mdIcon: mapOutline \}/, "{ title: 'Zonas Delivery', url: '/delivery-zones', iosIcon: mapOutline, mdIcon: mapOutline },\n    { title: 'Usuarios', url: '/users', iosIcon: peopleOutline, mdIcon: peopleOutline }");
  
  // ensure Admin only sees it, well if role === ADMIN it won't be filtered out (unless it's someone else, but they are filtered out in other if conditions)
  // Wait, if it's admin, they see all rawPages. So they see /users automatically.
  fs.writeFileSync('apps/frontend/src/components/Menu.tsx', menu, 'utf8');
}

