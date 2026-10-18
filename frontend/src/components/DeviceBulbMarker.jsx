import React from 'react';
import tipsBulbImg from '../assets/tips-bulb.png';

/**
 * Shared Circular Device Bulb Marker Component (Requirement 2)
 * Used across Map View, Smart Scheduler, and Telemetry cards.
 * Uses the canonical Tips-style bulb artwork with circular cropping,
 * balanced proportions, and meaningful device status rings/dots
 * without recoloring the canonical icon artwork.
 */
export const DeviceBulbMarker = ({
  device,
  status = device?.status || 'online',
  isSelected = false,
  size = 32,
  showStatusDot = true,
  className = '',
  style = {},
  onClick,
  title,
}) => {
  const statusColorMap = {
    online: '#34c759',
    warning: '#ff9f0a',
    critical: '#ff453a',
    offline: '#8e8e93',
  };

  const statusColor = statusColorMap[status.toLowerCase()] || '#34c759';
  const dotSize = Math.max(7, Math.round(size * 0.26));

  return (
    <div
      className={`device-bulb-marker-wrapper ${isSelected ? 'selected' : ''} ${className}`}
      onClick={onClick}
      title={title || `${device?.name || 'Device'} (${status.toUpperCase()})`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div
        className="device-bulb-marker-disc"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `2px solid ${statusColor}`,
          background: 'var(--bg-card, #ffffff)',
          boxShadow: isSelected
            ? '0 0 0 3px #0a84ff, 0 4px 12px rgba(10, 132, 255, 0.45)'
            : '0 2px 6px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${Math.round(size * 0.1)}px`,
          overflow: 'hidden',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          transform: isSelected ? 'scale(1.12)' : 'scale(1)',
        }}
      >
        <img
          src={tipsBulbImg}
          alt={device?.name || 'Smart Lamp'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      </div>

      {showStatusDot && (
        <span
          className={`device-bulb-status-dot ${status}`}
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            backgroundColor: statusColor,
            border: '1.5px solid var(--bg-card, #ffffff)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      )}
    </div>
  );
};

export default DeviceBulbMarker;
