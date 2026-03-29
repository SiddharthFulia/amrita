'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Grid from './components/Grid';
import Keyboard from './components/Keyboard';
import {
  LEVELS, getTarget,
  checkGuess, mergeKeyStates, hardModeViolation,
  getShareText, saveGame, loadGame, loadStreak, saveStreak,
} from './utils/wordle';

// ─── CSS animations (injected once) ──────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes wordlePop   { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }
  @keyframes wordleShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 60%{transform:translateX(8px)} 80%{transform:translateX(-4px)} }
  @keyframes wordleFlip  {
    0%   { transform:rotateX(0deg); background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1); }
    48%  { transform:rotateX(-90deg); background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1); }
    52%  { transform:rotateX(-90deg); background:var(--result-bg); border-color:transparent; }
    100% { transform:rotateX(0deg);   background:var(--result-bg); border-color:transparent; }
  }
  @keyframes wordleFall  { 0%{transform:translateY(-24px) scale(1.2);opacity:1} 100%{transform:translateY(110vh) rotate(540deg);opacity:0} }
  @keyframes wordleToast { 0%{transform:translateX(-50%) scale(0.85);opacity:0} 15%{transform:translateX(-50%) scale(1.04);opacity:1} 80%{opacity:1} 100%{opacity:0} }
  @keyframes wordleWin   { 0%{transform:translateY(20px);opacity:0} 100%{transform:translateY(0);opacity:1} }
`;

// ─── Build blank guesses array ────────────────────────────────────────────────
function blankGuesses(attempts, letters) {
  return Array.from({ length: attempts }, () => ({
    letters: Array(letters).fill(''),
    states:  Array(letters).fill('empty'),
    locked:  false,
  }));
}

export default function WordlePage() {
  const [levelId,      setLevelId]      = useState(null); // null = level select
  const [target,       setTarget]       = useState('');
  const [lvl,          setLvl]          = useState(null);
  const [guesses,      setGuesses]      = useState([]);
  const [row,          setRow]          = useState(0);
  const [col,          setCol]          = useState(0);
  const [revealedRows, setRevealedRows] = useState(new Set());
  const [shakingRow,   setShakingRow]   = useState(null);
  const [keyStates,    setKeyStates]    = useState({});
  const [gameOver,     setGameOver]     = useState(false); // false | 'win' | 'lose'
  const [errMsg,       setErrMsg]       = useState('');
  const [confetti,     setConfetti]     = useState([]);
  const [streak,       setStreak]       = useState({ streak: 0, best: 0 });
  const [copied,       setCopied]       = useState(false);

  // Load streak on mount
  useEffect(() => { setStreak(loadStreak()); }, []);

  // ── Start / restore level ──────────────────────────────────────────────────
  const startLevel = useCallback((id, restore = null) => {
    const l = LEVELS.find(x => x.id === id);
    const t = getTarget(id);

    if (restore && restore.target === t) {
      // Restore today's saved game
      setGuesses(restore.guesses);
      setRow(restore.row);
      setCol(restore.col);
      setKeyStates(restore.keyStates || {});
      setGameOver(restore.gameOver || false);
      setRevealedRows(new Set(restore.revealedRows || []));
    } else {
      setGuesses(blankGuesses(l.attempts, l.letters));
      setRow(0); setCol(0); setKeyStates({}); setGameOver(false); setRevealedRows(new Set());
    }

    setTarget(t);
    setLvl(l);
    setLevelId(id);
    setErrMsg(''); setConfetti([]); setCopied(false);
  }, []);

  // On mount, try to restore today's saved game
  useEffect(() => {
    const saved = loadGame();
    if (saved?.levelId) startLevel(saved.levelId, saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist whenever game state changes
  useEffect(() => {
    if (!levelId || !guesses.length) return;
    saveGame({
      levelId, target,
      guesses, row, col, keyStates,
      gameOver,
      revealedRows: [...revealedRows],
    });
  }, [levelId, target, guesses, row, col, keyStates, gameOver, revealedRows]);

  // ── Error toast ────────────────────────────────────────────────────────────
  const showErr = useCallback((msg) => {
    setErrMsg(msg);
    setTimeout(() => setErrMsg(''), 1800);
  }, []);

  // ── Input handlers ─────────────────────────────────────────────────────────
  const addLetter = useCallback((letter) => {
    if (gameOver || !lvl || col >= lvl.letters) return;
    setGuesses(prev => {
      const next = prev.map(g => ({ ...g, letters: [...g.letters], states: [...g.states] }));
      next[row].letters[col] = letter;
      next[row].states[col]  = 'active';
      return next;
    });
    setCol(c => c + 1);
  }, [gameOver, lvl, col, row]);

  const deleteLetter = useCallback(() => {
    if (gameOver || col === 0) return;
    setGuesses(prev => {
      const next = prev.map(g => ({ ...g, letters: [...g.letters], states: [...g.states] }));
      next[row].letters[col - 1] = '';
      next[row].states[col - 1]  = 'empty';
      return next;
    });
    setCol(c => c - 1);
  }, [gameOver, col, row]);

  const submit = useCallback(() => {
    if (gameOver || !lvl || col < lvl.letters) {
      if (!gameOver && col < (lvl?.letters ?? 0)) {
        showErr('Not enough letters');
        setShakingRow(row);
        setTimeout(() => setShakingRow(null), 500);
      }
      return;
    }

    const word = guesses[row].letters.join('');

    // Hard mode check
    if (levelId === 'hard') {
      const violation = hardModeViolation(word, guesses.slice(0, row).filter(g => g.locked));
      if (violation) {
        showErr(violation);
        setShakingRow(row);
        setTimeout(() => setShakingRow(null), 500);
        return;
      }
    }

    const states = checkGuess(target, word);
    const lockedRow = row;
    const flipDone  = lvl.letters * 120 + 380;

    // Lock the row and set states immediately (flip animation hides colors until midpoint)
    setGuesses(prev => {
      const next = prev.map(g => ({ ...g, letters: [...g.letters], states: [...g.states] }));
      next[lockedRow].states = states;
      next[lockedRow].locked = true;
      return next;
    });

    // After flip completes: reveal colors and update keyboard
    setTimeout(() => {
      setRevealedRows(prev => new Set([...prev, lockedRow]));
      setKeyStates(prev => mergeKeyStates(prev, guesses[lockedRow].letters, states));
    }, flipDone);

    if (word === target) {
      setTimeout(() => {
        setGameOver('win');
        setConfetti(Array.from({ length: 36 }, (_, i) => ({
          id: i, x: Math.random() * 100, delay: Math.random() * 1.4,
          emoji: ['💕','💖','✨','🌸','💝','🌟','🌺','💗'][i % 8],
        })));
        // Update streak
        setStreak(prev => {
          const ns = prev.streak + 1;
          const nb = Math.max(ns, prev.best);
          saveStreak(ns, nb);
          return { streak: ns, best: nb };
        });
      }, flipDone + 250);
    } else if (row === lvl.attempts - 1) {
      setTimeout(() => setGameOver('lose'), flipDone + 250);
    } else {
      setRow(r => r + 1);
      setCol(0);
    }
  }, [gameOver, lvl, col, row, guesses, target, levelId, showErr]);

  // ── Unified key handler ────────────────────────────────────────────────────
  const handleKey = useCallback((key) => {
    const k = key.toUpperCase();
    if (k === '⌫' || k === 'BACKSPACE') { deleteLetter(); return; }
    if (k === 'ENTER')                   { submit(); return; }
    if (/^[A-Z]$/.test(k))              { addLetter(k); return; }
  }, [addLetter, deleteLetter, submit]);

  // Physical keyboard
  useEffect(() => {
    if (!levelId) return;
    const h = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleKey, levelId]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const share = () => {
    const text = getShareText(levelId, guesses, gameOver === 'win');
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => showErr('Copy failed'));
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  const BASE = { minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px 40px' };

  // ── Level select ───────────────────────────────────────────────────────────
  if (!levelId) {
    return (
      <div style={{ ...BASE, justifyContent: 'center' }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ width: '100%', maxWidth: '360px', marginBottom: '20px' }}>
          <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
        </div>
        <div style={{ fontSize: '3rem', marginBottom: '4px' }}>💕</div>
        <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.8rem', color: '#e91e8c', margin: '0 0 4px', textShadow: '0 0 24px #e91e8c60' }}>Wordle</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '0 0 10px' }}>Every word is love-themed 🌸</p>

        {streak.streak > 0 && (
          <div style={{ marginBottom: '20px', color: '#ffd54f', fontSize: '13px' }}>
            🔥 {streak.streak} day streak · best {streak.best}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '340px' }}>
          {LEVELS.map(l => (
            <button key={l.id} onClick={() => startLevel(l.id)} style={{
              background: `rgba(${l.id==='easy'?'76,175,80':l.id==='medium'?'255,152,0':'233,30,140'},0.08)`,
              border: `1.5px solid ${l.color}44`,
              borderRadius: '16px', padding: '18px 22px', cursor: 'pointer', textAlign: 'left',
              fontFamily: "'Inter', sans-serif", color: '#fff', transition: 'transform 0.14s, border-color 0.14s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=l.color+'99'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=l.color+'44'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                <span style={{ background: l.color, borderRadius: '6px', padding: '2px 9px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>
                  {l.label.toUpperCase()}
                </span>
                <span style={{ color: l.color, fontSize: '13px', fontWeight: 600 }}>{l.id === 'hard' ? '6 letters + hard rules' : l.id === 'medium' ? '5 letters' : '4 letters'}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{l.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Game ───────────────────────────────────────────────────────────────────
  return (
    <div style={BASE}>
      <style>{GLOBAL_CSS}</style>

      {/* Error toast */}
      {errMsg && (
        <div style={{ position: 'fixed', top: '72px', left: '50%', zIndex: 300, background: 'rgba(13,13,43,0.96)', border: '1px solid rgba(233,30,140,0.4)', borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#fff', animation: 'wordleToast 1.8s ease forwards', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {errMsg}
        </div>
      )}

      {/* Confetti */}
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '-20px', fontSize: '22px', animation: `wordleFall ${1.5 + c.delay}s ease ${c.delay * 0.3}s forwards`, pointerEvents: 'none', zIndex: 400 }}>{c.emoji}</div>
      ))}

      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem', flexShrink: 0 }}>← Games</Link>
        <div style={{ flex: 1 }} />
        {LEVELS.map(l => (
          <button key={l.id} onClick={() => startLevel(l.id)} style={{
            padding: '4px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            background: levelId === l.id ? l.color : 'rgba(255,255,255,0.07)',
            border: `1px solid ${levelId === l.id ? l.color : 'rgba(255,255,255,0.12)'}`,
            color: '#fff', cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'background 0.15s',
          }}>{l.label}</button>
        ))}
      </div>

      {/* Title */}
      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '1.9rem', color: lvl.color, margin: '0 0 2px', textShadow: `0 0 20px ${lvl.color}55` }}>
        Wordle — {lvl.label} 💕
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 4px' }}>
        {lvl.letters}-letter word · {lvl.attempts} tries · new word daily
        {streak.streak > 0 && <span style={{ color: '#ffd54f', marginLeft: '8px' }}>🔥 {streak.streak}</span>}
      </p>
      {levelId === 'hard' && (
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', margin: '0 0 14px' }}>Hard: confirmed letters must appear in every guess</p>
      )}
      {levelId !== 'hard' && <div style={{ marginBottom: '14px' }} />}

      {/* Grid */}
      <Grid
        guesses={guesses}
        revealedRows={revealedRows}
        shakingRow={shakingRow}
        level={lvl}
      />

      <div style={{ marginTop: '18px', marginBottom: '10px' }} />

      {/* Keyboard */}
      <Keyboard keyStates={keyStates} onKey={handleKey} />

      {/* Win overlay */}
      {gameOver === 'win' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(233,30,140,0.4)', borderRadius: '22px', padding: '36px 30px', textAlign: 'center', maxWidth: '300px', width: '100%', animation: 'wordleWin 0.3s ease' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💝</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 6px' }}>You got it!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 4px' }}>The word was</p>
            <p style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '6px', color: '#4caf50', margin: '0 0 4px' }}>{target}</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', margin: '0 0 6px' }}>
              in {guesses.filter(g => g.locked).length}/{lvl.attempts} tries
            </p>
            {streak.streak > 0 && (
              <p style={{ color: '#ffd54f', fontSize: '13px', margin: '0 0 20px' }}>🔥 {streak.streak} day streak!</p>
            )}
            <button onClick={share} style={{ width: '100%', padding: '10px', borderRadius: '10px', background: copied ? '#4caf50' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginBottom: '8px' }}>
              {copied ? '✓ Copied!' : '📤 Share result'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setLevelId(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Change level</button>
              <Link href="/games" style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)', color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>← Games</Link>
            </div>
          </div>
        </div>
      )}

      {/* Lose overlay */}
      {gameOver === 'lose' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(233,30,140,0.3)', borderRadius: '22px', padding: '36px 30px', textAlign: 'center', maxWidth: '300px', width: '100%', animation: 'wordleWin 0.3s ease' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>💔</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 6px' }}>So close!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 4px' }}>The word was</p>
            <p style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '6px', color: '#e91e8c', margin: '0 0 16px' }}>{target}</p>
            <button onClick={share} style={{ width: '100%', padding: '10px', borderRadius: '10px', background: copied ? '#4caf50' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginBottom: '8px' }}>
              {copied ? '✓ Copied!' : '📤 Share result'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setLevelId(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Change level</button>
              <button onClick={() => startLevel(levelId)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(233,30,140,0.22)', border: '1px solid rgba(233,30,140,0.4)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Same level</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
