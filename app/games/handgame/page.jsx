'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

const CANVAS_W = 360;
const CANVAS_H = 500;
const TRACK_W = 120;
const TRACK_H = 90;
const GAME_DURATION = 60;
const BASKET_Y = CANVAS_H - 60;
const BASKET_W = 60;
const ITEM_SIZE = 28;
const ZONES = { LEFT: 0, CENTER: 1, RIGHT: 2 };
const ZONE_X = [CANVAS_W * 0.17, CANVAS_W * 0.5, CANVAS_W * 0.83];

const ITEM_TYPES = [
  { emoji: '\u{1F495}', label: 'Heart', score: 1 },
  { emoji: '\u2B50', label: 'Star', score: 3 },
  { emoji: '\u{1F338}', label: 'Flower', score: 2 },
  { emoji: '\u{1F4A3}', label: 'Bomb', score: -5 },
];

function weightedRandom() {
  const r = Math.random();
  if (r < 0.40) return 0; // heart 40%
  if (r < 0.65) return 2; // flower 25%
  if (r < 0.85) return 1; // star 20%
  return 3;               // bomb 15%
}

export default function HandGamePage() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const trackCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const gameStateRef = useRef(null);

  const [phase, setPhase] = useState('intro'); // intro | requesting | denied | playing | ended
  const [finalScore, setFinalScore] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const cameraActiveRef = useRef(false);

  // Mutable game state kept in ref for perf
  const initGameState = useCallback(() => ({
    score: 0,
    lives: 3,
    timer: GAME_DURATION,
    zone: ZONES.CENTER,
    basketX: ZONE_X[ZONES.CENTER],
    items: [],
    spawnTimer: 0,
    flash: 0,
    lastTime: 0,
    running: true,
    elapsed: 0,
  }), []);

  // ── Camera setup ──
  const startCamera = useCallback(async () => {
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      cameraActiveRef.current = true;
      setUseFallback(false);
      setPhase('playing');
    } catch {
      setCameraActive(false);
      setUseFallback(true);
      setPhase('playing');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // ── Motion tracking ──
  const detectMotionZone = useCallback(() => {
    const video = videoRef.current;
    const tc = trackCanvasRef.current;
    if (!video || !tc || video.readyState < 2) return null;

    const ctx = tc.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, TRACK_W, TRACK_H);
    const frame = ctx.getImageData(0, 0, TRACK_W, TRACK_H);
    const data = frame.data;

    if (!prevFrameRef.current) {
      prevFrameRef.current = new Uint8ClampedArray(data);
      return null;
    }

    const prev = prevFrameRef.current;
    // Accumulate weighted X based on pixel difference
    let totalDiff = 0;
    let weightedX = 0;

    for (let i = 0; i < data.length; i += 4) {
      const diff = Math.abs(data[i] - prev[i])
                 + Math.abs(data[i+1] - prev[i+1])
                 + Math.abs(data[i+2] - prev[i+2]);
      if (diff > 60) { // threshold to ignore noise
        const pixelIndex = i / 4;
        const x = pixelIndex % TRACK_W;
        totalDiff += diff;
        weightedX += x * diff;
      }
    }

    prevFrameRef.current = new Uint8ClampedArray(data);

    if (totalDiff < 3000) return null; // not enough motion

    const centerX = weightedX / totalDiff;
    // Video is mirrored, so invert
    const mirroredX = TRACK_W - centerX;
    const ratio = mirroredX / TRACK_W;

    if (ratio < 0.33) return ZONES.LEFT;
    if (ratio > 0.66) return ZONES.RIGHT;
    return ZONES.CENTER;
  }, []);

  // ── Touch/mouse fallback ──
  const handlePointer = useCallback((e) => {
    if (!useFallback) return;
    const gs = gameStateRef.current;
    if (!gs || !gs.running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    const relX = x / rect.width;

    if (relX < 0.33) gs.zone = ZONES.LEFT;
    else if (relX > 0.66) gs.zone = ZONES.RIGHT;
    else gs.zone = ZONES.CENTER;
  }, [useFallback]);

  // ── Main game loop ──
  const startGame = useCallback(() => {
    const gs = initGameState();
    gameStateRef.current = gs;
    prevFrameRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    function spawnItem(gs) {
      const typeIdx = weightedRandom();
      gs.items.push({
        type: typeIdx,
        x: Math.random() * (CANVAS_W - 40) + 20,
        y: -ITEM_SIZE,
        speed: 100 + Math.random() * 40 + gs.elapsed * 1.2,
      });
    }

    function loop(timestamp) {
      if (!gs.running) return;
      rafRef.current = requestAnimationFrame(loop);

      const rawDt = gs.lastTime ? (timestamp - gs.lastTime) / 1000 : 0.016;
      gs.lastTime = timestamp;
      const dt = Math.min(rawDt, 0.05); // cap at 50ms, don't skip

      gs.elapsed += dt;

      // Timer
      gs.timer -= dt;
      if (gs.timer <= 0) {
        gs.timer = 0;
        gs.running = false;
        setFinalScore(gs.score);
        setPhase('ended');
        return;
      }

      // Motion detection (use ref to avoid stale closure)
      if (cameraActiveRef.current) {
        const detected = detectMotionZone();
        if (detected !== null) gs.zone = detected;
      }

      // Smooth basket movement
      const targetX = ZONE_X[gs.zone];
      gs.basketX += (targetX - gs.basketX) * 0.18;

      // Spawn items
      const spawnInterval = Math.max(0.4, 1.2 - gs.elapsed * 0.008);
      gs.spawnTimer += dt;
      if (gs.spawnTimer >= spawnInterval) {
        gs.spawnTimer = 0;
        spawnItem(gs);
      }

      // Update items
      for (let i = gs.items.length - 1; i >= 0; i--) {
        const item = gs.items[i];
        item.y += item.speed * dt;

        // Catch check
        if (
          item.y + ITEM_SIZE / 2 >= BASKET_Y - 10 &&
          item.y - ITEM_SIZE / 2 <= BASKET_Y + 20 &&
          Math.abs(item.x - gs.basketX) < BASKET_W / 2 + 10
        ) {
          const info = ITEM_TYPES[item.type];
          gs.score += info.score;
          if (gs.score < 0) gs.score = 0;
          if (info.score < 0) {
            gs.lives--;
            gs.flash = 0.3;
            if (gs.lives <= 0) {
              gs.running = false;
              setFinalScore(gs.score);
              setPhase('ended');
              return;
            }
          }
          gs.items.splice(i, 1);
          continue;
        }

        // Missed — remove if off screen
        if (item.y > CANVAS_H + 30) {
          gs.items.splice(i, 1);
        }
      }

      if (gs.flash > 0) gs.flash -= dt;

      // ── Draw ──
      // Background
      ctx.fillStyle = '#07071a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle grid
      ctx.strokeStyle = 'rgba(179,136,255,0.06)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < CANVAS_W; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CANVAS_H); ctx.stroke();
      }
      for (let gy = 0; gy < CANVAS_H; gy += 30) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS_W, gy); ctx.stroke();
      }

      // Zone indicators (faint)
      ctx.fillStyle = 'rgba(233,30,140,0.04)';
      ctx.fillRect(0, BASKET_Y - 30, CANVAS_W / 3, 80);
      ctx.fillStyle = 'rgba(179,136,255,0.04)';
      ctx.fillRect(CANVAS_W / 3, BASKET_Y - 30, CANVAS_W / 3, 80);
      ctx.fillStyle = 'rgba(233,30,140,0.04)';
      ctx.fillRect((CANVAS_W / 3) * 2, BASKET_Y - 30, CANVAS_W / 3, 80);

      // Items — bright glowing circles behind each emoji so they're clearly visible
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const item of gs.items) {
        const isBomb = item.type === 3;
        const glowColor = isBomb ? '#ff2222' : item.type === 1 ? '#ffd740' : '#e91e8c';

        // Radial glow background
        const glow = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, ITEM_SIZE * 1.2);
        glow.addColorStop(0, glowColor + '70');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(item.x, item.y, ITEM_SIZE * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Bright ring
        ctx.strokeStyle = glowColor + '60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(item.x, item.y, ITEM_SIZE * 0.8, 0, Math.PI * 2);
        ctx.stroke();

        // Emoji (larger)
        ctx.font = `${ITEM_SIZE + 8}px serif`;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 16;
        ctx.fillText(ITEM_TYPES[item.type].emoji, item.x, item.y);
        ctx.shadowBlur = 0;
      }

      // Basket
      const bx = gs.basketX;
      // Large bright glow under basket
      const grd = ctx.createRadialGradient(bx, BASKET_Y + 5, 5, bx, BASKET_Y + 5, 55);
      grd.addColorStop(0, 'rgba(233,30,140,0.5)');
      grd.addColorStop(0.5, 'rgba(179,136,255,0.2)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(bx, BASKET_Y + 5, 55, 0, Math.PI * 2);
      ctx.fill();

      // Basket — big emoji instead of tiny trapezoid
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#e91e8c';
      ctx.shadowBlur = 20;
      ctx.fillText('🧺', bx, BASKET_Y + 8);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#e91e8c';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Handle
      ctx.beginPath();
      ctx.arc(bx, BASKET_Y - 6, 16, Math.PI, 0);
      ctx.strokeStyle = '#e91e8c';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // HUD — Score
      ctx.fillStyle = '#e91e8c';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${gs.score}`, 12, 28);

      // Lives
      ctx.fillStyle = '#b388ff';
      ctx.textAlign = 'left';
      ctx.fillText('Lives: ' + '\u2764\uFE0F'.repeat(Math.max(0, gs.lives)), 12, 52);

      // Timer
      const timeLeft = Math.ceil(gs.timer);
      ctx.fillStyle = timeLeft <= 10 ? '#ff4466' : '#e91e8c';
      ctx.textAlign = 'right';
      ctx.fillText(`${timeLeft}s`, CANVAS_W - 12, 28);

      // Zone label
      const zoneLabels = ['LEFT', 'CENTER', 'RIGHT'];
      ctx.fillStyle = 'rgba(179,136,255,0.4)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(useFallback ? 'Tap to move' : zoneLabels[gs.zone], CANVAS_W - 12, 52);

      // Camera preview circle
      if (cameraActive && video && video.readyState >= 2) {
        const previewR = 50;
        const px = CANVAS_W - previewR - 8;
        const py = 80 + previewR;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, previewR, 0, Math.PI * 2);
        ctx.clip();
        // Mirror the video
        ctx.translate(px + previewR, py - previewR);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, previewR * 2, previewR * 2);
        ctx.restore();
        // Border
        ctx.beginPath();
        ctx.arc(px, py, previewR, 0, Math.PI * 2);
        ctx.strokeStyle = '#e91e8c';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Flash overlay (bomb hit)
      if (gs.flash > 0) {
        ctx.fillStyle = `rgba(255,0,50,${gs.flash * 0.6})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [cameraActive, useFallback, detectMotionZone, initGameState]);

  // Start game when phase becomes playing
  useEffect(() => {
    if (phase === 'playing') {
      startGame();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, startGame]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stopCamera]);

  const handleStartWithCamera = () => startCamera();
  const handleStartWithoutCamera = () => {
    setUseFallback(true);
    setCameraActive(false);
    setPhase('playing');
  };
  const handleRestart = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    prevFrameRef.current = null;
    setPhase('intro');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
    }}>
      {/* Back link */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        padding: '18px 16px 0',
        boxSizing: 'border-box',
      }}>
        <Link href="/games" style={{
          color: '#b388ff',
          textDecoration: 'none',
          fontSize: 15,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'color 0.2s',
        }}>
          &larr; Games
        </Link>
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: 32,
        color: '#e91e8c',
        margin: '16px 0 4px',
        textShadow: '0 0 20px rgba(233,30,140,0.4)',
      }}>
        Catch My Love
      </h1>
      <p style={{
        color: '#b388ff',
        fontSize: 13,
        margin: '0 0 16px',
        opacity: 0.8,
      }}>
        Move your hand to catch the hearts!
      </p>

      {/* Hidden video & tracking canvas */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: 'none' }}
        width={320}
        height={240}
      />
      <canvas
        ref={trackCanvasRef}
        width={TRACK_W}
        height={TRACK_H}
        style={{ display: 'none' }}
      />

      {/* ── INTRO SCREEN ── */}
      {phase === 'intro' && (
        <div style={{
          width: CANVAS_W,
          maxWidth: '95vw',
          background: 'rgba(179,136,255,0.06)',
          border: '1px solid rgba(233,30,140,0.2)',
          borderRadius: 16,
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🫳</div>
          <h2 style={{
            fontFamily: "'Dancing Script', cursive",
            color: '#e91e8c',
            fontSize: 24,
            margin: '0 0 12px',
          }}>
            How to Play
          </h2>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 13,
            lineHeight: 1.7,
            marginBottom: 20,
            textAlign: 'left',
          }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: '#b388ff' }}>With Camera:</strong> Move your hand left, center, or right in front of the camera to control the basket.
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: '#b388ff' }}>Without Camera:</strong> Tap/click the left, center, or right side of the game area.
            </p>
            <p style={{ margin: '0 0 4px' }}>
              <span style={{ marginRight: 8 }}>💕 +1</span>
              <span style={{ marginRight: 8 }}>⭐ +3</span>
              <span style={{ marginRight: 8 }}>🌸 +2</span>
              <span>💣 -5 &amp; lose a life!</span>
            </p>
          </div>

          <button onClick={handleStartWithCamera} style={{
            width: '100%',
            padding: '14px',
            marginBottom: 10,
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>
            Start with Camera 📷
          </button>
          <button onClick={handleStartWithoutCamera} style={{
            width: '100%',
            padding: '14px',
            background: 'transparent',
            color: '#b388ff',
            border: '1px solid rgba(179,136,255,0.3)',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>
            Play with Touch/Mouse instead
          </button>
        </div>
      )}

      {/* ── REQUESTING CAMERA ── */}
      {phase === 'requesting' && (
        <div style={{
          width: CANVAS_W,
          maxWidth: '95vw',
          textAlign: 'center',
          padding: '60px 24px',
        }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(233,30,140,0.3)',
            borderTop: '3px solid #e91e8c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }} />
          <p style={{ color: '#b388ff', fontSize: 15 }}>Requesting camera access...</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>
            Please allow camera permission when prompted
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && (
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handlePointer}
          onTouchStart={handlePointer}
          style={{
            borderRadius: 12,
            border: '1px solid rgba(233,30,140,0.2)',
            maxWidth: '95vw',
            cursor: useFallback ? 'pointer' : 'default',
            touchAction: 'none',
          }}
        />
      )}

      {/* ── ENDED ── */}
      {phase === 'ended' && (
        <div style={{
          width: CANVAS_W,
          maxWidth: '95vw',
          background: 'rgba(179,136,255,0.06)',
          border: '1px solid rgba(233,30,140,0.2)',
          borderRadius: 16,
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {finalScore >= 50 ? '🏆' : finalScore >= 25 ? '💕' : '🌸'}
          </div>
          <h2 style={{
            fontFamily: "'Dancing Script', cursive",
            color: '#e91e8c',
            fontSize: 28,
            margin: '0 0 8px',
          }}>
            {finalScore >= 50 ? 'Amazing!' : finalScore >= 25 ? 'Well Done!' : 'Good Try!'}
          </h2>
          <p style={{
            fontSize: 40,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '8px 0 4px',
          }}>
            {finalScore}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 24 }}>
            points collected
          </p>

          <button onClick={handleRestart} style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            marginBottom: 10,
          }}>
            Play Again
          </button>
          <Link href="/games" style={{
            display: 'block',
            padding: '12px',
            color: '#b388ff',
            fontSize: 14,
            textDecoration: 'none',
          }}>
            &larr; Back to Games
          </Link>
        </div>
      )}

      {/* Fallback instruction */}
      {phase === 'playing' && useFallback && (
        <p style={{
          color: 'rgba(179,136,255,0.5)',
          fontSize: 12,
          marginTop: 10,
          textAlign: 'center',
        }}>
          Tap left, center, or right side of the game to move the basket
        </p>
      )}
    </div>
  );
}
