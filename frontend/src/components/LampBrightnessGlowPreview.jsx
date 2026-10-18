import React from 'react';
import { Lightbulb, Zap } from 'lucide-react';

export const LampBrightnessGlowPreview = ({ brightness = 70, isActive = false, isLiveConfirmed = false }) => {
  // Value clamped 0 to 100
  const val = Math.max(0, Math.min(100, brightness));
  const effectiveVal = isActive ? val : 0;

  // Calculate glow opacity, radius, and color interpolation
  const glowOpacity = (effectiveVal / 100) * 0.95;
  const glowRadius = Math.round(effectiveVal * 0.35 + 4);
  const spreadRadius = Math.round(effectiveVal * 0.18);
  const beamHeight = Math.round(effectiveVal * 0.4 + 10);

  // Filament color from dormant amber-grey to incandescent white-gold
  const bulbColor = effectiveVal === 0 
    ? 'var(--text-muted, #64748b)' 
    : effectiveVal < 40 
      ? '#f59e0b' 
      : effectiveVal < 80 
        ? '#fbbf24' 
        : '#ffffff';

  const glowColor = `rgba(251, 191, 36, ${glowOpacity})`;

  return (
    <div
      className="lamp-brightness-preview-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '10px 14px',
        background: 'var(--bg-canvas, rgba(15, 23, 42, 0.6))',
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--border-card, rgba(255, 255, 255, 0.08))',
        minWidth: '220px',
      }}
      aria-label={`Lamp Brightness Preview: ${effectiveVal}%`}
    >
      {/* Visual Bulb with Dynamic Radial Glow & Beam */}
      <div
        style={{
          position: 'relative',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--bg-surface, #1e293b)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isActive && effectiveVal > 0 
            ? `0 0 ${glowRadius}px ${spreadRadius}px ${glowColor}` 
            : 'none',
          transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <Lightbulb
          size={26}
          style={{
            color: bulbColor,
            fill: effectiveVal > 0 ? (effectiveVal > 60 ? '#fde047' : '#f59e0b') : 'none',
            filter: effectiveVal > 30 ? `drop-shadow(0 0 ${Math.round(effectiveVal * 0.1)}px #fde047)` : 'none',
            transition: 'all 0.2s ease',
          }}
        />

        {/* Illuminated ground beam cone simulation */}
        {isActive && effectiveVal > 10 && (
          <div
            style={{
              position: 'absolute',
              top: '44px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${Math.round(effectiveVal * 0.5 + 20)}px`,
              height: `${beamHeight}px`,
              background: `linear-gradient(to bottom, rgba(251, 191, 36, ${glowOpacity * 0.5}), transparent)`,
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
              pointerEvents: 'none',
              transition: 'all 0.2s ease',
            }}
          />
        )}
      </div>

      {/* Numerical Metrics and Hardware State */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {effectiveVal}%
          </span>
          <span
            className="badge"
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              background: isActive ? 'var(--tint-amber, rgba(245, 158, 11, 0.15))' : 'var(--tint-slate, rgba(148, 163, 184, 0.15))',
              color: isActive ? 'var(--accent-amber, #f59e0b)' : 'var(--text-muted, #94a3b8)',
              border: `1px solid ${isActive ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
            }}
          >
            {isActive ? (isLiveConfirmed ? 'APPLIED TO MESH' : 'LIVE PREVIEW') : 'STANDBY'}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {effectiveVal === 0 
            ? 'Luminaire Extinguished' 
            : effectiveVal < 35 
              ? 'Eco Curfew Minimum (250 lm)' 
              : effectiveVal < 75 
                ? 'Standard Municipal Level (1,800 lm)' 
                : 'High-Visibility Emergency (3,200 lm)'}
        </div>
      </div>
    </div>
  );
};
