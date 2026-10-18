import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = () => {
  const { toast, dismissToast } = useApp();

  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--accent-emerald, #10b981)" style={{ flexShrink: 0 }} />;
      case 'error':
        return <AlertCircle size={18} color="var(--accent-rose, #ef4444)" style={{ flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--accent-amber, #f59e0b)" style={{ flexShrink: 0 }} />;
      default:
        return <Info size={18} color="var(--accent-primary, #0a84ff)" style={{ flexShrink: 0 }} />;
    }
  };

  return (
    <div className="app-toast" role="status" aria-live="polite">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        {renderIcon()}
        <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
          {toast.message}
        </span>
      </div>
      <button
        onClick={dismissToast}
        aria-label="Dismiss notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          marginLeft: '8px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <X size={15} />
      </button>
    </div>
  );
};
