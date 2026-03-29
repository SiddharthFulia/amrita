'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Word pools by length ─────────────────────────────────────────────────────
const POOL = {
  4: [
    'LOVE','HOPE','CUTE','KISS','CALM','COZY','DEAR','FOND','GLOW','GLEE',
    'KEEN','LACE','MUSE','NICE','NEAT','ROSY','SOFT','STAR','PURE','WARM',
    'WILD','ZEAL','DAWN','DUSK','GIFT','HEAL','HUSH','IRIS','LILT','MEEK',
    'MILD','MOON','MIST','OPAL','PLUM','SILK','SNOW','TIDE','VEIL','WISH',
    'WISP','LARK','BOON','FAWN','JADE','VALE','SUNG','TAME','TINT','WRAP',
    'SOUL','SAGE','BLEW','NEST','GUST','ZEST','LUSH','DEWY','POSH','AIRY',
    'BASK','BEAM','ZING','FIZZ','HAZY','NOOK','PURL','RIME','TUFT','WAFT',
    'LIMY','BRIM','DOTE','ENVY','FLUX','HEED','HALO','IDYL','JEST','KNIT',
  ],
  5: [
    'HEART','ROSES','LOVER','SWEET','BLISS','ANGEL','HONEY','MAGIC','PEACE','SMILE',
    'STARS','SUGAR','DANCE','BLOOM','FLAME','DREAM','FAITH','LIGHT','MERCY','SHINE',
    'SPARK','TRUST','GRACE','DAISY','NIGHT','CANDY','CHARM','FAIRY','BLUSH','BLESS',
    'TULIP','HAPPY','SUNNY','LUCKY','PETAL','PLUSH','PIANO','MERRY','CLOUD','BRAVE',
    'OCEAN','MISTY','LILAC','PEACH','AMBER','CORAL','IVORY','LUNAR','OASIS','HAVEN',
    'MOSSY','BRISK','ZESTY','FLOAT','BROOK','ELATE','VIVID','GIDDY','MIRTH','PRIDE',
    'VALOR','NOBLE','LOFTY','VERVE','GUSTO','POISE','ADORE','YEARN','SAVOR','REVEL',
    'LYRIC','RHYME','VERSE','KITTY','BUNNY','FUZZY','DOWNY','SILKY','BERRY','MANGO',
    'PANSY','POPPY','VIOLA','BENCH','GROVE','GLADE','SHORE','CLIFF','DUNES','VILLA',
    'EMBER','FROST','GLINT','JEWEL','KARMA','LAPIS','PRISM','QUILL','SABLE','TAFFY',
    'FLOWY','WISPY','YIELD','AZURE','BLAZE','CRISP','DELTA','IRONY','MUTED','OMBRE',
    'DUSKY','GLOWY','PERKY','LEAFY','CRIMP','SWOON','AMOUR','DOTES','FLAIR','LUCID',
  ],
  6: [
    'BEAUTY','CUDDLE','DAINTY','GOLDEN','GENTLE','HARBOR','HEAVEN','JOYFUL','LOVELY','MELLOW',
    'MYSTIC','PETALS','SERENE','SILKEN','TENDER','VELVET','WARMTH','BREEZE','CANDLE','CASTLE',
    'COSMOS','CRADLE','DEARLY','DIVINE','DREAMY','EARTHY','ELATED','FAIRLY','FLORAL','FLUFFY',
    'GARDEN','GILDED','HUSHED','JOYOUS','KINDLY','LAVISH','LOVING','COBALT','RADIAL','SAVORY',
    'SOFTEN','SOLACE','STARRY','SUNLIT','SUNSET','THATCH','VELOUR','WANDER','WISTLY','ZONING',
    'BLITHE','BONNIE','CHERUB','CLOVER','COAXED','DOTING','FEISTY','FROTHY','GROOVY','HEARTY',
    'HOMELY','LIVELY','MARBLE','MIRROR','NESTLE','NIMBLE','PEACHY','PURPLE','QUAINT','REVERE',
    'RIBBON','RIPPLE','ROOTED','RUSTIC','SACRED','SILVER','SIMPLE','SLEEPY','SPRING','STEAMY',
    'STORMY','SUBTLE','SUPPLE','TANGLE','TROPIC','TUSCAN','UNIQUE','UPBEAT','SPROUT','VIVACE',
    'WALNUT','WILLOW','WONDER','YELLOW','ZENITH','ZEPHYR','BOUNTY','BEACON','BOTANY','BREEZY',
    'CITRUS','DAMASK','ELFISH','FERVID','FLORET','GOBLET','GRACED','GRASSY','HEARTH','HERALD',
    'HOLLOW','HUSTLE','ICONIC','INLAID','JOVIAL','KERNEL','LOCKET','LUSTER','MANTLE','MEADOW',
  ],
};

const LEVELS = [
  { id: 'easy',   label: 'Easy',   letters: 4, attempts: 5, color: '#4caf50', desc: '4-letter words · 5 tries' },
  { id: 'medium', label: 'Medium', letters: 5, attempts: 6, color: '#ff9800', desc: '5-letter words · 6 tries' },
  { id: 'hard',   label: 'Hard',   letters: 6, attempts: 6, color: '#e91e8c', desc: '6-letter words · 6 tries — must use found letters' },
];

const QWERTY = ['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), ['⌫', ...'ZXCVBNM'.split(''), '↵']];

function dailySeed(offset = 0) {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + offset;
}

function getTarget(levelId) {
  const lvl = LEVELS.find(l => l.id === levelId);
  const pool = POOL[lvl.letters];
  const offset = levelId === 'easy' ? 0 : levelId === 'medium' ? 7777 : 13131;
  return pool[dailySeed(offset) % pool.length];
}

function evalGuess(word, target) {
  const result = Array(target.length).fill('absent');
  const rem = target.split('');
  for (let i = 0; i < target.length; i++) {
    if (word[i] === target[i]) { result[i] = 'correct'; rem[i] = null; }
  }
  for (let i = 0; i < target.length; i++) {
    if (result[i] === 'correct') continue;
    const idx = rem.indexOf(word[i]);
    if (idx !== -1) { result[i] = 'present'; rem[idx] = null; }
  }
  return result;
}

function getKeyStates(guesses) {
  const map = {};
  guesses.forEach(g => {
    if (!g.locked) return;
    g.letters.forEach((l, i) => {
      if (!l) return;
      const cur = map[l], next = g.states[i];
      if (cur === 'correct') return;
      if (cur === 'present' && next === 'absent') return;
      map[l] = next;
    });
  });
  return map;
}

// Hard mode: all green/yellow letters from prev guesses must appear in next guess
function hardModeViolation(word, guesses, target) {
  const required = {}; // letter → min count
  guesses.forEach(g => {
    if (!g.locked) return;
    const counts = {};
    g.letters.forEach((l, i) => {
      if (g.states[i] === 'correct' || g.states[i] === 'present') {
        counts[l] = (counts[l] || 0) + 1;
      }
    });
    Object.entries(counts).forEach(([l, n]) => { required[l] = Math.max(required[l] || 0, n); });
    // correct position must be reused
    g.letters.forEach((l, i) => {
      if (g.states[i] === 'correct' && word[i] !== l) return; // return handled below
    });
  });
  for (const [l, n] of Object.entries(required)) {
    if ((word.split('').filter(c => c === l).length) < n) return `Must include "${l}"`;
  }
  // correct positions must stay
  for (const g of guesses) {
    if (!g.locked) continue;
    for (let i = 0; i < g.letters.length; i++) {
      if (g.states[i] === 'correct' && word[i] !== g.letters[i]) return `Letter ${i + 1} must be "${g.letters[i]}"`;
    }
  }
  return null;
}

const TILE_BG = { correct: '#4caf50', present: '#e6a817', absent: 'rgba(255,255,255,0.09)', empty: 'rgba(255,255,255,0.04)', active: 'rgba(255,255,255,0.1)' };
const KEY_BG  = { correct: '#4caf50', present: '#e6a817', absent: 'rgba(255,255,255,0.09)' };

export default function WordlePage() {
  const [levelId, setLevelId] = useState(null); // null = level select screen
  const [target, setTarget] = useState('');
  const [lvl, setLvl] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  const [gameOver, setGameOver] = useState(false); // false | 'win' | 'lose'
  const [shake, setShake] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [confetti, setConfetti] = useState([]);
  const [revealedRows, setRevealedRows] = useState(new Set());

  const startLevel = useCallback((id) => {
    const l = LEVELS.find(x => x.id === id);
    const t = getTarget(id);
    setLvl(l);
    setTarget(t);
    setLevelId(id);
    setRow(0); setCol(0); setGameOver(false); setShake(false); setErrMsg(''); setConfetti([]); setRevealedRows(new Set());
    setGuesses(Array.from({ length: l.attempts }, () => ({ letters: Array(l.letters).fill(''), states: Array(l.letters).fill('empty'), locked: false })));
  }, []);

  const showErr = (msg) => { setErrMsg(msg); setTimeout(() => setErrMsg(''), 1800); };

  const addLetter = useCallback((letter) => {
    if (gameOver || !lvl || col >= lvl.letters) return;
    setGuesses(prev => {
      const next = prev.map(g => ({ ...g, letters: [...g.letters], states: [...g.states] }));
      next[row].letters[col] = letter;
      next[row].states[col] = 'active';
      return next;
    });
    setCol(c => c + 1);
  }, [gameOver, lvl, col, row]);

  const deleteLetter = useCallback(() => {
    if (gameOver || col === 0) return;
    setGuesses(prev => {
      const next = prev.map(g => ({ ...g, letters: [...g.letters], states: [...g.states] }));
      next[row].letters[col - 1] = '';
      next[row].states[col - 1] = 'empty';
      return next;
    });
    setCol(c => c - 1);
  }, [gameOver, col, row]);

  const submit = useCallback(() => {
    if (gameOver || !lvl || col < lvl.letters) { if (col < lvl?.letters) showErr('Not enough letters'); return; }
    const word = guesses[row].letters.join('');

    // Hard mode check
    if (levelId === 'hard') {
      const violation = hardModeViolation(word, guesses.slice(0, row), target);
      if (violation) { showErr(violation); setShake(true); setTimeout(() => setShake(false), 500); return; }
    }

    const states = evalGuess(word, target);
    const flipDone = lvl.letters * 120 + 350;
    const lockedRow = row;

    setGuesses(prev => {
      const next = prev.map(g => ({ ...g, letters: [...g.letters], states: [...g.states] }));
      next[lockedRow].states = states;
      next[lockedRow].locked = true;
      return next;
    });
    // reveal colors only after each tile has flipped past its midpoint
    setTimeout(() => setRevealedRows(prev => new Set([...prev, lockedRow])), flipDone);

    if (word === target) {
      setTimeout(() => {
        setGameOver('win');
        setConfetti(Array.from({ length: 32 }, (_, i) => ({ id: i, x: Math.random() * 100, delay: Math.random() * 1.2, emoji: ['💕','💖','✨','🌸','💝','🌟'][i % 6] })));
      }, flipDone + 200);
    } else if (row === lvl.attempts - 1) {
      setTimeout(() => setGameOver('lose'), flipDone + 200);
    } else {
      setRow(r => r + 1);
      setCol(0);
    }
  }, [gameOver, lvl, col, row, guesses, target, levelId]);

  const handleKey = useCallback((key) => {
    if (key === '⌫' || key === 'BACKSPACE') { deleteLetter(); return; }
    if (key === '↵' || key === 'ENTER') { submit(); return; }
    if (/^[A-Z]$/.test(key)) addLetter(key);
  }, [addLetter, deleteLetter, submit]);

  useEffect(() => {
    if (!levelId) return;
    const h = (e) => handleKey(e.key.toUpperCase());
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleKey, levelId]);

  const keyStates = lvl ? getKeyStates(guesses) : {};
  const tileSize = lvl ? (lvl.letters <= 4 ? 58 : lvl.letters === 5 ? 52 : 46) : 52;

  // ── Level select ──────────────────────────────────────────────────────────
  if (!levelId) {
    return (
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '360px', marginBottom: '24px' }}>
          <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem' }}>← Games</Link>
        </div>
        <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.5rem', color: '#e91e8c', margin: '0 0 6px', textShadow: '0 0 20px #e91e8c60' }}>Wordle 💕</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 40px' }}>Every word is love-themed 🌸</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '360px' }}>
          {LEVELS.map(l => (
            <button key={l.id} onClick={() => startLevel(l.id)} style={{
              background: `rgba(${l.id==='easy'?'76,175,80':l.id==='medium'?'255,152,0':'233,30,140'},0.08)`,
              border: `1.5px solid ${l.color}55`,
              borderRadius: '16px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left',
              transition: 'transform 0.15s, border-color 0.15s',
              fontFamily: "'Inter', sans-serif", color: '#fff',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=l.color+'99'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=l.color+'55'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ background: l.color, borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#fff' }}>{l.label.toUpperCase()}</span>
                <span style={{ color: l.color, fontSize: '13px', fontWeight: 600 }}>
                  {l.id==='easy'?'4 letters':''}
                  {l.id==='medium'?'5 letters':''}
                  {l.id==='hard'?'6 letters + hard rules':''}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{l.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Game ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px 40px' }}>
      <style>{`
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }
        @keyframes shakeRow { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 60%{transform:translateX(8px)} 80%{transform:translateX(-4px)} }
        @keyframes fallDown { 0%{transform:translateY(-30px) scale(1.2);opacity:1} 100%{transform:translateY(110vh) rotate(540deg);opacity:0} }
        @keyframes flipReveal {
          0%   { transform:rotateX(0deg); background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.12); }
          48%  { transform:rotateX(-90deg); background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.12); }
          52%  { transform:rotateX(-90deg); background:var(--result); border-color:transparent; }
          100% { transform:rotateX(0deg); background:var(--result); border-color:transparent; }
        }
        @keyframes errPop { 0%{transform:translateX(-50%) scale(0.8);opacity:0} 20%{transform:translateX(-50%) scale(1.05);opacity:1} 80%{opacity:1} 100%{opacity:0} }
      `}</style>

      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.9rem', flexShrink: 0 }}>← Games</Link>
        <div style={{ flex: 1 }} />
        {LEVELS.map(l => (
          <button key={l.id} onClick={() => startLevel(l.id)} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            background: levelId === l.id ? l.color : 'rgba(255,255,255,0.07)',
            border: `1px solid ${levelId === l.id ? l.color : 'rgba(255,255,255,0.12)'}`,
            color: '#fff', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            transition: 'background 0.15s',
          }}>{l.label}</button>
        ))}
      </div>

      <h1 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2rem', color: lvl.color, margin: '0 0 2px', textShadow: `0 0 20px ${lvl.color}60` }}>
        Wordle — {lvl.label} 💕
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: '0 0 16px' }}>
        {lvl.letters}-letter word · {lvl.attempts} tries · new word daily 🌸
      </p>

      {/* Error toast */}
      {errMsg && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(13,13,43,0.95)', border: '1px solid rgba(233,30,140,0.4)', borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#fff', zIndex: 200, animation: 'errPop 1.8s ease forwards', whiteSpace: 'nowrap' }}>
          {errMsg}
        </div>
      )}

      {/* Confetti */}
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '-20px', fontSize: '22px', animation: `fallDown ${1.4 + c.delay}s ease ${c.delay * 0.4}s forwards`, pointerEvents: 'none', zIndex: 300 }}>{c.emoji}</div>
      ))}

      {/* Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
        {guesses.map((g, r) => (
          <div key={r} style={{ display: 'flex', gap: '5px', animation: shake && r === row ? 'shakeRow 0.45s ease' : 'none' }}>
            {g.letters.map((letter, c) => {
              const state = g.states[c];
              const isAnimating = g.locked && !revealedRows.has(r);
              const isRevealed = g.locked && revealedRows.has(r);

              let bg, border, anim, cssVars = {};
              if (isAnimating) {
                bg = 'rgba(255,255,255,0.04)';
                border = '2px solid rgba(255,255,255,0.12)';
                anim = `flipReveal 0.32s ease ${c * 120}ms both`;
                cssVars = { '--result': TILE_BG[state] || TILE_BG.absent };
              } else if (isRevealed) {
                bg = TILE_BG[state] || TILE_BG.absent;
                border = '2px solid transparent';
                anim = 'none';
              } else {
                bg = TILE_BG[state] || TILE_BG.empty;
                border = state === 'active' ? `2px solid ${lvl.color}90` : '2px solid rgba(255,255,255,0.12)';
                anim = letter && !g.locked ? 'pop 0.12s ease' : 'none';
              }

              return (
                <div key={c} style={{
                  width: tileSize, height: tileSize,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg, border, borderRadius: '8px',
                  fontSize: tileSize >= 56 ? '1.5rem' : '1.25rem', fontWeight: 700, color: '#fff',
                  animation: anim,
                  ...cssVars,
                }}>{letter}</div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', maxWidth: '420px' }}>
        {QWERTY.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            {row.map(key => {
              const state = keyStates[key];
              const isSpecial = key === '⌫' || key === '↵';
              return (
                <button key={key} onClick={() => handleKey(key)} style={{
                  flex: isSpecial ? 1.6 : 1, maxWidth: isSpecial ? 52 : 34, height: 46,
                  borderRadius: '6px', border: 'none',
                  background: state ? KEY_BG[state] : 'rgba(255,255,255,0.11)',
                  color: '#fff', fontSize: isSpecial ? '11px' : '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'background 0.3s',
                }}>{key}</button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Hard mode hint */}
      {levelId === 'hard' && (
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '10px', textAlign: 'center' }}>
          Hard mode: confirmed letters must be used in every guess
        </p>
      )}

      {/* Win overlay */}
      {gameOver === 'win' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(233,30,140,0.4)', borderRadius: '22px', padding: '40px 32px', textAlign: 'center', maxWidth: '300px' }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>💝</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 8px' }}>You got it!</h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: '0 0 6px' }}>The word was</p>
            <p style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '6px', color: '#4caf50', margin: '0 0 4px' }}>{target}</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 24px' }}>in {row + 1} / {lvl.attempts} tries · New word tomorrow 🌸</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setLevelId(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Change level</button>
              <Link href="/games" style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,#e91e8c,#b388ff)', color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>← Games</Link>
            </div>
          </div>
        </div>
      )}

      {/* Lose overlay */}
      {gameOver === 'lose' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(233,30,140,0.3)', borderRadius: '22px', padding: '40px 32px', textAlign: 'center', maxWidth: '300px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💔</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 8px' }}>So close!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 6px' }}>The word was</p>
            <p style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '6px', color: '#e91e8c', margin: '0 0 4px' }}>{target}</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 24px' }}>New word tomorrow 🌸</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setLevelId(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Change level</button>
              <button onClick={() => startLevel(levelId)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(233,30,140,0.25)', border: '1px solid rgba(233,30,140,0.4)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Same level</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
