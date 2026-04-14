'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';

const FRAMES = [
  { id: 'none', label: 'None', icon: '🚫' },
  { id: 'heart', label: 'Heart', icon: '💖' },
  { id: 'polaroid', label: 'Polaroid', icon: '📷' },
  { id: 'circle', label: 'Circle', icon: '⭕' },
  { id: 'filmstrip', label: 'Film Strip', icon: '🎞️' },
  { id: 'vintage', label: 'Vintage', icon: '📜' },
  { id: 'sparkle', label: 'Sparkle', icon: '✨' },
];

const STICKER_LIST = ['💕', '❤️', '🦋', '🌸', '⭐', '✨', '👑', '🎀', '💎', '🌈', '🐱', '💋'];
const STICKER_SIZES = [48, 44, 50, 46, 42, 40, 52, 44, 46, 50, 48, 42];

const FILTERS = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.3) saturate(1.3)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(30deg) saturate(0.8)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.5) contrast(1.2) brightness(0.9)' },
  { id: 'pink', label: 'Pink Tint', css: 'hue-rotate(330deg) saturate(1.5)' },
  { id: 'contrast', label: 'Hi Contrast', css: 'contrast(1.5) saturate(1.2)' },
  { id: 'dreamy', label: 'Dreamy', css: 'blur(1px) brightness(1.1) saturate(1.3)' },
];

const FONTS = ['Dancing Script', 'Inter', 'Georgia, serif'];
const TEXT_COLORS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Pink', value: '#e91e8c' },
  { label: 'Purple', value: '#b388ff' },
  { label: 'Gold', value: '#ffd700' },
  { label: 'Black', value: '#000000' },
];

export default function PhotoBoothPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const sparklePhaseRef = useRef(0);

  const [cameraStatus, setCameraStatus] = useState('requesting'); // requesting | active | denied
  const [activeTab, setActiveTab] = useState('frames');
  const [selectedFrame, setSelectedFrame] = useState('none');
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [stickers, setStickers] = useState([]);
  const [textOverlays, setTextOverlays] = useState([]);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [flashActive, setFlashActive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // Text editor state
  const [textInput, setTextInput] = useState('');
  const [textFont, setTextFont] = useState('Dancing Script');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(28);

  // Dragging state
  const [dragging, setDragging] = useState(null); // { type: 'sticker'|'text', index, offsetX, offsetY }

  const [videoDims, setVideoDims] = useState({ w: 400, h: 533 });

  // Start camera
  useEffect(() => {
    let stream = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 600 }, height: { ideal: 800 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraStatus('active');
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        setCameraStatus('denied');
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Update video dimensions on resize
  useEffect(() => {
    function updateDims() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setVideoDims({ w: rect.width, h: rect.height });
      }
    }
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, [cameraStatus]);

  // Draw overlays loop
  useEffect(() => {
    if (cameraStatus !== 'active') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawFrame() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw frame overlay
      drawFrameOverlay(ctx, w, h, selectedFrame);

      // Draw stickers
      stickers.forEach((s) => {
        ctx.font = `${s.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, s.x, s.y);
      });

      // Draw text overlays
      textOverlays.forEach((t) => {
        ctx.save();
        ctx.font = `${t.size}px ${t.font}`;
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });

      sparklePhaseRef.current += 0.03;
      animFrameRef.current = requestAnimationFrame(drawFrame);
    }

    drawFrame();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraStatus, selectedFrame, stickers, textOverlays]);

  function drawFrameOverlay(ctx, w, h, frame) {
    ctx.save();
    switch (frame) {
      case 'heart': {
        // Draw a heart-shaped border
        ctx.strokeStyle = '#e91e8c';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#e91e8c';
        ctx.shadowBlur = 15;
        const cx = w / 2;
        const cy = h / 2;
        const s = Math.min(w, h) * 0.44;
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.7);
        ctx.bezierCurveTo(cx - s * 1.2, cy + s * 0.1, cx - s * 0.8, cy - s * 0.8, cx, cy - s * 0.35);
        ctx.bezierCurveTo(cx + s * 0.8, cy - s * 0.8, cx + s * 1.2, cy + s * 0.1, cx, cy + s * 0.7);
        ctx.stroke();
        // Draw small hearts in corners
        const hearts = ['💖', '💖', '💖', '💖'];
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(hearts[0], 25, 30);
        ctx.fillText(hearts[1], w - 25, 30);
        ctx.fillText(hearts[2], 25, h - 20);
        ctx.fillText(hearts[3], w - 25, h - 20);
        break;
      }
      case 'polaroid': {
        // White polaroid border
        const borderSide = 16;
        const borderTop = 16;
        const borderBottom = 70;
        ctx.fillStyle = '#ffffff';
        // Top
        ctx.fillRect(0, 0, w, borderTop);
        // Bottom
        ctx.fillRect(0, h - borderBottom, w, borderBottom);
        // Left
        ctx.fillRect(0, 0, borderSide, h);
        // Right
        ctx.fillRect(w - borderSide, 0, borderSide, h);
        // Date text
        ctx.fillStyle = '#555';
        ctx.font = '16px "Dancing Script", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('Siddharth & Amrita ~ 2026', w / 2, h - 30);
        // Shadow on the edges
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 10;
        break;
      }
      case 'circle': {
        // Circular mask border
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.44;
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(7, 7, 26, 0.85)';
        ctx.fill('evenodd');
        // Glow ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#e91e8c';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#e91e8c';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(179, 136, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
      case 'filmstrip': {
        const barH = 36;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);
        // Sprocket holes
        const holeCount = Math.floor(w / 40);
        for (let i = 0; i < holeCount; i++) {
          const x = 20 + i * (w / holeCount);
          ctx.beginPath();
          ctx.roundRect(x - 8, 8, 16, 20, 3);
          ctx.fillStyle = '#07071a';
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(x - 8, h - barH + 8, 16, 20, 3);
          ctx.fill();
          ctx.fillStyle = '#111';
        }
        // Frame number
        ctx.fillStyle = '#ff9800';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('♥ 01A', w - 12, barH - 6);
        break;
      }
      case 'vintage': {
        const bw = 12;
        // Rounded border
        ctx.strokeStyle = '#c8a96e';
        ctx.lineWidth = bw;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.roundRect(bw / 2, bw / 2, w - bw, h - bw, 16);
        ctx.stroke();
        // Inner line
        ctx.strokeStyle = 'rgba(200, 169, 110, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bw + 4, bw + 4, w - (bw + 4) * 2, h - (bw + 4) * 2, 10);
        ctx.stroke();
        // Vignette
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.min(w, h) * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'sparkle': {
        const phase = sparklePhaseRef.current;
        const count = 40;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const edgeParam = i / count;
          let sx, sy;
          // Distribute around the border
          const perimeter = 2 * (w + h);
          const dist = edgeParam * perimeter;
          if (dist < w) { sx = dist; sy = 0; }
          else if (dist < w + h) { sx = w; sy = dist - w; }
          else if (dist < 2 * w + h) { sx = w - (dist - w - h); sy = h; }
          else { sx = 0; sy = h - (dist - 2 * w - h); }
          const pulse = Math.sin(phase + i * 0.5) * 0.5 + 0.5;
          const size = 3 + pulse * 4;
          const alpha = 0.4 + pulse * 0.6;
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          const color = i % 2 === 0 ? `rgba(233, 30, 140, ${alpha})` : `rgba(179, 136, 255, ${alpha})`;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }

  // Add sticker
  function addSticker(emoji, idx) {
    if (stickers.length >= 20) return;
    setStickers((prev) => [
      ...prev,
      { emoji, size: STICKER_SIZES[idx] || 46, x: videoDims.w / 2, y: videoDims.h / 2, id: Date.now() + Math.random() },
    ]);
  }

  // Remove sticker
  function removeSticker(index) {
    setStickers((prev) => prev.filter((_, i) => i !== index));
  }

  // Add text overlay
  function addTextOverlay() {
    if (!textInput.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      { text: textInput, font: textFont, color: textColor, size: textSize, x: videoDims.w / 2, y: videoDims.h / 2, id: Date.now() },
    ]);
    setTextInput('');
  }

  // Remove text overlay
  function removeTextOverlay(index) {
    setTextOverlays((prev) => prev.filter((_, i) => i !== index));
  }

  // Drag handlers
  const handlePointerDown = useCallback(
    (e, type, index) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const item = type === 'sticker' ? stickers[index] : textOverlays[index];
      setDragging({
        type,
        index,
        offsetX: clientX - rect.left - item.x,
        offsetY: clientY - rect.top - item.y,
      });
    },
    [stickers, textOverlays]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const newX = Math.max(0, Math.min(rect.width, clientX - rect.left - dragging.offsetX));
      const newY = Math.max(0, Math.min(rect.height, clientY - rect.top - dragging.offsetY));

      if (dragging.type === 'sticker') {
        setStickers((prev) => prev.map((s, i) => (i === dragging.index ? { ...s, x: newX, y: newY } : s)));
      } else {
        setTextOverlays((prev) => prev.map((t, i) => (i === dragging.index ? { ...t, x: newX, y: newY } : t)));
      }
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
      return () => {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  // Capture photo
  function capturePhoto() {
    if (capturedPhotos.length >= 10) return;
    const video = videoRef.current;
    if (!video) return;

    // Flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    const captureCanvas = document.createElement('canvas');
    const w = video.videoWidth;
    const h = video.videoHeight;
    captureCanvas.width = w;
    captureCanvas.height = h;
    const ctx = captureCanvas.getContext('2d');

    // Apply filter
    const filterCss = FILTERS.find((f) => f.id === selectedFilter)?.css || 'none';
    ctx.filter = filterCss;

    // Draw mirrored video
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Reset filter for overlays
    ctx.filter = 'none';

    // Scale factor from display to actual
    const sx = w / videoDims.w;
    const sy = h / videoDims.h;

    // Draw frame
    ctx.save();
    ctx.scale(sx, sy);
    drawFrameOverlay(ctx, videoDims.w, videoDims.h, selectedFrame);
    ctx.restore();

    // Draw stickers
    stickers.forEach((s) => {
      ctx.font = `${s.size * sx}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji, s.x * sx, s.y * sy);
    });

    // Draw text
    textOverlays.forEach((t) => {
      ctx.save();
      ctx.font = `${t.size * sx}px ${t.font}`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4 * sx;
      ctx.fillText(t.text, t.x * sx, t.y * sy);
      ctx.restore();
    });

    const dataUrl = captureCanvas.toDataURL('image/png');
    setCapturedPhotos((prev) => [...prev, { id: Date.now(), dataUrl }]);
  }

  function downloadPhoto(dataUrl, index) {
    const link = document.createElement('a');
    link.download = `photobooth_${index + 1}.png`;
    link.href = dataUrl;
    link.click();
  }

  function deletePhoto(id) {
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const currentFilter = FILTERS.find((f) => f.id === selectedFilter)?.css || 'none';

  // Permission request / denied UI
  if (cameraStatus === 'requesting') {
    return (
      <div style={styles.permPage}>
        <div style={styles.permCard}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📸</div>
          <h2 style={{ fontFamily: '"Dancing Script", cursive', fontSize: 28, color: '#e91e8c', margin: '0 0 12px' }}>
            Photo Booth
          </h2>
          <p style={{ color: '#b0b0cc', marginBottom: 20, fontSize: 15 }}>
            We need camera access to start the fun!
          </p>
          <div style={styles.permSpinner} />
          <p style={{ color: '#777', fontSize: 13, marginTop: 16 }}>Waiting for permission...</p>
        </div>
      </div>
    );
  }

  if (cameraStatus === 'denied') {
    return (
      <div style={styles.permPage}>
        <div style={styles.permCard}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontFamily: '"Dancing Script", cursive', fontSize: 28, color: '#e91e8c', margin: '0 0 12px' }}>
            Camera Access Denied
          </h2>
          <p style={{ color: '#b0b0cc', marginBottom: 20, fontSize: 15, lineHeight: 1.6 }}>
            Please allow camera access in your browser settings to use the Photo Booth.
          </p>
          <Link href="/" style={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <Link href="/" style={styles.backBtn}>←</Link>
        <h1 style={styles.title}>Photo Booth</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Camera Area */}
      <div style={styles.cameraWrapper}>
        <div
          ref={containerRef}
          style={styles.cameraContainer}
          onMouseMove={dragging ? handlePointerMove : undefined}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              ...styles.video,
              filter: currentFilter,
            }}
          />
          <canvas
            ref={canvasRef}
            width={videoDims.w}
            height={videoDims.h}
            style={styles.overlayCanvas}
          />

          {/* Draggable stickers */}
          {stickers.map((s, i) => (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                left: s.x - s.size / 2,
                top: s.y - s.size / 2,
                fontSize: s.size,
                lineHeight: 1,
                cursor: dragging?.index === i && dragging?.type === 'sticker' ? 'grabbing' : 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
                zIndex: 10,
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => handlePointerDown(e, 'sticker', i)}
              onTouchStart={(e) => handlePointerDown(e, 'sticker', i)}
              onClick={(e) => {
                if (!dragging) removeSticker(i);
              }}
            >
              {s.emoji}
            </div>
          ))}

          {/* Draggable text overlays (visual handles) */}
          {textOverlays.map((t, i) => (
            <div
              key={t.id}
              style={{
                position: 'absolute',
                left: t.x,
                top: t.y,
                transform: 'translate(-50%, -50%)',
                font: `${t.size}px ${t.font}`,
                color: t.color,
                textShadow: '1px 1px 4px rgba(0,0,0,0.6)',
                cursor: dragging?.index === i && dragging?.type === 'text' ? 'grabbing' : 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
                zIndex: 10,
                pointerEvents: 'auto',
                whiteSpace: 'nowrap',
              }}
              onMouseDown={(e) => handlePointerDown(e, 'text', i)}
              onTouchStart={(e) => handlePointerDown(e, 'text', i)}
              onDoubleClick={() => removeTextOverlay(i)}
            >
              {t.text}
            </div>
          ))}

          {/* Flash effect */}
          {flashActive && <div style={styles.flash} />}
        </div>
      </div>

      {/* Capture Button */}
      <div style={styles.captureRow}>
        <button style={styles.captureBtn} onClick={capturePhoto} disabled={capturedPhotos.length >= 10}>
          <span style={{ fontSize: 28 }}>📸</span>
        </button>
        {capturedPhotos.length >= 10 && (
          <span style={{ color: '#e91e8c', fontSize: 12, marginTop: 4 }}>Max 10 photos</span>
        )}
      </div>

      {/* Photo Strip */}
      {capturedPhotos.length > 0 && (
        <div style={styles.stripContainer}>
          <div style={styles.stripScroll}>
            {capturedPhotos.map((photo, i) => (
              <div key={photo.id} style={styles.stripItem}>
                <img src={photo.dataUrl} alt={`Capture ${i + 1}`} style={styles.stripImg} />
                <div style={styles.stripActions}>
                  <button style={styles.stripBtn} onClick={() => downloadPhoto(photo.dataUrl, i)} title="Save">
                    💾
                  </button>
                  <button style={styles.stripBtn} onClick={() => deletePhoto(photo.id)} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel Toggle */}
      <button style={styles.panelToggle} onClick={() => setPanelOpen(!panelOpen)}>
        {panelOpen ? '▼ Hide Controls' : '▲ Show Controls'}
      </button>

      {/* Bottom Panel */}
      {panelOpen && (
        <div style={styles.panel}>
          {/* Tabs */}
          <div style={styles.tabs}>
            {['frames', 'stickers', 'filters', 'text'].map((tab) => (
              <button
                key={tab}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'frames' && '🖼️ '}
                {tab === 'stickers' && '😊 '}
                {tab === 'filters' && '🎨 '}
                {tab === 'text' && '✏️ '}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>
            {activeTab === 'frames' && (
              <div style={styles.gridRow}>
                {FRAMES.map((f) => (
                  <button
                    key={f.id}
                    style={{
                      ...styles.optionBtn,
                      ...(selectedFrame === f.id ? styles.optionBtnActive : {}),
                    }}
                    onClick={() => setSelectedFrame(f.id)}
                  >
                    <span style={{ fontSize: 24 }}>{f.icon}</span>
                    <span style={{ fontSize: 11, marginTop: 4 }}>{f.label}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'stickers' && (
              <div>
                <p style={{ color: '#888', fontSize: 12, margin: '0 0 8px', textAlign: 'center' }}>
                  Tap to add. Drag to move. Click placed sticker to remove.
                </p>
                <div style={styles.gridRow}>
                  {STICKER_LIST.map((emoji, i) => (
                    <button
                      key={i}
                      style={styles.stickerBtn}
                      onClick={() => addSticker(emoji, i)}
                    >
                      <span style={{ fontSize: 28 }}>{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'filters' && (
              <div style={styles.gridRow}>
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    style={{
                      ...styles.optionBtn,
                      ...(selectedFilter === f.id ? styles.optionBtnActive : {}),
                    }}
                    onClick={() => setSelectedFilter(f.id)}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                        filter: f.css,
                        marginBottom: 4,
                      }}
                    />
                    <span style={{ fontSize: 11 }}>{f.label}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'text' && (
              <div style={styles.textPanel}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your text..."
                    maxLength={40}
                    style={styles.textInput}
                  />
                  <button style={styles.addTextBtn} onClick={addTextOverlay}>
                    Add
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ color: '#b0b0cc', fontSize: 12 }}>Font:</label>
                  <select
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                    style={styles.select}
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>{f.split(',')[0]}</option>
                    ))}
                  </select>

                  <label style={{ color: '#b0b0cc', fontSize: 12 }}>Size:</label>
                  <input
                    type="range"
                    min={14}
                    max={56}
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    style={{ width: 80, accentColor: '#e91e8c' }}
                  />
                  <span style={{ color: '#b388ff', fontSize: 12 }}>{textSize}px</span>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ color: '#b0b0cc', fontSize: 12 }}>Color:</label>
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setTextColor(c.value)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: c.value,
                        border: textColor === c.value ? '3px solid #e91e8c' : '2px solid #333',
                        cursor: 'pointer',
                        boxShadow: textColor === c.value ? '0 0 8px #e91e8c' : 'none',
                      }}
                      title={c.label}
                    />
                  ))}
                </div>

                {textOverlays.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ color: '#888', fontSize: 11, margin: '0 0 6px' }}>
                      Drag text to reposition. Double-click to remove.
                    </p>
                    {textOverlays.map((t, i) => (
                      <div key={t.id} style={styles.textListItem}>
                        <span style={{ color: t.color, fontFamily: t.font, fontSize: 14 }}>"{t.text}"</span>
                        <button style={styles.textRemoveBtn} onClick={() => removeTextOverlay(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#07071a',
    color: '#fff',
    fontFamily: '"Inter", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 20,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    padding: '12px 16px',
  },
  backBtn: {
    color: '#b388ff',
    textDecoration: 'none',
    fontSize: 24,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(179, 136, 255, 0.1)',
  },
  title: {
    fontFamily: '"Dancing Script", cursive',
    fontSize: 26,
    background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  cameraWrapper: {
    width: '100%',
    maxWidth: 400,
    padding: '0 8px',
    boxSizing: 'border-box',
  },
  cameraContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '3 / 4',
    borderRadius: 16,
    overflow: 'hidden',
    border: '2px solid rgba(179, 136, 255, 0.3)',
    background: '#000',
    boxShadow: '0 0 30px rgba(233, 30, 140, 0.15)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    display: 'block',
  },
  overlayCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 5,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(255,255,255,0.85)',
    zIndex: 50,
    animation: 'flashFade 0.25s ease-out forwards',
    pointerEvents: 'none',
  },
  captureRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '14px 0 8px',
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.3)',
    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(233, 30, 140, 0.4)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  stripContainer: {
    width: '100%',
    maxWidth: 440,
    padding: '0 8px',
    boxSizing: 'border-box',
    marginBottom: 8,
  },
  stripScroll: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    padding: '8px 0',
    scrollbarWidth: 'thin',
    scrollbarColor: '#b388ff transparent',
  },
  stripItem: {
    flexShrink: 0,
    width: 80,
    borderRadius: 8,
    overflow: 'hidden',
    border: '2px solid rgba(179, 136, 255, 0.3)',
    background: '#111',
  },
  stripImg: {
    width: 80,
    height: 106,
    objectFit: 'cover',
    display: 'block',
  },
  stripActions: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '4px 0',
    background: 'rgba(7,7,26,0.9)',
  },
  stripBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: '2px 6px',
  },
  panelToggle: {
    background: 'rgba(179, 136, 255, 0.15)',
    color: '#b388ff',
    border: '1px solid rgba(179, 136, 255, 0.2)',
    borderRadius: 20,
    padding: '6px 20px',
    fontSize: 12,
    cursor: 'pointer',
    marginBottom: 6,
    fontFamily: '"Inter", sans-serif',
  },
  panel: {
    width: '100%',
    maxWidth: 440,
    background: 'rgba(20, 20, 50, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '20px 20px 0 0',
    border: '1px solid rgba(179, 136, 255, 0.2)',
    borderBottom: 'none',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(179, 136, 255, 0.15)',
  },
  tab: {
    flex: 1,
    padding: '10px 4px',
    background: 'none',
    border: 'none',
    color: '#777',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: '"Inter", sans-serif',
    transition: 'color 0.2s, border-bottom 0.2s',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#e91e8c',
    borderBottom: '2px solid #e91e8c',
  },
  tabContent: {
    padding: 14,
    maxHeight: '40vh',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#b388ff transparent',
  },
  gridRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  optionBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.08)',
    color: '#ccc',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: '"Inter", sans-serif',
  },
  optionBtnActive: {
    borderColor: '#e91e8c',
    background: 'rgba(233, 30, 140, 0.12)',
    color: '#fff',
    boxShadow: '0 0 12px rgba(233, 30, 140, 0.25)',
  },
  stickerBtn: {
    width: 52,
    height: 52,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s',
  },
  textPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  textInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(179, 136, 255, 0.3)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    fontFamily: '"Inter", sans-serif',
    outline: 'none',
  },
  addTextBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: '"Inter", sans-serif',
    fontWeight: 600,
  },
  select: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid rgba(179, 136, 255, 0.3)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 12,
    fontFamily: '"Inter", sans-serif',
    outline: 'none',
  },
  textListItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    marginBottom: 4,
  },
  textRemoveBtn: {
    background: 'none',
    border: 'none',
    color: '#e91e8c',
    fontSize: 16,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  permPage: {
    minHeight: '100vh',
    background: '#07071a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permCard: {
    background: 'rgba(20, 20, 50, 0.8)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(179, 136, 255, 0.2)',
    borderRadius: 24,
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
  },
  permSpinner: {
    width: 32,
    height: 32,
    border: '3px solid rgba(179, 136, 255, 0.2)',
    borderTopColor: '#e91e8c',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.8s linear infinite',
  },
  backLink: {
    color: '#b388ff',
    textDecoration: 'none',
    fontSize: 15,
    fontFamily: '"Inter", sans-serif',
    padding: '10px 24px',
    borderRadius: 8,
    background: 'rgba(179, 136, 255, 0.1)',
    display: 'inline-block',
  },
};

// Global styles for animations
if (typeof document !== 'undefined') {
  const styleId = 'photobooth-keyframes';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes flashFade {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(styleEl);
  }
}
