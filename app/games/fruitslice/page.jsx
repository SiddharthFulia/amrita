'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

const W = 400, H = 600;
const GRAVITY = 0.25;
const SLICE_RADIUS = 30;
const TRAIL_DURATION = 200;
const STAR_COUNT = 80;

const GOOD_ITEMS = [
  { emoji: '🍉', label: 'Watermelon', score: 1, color: '#4caf50', size: 32 },
  { emoji: '🍊', label: 'Orange', score: 1, color: '#ff9800', size: 30 },
  { emoji: '🍓', label: 'Strawberry', score: 2, color: '#f44336', size: 28 },
  { emoji: '🍑', label: 'Peach', score: 2, color: '#ffab91', size: 28 },
  { emoji: '🍇', label: 'Grapes', score: 3, color: '#9c27b0', size: 28 },
  { emoji: '🍒', label: 'Cherry', score: 3, color: '#e91e63', size: 26 },
  { emoji: '⭐', label: 'Star', score: 5, color: '#ffd600', size: 28, rare: true },
  { emoji: '💝', label: 'Heart', score: 10, color: '#e91e8c', size: 30, veryRare: true },
];

const BOMB = { emoji: '💣', label: 'Bomb', score: -5, color: '#333', size: 30, isBomb: true };

const MODES = {
  classic: { label: 'Classic', lives: 3, bombChance: 0.10, duration: Infinity, missLimit: 3 },
  zen: { label: 'Zen', lives: Infinity, bombChance: 0, duration: 90, missLimit: Infinity },
  hard: { label: 'Hard', lives: 1, bombChance: 0.20, duration: Infinity, missLimit: 1 },
};

function pickItem(bombChance) {
  if (Math.random() < bombChance) return BOMB;
  const r = Math.random();
  if (r < 0.03) return GOOD_ITEMS.find(i => i.veryRare);
  if (r < 0.10) return GOOD_ITEMS.find(i => i.rare);
  const normals = GOOD_ITEMS.filter(i => !i.rare && !i.veryRare);
  return normals[Math.floor(Math.random() * normals.length)];
}

function generateStars() {
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    });
  }
  return stars;
}

export default function FruitSlicePage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const rafRef = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [finalScore, setFinalScore] = useState(0);
  const [finalMode, setFinalMode] = useState('classic');
  const [bestScores, setBestScores] = useState({ classic: 0, zen: 0, hard: 0 });

  useEffect(() => {
    setBestScores({
      classic: parseInt(localStorage.getItem('fruit_best_classic') || '0', 10),
      zen: parseInt(localStorage.getItem('fruit_best_zen') || '0', 10),
      hard: parseInt(localStorage.getItem('fruit_best_hard') || '0', 10),
    });
  }, [screen]);

  const startGame = useCallback((mode) => {
    setScreen('game');
    const cfg = MODES[mode];
    gameRef.current = {
      mode,
      cfg,
      score: 0,
      lives: cfg.lives,
      misses: 0,
      combo: 0,
      maxCombo: 0,
      items: [],
      halves: [],
      particles: [],
      floats: [],
      trails: [],
      stars: generateStars(),
      spawnTimer: 0,
      spawnInterval: 1.5,
      elapsed: 0,
      lastTime: performance.now(),
      gameOver: false,
      flashAlpha: 0,
      mouse: { x: 0, y: 0, px: 0, py: 0, down: false, moved: false },
      timeLeft: cfg.duration,
    };
  }, []);

  useEffect(() => {
    if (screen !== 'game') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      if (e.touches && e.touches.length > 0) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function onDown(e) {
      e.preventDefault();
      const pos = getPos(e);
      g.mouse.x = pos.x;
      g.mouse.y = pos.y;
      g.mouse.px = pos.x;
      g.mouse.py = pos.y;
      g.mouse.down = true;
      g.mouse.moved = false;
    }

    function onMove(e) {
      e.preventDefault();
      if (!g.mouse.down) return;
      const pos = getPos(e);
      g.mouse.px = g.mouse.x;
      g.mouse.py = g.mouse.y;
      g.mouse.x = pos.x;
      g.mouse.y = pos.y;
      const dx = g.mouse.x - g.mouse.px;
      const dy = g.mouse.y - g.mouse.py;
      if (dx * dx + dy * dy > 4) {
        g.mouse.moved = true;
        g.trails.push({
          x1: g.mouse.px, y1: g.mouse.py,
          x2: g.mouse.x, y2: g.mouse.y,
          time: performance.now(),
        });
      }
    }

    function onUp(e) {
      e.preventDefault();
      g.mouse.down = false;
      g.mouse.moved = false;
    }

    // When mouse leaves canvas, DON'T reset — just pause tracking.
    // When it re-enters while button still held, resume from new position.
    function onLeave() {
      // Don't set mouse.down = false; blade stays "ready"
    }

    function onEnter(e) {
      // If mouse button is held while re-entering, update position to avoid jump-slicing
      if (g.mouse.down) {
        const pos = getPos(e);
        g.mouse.x = pos.x;
        g.mouse.y = pos.y;
        g.mouse.px = pos.x;
        g.mouse.py = pos.y;
      }
    }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('mouseenter', onEnter);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });
    canvas.addEventListener('touchcancel', onUp, { passive: false });

    function spawnItem() {
      const item = pickItem(g.cfg.bombChance);
      const x = 40 + Math.random() * (W - 80);
      return {
        ...item,
        x,
        y: H + 20,
        vx: (Math.random() - 0.5) * 6,
        vy: -(Math.random() * 4 + 8),
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        sliced: false,
        missed: false,
      };
    }

    function spawnWave() {
      const count = 1 + Math.floor(Math.random() * 3) + (g.elapsed > 30 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        g.items.push(spawnItem());
      }
    }

    function sliceItem(item) {
      item.sliced = true;
      g.score += item.score;
      if (g.score < 0) g.score = 0;

      if (item.isBomb) {
        g.lives--;
        g.flashAlpha = 0.6;
        g.combo = 0;
        g.floats.push({ text: '-5', x: item.x, y: item.y, color: '#ff1744', time: 60 });
      } else {
        g.combo++;
        if (g.combo > g.maxCombo) g.maxCombo = g.combo;
        const scoreText = g.combo >= 3
          ? `+${item.score} Combo x${g.combo}!`
          : `+${item.score}`;
        g.floats.push({ text: scoreText, x: item.x, y: item.y, color: item.color, time: 60 });

        // Halves
        for (let s = -1; s <= 1; s += 2) {
          g.halves.push({
            emoji: item.emoji,
            size: item.size,
            x: item.x,
            y: item.y,
            vx: item.vx + s * 2.5,
            vy: item.vy - 1,
            rotation: item.rotation,
            rotSpeed: s * 0.2,
            clipSide: s,
            alpha: 1,
          });
        }

        // Particles
        for (let p = 0; p < 8; p++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 1;
          g.particles.push({
            x: item.x,
            y: item.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            r: Math.random() * 4 + 2,
            color: item.color,
            alpha: 1,
          });
        }
      }
    }

    function checkSlice() {
      if (!g.mouse.down || !g.mouse.moved) return;
      const mx = g.mouse.x, my = g.mouse.y;
      const pmx = g.mouse.px, pmy = g.mouse.py;

      for (const item of g.items) {
        if (item.sliced || item.y > H + 50) continue;
        // Point-to-segment distance check
        const dx = mx - pmx, dy = my - pmy;
        const len2 = dx * dx + dy * dy;
        let dist;
        if (len2 < 1) {
          const ex = mx - item.x, ey = my - item.y;
          dist = Math.sqrt(ex * ex + ey * ey);
        } else {
          let t = ((item.x - pmx) * dx + (item.y - pmy) * dy) / len2;
          t = Math.max(0, Math.min(1, t));
          const cx = pmx + t * dx;
          const cy = pmy + t * dy;
          const ex = cx - item.x, ey = cy - item.y;
          dist = Math.sqrt(ex * ex + ey * ey);
        }
        if (dist < SLICE_RADIUS) {
          sliceItem(item);
        }
      }
    }

    function update(dt) {
      if (g.gameOver) return;

      g.elapsed += dt;
      if (g.cfg.duration !== Infinity) {
        g.timeLeft -= dt;
        if (g.timeLeft <= 0) {
          g.timeLeft = 0;
          endGame();
          return;
        }
      }

      // Speed up over time
      const speedMult = 1 + g.elapsed / 120;
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        spawnWave();
        g.spawnTimer = (0.8 + Math.random() * 1.0) / speedMult;
      }

      // Check slice
      checkSlice();

      // Update items
      let missedThisFrame = false;
      for (let i = g.items.length - 1; i >= 0; i--) {
        const item = g.items[i];
        item.x += item.vx;
        item.vy += GRAVITY;
        item.y += item.vy;
        item.rotation += item.rotSpeed;

        if (item.y > H + 60) {
          if (!item.sliced && !item.isBomb) {
            item.missed = true;
            g.misses++;
            g.combo = 0;
            missedThisFrame = true;
          }
          g.items.splice(i, 1);
        }
      }

      if (missedThisFrame && g.misses >= g.cfg.missLimit) {
        g.lives--;
        g.misses = 0;
        if (g.lives <= 0) {
          endGame();
          return;
        }
      }

      if (g.lives <= 0) {
        endGame();
        return;
      }

      // Update halves
      for (let i = g.halves.length - 1; i >= 0; i--) {
        const h = g.halves[i];
        h.x += h.vx;
        h.vy += GRAVITY;
        h.y += h.vy;
        h.rotation += h.rotSpeed;
        h.alpha -= 0.012;
        if (h.alpha <= 0 || h.y > H + 80) g.halves.splice(i, 1);
      }

      // Update particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx;
        p.vy += 0.1;
        p.y += p.vy;
        p.alpha -= 0.025;
        if (p.alpha <= 0) g.particles.splice(i, 1);
      }

      // Update floats
      for (let i = g.floats.length - 1; i >= 0; i--) {
        const f = g.floats[i];
        f.y -= 1.2;
        f.time--;
        if (f.time <= 0) g.floats.splice(i, 1);
      }

      // Flash fade
      if (g.flashAlpha > 0) g.flashAlpha -= 0.03;

      // Twinkle stars
      for (const s of g.stars) {
        s.twinkle += s.speed;
      }
    }

    function endGame() {
      g.gameOver = true;
      const key = `fruit_best_${g.mode}`;
      const prev = parseInt(localStorage.getItem(key) || '0', 10);
      if (g.score > prev) {
        localStorage.setItem(key, String(g.score));
      }
      setFinalScore(g.score);
      setFinalMode(g.mode);
      setTimeout(() => setScreen('result'), 600);
    }

    function draw() {
      // Background
      ctx.fillStyle = '#07071a';
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const s of g.stars) {
        const a = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(s.twinkle));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Trails
      const now = performance.now();
      for (let i = g.trails.length - 1; i >= 0; i--) {
        const t = g.trails[i];
        const age = now - t.time;
        if (age > TRAIL_DURATION) {
          g.trails.splice(i, 1);
          continue;
        }
        const alpha = 1 - age / TRAIL_DURATION;
        const grad = ctx.createLinearGradient(t.x1, t.y1, t.x2, t.y2);
        grad.addColorStop(0, `rgba(233,30,140,${alpha})`);
        grad.addColorStop(1, `rgba(179,136,255,${alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t.x1, t.y1);
        ctx.lineTo(t.x2, t.y2);
        ctx.stroke();
      }

      // Items
      for (const item of g.items) {
        if (item.sliced) continue;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);
        ctx.font = `${item.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, 0, 0);
        ctx.restore();
      }

      // Halves
      for (const h of g.halves) {
        ctx.save();
        ctx.globalAlpha = h.alpha;
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);
        ctx.beginPath();
        if (h.clipSide === -1) {
          ctx.rect(-h.size, -h.size, h.size, h.size * 2);
        } else {
          ctx.rect(0, -h.size, h.size, h.size * 2);
        }
        ctx.clip();
        ctx.font = `${h.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(h.emoji, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // Particles
      for (const p of g.particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floats
      for (const f of g.floats) {
        const alpha = Math.min(1, f.time / 20);
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = f.color;
        ctx.strokeStyle = '#07071a';
        ctx.lineWidth = 3;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;

      // Flash
      if (g.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,0,0,${g.flashAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      // HUD
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e91e8c';
      ctx.fillText(String(g.score), 16, 40);

      // Lives
      if (g.cfg.lives !== Infinity) {
        ctx.textAlign = 'right';
        ctx.font = '24px serif';
        let hearts = '';
        for (let i = 0; i < g.lives; i++) hearts += '❤️';
        ctx.fillText(hearts, W - 12, 38);
      }

      // Timer for zen
      if (g.cfg.duration !== Infinity) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillStyle = '#b388ff';
        ctx.fillText(`${Math.ceil(g.timeLeft)}s`, W / 2, 38);
      }

      // Combo
      if (g.combo >= 3) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 26px "Dancing Script", cursive';
        ctx.fillStyle = '#ffd600';
        ctx.strokeStyle = '#07071a';
        ctx.lineWidth = 3;
        const comboText = `Combo x${g.combo}!`;
        ctx.strokeText(comboText, W / 2, 76);
        ctx.fillText(comboText, W / 2, 76);
      }

      // Misses indicator for classic
      if (g.mode === 'classic' && g.misses > 0) {
        ctx.textAlign = 'left';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,100,100,0.7)';
        ctx.fillText(`Missed: ${g.misses}/3`, 16, 62);
      }

      // Game over overlay
      if (g.gameOver) {
        ctx.fillStyle = 'rgba(7,7,26,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px "Dancing Script", cursive';
        ctx.fillStyle = '#e91e8c';
        ctx.fillText('Game Over!', W / 2, H / 2 - 20);
        ctx.font = '24px Inter, sans-serif';
        ctx.fillStyle = '#b388ff';
        ctx.fillText(`Score: ${g.score}`, W / 2, H / 2 + 24);
      }
    }

    function loop(timestamp) {
      const dt = Math.min((timestamp - g.lastTime) / 1000, 0.05);
      g.lastTime = timestamp;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('mouseenter', onEnter);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
      canvas.removeEventListener('touchcancel', onUp);
    };
  }, [screen]);

  // ---- MENU SCREEN ----
  if (screen === 'menu') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#07071a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
        padding: '24px 16px',
      }}>
        <Link href="/games" style={{
          position: 'absolute', top: 18, left: 18,
          color: '#b388ff', textDecoration: 'none', fontSize: 18,
          fontFamily: 'Inter, sans-serif',
        }}>
          ← Games
        </Link>

        <h1 style={{
          fontFamily: '"Dancing Script", cursive',
          fontSize: 44,
          color: '#e91e8c',
          marginTop: 48,
          marginBottom: 8,
          textShadow: '0 0 20px rgba(233,30,140,0.4)',
        }}>
          Fruit Slice
        </h1>
        <p style={{ color: '#b388ff', fontSize: 15, marginBottom: 32, opacity: 0.8 }}>
          Swipe to slice the fruits!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 300 }}>
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              onClick={() => startGame(key)}
              style={{
                background: 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(179,136,255,0.15))',
                border: '1px solid rgba(233,30,140,0.3)',
                borderRadius: 14,
                padding: '18px 20px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(233,30,140,0.3), rgba(179,136,255,0.3))';
                e.currentTarget.style.borderColor = 'rgba(233,30,140,0.6)';
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(179,136,255,0.15))';
                e.currentTarget.style.borderColor = 'rgba(233,30,140,0.3)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{ fontFamily: '"Dancing Script", cursive', fontSize: 24, color: '#e91e8c', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 13, color: '#b388ff', opacity: 0.8 }}>
                {key === 'classic' && '3 lives, fruits & bombs, speeds up'}
                {key === 'zen' && '90 seconds, no bombs, pure slicing'}
                {key === 'hard' && '1 life, more bombs, faster spawns'}
              </div>
              <div style={{ fontSize: 12, color: '#ffd600', marginTop: 6, opacity: 0.7 }}>
                Best: {bestScores[key]}
              </div>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: 32, padding: '16px 20px',
          background: 'rgba(179,136,255,0.08)',
          borderRadius: 12,
          maxWidth: 300, width: '100%',
          fontSize: 13, color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#b388ff' }}>How to play:</strong><br />
          Click/touch and drag across fruits to slice them.<br />
          Avoid bombs! 💣 Slice hearts for bonus points! 💝
        </div>
      </div>
    );
  }

  // ---- GAME SCREEN ----
  if (screen === 'game') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#07071a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        fontFamily: 'Inter, sans-serif',
        userSelect: 'none',
        touchAction: 'none',
      }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            width: Math.min(W, 400),
            height: Math.min(H, 600),
            maxWidth: '100vw',
            maxHeight: 'calc(100vh - 24px)',
            borderRadius: 16,
            border: '1px solid rgba(233,30,140,0.2)',
            objectFit: 'contain',
            touchAction: 'none',
          }}
        />
      </div>
    );
  }

  // ---- RESULT SCREEN ----
  if (screen === 'result') {
    const best = parseInt(localStorage.getItem(`fruit_best_${finalMode}`) || '0', 10);
    const isNew = finalScore >= best && finalScore > 0;
    return (
      <div style={{
        minHeight: '100vh',
        background: '#07071a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
        padding: '24px 16px',
      }}>
        <h1 style={{
          fontFamily: '"Dancing Script", cursive',
          fontSize: 42,
          color: '#e91e8c',
          marginBottom: 8,
          textShadow: '0 0 20px rgba(233,30,140,0.4)',
        }}>
          Game Over!
        </h1>

        <p style={{ color: '#b388ff', fontSize: 16, marginBottom: 28 }}>
          {MODES[finalMode].label} Mode
        </p>

        <div style={{
          background: 'linear-gradient(135deg, rgba(233,30,140,0.12), rgba(179,136,255,0.12))',
          border: '1px solid rgba(233,30,140,0.25)',
          borderRadius: 16,
          padding: '28px 40px',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 52, fontWeight: 'bold', color: '#e91e8c' }}>
            {finalScore}
          </div>
          <div style={{ fontSize: 14, color: '#b388ff', marginTop: 4 }}>points</div>
          {isNew && (
            <div style={{
              marginTop: 12, fontSize: 16,
              color: '#ffd600',
              fontFamily: '"Dancing Script", cursive',
              fontSize: 22,
            }}>
              New Best Score!
            </div>
          )}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            Previous best: {best}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => startGame(finalMode)}
            style={{
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              border: 'none',
              borderRadius: 12,
              padding: '14px 28px',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <button
            onClick={() => setScreen('menu')}
            style={{
              background: 'rgba(179,136,255,0.15)',
              border: '1px solid rgba(179,136,255,0.3)',
              borderRadius: 12,
              padding: '14px 28px',
              color: '#b388ff',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Menu
          </button>
        </div>

        <Link href="/games" style={{
          marginTop: 28,
          color: '#b388ff',
          textDecoration: 'none',
          fontSize: 15,
          opacity: 0.7,
        }}>
          ← Back to Games
        </Link>
      </div>
    );
  }

  return null;
}
