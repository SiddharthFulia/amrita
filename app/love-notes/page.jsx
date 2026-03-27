import LoveQuote from '@/components/LoveQuote/LoveQuote';
import { LOVE_QUOTES } from '@/constants/content';

export const metadata = {
  title: 'Love Notes 💌 | For Amrita',
};

export default function LoveNotesPage() {
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
          ✦ words of love ✦
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
          Love Notes
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
          Words from the world's greatest love stories — all of them feel true when I think of you.
        </p>
      </div>

      {/* ── Siddharth's special golden quote ── */}
      <div style={{ maxWidth: '680px', margin: '0 auto 64px' }}>
        <div
          style={{
            position: 'relative',
            padding: '44px 48px',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.07) 0%, rgba(255,193,7,0.04) 100%)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '24px',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Gold top line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '15%',
              right: '15%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #ffd700, #fff9c4, #ffd700, transparent)',
            }}
          />

          {/* Corner sparkles */}
          <div style={{ position: 'absolute', top: '16px', left: '20px', fontSize: '14px', opacity: 0.5 }}>✦</div>
          <div style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '14px', opacity: 0.5 }}>✦</div>
          <div style={{ position: 'absolute', bottom: '16px', left: '20px', fontSize: '10px', opacity: 0.3 }}>✦</div>
          <div style={{ position: 'absolute', bottom: '16px', right: '20px', fontSize: '10px', opacity: 0.3 }}>✦</div>

          {/* Label */}
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,215,0,0.5)',
              marginBottom: '20px',
            }}
          >
            ✦ why I love you ✦
          </div>

          {/* Setup line */}
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '15px',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}
          >
            Most people love for a reason — and that's exactly the problem.
          </p>

          {/* Big decorative quote mark */}
          <div
            style={{
              position: 'absolute',
              top: '24px',
              left: '28px',
              fontFamily: "'Playfair Display', serif",
              fontSize: '72px',
              lineHeight: 1,
              color: 'rgba(255,215,0,0.08)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            "
          </div>

          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              fontWeight: 500,
              lineHeight: 1.65,
              background: 'linear-gradient(135deg, #ffd700 0%, #fff9c4 50%, #ffd700 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              position: 'relative',
              zIndex: 1,
              margin: 0,
            }}
          >
            "If you love someone for a reason, the love dies when the reason does."
          </p>

          <div
            style={{
              marginTop: '20px',
              fontFamily: "'Dancing Script', cursive",
              fontSize: '16px',
              color: 'rgba(255,215,0,0.55)',
            }}
          >
            — Siddharth
          </div>

          {/* Gold bottom line */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '15%',
              right: '15%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)',
            }}
          />
        </div>
      </div>

      {/* Featured rotating quote */}
      <div style={{ maxWidth: '760px', margin: '0 auto 80px' }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(233,30,140,0.6)',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          Today's Quote — click to change
        </div>
        <LoveQuote />
      </div>

      {/* All quotes grid */}
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '16px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          ✦ all the love notes ✦
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {LOVE_QUOTES.map((quote, index) => (
            <div
              key={index}
              style={{
                padding: '28px 24px',
                background: index % 3 === 0
                  ? 'rgba(233,30,140,0.05)'
                  : index % 3 === 1
                  ? 'rgba(179,136,255,0.05)'
                  : 'rgba(255,215,0,0.04)',
                border: index % 3 === 0
                  ? '1px solid rgba(233,30,140,0.12)'
                  : index % 3 === 1
                  ? '1px solid rgba(179,136,255,0.12)'
                  : '1px solid rgba(255,215,0,0.1)',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative quote mark */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '16px',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '48px',
                  lineHeight: 1,
                  color: index % 3 === 0
                    ? 'rgba(233,30,140,0.1)'
                    : index % 3 === 1
                    ? 'rgba(179,136,255,0.1)'
                    : 'rgba(255,215,0,0.1)',
                  userSelect: 'none',
                }}
              >
                "
              </div>

              <p
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.7,
                  marginBottom: '16px',
                  marginTop: '8px',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {quote.text}
              </p>

            </div>
          ))}
        </div>
      </div>

      {/* Personal note */}
      <div
        style={{
          maxWidth: '600px',
          margin: '80px auto 0',
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(233,30,140,0.06)',
          border: '1px solid rgba(233,30,140,0.15)',
          borderRadius: '24px',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            marginBottom: '16px',
            animation: 'heart-beat 2s ease-in-out infinite',
          }}
        >
          ♥
        </div>
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
          "All of these beautiful words, Amrita — they all feel true when I think of you.
          But none of them quite capture it, because what I feel for you is something
          the best poets haven't found the words for yet."
        </p>
        <div
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: '20px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          — Siddharth ♥
        </div>
      </div>
    </div>
  );
}
