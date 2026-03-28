'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const EMOJI_POOL = ['♥️','💕','💖','💗','💝','🌹','💌','🥰','🦋','🌸','✨','🎀'];

const DIFFICULTIES = {
  Easy:   { cols: 3, rows: 4, pairs: 6,  label: 'Easy' },
  Medium: { cols: 4, rows: 4, pairs: 8,  label: 'Medium' },
  Hard:   { cols: 4, rows: 6, pairs: 12, label: 'Hard' },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(difficulty) {
  const { pairs } = DIFFICULTIES[difficulty];
  const emojis = EMOJI_POOL.slice(0, pairs);
  const doubled = shuffle([...emojis, ...emojis]);
  return doubled.map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
    flipping: false,
  }));
}

function fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MemoryMatch() {
  const [difficulty, setDifficulty] = useState('Easy');
  const [cards, setCards] = useState(() => buildCards('Easy'));
  const [firstPick, setFirstPick] = useState(null);
  const [secondPick, setSecondPick] = useState(null);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [lockBoard, setLockBoard] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (timerActive && !gameWon) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, gameWon]);

  const startNewGame = useCallback((diff) => {
    setDifficulty(diff);
    setCards(buildCards(diff));
    setFirstPick(null);
    setSecondPick(null);
    setMoves(0);
    setTimer(0);
    setTimerActive(false);
    setGameWon(false);
    setLockBoard(false);
    setShowBurst(false);
  }, []);

  const handleCardClick = useCallback((id) => {
    if (lockBoard || gameWon) return;

    // Check if card is clickable
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      return prev.map((c) => c.id === id ? { ...c, flipped: true } : c);
    });

    if (!timerActive) setTimerActive(true);

    setFirstPick((fp) => {
      if (fp === null) {
        // first pick: just store it
        return id;
      }

      // second pick
      setSecondPick(id);
      setMoves((m) => m + 1);

      // We need the current cards to compare — use a ref approach via functional update
      setCards((prev) => {
        const first = prev.find((c) => c.id === fp);
        const second = prev.find((c) => c.id === id);
        if (!first || !second || fp === id) return prev;

        if (first.emoji === second.emoji) {
          // Match!
          const next = prev.map((c) =>
            c.id === fp || c.id === id ? { ...c, flipped: true, matched: true } : c
          );
          const allMatched = next.every((c) => c.matched);
          if (allMatched) {
            setTimeout(() => {
              setGameWon(true);
              setTimerActive(false);
              setShowBurst(true);
            }, 400);
          }
          setTimeout(() => {
            setFirstPick(null);
            setSecondPick(null);
            setLockBoard(false);
          }, 400);
          return next;
        } else {
          // No match — flip back after delay
          setLockBoard(true);
          const prevWithSecond = prev.map((c) =>
            c.id === id ? { ...c, flipped: true } : c
          );
          setTimeout(() => {
            setCards((c) =>
              c.map((card) =>
                card.id === fp || card.id === id
                  ? { ...card, flipped: false }
                  : card
              )
            );
            setFirstPick(null);
            setSecondPick(null);
            setLockBoard(false);
          }, 1000);
          return prevWithSecond;
        }
      });

      return null; // reset firstPick
    });
  }, [lockBoard, gameWon, timerActive]);

  const matched = cards.filter((c) => c.matched).length / 2;
  const total = cards.length / 2;
  const { cols } = DIFFICULTIES[difficulty];

  const burstEmojis = ['♥', '💕', '🌸', '✨', '💖', '🎀', '💗', '🌹'];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 80px',
      }}
    >
      <style>{`
        @keyframes burstFloat {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
        }
        @keyframes cardFlipIn {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes matchGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(72,199,142,0.5); }
          50% { box-shadow: 0 0 20px rgba(72,199,142,0.9); }
        }
      `}</style>

      <div style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
        <Link href="/games" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '0.95rem' }}>
          ← Games
        </Link>
      </div>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          fontWeight: 700,
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        🃏 Memory Match
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px', fontSize: '0.9rem' }}>
        Can you remember how much I love you?
      </p>

      {/* Difficulty */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {Object.keys(DIFFICULTIES).map((d) => (
          <button
            key={d}
            onClick={() => startNewGame(d)}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              border: '1.5px solid #e91e8c',
              background: difficulty === d ? '#e91e8c' : 'transparent',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.9rem',
              fontWeight: difficulty === d ? 700 : 400,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '10px 24px',
        }}
      >
        <span>Moves: <strong style={{ color: '#e91e8c' }}>{moves}</strong></span>
        <span>Time: <strong style={{ color: '#b388ff' }}>{fmt(timer)}</strong></span>
        <span>Matched: <strong style={{ color: '#4caf50' }}>{matched}/{total}</strong></span>
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '10px',
          maxWidth: `${cols * 90}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {cards.map((card) => (
          <MemoryCard
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card.id)}
          />
        ))}

        {/* Win burst */}
        {showBurst && burstEmojis.map((em, i) => {
          const angle = (Math.PI * 2 * i) / burstEmojis.length;
          const dist = 80 + Math.random() * 40;
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                fontSize: '1.5rem',
                pointerEvents: 'none',
                animation: 'burstFloat 1s ease-out forwards',
                '--tx': `${tx}px`,
                '--ty': `${ty}px`,
                animationDelay: `${i * 0.05}s`,
              }}
            >
              {em}
            </div>
          );
        })}
      </div>

      {/* Win overlay */}
      {gameWon && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7,7,26,0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '4rem' }}>🎉</div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '2rem',
              color: '#e91e8c',
              margin: 0,
            }}
          >
            You remembered!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            Time: <strong style={{ color: '#b388ff' }}>{fmt(timer)}</strong> · Moves: <strong style={{ color: '#e91e8c' }}>{moves}</strong>
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => startNewGame(difficulty)}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Play Again
            </button>
            <Link
              href="/games"
              style={{
                padding: '12px 28px',
                background: 'transparent',
                color: '#b388ff',
                border: '1.5px solid #b388ff',
                borderRadius: '50px',
                fontSize: '1rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Games
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MemoryCard({ card, onClick }) {
  const [displayEmoji, setDisplayEmoji] = useState(card.flipped || card.matched);
  const [scale, setScale] = useState(1);
  const prevFlipped = useRef(card.flipped || card.matched);

  useEffect(() => {
    const nowVisible = card.flipped || card.matched;
    if (nowVisible !== prevFlipped.current) {
      // Animate: shrink, swap, expand
      setScale(0);
      const t = setTimeout(() => {
        setDisplayEmoji(nowVisible);
        setScale(1);
      }, 150);
      prevFlipped.current = nowVisible;
      return () => clearTimeout(t);
    }
  }, [card.flipped, card.matched]);

  const isVisible = card.flipped || card.matched;

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '1',
        minWidth: '54px',
        maxWidth: '80px',
        justifySelf: 'center',
        borderRadius: '12px',
        border: card.matched
          ? '2px solid rgba(72,199,142,0.7)'
          : '1.5px solid rgba(233,30,140,0.3)',
        background: isVisible
          ? card.matched
            ? 'rgba(72,199,142,0.12)'
            : 'rgba(233,30,140,0.15)'
          : 'rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: card.matched ? 'default' : 'pointer',
        fontSize: 'clamp(1.2rem, 5vw, 1.8rem)',
        transition: 'transform 0.15s, border-color 0.3s',
        transform: `scaleX(${scale})`,
        animation: card.matched ? 'matchGlow 2s infinite' : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {displayEmoji ? card.emoji : <span style={{ color: 'rgba(233,30,140,0.4)', fontSize: '1.2rem' }}>♥</span>}
    </div>
  );
}
