"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

/* ─── constants ─── */
const CW = 360;
const CH = 540;
const GRAVITY = 0.28;
const JUMP_VEL = -8.5;
const BOOST_VEL = -24;
const PLAT_H = 14;
const PLAT_MIN_W = 65;
const PLAT_MAX_W = 95;
const PLAYER_R = 18;
const MOVE_SPEED = 4.5;
const STAR_COUNT = 80;
const INITIAL_SPACING = 60;
const MAX_SPACING = 130;
const SPACING_SCORE = 3000; // score at which spacing maxes out

/* ─── helpers ─── */
function lerp(a, b, t) { return a + (b - a) * Math.min(1, t); }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

function makeStars() {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * CW,
    y: Math.random() * CH * 3,
    r: 0.5 + Math.random() * 1.5,
    bright: 0.3 + Math.random() * 0.7,
  }));
}

function platWidth() { return randInt(PLAT_MIN_W, PLAT_MAX_W); }

function spacing(score) {
  const t = Math.min(score / SPACING_SCORE, 1);
  return lerp(INITIAL_SPACING, MAX_SPACING, t);
}

/* pick platform type based on score */
function pickType(score) {
  const r = Math.random();
  if (r < 0.05) return "boost";
  const difficulty = Math.min(score / 2000, 1);
  if (r < 0.05 + 0.20 * difficulty) return "fragile";
  if (r < 0.05 + 0.20 * difficulty + 0.20 * difficulty) return "moving";
  return "normal";
}

function makePlatform(x, y, type) {
  const w = platWidth();
  return {
    x, y, w, h: PLAT_H, type,
    moveDir: type === "moving" ? (Math.random() < 0.5 ? 1 : -1) : 0,
    moveSpeed: type === "moving" ? 0.8 + Math.random() * 0.8 : 0,
    broken: false,
    breakTimer: 0,
  };
}

function generateInitialPlatforms() {
  const plats = [];
  // ground platform — always under player
  plats.push(makePlatform(CW / 2 - 40, CH - 40, "normal"));
  let y = CH - 40;
  while (y > -CH) {
    y -= 40 + Math.random() * 30;
    const x = rand(30, CW - 30);
    plats.push(makePlatform(x, y, pickType(0)));
  }
  return plats;
}

/* ─── component ─── */
export default function DoodleJumpPage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const touchXRef = useRef(null);

  const [state, setState] = useState("idle"); // idle | playing | over
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  /* localStorage helpers */
  function getBest() {
    try { return parseInt(localStorage.getItem("doodle_best") || "0", 10); } catch { return 0; }
  }
  function saveBest(s) {
    try { localStorage.setItem("doodle_best", String(s)); } catch {}
  }

  /* ─── draw helpers ─── */
  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCatCharacter(ctx, px, py, vy, isGameOver) {
    const r = PLAYER_R;

    // Glow behind character
    const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2);
    glow.addColorStop(0, 'rgba(233,30,140,0.4)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Trail particles when going up
    if (vy < -2 && !isGameOver) {
      for (let i = 0; i < 3; i++) {
        const tx = px + (Math.random() - 0.5) * r;
        const ty = py + r + Math.random() * 8;
        const tr = 1.5 + Math.random() * 2;
        ctx.globalAlpha = 0.3 + Math.random() * 0.3;
        ctx.fillStyle = '#ff6ec7';
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Emoji character — big and clear
    const emoji = isGameOver ? '😿' : vy < -3 ? '😺' : '🐱';
    const fontSize = r * 2.4;
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, px, py);
  }

  function drawStarBurst(ctx, x, y, t) {
    const n = 8;
    const maxR = 30;
    const alpha = Math.max(0, 1 - t);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + t * 2;
      const dist = t * maxR;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      // tiny 4-pointed star
      const sr = 3 * (1 - t);
      ctx.moveTo(sx, sy - sr);
      ctx.lineTo(sx + sr * 0.4, sy - sr * 0.4);
      ctx.lineTo(sx + sr, sy);
      ctx.lineTo(sx + sr * 0.4, sy + sr * 0.4);
      ctx.lineTo(sx, sy + sr);
      ctx.lineTo(sx - sr * 0.4, sy + sr * 0.4);
      ctx.lineTo(sx - sr, sy);
      ctx.lineTo(sx - sr * 0.4, sy - sr * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ─── game loop ─── */
  const tick = useCallback(() => {
    const g = gameRef.current;
    if (!g || !g.running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const keys = keysRef.current;

    /* ── input ── */
    let dx = 0;
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dx = -MOVE_SPEED;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx = MOVE_SPEED;
    if (touchXRef.current !== null) {
      const diff = touchXRef.current - g.px;
      if (Math.abs(diff) > 4) dx = Math.sign(diff) * MOVE_SPEED;
    }

    g.px += dx;
    // horizontal wrap
    if (g.px < -PLAYER_R) g.px = CW + PLAYER_R;
    if (g.px > CW + PLAYER_R) g.px = -PLAYER_R;

    /* ── physics ── */
    g.vy += GRAVITY;
    g.py += g.vy;

    /* ── platform collision (only when falling) ── */
    if (g.vy >= 0) {
      for (const p of g.platforms) {
        if (p.broken) continue;
        const px = p.x - p.w / 2;
        const py2 = p.y;
        if (
          g.px + PLAYER_R > px &&
          g.px - PLAYER_R < px + p.w &&
          g.py + PLAYER_R >= py2 &&
          g.py + PLAYER_R <= py2 + p.h + g.vy + 2
        ) {
          // land
          if (p.type === "fragile") {
            p.broken = true;
            p.breakTimer = 0;
            g.vy = JUMP_VEL;
          } else if (p.type === "boost") {
            g.vy = BOOST_VEL;
            g.boostEffect = { x: g.px, y: p.y, t: 0 };
          } else {
            g.vy = JUMP_VEL;
          }
          g.py = py2 - PLAYER_R;
          break;
        }
      }
    }

    /* ── camera ── */
    const scrollLine = CH * 0.35;
    if (g.py < scrollLine) {
      const shift = scrollLine - g.py;
      g.py = scrollLine;
      g.cameraY += shift;
      // move platforms down
      for (const p of g.platforms) p.y += shift;
      // shift stars
      for (const s of g.stars) {
        s.y += shift * 0.3;
        if (s.y > CH + 10) { s.y = -10; s.x = Math.random() * CW; }
      }
    }

    /* ── score ── */
    const currentScore = Math.round(g.cameraY / 10);
    if (currentScore > g.score) g.score = currentScore;
    setScore(g.score);

    /* ── remove off-screen platforms, generate new ── */
    g.platforms = g.platforms.filter(p => {
      if (p.broken && p.breakTimer > 1) return false;
      return p.y < CH + 50;
    });

    // find the highest platform
    let minY = CH;
    for (const p of g.platforms) {
      if (p.y < minY) minY = p.y;
    }
    // generate platforms above
    const gap = spacing(g.score);
    while (minY > -50) {
      minY -= gap * (0.7 + Math.random() * 0.6);
      const x = rand(40, CW - 40);
      g.platforms.push(makePlatform(x, minY, pickType(g.score)));
    }

    /* ── move moving platforms ── */
    for (const p of g.platforms) {
      if (p.type === "moving" && !p.broken) {
        p.x += p.moveDir * p.moveSpeed;
        if (p.x - p.w / 2 < 0 || p.x + p.w / 2 > CW) p.moveDir *= -1;
      }
      if (p.broken) p.breakTimer += 0.03;
    }

    /* ── boost effect ── */
    if (g.boostEffect) {
      g.boostEffect.t += 0.04;
      if (g.boostEffect.t >= 1) g.boostEffect = null;
    }

    /* ── game over ── */
    if (g.py > CH + 60) {
      g.running = false;
      const b = getBest();
      if (g.score > b) saveBest(g.score);
      setBest(Math.max(g.score, b));
      setState("over");
      return;
    }

    /* ═══════════════ DRAW ═══════════════ */
    ctx.clearRect(0, 0, CW, CH);

    // background
    ctx.fillStyle = "#07071a";
    ctx.fillRect(0, 0, CW, CH);

    // stars
    for (const s of g.stars) {
      ctx.globalAlpha = s.bright * (0.5 + 0.5 * Math.sin(Date.now() / 1000 + s.x));
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // platforms
    for (const p of g.platforms) {
      if (p.y < -20 || p.y > CH + 20) continue;
      const px = p.x - p.w / 2;
      ctx.save();

      if (p.broken) {
        ctx.globalAlpha = Math.max(0, 1 - p.breakTimer);
        ctx.translate(p.x, p.y + p.h / 2);
        ctx.rotate((Math.random() - 0.5) * 0.15 * p.breakTimer);
        ctx.translate(-p.x, -(p.y + p.h / 2));
        // falling pieces
        const fall = p.breakTimer * 40;
        ctx.translate(0, fall);
      }

      let color1, color2;
      switch (p.type) {
        case "normal":
          color1 = "#e91e8c"; color2 = "#ff6ec7"; break;
        case "moving":
          color1 = "#9c27b0"; color2 = "#b388ff"; break;
        case "fragile":
          color1 = "#c0392b"; color2 = "#e74c3c"; break;
        case "boost":
          color1 = "#f9a825"; color2 = "#ffd54f"; break;
        default:
          color1 = "#e91e8c"; color2 = "#ff6ec7";
      }

      const grad = ctx.createLinearGradient(px, p.y, px, p.y + p.h);
      grad.addColorStop(0, color2);
      grad.addColorStop(1, color1);
      ctx.fillStyle = grad;
      drawRoundRect(ctx, px, p.y, p.w, p.h, 6);
      ctx.fill();

      // subtle shine
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      drawRoundRect(ctx, px + 4, p.y + 1, p.w - 8, p.h / 2, 3);
      ctx.fill();

      ctx.restore();
    }

    // boost effect
    if (g.boostEffect) {
      drawStarBurst(ctx, g.boostEffect.x, g.boostEffect.y, g.boostEffect.t);
    }

    // player
    drawCatCharacter(ctx, g.px, g.py, g.vy, false);

    // score
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${g.score}`, 10, 24);

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /* ─── start / restart ─── */
  const startGame = useCallback(() => {
    const platforms = generateInitialPlatforms();
    gameRef.current = {
      px: CW / 2,
      py: CH - 60,
      vy: JUMP_VEL,
      cameraY: 0,
      score: 0,
      platforms,
      stars: makeStars(),
      boostEffect: null,
      running: true,
    };
    setScore(0);
    setBest(getBest());
    setState("playing");
  }, []);

  /* kick off loop when state changes to playing */
  useEffect(() => {
    if (state === "playing") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [state, tick]);

  /* ─── keyboard ─── */
  useEffect(() => {
    const down = (e) => { keysRef.current[e.key] = true; };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  /* ─── touch ─── */
  const handleTouchStart = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchXRef.current = e.touches[0].clientX - rect.left;
  };
  const handleTouchMove = (e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchXRef.current = e.touches[0].clientX - rect.left;
  };
  const handleTouchEnd = () => { touchXRef.current = null; };

  /* ─── idle screen drawing ─── */
  useEffect(() => {
    if (state !== "idle") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const stars = makeStars();
    let raf;
    const draw = () => {
      ctx.fillStyle = "#07071a";
      ctx.fillRect(0, 0, CW, CH);
      for (const s of stars) {
        ctx.globalAlpha = s.bright * (0.5 + 0.5 * Math.sin(Date.now() / 800 + s.x));
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x, s.y % CH, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // demo platforms
      const demoY = [380, 310, 240, 170, 110];
      const colors = ["#e91e8c", "#b388ff", "#e91e8c", "#f9a825", "#e91e8c"];
      demoY.forEach((y, i) => {
        const w = 70;
        const x = CW / 2 + Math.sin(Date.now() / 1000 + i) * 60 - w / 2;
        const grad = ctx.createLinearGradient(x, y, x, y + PLAT_H);
        grad.addColorStop(0, colors[i] + "cc");
        grad.addColorStop(1, colors[i]);
        ctx.fillStyle = grad;
        drawRoundRect(ctx, x, y, w, PLAT_H, 6);
        ctx.fill();
      });

      // demo cat
      const catY = 350 + Math.sin(Date.now() / 500) * 15;
      drawCatCharacter(ctx, CW / 2, catY, -5, false);

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [state]);

  /* load best on mount */
  useEffect(() => { setBest(getBest()); }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07071a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "18px 10px 40px",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      {/* back link */}
      <div style={{ width: "100%", maxWidth: 420, marginBottom: 10 }}>
        <Link
          href="/games"
          style={{
            color: "#b388ff",
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Games
        </Link>
      </div>

      {/* title */}
      <h1
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 32,
          background: "linear-gradient(90deg, #e91e8c, #b388ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: "0 0 8px",
        }}
      >
        Doodle Jump 💕
      </h1>
      <p style={{ color: "#b388ff99", fontSize: 13, margin: "0 0 12px", textAlign: "center" }}>
        Jump as high as you can! Arrow keys / WASD / touch
      </p>

      {/* canvas container */}
      <div style={{ position: "relative", width: CW, maxWidth: "100%" }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "block",
            width: CW,
            maxWidth: "100%",
            height: "auto",
            borderRadius: 16,
            border: "2px solid #e91e8c33",
            boxShadow: "0 0 30px #e91e8c22",
            touchAction: "none",
          }}
        />

        {/* idle overlay */}
        {state === "idle" && (
          <div
            onClick={startGame}
            onTouchStart={startGame}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(7,7,26,0.55)",
              borderRadius: 16,
              cursor: "pointer",
            }}
          >
            <button
              onClick={startGame}
              style={{
                background: "linear-gradient(135deg, #e91e8c, #b388ff)",
                border: "none",
                color: "#fff",
                fontFamily: "'Dancing Script', cursive",
                fontSize: 26,
                padding: "14px 36px",
                borderRadius: 50,
                cursor: "pointer",
                boxShadow: "0 0 20px #e91e8c66",
              }}
            >
              Start Jumping!
            </button>
            {best > 0 && (
              <p style={{ color: "#b388ff", marginTop: 12, fontSize: 14 }}>
                Best: {best}
              </p>
            )}
          </div>
        )}

        {/* game over overlay */}
        {state === "over" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(7,7,26,0.75)",
              borderRadius: 16,
            }}
          >
            <h2
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: 30,
                color: "#e91e8c",
                margin: "0 0 8px",
              }}
            >
              Game Over
            </h2>
            <p style={{ fontSize: 22, margin: "4px 0", color: "#fff" }}>
              Score: <span style={{ color: "#e91e8c" }}>{score}</span>
            </p>
            <p style={{ fontSize: 16, margin: "4px 0", color: "#b388ff" }}>
              Best: {best}
            </p>
            {score >= best && score > 0 && (
              <p style={{ color: "#ffd700", fontSize: 14, margin: "6px 0" }}>
                ✨ New Record! ✨
              </p>
            )}
            <button
              onClick={startGame}
              style={{
                marginTop: 16,
                background: "linear-gradient(135deg, #e91e8c, #b388ff)",
                border: "none",
                color: "#fff",
                fontFamily: "'Dancing Script', cursive",
                fontSize: 22,
                padding: "12px 32px",
                borderRadius: 50,
                cursor: "pointer",
                boxShadow: "0 0 20px #e91e8c66",
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 14,
          fontSize: 12,
          color: "#ffffff88",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span>💕 Normal</span>
        <span>💜 Moving</span>
        <span>💔 Fragile</span>
        <span>🚀 Boost</span>
      </div>
    </div>
  );
}
