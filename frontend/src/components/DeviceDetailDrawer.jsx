import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import {
  X,
  Zap,
  CalendarClock,
  Activity,
  Wrench,
  BatteryCharging,
  Sun,
  Radio,
  MapPin,
  Clock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  MessageSquare,
  Send,
  User,
} from 'lucide-react';

export const DeviceDetailDrawer = ({ device, onClose, onRelocate }) => {
  const {
    navigateToSchedule,
    navigateToOracle,
    navigateToDiagnostics,
    currentUser,
    showToast,
    loadDevices,
    setSelectedDevice,
  } = useApp();

  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState([]);

  // Synchronize site notes exclusively from selected device (prevents stale notes and cross-device leakage: Requirement 4)
  useEffect(() => {
    if (!device) {
      setLocalNotes([]);
      return;
    }
    if (device.comments && Array.isArray(device.comments) && device.comments.length > 0) {
      setLocalNotes(device.comments);
    } else if (device.notes) {
      setLocalNotes([
        {
          id: `note_init_${device.id}`,
          author: currentUser?.displayName || 'Authorized Operator',
          role: currentUser?.role || 'Field Operations',
          timestamp: 'Recorded in deployment log',
          text: device.notes,
          deviceId: device.id,
        },
      ]);
    } else {
      setLocalNotes([]);
    }
    setNewNoteText('');
  }, [device?.id, device?.notes, device?.comments, currentUser?.displayName, currentUser?.role]);

  const handleAddDeviceNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !device) return;

    // Attribute notes to the authenticated user's actual display name (Requirement 4)
    const authorName = currentUser?.displayName || currentUser?.username || 'Current Operator';
    const authorRole = currentUser?.role || 'Operations Desk';

    const newComment = {
      id: `note_${Date.now()}`,
      author: authorName,
      role: authorRole,
      timestamp: 'Just now',
      text: newNoteText.trim(),
      deviceId: device.id,
    };

    setIsSavingNote(true);
    try {
      await ApiService.updateDevice(device.id, {
        newComment,
        notes: newNoteText.trim(),
      });
      setLocalNotes((prev) => [newComment, ...prev]);
      setNewNoteText('');
      showToast(`Site note recorded and persisted for ${device.name}`, 'success');
      if (loadDevices) loadDevices();
    } catch (err) {
      showToast('Failed to persist site note. Saved to local session.', 'error');
      setLocalNotes((prev) => [newComment, ...prev]);
      setNewNoteText('');
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!device) return null;

  const telemetry = device.telemetry || {};
  const hardware = device.hardware || {};
  const isSimulated = telemetry.isSimulated || false;

  const statusConfig = {
    online: { label: 'Online & Healthy', color: 'var(--accent-green)', bg: 'var(--tint-green)' },
    warning: { label: 'Warning / Degraded', color: 'var(--accent-amber)', bg: 'var(--tint-amber)' },
    critical: { label: 'Critical Fault', color: 'var(--accent-rose)', bg: 'var(--tint-rose)' },
    offline: { label: 'Offline / Telemetry Stale', color: 'var(--text-muted)', bg: 'var(--tint-slate)' },
  };

  const statusMeta = statusConfig[device.status] || statusConfig.online;

  return (
    <div className="device-drawer-backdrop" onClick={onClose}>
      <aside
        className="device-detail-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Details for ${device.name}`}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: statusMeta.bg,
                color: statusMeta.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <span className="drawer-device-id">{device.id}</span>
              <h2 className="drawer-device-name">{device.name}</h2>
            </div>
          </div>

          <button
            className="icon-action-btn"
            onClick={onClose}
            aria-label="Close device drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="drawer-body">
          {/* Status & Simulation Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: statusMeta.bg,
              border: `1px solid ${statusMeta.color}40`,
              marginBottom: '16px',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '13px', color: statusMeta.color }}>
              ● {statusMeta.label}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {device.connectivity || 'Cellular 4G/LTE'}
            </span>
          </div>

          {isSimulated && (
            <div className="simulation-notice-badge">
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>
                <strong>Simulated Demonstration Telemetry:</strong> Values are mathematically simulated within valid physical ranges for PoC demonstration.
              </span>
            </div>
          )}

          {/* Quick Context Action Buttons */}
          <div className="drawer-quick-actions">
            <button
              id="drawer-action-schedule"
              type="button"
              className="drawer-action-btn"
              onClick={() => {
                navigateToSchedule(device);
                onClose();
              }}
              title="Configure schedule for this device"
            >
              <CalendarClock size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>View Schedule</span>
            </button>

            <button
              id="drawer-action-oracle"
              type="button"
              className="drawer-action-btn"
              onClick={() => {
                navigateToOracle(device);
                onClose();
              }}
              title="Open predictive health forecast"
            >
              <Activity size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>Health Check</span>
            </button>

            <button
              id="drawer-action-diagnostics"
              type="button"
              className="drawer-action-btn"
              onClick={() => {
                navigateToDiagnostics(device);
                onClose();
              }}
              title="Run AI voice diagnostics for this device"
            >
              <Wrench size={16} style={{ color: 'var(--accent-amber)' }} />
              <span>Run Diagnostics</span>
            </button>

            {onRelocate && (
              <button
                id="drawer-action-relocate"
                type="button"
                className="drawer-action-btn"
                onClick={() => {
                  onRelocate(device);
                  onClose();
                }}
                title="Change device geographic location and coordinates"
              >
                <MapPin size={16} style={{ color: 'var(--accent-teal, #2dd4bf)' }} />
                <span>Relocate Node</span>
              </button>
            )}
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Live Telemetry &amp; Energy</h4>
            <div className="drawer-telemetry-grid">
              <div className="telemetry-card">
                <div className="telemetry-header">
                  <BatteryCharging size={14} style={{ color: 'var(--accent-green)' }} />
                  <span>Battery SoC</span>
                </div>
                <div className="telemetry-value">
                  {telemetry.batterySoC !== undefined ? `${telemetry.batterySoC}%` : 'N/A'}
                </div>
                <div className="telemetry-sub">
                  Voltage: {telemetry.batteryVoltage ? `${telemetry.batteryVoltage} V` : '13.2 V'}
                </div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-header">
                  <Sun size={14} style={{ color: 'var(--accent-amber)' }} />
                  <span>Solar Harvest</span>
                </div>
                <div className="telemetry-value">
                  {telemetry.solarYieldTodayKWh !== undefined ? `${telemetry.solarYieldTodayKWh} kWh` : '3.42 kWh'}
                </div>
                <div className="telemetry-sub">
                  PV Power: {telemetry.panelPowerW ? `${telemetry.panelPowerW} W` : '112 W'}
                </div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-header">
                  <Zap size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>Lamp Load</span>
                </div>
                <div className="telemetry-value">
                  {telemetry.currentLoadW !== undefined ? `${telemetry.currentLoadW} W` : '45 W'}
                </div>
                <div className="telemetry-sub">
                  Current: {telemetry.chargingCurrentA ? `${telemetry.chargingCurrentA} A` : '3.9 A'}
                </div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-header">
                  <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Last Seen</span>
                </div>
                <div className="telemetry-value" style={{ fontSize: '14px' }}>
                  {telemetry.lastSeen || '12 seconds ago'}
                </div>
                <div className="telemetry-sub">
                  Temp: {telemetry.temperatureC ? `${telemetry.temperatureC}°C` : '24°C'}
                </div>
              </div>
            </div>
          </div>

          {/* Geographic Location & Zone */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Deployment Siting</h4>
            <div className="drawer-info-table">
              <div className="drawer-info-row">
                <span className="drawer-info-key">Region</span>
                <span className="drawer-info-val">{device.regionName || 'District 1: Bayfront'}</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Operating Zone</span>
                <span className="drawer-info-val">{device.zoneName || 'Pier 12 Promenade'}</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Coordinates</span>
                <span className="drawer-info-val font-mono">
                  {device.coordinates?.lat?.toFixed(5)}, {device.coordinates?.lng?.toFixed(5)}
                </span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Active Schedule</span>
                <span className="drawer-info-val">{device.activeSchedule || 'Sunset Adaptive (Eco)'}</span>
              </div>
            </div>
          </div>

          {/* Hardware Specifications */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Hardware Specifications</h4>
            <div className="drawer-info-table">
              <div className="drawer-info-row">
                <span className="drawer-info-key">Model</span>
                <span className="drawer-info-val">{hardware.model || 'Luminary-SolarPole-X400'}</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">PV Panel Rating</span>
                <span className="drawer-info-val">{hardware.solarRatedWatts || 150} W Mono-Si</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Battery Chemistry</span>
                <span className="drawer-info-val">{hardware.batteryCapacityWh || 768} Wh LiFePO4</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Luminaire Rating</span>
                <span className="drawer-info-val">{hardware.lampRatedWatts || 50} W DALI-2 LED</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Firmware Version</span>
                <span className="drawer-info-val font-mono">{hardware.firmwareVersion || 'v3.4.12-rc2'}</span>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          {device.activeAlerts && device.activeAlerts.length > 0 && (
            <div className="drawer-section">
              <h4 className="drawer-section-title" style={{ color: 'var(--accent-rose)' }}>Active Alerts</h4>
              {device.activeAlerts.map((altId) => (
                <div key={altId} className="drawer-alert-item">
                  <ShieldAlert size={15} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                      Alert #{altId}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {device.alertMessage || 'Cell imbalance or solar attenuation anomaly registered.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Site Notes & Infrastructure Comments (Requirement 2) */}
          <div className="drawer-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 className="drawer-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={14} color="var(--accent-primary)" />
                <span>Site Notes &amp; Infrastructure Comments</span>
              </h4>
              <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                {localNotes.length} Notes
              </span>
            </div>

            {/* Notes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto' }}>
              {localNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11.5px' }}>
                      {note.author}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      {note.timestamp}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {note.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddDeviceNote} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder={`Add note as ${currentUser?.displayName || 'Operator'}...`}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                style={{ flex: 1, fontSize: '12px', height: '32px' }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSavingNote || !newNoteText.trim()}
                style={{ height: '32px', padding: '0 10px' }}
                title="Save site note"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
};
