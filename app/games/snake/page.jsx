'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

const CELL = 20, COLS = 20, ROWS = 20;
const W = CELL * COLS, H = CELL * ROWS;
const TICK = 120;
const FOODS = [{ emoji: '❤️', pts: 1 }, { emoji: '💛', pts: 3 }, { emoji: '💝', pts: 5 }];

function rnd(n) { return Math.floor(Math.random() * n); }
function mkFood(snake) {
  let pos;
  do { pos = { x: rnd(COLS), y: rnd(ROWS) }; }
  while (snake.some(s => s.x === pos.x && s.y === pos.y));
  const r = Math.random();
  const food = r < 0.75 ? FOODS[0] : r < 0.90 ? FOODS[1] : FOODS[2];
  return { ...pos, ...food };
}

function getHi() { try { return parseInt(localStorage.getItem('snake_hi') || '0'); } catch { return 0; } }
function saveHi(s) { try { localStorage.setItem('snake_hi', String(s)); } catch {} }

export default function SnakePage() {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const [phase, setPhase] = useState('idle'); // idle | playing | dead
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(0);
  const [lives, setLives] = useState(3);
  const particles = useRef([]);

  useEffect(() => { setHi(getHi()); }, []);

  const startGame = useCallback(() => {
    const hiNow = getHi();
    const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    particles.current = [];
    gRef.current = { snake, food: mkFood(snake), score: 0, lives: 3, hi: hiNow, invincible: 0, tickMs: TICK };
    setScore(0); setLives(3); setHi(hiNow); setPhase('playing');
    lastTickRef.current = 0;
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function loop(ts) {
      const g = gRef.current;
      if (!g) return;

      // Draw every frame
      draw(ctx, g);

      // Tick logic
      if (!lastTickRef.current) lastTickRef.current = ts;
      if (ts - lastTickRef.current >= g.tickMs) {
        lastTickRef.current = ts;
        tick(g);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    function tick(g) {
      dirRef.current = nextDirRef.current;
      const head = g.snake[0];
      const next = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

      // Wall
      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) { die(g); return; }
      // Self
      if (g.invincible === 0 && g.snake.slice(1).some(s => s.x === next.x && s.y === next.y)) { die(g); return; }
      if (g.invincible > 0) g.invincible--;

      g.snake.unshift(next);

      if (next.x === g.food.x && next.y === g.food.y) {
        g.score += g.food.pts;
        // burst
        for (let i = 0; i < 6; i++) particles.current.push({ x: next.x * CELL + CELL / 2, y: next.y * CELL + CELL / 2, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 30, emoji: '✨' });
        g.food = mkFood(g.snake);
        // speed up
        if (g.score % 5 === 0) g.tickMs = Math.max(60, g.tickMs - 5);
        setScore(g.score);
        if (g.score > g.hi) { saveHi(g.score); g.hi = g.score; setHi(g.score); }
      } else {
        g.snake.pop();
      }
    }

    function die(g) {
      g.lives--;
      setLives(g.lives);
      if (g.lives <= 0) {
        setPhase('dead');
        cancelAnimationFrame(rafRef.current);
        return;
      }
      // respawn
      g.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dirRef.current = { x: 1, y: 0 };
      nextDirRef.current = { x: 1, y: 0 };
      g.invincible = 60;
    }

    function draw(ctx, g) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#07071a';
      ctx.fillRect(0, 0, W, H);

      // Grid dots
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
        ctx.beginPath(); ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 1, 0, Math.PI * 2); ctx.fill();
      }

      // Snake body
      g.snake.forEach((seg, i) => {
        if (i === 0) return; // head drawn as emoji
        const alpha = g.invincible > 0 && Math.floor(g.invincible / 5) % 2 === 0 ? 0.3 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(seg.x * CELL, seg.y * CELL, seg.x * CELL + CELL, seg.y * CELL + CELL);
        grad.addColorStop(0, '#e91e8c');
        grad.addColorStop(1, '#b388ff');
        ctx.fillStyle = grad;
        const r = 4;
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, r);
        ctx.fill();
        ctx.restore();
      });

      // Head (cat emoji)
      if (g.snake.length > 0) {
        const h = g.snake[0];
        const alpha = g.invincible > 0 && Math.floor(g.invincible / 5) % 2 === 0 ? 0.3 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `${CELL + 2}px serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('🐱', h.x * CELL + CELL / 2, h.y * CELL + CELL / 2);
        ctx.restore();
      }

      // Food
      ctx.font = `${CELL}px serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(g.food.emoji, g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2);

      // Particles
      particles.current = particles.current.filter(p => p.life > 0);
      particles.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.globalAlpha = p.life / 30;
        ctx.font = '12px serif';
        ctx.fillText(p.emoji, p.x, p.y);
      });
      ctx.globalAlpha = 1;

      // HUD
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillStyle = '#e91e8c';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Score: ${g.score}`, 8, 6);
      ctx.fillStyle = '#b388ff';
      ctx.fillText(`Best: ${g.hi}`, 8, 22);
      // lives
      ctx.font = '14px serif';
      ctx.textAlign = 'right';
      ctx.fillText('🐱'.repeat(Math.max(0, g.lives)), W - 6, 6);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // Controls
  useEffect(() => {
    const MAP = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, KeyW: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 }, KeyA: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 } };
    const h = (e) => {
      if (e.code === 'Space') { e.preventDefault(); if (phase === 'idle' || phase === 'dead') startGame(); return; }
      const d = MAP[e.code];
      if (!d) return;
      e.preventDefault();
      const cur = dirRef.current;
      if (d.x === -cur.x && d.y === -cur.y) return; // no reverse
      nextDirRef.current = d;
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [phase, startGame]);

  // Swipe
  const touchRef = useRef(null);
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { if (phase !== 'playing') startGame(); return; }
    const cur = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      const d = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      if (!(d.x === -cur.x)) nextDirRef.current = d;
    } else {
      const d = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      if (!(d.y === -cur.y)) nextDirRef.current = d;
    }
    touchRef.current = null;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px' }}>
      <div style={{ width: '100%', maxWidth: `${W}px`, marginBottom: '8px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
      </div>
      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.2rem', color: '#e91e8c', margin: '0 0 16px', textShadow: '0 0 20px #e91e8c80' }}>Cat Snake 🐱</h1>

      <div style={{ position: 'relative', width: '100%', maxWidth: `${W}px` }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', display: 'block', borderRadius: '12px', border: '2px solid rgba(233,30,140,0.3)', cursor: 'pointer', touchAction: 'none' }}
          onClick={() => { if (phase !== 'playing') startGame(); }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        />
        {phase === 'idle' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,7,26,0.85)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div style={{ fontSize: '3rem' }}>🐱</div>
            <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: '1.8rem', color: '#e91e8c' }}>Cat Snake!</div>
            <div style={{ color: '#b388ff', fontSize: '0.95rem' }}>Eat the hearts ❤️</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Tap / Space to start</div>
            {hi > 0 && <div style={{ color: '#b388ff', fontSize: '0.85rem', marginTop: '4px' }}>Best: {hi}</div>}
          </div>
        )}
        {phase === 'dead' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,7,26,0.88)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div style={{ fontSize: '2.5rem' }}>😿</div>
            <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: '1.8rem', color: '#e91e8c' }}>Game Over!</div>
            <div style={{ color: '#fff', fontSize: '1.1rem' }}>Score: {score}</div>
            <div style={{ color: '#b388ff', fontSize: '0.95rem' }}>Best: {hi}</div>
            <button onClick={startGame} style={{ marginTop: '12px', padding: '10px 28px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)', border: 'none', borderRadius: '50px', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Play Again 🐱</button>
          </div>
        )}
      </div>
      <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', textAlign: 'center' }}>
        Arrow keys / WASD / Swipe to move
      </div>
    </div>
  );
}
