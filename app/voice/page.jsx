'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';

const EFFECTS = [
  { id: 'normal', emoji: '🎤', name: 'Normal', desc: 'Original voice', color: '#e91e8c' },
  { id: 'helium', emoji: '🎈', name: 'Helium', desc: 'High & squeaky', color: '#ff6bb5' },
  { id: 'deep', emoji: '🔊', name: 'Deep', desc: 'Low & booming', color: '#7c4dff' },
  { id: 'chipmunk', emoji: '🐿️', name: 'Chipmunk', desc: 'Super fast & tiny', color: '#ff9100' },
  { id: 'slowmo', emoji: '🐌', name: 'Slow Mo', desc: 'Dramatic slow motion', color: '#00e5ff' },
  { id: 'robot', emoji: '🤖', name: 'Robot', desc: 'Mechanical distortion', color: '#76ff03' },
  { id: 'echo', emoji: '🏔️', name: 'Echo', desc: 'Mountain echo', color: '#448aff' },
  { id: 'underwater', emoji: '🌊', name: 'Underwater', desc: 'Deep sea muffled', color: '#18ffff' },
  { id: 'radio', emoji: '📻', name: 'Radio', desc: 'Old-timey broadcast', color: '#ffd740' },
  { id: 'alien', emoji: '👽', name: 'Alien', desc: 'Ring modulation', color: '#b388ff' },
];

function makeDistortionCurve(amount) {
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function makeLightDistortionCurve() {
  const n = 44100;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * 2);
  }
  return curve;
}

export default function VoiceFunPage() {
  const [micPermission, setMicPermission] = useState('prompt'); // prompt, granted, denied
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeEffect, setActiveEffect] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [particles, setParticles] = useState([]);

  const audioContextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioBufferRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const playbackStartRef = useRef(0);
  const playbackDurationRef = useRef(0);
  const progressFrameRef = useRef(null);
  const extraNodesRef = useRef([]);

  // Generate particles on mount
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 30; i++) {
      pts.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.05,
      });
    }
    setParticles(pts);
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission('granted');
    } catch {
      setMicPermission('denied');
    }
  }, []);

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 48;
      const barW = w / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * bufLen);
        const val = data[idx] / 255;
        const barH = val * h * 0.9;
        const x = i * (barW + 2);
        const gradient = ctx.createLinearGradient(x, h, x, h - barH);
        gradient.addColorStop(0, '#e91e8c');
        gradient.addColorStop(1, '#b388ff');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, h - barH, barW, barH, 2);
        ctx.fill();
      }
    };
    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const ctx = getAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');

      // Analyser for waveform
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const arrayBuf = await blob.arrayBuffer();
        try {
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          audioBufferRef.current = audioBuf;
          setHasRecording(true);
        } catch (err) {
          console.error('Decode error:', err);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      setHasRecording(false);
      audioBufferRef.current = null;

      drawWaveform();

      // Timer
      const startT = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startT) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= 30) {
          stopRecording();
        }
      }, 100);
    } catch {
      setMicPermission('denied');
    }
  }, [getAudioContext, drawWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    analyserRef.current = null;
    setIsRecording(false);
  }, []);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    extraNodesRef.current.forEach((n) => {
      try {
        if (n.stop) n.stop();
        if (n.disconnect) n.disconnect();
      } catch {}
    });
    extraNodesRef.current = [];
    if (progressFrameRef.current) {
      cancelAnimationFrame(progressFrameRef.current);
      progressFrameRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
    setActiveEffect(null);
  }, []);

  const playWithEffect = useCallback(
    (effectId) => {
      if (!audioBufferRef.current) return;
      stopPlayback();

      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      sourceNodeRef.current = source;

      const masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      gainNodeRef.current = masterGain;

      const extras = [];
      let lastNode = source;

      switch (effectId) {
        case 'normal':
          break;

        case 'helium':
          source.playbackRate.value = 1.8;
          break;

        case 'deep':
          source.playbackRate.value = 0.6;
          break;

        case 'chipmunk':
          source.playbackRate.value = 2.2;
          break;

        case 'slowmo':
          source.playbackRate.value = 0.4;
          break;

        case 'robot': {
          const ws = ctx.createWaveShaper();
          ws.curve = makeDistortionCurve(400);
          ws.oversample = '4x';
          lastNode.connect(ws);
          lastNode = ws;
          extras.push(ws);
          break;
        }

        case 'echo': {
          // Source -> direct to merger gain
          // Source -> delay -> feedback gain -> delay (loop) + merger gain
          const merger = ctx.createGain();
          merger.gain.value = 1.0;

          const delay = ctx.createDelay(1.0);
          delay.delayTime.value = 0.3;

          const feedback = ctx.createGain();
          feedback.gain.value = 0.5;

          // Direct path
          lastNode.connect(merger);

          // Echo path
          lastNode.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay); // feedback loop
          delay.connect(merger);

          lastNode = merger;
          extras.push(delay, feedback, merger);
          break;
        }

        case 'underwater': {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 500;
          lp.Q.value = 1;
          lastNode.connect(lp);
          lastNode = lp;
          extras.push(lp);
          break;
        }

        case 'radio': {
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1200;
          bp.Q.value = 2;

          const dist = ctx.createWaveShaper();
          dist.curve = makeLightDistortionCurve();
          dist.oversample = '2x';

          lastNode.connect(bp);
          bp.connect(dist);
          lastNode = dist;
          extras.push(bp, dist);
          break;
        }

        case 'alien': {
          // Ring modulation: multiply signal by oscillator
          // source -> inputGain
          // oscillator -> oscGain -> inputGain.gain (modulate)
          // Actually Web Audio ring mod: source -> gain node, oscillator -> gain node's gain param
          const modGain = ctx.createGain();
          modGain.gain.value = 0; // will be modulated by oscillator

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 30;

          const oscGain = ctx.createGain();
          oscGain.gain.value = 1.0;

          osc.connect(oscGain);
          oscGain.connect(modGain.gain); // modulate the gain

          lastNode.connect(modGain);
          osc.start();
          lastNode = modGain;
          extras.push(osc, oscGain, modGain);
          break;
        }

        default:
          break;
      }

      lastNode.connect(masterGain);
      masterGain.connect(ctx.destination);
      extras.push(masterGain);
      extraNodesRef.current = extras;

      // Calculate actual duration based on playback rate
      const rate = source.playbackRate.value;
      const actualDuration = source.buffer.duration / rate;
      playbackDurationRef.current = actualDuration;
      playbackStartRef.current = ctx.currentTime;

      setActiveEffect(effectId);
      setIsPlaying(true);
      setPlaybackProgress(0);

      source.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(1);
        setActiveEffect(null);
        if (progressFrameRef.current) {
          cancelAnimationFrame(progressFrameRef.current);
          progressFrameRef.current = null;
        }
        // Clean up extras
        extras.forEach((n) => {
          try {
            if (n.stop) n.stop();
            if (n.disconnect) n.disconnect();
          } catch {}
        });
        extraNodesRef.current = [];
        sourceNodeRef.current = null;
      };

      source.start();

      // Progress animation
      const updateProgress = () => {
        const elapsed = ctx.currentTime - playbackStartRef.current;
        const prog = Math.min(elapsed / actualDuration, 1);
        setPlaybackProgress(prog);
        if (prog < 1) {
          progressFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      progressFrameRef.current = requestAnimationFrame(updateProgress);
    },
    [getAudioContext, stopPlayback, volume]
  );

  // Update gain when volume changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopPlayback]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Permission prompt
  if (micPermission === 'prompt') {
    return (
      <div style={styles.page}>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              ...styles.particle,
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
        <style>{keyframes}</style>
        <div style={styles.permissionCard}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎤</div>
          <h1 style={{ ...styles.title, fontSize: '2rem', marginBottom: '12px' }}>Voice Fun</h1>
          <p style={{ ...styles.subtitle, marginBottom: '24px' }}>
            We need access to your microphone to record your voice and apply fun effects!
          </p>
          <p style={{ ...styles.subtitle, fontSize: '0.85rem', opacity: 0.6, marginBottom: '32px' }}>
            Your voice is only processed locally — nothing is uploaded anywhere.
          </p>
          <button onClick={requestMic} style={styles.permissionBtn}>
            Allow Microphone Access
          </button>
          <Link href="/" style={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Permission denied
  if (micPermission === 'denied') {
    return (
      <div style={styles.page}>
        <style>{keyframes}</style>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              ...styles.particle,
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
        <div style={styles.permissionCard}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😔</div>
          <h1 style={{ ...styles.title, fontSize: '1.8rem', marginBottom: '12px' }}>
            Microphone Access Denied
          </h1>
          <p style={{ ...styles.subtitle, marginBottom: '24px' }}>
            Voice Fun needs microphone access to work. Please enable it in your browser settings and
            reload the page.
          </p>
          <button onClick={() => window.location.reload()} style={styles.permissionBtn}>
            Try Again
          </button>
          <Link href="/" style={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{keyframes}</style>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            ...styles.particle,
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Header */}
      <Link href="/" style={styles.backLink2}>
        ← Back
      </Link>

      <div style={styles.header}>
        <h1 style={styles.title}>Voice Fun 🎤</h1>
        <p style={styles.subtitle}>Record your voice and hear it transformed!</p>
      </div>

      {/* Record Section */}
      <div style={styles.recordSection}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            ...styles.recordBtn,
            background: isRecording
              ? 'radial-gradient(circle, #ff1744 0%, #d50000 100%)'
              : 'linear-gradient(135deg, #e91e8c, #b388ff)',
            animation: isRecording ? 'pulse 1.2s ease-in-out infinite' : 'none',
            boxShadow: isRecording
              ? '0 0 0 0 rgba(255,23,68,0.4), 0 0 30px rgba(255,23,68,0.3)'
              : '0 0 20px rgba(233,30,140,0.3)',
          }}
          disabled={isPlaying}
        >
          <span style={{ fontSize: '32px' }}>{isRecording ? '⏹' : '🎙️'}</span>
        </button>
        <p style={styles.recordLabel}>
          {isRecording ? 'Recording... Tap to stop' : hasRecording ? 'Tap to re-record' : 'Tap to record'}
        </p>
        <p style={styles.timer}>
          {isRecording
            ? `${formatTime(recordingTime)} / 0:30`
            : hasRecording
            ? `Recorded: ${formatTime(audioBufferRef.current?.duration || 0)}`
            : ''}
        </p>

        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          style={{
            ...styles.canvas,
            opacity: isRecording ? 1 : 0.3,
          }}
        />
      </div>

      {/* Playback Controls */}
      {hasRecording && (
        <div style={styles.playbackSection}>
          <div style={styles.progressBarOuter}>
            <div
              style={{
                ...styles.progressBarInner,
                width: `${playbackProgress * 100}%`,
              }}
            />
          </div>
          <div style={styles.volumeRow}>
            <span style={{ fontSize: '14px', color: '#b388ff' }}>🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={styles.volumeSlider}
            />
            <span style={{ fontSize: '14px', color: '#b388ff' }}>🔊</span>
            {isPlaying && (
              <button onClick={stopPlayback} style={styles.stopBtn}>
                ⏹ Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* Effects Grid */}
      <div className="voice-effects-grid" style={styles.effectsGrid}>
        {EFFECTS.map((effect) => {
          const isActive = activeEffect === effect.id && isPlaying;
          const disabled = !hasRecording || isRecording;
          return (
            <button
              key={effect.id}
              onClick={() => !disabled && playWithEffect(effect.id)}
              style={{
                ...styles.effectCard,
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                borderColor: isActive ? effect.color : 'rgba(255,255,255,0.08)',
                boxShadow: isActive
                  ? `0 0 20px ${effect.color}55, 0 0 40px ${effect.color}22, inset 0 0 20px ${effect.color}11`
                  : '0 4px 15px rgba(0,0,0,0.2)',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
              }}
              disabled={disabled}
            >
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '6px' }}>
                {effect.emoji}
              </span>
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: isActive ? effect.color : '#fff',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                {effect.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {effect.desc}
              </span>
              {isActive && (
                <div style={styles.playingIndicator}>
                  <span style={{ ...styles.bar, animationDelay: '0s', background: effect.color }} />
                  <span style={{ ...styles.bar, animationDelay: '0.15s', background: effect.color }} />
                  <span style={{ ...styles.bar, animationDelay: '0.3s', background: effect.color }} />
                  <span style={{ ...styles.bar, animationDelay: '0.45s', background: effect.color }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer spacing */}
      <div style={{ height: '60px' }} />
    </div>
  );
}

const keyframes = `
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600&display=swap');

  @keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,23,68,0.5); }
    50% { transform: scale(1.08); box-shadow: 0 0 0 20px rgba(255,23,68,0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,23,68,0); }
  }

  @keyframes soundBar {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }

  @media (min-width: 600px) {
    .voice-effects-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
  }
  @media (min-width: 900px) {
    .voice-effects-grid {
      grid-template-columns: repeat(4, 1fr) !important;
    }
  }

  @keyframes floatParticle {
    0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: var(--p-opacity, 0.15); }
    25% { transform: translate(10px, -20px) rotate(90deg); }
    50% { transform: translate(-5px, -40px) rotate(180deg); opacity: calc(var(--p-opacity, 0.15) * 1.5); }
    75% { transform: translate(15px, -20px) rotate(270deg); }
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: linear-gradient(90deg, #e91e8c, #b388ff);
    border-radius: 2px;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(233,30,140,0.5);
  }
  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 6px rgba(233,30,140,0.5);
  }
`;

const styles = {
  page: {
    minHeight: '100vh',
    background: '#07071a',
    fontFamily: "'Inter', sans-serif",
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  particle: {
    position: 'fixed',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    textAlign: 'center',
    marginTop: '40px',
    marginBottom: '30px',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontFamily: "'Dancing Script', cursive",
    fontSize: '2.8rem',
    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  recordSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
    position: 'relative',
    zIndex: 1,
  },
  recordBtn: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  recordLabel: {
    marginTop: '12px',
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: "'Inter', sans-serif",
  },
  timer: {
    fontSize: '0.85rem',
    color: '#b388ff',
    fontFamily: "'Inter', sans-serif",
    marginTop: '4px',
    minHeight: '20px',
  },
  canvas: {
    marginTop: '16px',
    maxWidth: '100%',
    width: '400px',
    height: '80px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  playbackSection: {
    maxWidth: '500px',
    margin: '0 auto 28px auto',
    position: 'relative',
    zIndex: 1,
  },
  progressBarOuter: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressBarInner: {
    height: '100%',
    background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
    borderRadius: '3px',
    transition: 'width 0.05s linear',
  },
  volumeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
  },
  volumeSlider: {
    width: '120px',
    cursor: 'pointer',
  },
  stopBtn: {
    background: 'rgba(255,23,68,0.15)',
    border: '1px solid rgba(255,23,68,0.3)',
    color: '#ff5252',
    borderRadius: '20px',
    padding: '6px 16px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    marginLeft: '12px',
  },
  effectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    maxWidth: '700px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  effectCard: {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '16px 12px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  playingIndicator: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '3px',
    marginTop: '8px',
    height: '18px',
  },
  bar: {
    display: 'inline-block',
    width: '3px',
    borderRadius: '2px',
    animation: 'soundBar 0.6s ease-in-out infinite',
  },
  permissionCard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
    padding: '48px 36px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
    zIndex: 2,
  },
  permissionBtn: {
    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
    border: 'none',
    color: '#fff',
    padding: '14px 32px',
    borderRadius: '30px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 0 20px rgba(233,30,140,0.3)',
  },
  backLink: {
    display: 'block',
    marginTop: '24px',
    color: 'rgba(255,255,255,0.4)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontFamily: "'Inter', sans-serif",
  },
  backLink2: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontFamily: "'Inter', sans-serif",
    zIndex: 2,
    padding: '8px 16px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.3s ease',
  },
};

