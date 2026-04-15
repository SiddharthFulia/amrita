'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const CLASS_EMOJIS = {
  person: '🧑', cat: '🐱', dog: '🐶', car: '🚗', bottle: '🍶', cup: '☕',
  'cell phone': '📱', laptop: '💻', book: '📖', chair: '🪑', tv: '📺',
  bicycle: '🚲', motorcycle: '🏍️', airplane: '✈️', bus: '🚌', train: '🚆',
  truck: '🚛', boat: '⛵', bird: '🐦', horse: '🐴', sheep: '🐑',
  cow: '🐄', elephant: '🐘', bear: '🐻', zebra: '🦓', giraffe: '🦒',
  backpack: '🎒', umbrella: '☂️', handbag: '👜', tie: '👔', suitcase: '🧳',
  frisbee: '🥏', skis: '🎿', snowboard: '🏂', 'sports ball': '⚽',
  kite: '🪁', 'baseball bat': '🏏', 'baseball glove': '🧤',
  skateboard: '🛹', surfboard: '🏄', 'tennis racket': '🎾',
  knife: '🔪', spoon: '🥄', fork: '🍴', bowl: '🥣',
  banana: '🍌', apple: '🍎', sandwich: '🥪', orange: '🍊',
  broccoli: '🥦', carrot: '🥕', pizza: '🍕', 'hot dog': '🌭',
  donut: '🍩', cake: '🎂', couch: '🛋️', bed: '🛏️',
  'potted plant': '🪴', 'dining table': '🪑', toilet: '🚽',
  mouse: '🖱️', remote: '📱', keyboard: '⌨️', microwave: '📦',
  oven: '🔥', toaster: '🍞', sink: '🚰', refrigerator: '🧊',
  scissors: '✂️', 'teddy bear': '🧸', 'hair drier': '💨',
  toothbrush: '🪥', clock: '🕐', vase: '🏺', 'wine glass': '🍷',
  'stop sign': '🛑', 'parking meter': '🅿️', bench: '🪑',
  'fire hydrant': '🧯', 'traffic light': '🚦',
};

const BOX_COLORS = ['#e91e8c', '#4fc3f7', '#ff9800', '#4caf50', '#b388ff', '#ffd54f', '#ef5350', '#26c6da'];

export default function ObjectDetectPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const detectingRef = useRef(false);
  const animFrameRef = useRef(null);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef({ lastTime: performance.now(), frames: 0 });
  const streamRef = useRef(null);
  const classColorMapRef = useRef({});
  const colorIndexRef = useRef(0);

  const [modelStatus, setModelStatus] = useState('idle'); // idle, loading-tf, loading-model, ready, error
  const [cameraStatus, setCameraStatus] = useState('idle'); // idle, requesting, active, denied, error
  const [predictions, setPredictions] = useState([]);
  const [fps, setFps] = useState(0);
  const [threshold, setThreshold] = useState(0.5);
  const [showLabels, setShowLabels] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [paused, setPaused] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [errorMsg, setErrorMsg] = useState('');

  const pausedRef = useRef(false);
  const thresholdRef = useRef(0.5);
  const showLabelsRef = useRef(true);
  const showConfidenceRef = useRef(true);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { showConfidenceRef.current = showConfidence; }, [showConfidence]);

  const getColorForClass = useCallback((className) => {
    if (!classColorMapRef.current[className]) {
      classColorMapRef.current[className] = BOX_COLORS[colorIndexRef.current % BOX_COLORS.length];
      colorIndexRef.current++;
    }
    return classColorMapRef.current[className];
  }, []);

  // Load TF.js and COCO-SSD via script tags
  useEffect(() => {
    let cancelled = false;

    const loadScript = (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

    const init = async () => {
      try {
        setModelStatus('loading-tf');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs');
        if (cancelled) return;

        setModelStatus('loading-model');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd');
        if (cancelled) return;

        const model = await window.cocoSsd.load();
        if (cancelled) return;

        modelRef.current = model;
        setModelStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setModelStatus('error');
          setErrorMsg(err.message);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Start camera
  const startCamera = useCallback(async (facing) => {
    setCameraStatus('requesting');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus('active');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraStatus('denied');
      } else {
        setCameraStatus('error');
        setErrorMsg(err.message);
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode, startCamera]);

  // Draw bounding boxes with reticle corners
  const drawBoxes = useCallback((ctx, preds, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const filtered = preds.filter(p => p.score >= thresholdRef.current);

    for (const pred of filtered) {
      const [x, y, bw, bh] = pred.bbox;
      const color = getColorForClass(pred.class);
      const cornerSize = Math.min(16, bw * 0.15, bh * 0.15);
      const lineWidth = 2;

      // Main bounding box (semi-transparent)
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 0.6;
      ctx.strokeRect(x, y, bw, bh);
      ctx.globalAlpha = 1;

      // Fill with very faint color
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.06;
      ctx.fillRect(x, y, bw, bh);
      ctx.globalAlpha = 1;

      // Corner reticles — thicker corner lines
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(x + bw - cornerSize, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + cornerSize);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x, y + bh - cornerSize); ctx.lineTo(x, y + bh); ctx.lineTo(x + cornerSize, y + bh);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x + bw - cornerSize, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - cornerSize);
      ctx.stroke();

      // Small corner squares (decorative reticle dots)
      const sq = 4;
      ctx.fillStyle = color;
      ctx.fillRect(x - sq / 2, y - sq / 2, sq, sq);
      ctx.fillRect(x + bw - sq / 2, y - sq / 2, sq, sq);
      ctx.fillRect(x - sq / 2, y + bh - sq / 2, sq, sq);
      ctx.fillRect(x + bw - sq / 2, y + bh - sq / 2, sq, sq);

      // Label
      if (showLabelsRef.current) {
        const conf = Math.round(pred.score * 100);
        const labelText = showConfidenceRef.current ? `${pred.class} ${conf}%` : pred.class;
        ctx.font = 'bold 13px Inter, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const labelH = 22;
        const labelX = x;
        const labelY = y - labelH - 2;

        // Label background
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, textWidth + 12, labelH, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label text
        ctx.fillStyle = '#fff';
        ctx.fillText(labelText, labelX + 6, labelY + 15);
      }
    }
  }, [getColorForClass]);

  // Detection + render loop
  useEffect(() => {
    if (modelStatus !== 'ready' || cameraStatus !== 'active') return;

    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext('2d');

      // FPS calc
      fpsTimerRef.current.frames++;
      const now = performance.now();
      if (now - fpsTimerRef.current.lastTime >= 1000) {
        setFps(fpsTimerRef.current.frames);
        fpsTimerRef.current.frames = 0;
        fpsTimerRef.current.lastTime = now;
      }

      frameCountRef.current++;

      if (!pausedRef.current && !detectingRef.current && frameCountRef.current % 3 === 0 && modelRef.current) {
        detectingRef.current = true;
        try {
          const results = await modelRef.current.detect(video);
          setPredictions(results);
          drawBoxes(ctx, results, w, h);
        } catch (e) {
          // skip frame
        }
        detectingRef.current = false;
      } else {
        // Redraw last boxes on intermediate frames
        drawBoxes(ctx, predictions, w, h);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    // Use a stable predictions reference for intermediate redraws
    let latestPreds = [];
    const stableLoop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(stableLoop);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext('2d');

      fpsTimerRef.current.frames++;
      const now = performance.now();
      if (now - fpsTimerRef.current.lastTime >= 1000) {
        setFps(fpsTimerRef.current.frames);
        fpsTimerRef.current.frames = 0;
        fpsTimerRef.current.lastTime = now;
      }

      frameCountRef.current++;

      if (!pausedRef.current && !detectingRef.current && frameCountRef.current % 3 === 0 && modelRef.current) {
        detectingRef.current = true;
        try {
          const results = await modelRef.current.detect(video);
          latestPreds = results;
          setPredictions(results);
        } catch (e) { /* skip */ }
        detectingRef.current = false;
      }

      drawBoxes(ctx, latestPreds, w, h);
      animFrameRef.current = requestAnimationFrame(stableLoop);
    };

    animFrameRef.current = requestAnimationFrame(stableLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [modelStatus, cameraStatus, drawBoxes]);

  // Screenshot
  const takeScreenshot = useCallback(() => {
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay) return;

    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext('2d');

    // Mirror the video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -c.width, 0, c.width, c.height);
    ctx.restore();

    // Draw overlay (also mirrored since canvas is already mirrored via CSS, we mirror the overlay too)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(overlay, -c.width, 0);
    ctx.restore();

    const link = document.createElement('a');
    link.download = `detection-${Date.now()}.png`;
    link.href = c.toDataURL('image/png');
    link.click();
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
  }, []);

  // Unique detected classes with counts
  const filteredPreds = predictions.filter(p => p.score >= threshold);
  const classCounts = {};
  filteredPreds.forEach(p => {
    classCounts[p.class] = (classCounts[p.class] || 0) + 1;
  });
  const uniqueClasses = Object.keys(classCounts);

  const statusText = {
    'idle': 'Initializing...',
    'loading-tf': 'Loading TensorFlow.js...',
    'loading-model': 'Loading COCO-SSD model...',
    'ready': 'Ready',
    'error': `Error: ${errorMsg}`,
  }[modelStatus];

  const statusColor = {
    'idle': '#888',
    'loading-tf': '#ffd54f',
    'loading-model': '#ff9800',
    'ready': '#4caf50',
    'error': '#ef5350',
  }[modelStatus];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      color: '#e0e0e0',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 16px 40px',
    }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        width: '100%',
        maxWidth: 600,
        textAlign: 'center',
        padding: '32px 0 16px',
      }}>
        <Link href="/" style={{ color: '#b388ff', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 12 }}>
          ← Back
        </Link>
        <h1 style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 'clamp(32px, 6vw, 48px)',
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          Object Detect 🔍
        </h1>
        <p style={{ color: '#999', fontSize: 14, margin: '4px 0 0' }}>
          AI-powered — runs in your browser
        </p>
      </header>

      {/* Loading overlay */}
      {modelStatus !== 'ready' && modelStatus !== 'error' && (
        <div style={{
          width: '100%',
          maxWidth: 500,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          border: '1px solid rgba(233,30,140,0.2)',
          padding: '48px 24px',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          {/* Spinner */}
          <div style={{
            width: 48, height: 48, margin: '0 auto 20px',
            border: '3px solid rgba(233,30,140,0.2)',
            borderTopColor: '#e91e8c',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#b388ff', fontSize: 16, fontWeight: 600, margin: 0 }}>{statusText}</p>
          <div style={{
            marginTop: 16, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2,
            overflow: 'hidden', maxWidth: 240, marginLeft: 'auto', marginRight: 'auto',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
              borderRadius: 2,
              width: modelStatus === 'loading-tf' ? '33%' : modelStatus === 'loading-model' ? '66%' : '100%',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Camera denied state */}
      {cameraStatus === 'denied' && (
        <div style={{
          width: '100%', maxWidth: 500, background: 'rgba(239,83,80,0.1)',
          borderRadius: 16, border: '1px solid rgba(239,83,80,0.3)',
          padding: '40px 24px', textAlign: 'center', marginBottom: 20,
        }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📷</p>
          <p style={{ color: '#ef5350', fontWeight: 600, fontSize: 16, margin: 0 }}>Camera Access Denied</p>
          <p style={{ color: '#999', fontSize: 14, margin: '8px 0 0' }}>
            Please allow camera access in your browser settings and reload the page.
          </p>
        </div>
      )}

      {/* Camera + Canvas area */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 500,
        borderRadius: 16,
        overflow: 'hidden',
        background: '#0a0a2a',
        border: '1px solid rgba(233,30,140,0.2)',
        marginBottom: 16,
        aspectRatio: '4/3',
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            display: 'block',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Paused overlay */}
        {paused && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(7,7,26,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 600, color: '#ffd54f',
          }}>
            ⏸ Detection Paused
          </div>
        )}

        {/* FPS badge */}
        {modelStatus === 'ready' && cameraStatus === 'active' && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(7,7,26,0.75)',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: fps >= 20 ? '#4caf50' : fps >= 10 ? '#ffd54f' : '#ef5350',
            backdropFilter: 'blur(4px)',
          }}>
            {fps} FPS
          </div>
        )}

        {/* Object count badge */}
        {modelStatus === 'ready' && cameraStatus === 'active' && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(7,7,26,0.75)',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#e91e8c',
            backdropFilter: 'blur(4px)',
          }}>
            {filteredPreds.length} object{filteredPreds.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Controls */}
      {modelStatus === 'ready' && cameraStatus === 'active' && (
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 500,
        }}>
          <button onClick={() => setPaused(p => !p)} style={btnStyle(paused ? '#ff9800' : '#e91e8c')}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={switchCamera} style={btnStyle('#b388ff')}>
            🔄 Flip Camera
          </button>
          <button onClick={takeScreenshot} style={btnStyle('#4fc3f7')}>
            📸 Screenshot
          </button>
        </div>
      )}

      {/* Detection classes bar */}
      {uniqueClasses.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: 500,
          overflowX: 'auto',
          display: 'flex',
          gap: 8,
          paddingBottom: 8,
          marginBottom: 16,
          scrollbarWidth: 'thin',
          scrollbarColor: '#333 transparent',
        }}>
          {uniqueClasses.map(cls => {
            const color = getColorForClass(cls);
            const emoji = CLASS_EMOJIS[cls] || '📦';
            return (
              <div key={cls} style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: `${color}18`,
                border: `1px solid ${color}60`,
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: color,
                boxShadow: `0 0 10px ${color}30`,
                animation: 'pillGlow 1.5s ease-in-out infinite alternate',
              }}>
                <span>{emoji}</span>
                <span>{cls}</span>
                <span style={{
                  background: `${color}30`,
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {classCounts[cls]}
                </span>
              </div>
            );
          })}
          <style>{`@keyframes pillGlow { from { filter: brightness(1); } to { filter: brightness(1.15); } }`}</style>
        </div>
      )}

      {/* Stats panel */}
      {modelStatus === 'ready' && (
        <div style={{
          width: '100%',
          maxWidth: 500,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          border: '1px solid rgba(179,136,255,0.15)',
          padding: '20px 24px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
            <StatItem label="Objects Detected" value={filteredPreds.length} color="#e91e8c" />
            <StatItem label="FPS" value={fps} color={fps >= 20 ? '#4caf50' : '#ffd54f'} />
            <StatItem label="Unique Classes" value={uniqueClasses.length} color="#b388ff" />
            <StatItem label="Model Status" value={statusText} color={statusColor} small />
          </div>

          {uniqueClasses.length > 0 && (
            <p style={{ color: '#999', fontSize: 12, margin: '0 0 16px' }}>
              Detected: {uniqueClasses.join(', ')}
            </p>
          )}

          {/* Threshold slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: '#aaa', fontWeight: 500 }}>Confidence Threshold</label>
              <span style={{ fontSize: 13, color: '#e91e8c', fontWeight: 700 }}>{Math.round(threshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#e91e8c',
                height: 4,
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <ToggleSwitch label="Show Labels" checked={showLabels} onChange={setShowLabels} />
            <ToggleSwitch label="Confidence %" checked={showConfidence} onChange={setShowConfidence} />
          </div>
        </div>
      )}

      {/* Error state */}
      {modelStatus === 'error' && (
        <div style={{
          width: '100%', maxWidth: 500,
          background: 'rgba(239,83,80,0.1)',
          borderRadius: 16, border: '1px solid rgba(239,83,80,0.3)',
          padding: '24px', textAlign: 'center',
        }}>
          <p style={{ color: '#ef5350', fontWeight: 600, margin: 0 }}>Failed to load model</p>
          <p style={{ color: '#999', fontSize: 13, margin: '8px 0 0' }}>{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              background: '#ef5350',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, color, small }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: small ? 14 : 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      cursor: 'pointer', fontSize: 13, color: '#bbb', userSelect: 'none',
    }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20,
          borderRadius: 10,
          background: checked ? '#e91e8c' : '#333',
          position: 'relative',
          transition: 'background 0.2s',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 16, height: 16,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          transition: 'left 0.2s',
        }} />
      </div>
      {label}
    </label>
  );
}

function btnStyle(color) {
  return {
    padding: '10px 18px',
    background: `${color}20`,
    border: `1px solid ${color}60`,
    borderRadius: 10,
    color: color,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s',
  };
}
