'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ──────────────────────────────────────────────
   Filter definitions
   ────────────────────────────────────────────── */
const FILTERS = [
  { id: 'none', emoji: '🚫', label: 'None' },
  { id: 'dog', emoji: '🐶', label: 'Dog' },
  { id: 'glasses', emoji: '🕶️', label: 'Glasses' },
  { id: 'hat', emoji: '🎩', label: 'Hat' },
  { id: 'mustache', emoji: '🥸', label: 'Mustache' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { id: 'hearts', emoji: '😍', label: 'Hearts' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'blush', emoji: '🥰', label: 'Blush' },
  { id: 'sparkles', emoji: '✨', label: 'Sparkles' },
  { id: 'cat', emoji: '🐱', label: 'Cat' },
];

/* ──────────────────────────────────────────────
   Skin-tone fallback face detector
   ────────────────────────────────────────────── */
function detectFaceBySkinTone(ctx, w, h) {
  // Sample center region for skin-tone pixels
  const margin = 0.15;
  const sx = Math.floor(w * margin);
  const sy = Math.floor(h * 0.05);
  const sw = Math.floor(w * (1 - 2 * margin));
  const sh = Math.floor(h * 0.9);
  let imgData;
  try {
    imgData = ctx.getImageData(sx, sy, sw, sh);
  } catch {
    return null;
  }
  const d = imgData.data;

  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  let skinCount = 0;
  const step = 4; // sample every 4th pixel for speed

  for (let y = 0; y < sh; y += step) {
    for (let x = 0; x < sw; x += step) {
      const i = (y * sw + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // Skin-tone heuristic (works for a range of skin tones)
      if (
        r > 80 && g > 40 && b > 20 &&
        r > g && r > b &&
        (r - g) > 10 &&
        Math.abs(r - g) < 130 &&
        r - b > 20 &&
        g - b > -10
      ) {
        skinCount++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Need at least some skin pixels
  const totalSampled = (sw / step) * (sh / step);
  if (skinCount < totalSampled * 0.04) return null;

  // Convert back to full-image coords
  const fx = sx + minX;
  const fy = sy + minY;
  const fw = maxX - minX;
  const fh = maxY - minY;

  if (fw < 40 || fh < 40) return null;

  // Trim to more face-like proportions (usually taller than wide)
  const cx = fx + fw / 2;
  const cy = fy + fh / 2;
  const faceW = fw * 0.75;
  const faceH = fh * 0.85;

  return {
    x: cx - faceW / 2,
    y: cy - faceH / 2,
    width: faceW,
    height: faceH,
  };
}

/* ──────────────────────────────────────────────
   Canvas drawing helpers for CSS-drawn filters
   ────────────────────────────────────────────── */
function drawHeart(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx, cy, cx - s * 0.5, cy - s * 0.3, cx - s * 0.5, cy);
  ctx.bezierCurveTo(cx - s * 0.5, cy + s * 0.3, cx, cy + s * 0.55, cx, cy + s * 0.7);
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx, cy, cx + s * 0.5, cy - s * 0.3, cx + s * 0.5, cy);
  ctx.bezierCurveTo(cx + s * 0.5, cy + s * 0.3, cx, cy + s * 0.55, cx, cy + s * 0.7);
  ctx.fill();
  ctx.restore();
}

function drawCrown(ctx, cx, cy, faceW) {
  const w = faceW * 1.0;
  const h = faceW * 0.45;
  const x = cx - w / 2;
  const y = cy - h;

  ctx.save();
  // Crown body
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ffd700');
  grad.addColorStop(1, '#daa520');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.35);
  ctx.lineTo(x + w * 0.15, y + h * 0.6);
  ctx.lineTo(x + w * 0.3, y);
  ctx.lineTo(x + w * 0.5, y + h * 0.45);
  ctx.lineTo(x + w * 0.7, y);
  ctx.lineTo(x + w * 0.85, y + h * 0.6);
  ctx.lineTo(x + w, y + h * 0.35);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // Gold outline
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Jewels
  const jewels = [
    { px: 0.3, py: 0.3, c: '#e91e8c' },
    { px: 0.5, py: 0.55, c: '#b388ff' },
    { px: 0.7, py: 0.3, c: '#e91e8c' },
  ];
  jewels.forEach(j => {
    ctx.beginPath();
    ctx.arc(x + w * j.px, y + h * j.py, faceW * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = j.c;
    ctx.fill();
    ctx.strokeStyle = '#fff8';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Band at bottom
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(x + 2, y + h - h * 0.12, w - 4, h * 0.12);

  ctx.restore();
}

function drawCatWhiskers(ctx, noseX, noseY, faceW, eyeY) {
  ctx.save();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = Math.max(1.5, faceW * 0.008);
  ctx.lineCap = 'round';

  const whiskerLen = faceW * 0.45;
  const whiskerSpreadY = faceW * 0.06;

  // Left whiskers
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(noseX - faceW * 0.08, noseY + i * whiskerSpreadY);
    ctx.lineTo(noseX - whiskerLen, noseY + i * whiskerSpreadY * 1.8 - faceW * 0.02);
    ctx.stroke();
  }
  // Right whiskers
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(noseX + faceW * 0.08, noseY + i * whiskerSpreadY);
    ctx.lineTo(noseX + whiskerLen, noseY + i * whiskerSpreadY * 1.8 - faceW * 0.02);
    ctx.stroke();
  }

  // Cat ears
  const earH = faceW * 0.35;
  const earW = faceW * 0.25;
  const earTopY = eyeY - faceW * 0.55;

  // Left ear
  ctx.beginPath();
  ctx.moveTo(noseX - faceW * 0.32, eyeY - faceW * 0.2);
  ctx.lineTo(noseX - faceW * 0.22, earTopY);
  ctx.lineTo(noseX - faceW * 0.05, eyeY - faceW * 0.15);
  ctx.closePath();
  ctx.fillStyle = '#444';
  ctx.fill();
  // Inner ear
  ctx.beginPath();
  ctx.moveTo(noseX - faceW * 0.28, eyeY - faceW * 0.18);
  ctx.lineTo(noseX - faceW * 0.22, earTopY + earH * 0.25);
  ctx.lineTo(noseX - faceW * 0.1, eyeY - faceW * 0.14);
  ctx.closePath();
  ctx.fillStyle = '#e91e8c88';
  ctx.fill();

  // Right ear
  ctx.beginPath();
  ctx.moveTo(noseX + faceW * 0.32, eyeY - faceW * 0.2);
  ctx.lineTo(noseX + faceW * 0.22, earTopY);
  ctx.lineTo(noseX + faceW * 0.05, eyeY - faceW * 0.15);
  ctx.closePath();
  ctx.fillStyle = '#444';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(noseX + faceW * 0.28, eyeY - faceW * 0.18);
  ctx.lineTo(noseX + faceW * 0.22, earTopY + earH * 0.25);
  ctx.lineTo(noseX + faceW * 0.1, eyeY - faceW * 0.14);
  ctx.closePath();
  ctx.fillStyle = '#e91e8c88';
  ctx.fill();

  // Small nose triangle
  ctx.beginPath();
  ctx.moveTo(noseX, noseY - faceW * 0.02);
  ctx.lineTo(noseX - faceW * 0.03, noseY + faceW * 0.02);
  ctx.lineTo(noseX + faceW * 0.03, noseY + faceW * 0.02);
  ctx.closePath();
  ctx.fillStyle = '#e91e8c';
  ctx.fill();

  ctx.restore();
}

/* ──────────────────────────────────────────────
   Sparkle particle class
   ────────────────────────────────────────────── */
class Sparkle {
  constructor(cx, cy, spread) {
    this.reset(cx, cy, spread);
  }
  reset(cx, cy, spread) {
    this.x = cx + (Math.random() - 0.5) * spread;
    this.y = cy + (Math.random() - 0.5) * spread;
    this.size = Math.random() * 4 + 2;
    this.opacity = Math.random() * 0.7 + 0.3;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = -Math.random() * 2 - 0.5;
    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.008;
    this.rotation = Math.random() * Math.PI * 2;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.rotation += 0.05;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.life * this.opacity;
    const s = this.size;
    // 4-point star
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.25, -s * 0.25);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.25, s * 0.25);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.25, s * 0.25);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.25, -s * 0.25);
    ctx.closePath();
    ctx.fill();
    // White center
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ──────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────── */
export default function FaceFiltersPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const rafRef = useRef(null);
  const frameCountRef = useRef(0);
  const faceBoxRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const spritesRef = useRef({});
  const sparklesRef = useRef([]);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [capturedImage, setCapturedImage] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  /* Load sprite images */
  useEffect(() => {
    const spriteFiles = {
      doggy_ears: '/filters/doggy_ears.png',
      doggy_nose: '/filters/doggy_nose.png',
      doggy_tongue: '/filters/doggy_tongue.png',
      glasses: '/filters/glasses.png',
      hat: '/filters/hat.png',
      mustache: '/filters/mustache.png',
      rainbow: '/filters/rainbow.png',
    };
    Object.entries(spriteFiles).forEach(([key, src]) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      spritesRef.current[key] = img;
    });
  }, []);

  /* Initialize FaceDetector if available */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        faceDetectorRef.current = null;
      }
    }
  }, []);

  /* Start camera */
  const startCamera = useCallback(async () => {
    setRequesting(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 533 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser settings.'
          : 'Could not access the camera. Make sure no other app is using it.'
      );
    } finally {
      setRequesting(false);
    }
  }, []);

  /* Stop camera on unmount */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ── Rendering loop ── */
  useEffect(() => {
    if (!cameraReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = async () => {
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (canvas.width !== vw) canvas.width = vw;
      if (canvas.height !== vh) canvas.height = vh;

      // Draw mirrored video
      ctx.save();
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.restore();

      // Face detection every 3rd frame
      frameCountRef.current++;
      if (frameCountRef.current % 3 === 0) {
        let detected = null;

        if (faceDetectorRef.current) {
          try {
            const faces = await faceDetectorRef.current.detect(canvas);
            if (faces.length > 0) {
              const bb = faces[0].boundingBox;
              detected = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
            }
          } catch {
            // Fall through to color-based
          }
        }

        if (!detected) {
          detected = detectFaceBySkinTone(ctx, vw, vh);
        }

        faceBoxRef.current = detected;
        setFaceDetected(!!detected);
      }

      // Draw filters if face found
      const face = faceBoxRef.current;
      if (face && activeFilters.size > 0) {
        const fx = face.x;
        const fy = face.y;
        const fw = face.width;
        const fh = face.height;

        // Landmarks
        const foreheadX = fx + fw / 2;
        const foreheadY = fy - fh * 0.1;
        const eyeLeftX = fx + fw * 0.3;
        const eyeRightX = fx + fw * 0.7;
        const eyeY = fy + fh * 0.3;
        const noseX = fx + fw / 2;
        const noseY = fy + fh * 0.55;
        const mouthX = fx + fw / 2;
        const mouthY = fy + fh * 0.75;
        const cheekLeftX = fx + fw * 0.2;
        const cheekRightX = fx + fw * 0.8;
        const cheekY = fy + fh * 0.5;

        const sprites = spritesRef.current;

        // Helper to draw a sprite centered at a point
        const drawSprite = (img, cx, cy, w, h) => {
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
          }
        };

        // Dog filter
        if (activeFilters.has('dog')) {
          const earW = fw * 1.1;
          const earH = earW * (sprites.doggy_ears?.naturalHeight / sprites.doggy_ears?.naturalWidth || 0.6);
          drawSprite(sprites.doggy_ears, foreheadX, foreheadY - earH * 0.25, earW, earH);

          const noseW = fw * 0.35;
          const noseH = noseW * (sprites.doggy_nose?.naturalHeight / sprites.doggy_nose?.naturalWidth || 1);
          drawSprite(sprites.doggy_nose, noseX, noseY, noseW, noseH);

          const tongueW = fw * 0.35;
          const tongueH = tongueW * (sprites.doggy_tongue?.naturalHeight / sprites.doggy_tongue?.naturalWidth || 1.2);
          drawSprite(sprites.doggy_tongue, mouthX, mouthY + tongueH * 0.35, tongueW, tongueH);
        }

        // Glasses
        if (activeFilters.has('glasses')) {
          const glassW = fw * 1.05;
          const glassH = glassW * (sprites.glasses?.naturalHeight / sprites.glasses?.naturalWidth || 0.4);
          drawSprite(sprites.glasses, foreheadX, eyeY, glassW, glassH);
        }

        // Hat
        if (activeFilters.has('hat')) {
          const hatW = fw * 1.2;
          const hatH = hatW * (sprites.hat?.naturalHeight / sprites.hat?.naturalWidth || 0.8);
          drawSprite(sprites.hat, foreheadX, foreheadY - hatH * 0.3, hatW, hatH);
        }

        // Mustache
        if (activeFilters.has('mustache')) {
          const mustW = fw * 0.45;
          const mustH = mustW * (sprites.mustache?.naturalHeight / sprites.mustache?.naturalWidth || 0.5);
          drawSprite(sprites.mustache, mouthX, mouthY - fh * 0.05, mustW, mustH);
        }

        // Rainbow
        if (activeFilters.has('rainbow')) {
          const rbW = fw * 0.7;
          const rbH = rbW * (sprites.rainbow?.naturalHeight / sprites.rainbow?.naturalWidth || 1.2);
          drawSprite(sprites.rainbow, mouthX, mouthY + rbH * 0.3, rbW, rbH);
        }

        // Hearts Eyes
        if (activeFilters.has('hearts')) {
          const heartSize = fw * 0.15;
          drawHeart(ctx, eyeLeftX, eyeY, heartSize, '#e91e8c');
          drawHeart(ctx, eyeRightX, eyeY, heartSize, '#e91e8c');
        }

        // Crown
        if (activeFilters.has('crown')) {
          drawCrown(ctx, foreheadX, foreheadY - fh * 0.05, fw);
        }

        // Blush
        if (activeFilters.has('blush')) {
          const blushR = fw * 0.1;
          ctx.save();
          ctx.globalAlpha = 0.35;
          const gL = ctx.createRadialGradient(cheekLeftX, cheekY, 0, cheekLeftX, cheekY, blushR);
          gL.addColorStop(0, '#e91e8c');
          gL.addColorStop(1, 'transparent');
          ctx.fillStyle = gL;
          ctx.beginPath();
          ctx.arc(cheekLeftX, cheekY, blushR, 0, Math.PI * 2);
          ctx.fill();

          const gR = ctx.createRadialGradient(cheekRightX, cheekY, 0, cheekRightX, cheekY, blushR);
          gR.addColorStop(0, '#e91e8c');
          gR.addColorStop(1, 'transparent');
          ctx.fillStyle = gR;
          ctx.beginPath();
          ctx.arc(cheekRightX, cheekY, blushR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Sparkles
        if (activeFilters.has('sparkles')) {
          const sp = sparklesRef.current;
          // Add new sparkles
          if (sp.length < 35) {
            sp.push(new Sparkle(foreheadX, foreheadY, fw * 1.5));
          }
          for (let i = sp.length - 1; i >= 0; i--) {
            sp[i].update();
            sp[i].draw(ctx);
            if (sp[i].life <= 0) {
              sp[i].reset(foreheadX, foreheadY, fw * 1.5);
            }
          }
        }

        // Cat whiskers
        if (activeFilters.has('cat')) {
          drawCatWhiskers(ctx, noseX, noseY, fw, eyeY);
        }
      } else if (activeFilters.has('sparkles')) {
        // Keep sparkles alive even without face, scattered in center
        const sp = sparklesRef.current;
        if (sp.length < 20) sp.push(new Sparkle(vw / 2, vh / 3, vw * 0.6));
        for (let i = sp.length - 1; i >= 0; i--) {
          sp[i].update();
          sp[i].draw(ctx);
          if (sp[i].life <= 0) sp[i].reset(vw / 2, vh / 3, vw * 0.6);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cameraReady, activeFilters]);

  /* Toggle a filter */
  const toggleFilter = useCallback((id) => {
    if (id === 'none') {
      setActiveFilters(new Set());
      sparklesRef.current = [];
      return;
    }
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (id === 'sparkles') sparklesRef.current = [];
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /* Capture composited frame */
  const capturePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    // Create offscreen canvas to get non-mirrored capture
    const oc = document.createElement('canvas');
    oc.width = canvas.width;
    oc.height = canvas.height;
    const octx = oc.getContext('2d');
    octx.drawImage(canvas, 0, 0);
    setCapturedImage(oc.toDataURL('image/png'));
  }, []);

  /* Save captured image */
  const saveImage = useCallback(() => {
    if (!capturedImage) return;
    const a = document.createElement('a');
    a.href = capturedImage;
    a.download = `face-filter-${Date.now()}.png`;
    a.click();
  }, [capturedImage]);

  /* ── Styles ── */
  const colors = {
    bg: '#07071a',
    pink: '#e91e8c',
    purple: '#b388ff',
    card: 'rgba(255,255,255,0.04)',
    text: '#fff',
    muted: 'rgba(255,255,255,0.5)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      color: colors.text,
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 16px 40px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Back link */}
      <Link href="/" style={{
        position: 'absolute',
        top: 18,
        left: 18,
        color: colors.pink,
        textDecoration: 'none',
        fontSize: 14,
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity: 0.8,
        zIndex: 20,
      }}>
        ← Back
      </Link>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: 'clamp(28px, 6vw, 42px)',
        background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '10px 0 8px',
        textAlign: 'center',
      }}>
        Face Filters 🎭
      </h1>

      <p style={{
        color: colors.muted,
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
      }}>
        {cameraReady
          ? (faceDetected ? 'Face detected! Pick some filters below.' : 'Looking for your face... make sure you are well-lit.')
          : 'Start the camera to begin!'
        }
      </p>

      {/* Camera area */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 400,
        aspectRatio: '3/4',
        borderRadius: 20,
        overflow: 'hidden',
        background: '#111',
        border: `2px solid ${colors.pink}33`,
        boxShadow: `0 0 40px ${colors.pink}22`,
      }}>
        {/* Video (hidden behind canvas) */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            opacity: 0,
          }}
        />

        {/* Canvas overlay */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Flash effect */}
        {flashActive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#fff',
            opacity: 0.8,
            zIndex: 10,
            pointerEvents: 'none',
            borderRadius: 20,
          }} />
        )}

        {/* Camera not started overlay */}
        {!cameraReady && !cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(7,7,26,0.9)',
            zIndex: 5,
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📷</div>
            <p style={{ color: colors.muted, fontSize: 14, marginBottom: 20, textAlign: 'center', padding: '0 20px' }}>
              We need camera access to apply fun filters on your face!
            </p>
            <button
              onClick={startCamera}
              disabled={requesting}
              style={{
                padding: '12px 32px',
                borderRadius: 30,
                border: 'none',
                background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: requesting ? 'wait' : 'pointer',
                opacity: requesting ? 0.6 : 1,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {requesting ? 'Requesting...' : 'Start Camera'}
            </button>
          </div>
        )}

        {/* Camera error overlay */}
        {cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(7,7,26,0.95)',
            zIndex: 5,
            padding: 24,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <p style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
              {cameraError}
            </p>
            <button
              onClick={startCamera}
              style={{
                marginTop: 16,
                padding: '10px 24px',
                borderRadius: 20,
                border: `1px solid ${colors.pink}`,
                background: 'transparent',
                color: colors.pink,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Filter selector */}
      {cameraReady && (
        <div style={{
          width: '100%',
          maxWidth: 440,
          marginTop: 20,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}>
          <div style={{
            display: 'flex',
            gap: 10,
            padding: '4px 8px',
            minWidth: 'max-content',
          }}>
            {FILTERS.map(f => {
              const isActive = f.id === 'none' ? activeFilters.size === 0 : activeFilters.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  title={f.label}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: isActive ? `2.5px solid ${colors.pink}` : '2px solid rgba(255,255,255,0.12)',
                    background: isActive ? `${colors.pink}22` : 'rgba(255,255,255,0.05)',
                    boxShadow: isActive ? `0 0 14px ${colors.pink}66` : 'none',
                    cursor: 'pointer',
                    fontSize: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {f.emoji}
                </button>
              );
            })}
          </div>
          {/* Labels under the scroll */}
          <div style={{
            display: 'flex',
            gap: 10,
            padding: '4px 8px 0',
            minWidth: 'max-content',
          }}>
            {FILTERS.map(f => (
              <div key={f.id} style={{
                width: 56,
                textAlign: 'center',
                fontSize: 10,
                color: colors.muted,
                flexShrink: 0,
              }}>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capture button */}
      {cameraReady && (
        <button
          onClick={capturePhoto}
          style={{
            marginTop: 22,
            width: 68,
            height: 68,
            borderRadius: '50%',
            border: `4px solid ${colors.pink}`,
            background: `radial-gradient(circle, ${colors.pink}44 0%, transparent 70%)`,
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${colors.pink}44`,
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`,
          }} />
        </button>
      )}
      {cameraReady && (
        <span style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>Tap to capture</span>
      )}

      {/* Captured image preview modal */}
      {capturedImage && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backdropFilter: 'blur(8px)',
        }}>
          <img
            src={capturedImage}
            alt="Captured"
            style={{
              maxWidth: '90%',
              maxHeight: '60vh',
              borderRadius: 16,
              border: `2px solid ${colors.pink}44`,
              boxShadow: `0 0 30px ${colors.pink}33`,
            }}
          />
          <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
            <button
              onClick={saveImage}
              style={{
                padding: '12px 28px',
                borderRadius: 30,
                border: 'none',
                background: `linear-gradient(135deg, ${colors.pink}, ${colors.purple})`,
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Save to Device
            </button>
            <button
              onClick={() => setCapturedImage(null)}
              style={{
                padding: '12px 28px',
                borderRadius: 30,
                border: `1px solid ${colors.muted}`,
                background: 'transparent',
                color: '#fff',
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hide scrollbar CSS */}
      <style>{`
        ::-webkit-scrollbar { display: none; }
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600&display=swap');
      `}</style>
    </div>
  );
}
