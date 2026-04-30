'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

function Lightbox({ tattoos, index, onClose, onPrev, onNext, onDownload, downloading }) {
  const tattoo = tattoos[index];
  const touchStart = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onPrev, onNext]);

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0) onPrev(); else onNext();
    }
    touchStart.current = null;
  };

  return (
    <div
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
          borderRadius: '50%', width: '44px', height: '44px', color: '#fff',
          fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: '92vw', maxHeight: '90vh', position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      }}>
        <img
          src={tattoo.fullUrl}
          alt={tattoo.name}
          referrerPolicy="no-referrer"
          style={{ maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: '12px', display: 'block' }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => onDownload(tattoo)} style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '50px', padding: '7px 18px', color: '#fff',
            fontSize: '13px', fontWeight: 600, cursor: downloading === tattoo.id ? 'wait' : 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>{downloading === tattoo.id ? '⏳' : '↓ Download'}</button>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
            {index + 1} / {tattoos.length}
            {tattoo.createdTime ? ` · ${new Date(tattoo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </span>
        </div>
      </div>
      {index < tattoos.length - 1 && (
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

function ConfirmDialog({ count, onConfirm, onCancel }) {
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
        <h3 style={{ fontFamily: "'Dancing Script', cursive", fontSize: '22px', color: '#fff', margin: '0 0 10px' }}>
          Are you sure?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: '0 0 28px' }}>
          {count} tattoo{count !== 1 ? 's' : ''} will be removed from your saved collection.
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

export default function SavedTattoosPage() {
  const [tattoos, setTattoos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloading, setDownloading] = useState(null);

  // multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  // confirm dialog
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tattoo-saves', { cache: 'no-store' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTattoos(data.tattoos);
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
      const res = await fetch('/api/tattoo-saves', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: ids }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const idSet = new Set(ids);
      setTattoos(prev => prev.filter(t => !idSet.has(t.id)));
      setSelected(new Set());
      setSelectMode(false);
      // close lightbox if open and current image was deleted
      if (lightboxIndex !== null) {
        const currentTattoo = tattoos[lightboxIndex];
        if (currentTattoo && idSet.has(currentTattoo.id)) {
          setLightboxIndex(null);
        }
      }
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

  const deleteSingle = (tattoo) => {
    setConfirmTarget({ ids: [tattoo.id], count: 1 });
  };

  const downloadTattoo = async (tattoo) => {
    setDownloading(tattoo.id);
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(tattoo.fullUrl)}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = tattoo.name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(tattoo.fullUrl, '_blank');
    }
    setDownloading(null);
  };

  const handleCardClick = (tattoo, i) => {
    if (selectMode) { toggleSelect(tattoo.id); return; }
    setLightboxIndex(i);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', padding: '40px 16px 80px', maxWidth: '960px', margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .stattoo-card img { transition: transform 0.25s ease; }
        .stattoo-card:hover img { transform: scale(1.04); }
        @media (max-width: 600px) {
          .stattoo-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; }
          .stattoo-btn-sm { width: 32px !important; height: 32px !important; font-size: 12px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 700,
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          margin: '0 0 8px',
        }}>Saved Tattoos 🖤</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontSize: '14px', margin: '0 0 16px' }}>
          {tattoos.length > 0 ? `${tattoos.length} tattoo${tattoos.length !== 1 ? 's' : ''} saved` : 'Your tattoo collection lives here'}
        </p>
        <Link href="/tattoos" style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: '20px',
          background: 'rgba(233,30,140,0.1)', border: '1px solid rgba(233,30,140,0.3)',
          color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontFamily: "'Inter', sans-serif",
          textDecoration: 'none',
        }}>🖤 Browse tattoos</Link>
      </div>

      {/* Toolbar */}
      {!loading && tattoos.length > 0 && (
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
                onClick={() => setSelected(new Set(tattoos.map(t => t.id)))}
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

      {/* Error */}
      {error && (
        <div style={{ textAlign: 'center', color: 'rgba(255,100,100,0.7)', fontFamily: "'Inter', sans-serif", padding: '20px' }}>
          {error} — <button onClick={load} style={{ background: 'none', border: 'none', color: '#e91e8c', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="stattoo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: '4/3', borderRadius: '16px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
              backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear',
            }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && tattoos.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🖤</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}>
            No saved tattoos yet — go find some! 🖤
          </p>
          <Link href="/tattoos" style={{
            display: 'inline-block', marginTop: '16px', padding: '12px 28px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff', fontFamily: "'Inter', sans-serif", fontWeight: 600, textDecoration: 'none',
          }}>Browse Tattoos</Link>
        </div>
      )}

      {/* Grid */}
      {!loading && tattoos.length > 0 && (
        <div className="stattoo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {tattoos.map((tattoo, i) => {
            const isSelected = selected.has(tattoo.id);
            return (
              <div
                key={tattoo.id}
                className="stattoo-card"
                style={{
                  aspectRatio: '4/3',
                  borderRadius: '16px', overflow: 'hidden', position: 'relative',
                  background: 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(179,136,255,0.08))',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #e91e8c' : '2px solid transparent',
                  boxShadow: isSelected ? '0 0 0 2px rgba(233,30,140,0.4)' : 'none',
                }}
                onClick={() => handleCardClick(tattoo, i)}
              >
                <img
                  src={tattoo.thumbnailUrl}
                  alt={tattoo.name || 'saved tattoo'}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
                />

                {/* Select checkmark */}
                {selectMode && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: isSelected ? '#e91e8c' : 'rgba(0,0,0,0.5)',
                    border: isSelected ? '2px solid #e91e8c' : '2px solid rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', color: '#fff', fontWeight: 700,
                    transition: 'background 0.15s',
                  }}>{isSelected ? '✓' : ''}</div>
                )}

                {/* Action buttons — always visible at bottom with gradient overlay */}
                {!selectMode && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.78))',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                    padding: '24px 8px 8px', gap: '6px', borderRadius: '0 0 14px 14px',
                  }}>
                    <button
                      className="stattoo-btn-sm"
                      onClick={e => { e.stopPropagation(); downloadTattoo(tattoo); }}
                      title="Download"
                      style={{
                        background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%',
                        width: '32px', height: '32px', color: '#fff', fontSize: '14px',
                        cursor: downloading === tattoo.id ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{downloading === tattoo.id ? '⏳' : '↓'}</button>
                    <button
                      className="stattoo-btn-sm"
                      onClick={e => { e.stopPropagation(); deleteSingle(tattoo); }}
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

                {/* Date badge */}
                {tattoo.createdTime && !selectMode && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.55)', borderRadius: '8px', padding: '2px 8px',
                    color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontFamily: "'Inter', sans-serif",
                  }}>
                    {new Date(tattoo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          tattoos={tattoos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex(i => Math.min(tattoos.length - 1, i + 1))}
          onDownload={downloadTattoo}
          downloading={downloading}
        />
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <ConfirmDialog
          count={confirmTarget.count}
          onConfirm={() => doDelete(confirmTarget.ids)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
