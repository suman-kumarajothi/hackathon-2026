import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Bell, ChevronDown, LogOut, Shield, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import { NotificationsPopover } from './NotificationsPopover';

export const Header = () => {
  const {
    activeRoute,
    setActiveRoute,
    navigateToSettings,
    setIsSearchOpen,
    currentUser,
    logout,
    notificationsOpen,
    setNotificationsOpen,
    alerts,
    themePreference,
    setThemePreference,
  } = useApp();

  const [profileOpen, setProfileOpen] = useState(false);

  const routeTitles = {
    dashboard: 'Dashboard',
    map: 'Map View',
    schedule: 'Smart Scheduler',
    evaluator: 'Solar Deployment Intelligence',
    oracle: 'Solar Health Intelligence',
    assistance: 'Smart Diagnostics',
    settings: 'Settings',
  };

  const unreadAlertsCount = alerts.filter((a) => a.status !== 'resolved').length;

  const toggleThemeQuick = () => {
    setThemePreference(themePreference === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="breadcrumb-nav">
          <span style={{ color: 'var(--text-muted)' }}>CMS</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-active">{routeTitles[activeRoute] || 'Dashboard'}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Quick Search Button */}
        <button className="search-trigger-btn" onClick={() => setIsSearchOpen(true)}>
          <Search size={14} />
          <span>Search...</span>
          <span className="keyboard-shortcut">⌘K</span>
        </button>

        {/* Theme Quick Switcher */}
        <button
          className="icon-action-btn"
          onClick={toggleThemeQuick}
          title={`Switch to ${themePreference === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {themePreference === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications Button */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-action-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Operational Alerts"
          >
            <Bell size={17} />
            {unreadAlertsCount > 0 && <span className="badge-dot" />}
          </button>
          {notificationsOpen && (
            <NotificationsPopover onClose={() => setNotificationsOpen(false)} />
          )}
        </div>

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: currentUser?.role === 'Administrator' ? 'var(--accent-purple)' : 'var(--accent-primary)',
                color: 'white',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
            <div style={{ textAlign: 'left', display: 'none', sm: 'block' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentUser?.displayName || 'User'}
              </div>
            </div>
            <ChevronDown size={13} color="var(--text-muted)" />
          </button>

          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: '44px',
                right: '0',
                width: '230px',
                background: 'var(--bg-modal)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                padding: '8px',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentUser?.displayName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  @{currentUser?.username}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span className={`status-badge ${currentUser?.role === 'Administrator' ? 'admin' : 'operator'}`} style={{ fontSize: '10.5px' }}>
                    <Shield size={10} />
                    {currentUser?.role}
                  </span>
                </div>
              </div>

              {currentUser?.role !== 'Operator' && (
                <div style={{ padding: '6px 0' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setProfileOpen(false);
                      navigateToSettings('general');
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <SettingsIcon size={15} />
                    <span>Preferences</span>
                  </div>
                </div>
              )}

              <div style={{ borderTop: currentUser?.role !== 'Operator' ? '1px solid var(--border-subtle)' : 'none', paddingTop: '6px' }}>
                <button
                  id="profile-logout-btn"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--accent-rose)',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--tint-rose)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
