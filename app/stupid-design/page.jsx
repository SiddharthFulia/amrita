'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';

// ══════════════════════════════════════════════
// SHARED: Volume display + audio beep
// ══════════════════════════════════════════════
function VolumeDisplay({ volume, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      background: 'rgba(233,30,140,0.08)', border: '1px solid rgba(233,30,140,0.2)',
      borderRadius: '12px', padding: '10px 14px', marginTop: '14px',
    }}>
      <div style={{
        fontSize: '28px', fontWeight: 800,
        background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        fontFamily: "'Inter', sans-serif", minWidth: '60px',
      }}>
        {Math.round(volume)}%
      </div>
      <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: `${volume}%`, height: '100%', borderRadius: '4px',
          background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
          transition: 'width 0.15s ease',
        }} />
      </div>
      {label && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>}
    </div>
  );
}

function HelpBubble({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '8px', cursor: 'pointer' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onClick={() => setShow(s => !s)}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '22px', height: '22px', borderRadius: '50%',
        background: 'rgba(179,136,255,0.15)', border: '1px solid rgba(179,136,255,0.3)',
        fontSize: '12px', fontWeight: 700, color: '#b388ff',
      }}>?</span>
      {show && (
        <div style={{
          position: 'fixed', bottom: 'auto', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(179,136,255,0.3)',
          borderRadius: '14px', padding: '16px 18px', fontSize: '13px',
          color: 'rgba(255,255,255,0.85)', width: 'min(280px, 85vw)', lineHeight: 1.6,
          zIndex: 100, backdropFilter: 'blur(16px)', textAlign: 'center',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

function SectionWrapper({ title, helpText, color, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '20px', padding: 'clamp(14px, 4vw, 24px)', marginBottom: '20px',
      backdropFilter: 'blur(8px)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{
          fontSize: '1.1rem', fontWeight: 700, margin: 0,
          fontFamily: "'Inter', sans-serif",
          color: color || '#fff',
        }}>
          {title}
        </h3>
        {helpText && <HelpBubble text={helpText} />}
      </div>
      {children}
    </div>
  );
}


// ══════════════════════════════════════════════
// 1. THE 100 CHECKBOXES
// ══════════════════════════════════════════════
function CheckboxVolume() {
  const [checks, setChecks] = useState(Array(100).fill(false));
  const vol = checks.filter(Boolean).length;
  const toggle = (i) => setChecks(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  const clear = () => setChecks(Array(100).fill(false));
  const fill = () => setChecks(Array(100).fill(true));

  return (
    <SectionWrapper
      title="The 100 Checkboxes"
      helpText="Each checkbox = 1% volume. Check them all for max volume. Yes, all 100. Good luck."
      color="#ff6b9d"
    >
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 'clamp(2px, 0.8vw, 4px)',
        maxWidth: '100%', width: '100%',
      }}>
        {checks.map((c, i) => (
          <label key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            aspectRatio: '1', borderRadius: '6px', cursor: 'pointer',
            background: c ? 'rgba(233,30,140,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${c ? 'rgba(233,30,140,0.4)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.15s', fontSize: '10px', color: 'rgba(255,255,255,0.3)',
          }}>
            <input type="checkbox" checked={c} onChange={() => toggle(i)}
              style={{ display: 'none' }} />
            {c ? <span style={{ color: '#e91e8c', fontSize: '14px' }}>x</span> : <span>{i + 1}</span>}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={fill} style={miniBtn}>Check All (cheater)</button>
        <button onClick={clear} style={miniBtn}>Uncheck All</button>
      </div>
      <VolumeDisplay volume={vol} label="checkboxes checked" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 2. CARNIVAL STRENGTH TEST
// ══════════════════════════════════════════════
function StrengthTest() {
  const [power, setPower] = useState(0);
  const [charging, setCharging] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [ballPos, setBallPos] = useState(0);
  const [finalVol, setFinalVol] = useState(0);
  const intervalRef = useRef(null);
  const meterRef = useRef(null);

  const startCharge = () => {
    if (launched) return;
    setCharging(true);
    setPower(0);
    let p = 0;
    intervalRef.current = setInterval(() => {
      p += 1.5;
      if (p > 100) p = 100;
      setPower(p);
    }, 30);
  };

  const release = () => {
    if (!charging) return;
    setCharging(false);
    clearInterval(intervalRef.current);
    setLaunched(true);
    const target = power;
    let pos = 0;
    const anim = setInterval(() => {
      pos += 4;
      if (pos >= target) {
        pos = target;
        clearInterval(anim);
        setFinalVol(Math.round(target));
        setTimeout(() => { setLaunched(false); setBallPos(0); }, 2000);
      }
      setBallPos(pos);
    }, 20);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <SectionWrapper
      title="Carnival Strength-O-Meter"
      helpText="Press and HOLD the hammer to charge power. Release to launch the ball! The higher it goes, the louder the volume. Just like the carnival!"
      color="#ffb347"
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end' }}>
        {/* The meter */}
        <div ref={meterRef} style={{
          width: '44px', minWidth: '44px', height: '220px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '25px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Scale marks */}
          {[0, 25, 50, 75, 100].map(mark => (
            <div key={mark} style={{
              position: 'absolute', bottom: `${mark}%`, left: 0, right: 0,
              borderTop: '1px dashed rgba(255,255,255,0.1)',
            }}>
              <span style={{
                position: 'absolute', right: '-28px', top: '-7px',
                fontSize: '9px', color: 'rgba(255,255,255,0.3)',
              }}>{mark}</span>
            </div>
          ))}
          {/* Fill */}
          <div style={{
            position: 'absolute', bottom: 0, left: '4px', right: '4px',
            height: `${launched ? ballPos : 0}%`, borderRadius: '25px',
            background: `linear-gradient(to top, #e91e8c, ${ballPos > 70 ? '#ff4444' : '#ffb347'})`,
            transition: launched ? 'none' : 'height 0.3s',
          }} />
          {/* Ball */}
          <div style={{
            position: 'absolute', bottom: `${launched ? ballPos : 0}%`,
            left: '50%', transform: 'translate(-50%, 50%)',
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #fff, #e91e8c)',
            boxShadow: '0 0 12px rgba(233,30,140,0.5)',
            transition: launched ? 'none' : 'bottom 0.3s',
          }} />
        </div>

        <div style={{ flex: 1 }}>
          {/* Power bar */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              POWER: {Math.round(power)}%
            </div>
            <div style={{ height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{
                width: `${power}%`, height: '100%', borderRadius: '6px',
                background: power > 80 ? '#ff4444' : power > 50 ? '#ffb347' : '#e91e8c',
                transition: 'width 0.05s',
              }} />
            </div>
          </div>

          {/* Hammer button */}
          <button
            onMouseDown={startCharge} onMouseUp={release} onMouseLeave={() => { if (charging) release(); }}
            onTouchStart={startCharge} onTouchEnd={release}
            style={{
              width: '100%', padding: '14px 10px', fontSize: 'clamp(13px, 3.5vw, 18px)',
              fontFamily: "'Inter', sans-serif", fontWeight: 700,
              background: charging
                ? 'linear-gradient(135deg, #ff4444, #ff8800)'
                : 'linear-gradient(135deg, #ffb347, #e91e8c)',
              color: '#fff', border: 'none', borderRadius: '14px',
              cursor: 'pointer', transition: 'transform 0.1s',
              transform: charging ? 'scale(0.95)' : 'scale(1)',
              boxShadow: charging ? '0 2px 8px rgba(255,68,68,0.4)' : '0 4px 20px rgba(233,30,140,0.3)',
              userSelect: 'none',
            }}
          >
            {charging ? 'CHARGING... HOLD IT!' : launched ? 'WATCH IT GO!' : 'HOLD TO SWING'}
          </button>

          {launched && (
            <div style={{
              textAlign: 'center', marginTop: '10px',
              fontSize: '13px', color: '#ffb347', fontWeight: 600,
            }}>
              Ball reached {Math.round(ballPos)}%!
            </div>
          )}
        </div>
      </div>
      <VolumeDisplay volume={finalVol} label="last hit" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 3. DOT COLLECTOR — catch floating dots
// ══════════════════════════════════════════════
function DotCollector() {
  const [dots, setDots] = useState([]);
  const [score, setScore] = useState(0);
  const [active, setActive] = useState(false);
  const areaRef = useRef(null);
  const intervalRef = useRef(null);

  const startGame = () => {
    setScore(0);
    setDots([]);
    setActive(true);
  };

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setDots(prev => {
        const filtered = prev.filter(d => Date.now() - d.born < 2500);
        if (filtered.length < 6) {
          filtered.push({
            id: Math.random(),
            x: 10 + Math.random() * 80,
            y: 10 + Math.random() * 80,
            size: 16 + Math.random() * 20,
            born: Date.now(),
            color: `hsl(${Math.random() * 60 + 300}, 80%, 65%)`,
          });
        }
        return filtered;
      });
    }, 400);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  const catchDot = (id) => {
    setDots(prev => prev.filter(d => d.id !== id));
    setScore(prev => Math.min(prev + 3, 100));
  };

  const reset = () => { setActive(false); setScore(0); setDots([]); clearInterval(intervalRef.current); };

  return (
    <SectionWrapper
      title="Dot Collector"
      helpText="Floating dots appear randomly. Click them before they vanish! Each dot = +3% volume. Can you catch enough for 100%?"
      color="#a78bfa"
    >
      <div ref={areaRef} style={{
        position: 'relative', width: '100%', height: '240px',
        background: 'rgba(0,0,0,0.3)', borderRadius: '16px',
        border: '1px solid rgba(179,136,255,0.15)', overflow: 'hidden',
        cursor: active ? 'crosshair' : 'default',
      }}>
        {!active && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px',
          }}>
            <button onClick={startGame} style={{
              padding: '12px 32px', fontSize: '15px', fontWeight: 700,
              background: 'linear-gradient(135deg, #a78bfa, #e91e8c)', color: '#fff',
              border: 'none', borderRadius: '50px', cursor: 'pointer',
            }}>
              Start Catching!
            </button>
          </div>
        )}
        {dots.map(d => (
          <div key={d.id} onClick={() => catchDot(d.id)} style={{
            position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
            width: `${d.size}px`, height: `${d.size}px`, borderRadius: '50%',
            background: d.color, cursor: 'pointer',
            boxShadow: `0 0 12px ${d.color}`,
            animation: 'stupid-float 1.5s ease-in-out infinite, stupid-fade-in 0.3s ease',
            transform: 'translate(-50%, -50%)',
          }} />
        ))}
        {active && (
          <button onClick={reset} style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          }}>Reset</button>
        )}
      </div>
      <VolumeDisplay volume={score} label="dots caught" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 4. THE INFINITE SCROLL
// ══════════════════════════════════════════════
function InfiniteScroll() {
  const [vol, setVol] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    setVol(Math.round(pct));
  };

  return (
    <SectionWrapper
      title="The Infinite Scroll"
      helpText="Scroll aaaaaall the way down to reach 100% volume. Your thumb will hate you. This is 5000px of pure suffering."
      color="#34d399"
    >
      <div ref={scrollRef} onScroll={handleScroll} style={{
        height: '180px', overflowY: 'auto', borderRadius: '12px',
        border: '1px solid rgba(52,211,153,0.2)',
        background: 'rgba(0,0,0,0.2)',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(52,211,153,0.3) transparent',
      }}>
        <div style={{ height: '5000px', position: 'relative', padding: '16px' }}>
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(pct => (
            <div key={pct} style={{
              position: 'absolute', top: `${pct}%`, left: '16px', right: '16px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div style={{
                fontSize: '11px', color: 'rgba(52,211,153,0.5)', fontWeight: 600,
                fontFamily: "'Inter', sans-serif", minWidth: '35px',
              }}>{pct}%</div>
              <div style={{ flex: 1, height: '1px', background: 'rgba(52,211,153,0.15)' }} />
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                {pct === 0 ? 'start scrolling...' :
                 pct === 25 ? 'keep going...' :
                 pct === 50 ? 'halfway there!' :
                 pct === 75 ? 'almost...' :
                 pct === 90 ? 'SO CLOSE' :
                 pct === 100 ? 'YOU MADE IT!' : ''}
              </div>
            </div>
          ))}
          {/* Random encouraging messages */}
          {['Why are you still scrolling?', 'This is your life now.', 'No shortcuts here.',
            'Your finger must be tired.', 'Worth it? Probably not.', 'Almost... not really.',
            'A slider would have been easier.', 'But where is the fun in that?',
          ].map((msg, i) => (
            <div key={i} style={{
              position: 'absolute', top: `${12 + i * 11}%`, left: '50%',
              transform: 'translateX(-50%)', fontSize: '11px',
              color: 'rgba(255,255,255,0.15)', fontStyle: 'italic', whiteSpace: 'nowrap',
            }}>{msg}</div>
          ))}
        </div>
      </div>
      <VolumeDisplay volume={vol} label="scrolled" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 5. TYPE IT IN BINARY
// ══════════════════════════════════════════════
function BinaryVolume() {
  const [input, setInput] = useState('');
  const parsed = parseInt(input, 2);
  const vol = (!isNaN(parsed) && parsed >= 0 && parsed <= 100) ? parsed : 0;
  const isValid = /^[01]*$/.test(input);
  const targetBin = (vol).toString(2);

  return (
    <SectionWrapper
      title="Type It In Binary"
      helpText="Want 50% volume? Type 110010. Want 100%? Type 1100100. You did learn binary in school... right? Only 0s and 1s allowed."
      color="#38bdf8"
    >
      <div style={{ marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
        Hint: 100% = 1100100 | 50% = 110010 | 32% = 100000
      </div>
      <input
        value={input}
        onChange={e => { const v = e.target.value.replace(/[^01]/g, ''); setInput(v.slice(0, 7)); }}
        placeholder="Type binary... e.g. 1100100"
        style={{
          width: '100%', padding: '14px 16px', fontSize: '22px',
          fontFamily: "'Courier New', monospace", fontWeight: 700,
          background: 'rgba(0,0,0,0.3)', color: isValid && input ? '#38bdf8' : '#ff6b6b',
          border: `1px solid ${isValid ? 'rgba(56,189,248,0.3)' : 'rgba(255,107,107,0.3)'}`,
          borderRadius: '12px', outline: 'none', letterSpacing: '4px',
          boxSizing: 'border-box',
        }}
      />
      {input && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          Decimal value: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{isNaN(parsed) ? '???' : parsed}</span>
          {parsed > 100 && <span style={{ color: '#ff6b6b' }}> (max 100!)</span>}
        </div>
      )}
      <VolumeDisplay volume={vol} label="binary decoded" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 6. PULL THE ROPE
// ══════════════════════════════════════════════
function PullTheRope() {
  const [pulling, setPulling] = useState(false);
  const [ropeX, setRopeX] = useState(0);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!pulling || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setRopeX(pct);
  }, [pulling]);

  const handleMouseMove = useCallback((e) => handleMove(e.clientX), [handleMove]);
  const handleTouchMove = useCallback((e) => handleMove(e.touches[0].clientX), [handleMove]);

  useEffect(() => {
    if (pulling) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', () => setPulling(false));
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', () => setPulling(false));
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', () => setPulling(false));
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', () => setPulling(false));
    };
  }, [pulling, handleMouseMove, handleTouchMove]);

  return (
    <SectionWrapper
      title="Pull The Rope"
      helpText="Grab the knot and drag it across. It is like a slider but way more annoying because it looks like a rope and you feel dumb using it."
      color="#fb923c"
    >
      <div ref={containerRef} style={{
        position: 'relative', height: '80px', cursor: 'grab',
        userSelect: 'none', touchAction: 'none',
      }}
        onMouseDown={() => setPulling(true)}
        onTouchStart={() => setPulling(true)}
      >
        {/* Rope line */}
        <svg width="100%" height="80" style={{ position: 'absolute', top: 0, left: 0 }}>
          <path
            d={`M 0,40 Q ${ropeX * 0.5}%,${35 + Math.sin(ropeX * 0.1) * 8} ${ropeX}%,40`}
            stroke="rgba(251,146,60,0.6)" strokeWidth="4" fill="none"
            strokeDasharray="8,4"
          />
          <path
            d={`M ${ropeX}%,40 Q ${ropeX + (100 - ropeX) * 0.5}%,${45 + Math.cos(ropeX * 0.1) * 5} 100%,40`}
            stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none"
            strokeDasharray="8,4"
          />
        </svg>

        {/* Knot handle */}
        <div style={{
          position: 'absolute', left: `${ropeX}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '36px', height: '36px', borderRadius: '50%',
          background: pulling
            ? 'radial-gradient(circle at 35% 35%, #fff, #fb923c)'
            : 'radial-gradient(circle at 35% 35%, #fcd, #fb923c)',
          boxShadow: pulling ? '0 0 20px rgba(251,146,60,0.6)' : '0 0 8px rgba(251,146,60,0.3)',
          cursor: pulling ? 'grabbing' : 'grab',
          transition: pulling ? 'none' : 'box-shadow 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px',
        }}>
          {pulling ? '!' : 'O'}
        </div>

        {/* Markers */}
        {[0, 25, 50, 75, 100].map(m => (
          <div key={m} style={{
            position: 'absolute', left: `${m}%`, bottom: '0',
            fontSize: '9px', color: 'rgba(255,255,255,0.25)',
            transform: 'translateX(-50%)',
          }}>{m}</div>
        ))}
      </div>
      <VolumeDisplay volume={Math.round(ropeX)} label="rope pulled" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 7. SPIN THE WHEEL
// ══════════════════════════════════════════════
function SpinTheWheel() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [volume, setVolume] = useState(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const extraSpins = 3 + Math.random() * 5;
    const targetDeg = rotation + extraSpins * 360;
    setRotation(targetDeg);
    setTimeout(() => {
      const finalAngle = targetDeg % 360;
      const vol = Math.round((finalAngle / 360) * 100);
      setVolume(vol);
      setSpinning(false);
    }, 3000);
  };

  return (
    <SectionWrapper
      title="Spin The Wheel"
      helpText="Spin the wheel and accept whatever volume fate gives you. No take-backs. The universe decides your volume now."
      color="#f472b6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Pointer */}
        <div style={{ fontSize: '20px', marginBottom: '-4px', zIndex: 2 }}>v</div>

        {/* Wheel */}
        <div style={{
          width: '180px', height: '180px', borderRadius: '50%',
          border: '3px solid rgba(244,114,182,0.4)',
          position: 'relative', overflow: 'hidden',
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
        }}>
          {/* Segments */}
          {Array.from({ length: 10 }, (_, i) => {
            const angle = i * 36;
            const val = i * 10;
            return (
              <div key={i} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '50%', height: '2px',
                transformOrigin: '0 0',
                transform: `rotate(${angle}deg)`,
                background: 'rgba(255,255,255,0.1)',
              }}>
                <span style={{
                  position: 'absolute', right: '8px', top: '-8px',
                  fontSize: '10px', fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  transform: `rotate(-${angle}deg)`,
                }}>{val}</span>
              </div>
            );
          })}
          {/* Center */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #f472b6, #e91e8c)',
          }} />
          {/* Conic gradient background */}
          <div style={{
            position: 'absolute', inset: '3px', borderRadius: '50%',
            background: 'conic-gradient(from 0deg, rgba(244,114,182,0.15), rgba(233,30,140,0.15), rgba(179,136,255,0.15), rgba(56,189,248,0.15), rgba(52,211,153,0.15), rgba(251,146,60,0.15), rgba(255,107,107,0.15), rgba(244,114,182,0.15))',
            zIndex: -1,
          }} />
        </div>

        <button onClick={spin} disabled={spinning} style={{
          marginTop: '14px', padding: '12px 36px', fontSize: '15px',
          fontWeight: 700, fontFamily: "'Inter', sans-serif",
          background: spinning ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #f472b6, #e91e8c)',
          color: '#fff', border: 'none', borderRadius: '50px',
          cursor: spinning ? 'not-allowed' : 'pointer',
          boxShadow: spinning ? 'none' : '0 4px 20px rgba(244,114,182,0.3)',
        }}>
          {spinning ? 'Spinning...' : 'SPIN!'}
        </button>
      </div>
      <VolumeDisplay volume={volume} label="fate decided" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 8. COOKIE CLICKER VOLUME
// ══════════════════════════════════════════════
function CookieClicker() {
  const [clicks, setClicks] = useState(0);
  const [pops, setPops] = useState([]);
  const vol = Math.min(clicks, 100);

  const handleClick = () => {
    if (clicks >= 100) return;
    setClicks(prev => prev + 1);
    const pop = { id: Math.random(), x: 30 + Math.random() * 40, y: Math.random() * 60 };
    setPops(prev => [...prev.slice(-8), pop]);
    setTimeout(() => setPops(prev => prev.filter(p => p.id !== pop.id)), 600);
  };

  return (
    <SectionWrapper
      title="Cookie Clicker Volume"
      helpText="Click the speaker 100 times to reach max volume. Each click = 1%. Your mouse button fears you."
      color="#ef4444"
    >
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px',
        }}>
          Clicks: {clicks} / 100
        </div>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button onClick={handleClick} style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: vol >= 100
              ? 'linear-gradient(135deg, #34d399, #059669)'
              : 'linear-gradient(135deg, #ef4444, #e91e8c)',
            border: 'none', cursor: vol >= 100 ? 'default' : 'pointer',
            fontSize: '40px', transition: 'transform 0.08s',
            boxShadow: `0 0 ${20 + vol * 0.3}px rgba(239,68,68,${0.2 + vol * 0.003})`,
          }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {vol >= 100 ? 'ok' : 'TAP'}
          </button>

          {/* +1 popups */}
          {pops.map(p => (
            <div key={p.id} style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              fontSize: '14px', fontWeight: 700, color: '#ef4444',
              pointerEvents: 'none',
              animation: 'stupid-pop-up 0.6s ease-out forwards',
            }}>+1</div>
          ))}
        </div>

        {vol >= 100 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
            Your finger survived. Congrats!
          </div>
        )}
        <div>
          <button onClick={() => setClicks(0)} style={{ ...miniBtn, marginTop: '10px' }}>Reset (suffer again)</button>
        </div>
      </div>
      <VolumeDisplay volume={vol} label="clicks" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 9. MAZE SLIDER
// ══════════════════════════════════════════════
function MazeSlider() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [path, setPath] = useState([{ x: 0, y: 0 }]);
  const mazeRef = useRef(null);

  // Waypoints the user must pass through (zigzag)
  const waypoints = [
    { x: 0, y: 50 }, { x: 20, y: 10 }, { x: 40, y: 90 },
    { x: 60, y: 20 }, { x: 80, y: 80 }, { x: 100, y: 50 },
  ];

  const handleMove = useCallback((clientX, clientY) => {
    if (!dragging || !mazeRef.current) return;
    const rect = mazeRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setPos({ x, y });
    setPath(prev => [...prev.slice(-200), { x, y }]);
  }, [dragging]);

  useEffect(() => {
    const mm = (e) => handleMove(e.clientX, e.clientY);
    const tm = (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const up = () => setDragging(false);
    if (dragging) {
      window.addEventListener('mousemove', mm);
      window.addEventListener('touchmove', tm);
      window.addEventListener('mouseup', up);
      window.addEventListener('touchend', up);
    }
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, handleMove]);

  // Volume = how close to the end (x position)
  const vol = Math.round(pos.x);

  return (
    <SectionWrapper
      title="The Maze Slider"
      helpText="Drag the dot from left to right. But follow the zigzag path through the waypoints! Or don't, we can't actually stop you. It's the honor system."
      color="#c084fc"
    >
      <div ref={mazeRef} style={{
        position: 'relative', width: '100%', height: '160px',
        background: 'rgba(0,0,0,0.3)', borderRadius: '14px',
        border: '1px solid rgba(192,132,252,0.2)', overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none',
      }}
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
      >
        {/* Zigzag guide path */}
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <polyline
            points={waypoints.map(w => `${w.x}%,${w.y}%`).join(' ')}
            fill="none" stroke="rgba(192,132,252,0.2)" strokeWidth="2" strokeDasharray="6,4"
          />
        </svg>

        {/* User trail */}
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          {path.length > 1 && (
            <polyline
              points={path.map(p => `${p.x}%,${p.y}%`).join(' ')}
              fill="none" stroke="rgba(192,132,252,0.4)" strokeWidth="2"
            />
          )}
        </svg>

        {/* Waypoint markers */}
        {waypoints.map((w, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${w.x}%`, top: `${w.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'rgba(192,132,252,0.3)', border: '1px solid rgba(192,132,252,0.4)',
          }} />
        ))}

        {/* Start & End labels */}
        <div style={{
          position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600,
        }}>0%</div>
        <div style={{
          position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600,
        }}>100%</div>

        {/* Draggable dot */}
        <div style={{
          position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
          transform: 'translate(-50%, -50%)',
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #fff, #c084fc)',
          boxShadow: '0 0 16px rgba(192,132,252,0.6)',
          zIndex: 2,
        }} />
      </div>
      <VolumeDisplay volume={vol} label="maze progress" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 10. SIMON SAYS VOLUME
// ══════════════════════════════════════════════
function SimonSays() {
  const [sequence, setSequence] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [showing, setShowing] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState('Press Start to begin');
  const colors = ['#ef4444', '#38bdf8', '#34d399', '#ffb347'];
  const colorNames = ['Red', 'Blue', 'Green', 'Orange'];

  const startRound = () => {
    const newSeq = [...sequence, Math.floor(Math.random() * 4)];
    setSequence(newSeq);
    setUserInput([]);
    setShowing(true);
    setMessage('Watch carefully...');

    newSeq.forEach((color, i) => {
      setTimeout(() => setActiveColor(color), (i + 1) * 600);
      setTimeout(() => setActiveColor(null), (i + 1) * 600 + 400);
    });
    setTimeout(() => {
      setShowing(false);
      setMessage('Your turn! Repeat the sequence');
    }, (newSeq.length + 1) * 600);
  };

  const handlePress = (colorIdx) => {
    if (showing) return;
    const newInput = [...userInput, colorIdx];
    setUserInput(newInput);

    setActiveColor(colorIdx);
    setTimeout(() => setActiveColor(null), 200);

    const pos = newInput.length - 1;
    if (sequence[pos] !== colorIdx) {
      setMessage('WRONG! Volume reset. Try again.');
      setSequence([]);
      setLevel(0);
      setUserInput([]);
      return;
    }

    if (newInput.length === sequence.length) {
      const newLevel = Math.min(level + 10, 100);
      setLevel(newLevel);
      setMessage(newLevel >= 100 ? 'MAX VOLUME! You have perfect memory!' : `Level ${newLevel / 10}! +10% volume`);
      setTimeout(() => startRound(), 1200);
    }
  };

  return (
    <SectionWrapper
      title="Simon Says Volume"
      helpText="A color sequence flashes. Repeat it correctly to earn +10% volume per round. Get it wrong and you lose ALL progress. 10 rounds for 100%."
      color="#facc15"
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
          {message}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
          maxWidth: '220px', margin: '0 auto',
        }}>
          {colors.map((c, i) => (
            <button key={i} onClick={() => handlePress(i)} disabled={showing}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: '14px',
                background: activeColor === i ? c : `${c}33`,
                border: `2px solid ${c}`,
                cursor: showing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: activeColor === i ? `0 0 24px ${c}` : 'none',
                opacity: showing && activeColor !== i ? 0.3 : 1,
              }}
            />
          ))}
        </div>

        {sequence.length === 0 && (
          <button onClick={startRound} style={{
            marginTop: '14px', padding: '10px 28px', fontSize: '14px', fontWeight: 700,
            background: 'linear-gradient(135deg, #facc15, #fb923c)', color: '#000',
            border: 'none', borderRadius: '50px', cursor: 'pointer',
          }}>Start</button>
        )}

        <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          Round {Math.ceil(level / 10)} / 10
        </div>
      </div>
      <VolumeDisplay volume={level} label="simon approved" />
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 11. THE SUBMIT BUTTON (runs away from cursor)
// ══════════════════════════════════════════════
function RunawayButton() {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [attempts, setAttempts] = useState(0);
  const [caught, setCaught] = useState(false);
  const containerRef = useRef(null);

  const flee = () => {
    if (caught) return;
    setAttempts(prev => {
      const next = prev + 1;
      if (next >= 10) {
        setCaught(true);
      }
      return next;
    });
    if (attempts < 9) {
      const nx = 10 + Math.random() * 80;
      const ny = 10 + Math.random() * 80;
      setPos({ x: nx, y: ny });
    }
  };

  const reset = () => { setAttempts(0); setCaught(false); setPos({ x: 50, y: 50 }); };

  return (
    <SectionWrapper
      title="The Submit Button"
      helpText="Just click the button. How hard can it be? (Very.)"
      color="#22d3ee"
    >
      <div ref={containerRef} style={{
        position: 'relative', width: '100%', height: '300px',
        background: 'rgba(0,0,0,0.3)', borderRadius: '16px',
        border: '1px solid rgba(34,211,238,0.2)', overflow: 'hidden',
      }}>
        <button
          onMouseEnter={flee}
          onClick={() => { if (caught) return; }}
          style={{
            position: 'absolute',
            left: `${pos.x}%`, top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
            padding: caught ? '14px 32px' : '12px 28px',
            fontSize: caught ? '15px' : '14px',
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            background: caught
              ? 'linear-gradient(135deg, #34d399, #059669)'
              : 'linear-gradient(135deg, #22d3ee, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: caught ? 'all 0.3s' : 'left 0.15s ease-out, top 0.15s ease-out',
            boxShadow: caught
              ? '0 0 24px rgba(52,211,153,0.5)'
              : '0 4px 16px rgba(34,211,238,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {caught ? 'fine, you win' : 'Submit'}
        </button>

        <div style={{
          position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
          fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center',
        }}>
          {caught
            ? 'The button has accepted its fate.'
            : `Attempts: ${attempts} / 10 ${attempts > 5 ? '(it is getting tired...)' : ''}`
          }
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={reset} style={miniBtn}>Reset</button>
      </div>
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 12. DATE PICKER FROM 1900
// ══════════════════════════════════════════════
function DatePicker1900() {
  const [month, setMonth] = useState(0); // 0 = January
  const [year, setYear] = useState(1900);
  const [clicks, setClicks] = useState(0);
  const [reached, setReached] = useState(false);

  const targetMonth = 3; // April (0-indexed)
  const targetYear = 2026;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const totalMonthsRemaining = (targetYear - year) * 12 + (targetMonth - month);

  const nextMonth = () => {
    if (reached) return;
    setClicks(prev => prev + 1);
    if (month === 11) {
      setMonth(0);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
    if (year === targetYear && month + 1 === targetMonth) {
      setReached(true);
    }
    if (month === 11 && year + 1 === targetYear && 0 === targetMonth) {
      setReached(true);
    }
  };

  const skip10Years = () => {
    if (reached) return;
    const newYear = year + 10;
    if (newYear > targetYear || (newYear === targetYear && month > targetMonth)) {
      setYear(targetYear);
      setMonth(targetMonth);
      setReached(true);
    } else {
      setYear(newYear);
    }
    setClicks(prev => prev + 1);
  };

  const reset = () => { setMonth(0); setYear(1900); setClicks(0); setReached(false); };

  return (
    <SectionWrapper
      title="Date Picker From 1900"
      helpText="Navigate to today's date. One month at a time. Starting from 1900. We'll wait."
      color="#f59e0b"
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{
          background: 'rgba(0,0,0,0.3)', borderRadius: '16px',
          border: '1px solid rgba(245,158,11,0.2)', padding: '20px',
          maxWidth: '320px', margin: '0 auto', width: '100%', boxSizing: 'border-box',
        }}>
          <div style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px',
            fontFamily: "'Inter', sans-serif",
          }}>
            Currently viewing:
          </div>
          <div style={{
            fontSize: '28px', fontWeight: 800,
            fontFamily: "'Inter', sans-serif",
            background: reached
              ? 'linear-gradient(135deg, #34d399, #059669)'
              : 'linear-gradient(135deg, #f59e0b, #ef4444)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '4px',
          }}>
            {monthNames[month]} {year}
          </div>

          {!reached && (
            <div style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px',
            }}>
              {totalMonthsRemaining > 0
                ? `${totalMonthsRemaining.toLocaleString()} months remaining`
                : 'You passed it!'}
            </div>
          )}

          {reached ? (
            <div style={{
              fontSize: '16px', fontWeight: 700, color: '#34d399',
              marginTop: '12px', marginBottom: '8px',
            }}>
              You made it! Only took {clicks} clicks.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button onClick={nextMonth} style={{
                padding: '12px 36px', fontSize: '15px', fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                color: '#fff', border: 'none', borderRadius: '12px',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
              }}>
                Next Month &rarr;
              </button>

              {clicks >= 20 && (
                <button onClick={skip10Years} style={{
                  padding: '10px 24px', fontSize: '13px', fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
                  animation: 'stupid-fade-in 0.5s ease',
                }}>
                  Skip 10 Years (mercy button)
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.3)',
        }}>
          Total clicks: {clicks}
          {clicks > 0 && !reached && clicks < 20 &&
            ` | Mercy button unlocks in ${20 - clicks} clicks`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={reset} style={miniBtn}>Reset to 1900</button>
      </div>
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 13. THE LIGHT SWITCH
// ══════════════════════════════════════════════
function LightSwitch() {
  const [clicks, setClicks] = useState(0);
  const [isOn, setIsOn] = useState(false);
  const [switchPos, setSwitchPos] = useState(false); // visual toggle

  const flip = () => {
    if (isOn) return;
    setSwitchPos(prev => !prev);
    setClicks(prev => prev + 1);
    if (Math.random() < 0.02) {
      setIsOn(true);
    }
  };

  const callElectrician = () => {
    setIsOn(true);
    setSwitchPos(true);
  };

  const reset = () => { setClicks(0); setIsOn(false); setSwitchPos(false); };

  return (
    <SectionWrapper
      title="The Light Switch"
      helpText="Flip the switch to turn on the light. It might be a bit... temperamental. Just keep trying."
      color="#fbbf24"
    >
      <div style={{ textAlign: 'center' }}>
        {/* Light bulb area */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          margin: '0 auto 20px',
          background: isOn
            ? 'radial-gradient(circle at 40% 40%, #fff, #fbbf24)'
            : 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          boxShadow: isOn
            ? '0 0 60px rgba(251,191,36,0.8), 0 0 120px rgba(251,191,36,0.4)'
            : '0 0 8px rgba(255,255,255,0.05)',
          border: `2px solid ${isOn ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`,
          transition: 'all 0.3s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px',
        }}>
          {isOn ? '' : ''}
        </div>

        {/* Status */}
        <div style={{
          fontSize: '18px', fontWeight: 800,
          fontFamily: "'Inter', sans-serif",
          color: isOn ? '#fbbf24' : 'rgba(255,255,255,0.3)',
          marginBottom: '16px',
        }}>
          {isOn ? 'THE LIGHT IS ON!' : 'The light is OFF'}
        </div>

        {/* Switch plate */}
        <div style={{
          display: 'inline-block', background: 'rgba(255,255,255,0.06)',
          border: '2px solid rgba(255,255,255,0.12)', borderRadius: '12px',
          padding: '12px 24px', cursor: isOn ? 'default' : 'pointer',
        }}
          onClick={flip}
        >
          <div style={{
            width: '40px', height: '70px', borderRadius: '20px',
            background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.15)',
            position: 'relative', margin: '0 auto',
            overflow: 'hidden',
          }}>
            {/* Switch nub */}
            <div style={{
              position: 'absolute',
              left: '50%', transform: 'translateX(-50%)',
              width: '30px', height: '30px', borderRadius: '15px',
              background: (isOn || switchPos)
                ? 'linear-gradient(to bottom, #fbbf24, #f59e0b)'
                : 'linear-gradient(to bottom, #888, #555)',
              boxShadow: (isOn || switchPos)
                ? '0 2px 8px rgba(251,191,36,0.5)'
                : '0 2px 6px rgba(0,0,0,0.4)',
              top: (isOn || switchPos) ? '4px' : '36px',
              transition: 'top 0.12s ease, background 0.12s ease',
            }} />
          </div>
        </div>

        {/* Click counter */}
        <div style={{
          marginTop: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.4)',
        }}>
          {isOn
            ? (
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                It only took {clicks} {clicks === 1 ? 'click' : 'clicks'}!
                {clicks <= 5 && ' Unbelievably lucky!'}
                {clicks > 5 && clicks <= 50 && ' Not bad!'}
                {clicks > 50 && clicks <= 100 && ' Persistence pays off!'}
                {clicks > 100 && ' That was painful.'}
              </span>
            )
            : `Clicks: ${clicks} | 2% chance each flip`
          }
        </div>

        {!isOn && clicks >= 200 && (
          <button onClick={callElectrician} style={{
            marginTop: '12px', padding: '10px 24px', fontSize: '13px', fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#000', border: 'none', borderRadius: '10px',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(251,191,36,0.4)',
            animation: 'stupid-fade-in 0.5s ease',
          }}>
            Call Electrician
          </button>
        )}

        {isOn && (
          <div style={{
            marginTop: '12px', fontSize: '20px',
            animation: 'stupid-fade-in 0.5s ease',
          }}>
            Let there be light!
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={reset} style={miniBtn}>Reset (break it again)</button>
      </div>
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// Shared styles
// ══════════════════════════════════════════════
const miniBtn = {
  padding: '6px 14px', fontSize: '11px', fontWeight: 600,
  fontFamily: "'Inter', sans-serif",
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
  cursor: 'pointer',
};


// ══════════════════════════════════════════════
// 14. THE PASSWORD FIELD
// ══════════════════════════════════════════════
function ThePasswordField() {
  const [input, setInput] = useState('');
  const [display, setDisplay] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef(null);
  const shuffleRef = useRef(null);

  useEffect(() => {
    shuffleRef.current = setInterval(() => {
      setDisplay(prev => {
        if (prev.length <= 1) return prev;
        const last = prev[prev.length - 1];
        const rest = prev.slice(0, -1).split('');
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        return rest.join('') + last;
      });
    }, 2000);
    return () => clearInterval(shuffleRef.current);
  }, []);

  const handleChange = (e) => {
    if (unlocked) return;
    const val = e.target.value;
    setInput(val);
    setFailed(false);
    const masked = val.split('').map((ch, i) => {
      if (i === val.length - 1) return ch;
      const chars = 'abcdefghijklmnopqrstuvwxyz!@#$%&*';
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    setDisplay(masked);
  };

  const handleSubmit = () => {
    if (input === 'hello') {
      setUnlocked(true);
      clearInterval(shuffleRef.current);
    } else {
      setFailed(true);
      setInput('');
      setDisplay('');
    }
  };

  const reset = () => {
    setInput('');
    setDisplay('');
    setUnlocked(false);
    setFailed(false);
  };

  return (
    <SectionWrapper
      title="The Password Field"
      helpText="Type 'hello' to proceed. But the letters shuffle every 2 seconds. May God help you."
      color="#f87171"
    >
      <div style={{ position: 'relative' }}>
        <div style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px',
        }}>
          Type the password: <span style={{ color: '#f87171', fontWeight: 700 }}>hello</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={unlocked}
              placeholder="Type here..."
              style={{
                width: '100%', padding: '14px 16px', fontSize: '20px',
                fontFamily: "'Courier New', monospace", fontWeight: 700,
                background: 'rgba(0,0,0,0.3)',
                color: 'transparent', caretColor: '#f87171',
                border: `1px solid ${unlocked ? 'rgba(52,211,153,0.5)' : failed ? 'rgba(239,68,68,0.5)' : 'rgba(248,113,113,0.3)'}`,
                borderRadius: '12px', outline: 'none', letterSpacing: '6px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', padding: '14px 16px',
              fontSize: '20px', fontFamily: "'Courier New', monospace", fontWeight: 700,
              color: unlocked ? '#34d399' : '#f87171', letterSpacing: '6px',
              pointerEvents: 'none',
            }}>
              {unlocked ? 'hello' : display}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={unlocked} style={{
            padding: '14px 20px', fontSize: '14px', fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            background: unlocked ? 'rgba(52,211,153,0.2)' : 'linear-gradient(135deg, #f87171, #e91e8c)',
            color: '#fff', border: 'none', borderRadius: '12px',
            cursor: unlocked ? 'default' : 'pointer',
          }}>
            {unlocked ? 'OK' : 'Submit'}
          </button>
        </div>

        {unlocked && (
          <div style={{
            marginTop: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
            textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#34d399',
          }}>
            UNLOCKED! You actually typed &quot;hello&quot; through that chaos. Impressive.
          </div>
        )}

        {failed && (
          <div style={{
            marginTop: '12px', padding: '10px 16px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            textAlign: 'center', fontSize: '13px', color: '#ef4444',
          }}>
            WRONG! The password was &quot;hello&quot;. But with the shuffling... we understand.
          </div>
        )}

        <button onClick={reset} style={{ ...miniBtn, marginTop: '10px' }}>Reset</button>
      </div>
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 15. ACCEPT TERMS & CONDITIONS
// ══════════════════════════════════════════════
function AcceptTerms() {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [extensions, setExtensions] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const termsScrollRef = useRef(null);

  const baseTerms = [
    "SECTION 1: DEFINITIONS\n'The User' refers to the poor soul reading this. 'The Service' refers to whatever this is. 'Sanity' refers to something you will lose.",
    "\n\nSECTION 2: USAGE RIGHTS\nBy reading this, you agree that cats are superior to dogs. This is non-negotiable. Any dispute will be settled by a cat.",
    "\n\nSECTION 3: DATA COLLECTION\nWe collect the following data: your favorite color, your childhood pet's middle name, and the exact number of times you've said 'bruh' in the last 72 hours.",
    "\n\nSECTION 4: PAYMENT TERMS\nPayment shall be made in compliments, at a rate of no less than 3 compliments per feature used. Late compliments will incur a 15% awkward silence penalty.",
    "\n\nSECTION 5: LIABILITY\nWe are not responsible for: existential crises caused by reading these terms, spontaneous eye-rolling, or the sudden urge to close this tab.",
    "\n\nSECTION 6: COOKIES\nThis site uses cookies. Not the delicious kind. The disappointing, tracking kind. We also wish they were chocolate chip.",
    "\n\nSECTION 7: DISPUTE RESOLUTION\nAll disputes shall be resolved via rock-paper-scissors, best of 7. The loser must publicly admit that pineapple on pizza is acceptable.",
    "\n\nSECTION 8: TERMINATION\nEither party may terminate this agreement by dramatically flipping a table. Digital table-flipping is also accepted: (+=+)",
    "\n\nSECTION 9: INTELLECTUAL PROPERTY\nAll ideas you have while using this service become the property of your cat. If you don't have a cat, a cat will be assigned to you.",
    "\n\nSECTION 10: MISCELLANEOUS\nYou agree to never use Comic Sans in a professional setting. Violation of this clause results in immediate banishment to the shadow realm.",
  ];

  const extensionTerms = [
    [
      "\n\n--- ADDENDUM A (surprise!) ---",
      "\n\nSECTION 11: SOCIAL OBLIGATIONS\nYou must laugh at the developer's jokes, even the bad ones. Especially the bad ones. They're trying their best.",
      "\n\nSECTION 12: SLEEP CLAUSE\nBy accepting these terms you acknowledge that sleep is just a suggestion. The recommended amount is 'enough' but we don't define what that means.",
      "\n\nSECTION 13: WEATHER POLICY\nIf it rains on a Tuesday, all terms in this agreement are reversed. Except this one. This one stays.",
      "\n\nSECTION 14: VIBES\nThe user agrees to maintain good vibes at all times. Bad vibes will be taxed at 200%. Neutral vibes incur a processing fee.",
    ],
    [
      "\n\n--- ADDENDUM B (you thought it was over?) ---",
      "\n\nSECTION 15: QUANTUM TERMS\nThese terms both exist and don't exist until observed by a lawyer. Schrodinger's EULA.",
      "\n\nSECTION 16: SNACK REQUIREMENTS\nUser must have a snack within arm's reach at all times while using the service. Acceptable snacks: chips, cookies, regret.",
      "\n\nSECTION 17: TIME TRAVEL CLAUSE\nIf time travel is invented, this agreement retroactively applies to all past versions of the user, including that embarrassing phase in middle school.",
      "\n\nSECTION 18: FINAL FINAL TERMS\nThis is definitely the last section. Probably. We make no guarantees. Just keep scrolling.",
    ],
    [
      "\n\n--- ADDENDUM C (okay THIS is the last one, we promise) ---",
      "\n\nSECTION 19: THE ACTUAL LAST SECTION\nCongratulations. You've read more fake legal text than most people read real legal text. Your dedication is both admirable and concerning.",
      "\n\nSECTION 20: FREEDOM\nYou are now free. The accept button awaits. Go forth and click it. You've earned this. We're proud of you.",
    ],
  ];

  const getCurrentTerms = () => {
    let terms = [...baseTerms];
    for (let i = 0; i < extensions; i++) {
      if (extensionTerms[i]) terms = [...terms, ...extensionTerms[i]];
    }
    return terms.join('');
  };

  const handleTermsScroll = () => {
    const el = termsScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    if (atBottom && extensions < 3) {
      setExtensions(prev => prev + 1);
      setTimeout(() => {
        if (el) el.scrollTop = el.scrollHeight - el.clientHeight - 100;
      }, 50);
    } else if (atBottom && extensions >= 3) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    setAccepted(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  const resetTerms = () => {
    setScrolledToBottom(false);
    setExtensions(0);
    setAccepted(false);
    setShowConfetti(false);
    if (termsScrollRef.current) termsScrollRef.current.scrollTop = 0;
  };

  return (
    <SectionWrapper
      title="Accept Terms & Conditions"
      helpText="Read all the terms before accepting. ALL of them. Yes there are more. Keep scrolling."
      color="#fbbf24"
    >
      <div style={{ position: 'relative' }}>
        <div ref={termsScrollRef} onScroll={handleTermsScroll} style={{
          height: '220px', overflowY: 'auto', borderRadius: '12px',
          border: '1px solid rgba(251,191,36,0.2)',
          background: 'rgba(0,0,0,0.3)', padding: '16px',
          fontSize: '12px', lineHeight: 1.7,
          color: 'rgba(255,255,255,0.5)',
          whiteSpace: 'pre-wrap',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(251,191,36,0.3) transparent',
        }}>
          {getCurrentTerms()}
          {extensions < 3 && (
            <div style={{
              marginTop: '20px', textAlign: 'center', padding: '10px',
              color: 'rgba(251,191,36,0.6)', fontSize: '11px', fontStyle: 'italic',
            }}>
              Scroll down for more...
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px',
        }}>
          <button onClick={handleAccept} disabled={!scrolledToBottom || accepted} style={{
            padding: '12px 28px', fontSize: '14px', fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            background: accepted
              ? 'rgba(52,211,153,0.2)'
              : scrolledToBottom
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'rgba(255,255,255,0.06)',
            color: accepted ? '#34d399' : scrolledToBottom ? '#000' : 'rgba(255,255,255,0.25)',
            border: `1px solid ${accepted ? 'rgba(52,211,153,0.4)' : scrolledToBottom ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
            cursor: scrolledToBottom && !accepted ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s',
          }}>
            {accepted ? 'Accepted!' : 'I Accept'}
          </button>

          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {accepted ? 'Your soul is now ours. Just kidding.' :
             scrolledToBottom ? 'Button unlocked! Click to accept.' :
             extensions > 0 ? `Surprise! More terms appeared. (${extensions}/3 extensions)` :
             'Scroll to the bottom to enable the button.'}
          </span>
        </div>

        {accepted && showConfetti && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
            borderRadius: '20px',
          }}>
            {Array.from({ length: 40 }, (_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                background: ['#fbbf24', '#e91e8c', '#34d399', '#38bdf8', '#b388ff', '#ef4444', '#fb923c'][Math.floor(Math.random() * 7)],
                animation: `stupid-confetti-fall ${1.5 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.8}s`,
                opacity: 0,
              }} />
            ))}
          </div>
        )}

        {accepted && (
          <div style={{
            marginTop: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
            textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#34d399',
          }}>
            Terms accepted! You scrolled through {10 + extensions * 5} sections of nonsense. We respect your dedication.
          </div>
        )}

        <button onClick={resetTerms} style={{ ...miniBtn, marginTop: '10px' }}>Reset Terms</button>
      </div>
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// 16. THE CAPTCHA FROM HELL
// ══════════════════════════════════════════════
function CaptchaFromHell() {
  const [selected, setSelected] = useState(Array(9).fill(false));
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState(false);

  const gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fccb90, #d57eeb)',
    'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
    'linear-gradient(135deg, #f5576c, #ff9a9e)',
  ];

  const failMessages = [
    "Nope! Those aren't invisible dragons. Look harder. (They're invisible, remember?)",
    "Wrong again! You clearly can't see invisible things. Which is the point. Try again.",
    "Still wrong! But honestly, we admire your persistence. One more try...",
  ];

  const toggleSquare = (i) => {
    if (solved) return;
    setSelected(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  };

  const handleVerify = () => {
    if (solved) return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= 4) {
      setSolved(true);
      setMessage("Close enough. We'll allow it. The invisible dragons vouch for you.");
    } else {
      setMessage(failMessages[newAttempts - 1]);
      setSelected(Array(9).fill(false));
    }
  };

  const resetCaptcha = () => {
    setSelected(Array(9).fill(false));
    setAttempts(0);
    setMessage('');
    setSolved(false);
  };

  return (
    <SectionWrapper
      title="The Captcha From Hell"
      helpText="Select all squares containing invisible dragons. They're invisible, so... good luck."
      color="#818cf8"
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{
          background: 'rgba(0,0,0,0.3)', borderRadius: '14px',
          border: '1px solid rgba(129,140,248,0.2)',
          padding: '16px', maxWidth: '300px', margin: '0 auto',
        }}>
          <div style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px',
            fontWeight: 600,
          }}>
            Select all squares with <span style={{ color: '#818cf8' }}>invisible dragons</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px',
            maxWidth: '260px', width: '100%', margin: '0 auto',
          }}>
            {gradients.map((grad, i) => (
              <div key={i} onClick={() => toggleSquare(i)} style={{
                width: '100%', aspectRatio: '1', borderRadius: '10px',
                background: grad, cursor: solved ? 'default' : 'pointer',
                border: `3px solid ${selected[i] ? '#818cf8' : 'transparent'}`,
                boxShadow: selected[i] ? '0 0 12px rgba(129,140,248,0.4)' : 'none',
                transition: 'all 0.15s',
                position: 'relative', overflow: 'hidden',
                opacity: solved ? 0.5 : 1,
              }}>
                {selected[i] && !solved && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(129,140,248,0.3)',
                    fontSize: '24px', color: '#fff', fontWeight: 700,
                  }}>
                    x
                  </div>
                )}
                {solved && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(52,211,153,0.3)',
                    fontSize: '18px', color: '#34d399', fontWeight: 700,
                  }}>
                    ok
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={handleVerify} disabled={solved} style={{
            marginTop: '12px', padding: '10px 32px', fontSize: '14px', fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            background: solved
              ? 'rgba(52,211,153,0.2)'
              : 'linear-gradient(135deg, #818cf8, #6366f1)',
            color: '#fff', border: 'none', borderRadius: '10px',
            cursor: solved ? 'default' : 'pointer',
          }}>
            {solved ? 'Verified!' : 'Verify'}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '12px', padding: '10px 16px', borderRadius: '12px',
            background: solved ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${solved ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontSize: '13px', fontWeight: 600,
            color: solved ? '#34d399' : '#ef4444',
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          Attempts: {attempts} / 4
        </div>

        <button onClick={resetCaptcha} style={{ ...miniBtn, marginTop: '8px' }}>Reset Captcha</button>
      </div>
    </SectionWrapper>
  );
}


// ══════════════════════════════════════════════
// MUSIC ENGINE — Web Audio API synth per section
// ══════════════════════════════════════════════
function useSectionMusic() {
  const ctxRef = useRef(null);
  const activeRef = useRef([]);

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const stopAll = () => {
    activeRef.current.forEach(n => { try { n.stop(); } catch {} });
    activeRef.current = [];
  };

  const playNote = (freq, duration, type = 'sine', vol = 0.08) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    activeRef.current.push(osc);
  };

  const playMelody = (notes, type = 'sine', vol = 0.07) => {
    let t = 0;
    notes.forEach(([freq, dur]) => {
      setTimeout(() => playNote(freq, dur, type, vol), t * 1000);
      t += dur * 0.6;
    });
  };

  const melodies = {
    checkboxes: () => playMelody([[523, 0.15], [587, 0.15], [659, 0.15], [698, 0.15], [784, 0.3]], 'square', 0.05),
    strength: () => playMelody([[220, 0.2], [262, 0.2], [330, 0.2], [440, 0.4]], 'sawtooth', 0.04),
    dots: () => playMelody([[784, 0.12], [880, 0.12], [988, 0.12], [1047, 0.12], [1175, 0.2]], 'sine', 0.06),
    rope: () => playMelody([[330, 0.3], [294, 0.3], [262, 0.3], [294, 0.3], [330, 0.5]], 'triangle', 0.06),
    scroll: () => playMelody([[196, 0.4], [220, 0.4], [247, 0.4], [262, 0.6]], 'sine', 0.05),
    wheel: () => playMelody([[440, 0.1], [494, 0.1], [523, 0.1], [587, 0.1], [659, 0.1], [698, 0.1], [784, 0.3]], 'square', 0.04),
    binary: () => playMelody([[131, 0.2], [262, 0.2], [131, 0.2], [262, 0.2], [523, 0.4]], 'square', 0.04),
    clicker: () => playMelody([[440, 0.08], [523, 0.08], [659, 0.08], [784, 0.08], [880, 0.08], [1047, 0.15]], 'sine', 0.05),
    maze: () => playMelody([[349, 0.25], [392, 0.25], [440, 0.25], [523, 0.25], [587, 0.4]], 'triangle', 0.05),
    simon: () => playMelody([[659, 0.2], [784, 0.2], [880, 0.2], [1047, 0.4]], 'sine', 0.06),
    password: () => playMelody([[392, 0.15], [349, 0.15], [330, 0.15], [294, 0.15], [262, 0.3]], 'sawtooth', 0.03),
    terms: () => playMelody([[262, 0.3], [247, 0.3], [220, 0.3], [196, 0.5]], 'triangle', 0.04),
    captcha: () => playMelody([[523, 0.1], [494, 0.1], [440, 0.1], [494, 0.1], [523, 0.1], [587, 0.2]], 'square', 0.04),
    runaway: () => playMelody([[784, 0.08], [880, 0.08], [784, 0.08], [659, 0.08], [784, 0.08], [1047, 0.15]], 'sine', 0.05),
    datepicker: () => playMelody([[262, 0.5], [262, 0.5], [262, 0.5], [262, 0.8]], 'triangle', 0.04),
    lightswitch: () => playMelody([[165, 0.3], [175, 0.3], [165, 0.3], [175, 0.3]], 'sawtooth', 0.03),
  };

  const play = (key) => {
    stopAll();
    if (melodies[key]) melodies[key]();
  };

  return { play, stopAll };
}


// ══════════════════════════════════════════════
// CARD DATA — registry of all sections
// ══════════════════════════════════════════════
const SECTIONS = [
  // Volume Controls
  { id: 'checkboxes', title: '100 Checkboxes', icon: '~', desc: 'Check 100 boxes for volume', color: '#ff6b9d', group: 'volume', music: 'checkboxes' },
  { id: 'strength', title: 'Strength Test', icon: '!', desc: 'Carnival hammer smash', color: '#ffb347', group: 'volume', music: 'strength' },
  { id: 'dots', title: 'Dot Collector', icon: '.', desc: 'Catch floating dots', color: '#a78bfa', group: 'volume', music: 'dots' },
  { id: 'rope', title: 'Pull The Rope', icon: '~', desc: 'Drag the knot across', color: '#fb923c', group: 'volume', music: 'rope' },
  { id: 'scroll', title: 'Infinite Scroll', icon: '|', desc: 'Scroll 5000px of pain', color: '#34d399', group: 'volume', music: 'scroll' },
  { id: 'wheel', title: 'Spin The Wheel', icon: 'O', desc: 'Fate picks your volume', color: '#f472b6', group: 'volume', music: 'wheel' },
  { id: 'binary', title: 'Type In Binary', icon: '01', desc: '1100100 = 100%', color: '#38bdf8', group: 'volume', music: 'binary' },
  { id: 'clicker', title: 'Cookie Clicker', icon: '+', desc: 'Tap 100 times', color: '#ef4444', group: 'volume', music: 'clicker' },
  { id: 'maze', title: 'Maze Slider', icon: 'Z', desc: 'Zigzag to set volume', color: '#c084fc', group: 'volume', music: 'maze' },
  { id: 'simon', title: 'Simon Says', icon: '4', desc: 'Memory game volume', color: '#facc15', group: 'volume', music: 'simon' },
  // Impossible Forms
  { id: 'password', title: 'Password Field', icon: '*', desc: 'Letters shuffle while you type', color: '#f87171', group: 'forms', music: 'password' },
  { id: 'terms', title: 'Terms & Conditions', icon: '#', desc: 'Terms that never end', color: '#fbbf24', group: 'forms', music: 'terms' },
  { id: 'captcha', title: 'Captcha From Hell', icon: '?', desc: 'Find invisible dragons', color: '#818cf8', group: 'forms', music: 'captcha' },
  // Unhinged Interactions
  { id: 'runaway', title: 'Submit Button', icon: '>', desc: 'The button runs away', color: '#22d3ee', group: 'interactions', music: 'runaway' },
  { id: 'datepicker', title: 'Date Picker 1900', icon: 'M', desc: 'One month at a time', color: '#f59e0b', group: 'interactions', music: 'datepicker' },
  { id: 'lightswitch', title: 'Light Switch', icon: 'I', desc: '2% chance per flip', color: '#fbbf24', group: 'interactions', music: 'lightswitch' },
];

const GROUPS = [
  { key: 'volume', title: 'Cursed Volume Controls', subtitle: '10 terrible ways to set your volume', color: '#e91e8c' },
  { key: 'forms', title: 'Impossible Forms', subtitle: 'Good luck completing any of these', color: '#818cf8' },
  { key: 'interactions', title: 'Unhinged Interactions', subtitle: 'Buttons that fight back', color: '#22d3ee' },
];

const COMPONENTS = {
  checkboxes: CheckboxVolume,
  strength: StrengthTest,
  dots: DotCollector,
  rope: PullTheRope,
  scroll: InfiniteScroll,
  wheel: SpinTheWheel,
  binary: BinaryVolume,
  clicker: CookieClicker,
  maze: MazeSlider,
  simon: SimonSays,
  password: ThePasswordField,
  terms: AcceptTerms,
  captcha: CaptchaFromHell,
  runaway: RunawayButton,
  datepicker: DatePicker1900,
  lightswitch: LightSwitch,
};


// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function StupidDesignPage() {
  const [active, setActive] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const music = useSectionMusic();

  const openSection = (section) => {
    setActive(section.id);
    music.play(section.music);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setActive(null);
    music.stopAll();
  };

  const ActiveComponent = active ? COMPONENTS[active] : null;
  const activeSection = active ? SECTIONS.find(s => s.id === active) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      padding: '0 16px 60px',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '-120px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: active && activeSection
          ? `radial-gradient(ellipse, ${activeSection.color}18 0%, ${activeSection.color}08 40%, transparent 70%)`
          : 'radial-gradient(ellipse, rgba(233,30,140,0.1) 0%, rgba(179,136,255,0.06) 40%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
        transition: 'background 0.5s ease',
      }} />

      {/* Top bar */}
      <div style={{ maxWidth: '700px', margin: '0 auto', paddingTop: '16px', position: 'relative', zIndex: 1 }}>
        {active ? (
          <button onClick={goBack} style={{
            color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}>
            &larr; All Challenges
          </button>
        ) : (
          <Link href="/" style={{
            color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px',
            fontFamily: "'Inter', sans-serif", display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            &larr; Back
          </Link>
        )}
      </div>

      {/* Header */}
      {!active && (
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, margin: '20px 0 20px' }}>
          <h1 style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(1.8rem, 6vw, 2.6rem)', fontWeight: 700,
            background: 'linear-gradient(135deg, #e91e8c, #b388ff, #38bdf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '0 0 8px',
          }}>
            Stupid Design Lab
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0,
            maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto', padding: '0 8px',
          }}>
            Pick a challenge. Each one plays its own cursed tune.
          </p>
        </div>
      )}

      <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ═══ CARD GRID VIEW ═══ */}
        {!active && GROUPS.map(group => {
          const groupSections = SECTIONS.filter(s => s.group === group.key);
          return (
            <div key={group.key} style={{ marginBottom: '28px' }}>
              {/* Group header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                margin: '0 0 14px', padding: '0 4px',
              }}>
                <div style={{
                  width: '4px', height: '28px', borderRadius: '2px',
                  background: group.color,
                  boxShadow: `0 0 8px ${group.color}55`,
                }} />
                <div>
                  <div style={{
                    fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: 700, color: group.color,
                    fontFamily: "'Inter', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    {group.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                    {group.subtitle}
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(155px, 100%), 1fr))',
                gap: '10px',
              }}>
                {groupSections.map(section => {
                  const isHovered = hoveredCard === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => openSection(section)}
                      onMouseEnter={() => setHoveredCard(section.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: isHovered
                          ? `linear-gradient(135deg, ${section.color}18, ${section.color}08)`
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isHovered ? `${section.color}40` : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '16px',
                        padding: '16px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        transform: isHovered ? 'translateY(-2px)' : 'none',
                        boxShadow: isHovered ? `0 8px 24px ${section.color}15` : 'none',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                      }}
                    >
                      {/* Icon circle */}
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '12px',
                        background: `${section.color}15`,
                        border: `1px solid ${section.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '15px', fontWeight: 800, color: section.color,
                        fontFamily: "'Courier New', monospace",
                      }}>
                        {section.icon}
                      </div>

                      <div style={{
                        fontSize: '13px', fontWeight: 700, color: '#fff',
                        fontFamily: "'Inter', sans-serif", lineHeight: 1.2,
                      }}>
                        {section.title}
                      </div>

                      <div style={{
                        fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                        lineHeight: 1.3,
                      }}>
                        {section.desc}
                      </div>

                      {/* Play hint */}
                      <div style={{
                        fontSize: '10px', color: section.color, fontWeight: 600,
                        opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <span>&#9654;</span> Play
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ═══ ACTIVE SECTION VIEW ═══ */}
        {active && ActiveComponent && (
          <div style={{ animation: 'stupid-fade-in 0.3s ease' }}>
            {/* Now playing bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: `${activeSection.color}10`,
              border: `1px solid ${activeSection.color}25`,
              borderRadius: '12px', padding: '10px 14px',
              margin: '12px 0 18px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: `${activeSection.color}20`, border: `1px solid ${activeSection.color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 800, color: activeSection.color,
                fontFamily: "'Courier New', monospace",
              }}>
                {activeSection.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {activeSection.title}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                  {activeSection.desc}
                </div>
              </div>
              {/* Replay music */}
              <button onClick={() => music.play(activeSection.music)} style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: `${activeSection.color}15`, border: `1px solid ${activeSection.color}30`,
                color: activeSection.color, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="Replay music">
                &#9835;
              </button>
            </div>

            <ActiveComponent />
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes stupid-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        @keyframes stupid-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stupid-pop-up {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
        @keyframes stupid-confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(400px) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}
