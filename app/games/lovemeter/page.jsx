'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── Special pairs ───────────────────────────────────────────────────────────
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

// High-score pairs (sisters, family) — get 85-95%
function isHighPair(a, b) {
  const n1 = normalize(a), n2 = normalize(b);
  const pairs = [
    ['amrita', 'mannat'], ['mannat', 'amrita'],
    ['siddharth', 'mannat'], ['mannat', 'siddharth'],
    ['mannat', 'tinkerbell'], ['tinkerbell', 'mannat'],
  ];
  return pairs.some(([x, y]) => n1 === x && n2 === y);
}

// Deterministic "random" based on names — always < 75 for non-special pairs
function calcScore(a, b) {
  if (isPerfectPair(a, b)) return 100;
  if (isHighPair(a, b)) {
    // 85-95 range, deterministic per pair
    const s = normalize(a) + '♥' + normalize(b);
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    return 85 + Math.abs(hash % 11); // 85–95
  }
  const s = normalize(a) + '♥' + normalize(b);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  return 15 + Math.abs(hash % 60); // 15–74, NEVER reaches 75+
}

function getMessage(score) {
  if (score === 100) return null; // special overlay handles this
  if (score >= 60) return "There's something there... but not quite perfect 💭";
  if (score >= 40) return "Hmm, maybe as friends? 😅";
  if (score >= 25) return "The stars aren't aligned for this one 🌙";
  return "Yikes... try different names 😬";
}

function getEmoji(score) {
  if (score === 100) return '💕';
  if (score >= 60) return '💛';
  if (score >= 40) return '😐';
  if (score >= 25) return '😕';
  return '💔';
}

// ─── 3D Heart CSS (only shown on 100%) ───────────────────────────────────────
const HEART_3D_CSS = `
  @keyframes lmFloat { 0%,100%{transform:translateY(0) rotateY(0deg)} 50%{transform:translateY(-18px) rotateY(180deg)} }
  @keyframes lmPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
  @keyframes lmShine { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes lmConfetti { 0%{transform:translateY(-20px) scale(1.2);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
  @keyframes lmGlow { 0%,100%{box-shadow:0 0 30px #e91e8c60} 50%{box-shadow:0 0 80px #e91e8c90, 0 0 120px #b388ff50} }
  @keyframes lmReveal { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.15) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
  @keyframes lmFillBar { 0%{width:0%} 100%{width:var(--target)} }
  @keyframes lmBounce { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
  @keyframes lm3DHeart {
    0%   { transform: perspective(600px) rotateY(0deg) scale(1); }
    25%  { transform: perspective(600px) rotateY(90deg) scale(1.1); }
    50%  { transform: perspective(600px) rotateY(180deg) scale(1); }
    75%  { transform: perspective(600px) rotateY(270deg) scale(1.1); }
    100% { transform: perspective(600px) rotateY(360deg) scale(1); }
  }
  @keyframes lmRainbow {
    0%   { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
  @keyframes lmTextGlow {
    0%,100% { text-shadow: 0 0 10px #e91e8c80, 0 0 20px #b388ff40; }
    50%     { text-shadow: 0 0 20px #e91e8c, 0 0 40px #b388ff80, 0 0 60px #e91e8c40; }
  }
  @keyframes lmStarBurst {
    0%   { transform: scale(0) rotate(0deg); opacity: 1; }
    100% { transform: scale(3) rotate(180deg); opacity: 0; }
  }
`;

export default function LoveMeterPage() {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [result, setResult] = useState(null); // { score, animating }
  const [confetti, setConfetti] = useState([]);
  const [showSpecial, setShowSpecial] = useState(false);
  const barRef = useRef(null);

  const calculate = () => {
    if (!name1.trim() || !name2.trim()) return;
    const score = calcScore(name1, name2);
    setResult({ score, animating: true });
    setShowSpecial(false);
    setConfetti([]);

    // Animate the bar filling
    setTimeout(() => setResult(r => r ? { ...r, animating: false } : r), 1200);

    // If 100%, trigger the special animation after bar fills
    if (score === 100) {
      setTimeout(() => {
        setShowSpecial(true);
        setConfetti(Array.from({ length: 50 }, (_, i) => ({
          id: i, x: Math.random() * 100, delay: Math.random() * 2,
          emoji: ['💕','💖','✨','🌸','💝','🌟','❤️','💗','🦋','🌹'][i % 10],
          size: 16 + Math.random() * 14,
        })));
      }, 1400);
    }
  };

  const reset = () => {
    setName1(''); setName2(''); setResult(null);
    setShowSpecial(false); setConfetti([]);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 60px' }}>
      <style>{HEART_3D_CSS}</style>

      {/* Confetti (only on 100%) */}
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '-30px', fontSize: `${c.size}px`, animation: `lmConfetti ${2 + c.delay}s ease ${c.delay * 0.3}s forwards`, pointerEvents: 'none', zIndex: 500 }}>{c.emoji}</div>
      ))}

      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '12px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
      </div>

      {/* Title */}
      <div style={{ fontSize: '3.5rem', marginBottom: '4px', animation: 'lmPulse 2s ease infinite' }}>💕</div>
      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.6rem', color: '#e91e8c', margin: '0 0 4px', textShadow: '0 0 24px #e91e8c60' }}>Love Meter</h1>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '0 0 32px', textAlign: 'center' }}>
        Enter two names and discover your love percentage 💫
      </p>

      {/* Input fields */}
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>💗</span>
          <input
            value={name1} onChange={e => { setName1(e.target.value); setResult(null); }}
            placeholder="First name..."
            onKeyDown={e => e.key === 'Enter' && calculate()}
            style={{
              width: '100%', padding: '14px 16px 14px 44px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(233,30,140,0.3)',
              color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif",
              outline: 'none', transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#e91e8c'}
            onBlur={e => e.target.style.borderColor = 'rgba(233,30,140,0.3)'}
          />
        </div>

        <div style={{ textAlign: 'center', fontSize: '20px' }}>❤️</div>

        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>💗</span>
          <input
            value={name2} onChange={e => { setName2(e.target.value); setResult(null); }}
            placeholder="Second name..."
            onKeyDown={e => e.key === 'Enter' && calculate()}
            style={{
              width: '100%', padding: '14px 16px 14px 44px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(179,136,255,0.3)',
              color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif",
              outline: 'none', transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#b388ff'}
            onBlur={e => e.target.style.borderColor = 'rgba(179,136,255,0.3)'}
          />
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={calculate}
        disabled={!name1.trim() || !name2.trim()}
        style={{
          padding: '14px 48px', borderRadius: '50px',
          background: name1.trim() && name2.trim() ? 'linear-gradient(135deg, #e91e8c, #b388ff)' : 'rgba(255,255,255,0.08)',
          border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 700,
          cursor: name1.trim() && name2.trim() ? 'pointer' : 'default',
          fontFamily: "'Inter', sans-serif", marginBottom: '28px',
          boxShadow: name1.trim() && name2.trim() ? '0 0 30px #e91e8c40' : 'none',
          transition: 'all 0.2s',
          opacity: name1.trim() && name2.trim() ? 1 : 0.4,
        }}
      >
        Calculate Love 💕
      </button>

      {/* Result */}
      {result && (
        <div style={{ width: '100%', maxWidth: '360px', animation: 'lmReveal 0.5s ease', textAlign: 'center' }}>
          {/* Names */}
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
            <span style={{ color: '#e91e8c', fontWeight: 600 }}>{name1.trim()}</span>
            {' '}&{' '}
            <span style={{ color: '#b388ff', fontWeight: 600 }}>{name2.trim()}</span>
          </div>

          {/* Percentage */}
          <div style={{
            fontSize: '4rem', fontWeight: 800, lineHeight: 1,
            background: result.score === 100
              ? 'linear-gradient(135deg, #e91e8c, #ff4081, #b388ff, #e91e8c)'
              : 'linear-gradient(135deg, #e91e8c, #b388ff)',
            backgroundSize: result.score === 100 ? '300% 100%' : '100% 100%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: result.score === 100 ? 'lmShine 2s linear infinite, lmTextGlow 1.5s ease infinite' : 'lmBounce 0.4s ease',
            marginBottom: '12px',
            textShadow: result.score === 100 ? '0 0 30px #e91e8c' : 'none',
          }}>
            {result.score}%
          </div>

          {/* Emoji */}
          <div style={{
            fontSize: '3rem', marginBottom: '12px',
            animation: result.score === 100 ? 'lmPulse 1s ease infinite' : 'lmBounce 0.3s ease 0.2s both',
          }}>
            {getEmoji(result.score)}
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
            <div
              ref={barRef}
              style={{
                '--target': `${result.score}%`,
                height: '100%', borderRadius: '10px',
                background: result.score === 100
                  ? 'linear-gradient(90deg, #e91e8c, #ff4081, #b388ff, #e91e8c)'
                  : `linear-gradient(90deg, #e91e8c, ${result.score >= 50 ? '#b388ff' : '#ef5350'})`,
                backgroundSize: result.score === 100 ? '200% 100%' : '100% 100%',
                animation: result.score === 100
                  ? 'lmFillBar 1.2s ease forwards, lmShine 2s linear 1.2s infinite'
                  : 'lmFillBar 1.2s ease forwards',
                width: 0,
              }}
            />
          </div>

          {/* Message */}
          {result.score < 100 && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.5 }}>
              {getMessage(result.score)}
            </p>
          )}

          {/* The impossible 100% hint (shown for non-100 results) */}
          {result.score < 100 && (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontStyle: 'italic', marginTop: '12px' }}>
              Legend says 100% is impossible... unless it's truly perfect 💫
            </p>
          )}

          {/* Try again */}
          <button onClick={reset} style={{
            marginTop: '16px', padding: '10px 28px', borderRadius: '30px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}>
            Try again
          </button>
        </div>
      )}

      {/* ═══ SPECIAL 100% OVERLAY ═══ */}
      {showSpecial && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(7,7,26,0.92)', backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          animation: 'lmReveal 0.6s ease',
        }}>
          {/* 3D Rotating Heart */}
          <div style={{
            fontSize: '6rem', marginBottom: '20px',
            animation: 'lm3DHeart 3s linear infinite',
            filter: 'drop-shadow(0 0 30px #e91e8c) drop-shadow(0 0 60px #b388ff60)',
          }}>
            ❤️
          </div>

          {/* Star burst behind */}
          <div style={{
            position: 'absolute', width: '200px', height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(233,30,140,0.3) 0%, transparent 70%)',
            animation: 'lmStarBurst 2s ease infinite',
            pointerEvents: 'none',
          }} />

          <div style={{
            fontSize: '5rem', fontWeight: 900, lineHeight: 1,
            background: 'linear-gradient(135deg, #e91e8c, #ff4081, #b388ff, #ffd54f, #e91e8c)',
            backgroundSize: '400% 100%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'lmShine 2s linear infinite',
            marginBottom: '8px',
          }}>
            100%
          </div>

          <h2 style={{
            fontFamily: "'Dancing Script', cursive", fontSize: '2rem',
            color: '#fff', margin: '0 0 8px',
            animation: 'lmTextGlow 2s ease infinite',
          }}>
            Perfect Match!
          </h2>

          <p style={{ color: '#ffd54f', fontSize: '14px', fontWeight: 600, marginBottom: '4px', animation: 'lmPulse 2s ease infinite' }}>
            ✨ This never happens... unless it's truly meant to be ✨
          </p>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginBottom: '4px' }}>
            <span style={{ color: '#e91e8c', fontWeight: 700 }}>{name1.trim()}</span>
            {' '}💕{' '}
            <span style={{ color: '#b388ff', fontWeight: 700 }}>{name2.trim()}</span>
          </p>

          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '28px', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
            Out of all the names in the world, only you two reach 100%.
            That's not luck — that's destiny 🌟
          </p>

          {/* Animated hearts ring */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {['💕','💖','💗','💝','💘','💞','💓','❤️'].map((e, i) => (
              <span key={i} style={{
                fontSize: '1.4rem',
                animation: `lmFloat 2s ease ${i * 0.25}s infinite`,
                display: 'inline-block',
              }}>{e}</span>
            ))}
          </div>

          <button onClick={() => setShowSpecial(false)} style={{
            padding: '12px 36px', borderRadius: '50px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            boxShadow: '0 0 40px #e91e8c50',
            animation: 'lmGlow 2s ease infinite',
          }}>
            Close 💕
          </button>
        </div>
      )}

      {/* Bottom tagline */}
      {!result && (
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', fontStyle: 'italic' }}>
            100% is impossible... or is it? 💫
          </p>
        </div>
      )}
    </div>
  );
}
