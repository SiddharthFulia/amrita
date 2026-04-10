'use client';

import Link from 'next/link';
import { useRef, useEffect, useCallback, useState } from 'react';

const W = 320;
const H = 480;
const GROUND_H = 60;
const BIRD_R = 12;
const PIPE_W = 52;
const FLAP_VY = -6;
const TERMINAL_VY = 8;

const LEVELS = {
  easy: {
    name: 'Beginner',
    gap: 160,
    baseSpeed: 1.8,
    speedIncrease: 0.08,
    gravity: 0.28,
    pipeInterval: 220,
    graceDistance: 340,
    description: 'Wide gaps, slow pace',
    storageKey: 'flappy_best_easy',
    pipeColor1: '#0d8a6a',
    pipeColor2: '#14d9a5',
    pipeCap1: '#0b6b52',
    pipeCap2: '#10b88a',
  },
  medium: {
    name: 'Classic',
    gap: 130,
    baseSpeed: 2.2,
    speedIncrease: 0.1,
    gravity: 0.35,
    pipeInterval: 200,
    graceDistance: 320,
    description: 'Like the original',
    storageKey: 'flappy_best_medium',
    pipeColor1: '#b0156d',
    pipeColor2: '#e91e8c',
    pipeCap1: '#7c4dff',
    pipeCap2: '#b388ff',
  },
  hard: {
    name: 'Insane',
    gap: 100,
    baseSpeed: 2.8,
    speedIncrease: 0.12,
    gravity: 0.42,
    pipeInterval: 180,
    graceDistance: 300,
    description: 'Tiny gaps, fast pipes',
    storageKey: 'flappy_best_hard',
    pipeColor1: '#b83200',
    pipeColor2: '#ff5722',
    pipeCap1: '#c62828',
    pipeCap2: '#ff8a65',
  },
};

const COLORS = {
  bg1: '#07071a',
  bg2: '#1a0a2e',
  pink: '#e91e8c',
  purple: '#b388ff',
  pinkDark: '#b0156d',
  purpleDark: '#7c4dff',
  ground1: '#0d0d2b',
  ground2: '#1a0a2e',
  grass: '#2d1b69',
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getMedal(score) {
  if (score >= 100) return '\u{1F451}';
  if (score >= 50) return '\u{1F947}';
  if (score >= 25) return '\u{1F948}';
  if (score >= 10) return '\u{1F949}';
  return '';
}

function createStars(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * (H - GROUND_H - 60),
      r: Math.random() * 1.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    });
  }
  return stars;
}

function createClouds(count) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: Math.random() * W * 1.5,
      y: Math.random() * (H - GROUND_H - 120) + 20,
      w: Math.random() * 60 + 40,
      h: Math.random() * 20 + 10,
      depth: Math.random() * 0.5 + 0.3,
      alpha: Math.random() * 0.04 + 0.02,
    });
  }
  return clouds;
}

export default function FlappyPage() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [uiState, setUiState] = useState('levelSelect');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(null);

  const initState = useCallback(
    (levelKey) => {
      const level = LEVELS[levelKey || 'medium'];
      let savedBest = 0;
      try {
        savedBest = parseInt(localStorage.getItem(level.storageKey) || '0', 10);
      } catch {}
      setBest(savedBest);
      setScore(0);

      return {
        phase: 'idle',
        levelKey: levelKey || 'medium',
        level,
        bird: { x: 80, y: H / 2 - 30, vy: 0, angle: 0 },
        pipes: [],
        hearts: [],
        floatTexts: [],
        score: 0,
        best: savedBest,
        speed: level.baseSpeed,
        distance: 0,
        nextPipe: level.graceDistance,
        groundOffset: 0,
        stars: createStars(50),
        clouds: createClouds(8),
        shakeFrames: 0,
        shakeX: 0,
        shakeY: 0,
        deathFlash: 0,
        scorePop: 0,
        bobT: 0,
        frame: 0,
      };
    },
    []
  );

  const selectLevel = useCallback(
    (levelKey) => {
      setSelectedLevel(levelKey);
      stateRef.current = initState(levelKey);
      setUiState('idle');
    },
    [initState]
  );

  const goToLevelSelect = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stateRef.current = null;
    setSelectedLevel(null);
    setUiState('levelSelect');
    setScore(0);
  }, []);

  useEffect(() => {
    // Don't init state on mount -- wait for level select
  }, []);

  const flap = useCallback(() => {
    if (uiState === 'levelSelect') return;

    const s = stateRef.current;
    if (!s) return;

    if (s.phase === 'idle') {
      s.phase = 'playing';
      s.bird.vy = FLAP_VY;
      setUiState('playing');
      for (let i = 0; i < 3; i++) {
        s.hearts.push({
          x: s.bird.x - 4 + Math.random() * 8,
          y: s.bird.y + 5,
          vy: -1 - Math.random(),
          vx: (Math.random() - 0.5) * 1.5,
          life: 1,
          size: 8 + Math.random() * 4,
        });
      }
    } else if (s.phase === 'playing') {
      s.bird.vy = FLAP_VY;
      for (let i = 0; i < 3; i++) {
        s.hearts.push({
          x: s.bird.x - 4 + Math.random() * 8,
          y: s.bird.y + 5,
          vy: -1 - Math.random(),
          vx: (Math.random() - 0.5) * 1.5,
          life: 1,
          size: 8 + Math.random() * 4,
        });
      }
    } else if (s.phase === 'dead' && s.deadTimer > 30) {
      stateRef.current = initState(s.levelKey);
      stateRef.current.phase = 'idle';
      setUiState('idle');
      setScore(0);
    }
  }, [initState, uiState]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flap]);

  useEffect(() => {
    if (uiState === 'levelSelect') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawBackground(s) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, COLORS.bg1);
      grad.addColorStop(1, COLORS.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const star of s.stars) {
        const twinkle = Math.sin(s.frame * star.speed + star.phase) * 0.5 + 0.5;
        ctx.globalAlpha = twinkle * 0.7 + 0.1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Clouds
      for (const cloud of s.clouds) {
        const cx = ((cloud.x - s.distance * cloud.depth * 0.3) % (W + cloud.w * 2)) - cloud.w;
        ctx.globalAlpha = cloud.alpha;
        ctx.fillStyle = '#b388ff';
        ctx.beginPath();
        ctx.ellipse(cx, cloud.y, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - cloud.w * 0.25, cloud.y + 3, cloud.w * 0.35, cloud.h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + cloud.w * 0.3, cloud.y + 2, cloud.w * 0.3, cloud.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawGround(s) {
      const gy = H - GROUND_H;
      const grad = ctx.createLinearGradient(0, gy, 0, H);
      grad.addColorStop(0, COLORS.grass);
      grad.addColorStop(0.1, COLORS.ground1);
      grad.addColorStop(1, COLORS.ground2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, gy, W, GROUND_H);

      // Grass blades
      ctx.strokeStyle = '#3d2b79';
      ctx.lineWidth = 1.5;
      const offset = s.groundOffset % 20;
      for (let x = -offset; x < W + 20; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.quadraticCurveTo(x + 3, gy - 8, x + 1, gy - 14);
        ctx.stroke();
      }

      // Top border line
      ctx.strokeStyle = COLORS.purple;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawPipe(s, px, gapY) {
      const level = s.level;
      const gap = level.gap;
      const capH = 12;
      const capExtra = 6;

      // Top pipe
      const topH = gapY - gap / 2;
      if (topH > 0) {
        const grad = ctx.createLinearGradient(px, 0, px + PIPE_W, 0);
        grad.addColorStop(0, level.pipeColor1);
        grad.addColorStop(0.5, level.pipeColor2);
        grad.addColorStop(1, level.pipeColor1);
        ctx.fillStyle = grad;

        // Pipe body
        ctx.beginPath();
        ctx.roundRect(px + 2, 0, PIPE_W - 4, topH - capH, [0, 0, 0, 0]);
        ctx.fill();

        // Cap
        const capGrad = ctx.createLinearGradient(px - capExtra, 0, px + PIPE_W + capExtra, 0);
        capGrad.addColorStop(0, level.pipeCap1);
        capGrad.addColorStop(0.3, level.pipeCap2);
        capGrad.addColorStop(0.7, level.pipeCap2);
        capGrad.addColorStop(1, level.pipeCap1);
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.roundRect(px - capExtra, topH - capH, PIPE_W + capExtra * 2, capH, [0, 0, 6, 6]);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ffffff22';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, 0, PIPE_W - 4, topH - capH);
      }

      // Bottom pipe
      const botY = gapY + gap / 2;
      const botH = H - GROUND_H - botY;
      if (botH > 0) {
        const grad2 = ctx.createLinearGradient(px, 0, px + PIPE_W, 0);
        grad2.addColorStop(0, level.pipeColor1);
        grad2.addColorStop(0.5, level.pipeColor2);
        grad2.addColorStop(1, level.pipeColor1);
        ctx.fillStyle = grad2;

        ctx.beginPath();
        ctx.roundRect(px + 2, botY + capH, PIPE_W - 4, botH - capH, [0, 0, 0, 0]);
        ctx.fill();

        // Cap
        const capGrad2 = ctx.createLinearGradient(px - capExtra, 0, px + PIPE_W + capExtra, 0);
        capGrad2.addColorStop(0, level.pipeCap1);
        capGrad2.addColorStop(0.3, level.pipeCap2);
        capGrad2.addColorStop(0.7, level.pipeCap2);
        capGrad2.addColorStop(1, level.pipeCap1);
        ctx.fillStyle = capGrad2;
        ctx.beginPath();
        ctx.roundRect(px - capExtra, botY, PIPE_W + capExtra * 2, capH, [6, 6, 0, 0]);
        ctx.fill();

        ctx.strokeStyle = '#ffffff22';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, botY + capH, PIPE_W - 4, botH - capH);
      }
    }

    function drawBird(s) {
      const b = s.bird;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);

      // Cat emoji
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F431}', 0, 0);

      // Wing flap effect
      if (s.phase === 'playing' && b.vy < 0) {
        ctx.fillStyle = COLORS.pink;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(-8, 4);
        ctx.lineTo(-16, -2);
        ctx.lineTo(-8, -2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    function drawHearts(s) {
      for (const h of s.hearts) {
        ctx.globalAlpha = h.life * 0.8;
        ctx.font = `${h.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2764\uFE0F', h.x, h.y);
      }
      ctx.globalAlpha = 1;
    }

    function drawFloatTexts(s) {
      for (const ft of s.floatTexts) {
        ctx.globalAlpha = ft.life;
        ctx.font = `bold 18px 'Inter', sans-serif`;
        ctx.fillStyle = COLORS.pink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = COLORS.pink;
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    function drawScore(s) {
      if (s.phase !== 'playing') return;
      const pop = 1 + s.scorePop * 0.3;
      ctx.save();
      ctx.translate(W / 2, 50);
      ctx.scale(pop, pop);
      ctx.font = `bold 42px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#00000088';
      ctx.lineWidth = 4;
      ctx.strokeText(s.score, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.score, 0, 0);
      ctx.restore();
    }

    function drawLevelLabel(s) {
      if (s.phase !== 'playing') return;
      ctx.font = `bold 11px 'Inter', sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = s.level.pipeColor2;
      ctx.globalAlpha = 0.7;
      ctx.fillText(s.level.name.toUpperCase(), 10, 10);
      ctx.globalAlpha = 1;
    }

    function drawIdle(s) {
      // Tap to fly
      ctx.font = `bold 28px 'Dancing Script', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.pink;
      ctx.shadowColor = COLORS.pink;
      ctx.shadowBlur = 12;
      ctx.fillText('Tap to Fly!', W / 2, H / 2 - 70);
      ctx.shadowBlur = 0;

      // Tap icon pulsing
      const pulse = Math.sin(s.frame * 0.06) * 0.15 + 1;
      ctx.save();
      ctx.translate(W / 2, H / 2 + 10);
      ctx.scale(pulse, pulse);
      ctx.font = '36px serif';
      ctx.fillText('\u{1F446}', 0, 0);
      ctx.restore();

      // Instructions
      ctx.font = `14px 'Inter', sans-serif`;
      ctx.fillStyle = '#ffffff88';
      ctx.fillText('Click, tap, or press Space', W / 2, H / 2 + 60);

      // Title
      ctx.font = `bold 32px 'Dancing Script', cursive`;
      ctx.fillStyle = COLORS.purple;
      ctx.shadowColor = COLORS.purple;
      ctx.shadowBlur = 10;
      ctx.fillText('Flappy Cat', W / 2, 80);
      ctx.shadowBlur = 0;

      // Cat
      ctx.font = '40px serif';
      ctx.fillText('\u{1F431}', W / 2, 130);

      // Level indicator
      ctx.font = `bold 12px 'Inter', sans-serif`;
      ctx.fillStyle = s.level.pipeColor2;
      ctx.globalAlpha = 0.8;
      ctx.fillText(s.level.name, W / 2, 160);
      ctx.globalAlpha = 1;
    }

    function drawDeathCard(s) {
      if (s.deadTimer < 30) return;
      const slideProgress = clamp((s.deadTimer - 30) / 20, 0, 1);
      const eased = 1 - Math.pow(1 - slideProgress, 3);
      const cardH = 240;
      const cardW = 240;
      const cardX = (W - cardW) / 2;
      const cardY = lerp(H, (H - cardH) / 2 - 10, eased);

      // Card bg
      ctx.fillStyle = '#12123a';
      ctx.strokeStyle = COLORS.purple;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();

      // Inner glow
      const innerGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      innerGrad.addColorStop(0, '#b388ff11');
      innerGrad.addColorStop(1, '#e91e8c11');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();

      // Game Over
      ctx.font = `bold 22px 'Dancing Script', cursive`;
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.pink;
      ctx.fillText('Game Over', W / 2, cardY + 32);

      // Level name
      ctx.font = `bold 11px 'Inter', sans-serif`;
      ctx.fillStyle = s.level.pipeColor2;
      ctx.fillText(s.level.name.toUpperCase(), W / 2, cardY + 50);

      // Score
      ctx.font = `14px 'Inter', sans-serif`;
      ctx.fillStyle = '#ffffff88';
      ctx.fillText('Score', W / 2 - 50, cardY + 72);
      ctx.fillText('Best', W / 2 + 50, cardY + 72);

      ctx.font = `bold 28px 'Inter', sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.score, W / 2 - 50, cardY + 102);
      ctx.fillText(s.best, W / 2 + 50, cardY + 102);

      // Medal
      const medal = getMedal(s.score);
      if (medal) {
        ctx.font = '36px serif';
        ctx.fillText(medal, W / 2, cardY + 100);
      }

      // Divider
      ctx.strokeStyle = '#ffffff22';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 20, cardY + 125);
      ctx.lineTo(cardX + cardW - 20, cardY + 125);
      ctx.stroke();

      // Buttons
      if (s.deadTimer > 50) {
        const btnW = 160;
        const btnH = 36;
        const btnX = (W - btnW) / 2;

        // Play Again button
        const btnY1 = cardY + 138;
        const btnGrad = ctx.createLinearGradient(btnX, btnY1, btnX + btnW, btnY1 + btnH);
        btnGrad.addColorStop(0, COLORS.pink);
        btnGrad.addColorStop(1, COLORS.purpleDark);
        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY1, btnW, btnH, 20);
        ctx.fill();

        ctx.font = `bold 14px 'Inter', sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Play Again', W / 2, btnY1 + btnH / 2);

        // Change Level button
        const btnY2 = cardY + 184;
        ctx.strokeStyle = COLORS.purple;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY2, btnW, btnH, 20);
        ctx.stroke();

        ctx.font = `bold 13px 'Inter', sans-serif`;
        ctx.fillStyle = COLORS.purple;
        ctx.fillText('Change Level', W / 2, btnY2 + btnH / 2);

        // Store button regions for click detection
        s._playAgainBtn = { x: btnX, y: btnY1, w: btnW, h: btnH };
        s._changeLevelBtn = { x: btnX, y: btnY2, w: btnW, h: btnH };
      }
    }

    function update(s) {
      s.frame++;

      if (s.phase === 'idle') {
        s.bobT += 0.04;
        s.bird.y = H / 2 - 30 + Math.sin(s.bobT) * 12;
        s.bird.angle = Math.sin(s.bobT) * 0.1;
        s.groundOffset += 0.5;
        return;
      }

      if (s.phase === 'dead') {
        s.deadTimer = (s.deadTimer || 0) + 1;
        s.deathFlash = Math.max(0, s.deathFlash - 0.05);

        // Bird tumbles down
        if (s.bird.y < H - GROUND_H - BIRD_R) {
          s.bird.vy += s.level.gravity * 0.8;
          s.bird.vy = Math.min(s.bird.vy, TERMINAL_VY);
          s.bird.y += s.bird.vy;
          s.bird.angle += 0.15;
        } else {
          s.bird.y = H - GROUND_H - BIRD_R;
        }
        return;
      }

      // Playing
      const level = s.level;

      s.bird.vy += level.gravity;
      s.bird.vy = Math.min(s.bird.vy, TERMINAL_VY);
      s.bird.y += s.bird.vy;

      // Angle based on velocity
      const targetAngle = clamp(s.bird.vy * 0.08, -0.5, Math.PI / 3);
      s.bird.angle += (targetAngle - s.bird.angle) * 0.2;

      s.distance += s.speed;
      s.groundOffset += s.speed;
      s.scorePop = Math.max(0, s.scorePop - 0.08);

      // Speed increase
      s.speed = level.baseSpeed + Math.floor(s.score / 10) * level.speedIncrease;

      // Spawn pipes
      if (s.distance >= s.nextPipe) {
        const gap = level.gap;
        const minGapY = gap / 2 + 40;
        const maxGapY = H - GROUND_H - gap / 2 - 40;
        const gapY = minGapY + Math.random() * (maxGapY - minGapY);
        s.pipes.push({ x: W + 10, gapY, passed: false });
        s.nextPipe = s.distance + level.pipeInterval;
      }

      // Move pipes
      for (const p of s.pipes) {
        p.x -= s.speed;
      }

      // Remove off-screen pipes
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 20);

      // Check scoring
      for (const p of s.pipes) {
        if (!p.passed && p.x + PIPE_W < s.bird.x) {
          p.passed = true;
          s.score++;
          s.scorePop = 1;
          setScore(s.score);

          // Float text
          s.floatTexts.push({
            x: s.bird.x + 20,
            y: s.bird.y - 20,
            text: '+1',
            life: 1,
          });

          // Screen shake
          s.shakeFrames = 4;

          // Check best
          if (s.score > s.best) {
            s.best = s.score;
            setBest(s.best);
            try {
              localStorage.setItem(level.storageKey, String(s.best));
            } catch {}
          }
        }
      }

      // Update hearts
      for (const h of s.hearts) {
        h.x += h.vx;
        h.y += h.vy;
        h.life -= 0.03;
      }
      s.hearts = s.hearts.filter((h) => h.life > 0);

      // Update float texts
      for (const ft of s.floatTexts) {
        ft.y -= 1.2;
        ft.life -= 0.025;
      }
      s.floatTexts = s.floatTexts.filter((ft) => ft.life > 0);

      // Screen shake
      if (s.shakeFrames > 0) {
        s.shakeX = (Math.random() - 0.5) * 2;
        s.shakeY = (Math.random() - 0.5) * 2;
        s.shakeFrames--;
      } else {
        s.shakeX = 0;
        s.shakeY = 0;
      }

      // Collision: ground
      if (s.bird.y + BIRD_R >= H - GROUND_H) {
        die(s);
        return;
      }

      // Collision: ceiling
      if (s.bird.y - BIRD_R <= 0) {
        s.bird.y = BIRD_R;
        s.bird.vy = 0;
      }

      // Collision: pipes
      const gap = level.gap;
      for (const p of s.pipes) {
        const bx = s.bird.x;
        const by = s.bird.y;
        const br = BIRD_R - 2; // slightly forgiving

        if (bx + br > p.x && bx - br < p.x + PIPE_W) {
          const topPipeBottom = p.gapY - gap / 2;
          const botPipeTop = p.gapY + gap / 2;
          if (by - br < topPipeBottom || by + br > botPipeTop) {
            die(s);
            return;
          }
        }
      }
    }

    function die(s) {
      s.phase = 'dead';
      s.deathFlash = 1;
      s.deadTimer = 0;
      setUiState('dead');
    }

    function render(s) {
      ctx.save();
      ctx.translate(s.shakeX, s.shakeY);

      drawBackground(s);

      // Pipes
      for (const p of s.pipes) {
        drawPipe(s, p.x, p.gapY);
      }

      drawGround(s);
      drawHearts(s);
      drawBird(s);
      drawFloatTexts(s);
      drawScore(s);
      drawLevelLabel(s);

      if (s.phase === 'idle') {
        drawIdle(s);
      }

      if (s.phase === 'dead') {
        drawDeathCard(s);
      }

      // Death flash
      if (s.deathFlash > 0) {
        ctx.globalAlpha = s.deathFlash * 0.3;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-10, -10, W + 20, H + 20);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    function loop() {
      const s = stateRef.current;
      if (!s) return;
      update(s);
      render(s);
      rafRef.current = requestAnimationFrame(loop);
    }

    if (!stateRef.current && selectedLevel) {
      stateRef.current = initState(selectedLevel);
    }
    if (stateRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initState, uiState, selectedLevel]);

  // Handle canvas clicks for Change Level button
  const handleCanvasClick = useCallback(
    (e) => {
      if (uiState === 'levelSelect') return;

      const s = stateRef.current;
      if (!s) return;

      if (s.phase === 'dead' && s.deadTimer > 50 && s._changeLevelBtn) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const btn = s._changeLevelBtn;
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          goToLevelSelect();
          return;
        }
      }

      flap();
    },
    [flap, goToLevelSelect, uiState]
  );

  const handleCanvasTouch = useCallback(
    (e) => {
      e.preventDefault();
      if (uiState === 'levelSelect') return;

      const s = stateRef.current;
      if (!s) return;

      if (s.phase === 'dead' && s.deadTimer > 50 && s._changeLevelBtn) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const mx = (touch.clientX - rect.left) * scaleX;
        const my = (touch.clientY - rect.top) * scaleY;

        const btn = s._changeLevelBtn;
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          goToLevelSelect();
          return;
        }
      }

      flap();
    },
    [flap, goToLevelSelect, uiState]
  );

  // Level select screen
  if (uiState === 'levelSelect') {
    const levelEntries = [
      { key: 'easy', emoji: '\u{1F33F}', accentColor: '#14d9a5' },
      { key: 'medium', emoji: '\u{1F338}', accentColor: '#e91e8c' },
      { key: 'hard', emoji: '\u{1F525}', accentColor: '#ff5722' },
    ];

    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #07071a 0%, #1a0a2e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px', padding: '16px 20px' }}>
          <Link
            href="/games"
            style={{
              color: '#b388ff',
              textDecoration: 'none',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: 0.8,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          >
            <span style={{ fontSize: '18px' }}>&larr;</span> Games
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '8px' }}>
          <div style={{ fontSize: '48px', marginBottom: '4px' }}>{'\u{1F431}'}</div>
          <h1
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '36px',
              color: '#b388ff',
              margin: '0 0 4px 0',
              textShadow: '0 0 20px #b388ff66',
            }}
          >
            Flappy Cat {'\u{1F431}'}
          </h1>
          <p style={{ color: '#ffffff66', fontSize: '14px', margin: 0 }}>Choose your difficulty</p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px 20px',
            width: '100%',
            maxWidth: '340px',
          }}
        >
          {levelEntries.map(({ key, emoji, accentColor }) => {
            const level = LEVELS[key];
            let bestForLevel = 0;
            try {
              bestForLevel = parseInt(localStorage.getItem(level.storageKey) || '0', 10);
            } catch {}
            const medal = getMedal(bestForLevel);

            return (
              <button
                key={key}
                onClick={() => selectLevel(key)}
                style={{
                  background: '#12123a',
                  border: `1.5px solid ${accentColor}44`,
                  borderRadius: '14px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = accentColor;
                  e.currentTarget.style.boxShadow = `0 0 24px ${accentColor}33`;
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${accentColor}44`;
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Subtle gradient overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 60%)`,
                    borderRadius: '14px',
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
                  <div style={{ fontSize: '28px', flexShrink: 0 }}>{emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontFamily: "'Dancing Script', cursive",
                          fontSize: '22px',
                          color: accentColor,
                          fontWeight: 'bold',
                        }}
                      >
                        {level.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#ffffff44',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontWeight: 'bold',
                        }}
                      >
                        {key}
                      </span>
                    </div>
                    <div style={{ color: '#ffffff88', fontSize: '13px', marginBottom: '6px' }}>
                      {level.description}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#ffffff55' }}>
                      <span>Gap: {level.gap}px</span>
                      <span>Speed: {level.baseSpeed}x</span>
                      {bestForLevel > 0 && (
                        <span style={{ color: accentColor }}>
                          Best: {bestForLevel} {medal}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      color: accentColor,
                      fontSize: '20px',
                      flexShrink: 0,
                      opacity: 0.6,
                    }}
                  >
                    {'\u25B6'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: '16px',
            color: '#ffffff33',
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          Click, tap, or press Space to flap
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07071a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '16px 20px',
        }}
      >
        <Link
          href="/games"
          style={{
            color: '#b388ff',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            opacity: 0.8,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
        >
          <span style={{ fontSize: '18px' }}>&larr;</span> Games
        </Link>
      </div>

      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 0 40px #e91e8c33, 0 0 80px #b388ff22',
          border: '1px solid #b388ff33',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasTouch}
      >
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block' }} />
      </div>

      <div
        style={{
          marginTop: '16px',
          color: '#ffffff44',
          fontSize: '12px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {uiState === 'idle' && 'Click or press Space to start'}
        {uiState === 'playing' && `Best: ${best}`}
        {uiState === 'dead' && `Score: ${score} | Best: ${best} ${getMedal(score)}`}
      </div>
    </div>
  );
}
