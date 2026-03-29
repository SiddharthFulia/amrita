'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Web Audio Engine ──────────────────────────────────────────────────────────
function createRain(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 800;
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = 200;
  const gain = ctx.createGain(); gain.gain.value = 0;
  src.connect(lpf); lpf.connect(hpf); hpf.connect(gain); gain.connect(ctx.destination);
  src.start();
  return gain;
}

function createOcean(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 400;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.08; lfoGain.gain.value = 200;
  lfo.connect(lfoGain); lfoGain.connect(lpf.frequency);
  lfo.start();
  const gain = ctx.createGain(); gain.gain.value = 0;
  src.connect(lpf); lpf.connect(gain); gain.connect(ctx.destination);
  src.start();
  return gain;
}

function createWhiteNoise(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const gain = ctx.createGain(); gain.gain.value = 0;
  src.connect(gain); gain.connect(ctx.destination);
  src.start();
  return gain;
}

function createPianoTones(ctx) {
  const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88]; // C4–B4
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const oscs = [];
  notes.forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = 0;
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.3 + Math.random() * 0.2; lfoG.gain.value = 0.3;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    lfo.start(); osc.start();
    osc.connect(g); g.connect(master);
    oscs.push({ osc, g, lfo });
  });
  let i = 0;
  function playNext() {
    const { g } = oscs[i % notes.length];
    g.gain.setTargetAtTime(0.15, ctx.currentTime, 0.05);
    g.gain.setTargetAtTime(0, ctx.currentTime + 1.2, 0.4);
    i++;
    setTimeout(playNext, 1800 + Math.random() * 1200);
  }
  playNext();
  return master;
}

const SOUNDS = [
  { id: 'rain',  label: 'Rain',        emoji: '🌧️', desc: 'Soft rainfall' },
  { id: 'ocean', label: 'Ocean',       emoji: '🌊', desc: 'Gentle waves' },
  { id: 'white', label: 'White Noise', emoji: '🌫️', desc: 'Steady calm' },
  { id: 'piano', label: 'Soft Tones',  emoji: '🎵', desc: 'Floating notes' },
];

const BREATHING = [
  { phase: 'Breathe In', duration: 4000, color: '#e91e8c', scale: 1.4 },
  { phase: 'Hold',       duration: 4000, color: '#b388ff', scale: 1.4 },
  { phase: 'Breathe Out',duration: 4000, color: '#4dd0e1', scale: 1.0 },
];

export default function CalmPage() {
  const ctxRef = useRef(null);
  const gainsRef = useRef({});
  const [active, setActive] = useState(new Set());
  const [volumes, setVolumes] = useState({ rain: 0.5, ocean: 0.5, white: 0.4, piano: 0.45 });
  const [breatheOn, setBreatheOn] = useState(false);
  const [breatheStep, setBreatheStep] = useState(0);
  const [breatheScale, setBreatheScale] = useState(1);
  const breatheRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainsRef.current.rain  = createRain(ctxRef.current);
      gainsRef.current.ocean = createOcean(ctxRef.current);
      gainsRef.current.white = createWhiteNoise(ctxRef.current);
      gainsRef.current.piano = createPianoTones(ctxRef.current);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const toggle = useCallback((id) => {
    getCtx();
    const gain = gainsRef.current[id];
    if (!gain) return;
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        gain.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.5);
      } else {
        next.add(id);
        gain.gain.setTargetAtTime(volumes[id], ctxRef.current.currentTime, 0.5);
      }
      return next;
    });
  }, [getCtx, volumes]);

  const setVol = useCallback((id, val) => {
    setVolumes(prev => ({ ...prev, [id]: val }));
    if (active.has(id) && gainsRef.current[id]) {
      gainsRef.current[id].gain.setTargetAtTime(val, ctxRef.current.currentTime, 0.1);
    }
  }, [active]);

  // Breathing exercise
  useEffect(() => {
    if (!breatheOn) {
      clearTimeout(breatheRef.current);
      setBreatheStep(0); setBreatheScale(1);
      return;
    }
    let step = 0;
    function tick() {
      setBreatheStep(step);
      setBreatheScale(BREATHING[step].scale);
      breatheRef.current = setTimeout(() => {
        step = (step + 1) % BREATHING.length;
        tick();
      }, BREATHING[step].duration);
    }
    tick();
    return () => clearTimeout(breatheRef.current);
  }, [breatheOn]);

  useEffect(() => () => {
    clearTimeout(breatheRef.current);
    if (ctxRef.current) ctxRef.current.close();
  }, []);

  const bStep = BREATHING[breatheStep];

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(179,136,255,0.08) 0%, #07071a 60%)', color: '#fff', fontFamily: "'Inter', sans-serif", padding: '40px 24px 80px', maxWidth: '640px', margin: '0 auto' }}>
      <style>{`
        @keyframes breatheRing { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        .sound-card { transition: border-color 0.2s, background 0.2s, transform 0.15s; }
        .sound-card:hover { transform: translateY(-2px); }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.15); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background: linear-gradient(135deg,#e91e8c,#b388ff); cursor:pointer; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌙</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(24px,5vw,36px)', fontWeight: 700, background: 'linear-gradient(135deg,#b388ff,#e91e8c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 8px' }}>
          Calm Corner
        </h1>
        <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: '18px', color: 'rgba(179,136,255,0.8)', margin: 0 }}>
          a little quiet, just for you
        </p>
      </div>

      {/* Sound mixer */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Ambient Sounds</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px' }}>
          {SOUNDS.map(s => {
            const on = active.has(s.id);
            return (
              <div key={s.id} className="sound-card" style={{ background: on ? 'rgba(233,30,140,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? 'rgba(233,30,140,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '18px 14px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggle(s.id)}
              >
                <div style={{ fontSize: '2rem', marginBottom: '6px', textAlign: 'center' }}>{s.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: '13px', textAlign: 'center', marginBottom: '2px', color: on ? '#fff' : 'rgba(255,255,255,0.7)' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: on ? '12px' : 0 }}>{s.desc}</div>
                {on && (
                  <input type="range" min="0" max="1" step="0.02" value={volumes[s.id]}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setVol(s.id, parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {active.size === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', marginTop: '12px' }}>Tap a sound to play it</p>
        )}
      </div>

      {/* Breathing exercise */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(179,136,255,0.2)', borderRadius: '20px', padding: '28px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'rgba(255,255,255,0.8)', margin: '0 0 6px' }}>Breathing Exercise</h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '0 0 24px' }}>4-4-4 box breathing — calms the nervous system</p>

        {/* Circle */}
        <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 24px' }}>
          {/* Outer ring */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(179,136,255,0.2)', animation: breatheOn ? 'breatheRing 4s ease infinite' : 'none' }} />
          {/* Inner circle */}
          <div style={{
            position: 'absolute', inset: '20px', borderRadius: '50%',
            background: breatheOn ? `radial-gradient(circle, ${bStep.color}30, ${bStep.color}10)` : 'rgba(255,255,255,0.04)',
            border: `2px solid ${breatheOn ? bStep.color + '80' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${breatheScale})`,
            transition: `transform ${breatheOn ? BREATHING[breatheStep].duration : 400}ms ease-in-out, background 0.6s, border-color 0.6s`,
            boxShadow: breatheOn ? `0 0 30px ${bStep.color}40` : 'none',
          }}>
            <div style={{ textAlign: 'center' }}>
              {breatheOn ? (
                <>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: bStep.color }}>{bStep.phase}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{bStep.duration / 1000}s</div>
                </>
              ) : (
                <div style={{ fontSize: '24px' }}>🫧</div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setBreatheOn(v => !v)}
          style={{
            padding: '12px 36px', borderRadius: '50px',
            background: breatheOn ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#b388ff,#e91e8c)',
            border: breatheOn ? '1px solid rgba(255,255,255,0.2)' : 'none',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >{breatheOn ? 'Stop' : 'Start Breathing'}</button>

        {breatheOn && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            {BREATHING.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: breatheStep === i ? b.color : 'rgba(255,255,255,0.3)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: breatheStep === i ? b.color : 'rgba(255,255,255,0.2)' }} />
                {b.phase}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note from Sid */}
      <div style={{ marginTop: '32px', textAlign: 'center', padding: '24px 20px', background: 'rgba(233,30,140,0.05)', border: '1px solid rgba(233,30,140,0.15)', borderRadius: '16px' }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, margin: '0 0 10px' }}>
          "Whatever you're feeling right now is valid. You don't have to fix it, rush it, or explain it.
          Just breathe. I'm always here."
        </p>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: '14px', color: 'rgba(233,30,140,0.6)' }}>— Siddharth 💙</div>
      </div>
    </div>
  );
}
