'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const TILES = { 2:'💕',4:'🌸',8:'💗',16:'🌺',32:'💖',64:'🌹',128:'💝',256:'🌻',512:'💘',1024:'🌟',2048:'👑' };
const BG = { 2:'rgba(233,30,140,0.12)',4:'rgba(233,30,140,0.22)',8:'rgba(233,30,140,0.35)',16:'rgba(179,136,255,0.3)',32:'rgba(179,136,255,0.45)',64:'rgba(179,136,255,0.6)',128:'rgba(233,30,140,0.55)',256:'rgba(233,30,140,0.7)',512:'rgba(179,136,255,0.75)',1024:'rgba(233,30,140,0.88)',2048:'linear-gradient(135deg,#e91e8c,#b388ff)' };

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

function slide(row) {
  const filtered = row.filter(Boolean);
  const merged = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function moveLeft(grid) {
  let score = 0;
  const next = grid.map(row => { const r = slide(row); score += r.score; return r.row; });
  return { grid: next, score };
}

function rotate(grid) { return grid[0].map((_, c) => grid.map(row => row[c]).reverse()); }

function move(grid, dir) {
  let g = grid;
  let rotations = 0;
  if (dir === 'up')    { g = rotate(rotate(rotate(g))); rotations = 3; }
  if (dir === 'right') { g = rotate(rotate(g)); rotations = 2; }
  if (dir === 'down')  { g = rotate(g); rotations = 1; }
  const { grid: moved, score } = moveLeft(g);
  let result = moved;
  for (let i = 0; i < (4 - rotations) % 4; i++) result = rotate(result);
  return { grid: result, score };
}

function equal(a, b) { return a.every((row, r) => row.every((v, c) => v === b[r][c])); }

function canMove(grid) {
  for (const dir of ['left','right','up','down']) {
    const { grid: moved } = move(grid, dir);
    if (!equal(grid, moved)) return true;
  }
  return false;
}

function getBest() { try { return parseInt(localStorage.getItem('g2048_best') || '0'); } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem('g2048_best', String(v)); } catch {} }

export default function Game2048Page() {
  const [grid, setGrid] = useState(() => initGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);
  const [continuedAfterWin, setContinuedAfterWin] = useState(false);
  const [mergeFlash, setMergeFlash] = useState(new Set());

  useEffect(() => { setBest(getBest()); }, []);

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

  useEffect(() => {
    const MAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const h = (e) => { const d = MAP[e.key]; if (d) { e.preventDefault(); doMove(d); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doMove]);

  // Swipe
  const t0 = useRef(null);
  const onTS = (e) => { t0.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTE = (e) => {
    if (!t0.current) return;
    const dx = e.changedTouches[0].clientX - t0.current.x;
    const dy = e.changedTouches[0].clientY - t0.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
    t0.current = null;
  };

  const restart = () => { setGrid(initGrid()); setScore(0); setWon(false); setOver(false); setContinuedAfterWin(false); };

  const TILE_SIZE = 72;

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 40px' }}>
      <style>{`@keyframes pop2048 { 0%{transform:scale(0.5)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }`}</style>

      <div style={{ width: '100%', maxWidth: '320px', marginBottom: '8px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
      </div>

      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.2rem', color: '#e91e8c', margin: '0 0 4px', textShadow: '0 0 20px #e91e8c80' }}>2048 💕</h1>

      {/* Score bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {[['Score', score], ['Best', best]].map(([label, val]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '8px 18px', textAlign: 'center', minWidth: '80px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>{val}</div>
          </div>
        ))}
        <button onClick={restart} style={{ background: 'rgba(233,30,140,0.15)', border: '1px solid rgba(233,30,140,0.3)', borderRadius: '10px', padding: '8px 14px', color: '#e91e8c', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>New</button>
      </div>

      {/* Grid */}
      <div
        style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', touchAction: 'none', userSelect: 'none' }}
        onTouchStart={onTS} onTouchEnd={onTE}
      >
        {grid.map((row, r) => row.map((val, c) => (
          <div key={`${r}-${c}`} style={{
            width: TILE_SIZE, height: TILE_SIZE, borderRadius: '10px',
            background: val ? (BG[val] || '#e91e8c') : 'rgba(255,255,255,0.04)',
            border: val ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            animation: val ? 'pop2048 0.15s ease' : 'none',
          }}>
            {val ? (
              <>
                <div style={{ fontSize: val >= 512 ? '1.8rem' : '2rem', lineHeight: 1 }}>{TILES[val] || '👑'}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '2px', fontWeight: 600 }}>{val}</div>
              </>
            ) : null}
          </div>
        )))}
      </div>

      <div style={{ marginTop: '14px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Arrow keys / Swipe to merge tiles</div>

      {/* Win overlay */}
      {won && !continuedAfterWin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(233,30,140,0.4)', borderRadius: '20px', padding: '40px 32px', textAlign: 'center', maxWidth: '300px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👑</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 8px' }}>You reached 2048!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 24px' }}>Score: {score}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setContinuedAfterWin(true); setWon(false); }} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Keep going</button>
              <button onClick={restart} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>New game</button>
            </div>
          </div>
        </div>
      )}

      {/* Game over */}
      {over && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(233,30,140,0.3)', borderRadius: '20px', padding: '40px 32px', textAlign: 'center', maxWidth: '300px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>💔</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 8px' }}>No more moves!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 24px' }}>Score: {score}</p>
            <button onClick={restart} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Try again 💕</button>
          </div>
        </div>
      )}
    </div>
  );
}

