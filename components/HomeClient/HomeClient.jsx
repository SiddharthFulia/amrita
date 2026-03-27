"use client";

import dynamic from 'next/dynamic';

const HeartScene = dynamic(() => import('@/components/ThreeD/HeartScene'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontSize: '60px',
          animation: 'heart-beat 2s ease-in-out infinite',
          filter: 'drop-shadow(0 0 20px rgba(233,30,140,0.8))',
        }}
      >
        ♥
      </div>
    </div>
  ),
});

const BearsScene = dynamic(() => import('@/components/ThreeD/BearsScene'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '420px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
      }}
    >
      Loading bears... 🐻
    </div>
  ),
});

export function DynamicHeartScene({ height }) {
  return <HeartScene height={height} />;
}

export function DynamicBearsScene({ height }) {
  return <BearsScene height={height} />;
}
