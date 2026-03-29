'use client';
import Row from './Row';

export default function Grid({ guesses, revealedRows, shakingRow, level }) {
  const tileSize = level.letters <= 4 ? 58 : level.letters === 5 ? 52 : 46;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {guesses.map((g, r) => (
        <Row
          key={r}
          letters={g.letters}
          states={g.states}
          isLocked={g.locked}
          isRevealed={revealedRows.has(r)}
          isShaking={shakingRow === r}
          length={level.letters}
          levelColor={level.color}
          tileSize={tileSize}
        />
      ))}
    </div>
  );
}
