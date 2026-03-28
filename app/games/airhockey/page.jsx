"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const CW = 360;
const CH = 560;
const MALLET_R = 26;   // round mallet radius
const PUCK_R = 16;
const GOAL_W = 120;
const MAX_SPEED = 14;
const WIN_SCORE = 7;
const MIDLINE = CH / 2;

const GOAL_X1 = (CW - GOAL_W) / 2;
const GOAL_X2 = GOAL_X1 + GOAL_W;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function initState() {
  const angle = (Math.random() * 50 - 25) * (Math.PI / 180);
  return {
    puck: { x: CW / 2, y: CH / 2, vx: Math.sin(angle) * 5, vy: -5 },
    // mallets: center of circle
    p1: { x: CW / 2, y: CH - 80, vx: 0, vy: 0, px: CW / 2, py: CH - 80 },
    p2: { x: CW / 2, y: 80,      vx: 0, vy: 0, px: CW / 2, py: 80      },
    scores: { p1: 0, p2: 0 },
    pauseTimer: 0,
    goalFlash: 0,
    goalText: "",
    winner: null,
  };
}

export default function AirHockeyPage() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  // touch tracking: touchId → player ("p1"|"p2")
  const touchMap = useRef({});
  // desired mallet positions from input
  const desiredRef = useRef({
    p1: { x: CW / 2, y: CH - 80 },
    p2: { x: CW / 2, y: 80 },
  });
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });

  const resetGame = useCallback(() => {
    stateRef.current = initState();
    desiredRef.current = { p1: { x: CW / 2, y: CH - 80 }, p2: { x: CW / 2, y: 80 } };
    setWinner(null);
    setScores({ p1: 0, p2: 0 });
  }, []);

  useEffect(() => {
    stateRef.current = initState();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function toCanvas(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (CW / rect.width),
        y: (clientY - rect.top)  * (CH / rect.height),
      };
    }

    // Mouse: controls whichever half mouse is in
    function onMouseMove(e) {
      const pos = toCanvas(e.clientX, e.clientY);
      if (pos.y > MIDLINE) {
        desiredRef.current.p1 = {
          x: clamp(pos.x, MALLET_R, CW - MALLET_R),
          y: clamp(pos.y, MIDLINE + MALLET_R, CH - MALLET_R),
        };
      } else {
        desiredRef.current.p2 = {
          x: clamp(pos.x, MALLET_R, CW - MALLET_R),
          y: clamp(pos.y, MALLET_R, MIDLINE - MALLET_R),
        };
      }
    }

    // Touch: each touch assigned to half it started in, stays assigned by ID
    function onTouchStart(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const pos = toCanvas(t.clientX, t.clientY);
        touchMap.current[t.identifier] = pos.y > MIDLINE ? "p1" : "p2";
      }
    }

    function onTouchMove(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const player = touchMap.current[t.identifier];
        if (!player) continue;
        const pos = toCanvas(t.clientX, t.clientY);
        if (player === "p1") {
          desiredRef.current.p1 = {
            x: clamp(pos.x, MALLET_R, CW - MALLET_R),
            y: clamp(pos.y, MIDLINE + MALLET_R, CH - MALLET_R),
          };
        } else {
          desiredRef.current.p2 = {
            x: clamp(pos.x, MALLET_R, CW - MALLET_R),
            y: clamp(pos.y, MALLET_R, MIDLINE - MALLET_R),
          };
        }
      }
    }

    function onTouchEnd(e) {
      for (const t of e.changedTouches) delete touchMap.current[t.identifier];
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    function loop() {
      const s = stateRef.current;
      if (!s) { rafRef.current = requestAnimationFrame(loop); return; }
      if (s.winner) { draw(ctx, s); return; }

      const d = desiredRef.current;

      // Update mallets — track velocity by comparing to previous position
      for (const key of ["p1", "p2"]) {
        const m = s[key];
        m.vx = d[key].x - m.x;
        m.vy = d[key].y - m.y;
        m.x = d[key].x;
        m.y = d[key].y;
      }

      if (s.pauseTimer > 0) {
        s.pauseTimer--;
        draw(ctx, s);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const pk = s.puck;

      // Move puck
      pk.x += pk.vx;
      pk.y += pk.vy;

      // Wall bounce
      if (pk.x - PUCK_R < 0)   { pk.x = PUCK_R;       pk.vx =  Math.abs(pk.vx); }
      if (pk.x + PUCK_R > CW)  { pk.x = CW - PUCK_R;  pk.vx = -Math.abs(pk.vx); }

      // Goal top (P2's goal → P1 scores)
      if (pk.y - PUCK_R < 0) {
        if (pk.x > GOAL_X1 && pk.x < GOAL_X2) {
          s.scores.p1++;
          setScores({ ...s.scores });
          if (s.scores.p1 >= WIN_SCORE) { s.winner = "p1"; setWinner("p1"); }
          else { resetPuck(s, -1); s.goalFlash = 90; s.goalText = "GOAL! 💙"; }
        } else { pk.y = PUCK_R; pk.vy = Math.abs(pk.vy); }
      }

      // Goal bottom (P1's goal → P2 scores)
      if (pk.y + PUCK_R > CH) {
        if (pk.x > GOAL_X1 && pk.x < GOAL_X2) {
          s.scores.p2++;
          setScores({ ...s.scores });
          if (s.scores.p2 >= WIN_SCORE) { s.winner = "p2"; setWinner("p2"); }
          else { resetPuck(s, 1); s.goalFlash = 90; s.goalText = "GOAL! 🩷"; }
        } else { pk.y = CH - PUCK_R; pk.vy = -Math.abs(pk.vy); }
      }

      // Circle-circle mallet collisions
      checkMalletCollision(pk, s.p1);
      checkMalletCollision(pk, s.p2);

      // Friction + min speed
      const spd = Math.hypot(pk.vx, pk.vy);
      if (spd > 0) {
        pk.vx *= 0.996;
        pk.vy *= 0.996;
        const ns = Math.hypot(pk.vx, pk.vy);
        if (ns < 2.5) { pk.vx = (pk.vx / ns) * 2.5; pk.vy = (pk.vy / ns) * 2.5; }
      }

      if (s.goalFlash > 0) s.goalFlash--;

      draw(ctx, s);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  function resetPuck(s, dir) {
    const angle = (Math.random() * 40 - 20) * (Math.PI / 180);
    s.puck.x = CW / 2; s.puck.y = CH / 2;
    s.puck.vx = Math.sin(angle) * 5; s.puck.vy = dir * 5;
    s.pauseTimer = 60;
  }

  function checkMalletCollision(pk, m) {
    const dx = pk.x - m.x;
    const dy = pk.y - m.y;
    const dist = Math.hypot(dx, dy);
    const minDist = PUCK_R + MALLET_R;
    if (dist < minDist && dist > 0) {
      // Separate
      const nx = dx / dist, ny = dy / dist;
      const overlap = minDist - dist;
      pk.x += nx * overlap;
      pk.y += ny * overlap;

      // Reflect puck velocity along normal
      const dot = pk.vx * nx + pk.vy * ny;
      pk.vx -= 2 * dot * nx;
      pk.vy -= 2 * dot * ny;

      // Add mallet velocity impulse (drag speed → puck speed)
      const impulseScale = 1.2;
      pk.vx += m.vx * impulseScale;
      pk.vy += m.vy * impulseScale;

      // Cap speed
      const spd = Math.hypot(pk.vx, pk.vy);
      if (spd > MAX_SPEED) {
        pk.vx = (pk.vx / spd) * MAX_SPEED;
        pk.vy = (pk.vy / spd) * MAX_SPEED;
      }
    }
  }

  function draw(ctx, s) {
    ctx.clearRect(0, 0, CW, CH);

    // Background
    ctx.fillStyle = "#07071a";
    ctx.fillRect(0, 0, CW, CH);

    // Rink border
    ctx.strokeStyle = "rgba(233,30,140,0.3)";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, CW - 4, CH - 4);

    // Half-court tint
    ctx.fillStyle = "rgba(233,30,140,0.03)";
    ctx.fillRect(0, 0, CW, MIDLINE);
    ctx.fillStyle = "rgba(100,181,246,0.03)";
    ctx.fillRect(0, MIDLINE, CW, MIDLINE);

    // Center dashed line
    ctx.strokeStyle = "rgba(233,30,140,0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.beginPath(); ctx.moveTo(0, MIDLINE); ctx.lineTo(CW, MIDLINE); ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = "rgba(233,30,140,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CW / 2, MIDLINE, 55, 0, Math.PI * 2); ctx.stroke();

    // Goals
    drawGoal(ctx, GOAL_X1, 0, GOAL_W, "#e91e8c");        // top (P2's goal)
    drawGoal(ctx, GOAL_X1, CH - 6, GOAL_W, "#64b5f6");   // bottom (P1's goal)

    // Mallets
    drawMallet(ctx, s.p2, "#e91e8c", "#b388ff");   // Amrita top
    drawMallet(ctx, s.p1, "#64b5f6", "#90caf9");   // Siddharth bottom

    // Puck
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 18;
    const pg = ctx.createRadialGradient(s.puck.x - 5, s.puck.y - 5, 2, s.puck.x, s.puck.y, PUCK_R);
    pg.addColorStop(0, "#ffffff");
    pg.addColorStop(1, "#cccccc");
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(s.puck.x, s.puck.y, PUCK_R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Scores
    ctx.font = "bold 30px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e91e8c";
    ctx.fillText(s.scores.p2, CW / 2, 44);
    ctx.fillStyle = "#64b5f6";
    ctx.fillText(s.scores.p1, CW / 2, CH - 16);

    // Player labels
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(233,30,140,0.7)";
    ctx.fillText("🩷 Amrita", 8, 18);
    ctx.fillStyle = "rgba(100,181,246,0.7)";
    ctx.fillText("💙 Siddharth", 8, CH - 6);

    // Goal flash
    if (s.goalFlash > 0) {
      const alpha = Math.min(1, s.goalFlash / 40);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 34px Inter, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(s.goalText, CW / 2, MIDLINE - 10);
      ctx.restore();
    }
    ctx.textAlign = "left";
  }

  function drawGoal(ctx, x, y, w, color) {
    ctx.fillStyle = color + "35";
    ctx.fillRect(x, y, w, 6);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const yPost = y === 0 ? 12 : y - 6;
    ctx.moveTo(x, y === 0 ? 0 : CH); ctx.lineTo(x, yPost);
    ctx.moveTo(x + w, y === 0 ? 0 : CH); ctx.lineTo(x + w, yPost);
    ctx.stroke();
  }

  function drawMallet(ctx, m, colorA, colorB) {
    // Outer glow ring
    ctx.save();
    ctx.shadowColor = colorA;
    ctx.shadowBlur = 20;
    // Gradient fill
    const g = ctx.createRadialGradient(m.x - MALLET_R * 0.3, m.y - MALLET_R * 0.3, 2, m.x, m.y, MALLET_R);
    g.addColorStop(0, colorB);
    g.addColorStop(1, colorA);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, MALLET_R, 0, Math.PI * 2);
    ctx.fill();
    // White highlight dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(m.x - MALLET_R * 0.28, m.y - MALLET_R * 0.28, MALLET_R * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#07071a", color: "#fff",
      fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "24px 16px",
    }}>
      <style>{`
        @keyframes overlayIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
      `}</style>

      <div style={{ width: "100%", maxWidth: `${CW}px`, marginBottom: "8px" }}>
        <Link href="/games" style={{ color: "#b388ff", textDecoration: "none", fontSize: "0.9rem" }}>← Games</Link>
      </div>

      <h1 style={{
        fontFamily: "Dancing Script, cursive", fontSize: "2.2rem",
        color: "#e91e8c", margin: "0 0 8px", textShadow: "0 0 20px #e91e8c80",
      }}>Air Hockey 🏒</h1>

      <div style={{ display: "flex", gap: "24px", marginBottom: "10px", fontSize: "0.85rem", color: "#ffffff60" }}>
        <span style={{ color: "#e91e8c" }}>🩷 Amrita (top)</span>
        <span>vs</span>
        <span style={{ color: "#64b5f6" }}>💙 Siddharth (bottom)</span>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: `${CW}px` }}>
        <canvas
          ref={canvasRef}
          width={CW} height={CH}
          style={{
            width: "100%", maxWidth: `${CW}px`, display: "block",
            borderRadius: "16px", border: "2px solid rgba(233,30,140,0.3)",
            touchAction: "none", cursor: "none",
          }}
        />

        {winner && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(7,7,26,0.85)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", borderRadius: "16px", zIndex: 10,
          }}>
            <div style={{
              background: "#0f0f2e", border: "2px solid #e91e8c",
              borderRadius: "24px", padding: "40px 48px", textAlign: "center",
              animation: "overlayIn 0.3s ease", boxShadow: "0 0 60px rgba(233,30,140,0.4)",
              maxWidth: "280px", width: "90%",
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🏆</div>
              <div style={{
                fontFamily: "Dancing Script, cursive", fontSize: "2rem",
                color: winner === "p2" ? "#e91e8c" : "#64b5f6", marginBottom: "8px",
              }}>
                {winner === "p2" ? "🩷 Amrita wins!" : "💙 Siddharth wins!"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", marginBottom: "20px", fontSize: "1rem" }}>
                {scores.p2} — {scores.p1}
              </div>
              <button onClick={resetGame} style={{
                background: "linear-gradient(135deg, #e91e8c, #b388ff)",
                color: "#fff", border: "none", borderRadius: "12px",
                padding: "12px 32px", fontSize: "1rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "Inter, sans-serif", width: "100%",
              }}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "12px", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textAlign: "center", lineHeight: 1.6 }}>
        Drag your mallet in your half · Swipe fast to shoot hard<br />
        First to {WIN_SCORE} wins
      </div>
    </div>
  );
}
