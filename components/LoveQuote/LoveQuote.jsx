"use client";

import { useState, useEffect } from 'react';
import { LOVE_QUOTES } from '@/constants/content';

export default function LoveQuote({ compact = false }) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentQuoteIndex(Math.floor(Math.random() * LOVE_QUOTES.length));
  }, []);

  const handleNewQuote = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentQuoteIndex((prevIndex) => {
        let nextIndex = Math.floor(Math.random() * LOVE_QUOTES.length);
        while (nextIndex === prevIndex) {
          nextIndex = Math.floor(Math.random() * LOVE_QUOTES.length);
        }
        return nextIndex;
      });
      setIsAnimating(false);
    }, 400);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      handleNewQuote();
    }, 8000);
    return () => clearInterval(intervalId);
  }, [isAnimating]);

  const currentQuote = mounted ? LOVE_QUOTES[currentQuoteIndex] : LOVE_QUOTES[0];

  if (compact) {
    return (
      <div
        style={{
          textAlign: 'center',
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '16px',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.6,
            marginBottom: '8px',
          }}
        >
          "{currentQuote.text}"
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        maxWidth: '680px',
        margin: '0 auto',
        padding: '48px 48px',
        background: 'rgba(233,30,140,0.05)',
        border: '1px solid rgba(233,30,140,0.15)',
        borderRadius: '24px',
        backdropFilter: 'blur(20px)',
        cursor: 'pointer',
      }}
      onClick={handleNewQuote}
      title="Click for a new quote"
    >
      {/* Decorative quotes */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '28px',
          fontFamily: "'Playfair Display', serif",
          fontSize: '80px',
          lineHeight: 1,
          color: 'rgba(233,30,140,0.12)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        "
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '28px',
          fontFamily: "'Playfair Display', serif",
          fontSize: '80px',
          lineHeight: 1,
          color: 'rgba(179,136,255,0.12)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        "
      </div>

      {/* Corner glow */}
      <div
        style={{
          position: 'absolute',
          top: '-1px',
          left: '-1px',
          right: '-1px',
          bottom: '-1px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(233,30,140,0.15), transparent 50%, rgba(179,136,255,0.1))',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? 'translateY(15px)' : 'translateY(0)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '22px',
            fontStyle: 'italic',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.7,
            marginBottom: '20px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {currentQuote.text}
        </p>
      </div>

      {/* Click hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '20px',
          fontSize: '11px',
          fontFamily: "'Inter', sans-serif",
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.05em',
        }}
      >
        click for another ♥
      </div>
    </div>
  );
}
