import React, { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { homeOutline, calendarOutline, peopleOutline, cardOutline, home, calendar, people, card } from 'ionicons/icons';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useContext(AuthContext);

  if (!isAuthenticated || !user?.tenantId) return null;

  // Don't show on public views or platform-admin
  const isPublicRoute =
    location.pathname.startsWith('/book') ||
    location.pathname.startsWith('/store') ||
    location.pathname.startsWith('/tienda') ||
    location.pathname.startsWith('/appointment') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/select-workspace' ||
    location.pathname === '/platform-admin';

  if (isPublicRoute) return null;

  // Role check: kitchen or delivery might have restricted views
  if (user.role === UserRole.KITCHEN || user.role === UserRole.DELIVERY) {
    return null;
  }

  const navItems = [
    { title: 'Inicio', path: '/dashboard', outlineIcon: homeOutline, activeIcon: home },
    { title: 'Agenda', path: '/reservations', outlineIcon: calendarOutline, activeIcon: calendar },
    { title: 'Clientes', path: '/customers', outlineIcon: peopleOutline, activeIcon: people },
    { title: 'Caja', path: '/pos', outlineIcon: cardOutline, activeIcon: card },
  ];

  return (
    <nav className="ff-bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <div
            key={item.path}
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
