"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/',
    emoji: '♥',
    label: 'Home',
    sublabel: 'Start here',
  },
  {
    href: '/our-moments',
    emoji: '✨',
    label: 'Our Moments',
    sublabel: 'Our story',
  },
  {
    href: '/love-notes',
    emoji: '💌',
    label: 'Love Notes',
    sublabel: 'Sweet words',
  },
  {
    href: '/little-things',
    emoji: '🌸',
    label: 'Little Things',
    sublabel: 'What I love about you',
  },
  {
    href: '/surprise',
    emoji: '🎁',
    label: '12 May Surprise',
    sublabel: 'Coming soon...',
    locked: true,
  },
];

export default function Sidebar({ collapsed, onToggle, isMobile = false, mobileOpen = false, onMobileClose }) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState(null);

  const isVisible = isMobile ? mobileOpen : true;
  const sidebarWidth = isMobile ? '280px' : (collapsed ? '72px' : '260px');
  const translateX = isMobile ? (mobileOpen ? '0' : '-100%') : '0';

  const handleNavClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: sidebarWidth,
        zIndex: 50,
        transform: `translateX(${translateX})`,
        transition: isMobile
          ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'linear-gradient(180deg, rgba(13,13,43,0.99) 0%, rgba(7,7,26,0.99) 100%)',
        borderRight: '1px solid rgba(233, 30, 140, 0.12)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isMobile && mobileOpen ? '4px 0 40px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      {/* Glow edge */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '1px',
          height: '100%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(233,30,140,0.4) 30%, rgba(179,136,255,0.4) 70%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo area */}
      <div
        style={{
          padding: collapsed && !isMobile ? '28px 0' : '24px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: '72px',
          flexShrink: 0,
        }}
      >
        {(!collapsed || isMobile) && (
          <div>
            <div
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: '22px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.2,
              }}
            >
              For Amrita
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.1em',
                marginTop: '2px',
              }}
            >
              with all my love ♥
            </div>
          </div>
        )}

        {collapsed && !isMobile && (
          <div
            style={{
              fontSize: '22px',
              filter: 'drop-shadow(0 0 8px rgba(233,30,140,0.8))',
              animation: 'heart-beat 2s ease-in-out infinite',
            }}
          >
            ♥
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        {!isMobile && !collapsed && (
          <button
            onClick={onToggle}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(233,30,140,0.1)',
              border: '1px solid rgba(233,30,140,0.2)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              flexShrink: 0,
            }}
            title="Collapse sidebar"
          >
            ←
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {(!collapsed || isMobile) && (
          <div
            style={{
              padding: '0 20px 8px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Navigate
          </div>
        )}

        {navItems.map((navItem) => {
          const isActive = pathname === navItem.href;
          const isHovered = hoveredItem === navItem.href;
          const showLabels = !collapsed || isMobile;

          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              onClick={handleNavClick}
              onMouseEnter={() => setHoveredItem(navItem.href)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: showLabels ? '11px 20px' : '13px 0',
                justifyContent: showLabels ? 'flex-start' : 'center',
                textDecoration: 'none',
                margin: '1px 0',
                position: 'relative',
                transition: 'background 0.2s ease',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(233,30,140,0.15), transparent)'
                  : isHovered
                  ? 'rgba(255,255,255,0.04)'
                  : 'transparent',
                borderLeft: isActive ? '2px solid #e91e8c' : '2px solid transparent',
              }}
              title={!showLabels ? navItem.label : undefined}
            >
              <span
                style={{
                  fontSize: showLabels ? '18px' : '20px',
                  minWidth: showLabels ? '22px' : 'auto',
                  textAlign: 'center',
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(233,30,140,0.9))' : 'none',
                  transition: 'filter 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {navItem.emoji}
              </span>

              {showLabels && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#fff' : isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
                      transition: 'color 0.2s ease',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {navItem.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '11px',
                      color: isActive ? 'rgba(233,30,140,0.7)' : 'rgba(255,255,255,0.22)',
                      marginTop: '1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {navItem.sublabel}
                  </div>
                </div>
              )}

              {/* Active dot on collapsed desktop */}
              {isActive && !showLabels && (
                <div
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#e91e8c',
                    boxShadow: '0 0 8px rgba(233,30,140,0.8)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: (!collapsed || isMobile) ? '16px 20px' : '16px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: (!collapsed || isMobile) ? 'space-between' : 'center',
        }}
      >
        {(!collapsed || isMobile) ? (
          <div>
            <div
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: '13px',
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              Made with ♥ by Siddharth
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.15)',
                marginTop: '2px',
              }}
            >
              Just for you, always
            </div>
          </div>
        ) : (
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '14px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Expand"
          >
            →
          </button>
        )}

        {/* Desktop expand toggle (shown when expanded) */}
        {!isMobile && !collapsed && (
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '14px',
              color: 'rgba(233,30,140,0.4)',
              animation: 'heart-beat 2.5s ease-in-out infinite',
            }}
          >
            ♥
          </div>
        )}
      </div>
    </aside>
  );
}
