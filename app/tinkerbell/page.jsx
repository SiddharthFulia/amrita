'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  const photo = photos[index];
  const isVideo = photo.mimeType?.startsWith('video/');

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
        {isVideo ? (
          <iframe src={photo.fullUrl} style={{ width: 'min(92vw, 700px)', height: 'min(70vh, 500px)', border: 'none', borderRadius: '12px' }} allow="autoplay" allowFullScreen />
        ) : (
          <img src={photo.fullUrl} alt={photo.name} style={{ maxWidth: '92vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: '12px', display: 'block' }} />
        )}
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
          {index + 1} / {photos.length}
          {photo.createdTime ? ` · ${new Date(photo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
        </div>
      </div>
      {index < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNext(); }} style={{
          position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '44px', height: '44px', color: '#fff',
          fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      )}
      <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '8px' }}>
        <a href={photo.downloadUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '36px', height: '36px', color: '#fff',
          fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
        }}>↓</a>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '36px', height: '36px', color: '#fff',
          fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>
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
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#fff', margin: '0 0 10px' }}>
          Remove {count} photo{count !== 1 ? 's' : ''}?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: '0 0 28px' }}>
          {count} photo{count !== 1 ? 's' : ''} of Tinkerbell will be moved to deleted folder.
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

export default function TinkerbellPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { ids: [] }

  // upload
  const [uploads, setUploads] = useState([]); // [{id, name, progress, done, error}]
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tinkerbell', { cache: 'no-store' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPhotos(data.photos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Upload handler
  const handleFiles = (files) => {
    const arr = [...files];
    arr.forEach(file => {
      const uid = `${Date.now()}-${Math.random()}`;
      setUploads(prev => [...prev, { id: uid, name: file.name, progress: 0, done: false, error: null }]);

      const fd = new FormData();
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads(prev => prev.map(u => u.id === uid ? { ...u, progress: pct } : u));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.photo) {
            setPhotos(prev => [data.photo, ...prev]);
          }
          setUploads(prev => prev.map(u => u.id === uid ? { ...u, progress: 100, done: true } : u));
          setTimeout(() => setUploads(prev => prev.filter(u => u.id !== uid)), 3000);
        } else {
          setUploads(prev => prev.map(u => u.id === uid ? { ...u, error: 'Upload failed', done: true } : u));
        }
      };
      xhr.onerror = () => {
        setUploads(prev => prev.map(u => u.id === uid ? { ...u, error: 'Network error', done: true } : u));
      };
      xhr.open('POST', '/api/tinkerbell');
      xhr.send(fd);
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

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
      const res = await fetch('/api/tinkerbell', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: ids }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const idSet = new Set(ids);
      setPhotos(prev => prev.filter(p => !idSet.has(p.id)));
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
    setConfirmTarget({ ids: [...selected] });
  };

  const deleteSingle = (photo) => {
    setConfirmTarget({ ids: [photo.id] });
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '960px', margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes shimmerBar { 0%{background-position:-300px 0} 100%{background-position:300px 0} }
        .tink-card img { transition: transform 0.2s ease; }
        .tink-card:hover img { transform: scale(1.03); }
        .drop-zone { transition: border-color 0.2s, background 0.2s; }
        .drop-zone:hover { border-color: rgba(233,30,140,0.6) !important; background: rgba(233,30,140,0.06) !important; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐈</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 700,
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          margin: '0 0 8px',
        }}>Tinkerbell ♥</h1>
        <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: '18px', color: '#b388ff', margin: '0 0 6px' }}>
          the original love of your life
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", fontSize: '13px', margin: 0 }}>
          {photos.length > 0 ? `${photos.length} photo${photos.length !== 1 ? 's' : ''} saved` : 'Upload your first photo of Tinkerbell'}
        </p>
      </div>

      {/* Upload drop zone */}
      <div
        className="drop-zone"
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed rgba(233,30,140,0.3)', borderRadius: '16px',
          padding: '28px', textAlign: 'center', cursor: 'pointer', marginBottom: '20px',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>
          Drag & drop photos/videos of Tinkerbell, or <span style={{ color: '#e91e8c' }}>click to browse</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
          JPG, PNG, GIF, MP4 · saved to her folder in Drive
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload progress bars */}
      {uploads.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {uploads.map(u => (
            <div key={u.id} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
              padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: "'Inter', sans-serif", fontSize: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{u.name}</span>
                <span style={{ color: u.error ? '#f55' : u.done ? '#4caf50' : '#e91e8c' }}>
                  {u.error ? '✗ failed' : u.done ? '✓ saved' : u.progress < 100 ? `${u.progress}%` : 'Saving...'}
                </span>
              </div>
              <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                {u.progress < 100 ? (
                  <div style={{ height: '100%', width: `${u.progress}%`, background: 'linear-gradient(90deg,#e91e8c,#b388ff)', borderRadius: '4px', transition: 'width 0.3s' }} />
                ) : !u.done ? (
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, rgba(233,30,140,0.4) 25%, rgba(179,136,255,0.8) 50%, rgba(233,30,140,0.4) 75%)', backgroundSize: '300px 100%', animation: 'shimmerBar 1.2s infinite linear', borderRadius: '4px' }} />
                ) : (
                  <div style={{ height: '100%', width: '100%', background: u.error ? '#f55' : '#4caf50', borderRadius: '4px' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {!loading && photos.length > 0 && (
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
                onClick={() => setSelected(new Set(photos.map(p => p.id)))}
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
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>{selected.size} selected</span>
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

      {!loading && photos.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🐾</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}>
            No photos yet — upload the first one above!
          </p>
        </div>
      )}

      {!loading && photos.length > 0 && (
        <div style={{ columns: '3 160px', columnGap: '12px' }}>
          {photos.map((photo, i) => {
            const isVideo = photo.mimeType?.startsWith('video/');
            const isSelected = selected.has(photo.id);
            return (
              <div
                key={photo.id}
                className="tink-card"
                style={{
                  breakInside: 'avoid', marginBottom: '12px',
                  borderRadius: '12px', overflow: 'hidden', position: 'relative',
                  background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                  outline: isSelected ? '2px solid #e91e8c' : 'none',
                  boxShadow: isSelected ? '0 0 0 2px rgba(233,30,140,0.4)' : 'none',
                }}
                onClick={() => {
                  if (selectMode) { toggleSelect(photo.id); return; }
                  setLightboxIndex(i);
                }}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.name}
                  style={{ width: '100%', display: 'block', borderRadius: '12px' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />

                {/* Video badge */}
                {isVideo && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: 'rgba(233,30,140,0.8)', borderRadius: '6px', padding: '2px 8px',
                    fontSize: '10px', fontWeight: 700, color: '#fff',
                  }}>▶</div>
                )}

                {/* Select checkmark */}
                {selectMode && (
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: isSelected ? '#e91e8c' : 'rgba(0,0,0,0.5)',
                    border: isSelected ? '2px solid #e91e8c' : '2px solid rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: '#fff', fontWeight: 700,
                  }}>{isSelected ? '✓' : ''}</div>
                )}

                {/* Actions */}
                {!selectMode && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                    padding: '20px 8px 8px', gap: '6px', borderRadius: '0 0 12px 12px',
                  }}>
                    <a
                      href={photo.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="Download"
                      style={{
                        background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%',
                        width: '32px', height: '32px', color: '#fff', fontSize: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                      }}
                    >↓</a>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSingle(photo); }}
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
                {photo.createdTime && !selectMode && !isVideo && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.55)', borderRadius: '6px', padding: '2px 7px',
                    color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontFamily: "'Inter', sans-serif",
                  }}>
                    {new Date(photo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex(i => Math.min(photos.length - 1, i + 1))}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          count={confirmTarget.ids.length}
          onConfirm={() => doDelete(confirmTarget.ids)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
