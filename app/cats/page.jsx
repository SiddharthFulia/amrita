'use client';

import { useState, useEffect, useCallback } from 'react';

function isVideo(url, mimeType) {
  return mimeType === 'video/mp4' || url?.endsWith('.mp4');
}
function isGif(url, mimeType) {
  return mimeType === 'image/gif' || url?.endsWith('.gif');
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ cats, index, onClose, onPrev, onNext, onDownload, onSave, downloading, saving, saved }) {
  const cat = cats[index];
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onPrev, onNext]);

  const video = isVideo(cat.url, cat.mimeType);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{
          position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '46px', height: '46px', color: '#fff',
          fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}

      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '90vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {video ? (
          <video
            src={cat.url}
            autoPlay loop playsInline
            style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: '14px', objectFit: 'contain' }}
          />
        ) : (
          <img
            src={cat.url}
            alt="cat"
            style={{ maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: '14px', display: 'block' }}
          />
        )}

        {/* Badge */}
        {(video || isGif(cat.url, cat.mimeType)) && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            background: video ? 'rgba(233,30,140,0.75)' : 'rgba(179,136,255,0.75)',
            borderRadius: '8px', padding: '3px 10px',
            fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em',
          }}>{video ? '▶ VIDEO' : 'GIF'}</div>
        )}

        {/* Bottom actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={() => onDownload(cat)}
            title="Download"
            style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '50px', padding: '8px 20px', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: downloading === cat.id ? 'wait' : 'pointer',
              fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >{downloading === cat.id ? '⏳ Downloading...' : '↓ Download'}</button>

          {!video && (
            <button
              onClick={() => onSave(cat)}
              title={saved.has(cat.id) ? 'Saved!' : 'Save to Drive'}
              style={{
                background: saved.has(cat.id) ? 'rgba(233,30,140,0.65)' : 'rgba(255,255,255,0.12)',
                border: `1px solid ${saved.has(cat.id) ? 'rgba(233,30,140,0.5)' : 'rgba(255,255,255,0.25)'}`,
                borderRadius: '50px', padding: '8px 20px', color: '#fff',
                fontSize: '13px', fontWeight: 600,
                cursor: saving === cat.id ? 'wait' : saved.has(cat.id) ? 'default' : 'pointer',
                fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >{saving === cat.id ? '⏳ Saving...' : saved.has(cat.id) ? '♥ Saved' : '☁ Save'}</button>
          )}
        </div>

        {/* Counter */}
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
          {index + 1} / {cats.length}
        </div>
      </div>

      {index < cats.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNext(); }} style={{
          position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '46px', height: '46px', color: '#fff',
          fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      )}

      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: '14px', right: '14px',
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '50%', width: '38px', height: '38px', color: '#fff',
        fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>×</button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CatsPage() {
  const [cats, setCats] = useState([]);
  const [fact, setFact] = useState('');
  const [funFacts, setFunFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [factLoading, setFactLoading] = useState(false);
  const [funFactsLoading, setFunFactsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(new Set());
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchCats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // include gif and mp4 to get more variety
      const res = await fetch('https://api.thecatapi.com/v1/images/search?limit=10&mime_types=jpg,png,gif,mp4');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCats(data.map((c) => ({ id: c.id, url: c.url, mimeType: c.mime_type || '' })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFact = useCallback(async () => {
    setFactLoading(true);
    try {
      const res = await fetch('https://catfact.ninja/fact');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFact(data.fact);
    } catch {
      setFact("Cats always land in your heart, no matter what. ♥");
    } finally {
      setFactLoading(false);
    }
  }, []);

  const fetchFunFacts = useCallback(async () => {
    setFunFactsLoading(true);
    try {
      const results = await Promise.all([
        fetch('https://catfact.ninja/fact').then(r => r.json()),
        fetch('https://catfact.ninja/fact').then(r => r.json()),
        fetch('https://catfact.ninja/fact').then(r => r.json()),
      ]);
      setFunFacts(results.map(r => r.fact));
    } catch {
      setFunFacts([
        'Cats sleep 12–16 hours a day (goals, honestly)',
        "A cat's purr vibrates at 25–50 Hz, which is said to help heal bones",
        'Cats can make over 100 different sounds — dogs only about 10',
      ]);
    } finally {
      setFunFactsLoading(false);
    }
  }, []);

  const saveCatToDrive = useCallback(async (cat) => {
    if (saved.has(cat.id) || saving === cat.id) return;
    setSaving(cat.id);
    try {
      const ext = isGif(cat.url, cat.mimeType) ? 'gif' : 'jpg';
      const res = await fetch('/api/cat-saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cat.url, name: `cat-${cat.id}.${ext}` }),
      });
      const data = await res.json();
      if (!data.error) setSaved(prev => new Set([...prev, cat.id]));
    } catch (_) {}
    setSaving(null);
  }, [saved, saving]);

  const downloadCat = useCallback(async (cat) => {
    setDownloading(cat.id);
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(cat.url)}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const ext = isVideo(cat.url, cat.mimeType) ? 'mp4' : isGif(cat.url, cat.mimeType) ? 'gif' : 'jpg';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cute-cat-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(cat.url, '_blank');
    } finally {
      setDownloading(null);
    }
  }, []);

  useEffect(() => {
    fetchCats();
    fetchFact();
    fetchFunFacts();
  }, [fetchCats, fetchFact, fetchFunFacts]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        color: 'rgba(255,255,255,0.88)',
        fontFamily: "'Inter', sans-serif",
        padding: '40px 24px 80px',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .cat-card { transition: transform 0.2s ease; }
        .cat-card:hover { transform: scale(1.02); }
        .cat-card:hover .cat-overlay { opacity: 1 !important; }
        .cat-card .cat-overlay { opacity: 0; transition: opacity 0.2s ease; }
        .cat-card:hover .cat-type-badge { opacity: 1; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '8px' }}>
          🐱 Cats
        </h1>
        <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(1rem, 3vw, 1.3rem)', color: '#b388ff' }}>
          for the one who loves them ♥
        </p>
      </div>

      {/* Fact card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px 24px',
        marginBottom: '32px', boxShadow: '0 0 0 1.5px rgba(179,136,255,0.4), 0 4px 24px rgba(233,30,140,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>💭</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: '0 0 14px', fontStyle: 'italic' }}>
              {factLoading ? 'Fetching cat wisdom...' : fact || 'Loading...'}
            </p>
            <button onClick={fetchFact} disabled={factLoading} style={{
              padding: '8px 20px', background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              color: '#fff', border: 'none', borderRadius: '20px', fontSize: '0.85rem',
              fontWeight: 600, cursor: factLoading ? 'default' : 'pointer', opacity: factLoading ? 0.6 : 1,
              fontFamily: "'Inter', sans-serif",
            }}>New Fact 🐾</button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>
          <p>Couldn't reach the cats... try again? 🙀</p>
          <button onClick={fetchCats} style={{
            marginTop: '16px', padding: '10px 24px', background: '#e91e8c',
            color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 600,
          }}>Try Again</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div style={{ columns: '3 200px', columnGap: '12px' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              breakInside: 'avoid', marginBottom: '12px',
              height: `${140 + (i % 3) * 60}px`, borderRadius: '12px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
              backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear',
            }} />
          ))}
        </div>
      )}

      {/* Cat grid */}
      {!loading && !error && (
        <div style={{ columns: '3 200px', columnGap: '12px' }}>
          {cats.map((cat, i) => {
            const vid = isVideo(cat.url, cat.mimeType);
            const gif = isGif(cat.url, cat.mimeType);
            return (
              <div
                key={cat.id}
                className="cat-card"
                style={{ breakInside: 'avoid', marginBottom: '12px', position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setLightboxIndex(i)}
              >
                {vid ? (
                  <video
                    src={cat.url}
                    autoPlay loop muted playsInline
                    style={{ width: '100%', display: 'block', borderRadius: '12px' }}
                  />
                ) : (
                  <img
                    src={cat.url}
                    alt="cute cat"
                    style={{ width: '100%', display: 'block', objectFit: 'cover', borderRadius: '12px' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}

                {/* Type badge */}
                {(vid || gif) && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: vid ? 'rgba(233,30,140,0.8)' : 'rgba(179,136,255,0.8)',
                    borderRadius: '6px', padding: '2px 8px',
                    fontSize: '10px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em',
                    pointerEvents: 'none',
                  }}>{vid ? '▶' : 'GIF'}</div>
                )}

                {/* Hover overlay */}
                <div
                  className="cat-overlay"
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.72))',
                    borderRadius: '12px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', justifyContent: 'flex-end',
                    padding: '8px', gap: '6px',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Expand hint at top center */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', color: '#fff', pointerEvents: 'none',
                  }}>⛶</div>

                  {/* Action buttons bottom-right */}
                  <button
                    onClick={e => { e.stopPropagation(); downloadCat(cat); }}
                    title="Download"
                    style={{
                      background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '50%', width: '32px', height: '32px', color: '#fff',
                      fontSize: '14px', cursor: downloading === cat.id ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >{downloading === cat.id ? '⏳' : '↓'}</button>

                  {!vid && (
                    <button
                      onClick={e => { e.stopPropagation(); saveCatToDrive(cat); }}
                      title={saved.has(cat.id) ? 'Saved!' : 'Save to Drive'}
                      style={{
                        background: saved.has(cat.id) ? 'rgba(233,30,140,0.75)' : 'rgba(0,0,0,0.55)',
                        border: `1px solid ${saved.has(cat.id) ? 'rgba(233,30,140,0.6)' : 'rgba(255,255,255,0.3)'}`,
                        borderRadius: '50%', width: '32px', height: '32px', color: '#fff',
                        fontSize: '14px', cursor: saving === cat.id ? 'wait' : saved.has(cat.id) ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{saving === cat.id ? '⏳' : saved.has(cat.id) ? '♥' : '☁'}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {!loading && !error && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button onClick={fetchCats} style={{
            padding: '14px 36px', background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff', border: 'none', borderRadius: '50px', fontSize: '1rem',
            fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            boxShadow: '0 4px 20px rgba(233,30,140,0.3)',
          }}>Meow for More 🐾</button>
        </div>
      )}

      {/* Tinkerbell */}
      <div style={{
        marginTop: '56px',
        background: 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(179,136,255,0.08))',
        border: '1px solid rgba(233,30,140,0.25)', borderRadius: '20px', padding: '28px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐈</div>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700,
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          margin: '0 0 12px',
        }}>Tinkerbell ♥</h2>
        <p style={{
          fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
          fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8,
          maxWidth: '480px', margin: '0 auto',
        }}>
          The original love of your life — there since the very beginning.
          Some bonds don't need words. Tinkerbell knew you before anyone else did,
          and loved you the same way: completely, quietly, always.
        </p>
        <div style={{ marginTop: '16px', fontFamily: "'Dancing Script', cursive", fontSize: '16px', color: 'rgba(233,30,140,0.7)' }}>
          — From Siddharth, who only loves Amrita and Tinkerbell 🐾
        </div>
      </div>

      {/* Did you know */}
      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 600, color: '#b388ff', margin: 0 }}>Did you know?</h2>
          <button onClick={fetchFunFacts} disabled={funFactsLoading} style={{
            padding: '6px 16px', borderRadius: '16px', fontSize: '12px',
            background: 'rgba(179,136,255,0.1)', border: '1px solid rgba(179,136,255,0.3)',
            color: 'rgba(255,255,255,0.6)', cursor: funFactsLoading ? 'default' : 'pointer',
            fontFamily: "'Inter', sans-serif", opacity: funFactsLoading ? 0.5 : 1,
          }}>{funFactsLoading ? 'Loading...' : '↻ New facts'}</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {funFactsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                  height: '52px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)',
                  animation: 'shimmer 1.5s infinite linear', backgroundSize: '800px 100%',
                }} />
              ))
            : funFacts.map((f, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(179,136,255,0.2)',
                  borderRadius: '12px', padding: '14px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
                }}>
                  <span style={{ color: '#e91e8c', flexShrink: 0 }}>🐾</span>
                  {f}
                </div>
              ))
          }
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          cats={cats}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex(i => Math.min(cats.length - 1, i + 1))}
          onDownload={downloadCat}
          onSave={saveCatToDrive}
          downloading={downloading}
          saving={saving}
          saved={saved}
        />
      )}
    </div>
  );
}
