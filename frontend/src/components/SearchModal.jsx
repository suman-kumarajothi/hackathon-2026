import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  LayoutDashboard,
  Map,
  CalendarClock,
  MapPinned,
  Activity,
  Wrench,
  Settings as SettingsIcon,
  Server,
  X,
} from 'lucide-react';

export const SearchModal = () => {
  const { isSearchOpen, setIsSearchOpen, setActiveRoute, devices, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isSearchOpen) return null;

  const isOperator = currentUser?.role === 'Operator';

  const allRoutes = [
    { id: 'dashboard', name: 'Dashboard', category: 'Navigation', icon: LayoutDashboard },
    { id: 'map', name: 'Map View', category: 'Navigation', icon: Map },
    { id: 'schedule', name: 'Smart Scheduler', category: 'Navigation', icon: CalendarClock },
    { id: 'evaluator', name: 'Solar Deployment Intelligence', category: 'Navigation', icon: MapPinned },
    { id: 'oracle', name: 'Solar Health Intelligence', category: 'Navigation', icon: Activity },
    { id: 'assistance', name: 'Smart Diagnostics', category: 'Navigation', icon: Wrench },
    { id: 'settings', name: 'Platform Settings', category: 'Navigation', icon: SettingsIcon },
  ];

  const routes = isOperator
    ? allRoutes.filter((r) => ['dashboard', 'map', 'assistance'].includes(r.id))
    : allRoutes;

  const filteredRoutes = routes.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectRoute = (routeId) => {
    setActiveRoute(routeId);
    setIsSearchOpen(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsSearchOpen(false)}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '10px' }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, module, or IoT device name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {/* Navigation Section */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '6px 8px', textTransform: 'uppercase' }}>
            Modules &amp; Settings
          </div>
          {filteredRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <div
                key={route.id}
                onClick={() => handleSelectRoute(route.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--tint-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Icon size={15} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{route.name}</span>
              </div>
            );
          })}

          {/* Device Telemetry Section */}
          {filteredDevices.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '10px 8px 6px', textTransform: 'uppercase' }}>
                IoT Nodes
              </div>
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => {
                    setActiveRoute('dashboard');
                    setIsSearchOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={14} color="var(--text-secondary)" />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{device.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {device.id} • {device.location}
                      </div>
                    </div>
                  </div>
                  <span className={`status-badge ${device.status}`}>
                    {device.status}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <span>Use &uarr; &darr; to navigate</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
