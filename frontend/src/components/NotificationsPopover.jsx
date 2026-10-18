import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export const NotificationsPopover = ({ onClose }) => {
  const { alerts, acknowledgeAlert, resolveAlert, setActiveRoute } = useApp();

  return (
    <div
      style={{
        position: 'absolute',
        top: '64px',
        right: '24px',
        width: '380px',
        background: 'var(--bg-modal)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 100,
        overflow: 'hidden',
        animation: 'modalScaleUp 0.15s ease-out',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Telemetry Alerts</span>
          <span className="nav-counter alert">{alerts.filter((a) => a.status !== 'resolved').length}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
        {alerts.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No active alerts recorded.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: alert.status === 'unacknowledged' ? 'rgba(255, 69, 58, 0.08)' : 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                {alert.severity === 'critical' ? (
                  <AlertTriangle size={18} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle size={18} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <Info size={18} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {alert.deviceName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{alert.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {alert.title}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {alert.status === 'unacknowledged' && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status !== 'resolved' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        <button
          onClick={() => {
            setActiveRoute('oracle');
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-primary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          View Predictive Maintenance &rarr;
        </button>
      </div>
    </div>
  );
};
