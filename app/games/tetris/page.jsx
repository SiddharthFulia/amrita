'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Heart Balloon Pop ───────────────────────────────────────────────────────
// Easy casual game: colorful balloons float up, tap/click to pop them.
// Miss too many → lose a life. 3 lives. Score & level up.

const W = 360;
const H = 540;

const BALLOON_TYPES = [
  { emoji: '❤️',  points: 1, speed: 1.0, color: '#e91e8c', freq: 0.50 },
  { emoji: '💛',  points: 3, speed: 1.3, color: '#f9a825', freq: 0.25 },
  { emoji: '🐱',  points: 5, speed: 1.6, color: '#b388ff', freq: 0.15 },
  { emoji: '💝',  points: 2, speed: 1.1, color: '#ff6baa', freq: 0.10 },
];

function pickType() {
  const r = Math.random();
  let acc = 0;
  for (const t of BALLOON_TYPES) {
    acc += t.freq;
    if (r < acc) return t;
  }
  return BALLOON_TYPES[0];
}

let nextId = 0;
function makeBalloon(level) {
  const type = pickType();
  return {
    id: nextId++,
    x: 30 + Math.random() * (W - 60),
    y: H + 40,
    vy: (type.speed + level * 0.3) * (0.85 + Math.random() * 0.3),
    type,
    size: 38 + Math.random() * 14,
    wobble: Math.random() * Math.PI * 2,
    popped: false,
    popAnim: 0,
  };
}

export default function BalloonPopPage() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    balloons: [],
    particles: [],
    floatTexts: [],
    score: 0,
    lives: 3,
    level: 1,
    catches: 0,
    spawnTimer: 0,
    spawnInterval: 90,
    gameState: 'idle', // idle | playing | gameover
    levelFlash: 0,
    frame: 0,
  });
  const rafRef = useRef(null);
  const [display, setDisplay] = useState({ score: 0, lives: 3, level: 1, gameState: 'idle' });
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    try { setHighScore(parseInt(localStorage.getItem('balloon_hi') || '0', 10)); } catch (_) {}
  }, []);

  const spawnParticles = (x, y, color) => {
    const s = stateRef.current;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      s.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 35, color });
    }
  };

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.balloons = [];
    s.particles = [];
    s.floatTexts = [];
    s.score = 0;
    s.lives = 3;
    s.level = 1;
    s.catches = 0;
    s.spawnTimer = 0;
    s.spawnInterval = 90;
    s.gameState = 'playing';
    s.levelFlash = 0;
    s.frame = 0;
    setDisplay({ score: 0, lives: 3, level: 1, gameState: 'playing' });
  }, []);

  // Click/touch handler
  const handlePop = useCallback((clientX, clientY) => {
    const s = stateRef.current;
    if (s.gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;

    for (const b of s.balloons) {
      if (b.popped) continue;
      const dx = cx - b.x;
      const dy = cy - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.size * 0.65) {
        b.popped = true;
        b.popAnim = 1;
        s.score += b.type.points;
        s.catches++;
        spawnParticles(b.x, b.y, b.type.color);
        s.floatTexts.push({ x: b.x, y: b.y, text: `+${b.type.points}`, life: 45, color: b.type.color });
        // level up every 20 pops
        if (s.catches > 0 && s.catches % 20 === 0) {
          s.level++;
          s.spawnInterval = Math.max(30, 90 - s.level * 8);
          s.levelFlash = 90;
        }
        setDisplay(d => ({ ...d, score: s.score, level: s.level }));
        break;
      }
    }
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);

      // BG gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#07071a');
      bg.addColorStop(1, '#100720');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      if (s.gameState !== 'playing') {
        rafRef.current && cancelAnimationFrame(rafRef.current);
        return;
      }

      s.frame++;

      // Spawn
      s.spawnTimer++;
      if (s.spawnTimer >= s.spawnInterval) {
        s.spawnTimer = 0;
        s.balloons.push(makeBalloon(s.level));
      }

      // Update & draw balloons
      const surviving = [];
      for (const b of s.balloons) {
        if (b.popped) {
          b.popAnim -= 0.08;
          if (b.popAnim > 0) {
            ctx.save();
            ctx.globalAlpha = b.popAnim;
            ctx.font = `${b.size * (2 - b.popAnim)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.type.emoji, b.x, b.y);
            ctx.restore();
            surviving.push(b);
          }
          continue;
        }

        b.wobble += 0.06;
        b.x += Math.sin(b.wobble) * 0.4;
        b.y -= b.vy;

        if (b.y + b.size < 0) {
          // escaped
          s.lives--;
          setDisplay(d => ({ ...d, lives: s.lives }));
          if (s.lives <= 0) {
            s.gameState = 'gameover';
            try {
              const hi = parseInt(localStorage.getItem('balloon_hi') || '0', 10);
              if (s.score > hi) localStorage.setItem('balloon_hi', s.score);
              setHighScore(Math.max(hi, s.score));
            } catch (_) {}
            setDisplay(d => ({ ...d, gameState: 'gameover' }));
          }
          continue;
        }

        // Draw string
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.size * 0.5);
        ctx.lineTo(b.x + Math.sin(b.wobble * 0.5) * 4, b.y + b.size * 1.2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw balloon
        ctx.font = `${b.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.type.emoji, b.x, b.y);

        // Glow ring for special types
        if (b.type.points >= 3) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = b.type.color + '55';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        surviving.push(b);
      }
      s.balloons = surviving;

      // Particles
      const aliveP = [];
      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.floor((p.life / 35) * 255).toString(16).padStart(2, '0');
          ctx.fill();
          aliveP.push(p);
        }
      }
      s.particles = aliveP;

      // Float texts
      const aliveT = [];
      for (const t of s.floatTexts) {
        t.y -= 1.5;
        t.life--;
        if (t.life > 0) {
          ctx.globalAlpha = t.life / 45;
          ctx.font = "bold 20px 'Inter', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillStyle = t.color;
          ctx.fillText(t.text, t.x, t.y);
          ctx.globalAlpha = 1;
          aliveT.push(t);
        }
      }
      s.floatTexts = aliveT;

      // HUD
      ctx.globalAlpha = 1;
      // Score
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(`Score: ${s.score}`, 12, 28);

      // Lives
      ctx.textAlign = 'right';
      ctx.font = '20px serif';
      ctx.fillText('❤️'.repeat(s.lives) + '🖤'.repeat(3 - s.lives), W - 10, 28);

      // Level
      ctx.textAlign = 'center';
      ctx.font = "14px 'Inter', sans-serif";
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`Level ${s.level}`, W / 2, 26);

      // Level flash
      if (s.levelFlash > 0) {
        s.levelFlash--;
        ctx.globalAlpha = Math.min(1, s.levelFlash / 30);
        ctx.font = "bold 36px 'Playfair Display', serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Level ${s.level}! ✨`, W / 2, H / 2);
        ctx.globalAlpha = 1;
      }
    };

    if (stateRef.current.gameState === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [display.gameState]);

  // restart game loop when gameState changes to playing
  useEffect(() => {
    if (display.gameState === 'playing') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const s = stateRef.current;

      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        ctx.clearRect(0, 0, W, H);

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#07071a');
        bg.addColorStop(1, '#100720');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        if (s.gameState !== 'playing') {
          cancelAnimationFrame(rafRef.current);
          return;
        }

        s.frame++;
        s.spawnTimer++;
        if (s.spawnTimer >= s.spawnInterval) {
          s.spawnTimer = 0;
          s.balloons.push(makeBalloon(s.level));
        }

        const surviving = [];
        for (const b of s.balloons) {
          if (b.popped) {
            b.popAnim -= 0.08;
            if (b.popAnim > 0) {
              ctx.save();
              ctx.globalAlpha = b.popAnim;
              ctx.font = `${b.size * (2 - b.popAnim)}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(b.type.emoji, b.x, b.y);
              ctx.restore();
              surviving.push(b);
            }
            continue;
          }

          b.wobble += 0.06;
          b.x += Math.sin(b.wobble) * 0.4;
          b.y -= b.vy;

          if (b.y + b.size < 0) {
            s.lives--;
            const newLives = s.lives;
            setDisplay(d => ({ ...d, lives: newLives }));
            if (s.lives <= 0) {
              s.gameState = 'gameover';
              try {
                const hi = parseInt(localStorage.getItem('balloon_hi') || '0', 10);
                if (s.score > hi) localStorage.setItem('balloon_hi', s.score);
                setHighScore(Math.max(hi, s.score));
              } catch (_) {}
              setDisplay(d => ({ ...d, gameState: 'gameover', score: s.score }));
              cancelAnimationFrame(rafRef.current);
            }
            continue;
          }

          ctx.beginPath();
          ctx.moveTo(b.x, b.y + b.size * 0.5);
          ctx.lineTo(b.x + Math.sin(b.wobble * 0.5) * 4, b.y + b.size * 1.2);
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.font = `${b.size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.type.emoji, b.x, b.y);

          if (b.type.points >= 3) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = b.type.color + '55';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          surviving.push(b);
        }
        s.balloons = surviving;

        const aliveP = [];
        for (const p of s.particles) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
          if (p.life > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = p.color + Math.floor((p.life / 35) * 255).toString(16).padStart(2, '0');
            ctx.fill();
            aliveP.push(p);
          }
        }
        s.particles = aliveP;

        const aliveT = [];
        for (const t of s.floatTexts) {
          t.y -= 1.5; t.life--;
          if (t.life > 0) {
            ctx.globalAlpha = t.life / 45;
            ctx.font = "bold 20px 'Inter', sans-serif";
            ctx.textAlign = 'center';
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1;
            aliveT.push(t);
          }
        }
        s.floatTexts = aliveT;

        ctx.globalAlpha = 1;
        ctx.font = "bold 18px 'Inter', sans-serif";
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Score: ${s.score}`, 12, 28);

        ctx.textAlign = 'right';
        ctx.font = '20px serif';
        const livesStr = Array.from({ length: 3 }, (_, i) => i < s.lives ? '❤️' : '🖤').join('');
        ctx.fillText(livesStr, W - 10, 28);

        ctx.textAlign = 'center';
        ctx.font = "14px 'Inter', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`Level ${s.level}`, W / 2, 26);

        if (s.levelFlash > 0) {
          s.levelFlash--;
          ctx.globalAlpha = Math.min(1, s.levelFlash / 30);
          ctx.font = "bold 36px 'Playfair Display', serif";
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd700';
          ctx.fillText(`Level ${s.level}! ✨`, W / 2, H / 2);
          ctx.globalAlpha = 1;
        }
      };

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }
  }, [display.gameState]);

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Back */}
        <Link href="/games" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: "'Inter', sans-serif",
          textDecoration: 'none', marginBottom: '16px',
        }}>← Games</Link>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700,
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          margin: '0 0 4px', textAlign: 'center',
        }}>Balloon Pop 🎈</h1>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: '0 0 20px' }}>
          Tap the balloons before they float away!
        </p>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {BALLOON_TYPES.map(t => (
            <div key={t.emoji} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)' }}>
              <span style={{ fontSize: '18px' }}>{t.emoji}</span> +{t.points}pt{t.points > 1 ? 's' : ''}
            </div>
          ))}
        </div>

        {/* Canvas wrapper */}
        <div style={{ position: 'relative', width: '100%', maxWidth: `${W}px`, margin: '0 auto' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ width: '100%', borderRadius: '16px', border: '1px solid rgba(233,30,140,0.2)', display: 'block', cursor: 'pointer', touchAction: 'none' }}
            onClick={e => handlePop(e.clientX, e.clientY)}
            onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; handlePop(t.clientX, t.clientY); }}
          />

          {/* Idle overlay */}
          {display.gameState === 'idle' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', borderRadius: '16px',
              background: 'rgba(7,7,26,0.85)', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ fontSize: '72px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>🎈</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', marginBottom: '8px' }}>
                Balloon Pop
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: "'Inter', sans-serif", marginBottom: '24px' }}>
                Best: {highScore} pts
              </div>
              <button onClick={startGame} style={{
                padding: '12px 36px', borderRadius: '24px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                border: 'none', color: '#fff', fontSize: '16px',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, cursor: 'pointer',
              }}>Play 🎈</button>
            </div>
          )}

          {/* Game over overlay */}
          {display.gameState === 'gameover' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', borderRadius: '16px',
              background: 'rgba(7,7,26,0.9)', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💔</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', marginBottom: '8px' }}>
                Game Over
              </div>
              <div style={{ color: '#e91e8c', fontSize: '28px', fontWeight: 700, fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>
                {stateRef.current.score} pts
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: "'Inter', sans-serif", marginBottom: '8px' }}>
                Level {stateRef.current.level} reached
              </div>
              {stateRef.current.score >= highScore && stateRef.current.score > 0 && (
                <div style={{ color: '#ffd700', fontSize: '13px', fontFamily: "'Dancing Script', cursive", marginBottom: '12px' }}>
                  ✨ New high score!
                </div>
              )}
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: "'Inter', sans-serif", marginBottom: '20px' }}>
                Best: {highScore} pts
              </div>
              <button onClick={startGame} style={{
                padding: '12px 36px', borderRadius: '24px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                border: 'none', color: '#fff', fontSize: '15px',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, cursor: 'pointer',
              }}>Play Again 🎈</button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontFamily: "'Inter', sans-serif", marginTop: '12px' }}>
          Tap/click balloons · Miss 3 total = game over · Speed up every 20 pops
        </p>
      </div>
    </div>
  );
}
