'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ─── Name logic ──────────────────────────────────────────────────────────────
function normalize(s) { return s.trim().toLowerCase().replace(/\s+/g, ' '); }

function isPerfectPair(a, b) {
  const n1 = normalize(a), n2 = normalize(b);
  const pairs = [
    ['amrita', 'siddharth'], ['siddharth', 'amrita'],
    ['amrita', 'tinkerbell'], ['tinkerbell', 'amrita'],
    ['siddharth', 'tinkerbell'], ['tinkerbell', 'siddharth'],
  ];
  return pairs.some(([x, y]) => n1 === x && n2 === y);
}

const NINETY_NAMES = ['mannat', 'tanoushka'];
const EIGHTY_NAMES = ['krishna', 'shrey', 'aman', 'rishu'];

function getSpecialTier(a, b) {
  const n1 = normalize(a), n2 = normalize(b);
  const core = ['amrita', 'siddharth', 'tinkerbell'];
  const hasCore = core.includes(n1) || core.includes(n2);
  const other = core.includes(n1) ? n2 : n1;
  if (!hasCore) return null;
  if (NINETY_NAMES.includes(other)) return '90s';
  if (EIGHTY_NAMES.includes(other)) return '80s';
  if ((n1 === 'mannat' || n2 === 'mannat') && (NINETY_NAMES.includes(n1) || NINETY_NAMES.includes(n2) || core.includes(n1) || core.includes(n2))) return '90s';
  return null;
}

function calcScore(a, b) {
  if (isPerfectPair(a, b)) return 100;
  const tier = getSpecialTier(a, b);
  const s = normalize(a) + '♥' + normalize(b);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  if (tier === '90s') return 88 + Math.abs(hash % 8);
  if (tier === '80s') return 80 + Math.abs(hash % 10);
  return 15 + Math.abs(hash % 60);
}

const MESSAGES = {
  100: null,
  high: [
    "Almost perfect... but not quite there 💭",
    "Strong connection! But legends say only one pair reaches 100%... ✨",
    "The universe approves... mostly 🌙",
  ],
  mid: [
    "There's a spark... but is it love? 🤔",
    "Maybe in another universe! 🌌",
    "Friends? Definitely. Soulmates? Hmm... 😅",
  ],
  low: [
    "The stars aren't aligned 🌙",
    "Not feeling it... try again? 💫",
    "Oops... the love calculator said no 😬",
  ],
};

function getMessage(score) {
  if (score === 100) return null;
  const pool = score >= 70 ? MESSAGES.high : score >= 35 ? MESSAGES.mid : MESSAGES.low;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes lm-heart-3d {
    0%   { transform: perspective(800px) rotateY(0deg) rotateX(5deg) scale(1); }
    25%  { transform: perspective(800px) rotateY(90deg) rotateX(0deg) scale(1.08); }
    50%  { transform: perspective(800px) rotateY(180deg) rotateX(-5deg) scale(1); }
    75%  { transform: perspective(800px) rotateY(270deg) rotateX(0deg) scale(1.08); }
    100% { transform: perspective(800px) rotateY(360deg) rotateX(5deg) scale(1); }
  }
  @keyframes lm-float {
    0%,100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-12px) rotate(2deg); }
    75% { transform: translateY(-8px) rotate(-2deg); }
  }
  @keyframes lm-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
  @keyframes lm-breathe { 0%,100%{opacity:0.4} 50%{opacity:1} }
  @keyframes lm-shine { 0%{background-position:-300% center} 100%{background-position:300% center} }
  @keyframes lm-fall { 0%{transform:translateY(-30px) scale(1.1) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
  @keyframes lm-reveal { 0%{transform:scale(0) rotate(-15deg);opacity:0} 50%{transform:scale(1.1) rotate(2deg);opacity:1} 100%{transform:scale(1) rotate(0)} }
  @keyframes lm-fill { 0%{width:0} 100%{width:var(--fill)} }
  @keyframes lm-count { 0%{opacity:0;transform:scale(0.5)} 30%{opacity:1;transform:scale(1.3)} 100%{transform:scale(1)} }
  @keyframes lm-glow-pulse { 0%,100%{box-shadow:0 0 30px #e91e8c40, 0 0 60px #b388ff20} 50%{box-shadow:0 0 60px #e91e8c80, 0 0 120px #b388ff40, 0 0 180px #e91e8c20} }
  @keyframes lm-orb { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.2)} 66%{transform:translate(-20px,10px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
  @keyframes lm-ring-expand { 0%{transform:scale(0.5);opacity:0.8} 100%{transform:scale(3);opacity:0} }
  @keyframes lm-star-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes lm-text-glow { 0%,100%{text-shadow:0 0 10px #e91e8c80} 50%{text-shadow:0 0 30px #e91e8c, 0 0 60px #b388ff80, 0 0 90px #ffd70040} }
  @keyframes lm-slide-up { 0%{transform:translateY(40px);opacity:0} 100%{transform:translateY(0);opacity:1} }
  @keyframes lm-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
`;

// ─── Floating orbs background ────────────────────────────────────────────────
function FloatingOrbs() {
  const orbs = useRef(Array.from({ length: 8 }, (_, i) => ({
    id: i, size: 40 + Math.random() * 80,
    x: Math.random() * 100, y: Math.random() * 100,
    delay: Math.random() * 8, dur: 12 + Math.random() * 10,
    color: i % 2 === 0 ? '#e91e8c' : '#b388ff',
  }))).current;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {orbs.map(o => (
        <div key={o.id} style={{
          position: 'absolute', left: `${o.x}%`, top: `${o.y}%`,
          width: o.size, height: o.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${o.color}15 0%, transparent 70%)`,
          animation: `lm-orb ${o.dur}s ease ${o.delay}s infinite alternate`,
          filter: 'blur(30px)',
        }} />
      ))}
    </div>
  );
}

// ─── 3D Heart component ──────────────────────────────────────────────────────
function Heart3D({ size = 120, spinning = false, pulsing = false }) {
  return (
    <div style={{
      fontSize: size, lineHeight: 1, display: 'inline-block',
      animation: spinning ? `lm-heart-3d 4s linear infinite` : pulsing ? 'lm-pulse 2s ease infinite' : 'lm-float 4s ease infinite',
      filter: `drop-shadow(0 0 ${size / 3}px #e91e8c80) drop-shadow(0 0 ${size / 1.5}px #e91e8c30)`,
      transformStyle: 'preserve-3d',
    }}>
      ❤️
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return <>{display}</>;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function LoveMeterPage() {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [phase, setPhase] = useState('input'); // input | calculating | result | perfect
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [confetti, setConfetti] = useState([]);
  const [loading, setLoading] = useState(true);

  // Intro loading
  useEffect(() => {
    setTimeout(() => setLoading(false), 1800);
  }, []);

  const calculate = useCallback(() => {
    if (!name1.trim() || !name2.trim()) return;
    const s = calcScore(name1, name2);
    setPhase('calculating');

    // Fake suspense — counting up animation
    setTimeout(() => {
      setScore(s);
      setMessage(getMessage(s) || '');
      setPhase('result');

      if (s === 100) {
        setTimeout(() => {
          setPhase('perfect');
          setConfetti(Array.from({ length: 60 }, (_, i) => ({
            id: i, x: Math.random() * 100, delay: Math.random() * 2.5,
            emoji: ['💕','💖','✨','🌸','💝','🌟','❤️','💗','🦋','🌹','👑','💫'][i % 12],
            size: 14 + Math.random() * 18,
          })));
        }, 1600);
      }
    }, 1500);
  }, [name1, name2]);

  const reset = () => {
    setName1(''); setName2(''); setPhase('input');
    setScore(0); setMessage(''); setConfetti([]);
  };

  const canCalc = name1.trim().length > 0 && name2.trim().length > 0;
  const scoreColor = score === 100 ? '#ffd700' : score >= 80 ? '#4caf50' : score >= 50 ? '#ff9800' : '#ef5350';

  // ── Loading screen ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07071a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <style>{CSS}</style>
        <Heart3D size={80} spinning />
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2rem', color: '#e91e8c', animation: 'lm-breathe 1.5s ease infinite' }}>
          Love Meter
        </div>
        <div style={{ width: '120px', height: '3px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #e91e8c, #b388ff)', animation: 'lm-shine 1.2s linear infinite', backgroundSize: '200% 100%' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 60px', position: 'relative', overflow: 'hidden' }}>
      <style>{CSS}</style>
      <FloatingOrbs />

      {/* Confetti */}
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '-30px', fontSize: `${c.size}px`, animation: `lm-fall ${2.5 + c.delay}s ease ${c.delay * 0.25}s forwards`, pointerEvents: 'none', zIndex: 500 }}>{c.emoji}</div>
      ))}

      {/* Back */}
      <div style={{ width: '100%', maxWidth: '420px', marginBottom: '16px', zIndex: 1 }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
      </div>

      {/* ─── INPUT PHASE ─── */}
      {phase === 'input' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, animation: 'lm-slide-up 0.6s ease' }}>
          <Heart3D size={70} pulsing />
          <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(2.2rem, 6vw, 3rem)', color: '#e91e8c', margin: '12px 0 6px', textShadow: '0 0 30px #e91e8c50', animation: 'lm-text-glow 3s ease infinite' }}>
            Love Meter
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 8px', textAlign: 'center' }}>
            Enter two names and discover the truth
          </p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontStyle: 'italic', margin: '0 0 32px', textAlign: 'center' }}>
            Legend says 100% is impossible... unless it's truly perfect 💫
          </p>

          {/* Name inputs */}
          <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', opacity: 0.7 }}>💗</div>
              <input
                value={name1} onChange={e => setName1(e.target.value)}
                placeholder="First name..."
                onKeyDown={e => e.key === 'Enter' && canCalc && calculate()}
                style={{
                  width: '100%', padding: '16px 18px 16px 48px', borderRadius: '16px',
                  background: 'rgba(233,30,140,0.06)', border: '1.5px solid rgba(233,30,140,0.2)',
                  color: '#fff', fontSize: '16px', fontFamily: "'Inter', sans-serif",
                  outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box',
                  backdropFilter: 'blur(10px)',
                }}
                onFocus={e => { e.target.style.borderColor = '#e91e8c'; e.target.style.boxShadow = '0 0 20px #e91e8c30'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(233,30,140,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Heart divider */}
            <div style={{ textAlign: 'center', fontSize: '24px', animation: 'lm-pulse 2s ease infinite' }}>💕</div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', opacity: 0.7 }}>💗</div>
              <input
                value={name2} onChange={e => setName2(e.target.value)}
                placeholder="Second name..."
                onKeyDown={e => e.key === 'Enter' && canCalc && calculate()}
                style={{
                  width: '100%', padding: '16px 18px 16px 48px', borderRadius: '16px',
                  background: 'rgba(179,136,255,0.06)', border: '1.5px solid rgba(179,136,255,0.2)',
                  color: '#fff', fontSize: '16px', fontFamily: "'Inter', sans-serif",
                  outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box',
                  backdropFilter: 'blur(10px)',
                }}
                onFocus={e => { e.target.style.borderColor = '#b388ff'; e.target.style.boxShadow = '0 0 20px #b388ff30'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(179,136,255,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={!canCalc}
            style={{
              padding: '16px 52px', borderRadius: '50px',
              background: canCalc ? 'linear-gradient(135deg, #e91e8c, #b388ff)' : 'rgba(255,255,255,0.06)',
              border: 'none', color: '#fff', fontSize: '1.05rem', fontWeight: 700,
              cursor: canCalc ? 'pointer' : 'default', fontFamily: "'Inter', sans-serif",
              opacity: canCalc ? 1 : 0.3, transition: 'all 0.3s',
              boxShadow: canCalc ? '0 4px 30px #e91e8c40' : 'none',
              animation: canCalc ? 'lm-glow-pulse 3s ease infinite' : 'none',
            }}
          >
            Calculate Love ❤️
          </button>
        </div>
      )}

      {/* ─── CALCULATING PHASE ─── */}
      {phase === 'calculating' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '60px', animation: 'lm-reveal 0.4s ease' }}>
          <Heart3D size={90} spinning />
          <div style={{ marginTop: '24px', fontFamily: "'Dancing Script', cursive", fontSize: '1.6rem', color: '#e91e8c', animation: 'lm-breathe 1s ease infinite' }}>
            Calculating...
          </div>
          <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            <span style={{ color: '#e91e8c' }}>{name1.trim()}</span> & <span style={{ color: '#b388ff' }}>{name2.trim()}</span>
          </div>
          {/* Scanning bar */}
          <div style={{ width: '200px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', marginTop: '20px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #e91e8c, #b388ff, #e91e8c)', backgroundSize: '200% 100%', animation: 'lm-shine 0.8s linear infinite' }} />
          </div>
        </div>
      )}

      {/* ─── RESULT PHASE (non-100) ─── */}
      {phase === 'result' && score < 100 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '100%', maxWidth: '400px', animation: 'lm-reveal 0.5s ease' }}>
          <div style={{ marginTop: '10px', marginBottom: '16px' }}>
            <Heart3D size={50} pulsing />
          </div>

          {/* Names */}
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', marginBottom: '20px' }}>
            <span style={{ color: '#e91e8c', fontWeight: 700 }}>{name1.trim()}</span>
            {' '}💕{' '}
            <span style={{ color: '#b388ff', fontWeight: 700 }}>{name2.trim()}</span>
          </div>

          {/* Big score */}
          <div style={{
            fontSize: 'clamp(4rem, 12vw, 5.5rem)', fontWeight: 900, lineHeight: 1,
            background: `linear-gradient(135deg, ${scoreColor}, ${score >= 80 ? '#ffd700' : scoreColor}88)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'lm-count 0.6s ease',
            marginBottom: '8px',
          }}>
            <AnimatedNumber value={score} />%
          </div>

          {/* Emoji rating */}
          <div style={{ fontSize: '2.8rem', marginBottom: '16px', animation: 'lm-count 0.5s ease 0.3s both' }}>
            {score >= 80 ? '💛' : score >= 50 ? '😊' : score >= 30 ? '😐' : '💔'}
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
            <div style={{
              '--fill': `${score}%`, height: '100%', borderRadius: '10px',
              background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)`,
              animation: 'lm-fill 1.2s ease forwards', width: 0,
            }} />
          </div>

          {/* Message */}
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center', lineHeight: 1.6, marginBottom: '8px', animation: 'lm-slide-up 0.5s ease 0.4s both' }}>
            {message}
          </p>

          {/* Hint */}
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '11px', fontStyle: 'italic', marginBottom: '24px', textAlign: 'center' }}>
            100% has never been reached... is it even possible? 💫
          </p>

          <button onClick={reset} style={{
            padding: '12px 36px', borderRadius: '50px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            backdropFilter: 'blur(10px)',
          }}>
            Try different names
          </button>
        </div>
      )}

      {/* ─── RESULT 100% (brief before perfect overlay) ─── */}
      {phase === 'result' && score === 100 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, marginTop: '40px', animation: 'lm-reveal 0.5s ease' }}>
          <Heart3D size={80} spinning />
          <div style={{
            fontSize: '5rem', fontWeight: 900, lineHeight: 1, marginTop: '20px',
            background: 'linear-gradient(135deg, #e91e8c, #ffd700, #b388ff, #e91e8c)',
            backgroundSize: '300% 100%', animation: 'lm-shine 2s linear infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            <AnimatedNumber value={100} duration={1400} />%
          </div>
          <div style={{ color: '#ffd700', fontSize: '1.2rem', fontWeight: 600, marginTop: '12px', animation: 'lm-breathe 1s ease infinite' }}>
            Wait for it...
          </div>
        </div>
      )}

      {/* ─── PERFECT 100% OVERLAY ─── */}
      {phase === 'perfect' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'radial-gradient(ellipse at center, rgba(233,30,140,0.15) 0%, rgba(7,7,26,0.97) 70%)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', animation: 'lm-reveal 0.8s ease',
        }}>
          {/* Expanding rings */}
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', width: '150px', height: '150px', borderRadius: '50%',
              border: '2px solid rgba(233,30,140,0.3)',
              animation: `lm-ring-expand 2s ease ${i * 0.6}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}

          {/* 3D spinning heart */}
          <div style={{ marginBottom: '16px' }}>
            <Heart3D size={100} spinning />
          </div>

          {/* Score */}
          <div style={{
            fontSize: 'clamp(4rem, 14vw, 6rem)', fontWeight: 900, lineHeight: 1,
            background: 'linear-gradient(135deg, #ffd700, #e91e8c, #b388ff, #ffd700, #e91e8c)',
            backgroundSize: '400% 100%', animation: 'lm-shine 2.5s linear infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            marginBottom: '8px',
          }}>
            100%
          </div>

          <h2 style={{
            fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(1.8rem, 5vw, 2.4rem)',
            color: '#fff', margin: '0 0 8px',
            animation: 'lm-text-glow 2s ease infinite',
          }}>
            Perfect Match!
          </h2>

          <div style={{
            color: '#ffd700', fontSize: '14px', fontWeight: 600,
            animation: 'lm-pulse 2s ease infinite', marginBottom: '12px',
          }}>
            ✨ This never happens ✨
          </div>

          {/* Names */}
          <div style={{ fontSize: '17px', marginBottom: '6px' }}>
            <span style={{ color: '#e91e8c', fontWeight: 700, fontSize: '20px' }}>{name1.trim()}</span>
            <span style={{ margin: '0 10px', fontSize: '22px', animation: 'lm-pulse 1.5s ease infinite', display: 'inline-block' }}>💕</span>
            <span style={{ color: '#b388ff', fontWeight: 700, fontSize: '20px' }}>{name2.trim()}</span>
          </div>

          <p style={{
            color: 'rgba(255,255,255,0.45)', fontSize: '13px', textAlign: 'center',
            maxWidth: '300px', lineHeight: 1.7, margin: '12px 0 8px',
          }}>
            Out of millions of name combinations, only a chosen few ever reach 100%.
            That's not luck — that's destiny.
          </p>

          {/* Floating hearts row */}
          <div style={{ display: 'flex', gap: '6px', margin: '16px 0 24px' }}>
            {['💕','💖','💗','💝','💘','💞','💓','❤️','💕','💖'].map((e, i) => (
              <span key={i} style={{
                fontSize: '1.3rem', display: 'inline-block',
                animation: `lm-float ${2 + i * 0.2}s ease ${i * 0.15}s infinite`,
              }}>{e}</span>
            ))}
          </div>

          <button onClick={reset} style={{
            padding: '14px 40px', borderRadius: '50px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            animation: 'lm-glow-pulse 2.5s ease infinite',
          }}>
            Try Again 💕
          </button>
        </div>
      )}
    </div>
  );
}
