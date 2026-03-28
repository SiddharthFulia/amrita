"use client";

import { useState, useEffect, useRef } from 'react';
import CountdownTimer from '@/components/CountdownTimer/CountdownTimer';
import { SURPRISE_DATE } from '@/constants/content';

const SEALED_MESSAGE = `My dearest Amrita,

If you're reading this, it means today is the day — 12th May 2026.

I've been holding this message for a while now, writing and rewriting it, because I wanted to get it exactly right. But I've realised: there are no perfect words for how I feel about you. There never will be.

What I do know is this:
Every single day with you has been a gift I didn't expect and can't imagine being without.
You make me laugh, you make me think, you make me want to be better.
And you do all of it just by being exactly who you are.

Today, I wanted to do something special — to show you, not just tell you, how much you mean to me.

So here we are.

This whole little website? It was built for you. Every pixel, every floating heart, every cuddly little bear — that's us, Amrita. That's what you mean to me.

Thank you for being you. Thank you for letting me be part of your world.

I love you — completely, joyfully, and without a single doubt.

Always yours,
Siddharth ♥`;

function SurpriseRevealed() {
  const [charIndex, setCharIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (showAll || charIndex >= SEALED_MESSAGE.length) return;
    const timer = setTimeout(() => setCharIndex(prev => prev + 1), 18);
    return () => clearTimeout(timer);
  }, [charIndex, showAll]);

  const displayedText = showAll ? SEALED_MESSAGE : SEALED_MESSAGE.slice(0, charIndex);

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '48px',
        background: 'rgba(233,30,140,0.06)',
        border: '1px solid rgba(233,30,140,0.2)',
        borderRadius: '28px',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #e91e8c, #b388ff, transparent)',
        }}
      />

      <div
        style={{
          fontSize: '48px',
          textAlign: 'center',
          marginBottom: '28px',
          animation: 'heart-beat 1.5s ease-in-out infinite',
          filter: 'drop-shadow(0 0 20px rgba(233,30,140,0.8))',
        }}
      >
        ♥
      </div>

      <pre
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '16px',
          lineHeight: 1.9,
          color: 'rgba(255,255,255,0.88)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {displayedText}
        {!showAll && charIndex < SEALED_MESSAGE.length && (
          <span
            style={{
              display: 'inline-block',
              width: '2px',
              height: '18px',
              background: '#e91e8c',
              marginLeft: '2px',
              animation: 'pulse-glow 1s ease-in-out infinite',
              verticalAlign: 'middle',
            }}
          />
        )}
      </pre>

      {(showAll || charIndex >= SEALED_MESSAGE.length) && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '42px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Happy Birthday, Amrita ♥
          </div>
        </div>
      )}

      {!showAll && charIndex < SEALED_MESSAGE.length && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            display: 'block',
            margin: '24px auto 0',
            padding: '10px 24px',
            background: 'rgba(233,30,140,0.1)',
            border: '1px solid rgba(233,30,140,0.25)',
            borderRadius: '50px',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          Skip typing animation →
        </button>
      )}
    </div>
  );
}

function LockedView({ tapCount, onTap }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {/* Tap envelope 5 times to unlock */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: '48px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={onTap}
      >
        <div
          style={{
            fontSize: '100px',
            animation: 'float-slow 6s ease-in-out infinite',
            filter: 'drop-shadow(0 0 30px rgba(233,30,140,0.5))',
            display: 'block',
          }}
        >
          💌
        </div>

        <div
          style={{
            position: 'absolute',
            inset: '-20px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(233,30,140,0.15) 0%, transparent 70%)',
            animation: 'pulse-glow 3s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Tap progress dots — appear after first tap */}
        {tapCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            {[0, 1, 2, 3, 4].map(dotIndex => (
              <div
                key={dotIndex}
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: dotIndex < tapCount
                    ? 'rgba(233,30,140,0.8)'
                    : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.2s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <h2
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(22px, 4vw, 36px)',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: '16px',
        }}
      >
        Something special is sealed inside
      </h2>

      <p
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: 'italic',
          fontSize: '18px',
          color: 'rgba(255,255,255,0.45)',
          maxWidth: '440px',
          margin: '0 auto 48px',
          lineHeight: 1.7,
        }}
      >
        This message will unseal itself on 12 May 2026 — a day that matters.
        Until then, it's waiting here just for you, Amrita.
      </p>

      <div
        style={{
          display: 'inline-block',
          padding: '28px 40px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(233,30,140,0.12)',
          borderRadius: '20px',
          backdropFilter: 'blur(16px)',
          marginBottom: '48px',
        }}
      >
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '14px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.1em',
            marginBottom: '16px',
            textTransform: 'uppercase',
          }}
        >
          Time remaining
        </div>
        <CountdownTimer />
      </div>

      <div>
        <p
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '20px',
            color: 'rgba(233,30,140,0.6)',
            marginBottom: '8px',
          }}
        >
          Come back on 12 May 2026 ✨
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          (or just wait — the page will open itself)
        </p>
      </div>
    </div>
  );
}

export default function SurprisePage() {
  const [isSurpriseTime, setIsSurpriseTime] = useState(false);
  const [manuallyUnlocked, setManuallyUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef(null);

  const isRevealed = manuallyUnlocked || isSurpriseTime;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const checkTime = () => setIsSurpriseTime(new Date() >= SURPRISE_DATE);
    checkTime();
    const intervalId = setInterval(checkTime, 2000);
    return () => clearInterval(intervalId);
  }, [mounted]);

  const handleEnvelopeTap = () => {
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setManuallyUnlocked(true);
        return 0;
      }
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapCount(0), 2000);
      return next;
    });
  };

  return (
    <div style={{ minHeight: '100vh', padding: '60px 40px 80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '70px' }}>
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '16px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          ✦ the big reveal ✦
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffffff 0%, #ff6baa 50%, #b388ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '16px',
            lineHeight: 1.1,
          }}
        >
          12 May Surprise
        </h1>
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.45)',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Planned with love, waiting just for you.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {!mounted ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <div
              style={{
                fontSize: '60px',
                animation: 'float 3s ease-in-out infinite',
                filter: 'drop-shadow(0 0 20px rgba(233,30,140,0.6))',
              }}
            >
              💌
            </div>
          </div>
        ) : isRevealed ? (
          <SurpriseRevealed />
        ) : (
          <LockedView tapCount={tapCount} onTap={handleEnvelopeTap} />
        )}
      </div>
    </div>
  );
}
