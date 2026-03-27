import CountdownTimer from '@/components/CountdownTimer/CountdownTimer';
import LoveQuote from '@/components/LoveQuote/LoveQuote';
import Link from 'next/link';
import { DynamicHeartScene, DynamicBearsScene } from '@/components/HomeClient/HomeClient';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>

      {/* ─── SECTION 1: Hero ─────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 40px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial background glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(233,30,140,0.12) 0%, rgba(179,136,255,0.06) 50%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* 3D Heart */}
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <DynamicHeartScene height="500px" />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginTop: '-20px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '20px',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.2em',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}
          >
            made with all my heart
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(52px, 8vw, 96px)',
              fontWeight: 700,
              lineHeight: 1.05,
              background: 'linear-gradient(135deg, #ffffff 0%, #ff6baa 40%, #b388ff 80%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}
          >
            Amrita
          </h1>
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '26px',
              color: 'rgba(255,255,255,0.6)',
              fontStyle: 'italic',
            }}
          >
            — Siddharth ♥
          </div>
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            animation: 'float 3s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: '11px', fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            scroll down
          </span>
          <span style={{ color: 'rgba(233,30,140,0.6)', fontSize: '18px' }}>↓</span>
        </div>
      </section>

      {/* ─── SECTION 2: Countdown ────────────────────────────────── */}
      <section
        style={{
          padding: '80px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent, rgba(233,30,140,0.04) 50%, transparent)',
            pointerEvents: 'none',
          }}
        />

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
          ✦ something special is coming ✦
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '40px',
            background: 'linear-gradient(135deg, #ffffff, #b388ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          The Surprise Countdown
        </h2>

        <CountdownTimer />

        <Link
          href="/surprise"
          style={{
            marginTop: '40px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            background: 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(179,136,255,0.15))',
            border: '1px solid rgba(233,30,140,0.3)',
            borderRadius: '50px',
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.05em',
            transition: 'all 0.3s ease',
          }}
        >
          🎁 Peek at the surprise page
        </Link>
      </section>

      {/* ─── SECTION 3: Love Quote ───────────────────────────────── */}
      <section
        style={{
          padding: '80px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
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
          ✦ words that feel true ✦
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '40px',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          A Love Note
        </h2>

        <LoveQuote />

        <Link
          href="/love-notes"
          style={{
            marginTop: '32px',
            fontFamily: "'Dancing Script', cursive",
            fontSize: '18px',
            color: 'rgba(233,30,140,0.7)',
            textDecoration: 'none',
          }}
        >
          see all love notes →
        </Link>
      </section>

      {/* ─── SECTION 4: Cuddling Bears ───────────────────────────── */}
      <section
        style={{
          padding: '80px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(179,136,255,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

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
          ✦ us, always ✦
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '8px',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          Siddharth &amp; Amrita
        </h2>
        <p
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '18px',
            color: 'rgba(233,30,140,0.7)',
            marginBottom: '40px',
          }}
        >
          together ♥
        </p>

        <div style={{ width: '100%', maxWidth: '600px' }}>
          <DynamicBearsScene height="420px" />
        </div>

        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            maxWidth: '400px',
            marginTop: '-10px',
            lineHeight: 1.6,
          }}
        >
          "Every moment with you feels like the warmest hug."
        </p>
      </section>

      {/* ─── SECTION 5: Quick Navigation Cards ──────────────────── */}
      <section
        style={{
          padding: '80px 40px',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '16px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          ✦ explore ✦
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '48px',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          This Is For You
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          {[
            {
              href: '/our-moments',
              emoji: '✨',
              title: 'Our Moments',
              description: 'The story of us, told in the moments that matter.',
              color: '#ffd700',
            },
            {
              href: '/love-notes',
              emoji: '💌',
              title: 'Love Notes',
              description: "Words from the world's greatest love stories, all feeling true.",
              color: '#e91e8c',
            },
            {
              href: '/little-things',
              emoji: '🌸',
              title: 'Little Things',
              description: 'The small, specific, wonderful things I love about you.',
              color: '#b388ff',
            },
            {
              href: '/surprise',
              emoji: '🎁',
              title: '12 May Surprise',
              description: 'Something special, waiting just for you. Almost time.',
              color: '#ff6baa',
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              style={{
                display: 'block',
                padding: '28px 24px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${card.color}30`,
                borderRadius: '20px',
                textDecoration: 'none',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`,
                }}
              />
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>{card.emoji}</div>
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '8px',
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.5,
                }}
              >
                {card.description}
              </div>
              <div
                style={{
                  marginTop: '16px',
                  fontFamily: "'Dancing Script', cursive",
                  fontSize: '14px',
                  color: card.color,
                  opacity: 0.8,
                }}
              >
                Explore →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '60px 40px',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          marginTop: '40px',
        }}
      >
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px',
            animation: 'heart-beat 2.5s ease-in-out infinite',
          }}
        >
          ♥
        </div>
        <p
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '18px',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Made with all my love, just for you — Siddharth
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.15)',
            marginTop: '8px',
            letterSpacing: '0.1em',
          }}
        >
          See you on 12 May 2026 ✨
        </p>
      </footer>
    </div>
  );
}
