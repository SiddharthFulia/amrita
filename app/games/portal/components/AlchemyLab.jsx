'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BASE_ELEMENTS,
  ALL_ELEMENTS,
  RECIPES,
  findRecipe,
  getElement,
  CATEGORIES,
} from '../utils/recipes';
import { saveDiscoveries, loadDiscoveries } from '../utils/api';

// ─── Sparkle Particle ────────────────────────────────────────────────────────
function Sparkle({ x, y, color, delay = 0 }) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 40 + Math.random() * 80;
  return (
    <motion.div
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{
        opacity: 0,
        scale: 0,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color || '#ffd54f',
        pointerEvents: 'none',
        zIndex: 999,
        boxShadow: `0 0 8px ${color || '#ffd54f'}`,
      }}
    />
  );
}

// ─── Toast Notification ──────────────────────────────────────────────────────
function Toast({ element, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ y: -60, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: 'linear-gradient(135deg, rgba(233,30,140,0.25), rgba(179,136,255,0.25))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,213,79,0.4)',
        borderRadius: 16,
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 32px rgba(233,30,140,0.3), 0 0 60px rgba(255,213,79,0.15)',
      }}
    >
      <span style={{ fontSize: 28 }}>{element.emoji}</span>
      <div>
        <div style={{ color: '#ffd54f', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
          NEW DISCOVERY!
        </div>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{element.name}</div>
      </div>
    </motion.div>
  );
}

// ─── Element Card ────────────────────────────────────────────────────────────
function ElementCard({
  element,
  locked = false,
  small = false,
  onPointerDown,
  style = {},
  isDragging = false,
}) {
  const cat = CATEGORIES[element.category] || {};
  const glowColor = element.color || cat.color || '#b388ff';

  if (locked) {
    return (
      <div
        style={{
          width: small ? 68 : 80,
          height: small ? 78 : 90,
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          opacity: 0.4,
          userSelect: 'none',
          ...style,
        }}
      >
        <span style={{ fontSize: 22, filter: 'grayscale(1)' }}>🔒</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}>???</span>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={isDragging ? {} : { scale: 1.08, boxShadow: `0 0 20px ${glowColor}55` }}
      whileTap={{ scale: 0.95 }}
      onPointerDown={onPointerDown}
      style={{
        width: small ? 68 : 80,
        height: small ? 78 : 90,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...style,
      }}
    >
      <span style={{ fontSize: small ? 26 : 32, lineHeight: 1 }}>{element.emoji}</span>
      <span
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: small ? 9 : 11,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: '90%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {element.name}
      </span>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AlchemyLab({ onBack }) {
  const [discovered, setDiscovered] = useState([]);
  const [slot1, setSlot1] = useState(null); // element id
  const [slot2, setSlot2] = useState(null);
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [toast, setToast] = useState(null);
  const [combining, setCombining] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const [newResult, setNewResult] = useState(null); // element to show result animation
  const [loaded, setLoaded] = useState(false);

  // Drag state
  const [dragging, setDragging] = useState(null); // element id
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(false);

  const workspaceRef = useRef(null);
  const slot1Ref = useRef(null);
  const slot2Ref = useRef(null);

  // ── Load ──
  useEffect(() => {
    (async () => {
      const saved = await loadDiscoveries();
      if (saved && saved.length > 0) {
        setDiscovered(saved);
      } else {
        const baseIds = BASE_ELEMENTS.map((e) => e.id);
        setDiscovered(baseIds);
        await saveDiscoveries(baseIds);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Save on discovery change ──
  useEffect(() => {
    if (loaded && discovered.length > 0) {
      saveDiscoveries(discovered);
    }
  }, [discovered, loaded]);

  // ── Discovered elements ──
  const discoveredElements = discovered.map(getElement).filter(Boolean);

  // ── Combine logic ──
  const doCombine = useCallback(
    async (a, b) => {
      if (!a || !b || combining) return;
      setCombining(true);

      const recipe = findRecipe(a, b);
      if (recipe) {
        const resultId = recipe[2];
        const resultEl = getElement(resultId);

        // Flash
        setFlashVisible(true);
        setTimeout(() => setFlashVisible(false), 400);

        // Sparkles
        const wsRect = workspaceRef.current?.getBoundingClientRect();
        if (wsRect) {
          const cx = wsRect.width / 2;
          const cy = wsRect.height / 2;
          const newSparkles = Array.from({ length: 16 }, (_, i) => ({
            id: Date.now() + i,
            x: cx,
            y: cy,
            color: resultEl?.color || '#ffd54f',
            delay: Math.random() * 0.2,
          }));
          setSparkles(newSparkles);
          setTimeout(() => setSparkles([]), 1200);
        }

        // Show result
        setTimeout(() => {
          setNewResult(resultEl);
          setSlot1(null);
          setSlot2(null);

          // Add to discovered
          setDiscovered((prev) => {
            if (prev.includes(resultId)) return prev;
            return [...prev, resultId];
          });

          // Toast for new discovery
          if (!discovered.includes(resultId)) {
            setToast(resultEl);
          }

          setTimeout(() => {
            setNewResult(null);
            setCombining(false);
          }, 1200);
        }, 500);
      } else {
        // No recipe — shake
        setShaking(true);
        setTimeout(() => {
          setShaking(false);
          setSlot1(null);
          setSlot2(null);
          setCombining(false);
        }, 600);
      }
    },
    [combining, discovered]
  );

  // ── Auto-combine when both slots filled ──
  useEffect(() => {
    if (slot1 && slot2 && !combining) {
      const timer = setTimeout(() => doCombine(slot1, slot2), 400);
      return () => clearTimeout(timer);
    }
  }, [slot1, slot2, combining, doCombine]);

  // ── Click-to-place ──
  const handleElementClick = useCallback(
    (id) => {
      if (combining) return;
      if (!slot1) {
        setSlot1(id);
      } else if (!slot2) {
        setSlot2(id);
      } else {
        // Both slots full, replace slot1
        setSlot1(id);
        setSlot2(null);
      }
    },
    [slot1, slot2, combining]
  );

  // ── Pointer drag handlers ──
  const handlePointerDown = useCallback(
    (e, elementId) => {
      if (combining) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setDragPos({ x: e.clientX, y: e.clientY });
      setDragging(elementId);
      dragRef.current = true;

      // Capture pointer
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [combining]
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      if (!dragRef.current) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const onUp = (e) => {
      if (!dragRef.current) return;
      dragRef.current = false;

      // Check if dropped over workspace
      const wsRect = workspaceRef.current?.getBoundingClientRect();
      if (wsRect) {
        const inWs =
          e.clientX >= wsRect.left &&
          e.clientX <= wsRect.right &&
          e.clientY >= wsRect.top &&
          e.clientY <= wsRect.bottom;

        if (inWs) {
          // Check if dropped over a slot
          const s1Rect = slot1Ref.current?.getBoundingClientRect();
          const s2Rect = slot2Ref.current?.getBoundingClientRect();

          const overSlot1 =
            s1Rect &&
            e.clientX >= s1Rect.left &&
            e.clientX <= s1Rect.right &&
            e.clientY >= s1Rect.top &&
            e.clientY <= s1Rect.bottom;

          const overSlot2 =
            s2Rect &&
            e.clientX >= s2Rect.left &&
            e.clientX <= s2Rect.right &&
            e.clientY >= s2Rect.top &&
            e.clientY <= s2Rect.bottom;

          if (overSlot1 || (!slot1 && !overSlot2)) {
            setSlot1(dragging);
          } else if (overSlot2 || (!slot2 && !overSlot1)) {
            setSlot2(dragging);
          } else if (!slot1) {
            setSlot1(dragging);
          } else if (!slot2) {
            setSlot2(dragging);
          }
        } else {
          // Dropped outside — treat as click
          handleElementClick(dragging);
        }
      }

      setDragging(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, slot1, slot2, handleElementClick]);

  // ── Progress ──
  const totalElements = ALL_ELEMENTS.length;
  const discoveredCount = discovered.length;
  const progressPct = Math.round((discoveredCount / totalElements) * 100);

  // ── Grimoire categories ──
  const categorized = {};
  for (const cat of Object.keys(CATEGORIES)) {
    categorized[cat] = ALL_ELEMENTS.filter((el) => el.category === cat);
  }

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: 48 }}
        >
          ⚗️
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        background: '#0a0a1a',
        color: '#fff',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast element={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── Floating Drag Clone ── */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              position: 'fixed',
              left: dragPos.x - dragOffset.x,
              top: dragPos.y - dragOffset.y,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <ElementCard element={getElement(dragging)} isDragging />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 8px',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#fff',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ←
          </motion.button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              ⚗️ The Alchemy Lab
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              Combine elements to discover new ones
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Progress pill */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#ffd54f' }}>
              {discoveredCount}/{totalElements}
            </span>
            <div
              style={{
                width: 60,
                height: 6,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>

          {/* Grimoire toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowGrimoire((p) => !p)}
            style={{
              background: showGrimoire
                ? 'linear-gradient(135deg, #e91e8c33, #b388ff33)'
                : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showGrimoire ? '#e91e8c55' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 12,
              color: '#fff',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📖 Grimoire
          </motion.button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <AnimatePresence mode="wait">
        {showGrimoire ? (
          <motion.div
            key="grimoire"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '12px 20px 20px', overflow: 'auto' }}
          >
            {/* ── Grimoire View ── */}
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: 20,
                maxHeight: 'calc(100vh - 120px)',
                maxHeight: 'calc(100dvh - 120px)',
                overflowY: 'auto',
              }}
            >
              {/* Progress bar */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <span>Collection Progress</span>
                  <span style={{ color: '#ffd54f' }}>
                    {discoveredCount} / {totalElements} ({progressPct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #e91e8c, #b388ff, #ffd54f)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>

              {/* Categories */}
              {Object.entries(CATEGORIES).map(([catId, catMeta]) => {
                const elements = categorized[catId] || [];
                const catDiscovered = elements.filter((el) =>
                  discovered.includes(el.id)
                );
                return (
                  <div key={catId} style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 4,
                          background: catMeta.color,
                          boxShadow: `0 0 8px ${catMeta.color}55`,
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {catMeta.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.4)',
                          fontWeight: 600,
                        }}
                      >
                        {catDiscovered.length}/{elements.length}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      {elements.map((el) => (
                        <ElementCard
                          key={el.id}
                          element={el}
                          locked={!discovered.includes(el.id)}
                          small
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="lab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 90px)',
              height: 'calc(100dvh - 90px)',
              padding: '8px 16px 16px',
              gap: 12,
            }}
          >
            {/* ── Workspace ── */}
            <div
              ref={workspaceRef}
              style={{
                flex: '1 1 0',
                minHeight: 220,
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Grid pattern */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  pointerEvents: 'none',
                }}
              />

              {/* Flash effect */}
              <AnimatePresence>
                {flashVisible && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(circle at center, #ffd54f, transparent 70%)',
                      pointerEvents: 'none',
                      zIndex: 50,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Sparkles */}
              {sparkles.map((s) => (
                <Sparkle key={s.id} x={s.x} y={s.y} color={s.color} delay={s.delay} />
              ))}

              {/* Workspace content */}
              {!slot1 && !slot2 && !newResult ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: 14,
                    fontWeight: 500,
                    zIndex: 1,
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>⚗️</div>
                  <div>Drag or click elements to combine</div>
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>
                    Drop two elements here to discover new ones
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  animate={shaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                  transition={{ duration: 0.5 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 20,
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  {/* Slot 1 */}
                  <div
                    ref={slot1Ref}
                    onClick={() => { if (slot1) setSlot1(null); }}
                    style={{
                      width: 90,
                      height: 100,
                      borderRadius: 16,
                      border: `2px dashed ${slot1 ? 'rgba(233,30,140,0.4)' : 'rgba(255,255,255,0.15)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: slot1
                        ? 'rgba(233,30,140,0.08)'
                        : 'rgba(255,255,255,0.02)',
                      cursor: slot1 ? 'pointer' : 'default',
                      transition: 'all 0.3s',
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {slot1 ? (
                        <motion.div
                          key={slot1}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 10 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <ElementCard element={getElement(slot1)} />
                        </motion.div>
                      ) : (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.3 }}
                          style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)' }}
                        >
                          +
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Plus / Arrow */}
                  <motion.span
                    animate={{ scale: combining ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      fontSize: 24,
                      color: 'rgba(255,255,255,0.3)',
                      fontWeight: 300,
                    }}
                  >
                    {combining ? '⚡' : '+'}
                  </motion.span>

                  {/* Slot 2 */}
                  <div
                    ref={slot2Ref}
                    onClick={() => { if (slot2) setSlot2(null); }}
                    style={{
                      width: 90,
                      height: 100,
                      borderRadius: 16,
                      border: `2px dashed ${slot2 ? 'rgba(179,136,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: slot2
                        ? 'rgba(179,136,255,0.08)'
                        : 'rgba(255,255,255,0.02)',
                      cursor: slot2 ? 'pointer' : 'default',
                      transition: 'all 0.3s',
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {slot2 ? (
                        <motion.div
                          key={slot2}
                          initial={{ scale: 0, rotate: 10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: -10 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <ElementCard element={getElement(slot2)} />
                        </motion.div>
                      ) : (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.3 }}
                          style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)' }}
                        >
                          +
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Result display */}
                  <AnimatePresence>
                    {newResult && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 18,
                        }}
                        style={{
                          position: 'absolute',
                          bottom: -10,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 5, -5, 0] }}
                          transition={{ duration: 0.8 }}
                          style={{ fontSize: 10, color: '#ffd54f', fontWeight: 700 }}
                        >
                          = {newResult.emoji} {newResult.name}!
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* ── Element Shelf ── */}
            <div
              style={{
                flex: '0 0 auto',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.6)',
                    letterSpacing: 0.5,
                  }}
                >
                  YOUR ELEMENTS ({discoveredCount})
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.3)',
                  }}
                >
                  Drag to workspace or click to place
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  maxHeight: 220,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {discoveredElements.map((el) => (
                  <motion.div
                    key={el.id}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <ElementCard
                      element={el}
                      small
                      onPointerDown={(e) => {
                        // Start drag, but also support click
                        handlePointerDown(e, el.id);
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Completion overlay ── */}
      <AnimatePresence>
        {discoveredCount >= totalElements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10,10,26,0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 5000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
              style={{ fontSize: 64 }}
            >
              🏆
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                background: 'linear-gradient(135deg, #ffd54f, #e91e8c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: 28,
                fontWeight: 800,
                margin: 0,
              }}
            >
              Master Alchemist!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 16,
                margin: 0,
                textAlign: 'center',
                maxWidth: 300,
              }}
            >
              You discovered every element. Your curiosity knows no bounds!
            </motion.p>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              style={{
                marginTop: 10,
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                border: 'none',
                borderRadius: 14,
                color: '#fff',
                padding: '12px 32px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to Portal
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
