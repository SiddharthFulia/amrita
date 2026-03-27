"use client";

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import FloatingPetals from '@/components/FloatingPetals/FloatingPetals';

export default function ClientLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  const desktopMargin = sidebarCollapsed ? '72px' : '260px';

  return (
    <div className="relative flex min-h-screen">
      <FloatingPetals />

      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <Sidebar
        collapsed={isMobile ? !mobileOpen : sidebarCollapsed}
        onToggle={handleToggle}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(prev => !prev)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 60,
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: mobileOpen
              ? 'linear-gradient(135deg, #e91e8c, #b388ff)'
              : 'rgba(13,13,43,0.9)',
            border: '1px solid rgba(233,30,140,0.3)',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'all 0.3s ease',
          }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? '✕' : '♥'}
        </button>
      )}

      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : desktopMargin,
          transition: 'margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: 0,
          paddingTop: isMobile ? '68px' : 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}
