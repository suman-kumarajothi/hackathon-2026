import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, RotateCcw, SlidersHorizontal, GripHorizontal } from 'lucide-react';

export const DeviceFilterPopover = ({
  isOpen,
  onToggle,
  filters,
  onApply,
  onReset,
  totalCount,
  filteredCount,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draggable positioning state (for desktop)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const panelRef = useRef(null);

  // Synchronize when opening or when external filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

  // Immediate filter update helper
  const updateFilterField = (field, value) => {
    const nextFilters = {
      ...localFilters,
      [field]: value,
      ...(field === 'region' ? { zone: 'all' } : {}),
    };
    setLocalFilters(nextFilters);
    onApply(nextFilters);
  };

  const handleClear = () => {
    const cleared = {
      search: '',
      region: 'all',
      zone: 'all',
      status: 'all',
      connectivity: 'all',
      model: 'all',
      minSoC: 0,
    };
    setLocalFilters(cleared);
    onReset();
  };

  // Pointer Drag Handlers (Disabled on Mobile for Stable Anchored Positioning)
  const handlePointerDown = (e) => {
    if (isMobile) return;
    if (e.target.closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || isMobile) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy,
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (isMobile && (k === 'connectivity' || k === 'minSoC')) return false;
    if (k === 'minSoC') return v > 0;
    return v !== 'all' && v !== '';
  }).length;

  return (
    <div className="floating-filter-container">
      {/* Floating Trigger Button */}
      <button
        id="floating-filter-trigger"
        className={`floating-filter-btn ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        title="Filter Smart Lamps"
        aria-label="Filter Smart Lamps"
      >
        <SlidersHorizontal size={16} />
        <span>Filter Devices</span>
        {activeCount > 0 && (
          <span className="filter-badge-count">{activeCount}</span>
        )}
      </button>

      {/* Floating Popover Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="floating-filter-panel"
          role="dialog"
          aria-label="Device Filters"
          style={{
            transform: isMobile ? 'none' : `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }}
        >
          {/* Header */}
          <div
            className="filter-panel-header"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              cursor: isMobile ? 'default' : (isDragging ? 'grabbing' : 'grab'),
              userSelect: 'none',
              touchAction: 'none',
            }}
            title={isMobile ? undefined : 'Drag to reposition panel'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              {!isMobile && (
                <GripHorizontal size={15} color="var(--text-muted)" style={{ cursor: 'grab', flexShrink: 0 }} />
              )}
              <Filter size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: isMobile ? '12px' : '13.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isMobile ? 'Filters' : 'Filter Telemetry & Inventory'}
              </span>
            </div>
            <button
              type="button"
              className="icon-action-btn"
              style={{ width: '24px', height: '24px' }}
              onClick={onToggle}
              aria-label="Close filters"
            >
              <X size={14} />
            </button>
          </div>

          <div className="filter-panel-body">
            {/* 1. Device Search (Immediate Update) */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Device Search</label>
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="Search by ID, name, or zone..."
                value={localFilters.search}
                onChange={(e) => updateFilterField('search', e.target.value)}
              />
            </div>

            {/* 2. Status Chips (Immediate Update) */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Status</label>
              <div className="filter-status-chips">
                {['all', 'online', 'warning', 'critical', 'offline'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`status-chip ${localFilters.status === st ? 'selected' : ''} ${st}`}
                    onClick={() => updateFilterField('status', st)}
                  >
                    {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Region and 4. Zone in a compact responsive row */}
            <div className="filter-grid-row" style={{ marginBottom: '10px' }}>
              {/* Region Filter (Immediate Update) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Region</label>
                <select
                  className="form-select form-select-sm"
                  value={localFilters.region}
                  onChange={(e) => updateFilterField('region', e.target.value)}
                >
                  <option value="all">All Regions</option>
                  <option value="reg-bayfront">District 1: Bayfront</option>
                  <option value="reg-civic">District 2: Civic</option>
                  <option value="reg-industrial">District 3: Industrial</option>
                </select>
              </div>

              {/* Zone Filter (Cascading, Immediate Update) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Zone</label>
                <select
                  className="form-select form-select-sm"
                  value={localFilters.zone}
                  onChange={(e) => updateFilterField('zone', e.target.value)}
                >
                  <option value="all">All Zones</option>
                  {(localFilters.region === 'all' || localFilters.region === 'reg-bayfront') && (
                    <>
                      <option value="zone-pier12">Pier 12 &amp; Waterfront</option>
                      <option value="zone-marina">Marina Boardwalk</option>
                    </>
                  )}
                  {(localFilters.region === 'all' || localFilters.region === 'reg-civic') && (
                    <>
                      <option value="zone-commercial">Greenwood Commercial</option>
                      <option value="zone-substation">Substation East</option>
                    </>
                  )}
                  {(localFilters.region === 'all' || localFilters.region === 'reg-industrial') && (
                    <>
                      <option value="zone-westgate">Industrial West Gate</option>
                      <option value="zone-rooftop">Rooftop Station</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Advanced Filters (Hidden on Mobile) */}
            <div className="filter-desktop-only">
              {/* Connectivity */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Connectivity Ingress</label>
                <select
                  className="form-select form-select-sm"
                  value={localFilters.connectivity}
                  onChange={(e) => updateFilterField('connectivity', e.target.value)}
                >
                  <option value="all">All Connectivity Types</option>
                  <option value="Cellular 4G/LTE">Cellular 4G/LTE</option>
                  <option value="LoRaWAN">LoRaWAN Mesh</option>
                  <option value="NB-IoT">NB-IoT</option>
                  <option value="Zigbee">Zigbee Mesh</option>
                </select>
              </div>

              {/* Battery SoC Threshold */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Min Battery SoC</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{localFilters.minSoC}%</span>
                </div>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="90"
                  step="5"
                  value={localFilters.minSoC}
                  onChange={(e) => updateFilterField('minSoC', parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '6px 0', borderTop: '1px solid var(--border-subtle)' }}>
              Matching: <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> devices
            </div>
          </div>

          <div className="filter-panel-footer">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClear}
              style={{ fontSize: '11.5px' }}
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onToggle}
              style={{ fontSize: '11.5px' }}
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
