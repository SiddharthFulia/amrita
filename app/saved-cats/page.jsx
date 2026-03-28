'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function Lightbox({ cats, index, onClose, onPrev, onNext, onDownload, downloading }) {
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

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{
          position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '44px', height: '44px', color: '#fff',
          fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '90vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <img src={cat.fullUrl} alt={cat.name} style={{ maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: '12px', display: 'block' }} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => onDownload(cat)} style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '50px', padding: '7px 18px', color: '#fff',
            fontSize: '13px', fontWeight: 600, cursor: downloading === cat.id ? 'wait' : 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>{downloading === cat.id ? '⏳' : '↓ Download'}</button>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
            {index + 1} / {cats.length}
            {cat.createdTime ? ` · ${new Date(cat.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </span>
        </div>
      </div>
      {index < cats.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNext(); }} style={{
          position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '44px', height: '44px', color: '#fff',
          fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      )}
      <button onClick={onClose} style={{
        position: 'absolute', top: '14px', right: '14px',
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '50%', width: '36px', height: '36px', color: '#fff',
        fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>×</button>
    </div>
  );
}

function ConfirmDialog({ count, label = 'cat', onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(220,53,69,0.4)',
        borderRadius: '20px', padding: '36px 32px', maxWidth: '360px', width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🗑️</div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#fff', margin: '0 0 10px' }}>
          Remove {count} {label}{count !== 1 ? 's' : ''}?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: '0 0 28px' }}>
          {count} {label}{count !== 1 ? 's' : ''} will be removed from your saved collection.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '11px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontFamily: "'Inter', sans-serif", cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '11px', borderRadius: '10px',
            background: 'rgba(220,53,69,0.85)', border: 'none',
            color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif", fontWeight: 600, cursor: 'pointer',
          }}>Yes, remove</button>
        </div>
      </div>
    </div>
  );
}

export default function SavedCatsPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloading, setDownloading] = useState(null);

  // multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  // confirm dialog
  const [confirmTarget, setConfirmTarget] = useState(null); // { ids: [], label: '' }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cat-saves', { cache: 'no-store' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCats(data.cats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const doDelete = async (ids) => {
    setDeleting(true);
    setConfirmTarget(null);
    try {
      const res = await fetch('/api/cat-saves', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: ids }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const idSet = new Set(ids);
      setCats(prev => prev.filter(c => !idSet.has(c.id)));
      setSelected(new Set());
      setSelectMode(false);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = () => {
    if (!selected.size) return;
    setConfirmTarget({ ids: [...selected], count: selected.size });
  };

  const deleteSingle = (cat) => {
    setConfirmTarget({ ids: [cat.id], count: 1 });
  };

  const downloadCat = async (cat) => {
    setDownloading(cat.id);
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(cat.fullUrl)}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = cat.name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(cat.fullUrl, '_blank');
    }
    setDownloading(null);
  };

  const handleCardClick = (cat, i) => {
    if (selectMode) { toggleSelect(cat.id); return; }
    setLightboxIndex(i);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '960px', margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .scat-card img { transition: transform 0.2s ease; }
        .scat-card:hover img { transform: scale(1.03); }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🐾</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 700,
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          margin: '0 0 8px',
        }}>Amrita's Saved Cats</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontSize: '14px', margin: '0 0 16px' }}>
          {cats.length > 0 ? `${cats.length} cat${cats.length !== 1 ? 's' : ''} saved ♥` : 'Your collection lives here'}
        </p>
        <Link href="/cats" style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: '20px',
          background: 'rgba(233,30,140,0.1)', border: '1px solid rgba(233,30,140,0.3)',
          color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontFamily: "'Inter', sans-serif",
          textDecoration: 'none',
        }}>🐱 Find more cats</Link>
      </div>

      {/* Toolbar */}
      {!loading && cats.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSelectMode(s => !s); setSelected(new Set()); }}
            style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              background: selectMode ? 'rgba(233,30,140,0.2)' : 'rgba(255,255,255,0.06)',
              border: selectMode ? '1px solid rgba(233,30,140,0.5)' : '1px solid rgba(255,255,255,0.15)',
              color: selectMode ? '#e91e8c' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >{selectMode ? '✕ Cancel' : '☑ Select'}</button>

          {selectMode && (
            <>
              <button
                onClick={() => setSelected(new Set(cats.map(c => c.id)))}
                style={{
                  padding: '7px 16px', borderRadius: '20px', fontSize: '13px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >Select All</button>

              {selected.size > 0 && (
                <button
                  onClick={deleteSelected}
                  disabled={deleting}
                  style={{
                    padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                    background: 'rgba(220,53,69,0.75)', border: '1px solid rgba(220,53,69,0.5)',
                    color: '#fff', cursor: deleting ? 'wait' : 'pointer', fontFamily: "'Inter', sans-serif",
                  }}
                >{deleting ? '⏳ Deleting...' : `🗑 Delete ${selected.size}`}</button>
              )}

              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
                {selected.size} selected
              </span>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', color: 'rgba(255,100,100,0.7)', fontFamily: "'Inter', sans-serif", padding: '20px' }}>
          {error} — <button onClick={load} style={{ background: 'none', border: 'none', color: '#e91e8c', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>retry</button>
        </div>
      )}

      {loading && (
        <div style={{ columns: '3 160px', columnGap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              breakInside: 'avoid', marginBottom: '12px', borderRadius: '12px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
              paddingBottom: `${60 + (i % 3) * 25}%`,
              backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear',
            }} />
          ))}
        </div>
      )}

      {!loading && cats.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🐱</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}>
            No saved cats yet — go find some you love!
          </p>
          <Link href="/cats" style={{
            display: 'inline-block', marginTop: '16px', padding: '12px 28px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff', fontFamily: "'Inter', sans-serif", fontWeight: 600, textDecoration: 'none',
          }}>Go to Cats 🐾</Link>
        </div>
      )}

      {!loading && cats.length > 0 && (
        <div style={{ columns: '3 160px', columnGap: '12px' }}>
          {cats.map((cat, i) => {
            const isSelected = selected.has(cat.id);
            return (
              <div
                key={cat.id}
                className="scat-card"
                style={{
                  breakInside: 'avoid', marginBottom: '12px',
                  borderRadius: '12px', overflow: 'hidden', position: 'relative',
                  background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                  outline: isSelected ? '2px solid #e91e8c' : 'none',
                  boxShadow: isSelected ? '0 0 0 2px rgba(233,30,140,0.4)' : 'none',
                }}
                onClick={() => handleCardClick(cat, i)}
              >
                <img src={cat.thumbnailUrl} alt="saved cat" style={{ width: '100%', display: 'block', borderRadius: '12px' }} />

                {/* Select checkmark */}
                {selectMode && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: isSelected ? '#e91e8c' : 'rgba(0,0,0,0.5)',
                    border: isSelected ? '2px solid #e91e8c' : '2px solid rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: '#fff', fontWeight: 700,
                    transition: 'background 0.15s',
                  }}>{isSelected ? '✓' : ''}</div>
                )}

                {/* Action buttons — bottom right, always visible */}
                {!selectMode && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                    padding: '20px 8px 8px', gap: '6px', borderRadius: '0 0 12px 12px',
                  }}>
                    <button
                      onClick={e => { e.stopPropagation(); downloadCat(cat); }}
                      title="Download"
                      style={{
                        background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%',
                        width: '32px', height: '32px', color: '#fff', fontSize: '14px',
                        cursor: downloading === cat.id ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{downloading === cat.id ? '⏳' : '↓'}</button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSingle(cat); }}
                      title="Remove"
                      disabled={deleting}
                      style={{
                        background: 'rgba(220,53,69,0.65)', border: 'none', borderRadius: '50%',
                        width: '32px', height: '32px', color: '#fff', fontSize: '14px',
                        cursor: deleting ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >🗑</button>
                  </div>
                )}

                {/* Date */}
                {cat.createdTime && !selectMode && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.55)', borderRadius: '6px', padding: '2px 7px',
                    color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontFamily: "'Inter', sans-serif",
                  }}>
                    {new Date(cat.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          cats={cats}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex(i => Math.min(cats.length - 1, i + 1))}
          onDownload={downloadCat}
          downloading={downloading}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          count={confirmTarget.count}
          label="cat"
          onConfirm={() => doDelete(confirmTarget.ids)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
