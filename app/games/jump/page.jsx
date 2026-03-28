"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const CANVAS_W = 480;
const CANVAS_H = 280;
const GROUND_Y = 240;
const PLAYER_X = 80;
const PLAYER_W = 40;
const PLAYER_H = 40;
const GRAVITY = 0.65;
const JUMP_VEL = -13;
const MAX_LIVES = 3;
const SPEED_START = 2.5;       // starting obstacle speed (was 4)
const SPEED_INC = 0.35;        // speed added per level
const SPEED_LEVEL_EVERY = 600; // score points per level (was 200)
const SPEED_MAX = 7;           // hard cap so it never gets insane

const OBSTACLES = [
  { emoji: "🌵", w: 30, h: 50 },
  { emoji: "🪨", w: 40, h: 30 },
];

function makeStars() {
  return Array.from({ length: 15 }, (_, i) => ({
    x: Math.random() * CANVAS_W,
    y: 20 + Math.random() * (GROUND_Y - 60),
    r: 1 + Math.random() * 2,
    speed: 0.4 + Math.random() * 0.6,
  }));
}

export default function JumpPage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const rafRef = useRef(null);
  const [gameState, setGameState] = useState("idle"); // idle | playing | dead
  const [displayScore, setDisplayScore] = useState(0);
  const [displayHi, setDisplayHi] = useState(0);
  const [displayLives, setDisplayLives] = useState(MAX_LIVES);
  const [flashText, setFlashText] = useState("");

  function getHi() {
    try { return parseInt(localStorage.getItem("jump_hi") || "0"); } catch { return 0; }
  }
  function saveHi(s) {
    try { localStorage.setItem("jump_hi", String(s)); } catch {}
  }

  const startGame = useCallback(() => {
    const hi = getHi();
    setDisplayHi(hi);
    setDisplayScore(0);
    setDisplayLives(MAX_LIVES);
    setFlashText("");
    gameRef.current = {
      player: {
        y: GROUND_Y - PLAYER_H,
        vy: 0,
        grounded: true,
        doubleJumped: false,
        invincible: 0,
      },
      obstacles: [],
      stars: makeStars(),
      score: 0,
      frameCount: 0,
      nextObstacle: 180,
      lives: MAX_LIVES,
      hi,
      lastMilestone: 0,
      flashTimer: 0,
      pauseTimer: 0,
      dead: false,
    };
    setGameState("playing");
  }, []);

  function jump() {
    if (!gameRef.current) return;
    const g = gameRef.current;
    if (g.dead) return;
    const p = g.player;
    if (p.grounded) {
      p.vy = JUMP_VEL;
      p.grounded = false;
      p.doubleJumped = false;
    } else if (!p.doubleJumped) {
      p.vy = JUMP_VEL;
      p.doubleJumped = true;
    }
  }

  useEffect(() => {
    setDisplayHi(getHi());
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const g = gameRef.current;
      if (!g) return;
      if (g.dead) {
        setGameState("dead");
        return;
      }

      const { player: p, obstacles, stars } = g;

      // Pause timer (after collision)
      if (g.pauseTimer > 0) {
        g.pauseTimer--;
        draw(ctx, g);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      g.frameCount++;
      g.score++;

      // Speed milestone
      const level = Math.floor(g.score / SPEED_LEVEL_EVERY);
      if (level > g.lastMilestone) {
        g.lastMilestone = level;
        g.flashTimer = 80;
        setFlashText("Faster! 🐾");
      }
      if (g.flashTimer > 0) g.flashTimer--;
      else setFlashText("");

      // Speed (capped)
      const speed = Math.min(SPEED_MAX, SPEED_START + level * SPEED_INC);

      // Stars
      for (const s of stars) {
        s.x -= s.speed;
        if (s.x < 0) s.x = CANVAS_W;
      }

      // Spawn obstacles
      if (g.frameCount >= g.nextObstacle) {
        const type = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
        obstacles.push({
          ...type,
          x: CANVAS_W + 10,
          y: GROUND_Y - type.h,
        });
        // Gap shrinks as speed increases: starts ~160-240 frames, narrows to ~90-150 at max speed
        const minGap = Math.max(90, 160 - Math.floor(g.score / SPEED_LEVEL_EVERY) * 14);
        const randExtra = Math.floor(Math.random() * 80);
        g.nextObstacle = g.frameCount + minGap + randExtra;
      }

      // Move obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= speed;
        if (obstacles[i].x < -60) obstacles.splice(i, 1);
      }

      // Player gravity
      if (!p.grounded) {
        p.vy += GRAVITY;
        p.y += p.vy;
        if (p.y >= GROUND_Y - PLAYER_H) {
          p.y = GROUND_Y - PLAYER_H;
          p.vy = 0;
          p.grounded = true;
          p.doubleJumped = false;
        }
      }

      // Invincibility
      if (p.invincible > 0) p.invincible--;

      // Collision
      if (p.invincible === 0) {
        const px = PLAYER_X + 8, py = p.y + 8, pw = PLAYER_W - 16, ph = PLAYER_H - 16;
        for (const obs of obstacles) {
          const ox = obs.x + 8, oy = obs.y + 8, ow = obs.w - 16, oh = obs.h - 16;
          if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
            g.lives--;
            setDisplayLives(g.lives);
            p.invincible = 60;
            g.pauseTimer = 20;
            if (g.lives <= 0) {
              g.dead = true;
              if (g.score > g.hi) {
                saveHi(g.score);
                g.hi = g.score;
                setDisplayHi(g.score);
              }
            }
            break;
          }
        }
      }

      setDisplayScore(g.score);
      draw(ctx, g);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  function draw(ctx, g) {
    const { player: p, obstacles, stars } = g;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    ctx.fillStyle = "#07071a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    ctx.strokeStyle = "#e91e8c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_W, GROUND_Y);
    ctx.stroke();

    // Obstacles
    ctx.font = "32px serif";
    ctx.textBaseline = "top";
    for (const obs of obstacles) {
      ctx.fillText(obs.emoji, obs.x, obs.y);
    }

    // Player (with blink if invincible)
    const visible = p.invincible === 0 || Math.floor(p.invincible / 6) % 2 === 0;
    if (visible) {
      ctx.font = "36px serif";
      ctx.fillText("🐱", PLAYER_X, p.y);
    }

    // HUD score
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillStyle = "#e91e8c";
    ctx.textBaseline = "top";
    ctx.fillText(`Score: ${g.score}`, 12, 10);

    // HUD hi
    ctx.fillStyle = "#b388ff";
    ctx.fillText(`Best: ${g.hi}`, 12, 30);

    // Lives
    ctx.font = "18px serif";
    const livesStr = "🐱".repeat(Math.max(0, g.lives));
    ctx.fillText(livesStr, CANVAS_W - 20 - g.lives * 22, 10);

    // Flash text
    if (g.flashTimer > 0) {
      const alpha = Math.min(1, g.flashTimer / 30);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 22px Inter, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("Faster! 🐾", CANVAS_W / 2, CANVAS_H / 2 - 30);
      ctx.restore();
      ctx.textAlign = "left";
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "idle" || gameState === "dead") startGame();
        else jump();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, startGame]);

  function handleCanvasInteract() {
    if (gameState === "idle" || gameState === "dead") startGame();
    else jump();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07071a",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Dancing+Script:wght@700&family=Inter:wght@400;600;700&display=swap');
      `}</style>

      <div style={{ width: "100%", maxWidth: `${CANVAS_W}px`, marginBottom: "8px" }}>
        <Link href="/games" style={{ color: "#b388ff", textDecoration: "none", fontSize: "0.9rem" }}>
          ← Games
        </Link>
      </div>

      <h1
        style={{
          fontFamily: "Dancing Script, cursive",
          fontSize: "2.2rem",
          color: "#e91e8c",
          margin: "0 0 16px",
          textShadow: "0 0 20px #e91e8c80",
        }}
      >
        Cat Run 🐱
      </h1>

      <div style={{ position: "relative", width: "100%", maxWidth: `${CANVAS_W}px` }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            width: "100%",
            maxWidth: `${CANVAS_W}px`,
            display: "block",
            borderRadius: "16px",
            border: "2px solid #e91e8c40",
            cursor: "pointer",
          }}
          onClick={handleCanvasInteract}
          onTouchStart={(e) => { e.preventDefault(); handleCanvasInteract(); }}
        />

        {/* Idle overlay */}
        {gameState === "idle" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#07071aCC",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
            }}
          >
            <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🐱</div>
            <div
              style={{
                fontFamily: "Dancing Script, cursive",
                fontSize: "1.6rem",
                color: "#e91e8c",
                marginBottom: "8px",
              }}
            >
              Cat Run!
            </div>
            <div style={{ color: "#b388ff", fontSize: "1rem", marginBottom: "4px" }}>
              Tap or press Space to run!
            </div>
            <div style={{ color: "#ffffff60", fontSize: "0.8rem" }}>
              Double jump allowed 🐾
            </div>
            {displayHi > 0 && (
              <div style={{ color: "#b388ff", fontSize: "0.9rem", marginTop: "10px" }}>
                Best: {displayHi}
              </div>
            )}
          </div>
        )}

        {/* Game over overlay */}
        {gameState === "dead" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#07071aDD",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>😿</div>
            <div
              style={{
                fontFamily: "Dancing Script, cursive",
                fontSize: "1.8rem",
                color: "#e91e8c",
                marginBottom: "4px",
              }}
            >
              Game Over!
            </div>
            <div style={{ color: "#fff", fontSize: "1.2rem", marginBottom: "2px" }}>
              Score: {displayScore}
            </div>
            <div style={{ color: "#b388ff", fontSize: "1rem", marginBottom: "20px" }}>
              Best: {displayHi}
            </div>
            <button
              onClick={startGame}
              style={{
                background: "linear-gradient(135deg, #e91e8c, #b388ff)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "12px 32px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Play Again 🐱
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "16px",
          color: "#ffffff50",
          fontSize: "0.8rem",
          textAlign: "center",
        }}
      >
        Space / ↑ / Tap to jump · Double jump allowed
      </div>
    </div>
  );
}
