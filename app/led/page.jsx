'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const COLORS = [
  { name: 'Hot Pink', value: '#e91e8c' },
  { name: 'Red', value: '#ff1744' },
  { name: 'Purple', value: '#b388ff' },
  { name: 'Cyan', value: '#00e5ff' },
  { name: 'Green', value: '#00e676' },
  { name: 'Gold', value: '#ffd740' },
  { name: 'White', value: '#ffffff' },
  { name: 'Rainbow', value: 'rainbow' },
];

const PRESETS = [
  'I Love You ❤️',
  "You're Beautiful 🌸",
  'Miss You 💕',
  'Forever Yours 💍',
  'Happy Birthday 🎂',
  'You + Me = ♾️',
];

const FONTS = [
  { name: 'LED', value: '"Courier New", "Lucida Console", monospace', letterSpacing: '0.15em' },
  { name: 'Cursive', value: '"Dancing Script", cursive', letterSpacing: '0.02em' },
  { name: 'Bold', value: 'Impact, "Arial Black", sans-serif', letterSpacing: '0.05em' },
];

export default function LEDPage() {
  const [message, setMessage] = useState('I Love You ❤️');
  const [selectedColor, setSelectedColor] = useState('#e91e8c');
  const [speed, setSpeed] = useState(8);
  const [fontSize, setFontSize] = useState(6);
  const [fontIndex, setFontIndex] = useState(0);
  const [flicker, setFlicker] = useState(true);
  const [glowPulse, setGlowPulse] = useState(false);
  const [trail, setTrail] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayRef = useRef(null);

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message]);

  const isRainbow = selectedColor === 'rainbow';
  const currentFont = FONTS[fontIndex];
  const displayText = message || 'Type something...';

  const glowColor = isRainbow ? '#e91e8c' : selectedColor;

  const textShadowBase = [
    `0 0 7px ${glowColor}`,
    `0 0 10px ${glowColor}`,
    `0 0 21px ${glowColor}`,
    `0 0 42px ${glowColor}`,
    `0 0 82px ${glowColor}`,
    `0 0 92px ${glowColor}`,
    `0 0 102px ${glowColor}`,
    `0 0 151px ${glowColor}`,
  ].join(', ');

  const keyframesStyle = `
    @keyframes scrollH {
      0% { transform: translateY(-50%) translateX(100vw); }
      100% { transform: translateY(-50%) translateX(-200%); }
    }
    @keyframes scrollV {
      0% { transform: translateY(-50%) rotate(-90deg) translateX(100vh); }
      100% { transform: translateY(-50%) rotate(-90deg) translateX(-200%); }
    }
    @keyframes flickerAnim {
      0%, 100% { opacity: 1; }
      10% { opacity: 0.97; }
      20% { opacity: 0.95; }
      30% { opacity: 1; }
      40% { opacity: 0.96; }
      50% { opacity: 1; }
      60% { opacity: 0.95; }
      70% { opacity: 0.98; }
      80% { opacity: 1; }
      90% { opacity: 0.96; }
    }
    @keyframes glowPulseAnim {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.4); }
    }
    @keyframes rainbowCycle {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
    @keyframes trailFade {
      0% { text-shadow: ${textShadowBase}, 0 0 200px ${glowColor}40; }
      50% { text-shadow: ${textShadowBase}, 0 0 300px ${glowColor}60; }
      100% { text-shadow: ${textShadowBase}, 0 0 200px ${glowColor}40; }
    }
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600&display=swap');
  `;

  const animationName = isMobile ? 'scrollV' : 'scrollH';
  const animationDuration = `${speed}s`;

  const buildTextAnimation = () => {
    const anims = [];
    anims.push(`${animationName} ${animationDuration} linear infinite`);
    if (flicker) anims.push('flickerAnim 0.15s infinite');
    if (glowPulse) anims.push('glowPulseAnim 2s ease-in-out infinite');
    if (isRainbow) anims.push('rainbowCycle 3s linear infinite');
    if (trail) anims.push('trailFade 1.5s ease-in-out infinite');
    return anims.join(', ');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      color: '#ffffff',
      fontFamily: '"Inter", sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style dangerouslySetInnerHTML={{ __html: keyframesStyle }} />

      {/* Back button - hidden in fullscreen */}
      {!isFullscreen && (
        <div style={{ padding: '16px 24px', position: 'relative', zIndex: 10 }}>
          <Link href="/" style={{
            color: '#b388ff',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontFamily: '"Inter", sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            opacity: 0.8,
            transition: 'opacity 0.2s',
          }}>
            ← Back
          </Link>
        </div>
      )}

      {/* Title - hidden in fullscreen */}
      {!isFullscreen && (
        <h1 style={{
          textAlign: 'center',
          fontFamily: '"Dancing Script", cursive',
          fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
          color: '#e91e8c',
          margin: '0 0 16px 0',
          textShadow: '0 0 20px #e91e8c60',
        }}>
          LED Message Board
        </h1>
      )}

      {/* LED Display Area */}
      <div
        ref={displayRef}
        style={{
          height: isFullscreen ? '100vh' : '80vh',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: `
            radial-gradient(circle, #ffffff08 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
          border: isFullscreen ? 'none' : `2px solid ${glowColor}30`,
          borderRadius: isFullscreen ? '0' : '16px',
          margin: isFullscreen ? '0' : '0 auto',
          maxWidth: isFullscreen ? '100%' : 'calc(100% - 32px)',
          boxShadow: `inset 0 0 60px ${glowColor}10, 0 0 30px ${glowColor}15`,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'center' : 'flex-start',
        }}
      >
        {/* Glow on frame edges */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          boxShadow: `inset 0 0 80px ${glowColor}15`,
          borderRadius: 'inherit',
          zIndex: 1,
        }} />

        {/* Scrolling Text */}
        <div style={{
          whiteSpace: 'nowrap',
          fontSize: isMobile ? `clamp(2rem, ${fontSize * 0.7}vw, 8rem)` : `clamp(3rem, ${fontSize}vw, 12rem)`,
          fontFamily: currentFont.value,
          letterSpacing: currentFont.letterSpacing,
          fontWeight: fontIndex === 2 ? '900' : '700',
          color: isRainbow ? '#e91e8c' : selectedColor,
          textShadow: textShadowBase,
          animation: buildTextAnimation(),
          position: 'absolute',
          zIndex: 2,
          top: '50%',
          transformOrigin: 'center center',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}>
          {displayText}
        </div>

        {/* Fullscreen toggle (always visible) */}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 20,
            background: '#ffffff15',
            border: '1px solid #ffffff30',
            borderRadius: '8px',
            color: '#fff',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '1rem',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s',
          }}
        >
          {isFullscreen ? '✕ Exit' : '⛶ Fullscreen'}
        </button>

        {/* Share button */}
        <button
          onClick={handleCopy}
          title="Copy message to clipboard"
          style={{
            position: 'absolute',
            top: '12px',
            right: isFullscreen ? '110px' : '130px',
            zIndex: 20,
            background: '#ffffff15',
            border: '1px solid #ffffff30',
            borderRadius: '8px',
            color: '#fff',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s',
          }}
        >
          {copied ? '✓ Copied!' : '⎘ Share'}
        </button>
      </div>

      {/* Controls — hidden in fullscreen */}
      {!isFullscreen && (
        <div style={{
          padding: '20px 16px 40px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {/* Preset Messages */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#b388ff',
              marginBottom: '8px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Quick Messages
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setMessage(preset)}
                  style={{
                    background: message === preset ? '#e91e8c30' : '#ffffff0a',
                    border: message === preset ? '1px solid #e91e8c80' : '1px solid #ffffff15',
                    borderRadius: '20px',
                    color: message === preset ? '#e91e8c' : '#ffffffcc',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontFamily: '"Inter", sans-serif',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: '1.05rem',
                fontFamily: '"Inter", sans-serif',
                background: '#0d0d2b',
                border: '1px solid #ffffff20',
                borderRadius: '12px',
                color: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#e91e8c80'}
              onBlur={(e) => e.target.style.borderColor = '#ffffff20'}
            />
          </div>

          {/* Color Picker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#b388ff',
              marginBottom: '8px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Color
            </div>
            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    border: selectedColor === color.value
                      ? '2px solid #ffffff'
                      : '2px solid transparent',
                    background: color.value === 'rainbow'
                      ? 'conic-gradient(#ff1744, #ffd740, #00e676, #00e5ff, #b388ff, #e91e8c, #ff1744)'
                      : color.value,
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: selectedColor === color.value
                      ? `0 0 12px ${color.value === 'rainbow' ? '#e91e8c' : color.value}80`
                      : 'none',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Speed + Font Size + Font Selector row */}
          <div style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            {/* Speed Slider */}
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <div style={{
                fontSize: '0.8rem',
                color: '#b388ff',
                marginBottom: '8px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Speed</span>
                <span style={{ color: '#ffffff60', textTransform: 'none', letterSpacing: '0' }}>
                  Slow ← → Fast
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="20"
                step="0.5"
                value={23 - speed}
                onChange={(e) => setSpeed(23 - parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#e91e8c',
                  height: '6px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Font Size Slider */}
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <div style={{
                fontSize: '0.8rem',
                color: '#b388ff',
                marginBottom: '8px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Font Size</span>
                <span style={{ color: '#ffffff60', textTransform: 'none', letterSpacing: '0' }}>
                  {fontSize}rem
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#e91e8c',
                  height: '6px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          {/* Font Selector */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#b388ff',
              marginBottom: '8px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Font Style
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {FONTS.map((font, idx) => (
                <button
                  key={font.name}
                  onClick={() => setFontIndex(idx)}
                  style={{
                    background: fontIndex === idx ? '#e91e8c25' : '#ffffff0a',
                    border: fontIndex === idx ? '1px solid #e91e8c80' : '1px solid #ffffff15',
                    borderRadius: '10px',
                    color: fontIndex === idx ? '#e91e8c' : '#ffffffcc',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontFamily: font.value,
                    fontSize: '1rem',
                    fontWeight: idx === 2 ? '900' : '700',
                    letterSpacing: font.letterSpacing,
                    transition: 'all 0.2s',
                  }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Effects Toggles */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#b388ff',
              marginBottom: '8px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Effects
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'Flicker', active: flicker, toggle: () => setFlicker(f => !f) },
                { label: 'Glow Pulse', active: glowPulse, toggle: () => setGlowPulse(g => !g) },
                { label: 'Trail', active: trail, toggle: () => setTrail(t => !t) },
              ].map((effect) => (
                <button
                  key={effect.label}
                  onClick={effect.toggle}
                  style={{
                    background: effect.active ? '#b388ff25' : '#ffffff0a',
                    border: effect.active ? '1px solid #b388ff80' : '1px solid #ffffff15',
                    borderRadius: '10px',
                    color: effect.active ? '#b388ff' : '#ffffff60',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontFamily: '"Inter", sans-serif',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: effect.active ? '#b388ff' : '#ffffff30',
                    boxShadow: effect.active ? '0 0 8px #b388ff' : 'none',
                    transition: 'all 0.2s',
                  }} />
                  {effect.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
