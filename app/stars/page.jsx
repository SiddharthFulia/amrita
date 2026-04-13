'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ─── constants ─── */
const BG = '#07071a';
const PINK = '#e91e8c';
const PURPLE = '#b388ff';
const FONT_TITLE = "'Dancing Script', cursive";
const FONT_BODY = "'Inter', sans-serif";

const SPECIAL_DATES = [
  { title: 'First Conversation', date: '2025-10-29', emoji: '💬', desc: 'The first words that changed everything. Two strangers became something more.', color: '#4fc3f7' },
  { title: 'The Day We Met', date: '2025-10-31', emoji: '💫', desc: 'Halloween night — but the real magic was meeting you in person for the first time.', color: '#ff9800' },
  { title: 'She Asked Me To Be Her BF', date: '2025-11-09', emoji: '💕', desc: 'She asked. He said yes. And the rest is history being written every single day.', color: '#e91e8c' },
];

const QUOTES = [
  '"I have loved the stars too fondly to be fearful of the night."',
  '"We are all made of star-stuff." — Carl Sagan',
  '"The stars lean down to kiss you, and I lie awake and miss you."',
  '"You are my sun, my moon, and all of my stars." — E.E. Cummings',
  '"Look at the stars, look how they shine for you."',
  '"Somewhere, something incredible is waiting to be known." — Carl Sagan',
  '"I could lay next to you and map the constellations in your eyes."',
  '"She wasn\'t the moon — she was the whole damn sky."',
  '"We were written in the stars, my love."',
  '"Every star is a mirror reflecting a truth inside you."',
  '"Two souls don\'t find each other by simple accident."',
  '"The universe conspired to bring us together."',
  '"Even the darkest night will end and the stars will shine again."',
  '"I\'d choose you in a hundred lifetimes, in a hundred worlds, in any version of reality."',
  '"The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself."',
];

/* ─── constellation data (normalised 0–1 coords) ─── */
const CONSTELLATIONS = [
  {
    name: 'Orion',
    stars: [[0.42,0.30],[0.45,0.33],[0.48,0.30],[0.45,0.38],[0.43,0.42],[0.45,0.45],[0.47,0.42],[0.40,0.50],[0.50,0.50],[0.44,0.26],[0.46,0.26]],
    lines: [[0,1],[1,2],[1,3],[3,4],[3,6],[4,5],[6,5],[4,7],[6,8],[9,0],[10,2]],
  },
  {
    name: 'Ursa Major',
    stars: [[0.15,0.18],[0.18,0.16],[0.22,0.15],[0.25,0.17],[0.27,0.20],[0.24,0.22],[0.20,0.21]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]],
  },
  {
    name: 'Cassiopeia',
    stars: [[0.62,0.12],[0.65,0.08],[0.68,0.13],[0.71,0.09],[0.74,0.14]],
    lines: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    name: 'Leo',
    stars: [[0.78,0.28],[0.82,0.25],[0.85,0.28],[0.83,0.32],[0.80,0.34],[0.78,0.32],[0.76,0.36]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[5,6]],
  },
  {
    name: 'Scorpius',
    stars: [[0.08,0.55],[0.10,0.58],[0.12,0.62],[0.11,0.66],[0.09,0.70],[0.07,0.73],[0.10,0.75],[0.13,0.73]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]],
  },
  {
    name: 'Gemini',
    stars: [[0.55,0.20],[0.58,0.18],[0.57,0.24],[0.60,0.22],[0.56,0.28],[0.59,0.27]],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,5],[2,3]],
  },
  {
    name: 'Taurus',
    stars: [[0.32,0.14],[0.35,0.12],[0.38,0.15],[0.34,0.18],[0.30,0.18],[0.37,0.10],[0.40,0.11]],
    lines: [[0,1],[1,2],[1,3],[3,4],[1,5],[5,6]],
  },
  {
    name: 'Cygnus',
    stars: [[0.88,0.12],[0.90,0.16],[0.92,0.20],[0.88,0.18],[0.94,0.18]],
    lines: [[0,1],[1,2],[1,3],[1,4]],
  },
];

/* ─── helpers ─── */
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function dateToDays(dateStr) {
  const d = new Date(dateStr);
  return Math.floor(d.getTime() / 86400000);
}

function getMoonPhase(dateStr) {
  const d = new Date(dateStr);
  const known = new Date('2000-01-06'); // known new moon
  const diff = (d - known) / 86400000;
  return ((diff % 29.53) + 29.53) % 29.53;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getQuote(dateStr) {
  const idx = dateToDays(dateStr) % QUOTES.length;
  return QUOTES[idx < 0 ? idx + QUOTES.length : idx];
}

/* ─── component ─── */
export default function StarsPage() {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const shootingRef = useRef(null);
  const lastShootRef = useRef(0);
  const starsDataRef = useRef([]);

  const [selectedDate, setSelectedDate] = useState('2025-10-29');
  const [customDate, setCustomDate] = useState('');
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 500 });

  /* generate background stars for the given date */
  const generateStars = useCallback((dateStr, w, h) => {
    const dayOffset = dateToDays(dateStr);
    const rand = seededRandom(Math.abs(dayOffset) + 1);
    const rotRad = ((dayOffset % 360) * Math.PI) / 180;
    const stars = [];
    for (let i = 0; i < 220; i++) {
      let bx = rand();
      let by = rand();
      // apply rotation offset around centre
      const cx = bx - 0.5;
      const cy = by - 0.5;
      bx = 0.5 + cx * Math.cos(rotRad) - cy * Math.sin(rotRad);
      by = 0.5 + cx * Math.sin(rotRad) + cy * Math.cos(rotRad);
      // wrap
      bx = ((bx % 1) + 1) % 1;
      by = ((by % 1) + 1) % 1;
      const size = rand() * 3 + 1;
      const brightness = rand() * 0.6 + 0.4;
      const twinkleSpeed = rand() * 2 + 1;
      const twinkleOffset = rand() * Math.PI * 2;
      // color tint
      const tint = rand();
      let color;
      if (tint < 0.7) color = [255, 248, 220]; // warm white
      else if (tint < 0.85) color = [180, 200, 255]; // bluish
      else color = [255, 200, 220]; // pinkish
      stars.push({ bx, by, size, brightness, twinkleSpeed, twinkleOffset, color });
    }
    return stars;
  }, []);

  /* resize handler */
  useEffect(() => {
    function onResize() {
      const w = Math.min(window.innerWidth - 32, 1200);
      setCanvasSize({ w, h: Math.min(500, w * 0.55) });
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* regenerate stars when date or canvas size changes */
  useEffect(() => {
    starsDataRef.current = generateStars(selectedDate, canvasSize.w, canvasSize.h);
  }, [selectedDate, canvasSize, generateStars]);

  /* main animation loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = canvasSize;
    canvas.width = w * 2; // retina
    canvas.height = h * 2;
    ctx.scale(2, 2);

    const dayOffset = dateToDays(selectedDate);
    const rotRad = ((dayOffset % 360) * Math.PI) / 180;
    const moonPhase = getMoonPhase(selectedDate);

    function draw(time) {
      const t = time / 1000;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const parallaxX = (mx - 0.5) * 12;
      const parallaxY = (my - 0.5) * 12;

      /* background gradient */
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#050518');
      bg.addColorStop(0.7, '#0a0a2e');
      bg.addColorStop(1, '#14143c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      /* horizon glow */
      const hg = ctx.createRadialGradient(w / 2, h + 30, 0, w / 2, h + 30, h * 0.7);
      hg.addColorStop(0, 'rgba(233,30,140,0.06)');
      hg.addColorStop(0.5, 'rgba(179,136,255,0.03)');
      hg.addColorStop(1, 'transparent');
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, w, h);

      /* stars */
      const stars = starsDataRef.current;
      for (const s of stars) {
        const x = s.bx * w + parallaxX;
        const y = s.by * (h - 40) + parallaxY;
        if (x < -5 || x > w + 5 || y < -5 || y > h - 20) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
        const alpha = s.brightness * (0.5 + 0.5 * twinkle);
        ctx.beginPath();
        ctx.arc(x, y, s.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${alpha})`;
        ctx.fill();
        // glow
        if (s.size > 2.5) {
          ctx.beginPath();
          ctx.arc(x, y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${alpha * 0.15})`;
          ctx.fill();
        }
      }

      /* constellations */
      for (const c of CONSTELLATIONS) {
        // offset constellation positions
        const pts = c.stars.map(([sx, sy]) => {
          const cx = sx - 0.5;
          const cy = sy - 0.5;
          let rx = 0.5 + cx * Math.cos(rotRad * 0.3) - cy * Math.sin(rotRad * 0.3);
          let ry = 0.5 + cx * Math.sin(rotRad * 0.3) + cy * Math.cos(rotRad * 0.3);
          rx = ((rx % 1) + 1) % 1;
          ry = ((ry % 1) + 1) % 1;
          return [rx * w + parallaxX, ry * (h - 40) + parallaxY];
        });

        // lines
        ctx.strokeStyle = 'rgba(233,30,140,0.18)';
        ctx.lineWidth = 0.8;
        for (const [a, b] of c.lines) {
          const dx = Math.abs(pts[a][0] - pts[b][0]);
          const dy = Math.abs(pts[a][1] - pts[b][1]);
          if (dx > w * 0.5 || dy > h * 0.5) continue; // skip wrap-around
          ctx.beginPath();
          ctx.moveTo(pts[a][0], pts[a][1]);
          ctx.lineTo(pts[b][0], pts[b][1]);
          ctx.stroke();
        }

        // constellation stars (brighter)
        for (const [px, py] of pts) {
          if (px < -5 || px > w + 5 || py < -5 || py > h) continue;
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,248,240,0.9)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,248,240,0.12)';
          ctx.fill();
        }

        // constellation name
        const avgX = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const avgY = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        if (avgX > 0 && avgX < w && avgY > 0 && avgY < h) {
          ctx.font = `10px ${FONT_BODY}`;
          ctx.fillStyle = 'rgba(179,136,255,0.4)';
          ctx.textAlign = 'center';
          ctx.fillText(c.name, avgX, avgY - 14);
        }
      }

      /* moon */
      const moonX = w * 0.82 + parallaxX * 0.5;
      const moonY = h * 0.15 + parallaxY * 0.5;
      const moonR = Math.min(22, w * 0.03);
      // glow
      const mg = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4);
      mg.addColorStop(0, 'rgba(255,250,230,0.12)');
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.fillRect(moonX - moonR * 5, moonY - moonR * 5, moonR * 10, moonR * 10);
      // disc
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fillStyle = '#fffde8';
      ctx.fill();
      // phase shadow
      const phaseAngle = (moonPhase / 29.53) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, -Math.PI / 2, Math.PI / 2, false);
      const bulge = Math.cos(phaseAngle) * moonR;
      ctx.bezierCurveTo(moonX + bulge, moonY + moonR * 0.55, moonX + bulge, moonY - moonR * 0.55, moonX, moonY - moonR);
      ctx.fillStyle = 'rgba(5,5,24,0.85)';
      ctx.fill();

      /* shooting star */
      if (t - lastShootRef.current > 10 + Math.random() * 5) {
        lastShootRef.current = t;
        shootingRef.current = {
          x: Math.random() * w * 0.6 + w * 0.1,
          y: Math.random() * h * 0.3,
          angle: Math.PI * 0.15 + Math.random() * 0.3,
          len: 80 + Math.random() * 60,
          start: t,
          dur: 0.6 + Math.random() * 0.3,
        };
      }
      if (shootingRef.current) {
        const ss = shootingRef.current;
        const progress = (t - ss.start) / ss.dur;
        if (progress >= 0 && progress <= 1) {
          const headX = ss.x + Math.cos(ss.angle) * ss.len * progress;
          const headY = ss.y + Math.sin(ss.angle) * ss.len * progress;
          const tailLen = ss.len * 0.4;
          const tailX = headX - Math.cos(ss.angle) * tailLen * Math.min(progress * 3, 1);
          const tailY = headY - Math.sin(ss.angle) * tailLen * Math.min(progress * 3, 1);
          const alpha = progress < 0.3 ? progress / 0.3 : (1 - progress) / 0.7;
          const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
          grad.addColorStop(0, `rgba(255,255,255,0)`);
          grad.addColorStop(1, `rgba(255,255,255,${alpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(headX, headY);
          ctx.stroke();
          // bright head
          ctx.beginPath();
          ctx.arc(headX, headY, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fill();
        } else if (progress > 1) {
          shootingRef.current = null;
        }
      }

      /* horizon line */
      const hl = ctx.createLinearGradient(0, h - 30, 0, h);
      hl.addColorStop(0, 'transparent');
      hl.addColorStop(1, 'rgba(20,20,60,0.8)');
      ctx.fillStyle = hl;
      ctx.fillRect(0, h - 30, w, 30);

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [selectedDate, canvasSize]);

  /* mouse move handler */
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  /* download canvas */
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `our-stars-${selectedDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [selectedDate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      color: '#fff',
      fontFamily: FONT_BODY,
      paddingBottom: 60,
    }}>
      {/* nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '18px 24px',
        gap: 16,
      }}>
        <Link href="/" style={{
          color: PURPLE,
          textDecoration: 'none',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          opacity: 0.8,
          transition: 'opacity 0.2s',
        }}>
          <span style={{ fontSize: 18 }}>←</span> Home
        </Link>
      </div>

      {/* header */}
      <div style={{ textAlign: 'center', padding: '10px 20px 30px' }}>
        <h1 style={{
          fontFamily: FONT_TITLE,
          fontSize: 'clamp(32px, 6vw, 52px)',
          background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          Our Star Map
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 15,
          marginTop: 8,
          maxWidth: 400,
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6,
        }}>
          The sky you were both under on the nights that mattered most
        </p>
      </div>

      {/* date cards */}
      <div style={{
        display: 'flex',
        gap: 12,
        padding: '0 24px 24px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {SPECIAL_DATES.map((item) => {
          const isActive = selectedDate === item.date;
          const itemColor = item.color || PINK;
          return (
            <button
              key={item.date}
              onClick={() => setSelectedDate(item.date)}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${itemColor}20, ${PURPLE}15)`
                  : 'rgba(255,255,255,0.03)',
                border: isActive
                  ? `1.5px solid ${itemColor}70`
                  : '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 18,
                padding: '18px 20px',
                cursor: 'pointer',
                color: '#fff',
                textAlign: 'left',
                minWidth: 200,
                maxWidth: 260,
                flexShrink: 0,
                transition: 'all 0.3s ease',
                transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isActive ? `0 8px 30px ${itemColor}20` : 'none',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  fontSize: 28, width: 44, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${itemColor}15`, borderRadius: 12,
                  border: `1px solid ${itemColor}30`,
                }}>{item.emoji}</div>
                <div>
                  <div style={{
                    fontFamily: FONT_TITLE, fontSize: 15, fontWeight: 700,
                    color: isActive ? itemColor : 'rgba(255,255,255,0.9)',
                  }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{formatDate(item.date)}</div>
                </div>
              </div>
              {item.desc && (
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  lineHeight: 1.5, fontStyle: 'italic',
                }}>{item.desc}</div>
              )}
            </button>
          );
        })}

        {/* custom date */}
        <div style={{
          background: customDate && selectedDate === customDate
            ? `linear-gradient(135deg, ${PINK}25, ${PURPLE}25)`
            : 'rgba(255,255,255,0.04)',
          border: customDate && selectedDate === customDate
            ? `1.5px solid ${PINK}60`
            : '1.5px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '14px 18px',
          minWidth: 150,
          flexShrink: 0,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>🔭</div>
          <div style={{
            fontFamily: FONT_TITLE,
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 8,
          }}>
            See the stars on any night
          </div>
          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid rgba(255,255,255,0.15)`,
              borderRadius: 8,
              color: '#fff',
              padding: '6px 10px',
              fontSize: 12,
              fontFamily: FONT_BODY,
              width: '100%',
              outline: 'none',
              cursor: 'pointer',
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* canvas */}
      <div style={{
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: `0 0 60px rgba(233,30,140,0.08), 0 0 120px rgba(179,136,255,0.05)`,
          position: 'relative',
          width: canvasSize.w,
        }}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { mouseRef.current = { x: 0.5, y: 0.5 }; }}
            style={{
              width: canvasSize.w,
              height: canvasSize.h,
              display: 'block',
              cursor: 'crosshair',
            }}
          />
        </div>
      </div>

      {/* info below canvas */}
      <div style={{
        textAlign: 'center',
        padding: '30px 20px 10px',
        maxWidth: 600,
        margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: FONT_TITLE,
          fontSize: 'clamp(24px, 5vw, 36px)',
          color: '#fff',
          margin: 0,
          fontWeight: 400,
        }}>
          {formatDate(selectedDate)}
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
          marginTop: 12,
          fontStyle: 'italic',
          lineHeight: 1.7,
        }}>
          {getQuote(selectedDate)}
        </p>

        <p style={{
          color: PURPLE,
          fontSize: 15,
          marginTop: 16,
          opacity: 0.7,
        }}>
          The sky you were both under that night ✨
        </p>

        {/* moon phase label */}
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 12,
          marginTop: 10,
        }}>
          Moon phase: {(() => {
            const phase = getMoonPhase(selectedDate);
            if (phase < 1.85) return '🌑 New Moon';
            if (phase < 7.38) return '🌒 Waxing Crescent';
            if (phase < 11.07) return '🌓 First Quarter';
            if (phase < 14.77) return '🌔 Waxing Gibbous';
            if (phase < 16.61) return '🌕 Full Moon';
            if (phase < 22.14) return '🌖 Waning Gibbous';
            if (phase < 25.84) return '🌗 Last Quarter';
            return '🌘 Waning Crescent';
          })()}
        </p>

        {/* Astrology Section */}
        <div style={{
          marginTop: 32, width: '100%', maxWidth: 500,
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
          padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: PURPLE, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
            ✨ Written in the Stars ✨
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{
              background: `${PINK}12`, border: `1px solid ${PINK}30`, borderRadius: 16,
              padding: '16px 20px', minWidth: 140, textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>♉</div>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 16, color: PINK, marginBottom: 2 }}>Amrita</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Taurus · May 12</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Earth sign · Loyal · Devoted</div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', fontSize: 24,
              color: '#ffd54f', alignSelf: 'center',
            }}>💕</div>
            <div style={{
              background: `${PURPLE}12`, border: `1px solid ${PURPLE}30`, borderRadius: 16,
              padding: '16px 20px', minWidth: 140, textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>♍</div>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 16, color: PURPLE, marginBottom: 2 }}>Siddharth</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Virgo · Sep 18</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Earth sign · Caring · Dedicated</div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(179,136,255,0.08))',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🌟</span>
              <span style={{
                fontSize: 13, fontWeight: 700,
                background: `linear-gradient(135deg, ${PINK}, #ffd54f)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>98% Compatibility</span>
              <span style={{ fontSize: 18 }}>🌟</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
              Taurus & Virgo — both Earth signs. One of the strongest matches in the zodiac.
              Grounded, loyal, and deeply devoted. You share the same values, the same wavelength,
              and the same quiet understanding that says everything without words. ♥
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              {['🌍 Both Earth', '💎 Loyal', '🤝 Trust', '🔥 Passion', '♾️ Soulmates'].map(tag => (
                <span key={tag} style={{
                  fontSize: 10, padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* download button */}
        <button
          onClick={handleDownload}
          style={{
            marginTop: 24,
            background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: 14,
            fontFamily: FONT_BODY,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: `0 4px 20px rgba(233,30,140,0.25)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = `0 6px 30px rgba(233,30,140,0.35)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = `0 4px 20px rgba(233,30,140,0.25)`;
          }}
        >
          📸 Save Star Map
        </button>
      </div>

      {/* subtle footer */}
      <div style={{
        textAlign: 'center',
        padding: '40px 20px 20px',
        color: 'rgba(255,255,255,0.15)',
        fontSize: 12,
      }}>
        Move your mouse over the sky to see the stars shift ·
        Watch for shooting stars
      </div>
    </div>
  );
}
