'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TEXT_PAIRS, tokenize, findDiffs } from '../utils/textPairs';
import { generateMemoryGlitch } from '@/utils/apis';

// ─── Sparkle Particle ──────────────────────────────────────────────────────────
function SparkleParticle({ x, y, onDone }) {
  const particles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      dist: 20 + Math.random() * 30,
      size: 3 + Math.random() * 4,
      delay: Math.random() * 0.1,
    }))
  ).current;

  useEffect(() => {
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', left: x, top: y, pointerEvents: 'none', zIndex: 9999 }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist,
            scale: 0,
          }}
          transition={{ duration: 0.7, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#4caf50' : '#b388ff',
            boxShadow: `0 0 6px ${i % 2 === 0 ? '#4caf50' : '#b388ff'}`,
          }}
        />
      ))}
      {/* Center flash */}
      <motion.div
        initial={{ opacity: 1, scale: 0.5 }}
        animate={{ opacity: 0, scale: 2.5 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #4caf50, transparent)',
          transform: 'translate(-5px, -5px)',
        }}
      />
    </div>
  );
}

// ─── Star Display ───────────────────────────────────────────────────────────────
function Stars({ count, size = 20 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3].map((s) => (
        <span
          key={s}
          style={{
            fontSize: size,
            color: s <= count ? '#ffd700' : 'rgba(255,255,255,0.15)',
            textShadow: s <= count ? '0 0 8px rgba(255,215,0,0.6)' : 'none',
            transition: 'all 0.3s',
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ─── Difficulty Badge ───────────────────────────────────────────────────────────
function DiffBadge({ difficulty }) {
  const colors = {
    easy: { bg: 'rgba(76,175,80,0.2)', border: 'rgba(76,175,80,0.5)', text: '#4caf50' },
    medium: { bg: 'rgba(255,183,77,0.2)', border: 'rgba(255,183,77,0.5)', text: '#ffb74d' },
    hard: { bg: 'rgba(239,83,80,0.2)', border: 'rgba(239,83,80,0.5)', text: '#ef5350' },
  };
  const c = colors[difficulty] || colors.easy;
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      {difficulty}
    </span>
  );
}

// ─── Clickable Word ─────────────────────────────────────────────────────────────
function GlitchedWord({ word, originalWord, isDiff, isFound, onCorrect, onWrong }) {
  const [shake, setShake] = useState(false);
  const ref = useRef(null);

  const handleClick = (e) => {
    if (isFound) return;
    if (isDiff) {
      const rect = ref.current.getBoundingClientRect();
      onCorrect(word, originalWord, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      setShake(true);
      onWrong();
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <motion.span
      ref={ref}
      onClick={handleClick}
      animate={
        shake
          ? { x: [0, -4, 4, -4, 4, 0], color: ['#e0e0e0', '#ef5350', '#ef5350', '#ef5350', '#ef5350', '#e0e0e0'] }
          : isFound
          ? { scale: [1, 1.3, 1], color: '#4caf50' }
          : {}
      }
      transition={shake ? { duration: 0.4 } : { duration: 0.4 }}
      style={{
        display: 'inline-block',
        cursor: isFound ? 'default' : 'pointer',
        padding: '1px 2px',
        borderRadius: 4,
        color: isFound ? '#4caf50' : '#e0e0e0',
        fontWeight: isFound ? 700 : 400,
        textShadow: isFound ? '0 0 8px rgba(76,175,80,0.5)' : 'none',
        background: isFound ? 'rgba(76,175,80,0.1)' : 'transparent',
        transition: 'background 0.3s, text-shadow 0.3s',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {isFound ? originalWord : word}
    </motion.span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function MemoryGlitch({ onBack }) {
  const [screen, setScreen] = useState('select');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [foundDiffs, setFoundDiffs] = useState(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const [levelResults, setLevelResults] = useState({});
  const [dynamicPair, setDynamicPair] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [isDynamic, setIsDynamic] = useState(false);
  const sparkleId = useRef(0);

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const pair = isDynamic ? dynamicPair : TEXT_PAIRS[currentLevel];

  async function generateDynamic(difficulty) {
    setIsGenerating(true);
    setGenerateError('');
    try {
      const response = await generateMemoryGlitch(difficulty);
      const generatedPair = response.data;
      generatedPair.id = `dynamic-${Date.now()}`;
      setDynamicPair(generatedPair);
      setIsDynamic(true);
      setFoundDiffs(new Set());
      setMistakes(0);
      setTimer(0);
      setTimerRunning(true);
      setSparkles([]);
      setScreen('play');
    } catch (requestError) {
      setGenerateError('AI unavailable — try a preset level instead');
    } finally {
      setIsGenerating(false);
    }
  }

  // Compute all diffs for current level
  const allDiffs = useCallback(() => {
    if (!pair) return [];
    const diffs = [];
    pair.original.forEach((line, lineIdx) => {
      const d = findDiffs(line, pair.glitched[lineIdx]);
      d.forEach((wordIdx) => diffs.push(`${lineIdx}-${wordIdx}`));
    });
    return diffs;
  }, [pair]);

  const totalDiffs = allDiffs().length;

  // Check completion
  useEffect(() => {
    if (screen === 'play' && totalDiffs > 0 && foundDiffs.size === totalDiffs) {
      setTimerRunning(false);
      const stars = mistakes < 3 ? 3 : mistakes < 6 ? 2 : 1;
      setLevelResults((prev) => ({
        ...prev,
        [pair.id]: {
          stars,
          time: timer,
          mistakes,
          ...(prev[pair.id] && prev[pair.id].stars > stars ? prev[pair.id] : {}),
        },
      }));
      setTimeout(() => setScreen('complete'), 600);
    }
  }, [foundDiffs.size, totalDiffs, screen, mistakes, timer, pair]);

  const startLevel = (idx) => {
    setIsDynamic(false);
    setDynamicPair(null);
    setCurrentLevel(idx);
    setFoundDiffs(new Set());
    setMistakes(0);
    setTimer(0);
    setTimerRunning(true);
    setSparkles([]);
    setScreen('play');
  };

  const handleCorrect = (word, originalWord, x, y) => {
    // Determine which diff key this is — we need lineIdx and wordIdx
    // This is called from the word component, so we pass the key through
  };

  const handleFoundDiff = (key, x, y) => {
    setFoundDiffs((prev) => new Set([...prev, key]));
    const id = sparkleId.current++;
    setSparkles((prev) => [...prev, { id, x, y }]);
  };

  const handleWrong = () => {
    setMistakes((m) => m + 1);
  };

  const removeSparkle = useCallback((id) => {
    setSparkles((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stars = mistakes < 3 ? 3 : mistakes < 6 ? 2 : 1;

  // ─── LEVEL SELECT ───────────────────────────────────────────────────────────
  if (screen === 'select') {
    return (
      <div style={styles.container}>
        {/* Sparkles */}
        {sparkles.map((s) => (
          <SparkleParticle key={s.id} x={s.x} y={s.y} onDone={() => removeSparkle(s.id)} />
        ))}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.innerContainer}
        >
          {/* Header */}
          <div style={styles.header}>
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={styles.backBtn}
            >
              ← Back
            </motion.button>
            <div style={{ textAlign: 'center' }}>
              <h1 style={styles.title}>The Memory Glitch</h1>
              <p style={styles.subtitle}>Find the words that have been changed in each memory</p>
            </div>
            <div style={{ width: 80 }} />
          </div>

          {/* Level Grid */}
          <div style={styles.levelGrid}>
            {TEXT_PAIRS.map((p, idx) => {
              const result = levelResults[p.id];
              return (
                <motion.button
                  key={p.id}
                  onClick={() => startLevel(idx)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  style={styles.levelCard}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={styles.levelNumber}>Level {idx + 1}</span>
                    <DiffBadge difficulty={p.difficulty} />
                  </div>
                  <h3 style={styles.levelTitle}>{p.title}</h3>
                  <p style={styles.levelInfo}>{p.diffCount} glitches to find</p>
                  {result ? (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stars count={result.stars} size={18} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{formatTime(result.time)}</span>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      <Stars count={0} size={18} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 1, background: 'rgba(179,136,255,0.3)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#b388ff' }}>🤖 AI Generated</span>
              <div style={{ width: 40, height: 1, background: 'rgba(179,136,255,0.3)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
              Fresh text every time — powered by Ollama
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { difficulty: 'easy', label: 'Easy', color: '#4caf50', desc: '3 diffs' },
                { difficulty: 'medium', label: 'Medium', color: '#ff9800', desc: '5 diffs' },
                { difficulty: 'hard', label: 'Hard', color: '#ef5350', desc: '7 diffs' },
              ].map(levelOption => (
                <motion.button
                  key={levelOption.difficulty}
                  onClick={() => generateDynamic(levelOption.difficulty)}
                  disabled={isGenerating}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: '12px 22px', borderRadius: 14, cursor: isGenerating ? 'wait' : 'pointer',
                    background: `${levelOption.color}12`, border: `1px solid ${levelOption.color}40`,
                    color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 13,
                    opacity: isGenerating ? 0.5 : 1,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{levelOption.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{levelOption.desc}</div>
                </motion.button>
              ))}
            </div>
            {isGenerating && (
              <p style={{ fontSize: 12, color: '#b388ff', marginTop: 12 }}>✨ Generating new memory...</p>
            )}
            {generateError && (
              <p style={{ fontSize: 12, color: '#ef5350', marginTop: 12 }}>{generateError}</p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── COMPLETE SCREEN ────────────────────────────────────────────────────────
  if (screen === 'complete') {
    const hasNext = currentLevel < TEXT_PAIRS.length - 1;
    return (
      <div style={styles.container}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ ...styles.glassPanel, maxWidth: 500, textAlign: 'center', padding: 40 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            style={{ fontSize: 48, marginBottom: 16 }}
          >
            {stars === 3 ? '✨' : stars === 2 ? '🌟' : '⭐'}
          </motion.div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Memory Repaired!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: 14 }}>
            You fixed all the glitches in &quot;{pair.title}&quot;
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Stars count={stars} size={32} />
          </motion.div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12, marginBottom: 28, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            <span>Time: {formatTime(timer)}</span>
            <span>Mistakes: {mistakes}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              onClick={() => setScreen('select')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ ...styles.actionBtn, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Level Select
            </motion.button>
            <motion.button
              onClick={() => startLevel(currentLevel)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ ...styles.actionBtn, background: 'rgba(179,136,255,0.2)', border: '1px solid rgba(179,136,255,0.4)' }}
            >
              Retry
            </motion.button>
            {hasNext && (
              <motion.button
                onClick={() => startLevel(currentLevel + 1)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ ...styles.actionBtn, background: 'linear-gradient(135deg, #e91e8c, #b388ff)', border: 'none', color: '#fff' }}
              >
                Next Level →
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── PLAY SCREEN ────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Sparkle effects */}
      <AnimatePresence>
        {sparkles.map((s) => (
          <SparkleParticle key={s.id} x={s.x} y={s.y} onDone={() => removeSparkle(s.id)} />
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={styles.innerContainer}
      >
        {/* HUD */}
        <div style={styles.hud}>
          <motion.button
            onClick={() => { setTimerRunning(false); setScreen('select'); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={styles.backBtn}
          >
            ← Back
          </motion.button>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
              {pair.title}
            </h2>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
              <DiffBadge difficulty={pair.difficulty} />
            </div>
          </div>

          <div style={styles.hudStats}>
            <div style={styles.hudStat}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Found</span>
              <span style={{ color: '#4caf50', fontWeight: 700, fontSize: 16 }}>
                {foundDiffs.size}<span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/{totalDiffs}</span>
              </span>
            </div>
            <div style={styles.hudStat}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Mistakes</span>
              <span style={{ color: mistakes > 0 ? '#ef5350' : 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 16 }}>{mistakes}</span>
            </div>
            <div style={styles.hudStat}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Time</span>
              <span style={{ color: '#b388ff', fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{formatTime(timer)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBarOuter}>
          <motion.div
            animate={{ width: `${(foundDiffs.size / totalDiffs) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            style={styles.progressBarInner}
          />
        </div>

        {/* Panels */}
        <div style={styles.panelsRow}>
          {/* Original Panel */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={styles.glassPanel}
          >
            <div style={styles.panelHeader}>
              <div style={styles.panelHeaderDot('#4caf50')} />
              <span style={styles.panelHeaderText}>Original Memory</span>
            </div>
            <div style={styles.diaryContent}>
              {pair.original.map((line, lineIdx) => (
                <p key={lineIdx} style={styles.diaryLine}>
                  {tokenize(line).map((word, wIdx) => {
                    const key = `${lineIdx}-${wIdx}`;
                    const isThisDiff = findDiffs(line, pair.glitched[lineIdx]).includes(wIdx);
                    const isThisFound = foundDiffs.has(key);
                    return (
                      <span
                        key={wIdx}
                        style={{
                          display: 'inline-block',
                          padding: '1px 3px',
                          borderRadius: 4,
                          color: isThisFound ? '#4caf50' : 'rgba(255,255,255,0.7)',
                          fontWeight: isThisFound ? 700 : 400,
                          textShadow: isThisFound ? '0 0 8px rgba(76,175,80,0.4)' : 'none',
                          background: isThisFound ? 'rgba(76,175,80,0.12)' : 'transparent',
                          textDecoration: isThisFound ? 'underline' : 'none',
                          textDecorationColor: isThisFound ? '#4caf50' : 'transparent',
                          transition: 'all 0.3s',
                        }}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          </motion.div>

          {/* Glitched Panel */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={styles.glassPanel}
          >
            <div style={{ ...styles.panelHeader, background: 'linear-gradient(90deg, rgba(233,30,140,0.12), transparent)' }}>
              <div style={styles.panelHeaderDot('#e91e8c')} />
              <span style={styles.panelHeaderText}>Glitched Memory</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>Click the changed words</span>
            </div>
            <div style={styles.diaryContent}>
              {pair.glitched.map((line, lineIdx) => {
                const origLine = pair.original[lineIdx];
                const diffIndices = findDiffs(origLine, line);
                const origWords = tokenize(origLine);
                return (
                  <p key={lineIdx} style={styles.diaryLine}>
                    {tokenize(line).map((word, wIdx) => {
                      const key = `${lineIdx}-${wIdx}`;
                      const isDiff = diffIndices.includes(wIdx);
                      const isFound = foundDiffs.has(key);
                      return (
                        <React.Fragment key={wIdx}>
                          <GlitchedWord
                            word={word}
                            originalWord={origWords[wIdx] || word}
                            isDiff={isDiff}
                            isFound={isFound}
                            onCorrect={(w, ow, x, y) => handleFoundDiff(key, x, y)}
                            onWrong={handleWrong}
                          />{' '}
                        </React.Fragment>
                      );
                    })}
                  </p>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a1a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '20px 16px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 1200,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: 0,
    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    margin: '4px 0 0 0',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    padding: '8px 16px',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s',
  },
  levelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  levelCard: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '20px 24px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    width: '100%',
    transition: 'all 0.2s',
  },
  levelNumber: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 4px 0',
  },
  levelInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
  },
  hud: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  hudStats: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
  },
  hudStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  progressBarOuter: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 2,
    background: 'linear-gradient(90deg, #4caf50, #b388ff)',
    boxShadow: '0 0 12px rgba(76,175,80,0.4)',
  },
  panelsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    flex: 1,
  },
  glassPanel: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(90deg, rgba(76,175,80,0.08), transparent)',
  },
  panelHeaderDot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 8px ${color}`,
    flexShrink: 0,
  }),
  panelHeaderText: {
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  diaryContent: {
    padding: '20px 24px',
    flex: 1,
  },
  diaryLine: {
    fontFamily: "'Dancing Script', cursive, 'Segoe UI', sans-serif",
    fontSize: 17,
    lineHeight: 2,
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 12px 0',
  },
  actionBtn: {
    padding: '10px 24px',
    borderRadius: 14,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.85)',
    transition: 'all 0.2s',
  },

  // Responsive: media queries handled via @media in a real app,
  // but for inline styles we rely on the grid's auto behavior
};
