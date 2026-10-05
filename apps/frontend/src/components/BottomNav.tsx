import React, { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
  homeOutline,
  calendarOutline,
  peopleOutline,
  cardOutline,
  cartOutline,
  home,
  calendar,
  people,
  card,
  cart,
  cubeOutline,
  cube,
  listOutline,
  list,
  constructOutline,
  construct
} from 'ionicons/icons';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { UserRole } from '@finowork/shared-types';

interface BottomNavItem {
  id: string;
  title: string;
  path: string;
  outlineIcon: string;
  activeIcon: string;
  isVisible: boolean;
}

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useContext(AuthContext);
  const { settings } = useSettings();

  useEffect(() => {
    if ((user?.role === UserRole.POS || (user?.role as string) === 'POS') && location.pathname === '/dashboard') {
      navigate('/pos', { replace: true });
    }
    if ((user?.role === UserRole.INVENTORY || (user?.role as string) === 'INVENTORY') && location.pathname === '/dashboard') {
      navigate('/raw-materials', { replace: true });
    }
  }, [user?.role, location.pathname, navigate]);

  if (!isAuthenticated || !user?.tenantId) return null;

  // SuperAdmin and Promotor never see standard store BottomNav
  if (
    user.role === UserRole.SUPERADMIN ||
    (user.role as string) === 'SUPERADMIN' ||
    user.role === UserRole.PROMOTOR ||
    (user.role as string) === 'PROMOTOR'
  ) {
    return null;
  }

  // Don't show on public views, platform-admin, promoter or feedback
  const isPublicRoute =
    location.pathname.startsWith('/book') ||
    location.pathname.startsWith('/store') ||
    location.pathname.startsWith('/tienda') ||
    location.pathname.startsWith('/appointment') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/select-workspace' ||
    location.pathname === '/subscription-expired' ||
    location.pathname === '/platform-admin' ||
    location.pathname.startsWith('/platform-admin') ||
    location.pathname === '/promoter' ||
    location.pathname.startsWith('/promoter') ||
    location.pathname === '/feedback' ||
    location.pathname.startsWith('/feedback');

  if (isPublicRoute) return null;

  // Specific role panels: Delivery and Kitchen don't use multi-tab bottom nav
  if (
    user.role === UserRole.KITCHEN ||
    (user.role as string) === 'KITCHEN' ||
    user.role === UserRole.DELIVERY ||
    (user.role as string) === 'DELIVERY'
  ) {
    return null;
  }

  const isReservationsEnabled = settings.enableReservations !== undefined ? Boolean(settings.enableReservations) : Boolean(settings.featureCustomerSchedules);

  let navItems: BottomNavItem[] = [];

  if (user.role === UserRole.INVENTORY || (user.role as string) === 'INVENTORY') {
    navItems = [
      { id: 'raw-materials', title: 'Insumos', path: '/raw-materials', outlineIcon: cubeOutline, activeIcon: cube, isVisible: true },
      { id: 'products', title: 'Productos', path: '/products', outlineIcon: listOutline, activeIcon: list, isVisible: true },
      { id: 'production', title: 'Producción', path: '/production', outlineIcon: constructOutline, activeIcon: construct, isVisible: true },
    ];
  } else if (user.role === UserRole.POS || (user.role as string) === 'POS') {
    navItems = [
      { id: 'pos', title: 'Caja', path: '/pos', outlineIcon: cardOutline, activeIcon: card, isVisible: true },
      { id: 'orders', title: 'Pedidos', path: '/orders', outlineIcon: cartOutline, activeIcon: cart, isVisible: true },
      { id: 'customers', title: 'Clientes', path: '/customers', outlineIcon: peopleOutline, activeIcon: people, isVisible: true },
    ];
  } else {
    // Admin / General default
    navItems = [
      {
        id: 'home',
        title: 'Inicio',
        path: '/dashboard',
        outlineIcon: homeOutline,
        activeIcon: home,
        isVisible: true
      },
      { id: 'agenda', title: 'Agenda', path: '/reservations', outlineIcon: calendarOutline, activeIcon: calendar, isVisible: isReservationsEnabled },
      { id: 'orders', title: 'Pedidos', path: '/orders', outlineIcon: cartOutline, activeIcon: cart, isVisible: !isReservationsEnabled },
      { id: 'customers', title: 'Clientes', path: '/customers', outlineIcon: peopleOutline, activeIcon: people, isVisible: true },
      { id: 'pos', title: 'Caja', path: '/pos', outlineIcon: cardOutline, activeIcon: card, isVisible: true },
    ];
  }

  const visibleNavItems = navItems.filter((item) => item.isVisible);

  return (
    <nav className="ff-bottom-nav">
      {visibleNavItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <div
            key={item.id}
            className={`ff-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <IonIcon icon={isActive ? item.activeIcon : item.outlineIcon} />
            <span>{item.title}</span>
          </div>
        );
      })}
    </nav>
  );
};

export default BottomNav;
