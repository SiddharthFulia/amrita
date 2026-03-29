'use client';

const STATE_BG = {
  correct: '#4caf50',
  present: '#e6a817',
  absent:  'rgba(255,255,255,0.09)',
  active:  'rgba(255,255,255,0.1)',
  empty:   'rgba(255,255,255,0.04)',
};

export default function Cell({ letter, state, isLocked, isRevealed, delay = 0, size = 52, levelColor = '#e91e8c' }) {
  let bg, border, anim;

  if (isLocked && !isRevealed) {
    // Currently flipping — CSS animation reveals color at the midpoint
    bg = 'rgba(255,255,255,0.04)';
    border = '2px solid rgba(255,255,255,0.1)';
    anim = `wordleFlip 0.32s ease ${delay}ms both`;
  } else if (isLocked && isRevealed) {
    bg = STATE_BG[state] || STATE_BG.absent;
    border = '2px solid transparent';
    anim = 'none';
  } else {
    bg = STATE_BG[state] || STATE_BG.empty;
    border = state === 'active' ? `2px solid ${levelColor}90` : '2px solid rgba(255,255,255,0.15)';
    anim = letter && !isLocked ? 'wordlePop 0.1s ease' : 'none';
  }

  return (
    <div style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: bg,
      border,
      borderRadius: '8px',
      fontSize: size >= 56 ? '1.55rem' : size >= 50 ? '1.35rem' : '1.1rem',
      fontWeight: 700,
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      userSelect: 'none',
      animation: anim,
      // CSS variable for the flip animation to reveal the correct color at midpoint
      '--result-bg': STATE_BG[state] || STATE_BG.absent,
    }}>
      {letter}
    </div>
  );
}
