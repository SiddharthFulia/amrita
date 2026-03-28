'use client';

import Link from 'next/link';

const games = [
  {
    emoji: '💝',
    title: 'Heart Catcher',
    description: 'Catch all my hearts',
    difficulty: 'Easy',
    href: '/games/catcher',
  },
  {
    emoji: '🎈',
    title: 'Balloon Pop',
    description: 'Pop the hearts before they fly away!',
    difficulty: 'Easy',
    href: '/games/tetris',
  },
  {
    emoji: '🃏',
    title: 'Memory Match',
    description: 'Can you remember how much I love you?',
    difficulty: 'Fun',
    href: '/games/memory',
  },
  {
    emoji: '💙🩷',
    title: 'Tic Tac Toe',
    description: 'Siddharth vs Amrita — who wins?',
    difficulty: '2 Player',
    href: '/games/tictactoe',
  },
  {
    emoji: '🐱',
    title: 'Cat Run',
    description: 'Help the cat run forever!',
    difficulty: 'Medium',
    href: '/games/jump',
  },
  {
    emoji: '🏒',
    title: 'Air Hockey',
    description: 'Face off on the same screen!',
    difficulty: '2 Player',
    href: '/games/airhockey',
  },
];

const difficultyColor = {
  Easy: '#4caf50',
  Medium: '#ff9800',
  Fun: '#e91e8c',
  '2 Player': '#b388ff',
};

export default function GamesPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        color: 'rgba(255,255,255,0.88)',
        fontFamily: "'Inter', sans-serif",
        padding: '40px 24px 80px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '10px',
          }}
        >
          🎮 Games
        </h1>
        <p
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
            color: '#b388ff',
          }}
        >
          made just for you, Amrita
        </p>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        {games.map((game) => (
          <GameCard key={game.href} game={game} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(233,30,140,0.25)',
        borderRadius: '20px',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.borderColor = 'rgba(233,30,140,0.6)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(233,30,140,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(233,30,140,0.25)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Emoji */}
      <div style={{ fontSize: '56px', lineHeight: 1 }}>{game.emoji}</div>

      {/* Title */}
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.4rem',
          fontWeight: 700,
          color: '#fff',
          textAlign: 'center',
          margin: 0,
        }}
      >
        {game.title}
      </h2>

      {/* Description */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          margin: 0,
        }}
      >
        {game.description}
      </p>

      {/* Difficulty badge */}
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: difficultyColor[game.difficulty],
          background: `${difficultyColor[game.difficulty]}22`,
          border: `1px solid ${difficultyColor[game.difficulty]}55`,
          borderRadius: '20px',
          padding: '4px 14px',
        }}
      >
        {game.difficulty}
      </span>

      {/* Play button */}
      <Link
        href={game.href}
        style={{
          marginTop: '8px',
          display: 'inline-block',
          padding: '12px 32px',
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: '1rem',
          borderRadius: '50px',
          textDecoration: 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.85';
          e.currentTarget.style.transform = 'scale(1.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Play →
      </Link>
    </div>
  );
}
