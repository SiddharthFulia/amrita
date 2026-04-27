'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { generateAIImage } from '@/utils/apis';

const QUICK_PROMPTS = [
  'Cute cat with flowers',
  'Sunset over ocean',
  'Enchanted forest at night',
  'Couple dancing under stars',
  'Cherry blossom garden',
  'Magical aurora borealis',
  'Cozy rainy cafe window',
  'Dreamy floating lanterns',
  'Watercolor butterfly garden',
  'Crystal cave with glowing gems',
];

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [viewingHistoryImg, setViewingHistoryImg] = useState(null);
  const scrollRef = useRef(null);

  const handleGenerate = useCallback(async (overridePrompt) => {
    const p = overridePrompt || prompt;
    if (!p.trim()) return;
    setLoading(true);
    setError('');
    setImage(null);
    try {
      const res = await generateAIImage(p.trim(), 'flux');
      const data = res?.data || res;
      if (data?.image) {
        const imgSrc = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
        setImage(imgSrc);
        setHistory(prev => {
          const next = [{ src: imgSrc, prompt: p.trim(), id: Date.now() }, ...prev];
          return next.slice(0, 10);
        });
      } else if (data?.url) {
        setImage(data.url);
        setHistory(prev => {
          const next = [{ src: data.url, prompt: p.trim(), id: Date.now() }, ...prev];
          return next.slice(0, 10);
        });
      } else {
        setError('Model is loading, please try again in 30s');
      }
    } catch (err) {
      console.error(err);
      setError('Model is loading, please try again in 30s');
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const handleDownload = useCallback(() => {
    const src = viewingHistoryImg || image;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `ai-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [image, viewingHistoryImg]);

  const displayImage = viewingHistoryImg || image;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 16px 60px',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '-120px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(233,30,140,0.12) 0%, rgba(179,136,255,0.08) 40%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Back button */}
      <div style={{ width: '100%', maxWidth: '560px', paddingTop: '16px', position: 'relative', zIndex: 1 }}>
        <Link href="/" style={{
          color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px',
          fontFamily: "'Inter', sans-serif", display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          ← Back
        </Link>
      </div>

      {/* Header */}
      <h1 style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: '2.4rem',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '20px 0 8px',
        position: 'relative',
        zIndex: 1,
      }}>
        ✨ AI Image Gen ✨
      </h1>
      <p style={{
        color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 28px',
        position: 'relative', zIndex: 1,
      }}>
        Describe anything and watch it come to life
      </p>

      {/* Prompt textarea */}
      <div style={{ width: '100%', maxWidth: '560px', position: 'relative', zIndex: 1 }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the image you want to create..."
          rows={4}
          style={{
            width: '100%',
            padding: '16px 18px',
            fontSize: '15px',
            fontFamily: "'Inter', sans-serif",
            color: '#fff',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.5,
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(233,30,140,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />
      </div>

      {/* Quick prompts */}
      <div style={{
        width: '100%', maxWidth: '560px', marginTop: '14px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px',
          textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
        }}>
          Quick prompts
        </div>
        <div ref={scrollRef} style={{
          display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => { setPrompt(qp); setViewingHistoryImg(null); handleGenerate(qp); }}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(233,30,140,0.15)';
                e.target.style.borderColor = 'rgba(233,30,140,0.3)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'rgba(255,255,255,0.06)';
                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                e.target.style.color = 'rgba(255,255,255,0.7)';
              }}
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={() => { setViewingHistoryImg(null); handleGenerate(); }}
        disabled={loading || !prompt.trim()}
        style={{
          marginTop: '22px',
          padding: '14px 48px',
          fontSize: '16px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          color: '#fff',
          background: loading || !prompt.trim()
            ? 'rgba(255,255,255,0.08)'
            : 'linear-gradient(135deg, #e91e8c, #b388ff)',
          border: 'none',
          borderRadius: '50px',
          cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
          position: 'relative',
          zIndex: 1,
          letterSpacing: '0.02em',
          transition: 'transform 0.15s, box-shadow 0.2s',
          boxShadow: loading || !prompt.trim() ? 'none' : '0 4px 24px rgba(233,30,140,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        onMouseEnter={e => {
          if (!loading && prompt.trim()) {
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.boxShadow = '0 6px 32px rgba(233,30,140,0.45)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = loading || !prompt.trim() ? 'none' : '0 4px 24px rgba(233,30,140,0.3)';
        }}
      >
        {loading && (
          <span style={{
            display: 'inline-block', width: '18px', height: '18px',
            border: '2.5px solid rgba(255,255,255,0.25)',
            borderTopColor: '#fff', borderRadius: '50%',
            animation: 'imagegen-spin 0.7s linear infinite',
          }} />
        )}
        {loading ? 'Generating...' : 'Generate Image'}
      </button>

      {/* Loading placeholder */}
      {loading && (
        <div style={{
          width: '100%', maxWidth: '512px', marginTop: '28px',
          aspectRatio: '1 / 1', borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(179,136,255,0.08))',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '14px',
          animation: 'imagegen-pulse 2s ease-in-out infinite',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{
            width: '48px', height: '48px',
            border: '3px solid rgba(233,30,140,0.2)',
            borderTopColor: '#e91e8c', borderRadius: '50%',
            animation: 'imagegen-spin 1s linear infinite',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            This may take 10-30 seconds...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{
          marginTop: '28px', padding: '20px 28px',
          background: 'rgba(233,30,140,0.08)',
          border: '1px solid rgba(233,30,140,0.2)',
          borderRadius: '16px',
          textAlign: 'center',
          maxWidth: '512px', width: '100%',
          position: 'relative', zIndex: 1,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 14px' }}>
            {error}
          </p>
          <button
            onClick={() => { setError(''); handleGenerate(); }}
            style={{
              padding: '10px 28px',
              fontSize: '13px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Generated image display */}
      {displayImage && !loading && (
        <div style={{
          marginTop: '28px', width: '100%', maxWidth: '512px',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '12px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}>
            <img
              src={displayImage}
              alt="AI generated"
              style={{
                width: '100%',
                borderRadius: '14px',
                display: 'block',
              }}
            />
          </div>

          {/* Download + Regenerate buttons */}
          <div style={{
            display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px',
          }}>
            <button
              onClick={handleDownload}
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '50px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
            >
              ⬇ Download
            </button>
            <button
              onClick={() => { setViewingHistoryImg(null); handleGenerate(); }}
              disabled={loading}
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}

      {/* History strip */}
      {history.length > 0 && (
        <div style={{
          width: '100%', maxWidth: '560px', marginTop: '36px',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
          }}>
            Recent generations
          </div>
          <div style={{
            display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}>
            {history.map(item => (
              <div
                key={item.id}
                onClick={() => setViewingHistoryImg(item.src)}
                style={{
                  flexShrink: 0,
                  width: '80px', height: '80px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: viewingHistoryImg === item.src
                    ? '2px solid #e91e8c'
                    : '2px solid rgba(255,255,255,0.08)',
                  transition: 'border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                title={item.prompt}
              >
                <img
                  src={item.src}
                  alt={item.prompt}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes imagegen-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes imagegen-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        textarea::placeholder {
          color: rgba(255,255,255,0.3);
        }
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
