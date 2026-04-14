'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { analyzeFace, checkFaceHealth } from '@/utils/apis';

const LANDMARK_GROUPS = {
  jaw: { indices: Array.from({ length: 17 }, (_, i) => i), color: '#4fc3f7', label: 'Jaw' },
  leftEyebrow: { indices: [17, 18, 19, 20, 21], color: '#ff9800', label: 'L Eyebrow' },
  rightEyebrow: { indices: [22, 23, 24, 25, 26], color: '#ff9800', label: 'R Eyebrow' },
  noseBridge: { indices: [27, 28, 29, 30], color: '#b388ff', label: 'Nose Bridge' },
  noseBottom: { indices: [31, 32, 33, 34, 35], color: '#b388ff', label: 'Nose Bottom' },
  leftEye: { indices: [36, 37, 38, 39, 40, 41, 36], color: '#4caf50', label: 'L Eye' },
  rightEye: { indices: [42, 43, 44, 45, 46, 47, 42], color: '#4caf50', label: 'R Eye' },
  outerLips: { indices: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 48], color: '#e91e8c', label: 'Outer Lips' },
  innerLips: { indices: [60, 61, 62, 63, 64, 65, 66, 67, 60], color: '#e91e8c', label: 'Inner Lips' },
};

const MOOD_EMOJIS = {
  happy: '😊',
  sad: '😢',
  surprised: '😮',
  angry: '😠',
  neutral: '😐',
  sleepy: '😴',
};

const MOOD_COLORS = {
  happy: '#4caf50',
  sad: '#42a5f5',
  surprised: '#ff9800',
  angry: '#f44336',
  neutral: '#9e9e9e',
  sleepy: '#7e57c2',
};

function getLandmarkColor(index) {
  if (index <= 16) return '#4fc3f7';
  if (index <= 26) return '#ff9800';
  if (index <= 35) return '#b388ff';
  if (index <= 41) return '#4caf50';
  if (index <= 47) return '#4caf50';
  return '#e91e8c';
}

export default function FaceAIPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const requestPending = useRef(false);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  const bounceFrame = useRef(0);

  const [serviceOnline, setServiceOnline] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [faceData, setFaceData] = useState(null);
  const [noFace, setNoFace] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [fps, setFps] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [cameraError, setCameraError] = useState(null);
  const [videoDimensions, setVideoDimensions] = useState({ w: 0, h: 0 });

  const fpsCounter = useRef({ frames: 0, lastTime: Date.now() });

  // Check face service health on mount
  useEffect(() => {
    checkFaceHealth()
      .then((res) => {
        setServiceOnline(res?.status === 'ok' || res?.success === true || !!res);
      })
      .catch(() => setServiceOnline(false));
  }, []);

  // Start camera
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 533 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError(err.message || 'Camera access denied');
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Handle video metadata loaded
  const handleVideoReady = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setVideoDimensions({ w: v.videoWidth, h: v.videoHeight });
    }
  }, []);

  // Capture and analyze loop
  useEffect(() => {
    if (isPaused || !serviceOnline) return;

    intervalRef.current = setInterval(() => {
      if (requestPending.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, vw, vh);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);

      requestPending.current = true;
      const t0 = performance.now();

      analyzeFace(base64)
        .then((res) => {
          const elapsed = Math.round(performance.now() - t0);
          setProcessingTime(elapsed);

          fpsCounter.current.frames++;
          const now = Date.now();
          if (now - fpsCounter.current.lastTime >= 1000) {
            setFps(fpsCounter.current.frames);
            fpsCounter.current.frames = 0;
            fpsCounter.current.lastTime = now;
          }

          if (res && res.faces && res.faces.length > 0) {
            setFaceData(res);
            setNoFace(false);
            const mood = res.faces[0].mood;
            if (mood) {
              setMoodHistory((prev) => {
                const next = [...prev, { mood: mood.label, confidence: mood.confidence }];
                return next.slice(-10);
              });
            }
          } else if (res && res.face_count === 0) {
            setFaceData(res);
            setNoFace(true);
          } else {
            setNoFace(true);
          }
        })
        .catch(() => {
          setNoFace(true);
        })
        .finally(() => {
          requestPending.current = false;
        });
    }, 500);

    return () => clearInterval(intervalRef.current);
  }, [isPaused, serviceOnline]);

  // Draw overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    const w = overlay.width;
    const h = overlay.height;
    ctx.clearRect(0, 0, w, h);

    if (!faceData || !faceData.faces || faceData.faces.length === 0) return;

    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 400;
    const vh = video.videoHeight || 533;
    const scaleX = w / vw;
    const scaleY = h / vh;

    // Mirror transform for the overlay — landmarks come in normal coords, we mirror x
    const mirrorX = (x) => w - x * scaleX;
    const mapY = (y) => y * scaleY;

    faceData.faces.forEach((face) => {
      // Bounding box
      if (showBoundingBox && face.bbox) {
        const { x, y, width: bw, height: bh } = face.bbox;
        ctx.strokeStyle = '#e91e8c';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        const bx = mirrorX(x + bw);
        const by = mapY(y);
        ctx.strokeRect(bx, by, bw * scaleX, bh * scaleY);
        ctx.setLineDash([]);
      }

      // Landmarks
      if (showLandmarks && face.landmarks && face.landmarks.length === 68) {
        const pts = face.landmarks.map(([lx, ly]) => [mirrorX(lx), mapY(ly)]);

        // Draw connecting lines
        Object.values(LANDMARK_GROUPS).forEach((group) => {
          ctx.beginPath();
          ctx.strokeStyle = group.color + 'bb';
          ctx.lineWidth = 1.5;
          group.indices.forEach((idx, i) => {
            const [px, py] = pts[idx];
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        });

        // Draw dots
        pts.forEach(([px, py], idx) => {
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = getLandmarkColor(idx);
          ctx.fill();
        });
      }

      // Mood emoji floating above face
      if (face.mood && face.bbox) {
        bounceFrame.current = (bounceFrame.current + 1) % 60;
        const bounceY = Math.sin((bounceFrame.current / 60) * Math.PI * 2) * 4;
        const cx = mirrorX(face.bbox.x + face.bbox.width / 2);
        const cy = mapY(face.bbox.y) - 20 + bounceY;
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.fillText(MOOD_EMOJIS[face.mood.label] || '😐', cx, cy);
      }
    });
  }, [faceData, showLandmarks, showBoundingBox]);

  // Overlay resize sync
  useEffect(() => {
    if (!overlayRef.current) return;
    const container = overlayRef.current.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    overlayRef.current.width = rect.width;
    overlayRef.current.height = rect.height;
  }, [videoDimensions]);

  // Resize observer for overlay canvas
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const container = overlay.parentElement;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      overlay.width = rect.width;
      overlay.height = rect.height;
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const face = faceData?.faces?.[0];
  const confidence = face?.confidence ?? 0;
  const mood = face?.mood;
  const features = face?.features;
  const faceAngle = face?.angle ?? 0;
  const faceCount = faceData?.face_count ?? 0;

  const confColor = confidence > 90 ? '#4caf50' : confidence > 70 ? '#ffc107' : '#f44336';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      padding: '0',
      margin: '0',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '32px 16px 16px',
      }}>
        <Link href="/" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '14px', display: 'inline-block', marginBottom: '12px' }}>
          ← Back Home
        </Link>
        <h1 style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 'clamp(32px, 6vw, 48px)',
          margin: '0 0 4px',
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Face AI 🧠
        </h1>
        <p style={{ color: '#b388ffaa', fontSize: '14px', margin: 0 }}>
          OpenCV-powered face analysis
        </p>
      </div>

      {/* Connection status */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        {serviceOnline === null && (
          <span style={{ color: '#888', fontSize: '13px' }}>Checking OpenCV service...</span>
        )}
        {serviceOnline === true && (
          <span style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50', display: 'inline-block', boxShadow: '0 0 6px #4caf50' }} />
            <span style={{ color: '#4caf50' }}>OpenCV Online</span>
          </span>
        )}
        {serviceOnline === false && (
          <span style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f44336', display: 'inline-block', boxShadow: '0 0 6px #f44336' }} />
            <span style={{ color: '#f44336' }}>OpenCV Offline — install on VPS</span>
          </span>
        )}
      </div>

      {/* Main content */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '24px',
        padding: '0 16px 32px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Camera Area */}
        <div style={{ flex: '0 0 auto', width: '100%', maxWidth: '400px' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '133.33%', /* 3:4 ratio */
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#0d0d2b',
            border: '1px solid #e91e8c33',
            boxShadow: '0 0 40px #e91e8c15',
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleVideoReady}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <canvas
              ref={overlayRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />

            {/* No face overlay */}
            {noFace && serviceOnline && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#07071acc',
                backdropFilter: 'blur(8px)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                color: '#ffc107',
                whiteSpace: 'nowrap',
              }}>
                No face detected — look at the camera!
              </div>
            )}

            {/* Camera error */}
            {cameraError && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#f44336',
                padding: '24px',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div>
                <div style={{ fontSize: '14px' }}>Camera error: {cameraError}</div>
              </div>
            )}

            {/* Service offline message */}
            {serviceOnline === false && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                padding: '24px',
                width: '80%',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
                <div style={{ fontSize: '15px', color: '#e91e8c', marginBottom: '8px', fontWeight: 600 }}>
                  OpenCV Service Offline
                </div>
                <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.6 }}>
                  The Python face analysis service needs to be running on your VPS.
                  Start it with:<br />
                  <code style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    background: '#1a1a3e',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#b388ff',
                  }}>
                    python face_service.py
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px',
            justifyContent: 'center',
          }}>
            <ToggleButton
              active={!isPaused}
              onClick={() => setIsPaused((p) => !p)}
              label={isPaused ? 'Resume Analysis' : 'Pause Analysis'}
            />
            <ToggleButton
              active={showLandmarks}
              onClick={() => setShowLandmarks((p) => !p)}
              label="Landmarks"
            />
            <ToggleButton
              active={showBoundingBox}
              onClick={() => setShowBoundingBox((p) => !p)}
              label="Bounding Box"
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#888',
              padding: '6px 10px',
              background: '#0d0d2b',
              borderRadius: '8px',
              border: '1px solid #ffffff10',
            }}>
              <span style={{ color: '#b388ff', fontWeight: 600 }}>{fps}</span> FPS
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div style={{
          flex: '1 1 280px',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Confidence */}
          <GlassCard title="Confidence">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '36px',
                fontWeight: 700,
                color: confColor,
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1,
              }}>
                {Math.round(confidence)}%
              </span>
              <span style={{ fontSize: '12px', color: '#888' }}>detection confidence</span>
            </div>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: '#1a1a3e',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${confidence}%`,
                background: `linear-gradient(90deg, ${confColor}88, ${confColor})`,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </GlassCard>

          {/* Mood */}
          <GlassCard title="Mood">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '36px' }}>
                {mood ? (MOOD_EMOJIS[mood.label] || '😐') : '—'}
              </span>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: mood ? (MOOD_COLORS[mood.label] || '#fff') : '#555',
                  textTransform: 'capitalize',
                }}>
                  {mood?.label || 'Unknown'}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {mood ? `${Math.round(mood.confidence)}% confident` : 'Waiting...'}
                </div>
              </div>
            </div>
            {/* Mood history bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px' }}>
              {moodHistory.length === 0 && (
                <span style={{ fontSize: '11px', color: '#555' }}>No mood history yet</span>
              )}
              {moodHistory.map((m, i) => (
                <div
                  key={i}
                  title={`${m.mood} (${Math.round(m.confidence)}%)`}
                  style={{
                    flex: 1,
                    height: `${Math.max(10, m.confidence)}%`,
                    background: MOOD_COLORS[m.mood] || '#666',
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 0.3s ease',
                    minWidth: '8px',
                    opacity: 0.5 + (i / moodHistory.length) * 0.5,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
              Last {moodHistory.length} readings
            </div>
          </GlassCard>

          {/* Face Angle */}
          <GlassCard title="Face Angle">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid #b388ff44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: '22px',
                  height: '2px',
                  background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                  borderRadius: '2px',
                  transform: `rotate(${faceAngle}deg)`,
                  transition: 'transform 0.3s ease',
                }} />
              </div>
              <div>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#b388ff' }}>
                  {typeof faceAngle === 'number' ? faceAngle.toFixed(1) : '0.0'}°
                </span>
                <div style={{ fontSize: '11px', color: '#888' }}>rotation</div>
              </div>
            </div>
          </GlassCard>

          {/* Features */}
          <GlassCard title="Features">
            <FeatureBar label="Mouth Open" value={features?.mouth_open ?? 0} color="#e91e8c" />
            <FeatureBar label="Left Eye" value={features?.left_eye ?? 0} color="#4caf50" />
            <FeatureBar label="Right Eye" value={features?.right_eye ?? 0} color="#4caf50" />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '6px',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: features?.smiling ? '#4caf50' : '#555',
                display: 'inline-block',
                boxShadow: features?.smiling ? '0 0 6px #4caf50' : 'none',
              }} />
              <span style={{ fontSize: '13px', color: '#ccc' }}>Smiling</span>
              <span style={{ fontSize: '12px', color: features?.smiling ? '#4caf50' : '#666', marginLeft: 'auto' }}>
                {features?.smiling ? 'Yes' : 'No'}
              </span>
            </div>
          </GlassCard>

          {/* Face Count & Processing */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <GlassCard title="Face Count" style={{ flex: 1 }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#e91e8c' }}>
                {faceCount}
              </span>
            </GlassCard>
            <GlassCard title="Processing" style={{ flex: 1 }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#b388ff' }}>
                {processingTime}
              </span>
              <span style={{ fontSize: '13px', color: '#888', marginLeft: '4px' }}>ms</span>
            </GlassCard>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');
        @keyframes subtleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

function GlassCard({ title, children, style = {} }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d0d2bee, #1a1a3ecc)',
      backdropFilter: 'blur(12px)',
      borderRadius: '14px',
      padding: '16px',
      border: '1px solid #ffffff08',
      boxShadow: '0 4px 24px #00000040',
      ...style,
    }}>
      {title && (
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#b388ff99',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '8px',
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function FeatureBar({ label, value, color }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
        <span style={{ color: '#ccc' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{
        height: '5px',
        borderRadius: '3px',
        background: '#1a1a3e',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}66, ${color})`,
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

function ToggleButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: '8px',
        border: `1px solid ${active ? '#e91e8c55' : '#ffffff15'}`,
        background: active
          ? 'linear-gradient(135deg, #e91e8c22, #b388ff15)'
          : '#0d0d2b',
        color: active ? '#e91e8c' : '#666',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        transition: 'all 0.2s ease',
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
}
