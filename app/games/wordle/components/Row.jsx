'use client';
import Cell from './Cell';

export default function Row({ letters, states, isLocked, isRevealed, isShaking, length, levelColor, tileSize }) {
  return (
    <div style={{
      display: 'flex',
      gap: '5px',
      animation: isShaking ? 'wordleShake 0.45s ease' : 'none',
    }}>
      {Array.from({ length }).map((_, c) => (
        <Cell
          key={c}
          letter={letters[c] || ''}
          state={states[c] || 'empty'}
          isLocked={isLocked}
          isRevealed={isRevealed}
          delay={c * 120}
          size={tileSize}
          levelColor={levelColor}
        />
      ))}
    </div>
  );
}
