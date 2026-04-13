'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  'Collarbone', 'Wrist', 'Ankle', 'Behind Ear', 'Finger', 'Shoulder',
  'Spine', 'Ribcage', 'Forearm', 'Thigh', 'Minimalist', 'Floral',
  'Butterfly', 'Heart', 'Quote', 'Geometric', 'Watercolor', 'Moon',
  'Star', 'Infinity',
];

const IMAGES_PER_PAGE = 20;

export default function TattooSearchPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedImages, setSavedImages] = useState({});
  const [savingImages, setSavingImages] = useState({});
  const [toast, setToast] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchImages = useCallback(async (searchQuery, pageNum = 1, append = false) => {
    if (!searchQuery.trim()) return;

    if (pageNum === 1) {
      setLoading(true);
      setError(false);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(
        `/api/tattoo-search?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=${IMAGES_PER_PAGE}`
      );
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();

      if (append) {
        setImages((prev) => [...prev, ...(data.images || [])]);
      } else {
        setImages(data.images || []);
      }
      setHasMore((data.images || []).length >= IMAGES_PER_PAGE);
      setHasSearched(true);
    } catch {
      setError(true);
      if (!append) setImages([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const handleSearch = useCallback((searchQuery) => {
    setPage(1);
    fetchImages(searchQuery, 1, false);
  }, [fetchImages]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveCategory('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) handleSearch(val.trim());
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (query.trim()) handleSearch(query.trim());
    }
  };

  const handleCategoryClick = (cat) => {
    const searchTerm = `${cat} tattoo`;
    setActiveCategory(cat);
    setQuery(searchTerm);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    handleSearch(searchTerm);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchImages(query, nextPage, true);
  };

  const handleSave = async (image, index) => {
    const key = image.url || index;
    if (savedImages[key] || savingImages[key]) return;

    setSavingImages((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch('/api/tattoo-saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: image.url,
          name: query || 'tattoo',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSavedImages((prev) => ({ ...prev, [key]: true }));
      showToast('Saved! \u2713');
    } catch {
      showToast('Failed to save. Try again?', 'error');
    } finally {
      setSavingImages((prev) => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <div style={styles.page}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === 'error' ? styles.toastError : {}),
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <Link href="/" style={styles.backLink}>\u2190 Back</Link>
        <h1 style={styles.title}>Tattoo Ideas \uD83D\uDDA4</h1>
        <p style={styles.subtitle}>find your perfect ink</p>
      </header>

      {/* Sticky search area */}
      <div style={styles.stickySearch}>
        {/* Categories */}
        <div style={styles.categoriesWrapper}>
          <div style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  ...styles.categoryPill,
                  ...(activeCategory === cat ? styles.categoryPillActive : {}),
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchBarWrapper}>
          <div style={styles.searchBar}>
            <span style={styles.searchIcon}>\uD83D\uDD0D</span>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search tattoo ideas..."
              style={styles.searchInput}
            />
            <button
              onClick={() => { if (query.trim()) handleSearch(query.trim()); }}
              style={styles.searchButton}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main style={styles.main}>
        {/* Loading skeleton */}
        {loading && (
          <div style={styles.grid} className="tattoo-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={styles.skeletonCard}>
                <div style={styles.skeletonImage} />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Couldn't load images. Try again?</p>
            <button
              onClick={() => handleSearch(query)}
              style={styles.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty / initial state */}
        {!loading && !error && images.length === 0 && (
          <div style={styles.emptyState}>
            {hasSearched ? (
              <p style={styles.emptyText}>No results found. Try a different search!</p>
            ) : (
              <>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>\uD83E\uDE76</p>
                <p style={styles.emptyText}>Search for tattoo ideas above \u2728</p>
              </>
            )}
          </div>
        )}

        {/* Image grid */}
        {!loading && !error && images.length > 0 && (
          <>
            <div style={styles.grid} className="tattoo-grid">
              {images.map((img, i) => {
                const key = img.url || i;
                const isSaved = savedImages[key];
                const isSaving = savingImages[key];

                return (
                  <div key={`${key}-${i}`} style={styles.card} className="tattoo-card">
                    <div style={styles.imageContainer}>
                      <img
                        src={img.thumbnail || img.url}
                        alt="Tattoo idea"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        style={styles.image}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      {/* Desktop hover overlay */}
                      <div style={styles.overlay} className="card-overlay">
                        <button
                          onClick={() => handleSave(img, i)}
                          disabled={isSaved || isSaving}
                          style={{
                            ...styles.saveButtonOverlay,
                            ...(isSaved ? styles.savedButton : {}),
                          }}
                        >
                          {isSaving ? 'Saving...' : isSaved ? 'Saved \u2713' : '\u2601\uFE0F Save'}
                        </button>
                      </div>
                    </div>
                    {/* Mobile save button */}
                    <button
                      onClick={() => handleSave(img, i)}
                      disabled={isSaved || isSaving}
                      style={{
                        ...styles.mobileSaveButton,
                        ...(isSaved ? styles.savedButton : {}),
                      }}
                      className="mobile-save-btn"
                    >
                      {isSaving ? 'Saving...' : isSaved ? 'Saved \u2713' : '\uD83D\uDCBE Save to Drive'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div style={styles.loadMoreWrapper}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={styles.loadMoreButton}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Global styles via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600&display=swap');

        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .tattoo-card:hover .card-overlay {
          opacity: 1 !important;
        }

        .tattoo-card:hover {
          transform: scale(1.02) !important;
        }

        /* Hide scrollbar for categories */
        .categories-scroll::-webkit-scrollbar {
          display: none;
        }

        /* Mobile: show save button, hide overlay */
        @media (max-width: 768px) {
          .mobile-save-btn {
            display: flex !important;
          }
          .card-overlay {
            display: none !important;
          }
        }

        /* Desktop: hide mobile button, show overlay on hover */
        @media (min-width: 769px) {
          .mobile-save-btn {
            display: none !important;
          }
        }

        /* Responsive grid */
        @media (max-width: 900px) {
          .tattoo-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .tattoo-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#07071a',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    paddingBottom: '60px',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#1a3a1a',
    color: '#4ade80',
    padding: '12px 28px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    zIndex: 9999,
    border: '1px solid #4ade8040',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    fontFamily: "'Inter', sans-serif",
  },
  toastError: {
    backgroundColor: '#3a1a1a',
    color: '#f87171',
    border: '1px solid #f8717140',
  },
  header: {
    textAlign: 'center',
    padding: '40px 20px 20px',
    position: 'relative',
  },
  backLink: {
    position: 'absolute',
    left: '20px',
    top: '20px',
    color: '#b388ff',
    textDecoration: 'none',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
  },
  title: {
    fontFamily: "'Dancing Script', cursive",
    fontSize: '42px',
    fontWeight: '700',
    color: '#e91e8c',
    margin: '0 0 4px',
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '15px',
    color: '#b388ff',
    margin: 0,
    fontWeight: '400',
    letterSpacing: '0.5px',
  },
  stickySearch: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#07071aee',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    paddingBottom: '16px',
  },
  categoriesWrapper: {
    padding: '12px 0 8px',
    overflow: 'hidden',
  },
  categoriesRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '0 20px 8px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  categoryPill: {
    flexShrink: 0,
    padding: '8px 18px',
    borderRadius: '24px',
    border: '1px solid #ffffff20',
    backgroundColor: '#ffffff08',
    color: '#ccc',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  categoryPillActive: {
    borderColor: '#e91e8c',
    backgroundColor: '#e91e8c20',
    color: '#e91e8c',
  },
  searchBarWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 20px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '4px 4px 4px 16px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  searchIcon: {
    fontSize: '18px',
    marginRight: '10px',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    padding: '12px 0',
  },
  searchButton: {
    padding: '10px 22px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#e91e8c',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  main: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  card: {
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#0f0f2a',
    border: '1px solid #ffffff10',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    cursor: 'pointer',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    minHeight: '160px',
    maxHeight: '360px',
    backgroundColor: '#1a1a3a',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.75) 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '16px',
    opacity: 0,
    transition: 'opacity 0.25s ease',
  },
  saveButtonOverlay: {
    padding: '10px 24px',
    borderRadius: '12px',
    border: '1px solid #ffffff30',
    backgroundColor: 'rgba(233, 30, 140, 0.85)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(8px)',
  },
  mobileSaveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px',
    border: 'none',
    borderTop: '1px solid #ffffff10',
    backgroundColor: 'transparent',
    color: '#b388ff',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  savedButton: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4ade8040',
    color: '#4ade80',
    cursor: 'default',
  },
  skeletonCard: {
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#0f0f2a',
    border: '1px solid #ffffff10',
  },
  skeletonImage: {
    width: '100%',
    height: '220px',
    background: 'linear-gradient(90deg, #0f0f2a 25%, #1a1a3a 50%, #0f0f2a 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite ease-in-out',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '17px',
    color: '#888',
    fontFamily: "'Inter', sans-serif",
  },
  retryButton: {
    marginTop: '16px',
    padding: '10px 28px',
    borderRadius: '12px',
    border: '1px solid #e91e8c40',
    backgroundColor: '#e91e8c20',
    color: '#e91e8c',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
  },
  loadMoreWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '32px',
  },
  loadMoreButton: {
    padding: '14px 40px',
    borderRadius: '14px',
    border: '1px solid #b388ff40',
    backgroundColor: '#b388ff15',
    color: '#b388ff',
    fontSize: '15px',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

