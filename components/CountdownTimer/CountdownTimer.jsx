"use client";

import { useEffect, useState } from 'react';
import { SURPRISE_DATE as DEFAULT_SURPRISE_DATE } from '@/constants/content';

function calculateTimeRemaining(targetDate) {
  const now = new Date();
  const difference = (targetDate || DEFAULT_SURPRISE_DATE) - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

function TimeUnit({ value, label }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '70px' }}>
      <div
        style={{
          position: 'relative',
          background: 'rgba(233, 30, 140, 0.08)',
          border: '1px solid rgba(233, 30, 140, 0.25)',
          borderRadius: '12px',
          padding: '12px 8px 10px',
          marginBottom: '6px',
          overflow: 'hidden',
        }}
      >
        {/* Shimmer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
            backgroundSize: '200% auto',
            animation: 'shimmer 3s linear infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '36px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #e91e8c, #ff6baa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            display: 'block',
          }}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '11px',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer() {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeRemaining(calculateTimeRemaining());

    const intervalId = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // kept for potential prop-based override in future

  if (!mounted) {
    return (
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {['Days', 'Hours', 'Mins', 'Secs'].map((label) => (
          <TimeUnit key={label} value={0} label={label} />
        ))}
      </div>
    );
  }

  if (timeRemaining.expired) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🎉 Today is the day! 🎉
        </div>
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '18px',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '8px',
          }}
        >
          Happy 12th May, Amrita ♥
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: '15px',
          color: 'rgba(255,255,255,0.45)',
          textAlign: 'center',
          marginBottom: '16px',
          letterSpacing: '0.05em',
        }}
      >
        until the big surprise, 12 May 2026 ✨
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <TimeUnit value={timeRemaining.days} label="Days" />
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '32px',
            color: 'rgba(233,30,140,0.5)',
            alignSelf: 'flex-start',
            paddingTop: '14px',
          }}
        >
          :
        </div>
        <TimeUnit value={timeRemaining.hours} label="Hours" />
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '32px',
            color: 'rgba(233,30,140,0.5)',
            alignSelf: 'flex-start',
            paddingTop: '14px',
          }}
        >
          :
        </div>
        <TimeUnit value={timeRemaining.minutes} label="Mins" />
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '32px',
            color: 'rgba(233,30,140,0.5)',
            alignSelf: 'flex-start',
            paddingTop: '14px',
          }}
        >
          :
        </div>
        <TimeUnit value={timeRemaining.seconds} label="Secs" />
      </div>
    </div>
  );
}
