'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════════
// TROLL CONTROL — Audio Calibration System v2.4
// The worst possible UX, but it works.
// ═══════════════════════════════════════════════════════════════════

// Helper: random in range
const rand = (min, max) => Math.random() * (max - min) + min;

// ═══════════════════════════════════════════════════════════════════
// AUDIO ENGINE — generates a chiptune-ish ambient loop with oscillators
// ═══════════════════════════════════════════════════════════════════
function createAudioEngine() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(ctx.destination);

  // Ambient pad (sine + triangle, slow)
  const padGain = ctx.createGain();
  padGain.gain.value = 0.18;
  padGain.connect(masterGain);

  const pad1 = ctx.createOscillator();
  pad1.type = 'sine';
  pad1.frequency.value = 220; // A3
  const pad2 = ctx.createOscillator();
  pad2.type = 'triangle';
  pad2.frequency.value = 277.18; // C#4
  const pad3 = ctx.createOscillator();
  pad3.type = 'sine';
  pad3.frequency.value = 329.63; // E4
  pad1.connect(padGain);
  pad2.connect(padGain);
  pad3.connect(padGain);

  // Slow LFO on pad gain for breathing effect
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.18;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.08;
  lfo.connect(lfoGain);
  lfoGain.connect(padGain.gain);

  pad1.start();
  pad2.start();
  pad3.start();
  lfo.start();

  // Melody loop — 80 BPM (750ms per beat)
  // C, E, G, B, A, G, E, D pattern (chiptune-y)
  const notes = [261.63, 329.63, 392.0, 493.88, 440.0, 392.0, 329.63, 293.66];
  const melodyGain = ctx.createGain();
  melodyGain.gain.value = 0.0;
  melodyGain.connect(masterGain);

  let melodyStep = 0;
  let melodyTimer = null;

  const playMelodyStep = () => {
    const now = ctx.currentTime;
    const freq = notes[melodyStep % notes.length];
    const noteOsc = ctx.createOscillator();
    noteOsc.type = 'triangle';
    noteOsc.frequency.value = freq;
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0, now);
    noteGain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    noteOsc.connect(noteGain);
    noteGain.connect(masterGain);
    noteOsc.start(now);
    noteOsc.stop(now + 0.6);
    melodyStep++;
  };

  const startMelody = () => {
    if (melodyTimer) return;
    // 80 BPM = 750ms per beat
    melodyTimer = setInterval(playMelodyStep, 750);
  };

  return {
    ctx,
    masterGain,
    setVolume(v) {
      // v is 0-1
      const target = Math.max(0, Math.min(1, v));
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.linearRampToValueAtTime(target, now + 0.08);
    },
    async resume() {
      if (ctx.state === 'suspended') await ctx.resume();
      startMelody();
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function TrollControlPage() {
  const [started, setStarted] = useState(false);
  const [volume, setVolumeState] = useState(50); // 0-100, the "displayed" volume
  const [pendingVolume, setPendingVolume] = useState(null); // shown during delay
  const [toasts, setToasts] = useState([]);
  const [glitch, setGlitch] = useState(false);
  const audioRef = useRef(null);
  const volumeRef = useRef(50);

  // Sound inversion: at >50%, audio is quieter
  const computeActualGain = useCallback((vol) => {
    if (vol > 50) return (1 - vol / 100);
    return vol / 100 + 0.5;
  }, []);

  // Apply volume after random 2-5s delay (the "set volume" function described)
  const setVolume = useCallback((newVol) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setPendingVolume(clamped);
    const delay = rand(2000, 5000);
    setTimeout(() => {
      setVolumeState(clamped);
      volumeRef.current = clamped;
      setPendingVolume(null);
      if (audioRef.current) {
        audioRef.current.setVolume(computeActualGain(clamped));
      }
    }, delay);
  }, [computeActualGain]);

  // Toast helper
  const pushToast = useCallback((msg) => {
    const id = Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, 3000);
  }, []);

  // Start the audio engine
  const handleStart = async () => {
    if (!audioRef.current) {
      audioRef.current = createAudioEngine();
    }
    await audioRef.current.resume();
    audioRef.current.setVolume(computeActualGain(50));
    setStarted(true);
  };

  // Random drift ±2% every 4s
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const drift = rand(-2, 2);
      const newVol = Math.max(0, Math.min(100, volumeRef.current + drift));
      volumeRef.current = newVol;
      setVolumeState(newVol);
      if (audioRef.current) audioRef.current.setVolume(computeActualGain(newVol));
    }, 4000);
    return () => clearInterval(id);
  }, [started, computeActualGain]);

  // Fake feedback toasts every 6-10s
  useEffect(() => {
    if (!started) return;
    const messages = [
      'Calibrating sound...',
      'Audio instability detected',
      'Volume overridden by system',
      'Recalibrating drivers',
      'Reticulating splines',
      'Phase alignment in progress',
      'Buffer underrun corrected',
    ];
    let timeout;
    const tick = () => {
      pushToast(messages[Math.floor(Math.random() * messages.length)]);
      timeout = setTimeout(tick, rand(6000, 10000));
    };
    timeout = setTimeout(tick, rand(6000, 10000));
    return () => clearTimeout(timeout);
  }, [started, pushToast]);

  // Glitch mode every 15-30s
  useEffect(() => {
    if (!started) return;
    let timeout;
    const tick = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
      timeout = setTimeout(tick, rand(15000, 30000));
    };
    timeout = setTimeout(tick, rand(15000, 30000));
    return () => clearTimeout(timeout);
  }, [started]);

  // Keyboard trap — arrow keys spike to random
  useEffect(() => {
    if (!started) return;
    const handler = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const newVol = rand(0, 100);
        setVolume(newVol);
        pushToast('keyboard input received');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, setVolume, pushToast]);

  // Display volume (use pending if waiting)
  const displayVolume = pendingVolume !== null ? pendingVolume : volume;
  const volumeDisplay = displayVolume.toFixed(1);

  // ═══════════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════════
  const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #07071a 0%, #0d0d2b 50%, #07071a 100%)',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    padding: '24px 16px 80px',
    transition: 'transform 0.05s linear, filter 0.05s linear',
    transform: glitch ? `translate(${rand(-5, 5)}px, ${rand(-5, 5)}px)` : 'none',
    filter: glitch ? 'hue-rotate(180deg) saturate(1.5)' : 'none',
  };

  const containerStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 4px 24px rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'all 0.3s ease',
  };

  // ═══════════════════════════════════════════════════════════════════
  // OVERLAY (autoplay gate)
  // ═══════════════════════════════════════════════════════════════════
  if (!started) {
    return (
      <div style={pageStyle}>
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,7,26,0.96)', backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 9999,
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Audio Calibration System v2.4
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 700, margin: '0 0 16px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Troll Control
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', maxWidth: '420px', lineHeight: 1.6, marginBottom: '32px' }}>
            Initialize the calibration engine to begin tuning your audio output.
          </p>
          <button
            onClick={handleStart}
            style={{
              padding: '14px 36px',
              fontSize: '15px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 24px rgba(233,30,140,0.3)',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Click to start
          </button>
          <Link href="/" style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none',
            fontSize: '14px',
          }}>← Back</Link>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div className="tc-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <Link href="/" style={{
              display: 'inline-block',
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: '13px',
              marginBottom: '12px',
            }}>← Back</Link>
            <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 4px',
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em' }}>
              Troll Control
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: '0.02em' }}>
              Audio Calibration System v2.4
            </p>
          </div>
          <div className="tc-master" style={{
            ...cardStyle,
            padding: '14px 20px',
            minWidth: '0',
            flex: '1 1 240px',
            maxWidth: '100%',
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              Master Volume
            </div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#fff', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
              {volumeDisplay}%
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: pendingVolume !== null ? '#f59e0b' : '#10b981',
                animation: 'tcPulse 1.5s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                {pendingVolume !== null ? 'pending' : 'live'}
              </span>
            </div>
          </div>
        </div>

        {/* Grid of controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          <CircularBite cardStyle={cardStyle} setVolume={setVolume} />
          <InvisibleSlider cardStyle={cardStyle} setVolume={setVolume} />
          <RotatedSlider cardStyle={cardStyle} setVolume={setVolume} />
          <ReverseVerticalSlider cardStyle={cardStyle} setVolume={setVolume} />
          <MuteTrap cardStyle={cardStyle} setVolume={setVolume} />
          <PiInput cardStyle={cardStyle} setVolume={setVolume} />
          <ParticleVolume cardStyle={cardStyle} setVolume={setVolume} currentVol={volume} />
          <VolumeGrid cardStyle={cardStyle} setVolume={setVolume} />
          <MouseLies cardStyle={cardStyle} setVolume={setVolume} />
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: '48px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
          Precision tuning at scale. © Calibration Systems Ltd.
        </div>
      </div>

      {/* Toasts */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000,
        maxWidth: 'calc(100vw - 48px)',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'tcToast 0.3s ease-out',
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes tcPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes tcToast {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 600px) {
          .tc-header { flex-direction: column; align-items: stretch !important; }
          .tc-master { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. CIRCULAR BITE — overlap area % drives volume
// ═══════════════════════════════════════════════════════════════════
function CircularBite({ cardStyle, setVolume }) {
  const [pos, setPos] = useState({ x: 80, y: 60 });
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const R = 50;
  const fixedX = 100, fixedY = 80;

  const overlap = useCallback((cx, cy) => {
    const d = Math.hypot(cx - fixedX, cy - fixedY);
    if (d >= 2 * R) return 0;
    if (d <= 0) return 100;
    const part = 2 * R * R * Math.acos(d / (2 * R)) - 0.5 * d * Math.sqrt(Math.max(0, 4 * R * R - d * d));
    const total = Math.PI * R * R;
    return Math.min(100, (part / total) * 100);
  }, []);

  const overlapPct = overlap(pos.x, pos.y);
  const display = (overlapPct + 0.177).toFixed(3);

  const onMove = (clientX, clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setPos({ x, y });
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const t = e.touches ? e.touches[0] : e;
      onMove(t.clientX, t.clientY);
    };
    const up = () => {
      setDragging(false);
      setVolume(overlap(pos.x, pos.y));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, pos, overlap, setVolume]);

  return (
    <div style={cardStyle}>
      <ControlTitle num={1} title="Circular Bite Control" />
      <ControlHint>Drag the right circle. Volume = overlap area.</ControlHint>
      <div
        ref={containerRef}
        style={{
          position: 'relative', height: '180px',
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
          marginTop: '12px', overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <div style={{
          position: 'absolute', left: fixedX - R, top: fixedY - R,
          width: R * 2, height: R * 2, borderRadius: '50%',
          background: 'rgba(99,102,241,0.5)', border: '2px solid #6366f1',
        }} />
        <div
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}
          style={{
            position: 'absolute', left: pos.x - R, top: pos.y - R,
            width: R * 2, height: R * 2, borderRadius: '50%',
            background: 'rgba(236,72,153,0.5)', border: '2px solid #ec4899',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        />
      </div>
      <div style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontFamily: 'ui-monospace, monospace' }}>
        Volume: {display}%
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. INVISIBLE SLIDER — blurred
// ═══════════════════════════════════════════════════════════════════
function InvisibleSlider({ cardStyle, setVolume }) {
  const [val, setVal] = useState(40);
  return (
    <div style={cardStyle}>
      <ControlTitle num={2} title="Precision Slider" />
      <ControlHint>Fine-grained analog control.</ControlHint>
      <div style={{
        marginTop: '20px', padding: '20px 0',
        filter: 'blur(8px)',
        cursor: 'pointer',
      }}>
        <input
          type="range" min={0} max={100} value={val}
          onChange={e => setVal(Number(e.target.value))}
          onMouseUp={() => setVolume(val)}
          onTouchEnd={() => setVolume(val)}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
        Position: {val}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. ROTATED SLIDER
// ═══════════════════════════════════════════════════════════════════
function RotatedSlider({ cardStyle, setVolume }) {
  const [angle] = useState(() => Math.floor(rand(15, 45)) * (Math.random() > 0.5 ? 1 : -1));
  const [val, setVal] = useState(50);
  return (
    <div style={cardStyle}>
      <ControlTitle num={3} title="Rotational Tuner" />
      <ControlHint>Standard horizontal slider.</ControlHint>
      <div style={{
        marginTop: '40px', display: 'flex', justifyContent: 'center',
        height: '80px', alignItems: 'center',
      }}>
        <input
          type="range" min={0} max={100} value={val}
          onChange={e => setVal(Number(e.target.value))}
          onMouseUp={() => setVolume(val)}
          onTouchEnd={() => setVolume(val)}
          style={{
            width: '80%',
            transform: `rotate(${angle}deg)`,
            cursor: 'pointer',
          }}
        />
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
        Angular offset: {angle}°
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. REVERSE VERTICAL SLIDER (up = lower volume)
// ═══════════════════════════════════════════════════════════════════
function ReverseVerticalSlider({ cardStyle, setVolume }) {
  const [val, setVal] = useState(50); // 0 (top) - 100 (bottom)
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const updateFromY = (clientY) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const pct = Math.max(0, Math.min(100, (y / rect.height) * 100));
    setVal(pct);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const t = e.touches ? e.touches[0] : e;
      updateFromY(t.clientY);
    };
    const up = () => {
      setDragging(false);
      setVolume(val); // dragging DOWN increases volume — val = drag distance from top
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, val, setVolume]);

  return (
    <div style={cardStyle}>
      <ControlTitle num={4} title="Vertical Fader" />
      <ControlHint>Drag the handle to set the level.</ControlHint>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <div
          ref={trackRef}
          style={{
            position: 'relative', width: '24px', height: '160px',
            background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
            touchAction: 'none', cursor: 'pointer',
          }}
          onMouseDown={(e) => { setDragging(true); updateFromY(e.clientY); }}
          onTouchStart={(e) => { setDragging(true); updateFromY(e.touches[0].clientY); }}
        >
          <div style={{
            position: 'absolute',
            left: '-8px',
            top: `calc(${val}% - 8px)`,
            width: '40px', height: '16px',
            borderRadius: '4px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            cursor: 'grab',
          }} />
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '12px', textAlign: 'center' }}>
        Position: {Math.round(val)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. MUTE TRAP
// ═══════════════════════════════════════════════════════════════════
function MuteTrap({ cardStyle, setVolume }) {
  return (
    <div style={cardStyle}>
      <ControlTitle num={5} title="Emergency Mute" />
      <ControlHint>For sensitive environments.</ControlHint>
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <button
          onMouseEnter={() => setVolume(100)}
          onTouchStart={() => setVolume(100)}
          onClick={() => setVolume(95)}
          style={{
            padding: '16px 40px',
            minHeight: '48px',
            minWidth: '120px',
            fontSize: '15px',
            fontWeight: 600,
            background: 'rgba(220,38,38,0.1)',
            color: '#ef4444',
            border: '2px solid rgba(239,68,68,0.5)',
            borderRadius: '12px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          MUTE
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 6. PI INPUT
// ═══════════════════════════════════════════════════════════════════
function PiInput({ cardStyle, setVolume }) {
  const [val, setVal] = useState('');
  const submit = () => {
    const n = parseFloat(val);
    if (Number.isFinite(n)) {
      const v = (n * 7919) % 100;
      setVolume(Math.abs(v));
    }
  };
  return (
    <div style={cardStyle}>
      <ControlTitle num={6} title="Numerical Input" />
      <ControlHint>Enter value of π (3.14159...) to set volume.</ControlHint>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <input
          type="text" value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="3.14159..."
          style={{
            flex: 1, padding: '10px 14px',
            border: '1px solid #ddd', borderRadius: '8px',
            fontSize: '14px', fontFamily: 'ui-monospace, monospace',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)', color: '#fff',
          }}
        />
        <button
          onClick={submit}
          style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #e91e8c, #b388ff)', color: '#fff', border: 'none',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontSize: '14px', fontWeight: 500,
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 7. PARTICLE VOLUME
// ═══════════════════════════════════════════════════════════════════
function ParticleVolume({ cardStyle, setVolume, currentVol }) {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const particlesRef = useRef([]);
  const [, force] = useState(0);
  const [caught, setCaught] = useState(0);
  const volRef = useRef(currentVol);

  useEffect(() => { volRef.current = currentVol; }, [currentVol]);

  // Init particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: 10 }, () => ({
      x: rand(20, 280), y: rand(20, 140),
      vx: 0, vy: 0,
      alive: true,
      respawnAt: 0,
    }));
  }, []);

  useEffect(() => {
    let raf;
    const tick = () => {
      const now = Date.now();
      const ps = particlesRef.current;
      for (const p of ps) {
        if (!p.alive) {
          if (now >= p.respawnAt) {
            p.alive = true;
            p.x = rand(20, 280);
            p.y = rand(20, 140);
            p.vx = 0; p.vy = 0;
          }
          continue;
        }
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const d = Math.hypot(dx, dy);
        if (d < 80 && d > 0.1) {
          // repulsion
          const f = (80 - d) / 80;
          p.vx += (dx / d) * f * 1.5;
          p.vy += (dy / d) * f * 1.5;
        }
        // friction
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;
        // bounds bounce
        if (p.x < 6) { p.x = 6; p.vx *= -0.5; }
        if (p.x > 294) { p.x = 294; p.vx *= -0.5; }
        if (p.y < 6) { p.y = 6; p.vy *= -0.5; }
        if (p.y > 154) { p.y = 154; p.vy *= -0.5; }
      }
      force(n => (n + 1) % 1000000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    mouseRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const onLeave = () => { mouseRef.current = { x: -999, y: -999 }; };

  const onParticleClick = (idx) => {
    const p = particlesRef.current[idx];
    if (!p.alive) return;
    p.alive = false;
    p.respawnAt = Date.now() + 6000;
    setCaught(c => c + 1);
    setVolume(volRef.current + 3);
  };

  return (
    <div style={cardStyle}>
      <ControlTitle num={7} title="Particle Capture" />
      <ControlHint>Catch the particles. Each one adds 3% volume.</ControlHint>
      <div
        ref={containerRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onTouchMove={onMove}
        onTouchEnd={onLeave}
        style={{
          position: 'relative', height: '160px', marginTop: '12px',
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
          touchAction: 'none', overflow: 'hidden', cursor: 'crosshair',
        }}
      >
        {particlesRef.current.map((p, i) => p.alive && (
          <div
            key={i}
            onClick={() => onParticleClick(i)}
            onTouchStart={() => onParticleClick(i)}
            style={{
              position: 'absolute',
              left: p.x - 6, top: p.y - 6,
              width: 12, height: 12, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
        Captured: {caught}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 8. ADVANCED VOLUME GRID (100 radio buttons)
// ═══════════════════════════════════════════════════════════════════
function VolumeGrid({ cardStyle, setVolume }) {
  const [disabledSet] = useState(() => {
    const set = new Set();
    while (set.size < 30) set.add(Math.floor(Math.random() * 100) + 1);
    return set;
  });
  const [selected, setSelected] = useState(null);

  const handleSelect = (n) => {
    if (disabledSet.has(n)) return;
    setSelected(n);
    setVolume((n + 17) % 100);
  };

  return (
    <div style={{ ...cardStyle, gridColumn: 'span 1' }}>
      <ControlTitle num={8} title="Advanced Volume Grid" />
      <ControlHint>Select target volume from grid.</ControlHint>
      <div style={{
        marginTop: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: '4px',
      }}>
        {Array.from({ length: 100 }, (_, i) => i + 1).map(n => {
          const dis = disabledSet.has(n);
          const sel = selected === n;
          return (
            <button
              key={n}
              onClick={() => handleSelect(n)}
              disabled={dis}
              style={{
                aspectRatio: '1',
                minHeight: '28px',
                border: sel ? '2px solid #fff' : '1px solid rgba(255,255,255,0.12)',
                background: dis ? 'rgba(255,255,255,0.03)' : sel ? '#fff' : 'rgba(255,255,255,0.06)',
                color: dis ? 'rgba(255,255,255,0.2)' : sel ? '#111' : 'rgba(255,255,255,0.7)',
                fontSize: '10px',
                cursor: dis ? 'not-allowed' : 'pointer',
                borderRadius: '4px',
                padding: 0,
                fontFamily: 'ui-monospace, monospace',
                transition: 'all 0.15s ease',
                touchAction: 'manipulation',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 9. MOUSE LIES — click registers offset
// ═══════════════════════════════════════════════════════════════════
function MouseLies({ cardStyle, setVolume }) {
  const containerRef = useRef(null);
  const [target, setTarget] = useState(() => ({ x: rand(40, 260), y: rand(40, 120) }));
  const [hits, setHits] = useState(0);

  const handleHit = (clientX, clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Apply 12px offset — actual click position is ~12px off from cursor
    const x = clientX - rect.left + 12;
    const y = clientY - rect.top - 12;
    const dx = x - target.x;
    const dy = y - target.y;
    if (Math.hypot(dx, dy) < 20) {
      setHits(h => h + 1);
      setVolume(rand(0, 100));
      setTarget({ x: rand(40, 260), y: rand(40, 120) });
    }
  };

  const onClick = (e) => handleHit(e.clientX, e.clientY);
  const onTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      handleHit(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  return (
    <div style={cardStyle}>
      <ControlTitle num={9} title="Precision Click Area" />
      <ControlHint>Click the target to randomize calibration.</ControlHint>
      <div
        ref={containerRef}
        onClick={onClick}
        onTouchStart={onTouchStart}
        style={{
          position: 'relative', height: '160px', marginTop: '12px',
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
          cursor: 'crosshair', overflow: 'hidden',
          touchAction: 'manipulation',
        }}
      >
        <div style={{
          position: 'absolute',
          left: target.x - 16, top: target.y - 16,
          width: 32, height: 32, borderRadius: '50%',
          background: '#dc2626',
          border: '3px solid #fff',
          boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
        Hits: {hits}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED — title and hint helpers
// ═══════════════════════════════════════════════════════════════════
function ControlTitle({ num, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
      <span style={{
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
        color: 'rgba(255,255,255,0.25)', fontWeight: 600,
      }}>
        {String(num).padStart(2, '0')}
      </span>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
        {title}
      </h3>
    </div>
  );
}

function ControlHint({ children }) {
  return (
    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
      {children}
    </p>
  );
}
