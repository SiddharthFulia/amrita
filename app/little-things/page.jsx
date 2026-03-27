"use client";

import { useState, useEffect } from 'react';
import { LITTLE_THINGS } from '@/constants/content';

function LittleThingCard({ item, index }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 120);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '20px 24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-30px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: 'linear-gradient(180deg, #e91e8c, #b388ff)',
          opacity: 0.6,
        }}
      />

      <span style={{ fontSize: '28px', flexShrink: 0 }}>{item.emoji}</span>

      <p
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: 'italic',
          fontSize: '17px',
          color: 'rgba(255,255,255,0.82)',
          lineHeight: 1.5,
          flex: 1,
        }}
      >
        {item.text}
      </p>

      <span
        style={{
          color: 'rgba(233,30,140,0.4)',
          fontSize: '16px',
          flexShrink: 0,
          animation: 'heart-beat 2s ease-in-out infinite',
          animationDelay: `${index * 0.2}s`,
        }}
      >
        ♥
      </span>
    </div>
  );
}

export default function LittleThingsPage() {
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
          ✦ the small, specific things ✦
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
          Little Things
        </h1>
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.45)',
            maxWidth: '500px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Big love is made of tiny moments. Here are some of mine — the specific, small, wonderfully
          <em> you</em> things I love.
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {LITTLE_THINGS.map((item, index) => (
          <LittleThingCard key={index} item={item} index={index} />
        ))}
      </div>

      {/* Bottom note */}
      <div
        style={{
          maxWidth: '600px',
          margin: '60px auto 0',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            padding: '36px 40px',
            background: 'rgba(179,136,255,0.06)',
            border: '1px solid rgba(179,136,255,0.15)',
            borderRadius: '24px',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '16px' }}>🌸</div>
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '18px',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.7,
              marginBottom: '16px',
            }}
          >
            "This list could go on forever. There are a thousand little things about you
            that I notice and love — and every day I find new ones.
            That's what makes loving you such an adventure."
          </p>
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '20px',
              background: 'linear-gradient(135deg, #b388ff, #e91e8c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            — Siddharth ♥
          </div>
        </div>
      </div>
    </div>
  );
}
