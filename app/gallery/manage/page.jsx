"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const GALLERY_PASSWORD = 'Amrita';

// ─── Password Gate ────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = () => {
    if (input === GALLERY_PASSWORD) {
      onUnlock(input);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setInput('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(233,30,140,0.2)',
        borderRadius: '20px', padding: '40px 32px', maxWidth: '360px', width: '100%',
        textAlign: 'center',
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
          Gallery Management
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: '0 0 24px' }}>
          Enter the password to upload or delete
        </p>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Password"
          autoFocus
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${error ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif",
            outline: 'none', boxSizing: 'border-box', marginBottom: '12px',
          }}
        />
        {error && (
          <div style={{ color: 'rgba(255,100,100,0.8)', fontSize: '13px', fontFamily: "'Inter', sans-serif", marginBottom: '12px' }}>
            Wrong password
          </div>
        )}
        <button
          onClick={submit}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            border: 'none', color: '#fff', fontSize: '14px',
            fontFamily: "'Inter', sans-serif", fontWeight: 600, cursor: 'pointer',
          }}
        >Unlock</button>
      </div>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}

// ─── Upload Section ───────────────────────────────────────────────────────────
function UploadSection({ password, onUploaded, onAllDone }) {
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const inputRef = useRef(null);

  const uploadFile = (file) => {
    const id = `${file.name}-${Date.now()}`;
    setUploads(prev => [...prev, { id, name: file.name, status: 'uploading', progress: 0 }]);

    const fd = new FormData();
    fd.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/photos');
    xhr.setRequestHeader('x-gallery-password', password);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: pct } : u));
      }
    };

    const checkAllDone = (updatedList) => {
      const allTerminal = updatedList.every(u => u.status === 'done' || u.status === 'error');
      if (allTerminal && updatedList.length > 0) setTimeout(() => onAllDone?.(), 0);
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.error) throw new Error(data.error);
        setUploads(prev => {
          const updated = prev.map(u => u.id === id ? { ...u, status: 'done', progress: 100 } : u);
          checkAllDone(updated);
          return updated;
        });
        onUploaded(data.photo);
      } catch (err) {
        setUploads(prev => {
          const updated = prev.map(u => u.id === id ? { ...u, status: 'error', error: err.message } : u);
          checkAllDone(updated);
          return updated;
        });
      }
    };

    xhr.onerror = () => {
      setUploads(prev => {
        const updated = prev.map(u => u.id === id ? { ...u, status: 'error', error: 'Network error' } : u);
        checkAllDone(updated);
        return updated;
      });
    };

    xhr.send(fd);
  };

  const handleFiles = (files) => {
    Array.from(files)
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .forEach(uploadFile);
  };

  return (
    <div style={{ marginBottom: '48px' }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 20px' }}>
        Upload Photos & Videos
      </h2>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#e91e8c' : 'rgba(233,30,140,0.3)'}`,
          borderRadius: '16px', padding: '40px 20px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.2s ease',
          background: dragging ? 'rgba(233,30,140,0.08)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
          Drag & drop photos or videos here, or click to pick files
        </div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', sans-serif", fontSize: '12px', marginTop: '6px' }}>
          JPG, PNG, WEBP, HEIC, MP4, MOV supported
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {uploads.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {uploads.map(u => (
            <div key={u.id} style={{
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: u.status === 'uploading' ? '8px' : '0' }}>
                <span style={{ fontSize: '15px', flexShrink: 0 }}>
                  {u.status === 'uploading' ? '⏳' : u.status === 'done' ? '✅' : '❌'}
                </span>
                <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.name}
                </span>
                <span style={{ fontSize: '12px', flexShrink: 0, fontFamily: "'Inter', sans-serif",
                  color: u.status === 'error' ? 'rgba(255,100,100,0.8)' : u.status === 'done' ? 'rgba(100,220,100,0.8)' : 'rgba(255,255,255,0.4)',
                }}>
                  {u.status === 'uploading'
                    ? (u.progress ?? 0) < 100 ? `${u.progress}%` : 'Saving to Drive...'
                    : u.status === 'done' ? 'Done' : u.error}
                </span>
              </div>
              {u.status === 'uploading' && (
                <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  {(u.progress ?? 0) < 100 ? (
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                      width: `${u.progress ?? 0}%`,
                      transition: 'width 0.2s ease',
                    }} />
                  ) : (
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      background: 'linear-gradient(90deg, #e91e8c, #b388ff, #e91e8c)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer-bar 1.2s linear infinite',
                    }} />
                  )}
                </div>
              )}
              <style>{`@keyframes shimmer-bar { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ count, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(220,53,69,0.4)',
        borderRadius: '20px', padding: '36px 32px', maxWidth: '360px', width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🗑️</div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#fff', margin: '0 0 10px' }}>
          Delete {count} item{count !== 1 ? 's' : ''}?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: '0 0 28px' }}>
          {count} file{count !== 1 ? 's' : ''} will be removed from the gallery. This can't be undone from here.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px', borderRadius: '10px',
              background: 'rgba(220,53,69,0.85)', border: 'none',
              color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif",
              fontWeight: 600, cursor: 'pointer',
            }}
          >Yes, delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Section ───────────────────────────────────────────────────────────
function DeleteSection({ password, newPhotos, refreshKey }) {
  const [photos, setPhotos] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  const loadPhotos = useCallback(async (pageToken = null) => {
    const url = `/api/photos?pageSize=20${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }, []);

  // Initial load
  useEffect(() => {
    loadPhotos()
      .then(data => { setPhotos(data.photos); setNextPageToken(data.nextPageToken); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadPhotos]);

  // Prepend each newly uploaded photo immediately
  useEffect(() => {
    if (!newPhotos?.length) return;
    setPhotos(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const fresh = newPhotos.filter(p => !existingIds.has(p.id));
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, [newPhotos]);

  // Full re-fetch when all uploads are done
  useEffect(() => {
    if (!refreshKey) return;
    setLoading(true);
    loadPhotos()
      .then(data => { setPhotos(data.photos); setNextPageToken(data.nextPageToken); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, loadPhotos]);

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await loadPhotos(nextPageToken);
      setPhotos(prev => [...prev, ...data.photos]);
      setNextPageToken(data.nextPageToken);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(photos.map(p => p.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const confirmDelete = async () => {
    setShowConfirm(false);
    setDeleting(true);
    const ids = [...selected];
    for (const fileId of ids) {
      try {
        const res = await fetch(`/api/photos?fileId=${fileId}`, {
          method: 'DELETE',
          headers: { 'x-gallery-password': password },
        });
        const data = await res.json();
        if (!data.error) {
          setPhotos(prev => prev.filter(p => p.id !== fileId));
          setSelected(prev => { const next = new Set(prev); next.delete(fileId); return next; });
        }
      } catch (_) {}
    }
    setDeleting(false);
  };

  return (
    <div>
      {showConfirm && (
        <ConfirmDialog
          count={selected.size}
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', margin: '0 0 4px' }}>
            Delete Items
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: 0 }}>
            Tap to select, then delete selected
          </p>
        </div>

        {photos.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={selected.size === photos.length ? clearSelection : selectAll}
              style={{
                padding: '7px 14px', borderRadius: '16px', fontSize: '12px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif", cursor: 'pointer',
              }}
            >
              {selected.size === photos.length ? 'Deselect all' : 'Select all'}
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={deleting}
                style={{
                  padding: '7px 14px', borderRadius: '16px', fontSize: '12px',
                  background: 'rgba(220,53,69,0.8)', border: 'none',
                  color: '#fff', fontFamily: "'Inter', sans-serif",
                  fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : `🗑 Delete ${selected.size} selected`}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: 'rgba(255,100,100,0.7)', fontSize: '14px', fontFamily: "'Inter', sans-serif", marginBottom: '16px' }}>
          Error: {error}
        </div>
      )}

      {loading && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
          Loading...
        </div>
      )}

      {!loading && photos.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
          No items found.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
        {photos.map(photo => {
          const isSelected = selected.has(photo.id);
          return (
            <div
              key={photo.id}
              onClick={() => toggleSelect(photo.id)}
              style={{
                position: 'relative', borderRadius: '10px', overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
                outline: isSelected ? '2px solid #e91e8c' : '2px solid transparent',
                outlineOffset: '2px',
                transition: 'outline 0.15s ease',
              }}
            >
              <img
                src={photo.thumbnailUrl}
                alt={photo.name}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
              />
              {/* Video indicator */}
              {photo.isVideo && (
                <div style={{
                  position: 'absolute', top: '6px', left: '6px',
                  background: 'rgba(0,0,0,0.6)', borderRadius: '4px',
                  padding: '2px 5px', fontSize: '10px', color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                }}>▶ video</div>
              )}
              {/* Date */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                padding: '16px 6px 5px',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontFamily: "'Inter', sans-serif" }}>
                  {photo.createdTime ? new Date(photo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                </div>
              </div>
              {/* Checkmark */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: '6px', right: '6px',
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: '#e91e8c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', color: '#fff',
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {nextPageToken && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '10px 28px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontFamily: "'Inter', sans-serif",
              cursor: loadingMore ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ManagePage() {
  const [password, setPassword] = useState(null);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const saved = sessionStorage.getItem('gallery_pw');
    if (saved === GALLERY_PASSWORD) setPassword(saved);
  }, []);

  const handleUnlock = (pw) => {
    sessionStorage.setItem('gallery_pw', pw);
    setPassword(pw);
  };

  const handleUploaded = (photo) => {
    setUploadedPhotos(prev => [photo, ...prev]);
  };

  const handleAllDone = () => {
    setRefreshKey(k => k + 1);
    setUploadedPhotos([]);
  };

  if (!password) return <PasswordGate onUnlock={handleUnlock} />;

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 700,
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            margin: 0,
          }}>Manage Gallery</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: "'Inter', sans-serif", margin: '4px 0 0' }}>
            Upload new memories or clean up the collection
          </p>
        </div>
        <Link href="/gallery" style={{
          padding: '8px 18px', borderRadius: '20px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontFamily: "'Inter', sans-serif",
          textDecoration: 'none',
        }}>← View Gallery</Link>
      </div>

      <UploadSection password={password} onUploaded={handleUploaded} onAllDone={handleAllDone} />

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '40px' }} />

      <DeleteSection password={password} newPhotos={uploadedPhotos} refreshKey={refreshKey} />
    </div>
  );
}
