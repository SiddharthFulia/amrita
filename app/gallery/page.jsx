"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  const photo = photos[index];

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: '44px', height: '44px', color: '#fff',
            fontSize: '20px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>
      )}

      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
        {photo.isVideo ? (
          <iframe
            src={photo.fullUrl}
            style={{ width: 'min(90vw, 900px)', height: 'min(85vh, 540px)', border: 'none', borderRadius: '12px' }}
            allow="autoplay"
            allowFullScreen
          />
        ) : (
          <img
            src={photo.fullUrl}
            alt={photo.name}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }}
          />
        )}
        <div style={{
          position: 'absolute', bottom: '-36px', left: 0, right: 0, textAlign: 'center',
          color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontFamily: "'Inter', sans-serif",
        }}>
          {index + 1} / {photos.length}
          {photo.createdTime && ` · ${new Date(photo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        </div>
      </div>

      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: '44px', height: '44px', color: '#fff',
            fontSize: '20px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >›</button>
      )}

      <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
        {photo.downloadUrl && (
          <a
            href={photo.downloadUrl}
            download
            onClick={e => e.stopPropagation()}
            title="Download"
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: '36px', height: '36px', color: '#fff',
              fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}
          >↓</a>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: '36px', height: '36px', color: '#fff',
            fontSize: '18px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>
    </div>
  );
}

// ─── Photo Card ───────────────────────────────────────────────────────────────
function PhotoCard({ photo, index, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpen(index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        breakInside: 'avoid', marginBottom: '12px', cursor: 'pointer',
        borderRadius: '12px', overflow: 'hidden', position: 'relative',
        background: 'rgba(255,255,255,0.05)',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? '0 8px 32px rgba(233,30,140,0.3)' : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {!loaded && (
        <div style={{
          width: '100%', paddingBottom: '75%',
          background: 'linear-gradient(135deg, rgba(233,30,140,0.08), rgba(179,136,255,0.08))',
        }} />
      )}
      <img
        src={photo.thumbnailUrl}
        alt={photo.name}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', display: loaded ? 'block' : 'none', borderRadius: '12px' }}
      />
      {loaded && photo.isVideo && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>▶</div>
        </div>
      )}
      {loaded && photo.createdTime && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
          padding: '24px 10px 8px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', fontFamily: "'Inter', sans-serif" }}>
            {new Date(photo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Gallery Page ────────────────────────────────────────────────────────
export default function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchPhotos = useCallback(async (pageToken = null) => {
    const url = `/api/photos?pageSize=20${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }, []);

  useEffect(() => {
    fetchPhotos()
      .then(data => {
        setPhotos(data.photos);
        setNextPageToken(data.nextPageToken);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchPhotos]);

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPhotos(nextPageToken);
      setPhotos(prev => [...prev, ...data.photos]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Group by month/year
  const grouped = photos.reduce((acc, photo) => {
    const key = photo.createdTime
      ? new Date(photo.createdTime).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : 'Unknown date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📸</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700,
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          margin: '0 0 8px',
        }}>
          Our Gallery
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontSize: '14px', margin: '0 0 16px' }}>
          Every picture, a little piece of us ♥
        </p>
        <Link href="/gallery/manage" style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: '20px',
          background: 'rgba(233,30,140,0.1)', border: '1px solid rgba(233,30,140,0.3)',
          color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontFamily: "'Inter', sans-serif",
          textDecoration: 'none',
        }}>
          ⚙ Manage Photos
        </Link>
      </div>

      {error && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,100,100,0.8)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
          Failed to load: {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ columns: '3 180px', columnGap: '12px' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{
              breakInside: 'avoid', marginBottom: '12px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              paddingBottom: `${55 + (i % 3) * 25}%`,
            }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌸</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
            No photos yet — add some memories!
          </p>
        </div>
      )}

      {/* Photos grouped by month */}
      {!loading && Object.entries(grouped).map(([monthYear, monthPhotos]) => {
        const startIndex = photos.findIndex(p => p.id === monthPhotos[0].id);
        return (
          <div key={monthYear} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'rgba(255,255,255,0.7)' }}>
                {monthYear}
              </div>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', sans-serif" }}>
                {monthPhotos.length} photo{monthPhotos.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ columns: '3 180px', columnGap: '12px' }}>
              {monthPhotos.map((photo, i) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={startIndex + i}
                  onOpen={setLightboxIndex}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Load more */}
      {nextPageToken && !loading && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '12px 32px', borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(179,136,255,0.15))',
              border: '1px solid rgba(233,30,140,0.3)',
              color: loadingMore ? 'rgba(255,255,255,0.3)' : '#fff',
              fontFamily: "'Inter', sans-serif", fontSize: '14px',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingMore ? 'Loading...' : 'Load more memories ↓'}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex(i => Math.min(photos.length - 1, i + 1))}
        />
      )}
    </div>
  );
}
