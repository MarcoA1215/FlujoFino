const fs = require('fs');

// 1. App.tsx
let app = fs.readFileSync('apps/frontend/src/App.tsx', 'utf8');
app = app.replace(/import { Redirect, Route } from 'react-router-dom';/, "import { Route, Navigate } from 'react-router-dom';");

const protectedRouteCode = `
const ProtectedRoute: React.FC<{ component: React.FC<any>; path: string }> = ({ component: Component, ...rest }) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  return (
    <Route {...rest} element={isAuthenticated ? <Component /> : <Navigate to="/login" replace />} />
  );
};
`;

app = app.replace(/const ProtectedRoute[\s\S]*?};/, protectedRouteCode.trim());

// Update Routes
app = app.replace(/<Route path="\/" exact={true}>\s*<Redirect to="\/dashboard" \/>\s*<\/Route>/, '<Route path="/" element={<Navigate to="/dashboard" replace />} />');
app = app.replace(/<Route path="\/login" exact={true} component=\{Login\} \/>/, '<Route path="/login" element={<Login />} />');
app = app.replace(/<ProtectedRoute path="([^"]+)" exact=\{true\} component=\{([^\}]+)\} \/>/g, '<ProtectedRoute path="$1" component={$2} />');

fs.writeFileSync('apps/frontend/src/App.tsx', app, 'utf8');

// 2. AuthContext.tsx
let ac = fs.readFileSync('apps/frontend/src/context/AuthContext.tsx', 'utf8');
ac = ac.replace(/import React, { createContext, useState, useEffect, ReactNode }/, "import React, { createContext, useState, useEffect } from 'react';\nimport type { ReactNode }");
fs.writeFileSync('apps/frontend/src/context/AuthContext.tsx', ac, 'utf8');

// 3. Login.tsx
let login = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
login = login.replace(/import { useHistory } from 'react-router-dom';/, "import { useIonRouter } from '@ionic/react';");
login = login.replace(/const history = useHistory\(\);/, "const router = useIonRouter();");
login = login.replace(/history\.replace\('\/'\);/, "router.push('/', 'root', 'replace');");
login = login.replace(/style=\{\{ '--background': '#f4f5f8' \}\}/, "style={{ '--background': '#f4f5f8' } as any}");
fs.writeFileSync('apps/frontend/src/pages/Login.tsx', login, 'utf8');

// 4. Menu.tsx
let menu = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
// Fix scope of user for appPages
// move the appPages definition inside the component
const rawPages = `
  const rawPages = [
    { title: 'Tablero Principal', url: '/dashboard', iosIcon: pieChartOutline, mdIcon: pieChartOutline },
    { title: 'Insumos', url: '/raw-materials', iosIcon: cubeOutline, mdIcon: cubeOutline },
    { title: 'Productos', url: '/products', iosIcon: listOutline, mdIcon: listOutline },
    { title: 'Producción', url: '/production', iosIcon: buildOutline, mdIcon: buildOutline },
    { title: 'Calculadora', url: '/calculator', iosIcon: calculatorOutline, mdIcon: calculatorOutline },
    { title: 'POS (Caja)', url: '/pos', iosIcon: cashOutline, mdIcon: cashOutline },
    { title: 'Tablero Pedidos', url: '/orders', iosIcon: cartOutline, mdIcon: cartOutline },
    { title: 'Zonas Delivery', url: '/delivery-zones', iosIcon: mapOutline, mdIcon: mapOutline }
  ];
`;

menu = menu.replace(/let appPages = \[[\s\S]*?\];[\s\S]*?\}\s*const Menu: React.FC = \(\) => \{/, `const Menu: React.FC = () => {
${rawPages}
`);
menu = menu.replace(/const \{ user, logout \} = useContext\(AuthContext\);/, `const { user, logout } = useContext(AuthContext);
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
`);
menu = menu.replace(/warningOutline \}/, "warningOutline }");
fs.writeFileSync('apps/frontend/src/components/Menu.tsx', menu, 'utf8');

