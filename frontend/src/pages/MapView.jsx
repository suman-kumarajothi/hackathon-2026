import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { AddLampModal } from '../components/AddLampModal';
import { DeviceFilterPopover } from '../components/DeviceFilterPopover';
import { DeviceDetailDrawer } from '../components/DeviceDetailDrawer';
import { DeviceRelocateModal } from '../components/DeviceRelocateModal';
import {
  Map as MapIcon,
  Plus,
  Compass,
  Layers,
  Search,
  Zap,
  Battery,
  Sun,
  Activity,
  CalendarClock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Crosshair,
  MapPin,
  Globe,
} from 'lucide-react';

// Exclusively OpenStreetMap (100% Open-Source basemap complying with OSM Tile Usage Policy)
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

const REGIONS = [
  { id: 'all', name: 'All Municipal Districts', center: [37.7760, -122.4180], zoom: 13 },
  { id: 'reg-bayfront', name: 'District 1: Bayfront', center: [37.7850, -122.3900], zoom: 15 },
  { id: 'reg-civic', name: 'District 2: Civic Corridor', center: [37.7760, -122.4180], zoom: 15 },
  { id: 'reg-industrial', name: 'District 3: Port & Industrial', center: [37.7550, -122.3850], zoom: 15 },
  { id: 'reg-sunset', name: 'District 4: Sunset Boulevard', center: [37.7500, -122.4900], zoom: 15 },
];

export const MapView = () => {
  const {
    devices,
    loadDevices,
    selectedDevice,
    setSelectedDevice,
    navigateToSchedule,
    navigateToOracle,
    navigateToDiagnostics,
  } = useApp();

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const activeTileLayerRef = useRef(null);

  // Modal & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [activeDrawerDevice, setActiveDrawerDevice] = useState(null);
  const [relocateDevice, setRelocateDevice] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Filters State (including Region Selector)
  const [filters, setFilters] = useState({
    search: '',
    region: 'all',
    zone: 'all',
    status: 'all',
    connectivity: 'all',
    model: 'all',
    minSoC: 0,
  });

  // Calculate filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          (d.id && d.id.toLowerCase().includes(q)) ||
          (d.name && d.name.toLowerCase().includes(q)) ||
          (d.zoneName && d.zoneName.toLowerCase().includes(q)) ||
          (d.regionName && d.regionName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Region filter
      if (filters.region !== 'all' && d.regionId !== filters.region) {
        return false;
      }

      // Zone
      if (filters.zone !== 'all' && d.zoneId !== filters.zone) {
        return false;
      }

      // Status
      if (filters.status !== 'all' && d.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }

      // Connectivity
      if (filters.connectivity !== 'all' && (!d.connectivity || !d.connectivity.includes(filters.connectivity))) {
        return false;
      }

      // Min SoC
      const soc = d.telemetry?.batterySoC ?? d.batterySoC ?? 0;
      if (filters.minSoC > 0 && soc < filters.minSoC) {
        return false;
      }

      return true;
    });
  }, [devices, filters]);

  // Counts by operational status
  const counts = useMemo(() => {
    return {
      all: devices.length,
      online: devices.filter((d) => d.status === 'online').length,
      warning: devices.filter((d) => d.status === 'warning').length,
      critical: devices.filter((d) => d.status === 'critical').length,
      offline: devices.filter((d) => d.status === 'offline').length,
    };
  }, [devices]);

  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      // Clean up previous instance if exists
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Center on San Francisco municipal deployment area
      const initialLat = 37.7760;
      const initialLng = -122.4180;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false,
      });

      // Add zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tile Layer (complying with OSM Tile Usage Policy)
      const tileLayer = L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);
      activeTileLayerRef.current = tileLayer;

      const markersLayer = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
      markersLayerRef.current = markersLayer;
      setMapReady(true);

      // Invalidate size after layout stabilization
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 200);

      // Click on map to add device
      map.on('click', (e) => {
        setClickedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setIsAddModalOpen(true);
      });

      setMapError(null);
    } catch (err) {
      console.warn('Leaflet map initialization warning:', err.message);
      setMapError('Interactive map tiles unavailable. Displaying geographic vector fallback.');
    }

    return () => {
      setMapReady(false);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Markers on Leaflet Map whenever filteredDevices, mapReady, or selectedDevice changes
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current || !mapReady) return;

    markersLayerRef.current.clearLayers();

    const colorMap = {
      online: '#34c759',
      warning: '#ff9f0a',
      critical: '#ff453a',
      offline: '#8e8e93',
    };

    filteredDevices.forEach((dev) => {
      if (!dev.coordinates || typeof dev.coordinates.lat !== 'number' || typeof dev.coordinates.lng !== 'number') {
        return;
      }

      const color = colorMap[dev.status] || '#34c759';
      const isSelected = selectedDevice?.id === dev.id;

      const iconHtml = `
        <div class="custom-map-pin ${isSelected ? 'selected' : ''} ${dev.status}" data-device-id="${dev.id}" style="--pin-color: ${color};">
          <div class="pin-circular-marker">
            <svg class="pin-bulb-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
              <path d="M9 18h6"></path>
              <path d="M10 22h4"></path>
            </svg>
            <span class="pin-status-dot" style="background-color: ${color};"></span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'leaflet-custom-div-icon',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([dev.coordinates.lat, dev.coordinates.lng], {
        icon: customIcon,
        title: `${dev.name} (${dev.status.toUpperCase()})`,
      });

      marker.bindTooltip(
        `<div class="mac-map-tooltip-box"><strong>${dev.name}</strong><br/><span style="font-family:monospace;font-size:10.5px;color:#a1a1aa;">${dev.id}</span> • <span style="color:${color};font-weight:700;">${dev.status.toUpperCase()}</span></div>`,
        { direction: 'top', offset: [0, -18], className: 'mac-map-tooltip' }
      );

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedDevice(dev);
        setActiveDrawerDevice(dev);
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [mapReady, filteredDevices, selectedDevice, setSelectedDevice]);

  // Fit bounds to devices
  const handleFitBounds = () => {
    if (!leafletMapRef.current) return;
    const validCoords = filteredDevices
      .filter((d) => d.coordinates?.lat && d.coordinates?.lng)
      .map((d) => [d.coordinates.lat, d.coordinates.lng]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  };

  // Center map on a specific device
  const handleFocusDevice = (dev) => {
    setSelectedDevice(dev);
    setActiveDrawerDevice(dev);
    if (leafletMapRef.current && dev.coordinates?.lat && dev.coordinates?.lng) {
      leafletMapRef.current.setView([dev.coordinates.lat, dev.coordinates.lng], 16, { animate: true });
    }
  };

  // Handle region selector change
  const handleRegionChange = (regId) => {
    setFilters((prev) => ({ ...prev, region: regId }));
    const reg = REGIONS.find((r) => r.id === regId);
    if (reg && leafletMapRef.current) {
      leafletMapRef.current.setView(reg.center, reg.zoom, { animate: true });
    }
  };

  return (
    <div className="map-view-page">
      {/* Top Controls Header */}
      <div className="map-view-header">
        <div className="map-header-left">
          <div className="map-view-title-wrap">
            <h1 className="page-title">
              Map View
            </h1>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              Municipal Grid Siting
            </span>
          </div>

          {/* Operational Status Counter Pills */}
          <div className="map-status-pills">
            <button
              className={`status-pill ${filters.status === 'all' ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'all' })}
            >
              <span>All Lamps</span>
              <span className="pill-badge">{counts.all}</span>
            </button>

            <button
              className={`status-pill online ${filters.status === 'online' ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'online' })}
            >
              <span className="pill-dot" />
              <span>Online</span>
              <span className="pill-badge">{counts.online}</span>
            </button>

            <button
              className={`status-pill warning ${filters.status === 'warning' ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'warning' })}
            >
              <span className="pill-dot" />
              <span>Warning</span>
              <span className="pill-badge">{counts.warning}</span>
            </button>

            <button
              className={`status-pill critical ${filters.status === 'critical' ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'critical' })}
            >
              <span className="pill-dot" />
              <span>Critical</span>
              <span className="pill-badge">{counts.critical}</span>
            </button>

            <button
              className={`status-pill offline ${filters.status === 'offline' ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, status: 'offline' })}
            >
              <span className="pill-dot" />
              <span>Offline</span>
              <span className="pill-badge">{counts.offline}</span>
            </button>
          </div>
        </div>

        <div className="map-header-right">
          {/* Region Selector (Requirement 4.2) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="var(--accent-primary)" />
            <select
              id="map-region-selector"
              className="form-select form-select-sm"
              style={{
                height: '32px',
                fontSize: '12px',
                padding: '0 8px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-input)',
                cursor: 'pointer',
              }}
              value={filters.region}
              onChange={(e) => handleRegionChange(e.target.value)}
              title="Filter and center on specific municipal district"
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>


          <button
            className="btn btn-outline btn-sm"
            onClick={handleFitBounds}
            title="Fit view to all matching lamps"
          >
            <Crosshair size={14} />
            <span>Fit to Grid</span>
          </button>

          <button
            id="map-add-lamp-btn"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setClickedCoords({ lat: 37.7760, lng: -122.4180 });
              setIsAddModalOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Add Smart Lamp</span>
          </button>
        </div>
      </div>

      {/* Stacked Vertical Map View Layout: Map on top, Inventory Table below */}
      <div className="map-layout-vertical">
        <div className="map-canvas-container">
            {/* Leaflet interactive Map Container */}
            <div id="map-container" ref={mapContainerRef} className="leaflet-map-root" />

            {/* Offline Vector Fallback if map tiles fail to load */}
            {mapError && (
              <div className="map-offline-fallback">
                <div className="offline-banner">
                  <Compass size={16} />
                  <span>{mapError}</span>
                </div>
                <div className="offline-vector-grid">
                  {filteredDevices.map((dev) => (
                    <div
                      key={dev.id}
                      className={`offline-node ${dev.status}`}
                      onClick={() => handleFocusDevice(dev)}
                    >
                      <div className="node-id">{dev.id}</div>
                      <div className="node-name">{dev.name}</div>
                      <div className="node-coords font-mono">
                        {dev.coordinates?.lat?.toFixed(3)}, {dev.coordinates?.lng?.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Floating Device Filter Component */}
            <DeviceFilterPopover
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen(!isFilterOpen)}
              filters={filters}
              onApply={(newFilters) => setFilters(newFilters)}
              onReset={() =>
                setFilters({
                  search: '',
                  region: 'all',
                  zone: 'all',
                  status: 'all',
                  connectivity: 'all',
                  model: 'all',
                  minSoC: 0,
                })
              }
              totalCount={devices.length}
              filteredCount={filteredDevices.length}
            />

            {/* Persistent Accessible Legend */}
            <div className="map-persistent-legend" aria-label="Device Status Legend">
              <div className="legend-title">Asset Status</div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-dot green" />
                  <span>Online</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot amber" />
                  <span>Warning</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot red" />
                  <span>Critical</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot grey" />
                  <span>Offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Searchable Inventory Table Below Map */}
          <div className="map-inventory-section">
        <div className="inventory-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={17} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Registered Smart Lamps Inventory
            </h3>
            <span className="badge badge-info" style={{ fontSize: '11px' }}>
              Showing {filteredDevices.length} of {devices.length} Devices
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="table-search-box">
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="empty-inventory-state">
            <AlertTriangle size={32} color="var(--accent-amber)" />
            <h4>No smart lamps match the active filter criteria</h4>
            <p>Try clearing your active filters or reset thresholds to view all registered devices.</p>
            <button
              className="btn btn-outline btn-sm"
              onClick={() =>
                setFilters({
                  search: '',
                  region: 'all',
                  zone: 'all',
                  status: 'all',
                  connectivity: 'all',
                  model: 'all',
                  minSoC: 0,
                })
              }
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device Identifier</th>
                  <th>Operating Region &amp; Zone</th>
                  <th>Coordinates</th>
                  <th>Operational Status</th>
                  <th>Battery SoC</th>
                  <th>Solar Harvest</th>
                  <th>Connectivity</th>
                  <th style={{ textAlign: 'right' }}>Contextual Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((dev) => {
                  const soc = dev.telemetry?.batterySoC ?? dev.batterySoC ?? 0;
                  const harvest = dev.telemetry?.solarYieldTodayKWh ?? dev.solarYieldTodayKWh ?? 0;
                  const isSelected = selectedDevice?.id === dev.id;

                  return (
                    <tr
                      key={dev.id}
                      className={isSelected ? 'selected-row' : ''}
                      onClick={() => handleFocusDevice(dev)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`status-indicator ${dev.status}`} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dev.name}</div>
                            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {dev.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          {dev.zoneName || dev.location || 'Civic Corridor'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {dev.regionName || 'District 1: Bayfront'}
                        </div>
                      </td>

                      <td className="font-mono" style={{ fontSize: '11.5px' }}>
                        {dev.coordinates?.lat?.toFixed(4)}, {dev.coordinates?.lng?.toFixed(4)}
                      </td>

                      <td>
                        <span className={`badge badge-${dev.status === 'online' ? 'success' : dev.status === 'warning' ? 'warning' : dev.status === 'critical' ? 'danger' : 'neutral'}`}>
                          {dev.status}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Battery size={13} color="var(--accent-green)" />
                          <span style={{ fontWeight: 600, fontSize: '12.5px' }}>{soc}%</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sun size={13} color="var(--accent-amber)" />
                          <span style={{ fontSize: '12.5px' }}>{harvest} kWh</span>
                        </div>
                      </td>

                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {dev.connectivity || 'Cellular 4G/LTE'}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="icon-action-btn"
                            title="Relocate Device to New Location"
                            onClick={() => setRelocateDevice(dev)}
                          >
                            <MapPin size={15} color="var(--accent-teal, #2dd4bf)" />
                          </button>

                          <button
                            className="icon-action-btn"
                            title="View Schedule"
                            onClick={() => navigateToSchedule(dev)}
                          >
                            <CalendarClock size={15} color="var(--accent-primary)" />
                          </button>

                          <button
                            className="icon-action-btn"
                            title="Health Check"
                            onClick={() => navigateToOracle(dev)}
                          >
                            <Activity size={15} color="var(--accent-purple)" />
                          </button>

                          <button
                            className="icon-action-btn"
                            title="Run Diagnostics"
                            onClick={() => navigateToDiagnostics(dev)}
                          >
                            <Wrench size={15} color="var(--accent-amber)" />
                          </button>

                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handleFocusDevice(dev)}
                          >
                            <span>Inspect</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

      {/* Add Smart Lamp Modal */}
      <AddLampModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialCoords={clickedCoords}
        onSuccess={(newDev) => {
          handleFocusDevice(newDev);
        }}
      />

      {/* Relocate Device Modal (Requirement 4.3) */}
      <DeviceRelocateModal
        isOpen={Boolean(relocateDevice)}
        device={relocateDevice}
        onClose={() => setRelocateDevice(null)}
        onSuccess={(updatedDev) => {
          loadDevices();
          handleFocusDevice(updatedDev);
          setRelocateDevice(null);
        }}
      />

      {/* Device Details Slide-over Drawer */}
      <DeviceDetailDrawer
        device={activeDrawerDevice}
        onClose={() => setActiveDrawerDevice(null)}
        onRelocate={(dev) => setRelocateDevice(dev)}
      />
    </div>
  );
};
