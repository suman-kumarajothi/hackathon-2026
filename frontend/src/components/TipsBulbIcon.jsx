import React from 'react';
import tipsBulbImg from '../assets/tips-bulb.png';

/**
 * macOS Tips-inspired Lightbulb Brand Icon
 * Uses the supplied official macOS Tips bulb asset with high-DPI scaling,
 * Apple squircle curvature, and ambient glow.
 */
export const TipsBulbIcon = ({ size = 28, className = '', style = {}, alt = 'CMS Platform Icon' }) => {
  const radius = Math.round(size * 0.22);
  return (
    <div
      className={`tips-bulb-icon-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(245, 166, 35, 0.28)',
        ...style,
      }}
      aria-label={alt}
      role="img"
    >
      <img
        src={tipsBulbImg}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          imageRendering: 'auto',
        }}
      />
    </div>
  );
};

export default TipsBulbIcon;
