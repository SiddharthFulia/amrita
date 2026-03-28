'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

const CANVAS_W = 400;
const CANVAS_H = 500;
const CATCHER_W = 80;
const CATCHER_H = 16;
const CATCHER_Y = CANVAS_H - 40;
const SPAWN_BASE = 800;
const BG_HEARTS = ['♥', '♡', '❤', '♥', '♡'];

const HEART_TYPES = {
  normal: { emoji: '♥', points: 1, color: '#e91e8c' },
  golden: { emoji: '💛', points: 3, color: '#ffd700' },
  special: { emoji: '💝', points: 5, color: '#ff00cc' },
};

function randomType() {
  const r = Math.random();
  if (r < 0.1) return 'special';
  if (r < 0.3) return 'golden';
  return 'normal';
}

export default function HeartCatcher() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    gameState: 'idle',
    score: 0,
    lives: 3,
    level: 1,
    catchCount: 0,
    hearts: [],
    particles: [],
    bgHearts: [],
    catcherX: CANVAS_W / 2 - CATCHER_W / 2,
    nextId: 0,
    spawnTimer: 0,
    lastTime: 0,
    levelFlash: 0,
    levelFlashText: '',
    animFrameId: null,
    spawnInterval: null,
  });

  const [uiState, setUiState] = useState({
    gameState: 'idle',
    score: 0,
    lives: 3,
    level: 1,
    highScore: 0,
  });

  // Load highScore
  useEffect(() => {
    const hs = parseInt(localStorage.getItem('catcherHighScore') || '0', 10);
    setUiState((s) => ({ ...s, highScore: hs }));
    stateRef.current.highScore = hs;

    // Init bg hearts
    const bg = BG_HEARTS.map((glyph, i) => ({
      glyph,
      x: 60 + i * 70,
      y: 50 + i * 80,
      speed: 0.3 + i * 0.1,
      size: 18 + i * 4,
      alpha: 0.08 + i * 0.02,
    }));
    stateRef.current.bgHearts = bg;
  }, []);

  const syncUI = useCallback(() => {
    const s = stateRef.current;
    setUiState({
      gameState: s.gameState,
      score: s.score,
      lives: s.lives,
      level: s.level,
      highScore: s.highScore || 0,
    });
  }, []);

  const spawnHeart = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState !== 'playing') return;
    const type = randomType();
    const size = type === 'special' ? 28 : type === 'golden' ? 24 : 20;
    s.hearts.push({
      id: s.nextId++,
      x: Math.random() * (CANVAS_W - 30) + 15,
      y: -size,
      speed: 2 + s.level * 0.5,
      type,
      size,
      caught: false,
      missed: false,
    });
  }, []);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.gameState = 'playing';
    s.score = 0;
    s.lives = 3;
    s.level = 1;
    s.catchCount = 0;
    s.hearts = [];
    s.particles = [];
    s.catcherX = CANVAS_W / 2 - CATCHER_W / 2;
    s.levelFlash = 0;
    syncUI();
  }, [syncUI]);

  const endGame = useCallback(() => {
    const s = stateRef.current;
    s.gameState = 'gameover';
    if (s.score > (s.highScore || 0)) {
      s.highScore = s.score;
      localStorage.setItem('catcherHighScore', String(s.score));
    }
    syncUI();
  }, [syncUI]);

  const spawnParticles = useCallback((x, y, color) => {
    const s = stateRef.current;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 2 + Math.random() * 3;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        color,
      });
    }
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animFrameId;
    let lastSpawn = 0;

    function drawRoundedRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function loop(timestamp) {
      const s = stateRef.current;
      // Cap dt at 50ms — prevents hearts teleporting past catcher on lag spikes or tab focus
      const dt = Math.min(timestamp - (s.lastTime || timestamp), 50);
      s.lastTime = timestamp;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // BG gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#07071a');
      grad.addColorStop(1, '#0d0025');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // BG hearts
      s.bgHearts.forEach((bh) => {
        bh.y += bh.speed * (dt / 16);
        if (bh.y > CANVAS_H + bh.size) bh.y = -bh.size;
        ctx.save();
        ctx.globalAlpha = bh.alpha;
        ctx.font = `${bh.size}px serif`;
        ctx.fillStyle = '#e91e8c';
        ctx.fillText(bh.glyph, bh.x, bh.y);
        ctx.restore();
      });

      if (s.gameState === 'idle') {
        // Pulsing heart
        const pulse = 1 + 0.1 * Math.sin(timestamp / 400);
        ctx.save();
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.scale(pulse, pulse);
        ctx.font = '80px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e91e8c';
        ctx.fillText('♥', 0, 0);
        ctx.restore();

        ctx.font = "bold 18px 'Inter', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('Catch my hearts!', CANVAS_W / 2, CANVAS_H / 2 + 60);
      } else if (s.gameState === 'playing') {
        // Spawn
        const spawnInterval = Math.max(300, SPAWN_BASE - (s.level - 1) * 80);
        if (timestamp - lastSpawn > spawnInterval) {
          spawnHeart();
          lastSpawn = timestamp;
        }

        // Update hearts
        s.hearts = s.hearts.filter((h) => {
          if (h.caught || h.missed) return false;
          h.y += h.speed * (dt / 16);

          // Collision
          const catcherX = s.catcherX;
          if (
            h.y + h.size > CATCHER_Y &&
            h.y < CATCHER_Y + CATCHER_H &&
            h.x > catcherX - h.size / 2 &&
            h.x < catcherX + CATCHER_W + h.size / 2
          ) {
            h.caught = true;
            const pts = HEART_TYPES[h.type].points;
            s.score += pts;
            s.catchCount++;
            spawnParticles(h.x, CATCHER_Y, HEART_TYPES[h.type].color);
            if (s.catchCount % 15 === 0) {
              s.level++;
              s.levelFlash = 90;
              s.levelFlashText = `Level ${s.level}!`;
              syncUI();
            }
            syncUI();
            return false;
          }

          if (h.y > CANVAS_H) {
            h.missed = true;
            s.lives--;
            if (s.lives <= 0) endGame();
            return false;
          }
          return true;
        });

        // Draw hearts
        s.hearts.forEach((h) => {
          ctx.font = `${h.size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(HEART_TYPES[h.type].emoji, h.x, h.y);
        });

        // Particles
        s.particles = s.particles.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1;
          p.life--;
          if (p.life <= 0) return false;
          ctx.save();
          ctx.globalAlpha = p.life / p.maxLife;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        });

        // Catcher
        const catcherGrad = ctx.createLinearGradient(
          s.catcherX, CATCHER_Y,
          s.catcherX + CATCHER_W, CATCHER_Y + CATCHER_H
        );
        catcherGrad.addColorStop(0, '#e91e8c');
        catcherGrad.addColorStop(1, '#b388ff');
        ctx.fillStyle = catcherGrad;
        drawRoundedRect(ctx, s.catcherX, CATCHER_Y, CATCHER_W, CATCHER_H, 8);
        ctx.fill();

        // Catcher glow
        ctx.save();
        ctx.shadowColor = '#e91e8c';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(233,30,140,0.6)';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, s.catcherX, CATCHER_Y, CATCHER_W, CATCHER_H, 8);
        ctx.stroke();
        ctx.restore();

        // HUD
        ctx.font = "bold 16px 'Inter', sans-serif";
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Score: ${s.score}`, 12, 28);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#b388ff';
        ctx.fillText(`Lv ${s.level}`, CANVAS_W / 2, 28);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#e91e8c';
        const livesStr = '♥'.repeat(s.lives) + '♡'.repeat(Math.max(0, 3 - s.lives));
        ctx.fillText(livesStr, CANVAS_W - 12, 28);

        // Level flash
        if (s.levelFlash > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, s.levelFlash / 30);
          ctx.font = "bold 36px 'Playfair Display', serif";
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 20;
          ctx.fillText(s.levelFlashText, CANVAS_W / 2, CANVAS_H / 2);
          ctx.restore();
          s.levelFlash--;
        }
      } else if (s.gameState === 'gameover') {
        ctx.fillStyle = 'rgba(7,7,26,0.7)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Sync UI once per frame (not per event) to avoid mid-loop React re-renders
      syncUI();

      animFrameId = requestAnimationFrame(loop);
      stateRef.current.animFrameId = animFrameId;
    }

    animFrameId = requestAnimationFrame(loop);
    stateRef.current.animFrameId = animFrameId;

    return () => cancelAnimationFrame(animFrameId);
  }, [spawnHeart, spawnParticles, endGame, syncUI]);

  // Mouse / touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const cx = (e.clientX - rect.left) * scaleX;
      stateRef.current.catcherX = Math.max(0, Math.min(CANVAS_W - CATCHER_W, cx - CATCHER_W / 2));
    }

    function onTouchMove(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const cx = (e.touches[0].clientX - rect.left) * scaleX;
      stateRef.current.catcherX = Math.max(0, Math.min(CANVAS_W - CATCHER_W, cx - CATCHER_W / 2));
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const { gameState, score, lives, level, highScore } = uiState;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 60px',
      }}
    >
      {/* Back */}
      <div style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
        <Link
          href="/games"
          style={{
            color: '#b388ff',
            textDecoration: 'none',
            fontSize: '0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Games
        </Link>
      </div>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          fontWeight: 700,
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        💝 Heart Catcher
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px', fontSize: '0.9rem' }}>
        Catch the falling hearts!
      </p>

      {/* Canvas container */}
      <div style={{ position: 'relative', maxWidth: '400px', width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: `${CANVAS_W}px`,
            borderRadius: '16px',
            border: '1px solid rgba(233,30,140,0.3)',
            boxShadow: '0 0 40px rgba(233,30,140,0.15)',
            cursor: 'none',
          }}
        />

        {/* Idle overlay */}
        {gameState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <button
              onClick={startGame}
              style={{
                padding: '14px 40px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 4px 20px rgba(233,30,140,0.4)',
              }}
            >
              Play ♥
            </button>
          </div>
        )}

        {/* Game over overlay */}
        {gameState === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              borderRadius: '16px',
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>💔</div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.8rem',
                color: '#fff',
                margin: 0,
              }}
            >
              Game Over
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '1.1rem' }}>
              Score: <strong style={{ color: '#e91e8c' }}>{score}</strong>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>
              Best: {highScore}
            </p>
            <button
              onClick={startGame}
              style={{
                marginTop: '8px',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Live stats bar (visible during play on desktop) */}
      {gameState === 'playing' && (
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            gap: '32px',
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <span>Level <strong style={{ color: '#b388ff' }}>{level}</strong></span>
          <span>Score <strong style={{ color: '#e91e8c' }}>{score}</strong></span>
          <span>Lives <strong style={{ color: '#e91e8c' }}>{'♥'.repeat(lives)}</strong></span>
        </div>
      )}
    </div>
  );
}
