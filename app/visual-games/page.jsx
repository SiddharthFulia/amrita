'use client';

import Link from 'next/link';

const visualGames = [
  { emoji: '📸', title: 'Face Dodge', description: 'Move your head to dodge falling items!', color: '#26c6da', href: '/games/facedodge' },
  { emoji: '😊', title: 'Smile Game', description: 'Smile to make hearts rain down!', color: '#e91e8c', href: '/games/smilegame' },
  { emoji: '🤚', title: 'Hand Catch', description: 'Wave your hand to catch hearts!', color: '#b388ff', href: '/games/handgame' },
];

export default function VisualGamesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: "'Inter', sans-serif", padding: '40px 24px 80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '56px', marginBottom: '8px' }}>📸</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 700, color: '#fff', marginBottom: '8px',
        }}>
          Visual Games
        </h1>
        <p style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
          color: '#26c6da', marginBottom: '8px',
        }}>
          play with your camera!
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
          These games use your phone or laptop camera to track your face, smile, and hand movements. No photos are saved — everything runs locally in your browser.
        </p>
      </div>

      {/* How it works */}
      <div style={{
        display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap',
        maxWidth: '700px', margin: '0 auto 48px',
      }}>
        {[
          { icon: '📷', label: 'Allow camera', desc: 'One-time permission' },
          { icon: '🎮', label: 'Move & play', desc: 'Head, hands, or smile' },
          { icon: '🔒', label: '100% private', desc: 'Nothing leaves your device' },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1 0 140px', maxWidth: '200px', textAlign: 'center',
            background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px 14px',
            border: '1px solid rgba(38,198,218,0.15)',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#26c6da', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Games */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px', maxWidth: '900px', margin: '0 auto',
      }}>
        {visualGames.map(game => (
          <div
            key={game.href}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${game.color}35`,
              borderRadius: '24px', padding: '40px 28px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
              transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = game.color + '80';
              e.currentTarget.style.boxShadow = `0 12px 40px ${game.color}25`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = game.color + '35';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '64px', lineHeight: 1 }}>{game.emoji}</div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif", fontSize: '1.5rem',
              fontWeight: 700, color: '#fff', textAlign: 'center', margin: 0,
            }}>{game.title}</h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.55)', textAlign: 'center', margin: 0 }}>
              {game.description}
            </p>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: game.color, background: game.color + '18', border: `1px solid ${game.color}40`,
              borderRadius: '20px', padding: '4px 14px',
            }}>CAMERA</span>
            <Link href={game.href} style={{
              marginTop: '8px', display: 'inline-block', padding: '12px 36px',
              background: `linear-gradient(135deg, ${game.color}, #b388ff)`,
              color: '#fff', fontWeight: 600, fontSize: '1rem', borderRadius: '50px',
              textDecoration: 'none', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Play →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
