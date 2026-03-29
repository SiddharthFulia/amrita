'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ─── Tile theme ───────────────────────────────────────────────────────────────
const TILE_EMOJI = { 2:'💕',4:'🌸',8:'💗',16:'🌺',32:'💖',64:'🌹',128:'💝',256:'🌻',512:'💘',1024:'🌟',2048:'👑' };
const TILE_BG = {
  2:'rgba(233,30,140,0.14)',4:'rgba(233,30,140,0.26)',8:'rgba(233,30,140,0.4)',
  16:'rgba(179,136,255,0.32)',32:'rgba(179,136,255,0.48)',64:'rgba(179,136,255,0.65)',
  128:'rgba(233,30,140,0.58)',256:'rgba(233,30,140,0.72)',512:'rgba(179,136,255,0.78)',
  1024:'rgba(233,30,140,0.9)',2048:'linear-gradient(135deg,#e91e8c,#b388ff)',
};

// ─── Pure game logic ──────────────────────────────────────────────────────────
function empty4x4() { return Array(4).fill(null).map(() => Array(4).fill(0)); }

function addTile(grid) {
  const empties = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empties.push([r, c]); }));
  if (!empties.length) return grid;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function initGrid() { return addTile(addTile(empty4x4())); }

// compress → merge → compress  (the canonical 2048 algorithm)
function slideRow(row) {
  let score = 0;
  // Step 1: compress (remove zeros)
  const tiles = row.filter(Boolean);
  // Step 2: merge adjacent equal tiles (each tile merges at most once)
  const merged = [];
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const val = tiles[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(tiles[i]);
      i++;
    }
  }
  // Step 3: compress again (pad with zeros)
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function moveLeft(grid) {
  let score = 0;
  const next = grid.map(row => { const r = slideRow(row); score += r.score; return r.row; });
  return { grid: next, score };
}

// CW 90° rotation: rotate(grid)[c][3-r] = grid[r][c]
function rotate(grid) {
  return grid[0].map((_, c) => grid.map(row => row[c]).reverse());
}

function move(grid, dir) {
  // Rotate so the desired direction maps to "left", then rotate back
  const ROTS = { left: 0, down: 1, right: 2, up: 3 };
  const rots = ROTS[dir];
  let g = grid;
  for (let i = 0; i < rots; i++) g = rotate(g);
  const { grid: moved, score } = moveLeft(g);
  let result = moved;
  for (let i = 0; i < (4 - rots) % 4; i++) result = rotate(result);
  return { grid: result, score };
}

function equal(a, b) { return a.every((row, r) => row.every((v, c) => v === b[r][c])); }

function canMove(grid) {
  for (const dir of ['left', 'right', 'up', 'down']) {
    if (!equal(grid, move(grid, dir).grid)) return true;
  }
  return false;
}

// ─── AI: greedy 1-step lookahead with heuristic scoring ──────────────────────
function scoreGrid(grid) {
  let empty = 0, maxTile = 0, mono = 0, smooth = 0;
  grid.forEach((row, r) => row.forEach((v, c) => {
    if (!v) { empty++; return; }
    if (v > maxTile) maxTile = v;
    const lv = Math.log2(v);
    if (c < 3 && grid[r][c + 1]) smooth -= Math.abs(lv - Math.log2(grid[r][c + 1]));
    if (r < 3 && grid[r + 1][c]) smooth -= Math.abs(lv - Math.log2(grid[r + 1][c]));
  }));
  // Monotonicity: prefer tiles decreasing in value left→right and top→bottom
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++)
      if (grid[r][c] && grid[r][c + 1]) mono += grid[r][c] >= grid[r][c + 1] ? 1 : -1;
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 3; r++)
      if (grid[r][c] && grid[r + 1][c]) mono += grid[r][c] >= grid[r + 1][c] ? 1 : -1;
  // Reward max tile in any corner
  const corners = [grid[0][0], grid[0][3], grid[3][0], grid[3][3]];
  const cornerBonus = corners.some(v => v === maxTile) ? Math.log2(maxTile || 1) * 50 : 0;
  return empty * 110 + mono * 12 + smooth * 6 + cornerBonus;
}

function getBestMove(grid) {
  let best = null, bestScore = -Infinity;
  for (const dir of ['left', 'up', 'right', 'down']) {
    const { grid: moved } = move(grid, dir);
    if (equal(grid, moved)) continue;
    const s = scoreGrid(moved);
    if (s > bestScore) { bestScore = s; best = dir; }
  }
  return best;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function getBest() { try { return parseInt(localStorage.getItem('g2048_best') || '0'); } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem('g2048_best', String(v)); } catch {} }

// ─── Component ────────────────────────────────────────────────────────────────
export default function Game2048Page() {
  const [grid, setGrid] = useState(() => initGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);
  const [continuedAfterWin, setContinuedAfterWin] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [aiSpeed, setAiSpeed] = useState(200); // ms between AI moves
  const aiRef = useRef(null);
  const gridRef = useRef(grid);

  useEffect(() => { setBest(getBest()); }, []);
  useEffect(() => { gridRef.current = grid; }, [grid]);

  const doMove = useCallback((dir) => {
    if (over) return;
    setGrid(prev => {
      const { grid: moved, score: gained } = move(prev, dir);
      if (equal(prev, moved)) return prev;
      const next = addTile(moved);
      setScore(s => {
        const ns = s + gained;
        setBest(b => { if (ns > b) { saveBest(ns); return ns; } return b; });
        return ns;
      });
      if (!continuedAfterWin && next.some(row => row.some(v => v === 2048))) setWon(true);
      if (!canMove(next)) setOver(true);
      return next;
    });
  }, [over, continuedAfterWin]);

  // AI autoplay loop
  useEffect(() => {
    if (aiRef.current) clearInterval(aiRef.current);
    if (!aiOn || over) return;
    aiRef.current = setInterval(() => {
      const best = getBestMove(gridRef.current);
      if (best) doMove(best);
    }, aiSpeed);
    return () => clearInterval(aiRef.current);
  }, [aiOn, aiSpeed, over, doMove]);

  // Keyboard
  useEffect(() => {
    const MAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const h = (e) => {
      const d = MAP[e.key];
      if (d) { e.preventDefault(); if (aiOn) setAiOn(false); doMove(d); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doMove, aiOn]);

  // Swipe
  const t0 = useRef(null);
  const onTS = (e) => { t0.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTE = (e) => {
    if (!t0.current) return;
    const dx = e.changedTouches[0].clientX - t0.current.x;
    const dy = e.changedTouches[0].clientY - t0.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (aiOn) setAiOn(false);
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
    t0.current = null;
  };

  const restart = () => {
    setGrid(initGrid()); setScore(0); setWon(false); setOver(false);
    setContinuedAfterWin(false); setAiOn(false);
  };

  const TILE_SIZE = 72;

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 40px' }}>
      <style>{`
        @keyframes tileAppear { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        @keyframes tileMerge  { 0%{transform:scale(1)} 30%{transform:scale(1.22)} 100%{transform:scale(1)} }
        @keyframes aiPulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideUp    { 0%{transform:translateY(100%);opacity:0} 100%{transform:translateY(0);opacity:1} }
      `}</style>

      <div style={{ width: '100%', maxWidth: '340px', marginBottom: '8px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
      </div>

      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.2rem', color: '#e91e8c', margin: '0 0 4px', textShadow: '0 0 20px #e91e8c80' }}>2048 💕</h1>

      {/* Score bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['Score', score], ['Best', best]].map(([label, val]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '7px 16px', textAlign: 'center', minWidth: '76px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{val}</div>
          </div>
        ))}
        <button onClick={restart} style={{ background: 'rgba(233,30,140,0.15)', border: '1px solid rgba(233,30,140,0.3)', borderRadius: '10px', padding: '7px 14px', color: '#e91e8c', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>New</button>
      </div>

      {/* AI controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => setAiOn(v => !v)}
          style={{
            padding: '7px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            background: aiOn ? 'linear-gradient(135deg,#e91e8c,#b388ff)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${aiOn ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
            color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            animation: aiOn ? 'aiPulse 1.5s ease infinite' : 'none',
          }}
        >{aiOn ? '🤖 AI ON' : '🤖 AI OFF'}</button>
        {aiOn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            <span>Fast</span>
            <input type="range" min={80} max={600} step={40} value={aiSpeed}
              onChange={e => setAiSpeed(Number(e.target.value))}
              style={{ width: '80px', accentColor: '#e91e8c' }}
            />
            <span>Slow</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div
        style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', touchAction: 'none', userSelect: 'none' }}
        onTouchStart={onTS} onTouchEnd={onTE}
      >
        {grid.map((row, r) => row.map((val, c) => (
          // Key includes val so React recreates the div when a tile merges (triggers animation)
          <div key={val ? `${r}-${c}-${val}` : `empty-${r}-${c}`} style={{
            width: TILE_SIZE, height: TILE_SIZE, borderRadius: '10px',
            background: val ? (TILE_BG[val] || '#e91e8c') : 'rgba(255,255,255,0.04)',
            border: val ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: val ? 'tileAppear 0.18s ease' : 'none',
          }}>
            {val ? (
              <>
                <div style={{ fontSize: val >= 512 ? '1.8rem' : '2rem', lineHeight: 1 }}>{TILE_EMOJI[val] || '👑'}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', fontWeight: 600 }}>{val}</div>
              </>
            ) : null}
          </div>
        )))}
      </div>

      <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', textAlign: 'center' }}>
        Arrow keys / Swipe · {aiOn ? 'AI is playing — tap to take over' : 'Merge to reach 👑 2048'}
      </div>

      {/* Win — bottom sheet so the board stays visible */}
      {won && !continuedAfterWin && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(to top, rgba(7,7,26,0.98) 85%, transparent)', padding: '28px 20px 36px', animation: 'slideUp 0.3s ease' }}>
          <div style={{ maxWidth: '340px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '6px' }}>👑</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#fff', margin: '0 0 4px' }}>You reached 2048!</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 18px' }}>Score: <strong style={{ color: '#e91e8c' }}>{score}</strong></p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setContinuedAfterWin(true); setWon(false); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Keep going</button>
              <button onClick={restart} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>New game</button>
            </div>
          </div>
        </div>
      )}

      {/* Game over — bottom sheet so the board stays visible */}
      {over && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(to top, rgba(7,7,26,0.98) 85%, transparent)', padding: '28px 20px 36px', animation: 'slideUp 0.3s ease' }}>
          <div style={{ maxWidth: '340px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '6px' }}>💔</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#fff', margin: '0 0 4px' }}>No more moves!</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 18px' }}>Score: <strong style={{ color: '#e91e8c' }}>{score}</strong> · Best: <strong style={{ color: '#b388ff' }}>{best}</strong></p>
            <button onClick={restart} style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Try again 💕</button>
          </div>
        </div>
      )}
    </div>
  );
}
