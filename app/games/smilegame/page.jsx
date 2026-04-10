'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ─── Constants ──────────────────────────────────────────────────────────────
const GAME_DURATION = 60;
const CALIBRATION_TIME = 3;
const CANVAS_W = 160;
const CANVAS_H = 120;
const SMILE_THRESHOLD = 4;
const STREAK_TIME = 3;
const EMOJIS = ['💕', '❤️', '✨', '🌸', '💗', '💖', '💝', '⭐'];
const MESSAGES_SMILING = [
  'You\'re glowing! ✨',
  'That smile is everything! 💕',
  'Beautiful! Keep going! 🌸',
  'Absolutely radiant! ✨',
  'Can\'t stop won\'t stop! 💖',
  'Gorgeous smile! 💗',
];
const MESSAGES_NEUTRAL = [
  'Give me a smile! 😊',
  'Show me those pearly whites! ✨',
  'C\'mon, light up the room! 💡',
  'I know you want to smile! 😄',
  'Think of something happy! 💭',
];

// ─── Phases ──────────────────────────────────────────────────────────────────
const PHASE = {
  PERMISSION: 'permission',
  CALIBRATING: 'calibrating',
  PLAYING: 'playing',
  ENDED: 'ended',
  FALLBACK: 'fallback',
  FALLBACK_PLAYING: 'fallback_playing',
  FALLBACK_ENDED: 'fallback_ended',
};

// ─── Floating Particle Component ────────────────────────────────────────────
function FloatingParticle({ emoji, x, delay, duration }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: `${x}%`,
        top: '-40px',
        fontSize: `${20 + Math.random() * 16}px`,
        animation: `emojiRain ${duration}s linear ${delay}s forwards`,
        pointerEvents: 'none',
        zIndex: 50,
        filter: 'drop-shadow(0 0 6px rgba(233,30,140,0.4))',
      }}
    >
      {emoji}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SmileGamePage() {
  const [phase, setPhase] = useState(PHASE.PERMISSION);
  const [calibCountdown, setCalibCountdown] = useState(CALIBRATION_TIME);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [smileIntensity, setSmileIntensity] = useState(0);
  const [smileSeconds, setSmileSeconds] = useState(0);
  const [streakTime, setStreakTime] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [message, setMessage] = useState('');
  const [particles, setParticles] = useState([]);
  const [confettiBurst, setConfettiBurst] = useState(false);
  const [holdingSmile, setHoldingSmile] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const displayCanvasRef = useRef(null);
  const displayFrameRef = useRef(null);
  const streamRef = useRef(null);
  const baselineRef = useRef(null);
  const prevFrameRef = useRef(null);
  const rollingRef = useRef([]);
  const animFrameRef = useRef(null);
  const particleIdRef = useRef(0);
  const smileAccRef = useRef(0);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const msgTimerRef = useRef(null);

  // ── Cleanup ──
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (displayFrameRef.current) {
      cancelAnimationFrame(displayFrameRef.current);
      displayFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Mirror video to display canvas ──
  useEffect(() => {
    if (phase !== PHASE.CALIBRATING && phase !== PHASE.PLAYING) {
      if (displayFrameRef.current) cancelAnimationFrame(displayFrameRef.current);
      return;
    }
    const canvas = displayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      displayFrameRef.current = requestAnimationFrame(draw);
      if (video.readyState >= 2) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    };
    displayFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (displayFrameRef.current) cancelAnimationFrame(displayFrameRef.current);
    };
  }, [phase]);

  // ── Start camera ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase(PHASE.CALIBRATING);
    } catch (err) {
      console.warn('Camera denied:', err);
      setPhase(PHASE.FALLBACK);
    }
  }, []);

  // ── Get region brightness from ImageData ──
  const getRegionData = useCallback((imageData, x1, y1, x2, y2) => {
    const { data, width } = imageData;
    let totalBrightness = 0;
    let pixelCount = 0;
    const pixels = [];
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * width + x) * 4;
        const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        totalBrightness += brightness;
        pixels.push(brightness);
        pixelCount++;
      }
    }
    return { avg: totalBrightness / (pixelCount || 1), pixels };
  }, []);

  // ── Frame-to-frame difference ──
  const getFrameDiff = useCallback((current, previous) => {
    if (!previous || current.length !== previous.length) return 0;
    let diff = 0;
    for (let i = 0; i < current.length; i++) {
      diff += Math.abs(current[i] - previous[i]);
    }
    return diff / (current.length || 1);
  }, []);

  // ── Calibration ──
  useEffect(() => {
    if (phase !== PHASE.CALIBRATING) return;

    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let countdown = CALIBRATION_TIME;
    setCalibCountdown(countdown);

    const interval = setInterval(() => {
      countdown -= 1;
      setCalibCountdown(countdown);
      if (countdown <= 0) {
        clearInterval(interval);
        // Capture baseline
        ctx.drawImage(videoRef.current, 0, 0, CANVAS_W, CANVAS_H);
        const centerX1 = Math.floor(CANVAS_W * 0.25);
        const centerX2 = Math.floor(CANVAS_W * 0.75);
        const mouthY1 = Math.floor(CANVAS_H * 0.55);
        const mouthY2 = Math.floor(CANVAS_H * 0.85);
        const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
        const region = getRegionData(imageData, centerX1, mouthY1, centerX2, mouthY2);
        baselineRef.current = { avg: region.avg, pixels: region.pixels };
        prevFrameRef.current = region.pixels;
        rollingRef.current = [];
        setPhase(PHASE.PLAYING);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, getRegionData]);

  // ── Spawn particles ──
  const spawnParticles = useCallback((count) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      });
    }
    setParticles((prev) => [...prev.slice(-60), ...newParticles]);
  }, []);

  // ── Pick random message ──
  const pickMessage = useCallback((isSmiling) => {
    if (msgTimerRef.current) return; // Don't spam
    const pool = isSmiling ? MESSAGES_SMILING : MESSAGES_NEUTRAL;
    setMessage(pool[Math.floor(Math.random() * pool.length)]);
    msgTimerRef.current = setTimeout(() => {
      msgTimerRef.current = null;
    }, 2000);
  }, []);

  // ── Game loop (camera version) ──
  useEffect(() => {
    if (phase !== PHASE.PLAYING) return;

    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let timer = GAME_DURATION;
    setTimeLeft(timer);
    setScore(0);
    setSmileSeconds(0);
    scoreRef.current = 0;
    smileAccRef.current = 0;
    streakRef.current = 0;

    const timerInterval = setInterval(() => {
      timer -= 1;
      setTimeLeft(timer);
      if (timer <= 0) {
        clearInterval(timerInterval);
        cancelAnimationFrame(animFrameRef.current);
        setPhase(PHASE.ENDED);
      }
    }, 1000);

    const centerX1 = Math.floor(CANVAS_W * 0.25);
    const centerX2 = Math.floor(CANVAS_W * 0.75);
    const mouthY1 = Math.floor(CANVAS_H * 0.55);
    const mouthY2 = Math.floor(CANVAS_H * 0.85);

    let lastAnalysis = 0;
    const ANALYSIS_INTERVAL = 100; // ms

    const loop = (timestamp) => {
      if (timer <= 0) return;
      animFrameRef.current = requestAnimationFrame(loop);

      if (timestamp - lastAnalysis < ANALYSIS_INTERVAL) return;
      lastAnalysis = timestamp;

      ctx.drawImage(videoRef.current, 0, 0, CANVAS_W, CANVAS_H);
      const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      const region = getRegionData(imageData, centerX1, mouthY1, centerX2, mouthY2);

      // Brightness difference from baseline
      const brightnessDiff = Math.abs(region.avg - (baselineRef.current?.avg || 0));

      // Frame-to-frame movement
      const frameDiff = getFrameDiff(region.pixels, prevFrameRef.current);
      prevFrameRef.current = region.pixels;

      // Combined score: brightness change (smiling shows teeth = brighter) + any face movement
      const rawIntensity = brightnessDiff * 0.7 + frameDiff * 0.3;

      // Rolling average (smooth it out, shorter window = more responsive)
      rollingRef.current.push(rawIntensity);
      if (rollingRef.current.length > 5) rollingRef.current.shift();
      const smoothed =
        rollingRef.current.reduce((a, b) => a + b, 0) / rollingRef.current.length;

      // Normalize to 0-100 (lower divisor = more sensitive)
      const intensity = Math.min(100, (smoothed / 10) * 100);
      setSmileIntensity(intensity);

      const isSmiling = smoothed > SMILE_THRESHOLD;

      if (isSmiling) {
        // Track smile time (roughly, since analysis runs every ~100ms)
        smileAccRef.current += ANALYSIS_INTERVAL / 1000;
        setSmileSeconds(Math.floor(smileAccRef.current));

        // Streak
        streakRef.current += ANALYSIS_INTERVAL / 1000;
        const currentStreak = streakRef.current;
        setStreakTime(currentStreak);

        let mult = 1;
        if (currentStreak >= STREAK_TIME * 3) mult = 4;
        else if (currentStreak >= STREAK_TIME * 2) mult = 3;
        else if (currentStreak >= STREAK_TIME) mult = 2;
        setMultiplier(mult);

        // Score: more intensity = more points
        const points = Math.floor((intensity / 100) * 5 * mult);
        scoreRef.current += points;
        setScore(scoreRef.current);

        // Particles
        if (Math.random() < 0.4) spawnParticles(Math.ceil(intensity / 30));

        // Messages
        if (Math.random() < 0.02) pickMessage(true);
      } else {
        streakRef.current = 0;
        setStreakTime(0);
        setMultiplier(1);

        // Slow trickle of points even when neutral
        if (Math.random() < 0.15) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }

        if (Math.random() < 0.01) pickMessage(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      clearInterval(timerInterval);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [phase, getRegionData, getFrameDiff, spawnParticles, pickMessage]);

  // ── End game: confetti burst for high scores ──
  useEffect(() => {
    if (phase === PHASE.ENDED || phase === PHASE.FALLBACK_ENDED) {
      if (smileSeconds >= 40) {
        setConfettiBurst(true);
        spawnParticles(30);
        setTimeout(() => setConfettiBurst(false), 3000);
      } else if (smileSeconds >= 20) {
        spawnParticles(15);
      }
      stopCamera();
    }
  }, [phase, smileSeconds, spawnParticles, stopCamera]);

  // ── Fallback game (tap to smile) ──
  useEffect(() => {
    if (phase !== PHASE.FALLBACK_PLAYING) return;

    let timer = GAME_DURATION;
    setTimeLeft(timer);
    setScore(0);
    setSmileSeconds(0);
    scoreRef.current = 0;
    smileAccRef.current = 0;
    streakRef.current = 0;

    const timerInterval = setInterval(() => {
      timer -= 1;
      setTimeLeft(timer);
      if (timer <= 0) {
        clearInterval(timerInterval);
        setPhase(PHASE.FALLBACK_ENDED);
      }
    }, 1000);

    const scoreInterval = setInterval(() => {
      // Check holdingSmile via ref hack — we'll use a ref
    }, 100);

    return () => {
      clearInterval(timerInterval);
      clearInterval(scoreInterval);
    };
  }, [phase]);

  // ── Fallback: score while holding ──
  useEffect(() => {
    if (phase !== PHASE.FALLBACK_PLAYING) return;

    const interval = setInterval(() => {
      if (holdingSmile) {
        smileAccRef.current += 0.1;
        setSmileSeconds(Math.floor(smileAccRef.current));
        streakRef.current += 0.1;
        setStreakTime(streakRef.current);

        let mult = 1;
        if (streakRef.current >= STREAK_TIME * 3) mult = 4;
        else if (streakRef.current >= STREAK_TIME * 2) mult = 3;
        else if (streakRef.current >= STREAK_TIME) mult = 2;
        setMultiplier(mult);

        const points = 3 * mult;
        scoreRef.current += points;
        setScore(scoreRef.current);
        setSmileIntensity(85 + Math.random() * 15);

        if (Math.random() < 0.3) spawnParticles(2);
        if (Math.random() < 0.03) pickMessage(true);
      } else {
        streakRef.current = 0;
        setStreakTime(0);
        setMultiplier(1);
        setSmileIntensity(Math.max(0, smileIntensity - 10));

        if (Math.random() < 0.1) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
        if (Math.random() < 0.01) pickMessage(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, holdingSmile, spawnParticles, pickMessage]);

  // ── Get rating ──
  const getRating = () => {
    if (smileSeconds >= 40) return { text: 'Your smile lights up the world! ✨', tier: 'gold' };
    if (smileSeconds >= 20) return { text: 'That smile is beautiful! 💕', tier: 'silver' };
    return { text: 'You need more hugs! 🤗', tier: 'bronze' };
  };

  // ── Restart ──
  const restart = () => {
    setScore(0);
    setSmileSeconds(0);
    setSmileIntensity(0);
    setStreakTime(0);
    setMultiplier(1);
    setMessage('');
    setParticles([]);
    setConfettiBurst(false);
    scoreRef.current = 0;
    smileAccRef.current = 0;
    streakRef.current = 0;
    rollingRef.current = [];
    baselineRef.current = null;
    prevFrameRef.current = null;

    if (phase === PHASE.FALLBACK_ENDED) {
      setPhase(PHASE.FALLBACK_PLAYING);
    } else {
      startCamera();
    }
  };

  // ── Format time ──
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ──
  return (
    <div style={{
      minHeight: '100vh',
      background: smileIntensity > 50 && (phase === PHASE.PLAYING || phase === PHASE.FALLBACK_PLAYING)
        ? `linear-gradient(135deg, #07071a 0%, #1a0a2e ${Math.min(50, smileIntensity / 2)}%, #07071a 100%)`
        : '#07071a',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.5s ease',
    }}>
      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700&display=swap');

        @keyframes emojiRain {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(233,30,140,0.4), 0 0 40px rgba(233,30,140,0.2); }
          50% { box-shadow: 0 0 30px rgba(233,30,140,0.8), 0 0 60px rgba(233,30,140,0.4), 0 0 90px rgba(233,30,140,0.2); }
        }
        @keyframes pulseGlowIntense {
          0%, 100% { box-shadow: 0 0 25px rgba(233,30,140,0.6), 0 0 50px rgba(233,30,140,0.3), 0 0 80px rgba(179,136,255,0.2); }
          50% { box-shadow: 0 0 40px rgba(233,30,140,1), 0 0 80px rgba(233,30,140,0.6), 0 0 120px rgba(179,136,255,0.4); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes confettiBurst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes streak {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes orbitHeart {
          0%   { transform: translate(-50%, -50%) rotate(0deg)   translateX(var(--orbit-r)) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
        }
        @keyframes ringExpand {
          0%   { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
        .smile-btn:active {
          transform: scale(0.95) !important;
        }
      `}</style>

      {/* Particles */}
      {particles.map((p) => (
        <FloatingParticle key={p.id} emoji={p.emoji} x={p.x} delay={p.delay} duration={p.duration} />
      ))}

      {/* Hidden analysis canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ display: 'none' }}
      />

      {/* Single persistent video element — hidden, used as source for both display and analysis */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Back Link */}
      <div style={{ padding: '18px 24px', position: 'relative', zIndex: 100 }}>
        <Link
          href="/games"
          style={{
            color: '#b388ff',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(179,136,255,0.08)',
            border: '1px solid rgba(179,136,255,0.15)',
            transition: 'all 0.2s',
          }}
        >
          ← Games
        </Link>
      </div>

      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '0 20px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>

        {/* ═══════════ PERMISSION SCREEN ═══════════ */}
        {phase === PHASE.PERMISSION && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.6s ease',
            marginTop: '60px',
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(179,136,255,0.15))',
              border: '2px solid rgba(233,30,140,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 30px',
              fontSize: '48px',
            }}>
              📸
            </div>

            <h1 style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '36px',
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px',
            }}>
              Smile Game
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '15px',
              lineHeight: 1.7,
              marginBottom: '12px',
              maxWidth: '340px',
            }}>
              This game uses your camera to detect your beautiful smile!
              The more you smile, the more hearts rain down and the higher your score.
            </p>

            <p style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '13px',
              marginBottom: '36px',
            }}>
              Your camera feed stays on your device — nothing is recorded or sent anywhere.
            </p>

            <button
              onClick={startCamera}
              style={{
                padding: '14px 40px',
                fontSize: '17px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '30px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(233,30,140,0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                marginBottom: '16px',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 6px 32px rgba(233,30,140,0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 24px rgba(233,30,140,0.35)';
              }}
            >
              📷 Allow Camera & Play
            </button>

            <div>
              <button
                onClick={() => setPhase(PHASE.FALLBACK)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '8px',
                }}
              >
                Play without camera instead
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ CALIBRATING ═══════════ */}
        {phase === PHASE.CALIBRATING && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.6s ease',
            marginTop: '40px',
          }}>
            {/* Video feed during calibration */}
            <div style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 30px',
              border: '3px solid rgba(233,30,140,0.4)',
              boxShadow: '0 0 30px rgba(233,30,140,0.2)',
              position: 'relative',
            }}>
              <canvas
                ref={displayCanvasRef}
                width={320}
                height={240}
                style={{
                  width: '280px',
                  height: '200px',
                  objectFit: 'cover',
                  marginLeft: '-40px',
                }}
              />
            </div>

            <h2 style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '28px',
              color: '#b388ff',
              marginBottom: '12px',
            }}>
              Calibrating...
            </h2>

            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '15px',
              marginBottom: '20px',
            }}>
              Keep a neutral face for {calibCountdown} second{calibCountdown !== 1 ? 's' : ''}...
            </p>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#e91e8c',
              animation: 'bounceIn 0.4s ease',
            }}>
              {calibCountdown}
            </div>
          </div>
        )}

        {/* ═══════════ PLAYING (CAMERA) ═══════════ */}
        {phase === PHASE.PLAYING && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease',
            width: '100%',
          }}>
            {/* Timer */}
            <div style={{
              fontSize: '14px',
              color: timeLeft <= 10 ? '#ff6b6b' : 'rgba(255,255,255,0.6)',
              marginBottom: '16px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}>
              ⏱ {formatTime(timeLeft)}
            </div>

            {/* Camera Circle with orbiting hearts */}
            <div style={{
              width: '240px',
              height: '240px',
              position: 'relative',
              margin: '0 auto 20px',
            }}>
              {/* Orbiting hearts/sparkles — only visible when smiling */}
              {smileIntensity > 20 && ['💕','✨','💖','🌸','💗','⭐','💝','✨'].map((emoji, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const radius = 120;
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: '50%', top: '50%',
                    fontSize: `${12 + (smileIntensity / 100) * 10}px`,
                    opacity: Math.min(1, smileIntensity / 60),
                    transform: `translate(-50%, -50%)`,
                    animation: `orbitHeart 3s linear ${i * 0.375}s infinite`,
                    '--orbit-r': `${radius}px`,
                    '--orbit-angle': `${angle}rad`,
                    pointerEvents: 'none',
                    filter: `drop-shadow(0 0 6px #e91e8c80)`,
                    transition: 'font-size 0.3s, opacity 0.3s',
                    zIndex: 10,
                  }}>
                    {emoji}
                  </div>
                );
              })}

              {/* Expanding rings when smiling hard */}
              {smileIntensity > 60 && [0,1,2].map(i => (
                <div key={`ring-${i}`} style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: '200px', height: '200px',
                  borderRadius: '50%',
                  border: '2px solid rgba(233,30,140,0.3)',
                  transform: 'translate(-50%, -50%)',
                  animation: `ringExpand 2s ease ${i * 0.6}s infinite`,
                  pointerEvents: 'none',
                }} />
              ))}

              {/* Camera frame */}
              <div style={{
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'absolute',
                left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                border: `3px solid ${smileIntensity > 50 ? '#ffd700' : '#e91e8c'}`,
                animation: smileIntensity > 50 ? 'pulseGlowIntense 1s infinite' : 'pulseGlow 2s infinite',
                transition: 'border-color 0.3s',
                zIndex: 5,
              }}>
                <canvas
                  ref={displayCanvasRef}
                  width={320}
                  height={240}
                  style={{
                    width: '280px',
                    height: '200px',
                    objectFit: 'cover',
                    marginLeft: '-40px',
                  }}
                />
              </div>
            </div>

            {/* Smile Meter */}
            <div style={{
              width: '220px',
              height: '14px',
              borderRadius: '7px',
              background: 'rgba(255,255,255,0.08)',
              margin: '0 auto 12px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                height: '100%',
                width: `${smileIntensity}%`,
                borderRadius: '7px',
                background: 'linear-gradient(90deg, #e91e8c, #ff6ec7, #ffd700)',
                transition: 'width 0.15s ease',
                boxShadow: smileIntensity > 60 ? '0 0 12px rgba(233,30,140,0.6)' : 'none',
              }} />
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '20px',
            }}>
              Smile Meter
            </div>

            {/* Streak Indicator */}
            {streakTime >= STREAK_TIME && (
              <div style={{
                animation: 'streak 0.6s infinite, bounceIn 0.3s ease',
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffd700',
                marginBottom: '12px',
                textShadow: '0 0 20px rgba(255,215,0,0.5)',
              }}>
                🔥 Smile Streak! x{multiplier}
              </div>
            )}

            {/* Message */}
            {message && (
              <div style={{
                fontSize: '16px',
                color: '#ff6ec7',
                marginBottom: '16px',
                fontWeight: 600,
                animation: 'bounceIn 0.3s ease',
                minHeight: '24px',
              }}>
                {message}
              </div>
            )}

            {/* Score */}
            <div style={{
              fontSize: '42px',
              fontWeight: 700,
              fontFamily: "'Dancing Script', cursive",
              background: 'linear-gradient(135deg, #e91e8c, #ffd700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
            }}>
              {score.toLocaleString()}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              Score
            </div>
          </div>
        )}

        {/* ═══════════ FALLBACK MENU ═══════════ */}
        {phase === PHASE.FALLBACK && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.6s ease',
            marginTop: '60px',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
            }}>
              😊
            </div>
            <h1 style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '32px',
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px',
            }}>
              Tap to Smile!
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              marginBottom: '32px',
              maxWidth: '320px',
              lineHeight: 1.6,
            }}>
              No camera? No problem!<br />
              Press and hold the smile button to score points. The longer you hold, the bigger the streak!
            </p>
            <button
              onClick={() => setPhase(PHASE.FALLBACK_PLAYING)}
              style={{
                padding: '14px 40px',
                fontSize: '17px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '30px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(233,30,140,0.35)',
              }}
            >
              Start Game
            </button>
          </div>
        )}

        {/* ═══════════ FALLBACK PLAYING ═══════════ */}
        {phase === PHASE.FALLBACK_PLAYING && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease',
            width: '100%',
            marginTop: '20px',
          }}>
            {/* Timer */}
            <div style={{
              fontSize: '14px',
              color: timeLeft <= 10 ? '#ff6b6b' : 'rgba(255,255,255,0.6)',
              marginBottom: '24px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}>
              ⏱ {formatTime(timeLeft)}
            </div>

            {/* Smile Button */}
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: holdingSmile
                ? 'linear-gradient(135deg, #e91e8c, #ff6ec7, #ffd700)'
                : 'linear-gradient(135deg, rgba(233,30,140,0.2), rgba(179,136,255,0.2))',
              border: `3px solid ${holdingSmile ? '#ffd700' : '#e91e8c'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              fontSize: '64px',
              transition: 'all 0.2s',
              animation: holdingSmile ? 'pulseGlowIntense 0.8s infinite' : 'pulseGlow 2s infinite',
              touchAction: 'none',
            }}
              className="smile-btn"
              onMouseDown={() => setHoldingSmile(true)}
              onMouseUp={() => setHoldingSmile(false)}
              onMouseLeave={() => setHoldingSmile(false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldingSmile(true); }}
              onTouchEnd={(e) => { e.preventDefault(); setHoldingSmile(false); }}
            >
              {holdingSmile ? '😄' : '😊'}
            </div>

            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '16px',
            }}>
              {holdingSmile ? 'Keep holding!' : 'Press & hold to smile!'}
            </div>

            {/* Smile Meter */}
            <div style={{
              width: '220px',
              height: '14px',
              borderRadius: '7px',
              background: 'rgba(255,255,255,0.08)',
              margin: '0 auto 12px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                height: '100%',
                width: `${smileIntensity}%`,
                borderRadius: '7px',
                background: 'linear-gradient(90deg, #e91e8c, #ff6ec7, #ffd700)',
                transition: 'width 0.15s ease',
                boxShadow: smileIntensity > 60 ? '0 0 12px rgba(233,30,140,0.6)' : 'none',
              }} />
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '20px',
            }}>
              Smile Meter
            </div>

            {/* Streak */}
            {streakTime >= STREAK_TIME && (
              <div style={{
                animation: 'streak 0.6s infinite, bounceIn 0.3s ease',
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffd700',
                marginBottom: '12px',
                textShadow: '0 0 20px rgba(255,215,0,0.5)',
              }}>
                🔥 Smile Streak! x{multiplier}
              </div>
            )}

            {/* Message */}
            {message && (
              <div style={{
                fontSize: '16px',
                color: '#ff6ec7',
                marginBottom: '16px',
                fontWeight: 600,
                animation: 'bounceIn 0.3s ease',
                minHeight: '24px',
              }}>
                {message}
              </div>
            )}

            {/* Score */}
            <div style={{
              fontSize: '42px',
              fontWeight: 700,
              fontFamily: "'Dancing Script', cursive",
              background: 'linear-gradient(135deg, #e91e8c, #ffd700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
            }}>
              {score.toLocaleString()}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              Score
            </div>
          </div>
        )}

        {/* ═══════════ END SCREEN ═══════════ */}
        {(phase === PHASE.ENDED || phase === PHASE.FALLBACK_ENDED) && (() => {
          const rating = getRating();
          return (
            <div style={{
              textAlign: 'center',
              animation: 'fadeInUp 0.6s ease',
              marginTop: '40px',
            }}>
              {/* Confetti overlay */}
              {confettiBurst && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    fontSize: '80px',
                    animation: 'confettiBurst 2s ease forwards',
                  }}>
                    🎉
                  </div>
                </div>
              )}

              <div style={{
                fontSize: '60px',
                marginBottom: '16px',
                animation: 'bounceIn 0.5s ease',
              }}>
                {rating.tier === 'gold' ? '🌟' : rating.tier === 'silver' ? '💕' : '🤗'}
              </div>

              <h2 style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: '32px',
                background: rating.tier === 'gold'
                  ? 'linear-gradient(135deg, #ffd700, #ff6ec7)'
                  : 'linear-gradient(135deg, #e91e8c, #b388ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '24px',
              }}>
                Game Over!
              </h2>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px',
                maxWidth: '300px',
                width: '100%',
              }}>
                <div style={{
                  background: 'rgba(233,30,140,0.08)',
                  borderRadius: '16px',
                  padding: '20px 16px',
                  border: '1px solid rgba(233,30,140,0.15)',
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#e91e8c',
                    fontFamily: "'Dancing Script', cursive",
                  }}>
                    {score.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginTop: '4px',
                  }}>
                    Score
                  </div>
                </div>
                <div style={{
                  background: 'rgba(179,136,255,0.08)',
                  borderRadius: '16px',
                  padding: '20px 16px',
                  border: '1px solid rgba(179,136,255,0.15)',
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#b388ff',
                    fontFamily: "'Dancing Script', cursive",
                  }}>
                    {smileSeconds}s
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginTop: '4px',
                  }}>
                    Smiled
                  </div>
                </div>
              </div>

              {/* Rating Message */}
              <div style={{
                fontSize: '18px',
                fontWeight: 600,
                color: rating.tier === 'gold' ? '#ffd700' : rating.tier === 'silver' ? '#ff6ec7' : '#b388ff',
                marginBottom: '32px',
                padding: '14px 24px',
                borderRadius: '16px',
                background: rating.tier === 'gold'
                  ? 'rgba(255,215,0,0.08)'
                  : rating.tier === 'silver'
                    ? 'rgba(233,30,140,0.08)'
                    : 'rgba(179,136,255,0.08)',
                border: `1px solid ${
                  rating.tier === 'gold'
                    ? 'rgba(255,215,0,0.2)'
                    : rating.tier === 'silver'
                      ? 'rgba(233,30,140,0.2)'
                      : 'rgba(179,136,255,0.2)'
                }`,
                animation: 'bounceIn 0.6s ease 0.3s both',
              }}>
                {rating.text}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={restart}
                  style={{
                    padding: '12px 32px',
                    fontSize: '15px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '25px',
                    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                    color: '#fff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(233,30,140,0.3)',
                  }}
                >
                  Play Again
                </button>
                <Link
                  href="/games"
                  style={{
                    padding: '12px 32px',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRadius: '25px',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.7)',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  All Games
                </Link>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
