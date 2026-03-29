'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const HOLES = 9;
const GAME_DURATION = 60;
const CHARS = [
  { emoji: '❤️', pts: 1, color: '#e91e8c', chance: 0.75 },
  { emoji: '🐱', pts: 3, color: '#b388ff', chance: 0.20 },
  { emoji: '💝', pts: 5, color: '#ffd54f', chance: 0.05 },
];

function pickChar() {
  const r = Math.random();
  let acc = 0;
  for (const c of CHARS) { acc += c.chance; if (r < acc) return c; }
  return CHARS[0];
}
function getBest() { try { return parseInt(localStorage.getItem('mole_best') || '0'); } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem('mole_best', String(v)); } catch {} }

export default function MolePage() {
  const [phase, setPhase] = useState('idle'); // idle | playing | done
  const [holes, setHoles] = useState(Array(HOLES).fill(null)); // null | { emoji, pts, color, id }
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [best, setBest] = useState(0);
  const [floats, setFloats] = useState([]); // {id, hole, pts, x, y}
  const [hitFlash, setHitFlash] = useState(new Set());
  const scoreRef = useRef(0);
  const timers = useRef([]);
  const spawnTimer = useRef(null);
  const clockTimer = useRef(null);
  const spawnInterval = useRef(1200);

  useEffect(() => { setBest(getBest()); }, []);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    clearInterval(spawnTimer.current);
    clearInterval(clockTimer.current);
  };

  const spawnChar = useCallback((currentScore) => {
    setHoles(prev => {
      const emptyIdxs = prev.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      const active = prev.filter(Boolean).length;
      if (emptyIdxs.length === 0 || active >= 3) return prev;
      const idx = emptyIdxs[Math.floor(Math.random() * emptyIdxs.length)];
      const char = pickChar();
      const id = `${idx}-${Date.now()}`;
      const next = [...prev];
      next[idx] = { ...char, id };
      // auto-hide after visibility window
      const visTime = Math.max(400, 800 - Math.floor(currentScore / 15) * 50);
      const t = setTimeout(() => {
        setHoles(p => { const n = [...p]; if (n[idx]?.id === id) n[idx] = null; return n; });
      }, visTime);
      timers.current.push(t);
      return next;
    });
  }, []);

  const startGame = useCallback(() => {
    clearAll();
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setHoles(Array(HOLES).fill(null));
    setFloats([]);
    setHitFlash(new Set());
    spawnInterval.current = 1200;
    setPhase('playing');

    clockTimer.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearAll();
          setPhase('done');
          setBest(b => { const ns = scoreRef.current; if (ns > b) { saveBest(ns); return ns; } return b; });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Spawn loop
    const doSpawn = () => {
      spawnChar(scoreRef.current);
      spawnTimer.current = setTimeout(doSpawn, Math.max(500, spawnInterval.current));
    };
    spawnTimer.current = setTimeout(doSpawn, 400);
  }, [spawnChar]);

  const whack = useCallback((idx, e) => {
    // Capture rect BEFORE async state updater — e.currentTarget is nulled by React after event
    const rect = e.currentTarget?.getBoundingClientRect();
    setHoles(prev => {
      const char = prev[idx];
      if (!char) return prev;
      scoreRef.current += char.pts;
      setScore(scoreRef.current);
      // float +pts text
      if (rect) {
        const floatId = `${Date.now()}-${idx}`;
        setFloats(f => [...f, { id: floatId, pts: char.pts, x: rect.left + rect.width / 2, y: rect.top }]);
        setTimeout(() => setFloats(f => f.filter(ff => ff.id !== floatId)), 800);
      }
      // flash ring
      setHitFlash(s => { const n = new Set(s); n.add(idx); return n; });
      setTimeout(() => setHitFlash(s => { const n = new Set(s); n.delete(idx); return n; }), 200);
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  }, []);

  useEffect(() => () => clearAll(), []);

  const timerColor = timeLeft <= 10 ? '#e91e8c' : timeLeft <= 20 ? '#ff9800' : '#4caf50';

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 40px' }}>
      <style>{`
        @keyframes popUp { 0%{transform:translateY(100%)} 100%{transform:translateY(0)} }
        @keyframes floatUp { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-60px);opacity:0} }
        @keyframes ring { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2);opacity:0} }
      `}</style>

      {/* Float texts */}
      {floats.map(f => (
        <div key={f.id} style={{ position: 'fixed', left: f.x, top: f.y, transform: 'translateX(-50%)', fontSize: '18px', fontWeight: 700, color: '#ffd54f', pointerEvents: 'none', zIndex: 200, animation: 'floatUp 0.8s ease forwards', fontFamily: 'Inter, sans-serif' }}>+{f.pts}</div>
      ))}

      <div style={{ width: '100%', maxWidth: '340px', marginBottom: '8px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
      </div>

      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.2rem', color: '#e91e8c', margin: '0 0 4px', textShadow: '0 0 20px #e91e8c80' }}>Whack a Heart! 💕</h1>

      {/* HUD */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.1em' }}>SCORE</div>
          <div style={{ color: '#e91e8c', fontSize: '1.8rem', fontWeight: 700 }}>{score}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.1em' }}>TIME</div>
          <div style={{ color: timerColor, fontSize: '1.8rem', fontWeight: 700 }}>{timeLeft}s</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.1em' }}>BEST</div>
          <div style={{ color: '#b388ff', fontSize: '1.8rem', fontWeight: 700 }}>{best}</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
        {holes.map((char, idx) => (
          <div
            key={idx}
            onClick={(e) => phase === 'playing' && char && whack(idx, e)}
            style={{
              width: 90, height: 90, borderRadius: '50%',
              background: hitFlash.has(idx) ? 'rgba(233,30,140,0.4)' : char ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${hitFlash.has(idx) ? '#e91e8c' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
              cursor: phase === 'playing' && char ? 'pointer' : 'default',
              boxShadow: char ? `0 0 20px ${char.color}40` : 'none',
              transition: 'background 0.1s, box-shadow 0.2s',
            }}
          >
            {char && (
              <div style={{ fontSize: '2.8rem', lineHeight: 1, animation: 'popUp 0.2s ease', userSelect: 'none' }}>
                {char.emoji}
              </div>
            )}
            {hitFlash.has(idx) && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #e91e8c', animation: 'ring 0.3s ease forwards', pointerEvents: 'none' }} />
            )}
          </div>
        ))}
      </div>

      {/* Guide */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        {CHARS.map(c => (
          <div key={c.emoji} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontSize: '18px' }}>{c.emoji}</span>+{c.pts}
          </div>
        ))}
      </div>

      {(phase === 'idle' || phase === 'done') && (
        <div style={{ textAlign: 'center' }}>
          {phase === 'done' && (
            <>
              <div style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '4px' }}>You scored <strong style={{ color: '#e91e8c' }}>{score}</strong>!</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Best: {best}</div>
            </>
          )}
          <button onClick={startGame} style={{
            padding: '13px 40px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)',
            border: 'none', borderRadius: '50px', color: '#fff', fontSize: '1rem',
            fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>{phase === 'done' ? 'Play Again 💕' : 'Start! 💕'}</button>
        </div>
      )}
    </div>
  );
}
