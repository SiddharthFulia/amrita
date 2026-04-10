'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

const W = 480;
const H = 320;
const GROUND_H = 40;
const GROUND_Y = H - GROUND_H;
const CUBE_SIZE = 28;
const CUBE_X = 80;
const GRAVITY = 0.72;
const JUMP_VEL = -11.8;
const HOLD_BOOST = -0.35;
const MAX_HOLD_FRAMES = 8;
const HITBOX_SHRINK = 4;
const SPEED_INC_INTERVAL = 600;
const SPEED_INC = 0.3;
const SPEED_MAX = 8.5;
const TRAIL_MAX = 12;

/* ── Stage definitions ── */
const STAGES = [
  {
    id: 1, name: 'Stereo Hearts', color: '#e91e8c', colorAlt: '#ff4da6',
    speed: 3.0, minGap: 200, unlockReq: 0,
    patterns: ['spike', 'spike', 'spike', 'spike', 'double_spike'],
    hardPatterns: [],
    bgGrad: ['#12041a', '#1a0828'],
    starThresholds: [100, 300, 600],
  },
  {
    id: 2, name: 'Neon Pulse', color: '#b388ff', colorAlt: '#d1a3ff',
    speed: 3.8, minGap: 170, unlockReq: 0,
    patterns: ['spike', 'spike', 'double_spike', 'block', 'spike_block', 'spike'],
    hardPatterns: [],
    bgGrad: ['#0a0420', '#14082e'],
    starThresholds: [150, 400, 800],
  },
  {
    id: 3, name: 'Electric Dream', color: '#26c6da', colorAlt: '#4dd0e1',
    speed: 4.5, minGap: 150, unlockReq: 500,
    patterns: ['spike', 'double_spike', 'block', 'pillar', 'spike_block', 'gap'],
    hardPatterns: ['double_pillar', 'spike_pillar'],
    bgGrad: ['#041418', '#082028'],
    starThresholds: [200, 500, 1000],
  },
  {
    id: 4, name: 'Inferno', color: '#ff9800', colorAlt: '#ffb74d',
    speed: 5.2, minGap: 130, unlockReq: 1000,
    patterns: ['spike', 'double_spike', 'block', 'pillar', 'spike_block', 'gap', 'triple_spike'],
    hardPatterns: ['triple_spike', 'spike_pillar', 'gap_spike', 'block_spike_block', 'double_pillar'],
    bgGrad: ['#1a0c04', '#281408'],
    starThresholds: [250, 600, 1200],
  },
  {
    id: 5, name: 'Impossible', color: '#ef5350', colorAlt: '#e57373',
    speed: 6.0, minGap: 110, unlockReq: 1500,
    patterns: ['spike', 'double_spike', 'triple_spike', 'block', 'pillar', 'spike_block', 'gap'],
    hardPatterns: ['triple_spike', 'spike_pillar', 'gap_spike', 'block_spike_block', 'double_pillar', 'gap'],
    bgGrad: ['#1a0404', '#280808'],
    starThresholds: [300, 700, 1500],
  },
];

const MUSIC_OPTIONS = [
  { id: 'none', label: 'No Music', icon: '🔇' },
  { id: 'chill', label: 'Chill Beat', icon: '🎵', bpm: 80 },
  { id: 'upbeat', label: 'Upbeat', icon: '🎶', bpm: 120 },
  { id: 'intense', label: 'Intense', icon: '🔊', bpm: 150 },
];

function makeStars(count = 60) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * W * 2,
    y: Math.random() * (GROUND_Y - 40),
    r: 0.5 + Math.random() * 1.8,
    bright: 0.3 + Math.random() * 0.7,
    twinkleSpeed: 0.01 + Math.random() * 0.03,
  }));
}

function makeMountains() {
  const pts = [];
  let x = 0;
  while (x < W * 2 + 100) {
    pts.push({ x, y: GROUND_Y - 30 - Math.random() * 60 });
    x += 40 + Math.random() * 60;
  }
  pts.push({ x: x + 50, y: GROUND_Y });
  return pts;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function createObstaclePattern(type, startX) {
  const obs = [];
  switch (type) {
    case 'spike':
      obs.push({ type: 'spike', x: startX, w: 28, h: 28 }); break;
    case 'double_spike':
      obs.push({ type: 'spike', x: startX, w: 28, h: 28 });
      obs.push({ type: 'spike', x: startX + 30, w: 28, h: 28 }); break;
    case 'triple_spike':
      obs.push({ type: 'spike', x: startX, w: 28, h: 28 });
      obs.push({ type: 'spike', x: startX + 30, w: 28, h: 28 });
      obs.push({ type: 'spike', x: startX + 60, w: 28, h: 28 }); break;
    case 'block':
      obs.push({ type: 'block', x: startX, w: 36, h: 36 }); break;
    case 'pillar':
      obs.push({ type: 'pillar', x: startX, w: 24, h: 70 }); break;
    case 'double_pillar':
      obs.push({ type: 'pillar', x: startX, w: 24, h: 60 });
      obs.push({ type: 'pillar', x: startX + 80, w: 24, h: 75 }); break;
    case 'spike_block':
      obs.push({ type: 'spike', x: startX, w: 28, h: 28 });
      obs.push({ type: 'block', x: startX + 50, w: 36, h: 36 }); break;
    case 'block_spike_block':
      obs.push({ type: 'block', x: startX, w: 32, h: 32 });
      obs.push({ type: 'spike', x: startX + 45, w: 28, h: 28 });
      obs.push({ type: 'block', x: startX + 85, w: 32, h: 32 }); break;
    case 'spike_pillar':
      obs.push({ type: 'spike', x: startX, w: 28, h: 28 });
      obs.push({ type: 'pillar', x: startX + 60, w: 24, h: 65 }); break;
    case 'gap':
      obs.push({ type: 'gap', x: startX, w: 70 }); break;
    case 'gap_spike':
      obs.push({ type: 'gap', x: startX, w: 65 });
      obs.push({ type: 'spike', x: startX + 90, w: 28, h: 28 }); break;
    default:
      obs.push({ type: 'spike', x: startX, w: 28, h: 28 });
  }
  return obs;
}

function getPatternWidth(type) {
  switch (type) {
    case 'spike': return 28;
    case 'double_spike': return 58;
    case 'triple_spike': return 88;
    case 'block': return 36;
    case 'pillar': return 24;
    case 'double_pillar': return 104;
    case 'spike_block': return 86;
    case 'block_spike_block': return 117;
    case 'spike_pillar': return 84;
    case 'gap': return 70;
    case 'gap_spike': return 118;
    default: return 28;
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

/* ── Music Engine using Web Audio API ── */
class MusicEngine {
  constructor() {
    this.ctx = null;
    this.nodes = [];
    this.intervalId = null;
    this.currentMusic = 'none';
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stop() {
    for (const n of this.nodes) {
      try { n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    }
    this.nodes = [];
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentMusic = 'none';
  }

  play(musicId) {
    this.stop();
    if (musicId === 'none') return;
    this.init();
    this.currentMusic = musicId;

    const actx = this.ctx;
    const masterGain = actx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(actx.destination);

    if (musicId === 'chill') {
      this._playChill(actx, masterGain);
    } else if (musicId === 'upbeat') {
      this._playUpbeat(actx, masterGain);
    } else if (musicId === 'intense') {
      this._playIntense(actx, masterGain);
    }
  }

  _playChill(actx, master) {
    // Slow sine bass + hi-hat tick at 80bpm
    const interval = 60000 / 80; // ms per beat
    const bassNotes = [65.41, 82.41, 73.42, 82.41]; // C2, E2, D2, E2
    let beat = 0;

    const tick = () => {
      if (actx.state === 'closed') return;
      const now = actx.currentTime;

      // Bass sine
      const osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = bassNotes[beat % bassNotes.length];
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.45);
      this.nodes.push(osc);

      // Hi-hat (noise burst via high-freq oscillator)
      if (beat % 2 === 1) {
        const hat = actx.createOscillator();
        hat.type = 'square';
        hat.frequency.value = 6000 + Math.random() * 2000;
        const hGain = actx.createGain();
        hGain.gain.setValueAtTime(0.08, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        hat.connect(hGain);
        hGain.connect(master);
        hat.start(now);
        hat.stop(now + 0.06);
        this.nodes.push(hat);
      }

      beat++;
    };

    tick();
    this.intervalId = setInterval(tick, interval);
  }

  _playUpbeat(actx, master) {
    // Square wave alternating notes at 120bpm
    const interval = 60000 / 120;
    const notes = [130.81, 164.81, 196.00, 164.81, 146.83, 130.81, 164.81, 196.00];
    let beat = 0;

    const tick = () => {
      if (actx.state === 'closed') return;
      const now = actx.currentTime;

      const osc = actx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = notes[beat % notes.length];
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.2);
      this.nodes.push(osc);

      // Bass on downbeats
      if (beat % 2 === 0) {
        const bass = actx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = notes[beat % notes.length] / 2;
        const bGain = actx.createGain();
        bGain.gain.setValueAtTime(0.3, now);
        bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        bass.connect(bGain);
        bGain.connect(master);
        bass.start(now);
        bass.stop(now + 0.28);
        this.nodes.push(bass);
      }

      // Hi-hat on every beat
      const hat = actx.createOscillator();
      hat.type = 'square';
      hat.frequency.value = 7000 + Math.random() * 3000;
      const hGain = actx.createGain();
      hGain.gain.setValueAtTime(0.06, now);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      hat.connect(hGain);
      hGain.connect(master);
      hat.start(now);
      hat.stop(now + 0.05);
      this.nodes.push(hat);

      beat++;
    };

    tick();
    this.intervalId = setInterval(tick, interval);
  }

  _playIntense(actx, master) {
    // Fast sawtooth bass + rapid hi-hat at 150bpm
    const interval = 60000 / 150;
    const bassNotes = [98.00, 116.54, 130.81, 116.54, 98.00, 87.31, 98.00, 116.54];
    let beat = 0;

    const tick = () => {
      if (actx.state === 'closed') return;
      const now = actx.currentTime;

      // Sawtooth bass
      const osc = actx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = bassNotes[beat % bassNotes.length];
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.18);
      this.nodes.push(osc);

      // Rapid hi-hat every beat
      const hat = actx.createOscillator();
      hat.type = 'square';
      hat.frequency.value = 8000 + Math.random() * 4000;
      const hGain = actx.createGain();
      hGain.gain.setValueAtTime(0.1, now);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      hat.connect(hGain);
      hGain.connect(master);
      hat.start(now);
      hat.stop(now + 0.04);
      this.nodes.push(hat);

      // Extra sub bass on downbeats
      if (beat % 4 === 0) {
        const sub = actx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = bassNotes[beat % bassNotes.length] / 2;
        const sGain = actx.createGain();
        sGain.gain.setValueAtTime(0.35, now);
        sGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        sub.connect(sGain);
        sGain.connect(master);
        sub.start(now);
        sub.stop(now + 0.35);
        this.nodes.push(sub);
      }

      beat++;
      // Cleanup old nodes periodically
      if (beat % 16 === 0) {
        this.nodes = this.nodes.filter(n => {
          try { return n.context && n.context.state !== 'closed'; } catch { return false; }
        });
      }
    };

    tick();
    this.intervalId = setInterval(tick, interval);
  }

  destroy() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      try { this.ctx.close(); } catch {}
    }
    this.ctx = null;
  }
}

/* ── Helper: localStorage for per-stage best ── */
function getStageBest(stageId) {
  try { return parseInt(localStorage.getItem(`geodash_best_${stageId}`) || '0', 10); } catch { return 0; }
}
function saveStageBest(stageId, score) {
  try { localStorage.setItem(`geodash_best_${stageId}`, String(score)); } catch {}
}

function getStarCount(stageId) {
  const best = getStageBest(stageId);
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage) return 0;
  let stars = 0;
  for (const t of stage.starThresholds) {
    if (best >= t) stars++;
  }
  return stars;
}

function isStageUnlocked(stageId) {
  if (stageId <= 2) return true;
  const prevBest = getStageBest(stageId - 1);
  const stage = STAGES.find(s => s.id === stageId);
  return prevBest >= (stage?.unlockReq || 0);
}

/* ── Main Component ── */
export default function GeoDashPage() {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const rafRef = useRef(null);
  const musicRef = useRef(null);
  const [state, setState] = useState('select'); // 'select' | 'playing' | 'dead'
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [currentStage, setCurrentStage] = useState(null);
  const [selectedMusic, setSelectedMusic] = useState('none');
  const [, forceUpdate] = useState(0);

  // Init music engine
  useEffect(() => {
    musicRef.current = new MusicEngine();
    return () => {
      if (musicRef.current) musicRef.current.destroy();
    };
  }, []);

  const stopMusic = useCallback(() => {
    if (musicRef.current) musicRef.current.stop();
  }, []);

  const startMusic = useCallback(() => {
    if (musicRef.current && selectedMusic !== 'none') {
      musicRef.current.play(selectedMusic);
    }
  }, [selectedMusic]);

  const goToSelect = useCallback(() => {
    stopMusic();
    setState('select');
    setCurrentStage(null);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [stopMusic]);

  const initGame = useCallback((stage, attemptNum) => {
    const hi = getStageBest(stage.id);
    setBest(hi);
    setScore(0);
    setAttempt(attemptNum);
    setCurrentStage(stage);
    gRef.current = {
      stage,
      cube: {
        x: CUBE_X,
        y: GROUND_Y - CUBE_SIZE,
        vy: 0,
        grounded: true,
        rotation: 0,
        onBlock: false,
      },
      speed: stage.speed,
      distance: 0,
      frameCount: 0,
      obstacles: [],
      gaps: [],
      nextSpawn: 250,
      stars: makeStars(),
      mountains: makeMountains(),
      trail: [],
      particles: [],
      dead: false,
      deadTimer: 0,
      flashAlpha: 0,
      hi,
      holding: false,
      holdFrames: 0,
      pulsePhase: 0,
      gridOffset: 0,
      starOffset: 0,
      mountainOffset: 0,
      groundPulse: 0,
      cubeBounce: 0,
      patternIndex: 0,
      difficultyLevel: 0,
    };
    setState('playing');
    startMusic();
  }, [startMusic]);

  const doJump = useCallback(() => {
    const g = gRef.current;
    if (!g || g.dead) return;
    if (g.cube.grounded || g.cube.onBlock) {
      g.cube.vy = JUMP_VEL;
      g.cube.grounded = false;
      g.cube.onBlock = false;
      g.holding = true;
      g.holdFrames = 0;
    }
  }, []);

  const handleInteract = useCallback(() => {
    if (state === 'playing') {
      doJump();
    }
  }, [state, doJump]);

  const handleRelease = useCallback(() => {
    const g = gRef.current;
    if (g) g.holding = false;
  }, []);

  // Canvas event listeners for gameplay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e) => { e.preventDefault(); handleInteract(); };
    const onUp = () => { handleRelease(); };
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInteract();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleRelease();
      }
    };
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleInteract, handleRelease]);

  // ── Game loop ──
  useEffect(() => {
    if (state !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function spawnObstacles(g) {
      if (g.distance < g.nextSpawn) return;
      const stage = g.stage;
      const useHard = stage.hardPatterns.length > 0 && g.difficultyLevel >= 2 && Math.random() < 0.4 + g.difficultyLevel * 0.05;
      const pool = useHard ? stage.hardPatterns : stage.patterns;
      const type = pool[Math.floor(Math.random() * pool.length)];
      const startX = W + 20;
      const newObs = createObstaclePattern(type, startX);
      for (const o of newObs) {
        if (o.type === 'gap') {
          g.gaps.push({ x: o.x, w: o.w });
        } else {
          g.obstacles.push(o);
        }
      }
      const pw = getPatternWidth(type);
      const gapMult = Math.max(0.6, 1 - g.difficultyLevel * 0.04);
      g.nextSpawn = g.distance + pw + stage.minGap * gapMult + Math.random() * 80;
    }

    function checkCollision(g) {
      const cx = g.cube.x + HITBOX_SHRINK;
      const cy = g.cube.y + HITBOX_SHRINK;
      const cw = CUBE_SIZE - HITBOX_SHRINK * 2;
      const ch = CUBE_SIZE - HITBOX_SHRINK * 2;
      const cr = cx + cw;
      const cb = cy + ch;

      for (const gap of g.gaps) {
        if (g.cube.grounded && cx + cw > gap.x + 4 && cx < gap.x + gap.w - 4) {
          return true;
        }
      }

      for (const o of g.obstacles) {
        if (o.type === 'spike') {
          const sx = o.x;
          const sy = GROUND_Y - o.h;
          const sw = o.w;
          const triCx = sx + sw / 2;
          const triBot = GROUND_Y;
          const triTop = sy;
          if (cr > sx + 4 && cx < sx + sw - 4 && cb > sy + 4) {
            const overlapTop = Math.max(cy, triTop);
            const frac = 1 - (overlapTop - triTop) / (triBot - triTop);
            const halfW = (sw / 2) * clamp(frac, 0, 1);
            if (cx + cw / 2 > triCx - halfW && cx + cw / 2 < triCx + halfW) return true;
            if (cb > triBot - 6 && cr > sx + 6 && cx < sx + sw - 6) return true;
          }
        } else if (o.type === 'block') {
          const bx = o.x;
          const by = GROUND_Y - o.h;
          const bw = o.w;
          const bh = o.h;
          if (cr > bx && cx < bx + bw && cb > by && cy < by + bh) {
            if (g.cube.vy >= 0 && cy + ch - g.cube.vy <= by + 4) {
              g.cube.y = by - CUBE_SIZE;
              g.cube.vy = 0;
              g.cube.onBlock = true;
              g.cube.grounded = false;
              return false;
            }
            return true;
          }
        } else if (o.type === 'pillar') {
          const px = o.x;
          const py = GROUND_Y - o.h;
          const pw = o.w;
          const ph = o.h;
          if (cr > px && cx < px + pw && cb > py && cy < py + ph) {
            if (g.cube.vy >= 0 && cy + ch - g.cube.vy <= py + 4) {
              g.cube.y = py - CUBE_SIZE;
              g.cube.vy = 0;
              g.cube.onBlock = true;
              g.cube.grounded = false;
              return false;
            }
            return true;
          }
        }
      }
      return false;
    }

    function die(g) {
      g.dead = true;
      g.deadTimer = 0;
      g.flashAlpha = 0.8;
      const stageColor = g.stage.color;
      const stageAlt = g.stage.colorAlt;
      for (let i = 0; i < 20; i++) {
        g.particles.push({
          x: g.cube.x + CUBE_SIZE / 2,
          y: g.cube.y + CUBE_SIZE / 2,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 3,
          size: 3 + Math.random() * 6,
          life: 1,
          color: Math.random() > 0.5 ? stageColor : stageAlt,
          rotation: Math.random() * Math.PI * 2,
          rv: (Math.random() - 0.5) * 0.3,
        });
      }
      stopMusic();
      const dist = Math.floor(g.distance);
      if (dist > g.hi) {
        g.hi = dist;
        saveStageBest(g.stage.id, dist);
        setBest(dist);
      }
      setScore(dist);
      setTimeout(() => setState('dead'), 1200);
    }

    function update(g) {
      g.frameCount++;
      g.pulsePhase += 0.03;
      g.cubeBounce += 0.08;
      g.groundPulse = 0.6 + 0.4 * Math.sin(g.pulsePhase * 2);

      g.difficultyLevel = Math.floor(g.frameCount / SPEED_INC_INTERVAL);
      g.speed = Math.min(SPEED_MAX, g.stage.speed + g.difficultyLevel * SPEED_INC);

      g.gridOffset = (g.gridOffset + g.speed) % 40;
      g.starOffset += g.speed * 0.15;
      g.mountainOffset += g.speed * 0.4;
      g.distance += g.speed * 0.3;

      if (g.holding && g.holdFrames < MAX_HOLD_FRAMES && !g.cube.grounded && !g.cube.onBlock) {
        g.cube.vy += HOLD_BOOST;
        g.holdFrames++;
      }

      if (!g.cube.grounded) {
        g.cube.vy += GRAVITY;
        g.cube.y += g.cube.vy;
        g.cube.rotation += g.speed * 0.06;
      } else {
        g.cube.rotation = 0;
      }

      if (g.cube.onBlock) {
        let onAny = false;
        const cx = g.cube.x + HITBOX_SHRINK;
        const cw = CUBE_SIZE - HITBOX_SHRINK * 2;
        for (const o of g.obstacles) {
          if (o.type === 'block' || o.type === 'pillar') {
            const bx = o.x;
            const by = GROUND_Y - o.h;
            if (cx + cw > bx && cx < bx + o.w && Math.abs(g.cube.y + CUBE_SIZE - by) < 4) {
              onAny = true;
              break;
            }
          }
        }
        if (!onAny) g.cube.onBlock = false;
      }

      let overGap = false;
      for (const gap of g.gaps) {
        if (g.cube.x + CUBE_SIZE > gap.x + 6 && g.cube.x < gap.x + gap.w - 6) {
          overGap = true;
          break;
        }
      }

      if (!overGap && g.cube.y + CUBE_SIZE >= GROUND_Y) {
        g.cube.y = GROUND_Y - CUBE_SIZE;
        g.cube.vy = 0;
        g.cube.grounded = true;
        g.cube.onBlock = false;
      } else if (overGap && g.cube.y + CUBE_SIZE >= GROUND_Y && g.cube.grounded) {
        g.cube.grounded = false;
        g.cube.vy = 1;
      }

      if (g.cube.y > H + 50) { die(g); return; }

      for (const o of g.obstacles) o.x -= g.speed;
      for (const gap of g.gaps) gap.x -= g.speed;

      g.obstacles = g.obstacles.filter(o => o.x + o.w > -50);
      g.gaps = g.gaps.filter(gap => gap.x + gap.w > -50);

      spawnObstacles(g);

      if (checkCollision(g)) { die(g); return; }

      if (!g.cube.grounded && !g.cube.onBlock) {
        g.trail.push({
          x: g.cube.x + CUBE_SIZE / 2,
          y: g.cube.y + CUBE_SIZE / 2,
          life: 1,
          size: CUBE_SIZE * 0.6,
          rotation: g.cube.rotation,
        });
      }
      g.trail = g.trail.filter(t => { t.life -= 0.06; t.size *= 0.96; return t.life > 0; });
      if (g.trail.length > TRAIL_MAX) g.trail.splice(0, g.trail.length - TRAIL_MAX);

      setScore(Math.floor(g.distance));
    }

    function updateDead(g) {
      g.deadTimer++;
      g.flashAlpha *= 0.92;
      for (const p of g.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life -= 0.018;
        p.rotation += p.rv;
      }
      g.particles = g.particles.filter(p => p.life > 0);
    }

    function drawBg(g) {
      const pulse = 0.02 * Math.sin(g.pulsePhase);
      // Use stage bg gradient colors
      const bg1 = g.stage.bgGrad[0];
      const bg2 = g.stage.bgGrad[1];
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      bgGrad.addColorStop(0, bg1);
      bgGrad.addColorStop(1, bg2);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle pulse overlay
      ctx.fillStyle = `rgba(255,255,255,${Math.abs(pulse) * 0.3})`;
      ctx.fillRect(0, 0, W, H);

      for (const s of g.stars) {
        const sx = ((s.x - g.starOffset) % (W * 2) + W * 2) % (W * 2);
        if (sx > W) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(g.frameCount * s.twinkleSpeed);
        const alpha = s.bright * twinkle;
        ctx.beginPath();
        ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      ctx.beginPath();
      const mOffset = g.mountainOffset % (W * 2);
      let started = false;
      for (const p of g.mountains) {
        const mx = p.x - mOffset;
        const wrapped = ((mx % (W * 2)) + W * 2) % (W * 2) - W * 0.5;
        if (!started) { ctx.moveTo(wrapped, p.y); started = true; }
        else ctx.lineTo(wrapped, p.y);
      }
      ctx.lineTo(W + 10, GROUND_Y);
      ctx.lineTo(-10, GROUND_Y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20, 10, 40, 0.7)';
      ctx.fill();
    }

    function drawGround(g) {
      const stageColor = g.stage.color;
      ctx.fillStyle = '#0d0d2a';
      ctx.fillRect(0, GROUND_Y, W, GROUND_H);

      for (const gap of g.gaps) {
        ctx.fillStyle = '#07071a';
        ctx.fillRect(gap.x, GROUND_Y, gap.w, GROUND_H);
      }

      ctx.strokeStyle = `${stageColor}26`;
      ctx.lineWidth = 1;
      for (let gx = -g.gridOffset; gx < W; gx += 40) {
        let inGap = false;
        for (const gap of g.gaps) {
          if (gx >= gap.x && gx <= gap.x + gap.w) { inGap = true; break; }
        }
        if (inGap) continue;
        ctx.beginPath();
        ctx.moveTo(gx, GROUND_Y);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + GROUND_H / 2);
      ctx.lineTo(W, GROUND_Y + GROUND_H / 2);
      ctx.strokeStyle = `${stageColor}1a`;
      ctx.stroke();

      const glow = g.groundPulse;
      ctx.shadowBlur = 8 * glow;
      ctx.shadowColor = stageColor;
      ctx.strokeStyle = stageColor;
      ctx.lineWidth = 3;

      let drawing = false;
      for (let px = 0; px <= W; px += 1) {
        let inGap = false;
        for (const gap of g.gaps) {
          if (px >= gap.x && px <= gap.x + gap.w) { inGap = true; break; }
        }
        if (inGap) {
          if (drawing) { ctx.stroke(); drawing = false; }
          continue;
        }
        if (!drawing) { ctx.beginPath(); ctx.moveTo(px, GROUND_Y); drawing = true; }
        else ctx.lineTo(px, GROUND_Y);
      }
      if (drawing) ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function drawObstacles(g) {
      const sc = g.stage.color;
      const sa = g.stage.colorAlt;
      for (const o of g.obstacles) {
        if (o.type === 'spike') {
          const sx = o.x;
          const sy = GROUND_Y - o.h;
          ctx.beginPath();
          ctx.moveTo(sx + o.w / 2, sy);
          ctx.lineTo(sx + o.w, GROUND_Y);
          ctx.lineTo(sx, GROUND_Y);
          ctx.closePath();
          const sGrad = ctx.createLinearGradient(sx, sy, sx, GROUND_Y);
          sGrad.addColorStop(0, sa);
          sGrad.addColorStop(1, sc);
          ctx.fillStyle = sGrad;
          ctx.fill();
          ctx.strokeStyle = sa;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.shadowBlur = 6;
          ctx.shadowColor = sc;
          ctx.beginPath();
          ctx.moveTo(sx + o.w / 2, sy);
          ctx.lineTo(sx + o.w - 4, GROUND_Y - 2);
          ctx.lineTo(sx + 4, GROUND_Y - 2);
          ctx.closePath();
          ctx.strokeStyle = `${sc}66`;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (o.type === 'block') {
          const bx = o.x;
          const by = GROUND_Y - o.h;
          const bGrad = ctx.createLinearGradient(bx, by, bx, by + o.h);
          bGrad.addColorStop(0, sa);
          bGrad.addColorStop(1, sc);
          ctx.fillStyle = bGrad;
          roundRect(ctx, bx, by, o.w, o.h, 4);
          ctx.fill();
          ctx.strokeStyle = sa;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          roundRect(ctx, bx + 3, by + 3, o.w - 6, o.h - 6, 2);
          ctx.stroke();
        } else if (o.type === 'pillar') {
          const px = o.x;
          const py = GROUND_Y - o.h;
          const pGrad = ctx.createLinearGradient(px, py, px, py + o.h);
          pGrad.addColorStop(0, sc);
          pGrad.addColorStop(1, sa);
          ctx.fillStyle = pGrad;
          roundRect(ctx, px, py, o.w, o.h, 3);
          ctx.fill();
          ctx.strokeStyle = sa;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function drawTrail(g) {
      for (const t of g.trail) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);
        ctx.globalAlpha = t.life * 0.5;
        ctx.fillStyle = g.stage.color;
        ctx.fillRect(-t.size / 2, -t.size / 2, t.size, t.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function drawCube(g) {
      const bounce = g.cube.grounded ? Math.sin(g.cubeBounce) * 1.5 : 0;
      ctx.save();
      ctx.translate(g.cube.x + CUBE_SIZE / 2, g.cube.y + CUBE_SIZE / 2 + bounce);
      ctx.rotate(g.cube.rotation);

      ctx.shadowBlur = 12;
      ctx.shadowColor = g.stage.color;

      const cGrad = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
      cGrad.addColorStop(0, g.stage.colorAlt);
      cGrad.addColorStop(1, g.stage.color);
      ctx.fillStyle = cGrad;
      roundRect(ctx, -CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE, 5);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      roundRect(ctx, -CUBE_SIZE / 2 + 3, -CUBE_SIZE / 2 + 3, CUBE_SIZE - 6, CUBE_SIZE / 2 - 3, 3);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(-4, -4, 3, 3);
      ctx.fillRect(2, -4, 3, 3);

      ctx.restore();
    }

    function drawParticles(g) {
      for (const p of g.particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function drawHUD(g) {
      // Stage name
      ctx.fillStyle = `${g.stage.color}aa`;
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(g.stage.name.toUpperCase(), W / 2, 18);

      // Score
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = "bold 16px 'Inter', sans-serif";
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(g.distance)}m`, W - 16, 28);

      // Attempt
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = "12px 'Inter', sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText(`Attempt #${attempt}`, 16, 28);

      // Best
      if (g.hi > 0) {
        ctx.fillStyle = `${g.stage.color}99`;
        ctx.font = "12px 'Inter', sans-serif";
        ctx.textAlign = 'right';
        ctx.fillText(`Best: ${g.hi}m`, W - 16, 46);
      }

      // Speed indicator
      const speedPct = ((g.speed - g.stage.speed) / (SPEED_MAX - g.stage.speed)) * 100;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(16, H - 16, 60, 4);
      ctx.fillStyle = g.stage.color;
      ctx.fillRect(16, H - 16, 60 * (clamp(speedPct, 0, 100) / 100), 4);
    }

    function drawFlash(g) {
      if (g.flashAlpha > 0.01) {
        ctx.fillStyle = `${g.stage.color}${Math.floor(g.flashAlpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    function loop() {
      const g = gRef.current;
      if (!g) return;

      if (!g.dead) update(g);
      else updateDead(g);

      drawBg(g);
      drawGround(g);
      drawTrail(g);
      drawObstacles(g);
      if (!g.dead) drawCube(g);
      drawParticles(g);
      drawHUD(g);
      drawFlash(g);

      if (!g.dead) {
        rafRef.current = requestAnimationFrame(loop);
      } else if (g.deadTimer < 80) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [state, attempt, stopMusic]);

  // ── Stage Select rendering ──
  if (state === 'select') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#07071a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: "'Inter', sans-serif",
          color: '#fff',
          padding: '24px 16px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 520, marginBottom: 18 }}>
          <Link
            href="/games"
            style={{
              color: '#b388ff',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: 0.85,
            }}
          >
            &larr; Games
          </Link>
        </div>

        <h1
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Geometry Dash 💕
        </h1>

        {/* Music Picker */}
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            marginBottom: 20,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 12,
            border: '1px solid rgba(179,136,255,0.15)',
          }}
        >
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textAlign: 'center' }}>
            Background Music
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {MUSIC_OPTIONS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMusic(m.id)}
                style={{
                  background: selectedMusic === m.id
                    ? 'rgba(179,136,255,0.25)'
                    : 'rgba(255,255,255,0.05)',
                  border: selectedMusic === m.id
                    ? '1px solid #b388ff'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: selectedMusic === m.id ? '#fff' : 'rgba(255,255,255,0.6)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Cards */}
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 260px)',
            paddingBottom: 20,
          }}
        >
          {STAGES.map((stage) => {
            const unlocked = isStageUnlocked(stage.id);
            const stageBest = getStageBest(stage.id);
            const stars = getStarCount(stage.id);

            return (
              <button
                key={stage.id}
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) initGame(stage, 1);
                }}
                style={{
                  background: unlocked
                    ? `linear-gradient(135deg, ${stage.color}18, ${stage.color}08)`
                    : 'rgba(255,255,255,0.02)',
                  border: unlocked
                    ? `1px solid ${stage.color}44`
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                {/* Stage number circle */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: unlocked
                      ? `linear-gradient(135deg, ${stage.color}, ${stage.colorAlt})`
                      : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: unlocked ? 18 : 20,
                    fontWeight: 'bold',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: unlocked ? `0 0 15px ${stage.color}44` : 'none',
                  }}
                >
                  {unlocked ? stage.id : '🔒'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: unlocked ? '#fff' : 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                    {stage.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: stage.color }}>
                      Speed {stage.speed.toFixed(1)}
                    </span>
                    {unlocked && stageBest > 0 && (
                      <span>Best: {stageBest}m</span>
                    )}
                  </div>
                </div>

                {/* Stars */}
                <div style={{ display: 'flex', gap: 2, fontSize: 16, flexShrink: 0 }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>
                      ⭐
                    </span>
                  ))}
                </div>

                {/* Locked overlay text */}
                {!unlocked && (
                  <div style={{
                    position: 'absolute',
                    right: 16,
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.3)',
                  }}>
                    Need {stage.unlockReq}m on Stage {stage.id - 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 13,
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            maxWidth: 340,
            lineHeight: 1.5,
          }}
        >
          Jump over spikes, blocks, and gaps. Hold Space for higher jumps.
          Speed increases over time!
        </p>
      </div>
    );
  }

  // ── Dead Screen ──
  if (state === 'dead') {
    const stage = currentStage || STAGES[0];
    const stageBest = getStageBest(stage.id);
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#07071a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: "'Inter', sans-serif",
          color: '#fff',
          padding: '24px 16px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 520, marginBottom: 18 }}>
          <Link
            href="/games"
            style={{
              color: '#b388ff',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: 0.85,
            }}
          >
            &larr; Games
          </Link>
        </div>

        <h1
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
            color: stage.color,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Oh no!
        </h1>

        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          {stage.name}
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            width: '100%',
            maxWidth: W,
            borderRadius: 12,
            border: `2px solid ${stage.color}40`,
            imageRendering: 'pixelated',
          }}
        />

        <div style={{
          marginTop: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{ fontSize: 38, fontWeight: 'bold', color: stage.color }}>
            {score}m
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Best: {stageBest}m &middot; Attempt #{attempt}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => initGame(stage, (attempt || 0) + 1)}
            style={{
              background: `linear-gradient(135deg, ${stage.color}, ${stage.colorAlt})`,
              border: 'none',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 0 20px ${stage.color}44`,
            }}
          >
            Try Again
          </button>
          <button
            onClick={goToSelect}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              padding: '12px 20px',
              borderRadius: 10,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Change Stage
          </button>
        </div>
      </div>
    );
  }

  // ── Playing Screen ──
  const stage = currentStage || STAGES[0];
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Inter', sans-serif",
        color: '#fff',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/games"
          style={{
            color: '#b388ff',
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            opacity: 0.85,
          }}
        >
          &larr; Games
        </Link>
        <button
          onClick={goToSelect}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          &larr; Stages
        </button>
      </div>

      <h1
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
          color: stage.color,
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        {stage.name}
      </h1>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: '100%',
          maxWidth: W,
          borderRadius: 12,
          border: `2px solid ${stage.color}40`,
          cursor: 'pointer',
          touchAction: 'manipulation',
          imageRendering: 'pixelated',
        }}
      />

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 32,
          fontSize: 14,
          opacity: 0.5,
        }}
      >
        <span>Score: {score}m</span>
        <span>Best: {best}m</span>
      </div>
    </div>
  );
}
