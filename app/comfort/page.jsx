'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const LOVE_NOTES = [
  "You don't have to be okay all the time. I'll be here for the not-okay times too. ♥",
  "The world is genuinely better because you're in it. I mean that.",
  "Bad days don't last. But my love for you? That's permanent.",
  "You are so much more than whatever is making you feel small right now.",
  "I wish I could hold you right now. Until I can — this hug is for you. 🫂",
  "You are the most important thing. Not the problem, not the worry. You.",
];

const AFFIRMATIONS = [
  { emoji: '🌟', text: 'You are enough, exactly as you are' },
  { emoji: '💙', text: 'Your feelings are valid' },
  { emoji: '♥', text: 'You are loved more than you know' },
  { emoji: '💪', text: 'You are stronger than this moment' },
  { emoji: '🤝', text: "It's okay to ask for help" },
  { emoji: '✨', text: 'Tomorrow is a new chance ✨' },
];

const BURST_EMOJIS = ['♥', '💕', '🌸', '✨', '💖', '🌸', '✨', '♥'];

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Good morning, beautiful ☀️', sub: 'This corner is always here for you.' };
  if (h >= 12 && h < 17) return { text: 'Good afternoon, Amrita 🌸', sub: 'This corner is always here for you.' };
  if (h >= 17 && h < 21) return { text: 'Good evening, love 🌙', sub: 'This corner is always here for you.' };
  return { text: 'Hey you, it\'s ok to rest 🌟', sub: 'This corner is always here for you.' };
}

export default function ComfortPage() {
  const [greeting, setGreeting] = useState({ text: '', sub: '' });
  const [breathPhase, setBreathPhase] = useState('idle');
  const [breathCount, setBreathCount] = useState(0);
  const [breathRunning, setBreathRunning] = useState(false);
  const [hugCount, setHugCount] = useState(0);
  const [hugAnimating, setHugAnimating] = useState(false);
  const [showHugBurst, setShowHugBurst] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [quoteDir, setQuoteDir] = useState(1);

  const breathTimerRef = useRef(null);
  const quoteTimerRef = useRef(null);
  const breathCycleRef = useRef(false);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // Auto quote cycle
  useEffect(() => {
    quoteTimerRef.current = setInterval(() => {
      setCurrentQuote((q) => (q + 1) % LOVE_NOTES.length);
    }, 6000);
    return () => clearInterval(quoteTimerRef.current);
  }, []);

  const runBreathCycle = useCallback(() => {
    let running = true;
    breathCycleRef.current = true;

    async function cycle() {
      while (breathCycleRef.current) {
        setBreathPhase('inhale');
        await wait(4000);
        if (!breathCycleRef.current) break;
        setBreathPhase('hold');
        await wait(4000);
        if (!breathCycleRef.current) break;
        setBreathPhase('exhale');
        await wait(4000);
        if (!breathCycleRef.current) break;
        setBreathCount((c) => c + 1);
        setBreathPhase('idle');
        await wait(800);
      }
      setBreathPhase('idle');
    }
    cycle();
  }, []);

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  const startBreathing = () => {
    if (breathRunning) return;
    setBreathRunning(true);
    runBreathCycle();
  };

  const stopBreathing = () => {
    breathCycleRef.current = false;
    setBreathRunning(false);
    setBreathPhase('idle');
  };

  useEffect(() => {
    return () => {
      breathCycleRef.current = false;
    };
  }, []);

  const breathCircleSize = breathPhase === 'inhale' ? 200 : breathPhase === 'hold' ? 165 : breathPhase === 'exhale' ? 120 : 120;
  const breathTransition = breathPhase === 'inhale' ? '4s ease-in' : breathPhase === 'exhale' ? '4s ease-out' : '0.3s';

  const breathLabel =
    breathPhase === 'inhale' ? 'Breathe in...' :
    breathPhase === 'hold' ? 'Hold...' :
    breathPhase === 'exhale' ? 'Breathe out...' :
    breathRunning ? 'Get ready...' : 'Press start';

  const giveHug = () => {
    setHugCount((c) => c + 1);
    setHugAnimating(true);
    setShowHugBurst(true);
    setTimeout(() => {
      setHugAnimating(false);
      setShowHugBurst(false);
    }, 1500);
  };

  const prevQuote = () => {
    clearInterval(quoteTimerRef.current);
    setCurrentQuote((q) => (q - 1 + LOVE_NOTES.length) % LOVE_NOTES.length);
  };

  const nextQuote = () => {
    clearInterval(quoteTimerRef.current);
    setCurrentQuote((q) => (q + 1) % LOVE_NOTES.length);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        color: 'rgba(255,255,255,0.88)',
        fontFamily: "'Inter', sans-serif",
        padding: '0 0 80px',
      }}
    >
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(233,30,140,0.3), 0 0 40px rgba(233,30,140,0.1); }
          50% { box-shadow: 0 0 30px rgba(233,30,140,0.6), 0 0 60px rgba(233,30,140,0.2); }
        }
        @keyframes burstOut {
          0% { transform: translate(-50%, -50%) translate(var(--tx,0px), var(--ty,0px)) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(calc(var(--tx,0px) * 3), calc(var(--ty,0px) * 3)) scale(0.3); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes affirmHover {
          0%, 100% { box-shadow: 0 0 8px rgba(233,30,140,0.15); }
          50% { box-shadow: 0 0 20px rgba(233,30,140,0.4); }
        }
      `}</style>

      {/* 1. Greeting hero */}
      <section
        style={{
          background: 'linear-gradient(180deg, rgba(233,30,140,0.08) 0%, transparent 100%)',
          padding: '60px 24px 50px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            fontWeight: 700,
            marginBottom: '12px',
            lineHeight: 1.3,
          }}
        >
          {greeting.text}
        </h1>
        <p
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
            color: '#b388ff',
          }}
        >
          {greeting.sub}
        </p>
      </section>

      {/* 2. Breathing */}
      <section
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '32px',
            color: '#fff',
          }}
        >
          Take a breath with me
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: `${breathCircleSize}px`,
              height: `${breathCircleSize}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(233,30,140,0.3) 0%, rgba(179,136,255,0.15) 60%, transparent 100%)',
              border: '2px solid rgba(233,30,140,0.5)',
              transition: `width ${breathTransition}, height ${breathTransition}`,
              animation: breathPhase === 'idle' && !breathRunning ? 'pulseGlow 2s ease-in-out infinite' : 'none',
              boxShadow: '0 0 30px rgba(233,30,140,0.25)',
            }}
          />
        </div>

        <p
          style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.75)',
            marginBottom: '24px',
            minHeight: '28px',
            transition: 'opacity 0.3s',
          }}
        >
          {breathLabel}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!breathRunning ? (
            <button
              onClick={startBreathing}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Start Breathing
            </button>
          ) : (
            <button
              onClick={stopBreathing}
              style={{
                padding: '12px 32px',
                background: 'transparent',
                color: '#e91e8c',
                border: '1.5px solid #e91e8c',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Stop
            </button>
          )}
        </div>

        {breathCount > 0 && (
          <p style={{ marginTop: '16px', color: '#e91e8c', fontSize: '0.9rem' }}>
            {breathCount} breath{breathCount !== 1 ? 's' : ''} completed ♥
          </p>
        )}
      </section>

      {/* Divider */}
      <div style={{ maxWidth: '400px', margin: '0 auto', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(233,30,140,0.3), transparent)' }} />

      {/* 3. Virtual hug */}
      <section
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '32px',
            color: '#fff',
          }}
        >
          Need a hug?
        </h2>

        {/* Bears */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: hugAnimating ? '4px' : '48px',
            transition: 'gap 0.5s ease',
            fontSize: '3.5rem',
            marginBottom: '24px',
            position: 'relative',
            minHeight: '80px',
          }}
        >
          <span style={{ display: 'inline-block', transition: 'transform 0.5s', transform: hugAnimating ? 'translateX(12px)' : 'none' }}>🐻</span>
          <span style={{ display: 'inline-block', transition: 'transform 0.5s', transform: hugAnimating ? 'translateX(-12px) scaleX(-1)' : 'scaleX(-1)' }}>🐻</span>

          {/* Burst particles */}
          {showHugBurst && BURST_EMOJIS.map((em, i) => {
            const angle = (Math.PI * 2 * i) / BURST_EMOJIS.length;
            const dist = 50;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  fontSize: '1.2rem',
                  pointerEvents: 'none',
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                  animation: 'burstOut 1s ease-out forwards',
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                {em}
              </div>
            );
          })}
        </div>

        <button
          onClick={giveHug}
          style={{
            padding: '14px 40px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 4px 24px rgba(233,30,140,0.35)',
            marginBottom: '16px',
          }}
        >
          Hug me 🫂
        </button>

        {hugCount > 0 && (
          <p style={{ color: '#e91e8c', fontSize: '0.9rem' }}>
            You've been hugged {hugCount} time{hugCount !== 1 ? 's' : ''} today ♥
          </p>
        )}
      </section>

      {/* Divider */}
      <div style={{ maxWidth: '400px', margin: '0 auto', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(179,136,255,0.3), transparent)' }} />

      {/* 4. Love notes carousel */}
      <section
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '8px',
            color: '#fff',
          }}
        >
          From Siddharth, always
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '28px' }}>
          for whenever you need it
        </p>

        {/* Card */}
        <div
          key={currentQuote}
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(233,30,140,0.2)',
            borderRadius: '20px',
            padding: '36px 32px',
            marginBottom: '20px',
            animation: 'fadeSlideIn 0.5s ease',
          }}
        >
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
              fontStyle: 'italic',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.9)',
              margin: 0,
            }}
          >
            "{LOVE_NOTES[currentQuote]}"
          </p>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button
            onClick={prevQuote}
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            {LOVE_NOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuote(i)}
                style={{
                  width: i === currentQuote ? '18px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === currentQuote ? '#e91e8c' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            ))}
          </div>

          <button
            onClick={nextQuote}
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            →
          </button>
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: '400px', margin: '0 auto', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(233,30,140,0.3), transparent)' }} />

      {/* 5. Affirmations */}
      <section
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '28px',
            color: '#fff',
          }}
        >
          Things that are true about you
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          {AFFIRMATIONS.map((a, i) => (
            <AffirmCard key={i} emoji={a.emoji} text={a.text} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AffirmCard({ emoji, text }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(233,30,140,0.2)',
        borderRadius: '14px',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        transition: 'transform 0.2s, box-shadow 0.3s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 0 20px rgba(233,30,140,0.3)' : '0 0 8px rgba(233,30,140,0.1)',
      }}
    >
      <span style={{ fontSize: '1.8rem' }}>{emoji}</span>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.85)',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}
