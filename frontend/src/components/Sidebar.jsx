import React from 'react';
import { useApp } from '../context/AppContext';
import { TahoeBrandIcon } from './TahoeBrandIcon';
import {
  LayoutDashboard,
  Map,
  CalendarClock,
  MapPinned,
  Activity,
  Wrench,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Sidebar = () => {
  const {
    activeRoute,
    setActiveRoute,
    navigateToSettings,
    currentUser,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    devices,
    schedules,
  } = useApp();

  const isOperator = currentUser?.role === 'Operator';

  const allNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      color: '#0a84ff',
      tint: 'rgba(10, 132, 255, 0.15)',
      badge: null,
    },
    {
      id: 'map',
      label: 'Map View',
      icon: Map,
      color: '#30b0c7',
      tint: 'rgba(48, 176, 199, 0.15)',
      badge: devices.length > 0 ? devices.length : null,
    },
    {
      id: 'schedule',
      label: 'Smart Scheduler',
      icon: CalendarClock,
      color: '#ff9f0a',
      tint: 'rgba(255, 159, 10, 0.15)',
      badge: schedules.filter((s) => s.active).length,
    },
    {
      id: 'evaluator',
      label: 'Solar Deployment Intelligence',
      icon: MapPinned,
      color: '#34c759',
      tint: 'rgba(52, 199, 89, 0.15)',
      badge: null,
    },
    {
      id: 'oracle',
      label: 'Solar Health Intelligence',
      icon: Activity,
      color: '#bf5af2',
      tint: 'rgba(191, 90, 242, 0.15)',
      badge: null,
    },
    {
      id: 'assistance',
      label: 'Smart Diagnostics',
      icon: Wrench,
      color: '#ff375f',
      tint: 'rgba(255, 55, 95, 0.15)',
      badge: null,
    },
  ];

  // Operator has access to Dashboard and Map View per Requirement 9.2
  const navItems = isOperator
    ? allNavItems.filter((item) => item.id === 'dashboard' || item.id === 'map')
    : allNavItems;

  return (
    <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-badge" style={{ gap: '10px' }}>
          <TahoeBrandIcon size={26} />
          {!isSidebarCollapsed && (
            <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>
              CMS
            </span>
          )}
        </div>

        <button
          className="icon-action-btn"
          style={{ width: '28px', height: '28px' }}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="sidebar-nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveRoute(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <span
                className="nav-icon-badge"
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.2)' : item.tint,
                  color: isActive ? '#ffffff' : item.color,
                }}
              >
                <Icon size={16} strokeWidth={2.1} />
              </span>

              {!isSidebarCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== null && (
                    <span className="nav-counter">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Anchored Settings at Bottom of Desktop Sidebar (Administrator Only per Requirement 8) */}
      {!isOperator && (
        <div className="sidebar-bottom-anchor">
          <button
            className={`nav-item ${activeRoute === 'settings' ? 'active' : ''}`}
            onClick={() => navigateToSettings('general')}
            title={isSidebarCollapsed ? 'Settings' : undefined}
          >
            <span
              className="nav-icon-badge"
              style={{
                background: activeRoute === 'settings' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                color: activeRoute === 'settings' ? '#ffffff' : '#6366f1',
              }}
            >
              <SettingsIcon size={16} strokeWidth={2.1} />
            </span>
            {!isSidebarCollapsed && (
              <span className="nav-label">Settings</span>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};
