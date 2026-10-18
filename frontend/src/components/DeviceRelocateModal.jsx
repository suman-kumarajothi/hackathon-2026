import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { MapPin, X, Check, AlertCircle, Compass, Layers } from 'lucide-react';

export const DeviceRelocateModal = ({ isOpen, onClose, device, onSuccess }) => {
  const { regions, setDevices, showToast } = useApp();

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [regionId, setRegionId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (device && isOpen) {
      setLat(device.coordinates?.lat?.toString() || '37.7760');
      setLng(device.coordinates?.lng?.toString() || '-122.4180');
      setRegionId(device.regionId || 'reg-bayfront');
      setZoneId(device.zoneId || 'zone-pier12');
      setError('');
    }
  }, [device, isOpen]);

  // Load zones for selected region
  useEffect(() => {
    if (!regionId) return;
    ApiService.getZones(regionId)
      .then((data) => {
        if (data && data.zones) {
          setZones(data.zones);
          if (!data.zones.some((z) => z.id === zoneId) && data.zones.length > 0) {
            setZoneId(data.zones[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load zones:', err.message);
      });
  }, [regionId]);

  if (!isOpen || !device) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError('Longitude must be a valid number between -180 and 180');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const selectedReg = regions.find((r) => r.id === regionId);
      const selectedZn = zones.find((z) => z.id === zoneId);

      const updatePayload = {
        coordinates: { lat: latNum, lng: lngNum },
        regionId,
        regionName: selectedReg?.name || device.regionName,
        zoneId,
        zoneName: selectedZn?.name || device.zoneName,
        location: selectedZn?.name || device.location,
      };

      const res = await ApiService.updateDevice(device.id, updatePayload);
      const updated = res.device || { ...device, ...updatePayload };

      // Update AppContext devices state
      setDevices((prev) => prev.map((d) => (d.id === device.id ? updated : d)));
      showToast(`Device ${device.id} successfully relocated on GIS map`, 'success');

      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update device location');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Relocate Device"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Relocate Smart Lamp</h3>
          </div>
          <button className="icon-action-btn" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Reassign <strong>{device.name}</strong> ({device.id}) to new geographic coordinates or municipal zone.
            </div>

            {error && (
              <div className="login-error-banner" style={{ marginBottom: '14px' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Operating Region</label>
              <select
                className="form-select"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                required
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Operating Zone</label>
              <select
                className="form-select"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                required
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="form-input font-mono"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="37.7760"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="form-input font-mono"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-122.4180"
                  required
                />
              </div>
            </div>

            {/* Quick Siting Coordinate Presets */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Presets:</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => {
                    setLat('37.7885');
                    setLng('-122.3920');
                    setRegionId('reg-bayfront');
                  }}
                >
                  Pier 14 Mast (37.788, -122.392)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => {
                    setLat('37.7794');
                    setLng('-122.4172');
                    setRegionId('reg-civic');
                  }}
                >
                  Civic Square (37.779, -122.417)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => {
                    setLat('37.7650');
                    setLng('-122.3890');
                    setRegionId('reg-industrial');
                  }}
                >
                  Westgate Depot (37.765, -122.389)
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '12px 20px' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
              {isLoading ? 'Saving Location...' : 'Confirm Relocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceRelocateModal;
