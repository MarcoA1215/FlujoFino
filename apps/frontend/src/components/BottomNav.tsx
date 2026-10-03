import React, { useContext, useState, useEffect } from 'react';
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
  cart
} from 'ionicons/icons';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import { apiClient } from '../api/client';

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

  const [settings, setSettings] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('flujofino_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {};
  });

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      apiClient.get('/settings').then(res => {
        if (res.data) setSettings(res.data);
      }).catch(() => {});
    }
  }, [isAuthenticated, user?.tenantId]);

  useEffect(() => {
    if ((user?.role === UserRole.POS || (user?.role as string) === 'POS') && location.pathname === '/dashboard') {
      navigate('/pos', { replace: true });
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

  // Role check: kitchen, delivery or inventory have restricted views
  if (
    user.role === UserRole.KITCHEN ||
    user.role === UserRole.DELIVERY ||
    user.role === UserRole.INVENTORY ||
    (user.role as string) === 'INVENTORY'
  ) {
    return null;
  }

  const isReservationsEnabled = settings.enableReservations !== undefined ? Boolean(settings.enableReservations) : Boolean(settings.featureCustomerSchedules);

  const navItems: BottomNavItem[] = [
    {
      id: 'home',
      title: 'Inicio',
      path: '/dashboard',
      outlineIcon: homeOutline,
      activeIcon: home,
      isVisible: user.role !== UserRole.POS && (user.role as string) !== 'POS'
    },
    { id: 'agenda', title: 'Agenda', path: '/reservations', outlineIcon: calendarOutline, activeIcon: calendar, isVisible: isReservationsEnabled },
    { id: 'orders', title: 'Pedidos', path: '/orders', outlineIcon: cartOutline, activeIcon: cart, isVisible: !isReservationsEnabled },
    { id: 'customers', title: 'Clientes', path: '/customers', outlineIcon: peopleOutline, activeIcon: people, isVisible: true },
    { id: 'pos', title: 'Caja', path: '/pos', outlineIcon: cardOutline, activeIcon: card, isVisible: true },
  ];

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
