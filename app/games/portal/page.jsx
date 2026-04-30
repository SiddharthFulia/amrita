'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { getStreak, bumpStreak, loadProgress } from './utils/api';

// Lazy-load game modules
const MemoryGlitch = dynamic(() => import('./components/MemoryGlitch'), { ssr: false });
const AlchemyLab = dynamic(() => import('./components/AlchemyLab'), { ssr: false });
const DigitalDetective = dynamic(() => import('./components/DigitalDetective'), { ssr: false });

const GAMES = [
  {
    id: 'memory',
    title: 'The Memory Glitch',
    subtitle: 'Narrative Spot-the-Difference',
    desc: 'Two diary entries side by side — one has been "glitched." Find and repair the altered words before the memory fades.',
    emoji: '🧠',
    gradient: 'linear-gradient(135deg, #e91e8c30, #b388ff20)',
    border: '#e91e8c40',
    accent: '#e91e8c',
    progressKey: 'memory_glitch',
  },
  {
    id: 'alchemy',
    title: 'The Alchemy Lab',
    subtitle: 'Logic Crafting',
    desc: 'Combine elemental cards to discover new ones. Start with Fire, Water, Earth, and Air — what can you create?',
    emoji: '⚗️',
    gradient: 'linear-gradient(135deg, #b388ff30, #4fc3f720)',
    border: '#b388ff40',
    accent: '#b388ff',
    progressKey: 'alchemy',
  },
  {
    id: 'detective',
    title: 'Digital Detective',
    subtitle: 'Simulated OS',
    desc: 'Explore a mysterious phone. Read messages, study notes, chat with an AI, and crack the passcode to unlock a secret reward.',
    emoji: '🔍',
    gradient: 'linear-gradient(135deg, #4fc3f730, #e91e8c20)',
    border: '#4fc3f740',
    accent: '#4fc3f7',
    progressKey: 'detective',
  },
];

const GLASS = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '24px',
};

const GLASS_STRONG = {
  ...GLASS,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
};

export default function PortalPage() {
  const [activeGame, setActiveGame] = useState(null);
  const [streak, setStreak] = useState({ count: 0, today: false });
  const [progress, setProgress] = useState({});
  const [hoveredGame, setHoveredGame] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getStreak().then(setStreak);
    // Load progress for each game
    Promise.all(GAMES.map(g => loadProgress(g.progressKey))).then(results => {
      const p = {};
      GAMES.forEach((g, i) => { p[g.id] = results[i]; });
      setProgress(p);
    });
  }, []);

  const handlePlay = async (gameId) => {
    await bumpStreak();
    const s = await getStreak();
    setStreak(s);
    setActiveGame(gameId);
  };

  // Render active game
  if (activeGame === 'memory') return <MemoryGlitch onBack={() => setActiveGame(null)} />;
  if (activeGame === 'alchemy') return <AlchemyLab onBack={() => setActiveGame(null)} />;
  if (activeGame === 'detective') return <DigitalDetective onBack={() => setActiveGame(null)} />;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a1a',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes portal-orb { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.3)} 66%{transform:translate(-20px,20px) scale(0.8)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes portal-glow { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes portal-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes portal-streak-pulse { 0%,100%{transform:scale(1);filter:brightness(1)} 50%{transform:scale(1.1);filter:brightness(1.3)} }
      `}</style>

      {/* Ambient orbs */}
      {mounted && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {[
            { x: '15%', y: '20%', size: 300, color: '#e91e8c', delay: 0 },
            { x: '75%', y: '60%', size: 250, color: '#b388ff', delay: 3 },
            { x: '50%', y: '80%', size: 200, color: '#4fc3f7', delay: 6 },
            { x: '85%', y: '15%', size: 180, color: '#e91e8c', delay: 9 },
          ].map((orb, i) => (
            <div key={i} style={{
              position: 'absolute', left: orb.x, top: orb.y,
              width: orb.size, height: orb.size, borderRadius: '50%',
              background: `radial-gradient(circle, ${orb.color}12 0%, transparent 70%)`,
              filter: 'blur(60px)',
              animation: `portal-orb ${15 + i * 3}s ease ${orb.delay}s infinite alternate`,
            }} />
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Back link */}
        <Link href="/games" style={{
          color: '#b388ff', textDecoration: 'none', fontSize: '14px',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', borderRadius: '20px',
          background: 'rgba(179,136,255,0.08)',
          border: '1px solid rgba(179,136,255,0.15)',
          marginBottom: '32px',
        }}>
          ← Games
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '8px', animation: 'portal-float 4s ease infinite' }}>✨</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #e91e8c, #b388ff, #4fc3f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
          }}>
            Game Portal
          </h1>
          <p style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(1.1rem, 3vw, 1.3rem)',
            color: 'rgba(255,255,255,0.5)',
          }}>
            three adventures, made with love
          </p>
        </motion.div>

        {/* Streak + Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap',
            marginBottom: '48px',
          }}
        >
          {/* Daily streak */}
          <div style={{
            ...GLASS_STRONG,
            padding: '16px 28px',
            display: 'flex', alignItems: 'center', gap: '12px',
            animation: streak.count > 0 ? 'portal-streak-pulse 3s ease infinite' : 'none',
          }}>
            <span style={{ fontSize: '28px' }}>🔥</span>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: streak.count > 0 ? '#ffd54f' : 'rgba(255,255,255,0.3)' }}>
                {streak.count}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {streak.today ? 'Day streak ✓' : 'Day streak'}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          {[
            { label: 'Glitches', value: progress.memory?.levelsCompleted || 0, emoji: '🧠', max: 6 },
            { label: 'Elements', value: progress.alchemy?.discovered?.length || 4, emoji: '⚗️', max: 40 },
            { label: 'Case', value: progress.detective?.solved ? '✓' : '—', emoji: '🔍' },
          ].map(stat => (
            <div key={stat.label} style={{
              ...GLASS,
              padding: '14px 22px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '22px' }}>{stat.emoji}</span>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {typeof stat.value === 'number' ? `${stat.value}/${stat.max}` : stat.value}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Game cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              onClick={() => handlePlay(game.id)}
              style={{
                background: hoveredGame === game.id ? game.gradient : GLASS.background,
                backdropFilter: GLASS.backdropFilter,
                WebkitBackdropFilter: GLASS.WebkitBackdropFilter,
                border: `1px solid ${hoveredGame === game.id ? game.border : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '24px',
                padding: 'clamp(24px, 4vw, 36px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: hoveredGame === game.id ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hoveredGame === game.id ? `0 12px 40px ${game.accent}15` : 'none',
                display: 'flex', gap: 'clamp(14px, 3vw, 24px)', alignItems: 'center',
              }}
            >
              {/* Emoji */}
              <div style={{
                fontSize: 'clamp(36px, 8vw, 56px)',
                lineHeight: 1,
                flexShrink: 0,
                width: 'clamp(56px, 14vw, 72px)', height: 'clamp(56px, 14vw, 72px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${game.accent}10`,
                borderRadius: '20px',
                border: `1px solid ${game.accent}25`,
                transition: 'all 0.3s',
                transform: hoveredGame === game.id ? 'scale(1.1)' : 'scale(1)',
              }}>
                {game.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h2 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
                    fontWeight: 700, color: '#fff', margin: 0,
                  }}>
                    {game.title}
                  </h2>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                    color: game.accent, background: `${game.accent}15`,
                    border: `1px solid ${game.accent}30`,
                    padding: '3px 10px', borderRadius: '20px',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {game.subtitle}
                  </span>
                </div>
                <p style={{
                  fontSize: '13px', color: 'rgba(255,255,255,0.45)',
                  margin: 0, lineHeight: 1.6,
                }}>
                  {game.desc}
                </p>
              </div>

              {/* Arrow */}
              <div style={{
                color: game.accent, fontSize: '24px', fontWeight: 300,
                opacity: hoveredGame === game.id ? 1 : 0.3,
                transition: 'all 0.3s',
                transform: hoveredGame === game.id ? 'translateX(4px)' : 'translateX(0)',
                flexShrink: 0,
              }}>
                →
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            textAlign: 'center', marginTop: '56px',
            color: 'rgba(255,255,255,0.15)', fontSize: '12px',
            fontStyle: 'italic',
          }}
        >
          made with love for Amrita 💕
        </motion.div>
      </div>
    </div>
  );
}
