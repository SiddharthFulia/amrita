'use client';

const ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  ['ENTER', ...'ZXCVBNM'.split(''), '⌫'],
];

const KEY_BG = {
  correct: '#4caf50',
  present: '#e6a817',
  absent:  'rgba(255,255,255,0.09)',
};

export default function Keyboard({ keyStates, onKey }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '440px' }}>
      {ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
          {row.map(key => {
            const state = keyStates[key];
            const isWide = key === 'ENTER' || key === '⌫';
            return (
              <button
                key={key}
                onPointerDown={(e) => { e.preventDefault(); onKey(key); }}
                style={{
                  flex: isWide ? 1.7 : 1,
                  maxWidth: isWide ? 58 : 36,
                  height: 50,
                  borderRadius: '7px',
                  border: 'none',
                  background: state ? KEY_BG[state] : 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: isWide ? '10px' : '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'background 0.25s, transform 0.08s',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
