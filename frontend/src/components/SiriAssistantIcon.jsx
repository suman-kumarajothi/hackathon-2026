import React from 'react';
import siriIconImg from '../assets/siri-assistant.png';

/**
 * macOS Siri-style AI Diagnostic Assistant Icon
 * Uses the supplied official Apple Siri liquid orb asset with fluid animation,
 * squircle geometry, and accessible labeling.
 */
export const SiriAssistantIcon = ({
  size = 28,
  className = '',
  style = {},
  isAnimated = false,
  alt = 'Siri AI Diagnostic Assistant',
}) => {
  return (
    <div
      className={`siri-assistant-icon-container ${className} ${isAnimated ? 'pulsing' : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: isAnimated
          ? '0 0 16px rgba(160, 180, 255, 0.75)'
          : '0 2px 8px rgba(0, 0, 0, 0.35)',
        transition: 'box-shadow 0.3s ease, transform 0.2s ease',
        background: '#040b14',
        ...style,
      }}
      aria-label={alt}
      role="img"
    >
      <img
        src={siriIconImg}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
};

export default SiriAssistantIcon;
