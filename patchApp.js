const fs = require('fs');
let app = fs.readFileSync('apps/frontend/src/App.tsx', 'utf8');

if (!app.includes('AuthProvider')) {
  app = app.replace(/import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic\/react';/, "import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/react';\nimport { AuthProvider, AuthContext } from './context/AuthContext';\nimport Login from './pages/Login';\nimport { useContext } from 'react';\nimport { Redirect } from 'react-router-dom';");

  const protectedRoute = `
const ProtectedRoute: React.FC<{ component: React.FC<any>; exact?: boolean; path: string }> = ({ component: Component, ...rest }) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  return (
    <Route {...rest} render={props => (isAuthenticated ? <Component {...props} /> : <Redirect to="/login" />)} />
  );
};
`;

  app = app.replace(/const App: React.FC = \(\) => {/, protectedRoute + "\nconst App: React.FC = () => {");
  
  // Wrap return in AuthProvider
  app = app.replace(/return \(/, "return (\n    <AuthProvider>");
  app = app.replace(/<\/IonApp>\r?\n\s*\);/, "</IonApp>\n    </AuthProvider>\n  );");

  // Replace all internal Route with ProtectedRoute except for specific ones, but actually it's easier to just do them individually.
  // The ones inside IonSplitPane are protected.
  // Wait, I should just regex `<Route path="/` to `<ProtectedRoute path="/`
  app = app.replace(/<Route path="\/dashboard"/, '<ProtectedRoute path="/dashboard"');
  app = app.replace(/<Route path="\/raw-materials"/, '<ProtectedRoute path="/raw-materials"');
  app = app.replace(/<Route path="\/products"/, '<ProtectedRoute path="/products"');
  app = app.replace(/<Route path="\/production"/, '<ProtectedRoute path="/production"');
  app = app.replace(/<Route path="\/calculator"/, '<ProtectedRoute path="/calculator"');
  app = app.replace(/<Route path="\/pos"/, '<ProtectedRoute path="/pos"');
  app = app.replace(/<Route path="\/orders"/, '<ProtectedRoute path="/orders"');
  app = app.replace(/<Route path="\/delivery-zones"/, '<ProtectedRoute path="/delivery-zones"');
  
  // the exact path="/" logic
  app = app.replace(/<Route path="\/" exact={true}>\r?\n\s*<Redirect to="\/dashboard" \/>\r?\n\s*<\/Route>/, `<Route path="/" exact={true}>\n                <Redirect to="/dashboard" />\n              </Route>\n              <Route path="/login" exact={true} component={Login} />`);
  
  // Fix the import of ProtectedRoute usage
  app = app.replace(/component=\{Dashboard\}/, 'component={Dashboard}'); // Just to check it works

  fs.writeFileSync('apps/frontend/src/App.tsx', app, 'utf8');
}
