import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Map,
  CalendarClock,
  Activity,
  Wrench,
  Settings as SettingsIcon,
} from 'lucide-react';

export const MobileNav = () => {
  const { activeRoute, setActiveRoute, navigateToSettings, currentUser } = useApp();
  const isOperator = currentUser?.role === 'Operator';

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#0a84ff', tint: 'rgba(10, 132, 255, 0.15)' },
    { id: 'map', label: 'Map', icon: Map, color: '#30b0c7', tint: 'rgba(48, 176, 199, 0.15)' },
    { id: 'schedule', label: 'Scheduler', icon: CalendarClock, color: '#ff9f0a', tint: 'rgba(255, 159, 10, 0.15)' },
    { id: 'oracle', label: 'Health', icon: Activity, color: '#bf5af2', tint: 'rgba(191, 90, 242, 0.15)' },
    { id: 'assistance', label: 'Diagnostics', icon: Wrench, color: '#ff375f', tint: 'rgba(255, 55, 95, 0.15)' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, color: '#6366f1', tint: 'rgba(99, 102, 241, 0.15)', isSettings: true },
  ];

  // Operator has access to Dashboard and Map View per Requirement 9.2
  const navItems = isOperator
    ? allNavItems.filter((item) => ['dashboard', 'map'].includes(item.id))
    : allNavItems;

  const handleClick = (item) => {
    if (item.isSettings) {
      navigateToSettings('general');
    } else {
      setActiveRoute(item.id);
    }
  };

  return (
    <nav className="mobile-nav-bar" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeRoute === item.id;
        return (
          <button
            key={item.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => handleClick(item)}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              className="mobile-icon-badge"
              style={{
                color: isActive ? 'var(--accent-primary)' : item.color,
                background: isActive ? 'var(--tint-primary)' : 'transparent',
              }}
            >
              <Icon size={19} strokeWidth={2.1} />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
