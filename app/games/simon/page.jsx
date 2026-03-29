'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const BUTTONS = [
  { id: 0, emoji: '💕', color: '#e91e8c', dim: 'rgba(233,30,140,0.25)', label: 'Pink' },
  { id: 1, emoji: '💜', color: '#b388ff', dim: 'rgba(179,136,255,0.25)', label: 'Purple' },
  { id: 2, emoji: '💙', color: '#4dd0e1', dim: 'rgba(77,208,225,0.25)', label: 'Teal' },
  { id: 3, emoji: '💛', color: '#ffd54f', dim: 'rgba(255,213,79,0.25)', label: 'Gold' },
];

function getBest() { try { return parseInt(localStorage.getItem('simon_best') || '0'); } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem('simon_best', String(v)); } catch {} }

export default function SimonPage() {
  const [phase, setPhase] = useState('idle'); // idle | showing | input | wrong | win
  const [sequence, setSequence] = useState([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [lit, setLit] = useState(null);
  const [level, setLevel] = useState(0);
  const [best, setBest] = useState(0);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const timeouts = useRef([]);

  useEffect(() => { setBest(getBest()); }, []);

  const clearT = () => { timeouts.current.forEach(clearTimeout); timeouts.current = []; };

  const showSequence = useCallback((seq) => {
    setPhase('showing');
    setPlayerIdx(0);
    const speed = Math.max(200, 600 - seq.length * 20);
    seq.forEach((id, i) => {
      const t1 = setTimeout(() => setLit(id), i * (speed + 300));
      const t2 = setTimeout(() => setLit(null), i * (speed + 300) + speed);
      timeouts.current.push(t1, t2);
    });
    const done = setTimeout(() => { setPhase('input'); setLit(null); }, seq.length * (speed + 300) + 200);
    timeouts.current.push(done);
  }, []);

  const startGame = useCallback(() => {
    clearT();
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    setLevel(1);
    setShake(false);
    setConfetti([]);
    showSequence(first);
  }, [showSequence]);

  const handlePress = useCallback((id) => {
    if (phase !== 'input') return;
    const expected = sequence[playerIdx];
    setLit(id);
    setTimeout(() => setLit(null), 150);

    if (id !== expected) {
      // wrong
      setPhase('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    const nextIdx = playerIdx + 1;
    if (nextIdx === sequence.length) {
      // completed round
      const newLevel = sequence.length + 1;
      setLevel(newLevel);
      if (newLevel - 1 > best) { saveBest(newLevel - 1); setBest(newLevel - 1); }
      setConfetti(Array.from({ length: 12 }, (_, i) => ({ id: i, x: 20 + Math.random() * 60, delay: Math.random() * 0.4, emoji: ['💕','💖','✨','🌸'][i % 4] })));
      setTimeout(() => setConfetti([]), 2000);
      const next = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(next);
      setTimeout(() => showSequence(next), 800);
    } else {
      setPlayerIdx(nextIdx);
    }
  }, [phase, sequence, playerIdx, best, showSequence]);

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 40px' }}>
      <style>{`
        @keyframes fall2 { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(200px) rotate(360deg);opacity:0} }
        @keyframes shakeGrid { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 60%{transform:translateX(10px)} 80%{transform:translateX(-5px)} }
      `}</style>

      <div style={{ width: '100%', maxWidth: '340px', marginBottom: '8px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
      </div>

      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.2rem', color: '#e91e8c', margin: '0 0 4px', textShadow: '0 0 20px #e91e8c80' }}>Simon Says 💜</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 24px' }}>Watch the pattern, repeat it 💕</p>

      {/* Status */}
      <div style={{ marginBottom: '20px', textAlign: 'center', minHeight: '24px' }}>
        {phase === 'showing' && <span style={{ color: '#b388ff', fontSize: '14px' }}>Watch... 👀</span>}
        {phase === 'input' && <span style={{ color: '#4caf50', fontSize: '14px' }}>Your turn! ✨ ({playerIdx + 1}/{sequence.length})</span>}
        {phase === 'wrong' && <span style={{ color: '#e91e8c', fontSize: '14px' }}>Oops! 💔 You reached level {level - 1}</span>}
        {phase === 'idle' && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Press Start to play</span>}
      </div>

      {/* Confetti */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
        {confetti.map(c => (
          <div key={c.id} style={{ position: 'absolute', left: `${c.x}%`, top: '30%', fontSize: '22px', animation: `fall2 1.2s ease ${c.delay}s forwards` }}>{c.emoji}</div>
        ))}
      </div>

      {/* Buttons grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', animation: shake ? 'shakeGrid 0.5s ease' : 'none', marginBottom: '24px' }}>
        {BUTTONS.map(btn => {
          const isLit = lit === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => handlePress(btn.id)}
              disabled={phase !== 'input'}
              style={{
                width: 130, height: 130, borderRadius: '50%',
                background: isLit ? btn.color : btn.dim,
                border: `3px solid ${isLit ? btn.color : 'transparent'}`,
                boxShadow: isLit ? `0 0 40px ${btn.color}80, 0 0 80px ${btn.color}40` : 'none',
                fontSize: '2.8rem', cursor: phase === 'input' ? 'pointer' : 'default',
                transition: 'background 0.08s, box-shadow 0.08s',
                transform: isLit ? 'scale(1.06)' : 'scale(1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{btn.emoji}</button>
          );
        })}
      </div>

      {/* Progress dots */}
      {sequence.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '280px' }}>
          {sequence.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < playerIdx ? '#4caf50' : i === playerIdx && phase === 'input' ? '#e91e8c' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      )}

      {/* Score */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.1em' }}>LEVEL</div>
          <div style={{ color: '#e91e8c', fontSize: '1.6rem', fontWeight: 700 }}>{phase === 'idle' ? 0 : level}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.1em' }}>BEST</div>
          <div style={{ color: '#b388ff', fontSize: '1.6rem', fontWeight: 700 }}>{best}</div>
        </div>
      </div>

      <button onClick={startGame} style={{
        padding: '13px 40px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)',
        border: 'none', borderRadius: '50px', color: '#fff', fontSize: '1rem',
        fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        boxShadow: '0 4px 20px rgba(233,30,140,0.35)',
      }}>{phase === 'idle' || phase === 'wrong' ? (phase === 'wrong' ? 'Try Again 💕' : 'Start 💕') : 'Restart'}</button>
    </div>
  );
}
