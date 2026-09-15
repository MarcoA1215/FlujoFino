const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/App.tsx', 'utf8');

if (!code.includes("@capacitor/app")) {
  const imports = `import { AuthProvider, AuthContext } from './context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import { useContext, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';`;

  code = code.replace(
    /import \{ AuthProvider, AuthContext \} from '\.\/context\/AuthContext';\r?\nimport \{ UserRole \} from '@nutrideli\/shared-types';\r?\nimport \{ useContext \} from 'react';/,
    imports
  );

  const backLogic = `const App: React.FC = () => {
  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });
    return () => {
      backListener.then(l => l.remove());
    };
  }, []);

  return (`;

  code = code.replace(
    /const App: React\.FC = \(\) => \{\r?\n  return \(/,
    backLogic
  );

  fs.writeFileSync('apps/frontend/src/App.tsx', code, 'utf8');
}
