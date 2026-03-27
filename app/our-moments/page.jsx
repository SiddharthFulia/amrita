import { TIMELINE_EVENTS } from '@/constants/content';

export const metadata = {
  title: 'Our Moments ✨ | For Amrita',
};

function TimelineCard({ event, index }) {
  const isLeft = index % 2 === 0;
  const isLocked = event.isLocked;

  return (
    <div
      className={isLeft ? 'timeline-card-left' : 'timeline-card-right'}
      style={{
        display: 'flex',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        alignItems: 'center',
        gap: '0',
        marginBottom: '0',
        position: 'relative',
      }}
    >
      {/* Card side */}
      <div
        style={{
          flex: 1,
          padding: isLeft ? '0 40px 0 0' : '0 0 0 40px',
          display: 'flex',
          justifyContent: isLeft ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          style={{
            maxWidth: '340px',
            padding: '28px 28px',
            background: isLocked
              ? 'rgba(179,136,255,0.06)'
              : 'rgba(255,255,255,0.04)',
            border: isLocked
              ? '1px solid rgba(179,136,255,0.2)'
              : '1px solid rgba(233,30,140,0.12)',
            borderRadius: '20px',
            backdropFilter: 'blur(16px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '2px',
              background: isLocked
                ? 'linear-gradient(90deg, transparent, rgba(179,136,255,0.5), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(233,30,140,0.5), transparent)',
            }}
          />

          <div style={{ fontSize: '32px', marginBottom: '12px' }}>
            {isLocked ? '🔒' : event.icon}
          </div>

          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: isLocked ? 'rgba(179,136,255,0.6)' : 'rgba(233,30,140,0.7)',
              marginBottom: '8px',
            }}
          >
            {event.date}
          </div>

          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '20px',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '12px',
              lineHeight: 1.3,
            }}
          >
            {event.title}
          </div>

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              color: isLocked ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)',
              lineHeight: 1.7,
              fontStyle: isLocked ? 'italic' : 'normal',
            }}
          >
            {event.description}
          </p>
        </div>
      </div>

      {/* Center dot & line */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: isLocked
              ? 'linear-gradient(135deg, rgba(179,136,255,0.2), rgba(179,136,255,0.05))'
              : 'linear-gradient(135deg, rgba(233,30,140,0.25), rgba(233,30,140,0.05))',
            border: isLocked
              ? '2px solid rgba(179,136,255,0.4)'
              : '2px solid rgba(233,30,140,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: isLocked
              ? '0 0 20px rgba(179,136,255,0.2)'
              : '0 0 20px rgba(233,30,140,0.2)',
          }}
        >
          {isLocked ? '✨' : event.icon}
        </div>
      </div>

      {/* Empty right/left side */}
      <div style={{ flex: 1 }} />
    </div>
  );
}

export default function OurMomentsPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '60px 40px 80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '80px' }}>
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
          ✦ our journey ✦
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
          Our Moments
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
          Every great love story is a collection of small, beautiful moments.
          Here are ours.
        </p>
      </div>

      {/* Timeline */}
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Vertical center line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(233,30,140,0.3) 10%, rgba(233,30,140,0.3) 85%, rgba(179,136,255,0.3) 95%, transparent 100%)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {TIMELINE_EVENTS.map((event, index) => (
            <TimelineCard key={event.id} event={event} index={index} />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', marginTop: '80px' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '24px 40px',
            background: 'rgba(233,30,140,0.06)',
            border: '1px solid rgba(233,30,140,0.2)',
            borderRadius: '20px',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '26px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '6px',
            }}
          >
            And so many more to come...
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            This story is still being written ♥
          </p>
        </div>
      </div>
    </div>
  );
}
