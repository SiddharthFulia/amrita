'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

const CANVAS_W = 400;
const CANVAS_H = 600;
const CHAR_SIZE = 40;
const ITEM_SIZE = 30;
const SAMPLE_W = 80;
const SAMPLE_H = 60;
const PREVIEW_W = 120;
const PREVIEW_H = 90;
const MAX_LIVES = 3;
const SPAWN_INTERVAL_INIT = 900;
const SPAWN_INTERVAL_MIN = 400;

const ITEM_TYPES = [
  { emoji: '\u{1F495}', points: 1, type: 'heart' },
  { emoji: '\u2B50', points: 3, type: 'star' },
  { emoji: '\u{1F4A3}', points: 0, type: 'bomb' },
  { emoji: '\u{1F338}', points: 2, type: 'flower' },
];

function weightedRandom() {
  const r = Math.random();
  if (r < 0.40) return ITEM_TYPES[0]; // heart 40%
  if (r < 0.60) return ITEM_TYPES[1]; // star 20%
  if (r < 0.85) return ITEM_TYPES[2]; // bomb 25%
  return ITEM_TYPES[3]; // flower 15%
}

export default function FaceDodgePage() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);

  const [gamePhase, setGamePhase] = useState('menu'); // menu | requesting | playing | paused | gameover
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [controlMode, setControlMode] = useState('camera'); // camera | touch
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const controlModeRef = useRef('camera');
  const cameraActiveRef = useRef(false);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('facedodge_highscore');
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {}
  }, []);

  // Game state stored in ref for animation loop access
  useEffect(() => {
    stateRef.current = {
      charX: CANVAS_W / 2,
      targetX: CANVAS_W / 2,
      items: [],
      score: 0,
      lives: MAX_LIVES,
      lastSpawn: 0,
      spawnInterval: SPAWN_INTERVAL_INIT,
      elapsed: 0,
      baseSpeed: 2,
      particles: [],
      shakeTimer: 0,
      touchX: null,
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    setGamePhase('requesting');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        cameraActiveRef.current = true;
        setControlMode('camera');
        controlModeRef.current = 'camera';
        prevFrameRef.current = null;
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Using touch controls instead.'
          : err.name === 'NotFoundError'
          ? 'No camera found. Using touch controls instead.'
          : `Camera error: ${err.message}. Using touch controls.`
      );
      setControlMode('touch');
      controlModeRef.current = 'touch';
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    cameraActiveRef.current = false;
  }, []);

  // Detect movement center from video using frame differencing
  const detectMovement = useCallback(() => {
    if (!videoRef.current || !sampleCanvasRef.current || videoRef.current.readyState < 2) return null;

    const ctx = sampleCanvasRef.current.getContext('2d', { willReadFrequently: true });
    // Mirror: flip horizontally
    ctx.save();
    ctx.translate(SAMPLE_W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, SAMPLE_W, SAMPLE_H);
    ctx.restore();

    const currentFrame = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
    const data = currentFrame.data;

    if (!prevFrameRef.current) {
      prevFrameRef.current = new Uint8ClampedArray(data);
      return null;
    }

    const prev = prevFrameRef.current;
    let totalDiff = 0;
    let weightedX = 0;
    let weightedY = 0;

    // Also compute brightness-weighted center (skin-tone heuristic)
    let skinWeightX = 0;
    let skinTotal = 0;

    for (let y = 0; y < SAMPLE_H; y++) {
      for (let x = 0; x < SAMPLE_W; x++) {
        const i = (y * SAMPLE_W + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const pr = prev[i], pg = prev[i + 1], pb = prev[i + 2];

        // Frame difference
        const diff = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
        if (diff > 40) {
          totalDiff += diff;
          weightedX += x * diff;
          weightedY += y * diff;
        }

        // Simple skin-tone detection (works for various skin tones)
        // Detect warmish tones where R > G > B typically, or just high-brightness regions
        const brightness = (r + g + b) / 3;
        const isSkinLike = r > 60 && g > 40 && b > 20 && r > b && brightness > 60 && brightness < 240;
        if (isSkinLike) {
          const w = brightness;
          skinWeightX += x * w;
          skinTotal += w;
        }
      }
    }

    // Copy current frame for next comparison
    prevFrameRef.current = new Uint8ClampedArray(data);

    // Prefer motion if enough was detected, else fall back to skin position
    if (totalDiff > 5000) {
      const cx = weightedX / totalDiff;
      return cx / SAMPLE_W; // 0..1 normalized
    } else if (skinTotal > 0) {
      const cx = skinWeightX / skinTotal;
      return cx / SAMPLE_W;
    }

    return null;
  }, []);

  // Touch/mouse handling
  const handlePointerMove = useCallback(
    (e) => {
      if (!stateRef.current || controlModeRef.current !== 'touch') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = ((clientX - rect.left) / rect.width) * CANVAS_W;
      stateRef.current.touchX = Math.max(CHAR_SIZE / 2, Math.min(CANVAS_W - CHAR_SIZE / 2, x));
    },
    [controlMode]
  );

  // Start game
  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.charX = CANVAS_W / 2;
    s.targetX = CANVAS_W / 2;
    s.items = [];
    s.score = 0;
    s.lives = MAX_LIVES;
    s.lastSpawn = 0;
    s.spawnInterval = SPAWN_INTERVAL_INIT;
    s.elapsed = 0;
    s.baseSpeed = 2;
    s.particles = [];
    s.shakeTimer = 0;
    s.touchX = null;
    setScore(0);
    setLives(MAX_LIVES);
    setGamePhase('playing');
  }, []);

  // Game loop
  useEffect(() => {
    if (gamePhase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      const s = stateRef.current;
      s.elapsed += dt;

      // Increase difficulty
      s.baseSpeed = 2 + s.elapsed / 20000;
      s.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_INIT - s.elapsed / 30);

      // --- Input (use refs to avoid stale closure) ---
      if (controlModeRef.current === 'camera' && cameraActiveRef.current) {
        const pos = detectMovement();
        if (pos !== null) {
          s.targetX = CHAR_SIZE / 2 + pos * (CANVAS_W - CHAR_SIZE);
        }
      } else if (controlModeRef.current === 'touch' && s.touchX !== null) {
        s.targetX = s.touchX;
      }

      // Smooth character movement
      const lerpSpeed = 0.12;
      s.charX += (s.targetX - s.charX) * lerpSpeed;

      // --- Spawn items ---
      if (now - s.lastSpawn > s.spawnInterval) {
        s.lastSpawn = now;
        const itemType = weightedRandom();
        s.items.push({
          x: ITEM_SIZE / 2 + Math.random() * (CANVAS_W - ITEM_SIZE),
          y: -ITEM_SIZE,
          speed: s.baseSpeed * (0.7 + Math.random() * 0.8),
          ...itemType,
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 0.05,
        });
      }

      // --- Update items ---
      const charY = CANVAS_H - 60;
      let scoreChanged = false;
      let livesChanged = false;

      for (let i = s.items.length - 1; i >= 0; i--) {
        const item = s.items[i];
        item.y += item.speed * (dt / 16);
        item.rotation += item.rotSpeed * dt;

        // Check collision with character
        const dx = item.x - s.charX;
        const dy = item.y - charY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (CHAR_SIZE + ITEM_SIZE) / 2) {
          if (item.type === 'bomb') {
            s.lives--;
            livesChanged = true;
            s.shakeTimer = 300;
            // Explosion particles
            for (let p = 0; p < 8; p++) {
              const angle = (Math.PI * 2 * p) / 8;
              s.particles.push({
                x: item.x,
                y: item.y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 500,
                maxLife: 500,
                color: '#ff4444',
                size: 4,
              });
            }
          } else {
            s.score += item.points;
            scoreChanged = true;
            // Sparkle particles
            for (let p = 0; p < 6; p++) {
              const angle = (Math.PI * 2 * p) / 6;
              s.particles.push({
                x: item.x,
                y: item.y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2 - 1,
                life: 400,
                maxLife: 400,
                color: item.type === 'star' ? '#ffd700' : '#e91e8c',
                size: 3,
              });
            }
          }
          s.items.splice(i, 1);
          continue;
        }

        // Remove if off screen
        if (item.y > CANVAS_H + ITEM_SIZE) {
          s.items.splice(i, 1);
        }
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.life -= dt;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // Shake timer
      if (s.shakeTimer > 0) s.shakeTimer -= dt;

      // Update React state
      if (scoreChanged) setScore(s.score);
      if (livesChanged) setLives(s.lives);

      // Game over check
      if (s.lives <= 0) {
        setGamePhase('gameover');
        setHighScore((prev) => {
          const best = Math.max(prev, s.score);
          try {
            localStorage.setItem('facedodge_highscore', best.toString());
          } catch {}
          return best;
        });
        return;
      }

      // --- Draw ---
      ctx.save();

      // Screen shake
      if (s.shakeTimer > 0) {
        const intensity = (s.shakeTimer / 300) * 5;
        ctx.translate(
          (Math.random() - 0.5) * intensity,
          (Math.random() - 0.5) * intensity
        );
      }

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, '#07071a');
      bgGrad.addColorStop(1, '#0d0d2b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle grid
      ctx.strokeStyle = 'rgba(179, 136, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = (s.elapsed * 0.03) % 40; y < CANVAS_H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // Draw items
      ctx.font = `${ITEM_SIZE}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const item of s.items) {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);
        // Glow for collectibles
        if (item.type !== 'bomb') {
          ctx.shadowColor = item.type === 'star' ? '#ffd700' : '#e91e8c';
          ctx.shadowBlur = 12;
        }
        ctx.fillText(item.emoji, 0, 0);
        ctx.restore();
      }

      // Draw character
      ctx.save();
      ctx.shadowColor = '#e91e8c';
      ctx.shadowBlur = 20;
      ctx.font = `${CHAR_SIZE}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F431}', s.charX, charY);
      ctx.restore();

      // Draw ground line
      const groundGrad = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
      groundGrad.addColorStop(0, 'transparent');
      groundGrad.addColorStop(0.5, '#e91e8c');
      groundGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = groundGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H - 30);
      ctx.lineTo(CANVAS_W, CANVAS_H - 30);
      ctx.stroke();

      // Draw particles
      for (const p of s.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD - Score
      ctx.fillStyle = '#b388ff';
      ctx.font = '600 18px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${s.score}`, 12, 28);

      // HUD - Lives
      ctx.textAlign = 'right';
      let heartsStr = '';
      for (let i = 0; i < MAX_LIVES; i++) {
        heartsStr += i < s.lives ? '\u2764\uFE0F' : '\u{1F5A4}';
      }
      ctx.font = '18px serif';
      ctx.fillText(heartsStr, CANVAS_W - 12, 28);

      // Camera preview
      if (cameraActive && videoRef.current && videoRef.current.readyState >= 2) {
        const px = CANVAS_W - PREVIEW_W - 8;
        const py = 42;
        ctx.save();
        // Rounded rect clip
        const r = 10;
        ctx.beginPath();
        ctx.moveTo(px + r, py);
        ctx.lineTo(px + PREVIEW_W - r, py);
        ctx.quadraticCurveTo(px + PREVIEW_W, py, px + PREVIEW_W, py + r);
        ctx.lineTo(px + PREVIEW_W, py + PREVIEW_H - r);
        ctx.quadraticCurveTo(px + PREVIEW_W, py + PREVIEW_H, px + PREVIEW_W - r, py + PREVIEW_H);
        ctx.lineTo(px + r, py + PREVIEW_H);
        ctx.quadraticCurveTo(px, py + PREVIEW_H, px, py + PREVIEW_H - r);
        ctx.lineTo(px, py + r);
        ctx.quadraticCurveTo(px, py, px + r, py);
        ctx.closePath();
        ctx.clip();
        // Mirror video
        ctx.translate(px + PREVIEW_W, py);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, PREVIEW_W, PREVIEW_H);
        ctx.restore();
        // Border
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + r, py);
        ctx.lineTo(px + PREVIEW_W - r, py);
        ctx.quadraticCurveTo(px + PREVIEW_W, py, px + PREVIEW_W, py + r);
        ctx.lineTo(px + PREVIEW_W, py + PREVIEW_H - r);
        ctx.quadraticCurveTo(px + PREVIEW_W, py + PREVIEW_H, px + PREVIEW_W - r, py + PREVIEW_H);
        ctx.lineTo(px + r, py + PREVIEW_H);
        ctx.quadraticCurveTo(px, py + PREVIEW_H, px, py + PREVIEW_H - r);
        ctx.lineTo(px, py + r);
        ctx.quadraticCurveTo(px, py, px + r, py);
        ctx.closePath();
        ctx.stroke();
      }

      ctx.restore();

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gamePhase, detectMovement]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Handle start with camera
  const handleStartWithCamera = async () => {
    await startCamera();
    startGame();
  };

  // Handle start with touch
  const handleStartWithTouch = () => {
    setControlMode('touch');
    controlModeRef.current = 'touch';
    setCameraError('');
    startGame();
  };

  // Toggle control mode during game
  const toggleMode = async () => {
    if (controlMode === 'camera') {
      stopCamera();
      setControlMode('touch');
      controlModeRef.current = 'touch';
    } else {
      await startCamera();
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Back link */}
      <div style={{ width: '100%', maxWidth: 420, marginBottom: 12 }}>
        <Link
          href="/games"
          style={{
            color: '#b388ff',
            textDecoration: 'none',
            fontSize: 15,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.target.style.color = '#e91e8c')}
          onMouseLeave={(e) => (e.target.style.color = '#b388ff')}
        >
          ← Games
        </Link>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 32,
          background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 8px 0',
        }}
      >
        Face Dodge
      </h1>
      <p style={{ color: '#b388ff', fontSize: 13, margin: '0 0 16px 0', opacity: 0.7 }}>
        Move your head to dodge bombs & collect hearts!
      </p>

      {/* Hidden video and sample canvas */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />
      <canvas
        ref={sampleCanvasRef}
        width={SAMPLE_W}
        height={SAMPLE_H}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />

      {/* Game canvas container */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            width: '100%',
            maxWidth: CANVAS_W,
            height: 'auto',
            borderRadius: 16,
            border: '2px solid rgba(233, 30, 140, 0.3)',
            display: 'block',
            margin: '0 auto',
            touchAction: 'none',
          }}
          onMouseMove={handlePointerMove}
          onTouchMove={(e) => {
            e.preventDefault();
            handlePointerMove(e);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handlePointerMove(e);
          }}
        />

        {/* Menu overlay */}
        {gamePhase === 'menu' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(7,7,26,0.92)',
              borderRadius: 16,
              gap: 14,
              padding: 30,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 4 }}>{'\u{1F431}'}</div>
            <h2
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: 28,
                background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
              }}
            >
              Face Dodge
            </h2>
            <p style={{ color: '#b388ff', fontSize: 13, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Use your camera to track your face
              <br />
              and dodge falling bombs!
              <br />
              Collect {'\u{1F495}'} {'\u2B50'} {'\u{1F338}'} for points!
            </p>

            {highScore > 0 && (
              <p style={{ color: '#ffd700', fontSize: 14, margin: 0 }}>
                Best Score: {highScore}
              </p>
            )}

            <button
              onClick={handleStartWithCamera}
              style={{
                marginTop: 8,
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                border: 'none',
                borderRadius: 30,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 20px rgba(233,30,140,0.3)',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 6px 30px rgba(233,30,140,0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 20px rgba(233,30,140,0.3)';
              }}
            >
              {'\u{1F4F7}'} Start with Camera
            </button>

            <button
              onClick={handleStartWithTouch}
              style={{
                padding: '10px 28px',
                background: 'transparent',
                border: '2px solid #b388ff',
                borderRadius: 30,
                color: '#b388ff',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(179,136,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              {'\u{1F446}'} Start with Touch/Mouse
            </button>

            {cameraError && (
              <p style={{ color: '#ff6b6b', fontSize: 12, textAlign: 'center', margin: 0 }}>
                {cameraError}
              </p>
            )}
          </div>
        )}

        {/* Requesting camera overlay */}
        {gamePhase === 'requesting' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(7,7,26,0.95)',
              borderRadius: 16,
              gap: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid #b388ff',
                borderTopColor: '#e91e8c',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: '#b388ff', fontSize: 14 }}>Requesting camera access...</p>
            <p style={{ color: 'rgba(179,136,255,0.6)', fontSize: 12 }}>
              Please allow camera permission
            </p>
          </div>
        )}

        {/* Game over overlay */}
        {gamePhase === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(7,7,26,0.92)',
              borderRadius: 16,
              gap: 12,
              padding: 30,
            }}
          >
            <div style={{ fontSize: 48 }}>{score > 20 ? '\u{1F389}' : '\u{1F63F}'}</div>
            <h2
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: 28,
                color: '#e91e8c',
                margin: 0,
              }}
            >
              Game Over!
            </h2>
            <p style={{ color: '#fff', fontSize: 22, margin: 0, fontWeight: 600 }}>
              Score: {score}
            </p>
            {score >= highScore && score > 0 && (
              <p style={{ color: '#ffd700', fontSize: 14, margin: 0 }}>
                {'\u{1F31F}'} New High Score! {'\u{1F31F}'}
              </p>
            )}
            {highScore > 0 && score < highScore && (
              <p style={{ color: '#b388ff', fontSize: 13, margin: 0, opacity: 0.7 }}>
                Best: {highScore}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  startGame();
                }}
                style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                  border: 'none',
                  borderRadius: 30,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 20px rgba(233,30,140,0.3)',
                }}
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setGamePhase('menu');
                }}
                style={{
                  padding: '12px 28px',
                  background: 'transparent',
                  border: '2px solid #b388ff',
                  borderRadius: 30,
                  color: '#b388ff',
                  fontSize: 15,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls below canvas */}
      {gamePhase === 'playing' && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={toggleMode}
            style={{
              padding: '8px 18px',
              background: 'rgba(179,136,255,0.15)',
              border: '1px solid rgba(179,136,255,0.3)',
              borderRadius: 20,
              color: '#b388ff',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
            }}
          >
            {controlMode === 'camera' ? '\u{1F446} Switch to Touch' : '\u{1F4F7} Switch to Camera'}
          </button>
          <span style={{ color: 'rgba(179,136,255,0.5)', fontSize: 11 }}>
            Mode: {controlMode === 'camera' ? 'Camera' : 'Touch/Mouse'}
          </span>
        </div>
      )}

      {cameraError && gamePhase === 'playing' && (
        <p style={{ color: '#ff6b6b', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
          {cameraError}
        </p>
      )}

      {/* Spin animation */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
