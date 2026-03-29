'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const HOLES = 9;
const GAME_DURATION = 60;

// ─── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  hearts: {
    label: 'Hearts', emoji: '❤️', accent: '#e91e8c',
    good: [
      { emoji: '❤️',  pts: 1, color: '#e91e8c', chance: 0.55 },
      { emoji: '💖',  pts: 2, color: '#ff4081', chance: 0.28 },
      { emoji: '💝',  pts: 5, color: '#f8bbd0', chance: 0.10 },
    ],
    bad: { emoji: '💔', pts: -3, color: '#ef5350', warn: "Don't whack 💔" },
  },
  cats: {
    label: 'Cats', emoji: '🐱', accent: '#b388ff',
    good: [
      { emoji: '🐱',  pts: 1, color: '#b388ff', chance: 0.55 },
      { emoji: '😸',  pts: 3, color: '#ce93d8', chance: 0.28 },
      { emoji: '😻',  pts: 5, color: '#ea80fc', chance: 0.10 },
    ],
    bad: { emoji: '😾', pts: -3, color: '#ef5350', warn: "Don't whack 😾" },
  },
  dinos: {
    label: 'Dinos', emoji: '🦕', accent: '#66bb6a',
    good: [
      { emoji: '🦕',  pts: 1, color: '#66bb6a', chance: 0.55 },
      { emoji: '🦖',  pts: 3, color: '#81c784', chance: 0.28 },
      { emoji: '🐉',  pts: 5, color: '#c5e1a5', chance: 0.10 },
    ],
    bad: { emoji: '🧑', pts: -3, color: '#ef5350', warn: "Don't whack humans!" },
  },
  birds: {
    label: 'Birds', emoji: '🐦', accent: '#42a5f5',
    good: [
      { emoji: '🐦',  pts: 1, color: '#42a5f5', chance: 0.55 },
      { emoji: '🦜',  pts: 3, color: '#64b5f6', chance: 0.28 },
      { emoji: '🦅',  pts: 5, color: '#90caf9', chance: 0.10 },
    ],
    bad: { emoji: '🐷', pts: -3, color: '#ef5350', warn: "Don't whack 🐷 pigs!" },
  },
  random: {
    label: 'Random', emoji: '🎲', accent: '#ffb74d',
    good: [
      { emoji: '🌸',  pts: 1, color: '#f48fb1', chance: 0.22 },
      { emoji: '⭐',  pts: 1, color: '#ffd54f', chance: 0.18 },
      { emoji: '🍀',  pts: 2, color: '#a5d6a7', chance: 0.18 },
      { emoji: '🦋',  pts: 3, color: '#ce93d8', chance: 0.15 },
      { emoji: '🌈',  pts: 5, color: '#90caf9', chance: 0.12 },
      { emoji: '🎀',  pts: 2, color: '#f48fb1', chance: 0.08 },
    ],
    bad: { emoji: '🧑', pts: -3, color: '#ef5350', warn: "Don't whack humans!" },
  },
};

// ─── Difficulties ──────────────────────────────────────────────────────────────
// pairChance = probability a spawn cycle drops 2 characters at once
const DIFFICULTIES = {
  easy:   { label: 'Easy',   emoji: '🌸', maxActive: 2, spawnMs: 1100, hideMs: 1400, hasBad: false, pairChance: 0,    desc: 'Slow · 1 at a time' },
  medium: { label: 'Medium', emoji: '⚡', maxActive: 5, spawnMs: 750,  hideMs: 950,  hasBad: false, pairChance: 0.35, desc: 'Pairs sometimes · no bad guys' },
  hard:   { label: 'Hard',   emoji: '🔥', maxActive: 6, spawnMs: 700,  hideMs: 900,  hasBad: true,  pairChance: 0.6,  desc: 'Pairs often · bad guys! · use all fingers 🤚' },
};

function pickChar(themeKey, hasBad) {
  const theme = THEMES[themeKey];
  const pool = hasBad
    ? [...theme.good, { ...theme.bad, chance: 0.14 }]
    : theme.good;
  const total = pool.reduce((s, c) => s + c.chance, 0);
  let r = Math.random() * total;
  for (const c of pool) { r -= c.chance; if (r <= 0) return c; }
  return pool[0];
}

function getBest(key) { try { return parseInt(localStorage.getItem(`mole_best_${key}`) || '0'); } catch { return 0; } }
function saveBest(key, v) { try { localStorage.setItem(`mole_best_${key}`, String(v)); } catch {} }

// ─── Component ────────────────────────────────────────────────────────────────
export default function MolePage() {
  const [phase,      setPhase]      = useState('select'); // select | playing | done
  const [themeKey,   setThemeKey]   = useState('hearts');
  const [diffKey,    setDiffKey]    = useState('easy');
  const [holes,      setHoles]      = useState(Array(HOLES).fill(null));
  const [score,      setScore]      = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(GAME_DURATION);
  const [best,       setBest]       = useState(0);
  const [floats,     setFloats]     = useState([]);
  const [hitFlash,   setHitFlash]   = useState(new Set());
  const [badFlash,   setBadFlash]   = useState(new Set()); // red flash for bad whack
  const scoreRef    = useRef(0);
  const timers      = useRef([]);
  const spawnTimer  = useRef(null);
  const clockTimer  = useRef(null);

  useEffect(() => { setBest(getBest(`${themeKey}_${diffKey}`)); }, [themeKey, diffKey]);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    clearTimeout(spawnTimer.current);
    clearInterval(clockTimer.current);
  };

  const spawnChar = useCallback(() => {
    const diff = DIFFICULTIES[diffKey];
    setHoles(prev => {
      const emptyIdxs = [...prev.map((v, i) => v ? -1 : i).filter(i => i >= 0)]
        .sort(() => Math.random() - 0.5); // shuffle
      const active = prev.filter(Boolean).length;
      if (emptyIdxs.length === 0 || active >= diff.maxActive) return prev;

      // Decide to spawn 1 or 2 at once
      const spawnTwo = diff.pairChance > 0
        && Math.random() < diff.pairChance
        && emptyIdxs.length >= 2
        && active + 2 <= diff.maxActive;

      const slots = spawnTwo ? [emptyIdxs[0], emptyIdxs[1]] : [emptyIdxs[0]];
      const hideTime = Math.max(400, diff.hideMs - Math.floor(scoreRef.current / 20) * 25);
      const now = Date.now();
      const next = [...prev];

      slots.forEach((idx, i) => {
        // For pairs in hard mode: second slot has 50% chance of being a bad char
        const forceBad = spawnTwo && i === 1 && diff.hasBad && Math.random() < 0.5;
        const char = forceBad
          ? { ...THEMES[themeKey].bad }
          : pickChar(themeKey, false); // good chars only here; bad appear via forceBad
        const id = `${idx}-${now}-${i}`;
        next[idx] = { ...char, id };
        const t = setTimeout(() => {
          setHoles(p => { const n = [...p]; if (n[idx]?.id === id) n[idx] = null; return n; });
        }, hideTime);
        timers.current.push(t);
      });

      return next;
    });
  }, [themeKey, diffKey]);

  const startGame = useCallback(() => {
    clearAll();
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setHoles(Array(HOLES).fill(null));
    setFloats([]);
    setHitFlash(new Set());
    setBadFlash(new Set());
    setPhase('playing');

    clockTimer.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearAll();
          setPhase('done');
          const bk = `${themeKey}_${diffKey}`;
          setBest(b => { const ns = scoreRef.current; if (ns > b) { saveBest(bk, ns); return ns; } return b; });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const doSpawn = () => {
      spawnChar();
      const diff = DIFFICULTIES[diffKey];
      const nextMs = Math.max(220, diff.spawnMs - Math.floor(scoreRef.current / 25) * 40);
      spawnTimer.current = setTimeout(doSpawn, nextMs);
    };
    spawnTimer.current = setTimeout(doSpawn, 350);
  }, [spawnChar, themeKey, diffKey]);

  const whack = useCallback((idx, e) => {
    const rect = e.currentTarget?.getBoundingClientRect();
    setHoles(prev => {
      const char = prev[idx];
      if (!char) return prev;

      scoreRef.current = Math.max(0, scoreRef.current + char.pts);
      setScore(scoreRef.current);

      if (rect) {
        const floatId = `${Date.now()}-${idx}`;
        const isBad = char.pts < 0;
        setFloats(f => [...f, { id: floatId, pts: char.pts, x: rect.left + rect.width / 2, y: rect.top, bad: isBad }]);
        setTimeout(() => setFloats(f => f.filter(ff => ff.id !== floatId)), 800);
      }

      if (char.pts < 0) {
        // Bad whack — red flash
        setBadFlash(s => { const n = new Set(s); n.add(idx); return n; });
        setTimeout(() => setBadFlash(s => { const n = new Set(s); n.delete(idx); return n; }), 400);
      } else {
        setHitFlash(s => { const n = new Set(s); n.add(idx); return n; });
        setTimeout(() => setHitFlash(s => { const n = new Set(s); n.delete(idx); return n; }), 200);
      }

      const next = [...prev];
      next[idx] = null;
      return next;
    });
  }, []);

  useEffect(() => () => clearAll(), []);

  const theme = THEMES[themeKey];
  const diff  = DIFFICULTIES[diffKey];
  const timerColor = timeLeft <= 10 ? '#ef5350' : timeLeft <= 20 ? '#ff9800' : '#4caf50';
  const bk = `${themeKey}_${diffKey}`;

  // ── Select screen ────────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 40px' }}>
        <div style={{ width: '100%', maxWidth: '380px', marginBottom: '12px' }}>
          <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
        </div>
        <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.2rem', color: '#e91e8c', margin: '0 0 4px', textShadow: '0 0 20px #e91e8c80' }}>Whack a Heart! 💕</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '0 0 28px' }}>Pick your theme and difficulty</p>

        {/* Theme picker */}
        <div style={{ width: '100%', maxWidth: '380px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>THEME</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => setThemeKey(key)} style={{
                flex: '1 0 calc(33% - 8px)', padding: '12px 8px', borderRadius: '14px', cursor: 'pointer',
                background: themeKey === key ? `rgba(${key==='hearts'?'233,30,140':key==='cats'?'179,136,255':key==='dinos'?'76,175,80':key==='birds'?'33,150,243':'255,152,0'},0.22)` : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${themeKey === key ? t.accent : 'rgba(255,255,255,0.1)'}`,
                color: '#fff', fontFamily: 'Inter, sans-serif', textAlign: 'center',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: '1.8rem', lineHeight: 1, marginBottom: '4px' }}>{t.emoji}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: themeKey === key ? t.accent : 'rgba(255,255,255,0.6)' }}>{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* What to expect */}
        <div style={{ width: '100%', maxWidth: '380px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', fontWeight: 700, letterSpacing: '0.1em' }}>PREVIEW</div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {theme.good.map((c, i) => (
              <span key={i} style={{ fontSize: '13px', color: c.color }}>
                {c.emoji} <strong>+{c.pts}</strong>
              </span>
            ))}
            {diff.hasBad && (
              <span style={{ fontSize: '13px', color: '#ef5350' }}>
                {theme.bad.emoji} <strong>{theme.bad.pts}</strong> ← don't whack!
              </span>
            )}
          </div>
        </div>

        {/* Difficulty picker */}
        <div style={{ width: '100%', maxWidth: '380px', marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>DIFFICULTY</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {Object.entries(DIFFICULTIES).map(([key, d]) => (
              <button key={key} onClick={() => setDiffKey(key)} style={{
                flex: 1, padding: '14px 8px', borderRadius: '14px', cursor: 'pointer',
                background: diffKey === key
                  ? key === 'easy' ? 'rgba(76,175,80,0.2)' : key === 'medium' ? 'rgba(255,152,0,0.2)' : 'rgba(244,67,54,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${diffKey === key ? (key === 'easy' ? '#4caf50' : key === 'medium' ? '#ff9800' : '#ef5350') : 'rgba(255,255,255,0.1)'}`,
                color: '#fff', fontFamily: 'Inter, sans-serif', textAlign: 'center',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: '1.4rem', lineHeight: 1, marginBottom: '4px' }}>{d.emoji}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>{d.label}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Best score for this combo */}
        {getBest(bk) > 0 && (
          <div style={{ marginBottom: '16px', color: '#b388ff', fontSize: '13px' }}>
            Best ({theme.label} · {diff.label}): <strong>{getBest(bk)}</strong>
          </div>
        )}

        <button onClick={() => { setBest(getBest(bk)); startGame(); }} style={{
          padding: '15px 52px', background: `linear-gradient(135deg, ${theme.accent}, #b388ff)`,
          border: 'none', borderRadius: '50px', color: '#fff', fontSize: '1.05rem',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          boxShadow: `0 0 24px ${theme.accent}60`,
        }}>
          Start! {theme.emoji}
        </button>
      </div>
    );
  }

  // ── Game / Done ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 40px' }}>
      <style>{`
        @keyframes popUp   { 0%{transform:translateY(110%);opacity:0} 80%{transform:translateY(-6%)} 100%{transform:translateY(0);opacity:1} }
        @keyframes floatUp { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-60px);opacity:0} }
        @keyframes ring    { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
        @keyframes badShake{ 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
      `}</style>

      {/* Float texts */}
      {floats.map(f => (
        <div key={f.id} style={{ position: 'fixed', left: f.x, top: f.y, transform: 'translateX(-50%)', fontSize: '18px', fontWeight: 700, color: f.bad ? '#ef5350' : '#ffd54f', pointerEvents: 'none', zIndex: 200, animation: 'floatUp 0.8s ease forwards' }}>
          {f.bad ? f.pts : `+${f.pts}`}
        </div>
      ))}

      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <button onClick={() => { clearAll(); setPhase('select'); }} style={{ background: 'none', border: 'none', color: '#b388ff', fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}>← Back</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>{theme.emoji} {theme.label} · {diff.emoji} {diff.label}</span>
      </div>

      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2rem', color: theme.accent, margin: '0 0 4px', textShadow: `0 0 20px ${theme.accent}60` }}>Whack a Heart!</h1>

      {/* HUD */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '4px' }}>
        {[['SCORE', score, theme.accent], ['TIME', `${timeLeft}s`, timerColor], ['BEST', best, '#b388ff']].map(([label, val, color]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.12em', fontWeight: 700 }}>{label}</div>
            <div style={{ color, fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.1 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Hard mode warning */}
      {diff.hasBad && (
        <div style={{ fontSize: '11px', color: '#ef5350', marginBottom: '10px', fontWeight: 600 }}>
          ⚠️ {theme.bad.warn}
        </div>
      )}

      {/* Guide */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {theme.good.map((c, i) => (
          <span key={i} style={{ fontSize: '12px', color: c.color }}>{c.emoji} +{c.pts}</span>
        ))}
        {diff.hasBad && (
          <span style={{ fontSize: '12px', color: '#ef5350' }}>{theme.bad.emoji} {theme.bad.pts}</span>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px', touchAction: 'none' }}>
        {holes.map((char, idx) => {
          const isBadChar = char && char.pts < 0;
          const isHit = hitFlash.has(idx);
          const isBadHit = badFlash.has(idx);
          return (
            <div
              key={idx}
              onTouchStart={(e) => {
                // Multi-touch: each finger on a different hole fires independently
                if (phase === 'playing' && char) { e.preventDefault(); whack(idx, e); }
              }}
              onClick={(e) => {
                // Desktop fallback (touch already handled above)
                if (phase === 'playing' && char) whack(idx, e);
              }}
              style={{
                width: 88, height: 88, borderRadius: '50%',
                background: isBadHit
                  ? 'rgba(244,67,54,0.35)'
                  : isHit
                    ? `rgba(${themeKey==='hearts'?'233,30,140':themeKey==='cats'?'179,136,255':themeKey==='dinos'?'76,175,80':themeKey==='birds'?'33,150,243':'255,152,0'},0.4)`
                    : char
                      ? isBadChar ? 'rgba(244,67,54,0.12)' : 'rgba(255,255,255,0.07)'
                      : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isBadHit ? '#ef5350' : isHit ? theme.accent : isBadChar && char ? '#ef535060' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative',
                cursor: phase === 'playing' && char ? 'pointer' : 'default',
                boxShadow: char
                  ? isBadChar
                    ? '0 0 18px rgba(244,67,54,0.3)'
                    : `0 0 20px ${char.color || theme.accent}40`
                  : 'none',
                transition: 'background 0.1s, box-shadow 0.15s',
                animation: isBadHit ? 'badShake 0.35s ease' : 'none',
              }}
            >
              {char && (
                <div style={{ fontSize: '2.6rem', lineHeight: 1, animation: 'popUp 0.18s ease', userSelect: 'none' }}>
                  {char.emoji}
                </div>
              )}
              {/* Ring effect on good hit */}
              {isHit && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${theme.accent}`, animation: 'ring 0.3s ease forwards', pointerEvents: 'none' }} />
              )}
              {/* Red ring on bad hit */}
              {isBadHit && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #ef5350', animation: 'ring 0.35s ease forwards', pointerEvents: 'none' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Done state */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', animation: 'popUp 0.3s ease' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>{score > best - 1 ? '🏆' : '💔'}</div>
          <div style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '4px' }}>
            You scored <strong style={{ color: theme.accent }}>{score}</strong>!
          </div>
          {score >= best && score > 0 && (
            <div style={{ color: '#ffd54f', fontSize: '13px', marginBottom: '4px' }}>🌟 New best!</div>
          )}
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>
            Best: {best}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => { setBest(getBest(bk)); startGame(); }} style={{
              padding: '12px 28px', background: `linear-gradient(135deg,${theme.accent},#b388ff)`,
              border: 'none', borderRadius: '50px', color: '#fff', fontSize: '0.95rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>Play Again {theme.emoji}</button>
            <button onClick={() => setPhase('select')} style={{
              padding: '12px 20px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: '#fff',
              fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>Change</button>
          </div>
        </div>
      )}
    </div>
  );
}
