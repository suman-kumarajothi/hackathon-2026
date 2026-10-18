import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Plus, Zap, AlertCircle, Info, Sparkles, CheckCircle2 } from 'lucide-react';

export const AddLampModal = ({ isOpen, onClose, initialCoords, onSuccess }) => {
  const { regions, createDevice, showToast } = useApp();

  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [regionId, setRegionId] = useState('reg-bayfront');
  const [zoneId, setZoneId] = useState('zone-pier12');
  const [customZoneName, setCustomZoneName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [model, setModel] = useState('Luminary-SolarPole-X400');
  const [connectivity, setConnectivity] = useState('Cellular 4G/LTE');
  const [solarRatedWatts, setSolarRatedWatts] = useState(150);
  const [batteryCapacityWh, setBatteryCapacityWh] = useState(768);
  const [lampRatedWatts, setLampRatedWatts] = useState(50);
  const [initialSoC, setInitialSoC] = useState(92);
  const [firmwareVersion, setFirmwareVersion] = useState('v3.4.12-rc2');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-generate suggested ID and prefill clicked coordinates
  useEffect(() => {
    if (isOpen) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setDeviceId(`DEV-SOL-${randomSuffix}`);
      setName(`Smart Pole Municipal #${randomSuffix % 100}`);

      if (initialCoords) {
        setLatitude(initialCoords.lat.toFixed(5));
        setLongitude(initialCoords.lng.toFixed(5));
      } else {
        setLatitude('37.7760');
        setLongitude('-122.4180');
      }
      setErrorMsg('');
    }
  }, [isOpen, initialCoords]);

  if (!isOpen) return null;

  // Selected region's default zones
  const activeRegion = regions.find((r) => r.id === regionId) || regions[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMsg('Please specify valid geographic coordinates (Lat: [-90,90], Lng: [-180,180]).');
      return;
    }

    if (!deviceId.trim() || !name.trim()) {
      setErrorMsg('Device ID and display name are required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        deviceId: deviceId.trim(),
        name: name.trim(),
        regionId,
        zoneId: zoneId === 'custom' ? `zone-${Date.now()}` : zoneId,
        zoneName: zoneId === 'custom' ? (customZoneName.trim() || 'Custom Urban Zone') : undefined,
        latitude: lat,
        longitude: lng,
        model,
        connectivity,
        solarRatedWatts: parseInt(solarRatedWatts, 10),
        batteryCapacityWh: parseInt(batteryCapacityWh, 10),
        initialSoC: parseInt(initialSoC, 10),
        lampRatedWatts: parseInt(lampRatedWatts, 10),
        firmwareVersion,
        notes: notes.trim(),
      };

      const created = await createDevice(payload);
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to persist smart lamp record to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog-lg"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--tint-blue)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Add Smart Lamp from Map Location
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Provision a solar streetlight record with verified geographic coordinates and realistic demonstration profile
              </p>
            </div>
          </div>

          <button
            className="icon-action-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {errorMsg && (
              <div
                style={{
                  background: 'var(--tint-rose)',
                  border: '1px solid rgba(255, 69, 58, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--accent-rose)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Simulated Telemetry Banner */}
            <div
              style={{
                background: 'var(--tint-amber)',
                border: '1px solid rgba(255, 159, 10, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                color: 'var(--accent-amber)',
                fontSize: '12.5px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <Info size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong>Simulated Demonstration Telemetry Notice:</strong> Initial telemetry values (voltage, current, PV yield, irradiance) are generated mathematically within valid engineering ranges for demonstration purposes.
              </div>
            </div>

            {/* Core Identification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Device ID *</label>
                <input
                  type="text"
                  className="form-input"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="DEV-SOL-XXXX"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Display Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Smart Pole Pier 14 #02"
                  required
                />
              </div>
            </div>

            {/* Region & Zone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Region *</label>
                <select
                  className="form-select"
                  value={regionId}
                  onChange={(e) => {
                    setRegionId(e.target.value);
                    if (e.target.value === 'reg-bayfront') setZoneId('zone-pier12');
                    else if (e.target.value === 'reg-civic') setZoneId('zone-commercial');
                    else setZoneId('zone-westgate');
                  }}
                  required
                >
                  <option value="reg-bayfront">District 1: Bayfront &amp; Waterfront</option>
                  <option value="reg-civic">District 2: Civic Center &amp; Commercial</option>
                  <option value="reg-industrial">District 3: Industrial Logistics Park</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Operating Zone *</label>
                <select
                  className="form-select"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  required
                >
                  {regionId === 'reg-bayfront' && (
                    <>
                      <option value="zone-pier12">Pier 12 &amp; Waterfront Promenade</option>
                      <option value="zone-marina">Marina Boardwalk &amp; Harbor Way</option>
                    </>
                  )}
                  {regionId === 'reg-civic' && (
                    <>
                      <option value="zone-commercial">Greenwood Commercial Boulevard</option>
                      <option value="zone-substation">District Substation East Corridor</option>
                    </>
                  )}
                  {regionId === 'reg-industrial' && (
                    <>
                      <option value="zone-westgate">Industrial Park West Gate Area</option>
                      <option value="zone-rooftop">Rooftop Irradiance Station West</option>
                    </>
                  )}
                  <option value="custom">+ Create New Zone in this Region</option>
                </select>
              </div>
            </div>

            {zoneId === 'custom' && (
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">New Custom Zone Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={customZoneName}
                  onChange={(e) => setCustomZoneName(e.target.value)}
                  placeholder="e.g. North Marina Expansion Sector"
                  required
                />
              </div>
            )}

            {/* Geographic Coordinates (Pre-filled from Map Click) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Latitude (from map selection) *</label>
                <input
                  type="number"
                  step="0.00001"
                  className="form-input"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Longitude (from map selection) *</label>
                <input
                  type="number"
                  step="0.00001"
                  className="form-input"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Hardware Specifications */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Hardware Model</label>
                <select
                  className="form-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="Luminary-SolarPole-X400">Luminary-SolarPole-X400 (Standard)</option>
                  <option value="GridMaster-MicroHub-5K">GridMaster-MicroHub-5K (High Power)</option>
                  <option value="SolarMeteo-Pro-V2">SolarMeteo-Pro-V2 (Sensor Station)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Connectivity Ingress</label>
                <select
                  className="form-select"
                  value={connectivity}
                  onChange={(e) => setConnectivity(e.target.value)}
                >
                  <option value="Cellular 4G/LTE">Cellular 4G/LTE (Direct)</option>
                  <option value="LoRaWAN Mesh">LoRaWAN Mesh Gateway</option>
                  <option value="NB-IoT">NB-IoT Low Power</option>
                  <option value="Zigbee Mesh">Zigbee Mesh Node</option>
                </select>
              </div>
            </div>

            {/* Solar & Battery Engineering Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">PV Rating (W)</label>
                <input
                  type="number"
                  className="form-input"
                  value={solarRatedWatts}
                  onChange={(e) => setSolarRatedWatts(e.target.value)}
                  min="20"
                  max="10000"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Battery Capacity (Wh)</label>
                <input
                  type="number"
                  className="form-input"
                  value={batteryCapacityWh}
                  onChange={(e) => setBatteryCapacityWh(e.target.value)}
                  min="100"
                  max="50000"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Initial SoC ({initialSoC}%)</label>
                <input
                  type="range"
                  className="form-range"
                  min="10"
                  max="100"
                  value={initialSoC}
                  onChange={(e) => setInitialSoC(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </div>

            {/* Demonstration Payload Preview */}
            <div
              style={{
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Generated Telemetry Preview</span>
                <span className="badge badge-info" style={{ fontSize: '10px' }}>Simulated Demonstration Data</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', color: 'var(--text-muted)' }}>
                <div>Battery Voltage: <strong style={{ color: 'var(--text-primary)' }}>{(11.8 + (initialSoC / 100) * 1.8).toFixed(2)} V</strong></div>
                <div>Charging Current: <strong style={{ color: 'var(--text-primary)' }}>{((solarRatedWatts * 0.78) / 13.2).toFixed(2)} A</strong></div>
                <div>Panel Power: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(solarRatedWatts * 0.78)} W</strong></div>
                <div>Est. Daily Yield: <strong style={{ color: 'var(--text-primary)' }}>{((solarRatedWatts * 4.2 * 0.85) / 1000).toFixed(2)} kWh</strong></div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              id="confirm-create-device-btn"
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Validating &amp; Persisting...</span>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Confirm &amp; Persist Smart Lamp</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
