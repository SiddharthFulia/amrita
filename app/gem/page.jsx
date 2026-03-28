'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Daily seed (same picks all day, changes at midnight) ─────────────────────
function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function seededPick(arr, offset = 0) {
  return arr[(dailySeed() + offset) % arr.length];
}

// ─── Content pools ────────────────────────────────────────────────────────────
const GEM_MESSAGES = [
  "You literally just made the gem happier by clicking it 💎",
  "Every tap is a little love signal. Received. ♥",
  "Did you know gems grow when you give them attention? This one definitely does.",
  "The gem says: you're doing amazing and it knows things.",
  "Siddharth programmed this gem to adore you. Mission accomplished.",
  "This gem has seen you on your worst days. Still thinks you're brilliant.",
  "Current gem status: completely in awe of you.",
  "You clicked it! The gem is vibrating with happiness rn 🌟",
  "Scientifically speaking, you are the rarest gem in any room you walk into.",
  "The gem wanted you to know: today is a good day because you're in it.",
  "Tap again. Go on. The gem loves this.",
  "Fun gem fact: it only shines this bright when Amrita is around.",
];

const DAILY_DISCOVERIES = [
  { emoji: '🌙', title: 'Moon phase for you', body: "Tonight's moon is thinking about you. (All moons are, honestly.)" },
  { emoji: '🌸', title: 'Today\'s flower', body: 'Cherry blossom — beautiful, fleeting, and impossible not to notice. Just like you.' },
  { emoji: '⭐', title: 'Your star word', body: '"Luminous" — having a steady, suffused glow. Yes, that\'s you.' },
  { emoji: '🎵', title: 'Vibe of the day', body: 'Cozy afternoon playlist energy. Warm drink. Soft blanket. Zero obligations.' },
  { emoji: '🦋', title: 'Daily creature', body: 'The butterfly — transformed, free, and way more graceful than it gives itself credit for.' },
  { emoji: '☁️', title: 'Cloud type today', body: 'Cirrus — high up, soft, and catching the light in a way that stops people in their tracks.' },
  { emoji: '🍃', title: 'Nature note', body: 'Trees communicate through their roots. You communicate through your laugh. Both are magic.' },
  { emoji: '🌊', title: 'Ocean message', body: 'The ocean wants you to know: tides go out, but they always come back. So does good.' },
  { emoji: '🔮', title: 'Gem\'s prediction', body: 'Today holds something small but lovely. Keep your eyes open for it.' },
  { emoji: '🕊️', title: 'Peaceful thought', body: 'You don\'t have to earn rest. You just have to take it.' },
  { emoji: '🌺', title: 'Hibiscus wisdom', body: 'Blooms fully for just one day — and makes it count. You do this too.' },
  { emoji: '✨', title: 'Spark of the day', body: 'Something you do effortlessly would take someone else years to learn.' },
];

const DAILY_CHALLENGES = [
  "Look in the mirror and say one kind thing — out loud. It counts.",
  "Send a voice note to someone you haven't talked to in a while.",
  "Eat something you actually love today, no guilt attached.",
  "Spend 5 minutes doing absolutely nothing. Just existing. You're allowed.",
  "Write down 3 things that went okay today. Even tiny ones.",
  "Stretch gently — your body has been carrying a lot lately.",
  "Put on a song that makes you feel like the main character.",
  "Drink an extra glass of water. Boring but your future self will feel it.",
  "Name one thing you're looking forward to, no matter how small.",
  "Give yourself credit for something you've been dismissing.",
  "Step outside for 2 minutes, even just on a balcony. Sky hits different.",
  "Text Siddharth something random. He loves hearing from you.",
  "Do one thing today purely because it brings you joy.",
  "Let yourself laugh at something silly. Fully. No holding back.",
  "Notice one beautiful thing around you that you'd normally walk past.",
];

const MOODS = [
  { emoji: '😊', label: 'Good', response: "That's my favourite update. Protect that energy today — it deserves to be held carefully. ♥" },
  { emoji: '😐', label: 'Okay', response: "Okay is valid. Okay is honest. I'm glad you're here, even on an okay day. 🤍" },
  { emoji: '😔', label: 'Low', response: "I wish I could be there right now. Come sit with the gem for a while — it won't rush you. You don't have to be okay yet. ♥" },
  { emoji: '😤', label: 'Stressed', response: "Put it all down for 3 minutes. Just 3. The problems will still be there — but so will you, slightly less on fire. 💙" },
  { emoji: '😴', label: 'Tired', response: "Rest is not laziness. Rest is maintenance. You are worth maintaining. Sleep if you need to. 🌙" },
  { emoji: '🥰', label: 'Loved', response: "Good. You should feel that way every day. And honestly? You deserve even more of it. 💝" },
];

const SECRET_MESSAGE = `Amrita,

If you found this... you tapped the gem a lot. And somehow that feels very you.

I want you to know something I don't say nearly enough:

The version of you that shows up on hard days — exhausted, uncertain, holding it together by a thread — that version is just as worthy of love as every other version.

You don't have to be at your best for me. You don't have to perform happiness or pretend you're fine.

I love the whole thing. All of it.

That's not going to change.

— Siddharth ♥`;

const LEVEL_COLORS = ['#e91e8c','#e91e8c','#ff6baa','#ff6baa','#ffd700','#ffd700','#00e5ff','#00e5ff','#b388ff','#ff6baa'];

export default function GemPage() {
  const mountRef = useRef(null);
  const sceneDataRef = useRef({});
  const [level, setLevel] = useState(() => {
    try { return parseInt(localStorage.getItem('gem_level') || '1', 10); } catch { return 1; }
  });
  const [configurable, setConfigurable] = useState(false);

  // Interactions
  const [clickCount, setClickCount] = useState(0);
  const [gemMessage, setGemMessage] = useState('');
  const [showGemMsg, setShowGemMsg] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [levelAffirmation, setLevelAffirmation] = useState('');
  const [showLevelAff, setShowLevelAff] = useState(false);

  // Mood
  const [selectedMood, setSelectedMood] = useState(null);

  // Daily
  const discovery = seededPick(DAILY_DISCOVERIES);
  const challenge = seededPick(DAILY_CHALLENGES, 5);

  // Three.js scene
  useEffect(() => {
    let renderer, animFrameId;
    const container = mountRef.current;
    if (!container) return;

    import('three').then(THREE => {
      const W = container.clientWidth || 360;
      const H = 360;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
      camera.position.set(0, 0, 5);

      // Gem
      const gemGeo = new THREE.OctahedronGeometry(1.5, 0);
      const targetColor = new THREE.Color(LEVEL_COLORS[level - 1] || '#e91e8c');
      const gemMat = new THREE.MeshPhongMaterial({
        color: targetColor.clone(),
        shininess: 200,
        specular: new THREE.Color('#ffffff'),
        transparent: true,
        opacity: 0.92,
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      scene.add(gem);

      // Wireframe overlay
      const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.06 });
      const wire = new THREE.Mesh(gemGeo, wireMat);
      scene.add(wire);

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambient);
      const pinkLight = new THREE.PointLight(0xe91e8c, 3, 10);
      const purpleLight = new THREE.PointLight(0xb388ff, 2, 10);
      scene.add(pinkLight, purpleLight);

      // Particles
      const particleCount = 60;
      const positions = new Float32Array(particleCount * 3);
      const particleVels = Array.from({ length: particleCount }, () => ({
        x: (Math.random() - 0.5) * 0.012,
        y: (Math.random() - 0.5) * 0.012,
        z: (Math.random() - 0.5) * 0.012,
        ox: (Math.random() - 0.5) * 3.5,
        oy: (Math.random() - 0.5) * 3.5,
        oz: (Math.random() - 0.5) * 3.5,
      }));
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = particleVels[i].ox;
        positions[i * 3 + 1] = particleVels[i].oy;
        positions[i * 3 + 2] = particleVels[i].oz;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({ color: 0xe91e8c, size: 0.06, transparent: true, opacity: 0.7 });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // Pulse state
      let pulseScale = 1;
      let pulsing = false;
      let pulseDir = 1;

      sceneDataRef.current = {
        gem, gemMat, particles, particleGeo, positions, particleVels,
        pinkLight, purpleLight, targetColor,
        triggerPulse: () => {
          pulsing = true;
          pulseDir = 1;
          pulseScale = 1;
        },
      };

      let t = 0;
      function animate() {
        animFrameId = requestAnimationFrame(animate);
        t += 0.01;

        gem.rotation.x += 0.005;
        gem.rotation.y += 0.009;
        wire.rotation.x = gem.rotation.x;
        wire.rotation.y = gem.rotation.y;

        // Lights orbit
        pinkLight.position.set(Math.cos(t) * 3, Math.sin(t * 0.7) * 2, Math.sin(t) * 3);
        purpleLight.position.set(Math.cos(t + Math.PI) * 3, Math.sin(t * 0.5) * 2, Math.sin(t + Math.PI) * 3);

        // Color lerp toward target
        gemMat.color.lerp(sceneDataRef.current.targetColor, 0.03);
        particleMat.color.lerp(sceneDataRef.current.targetColor, 0.03);

        // Pulse animation
        if (pulsing) {
          pulseScale += pulseDir * 0.08;
          if (pulseScale > 1.35) pulseDir = -1;
          if (pulseScale <= 1.0) { pulseScale = 1; pulsing = false; }
          gem.scale.setScalar(pulseScale);
          wire.scale.setScalar(pulseScale);
        }

        // Particles drift
        for (let i = 0; i < particleCount; i++) {
          const v = particleVels[i];
          v.ox += v.x; v.oy += v.y; v.oz += v.z;
          const dist = Math.sqrt(v.ox ** 2 + v.oy ** 2 + v.oz ** 2);
          if (dist > 3.5) { v.ox *= 0.5; v.oy *= 0.5; v.oz *= 0.5; }
          positions[i * 3] = v.ox;
          positions[i * 3 + 1] = v.oy;
          positions[i * 3 + 2] = v.oz;
        }
        particleGeo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
      }
      animate();
    });

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update gem color when level changes
  useEffect(() => {
    const d = sceneDataRef.current;
    if (d.targetColor) d.targetColor.set(LEVEL_COLORS[level - 1] || '#e91e8c');
  }, [level]);

  const handleGemClick = () => {
    const d = sceneDataRef.current;
    if (d.triggerPulse) d.triggerPulse();

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount === 7 && !secretRevealed) {
      setShowSecret(true);
      return;
    }

    const msg = GEM_MESSAGES[(newCount - 1) % GEM_MESSAGES.length];
    setGemMessage(msg);
    setShowGemMsg(true);
    setTimeout(() => setShowGemMsg(false), 3500);
  };

  const handleLevelChange = (newLevel) => {
    setLevel(newLevel);
    try { localStorage.setItem('gem_level', newLevel); } catch (_) {}
    const LEVEL_AFFIRMATIONS = [
      "You've started. That's everything. ✨",
      "Look how far you've already come 💫",
      "You're building something beautiful.",
      "Every step counts, even the small ones.",
      "You're glowing, and it shows 💎",
      "Halfway there, and already shining.",
      "Stronger than yesterday. Every single day.",
      "Almost there — keep going, love.",
      "You're unstoppable. I genuinely mean that.",
      "Level 10. You did it. I'm so proud of you. ♥",
    ];
    setLevelAffirmation(LEVEL_AFFIRMATIONS[newLevel - 1]);
    setShowLevelAff(true);
    setTimeout(() => setShowLevelAff(false), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 20px 80px', maxWidth: '600px', margin: '0 auto' }}>
      <style>{`
        @keyframes floatUp { 0%{opacity:0;transform:translateY(0)} 20%{opacity:1} 80%{opacity:1;transform:translateY(-40px)} 100%{opacity:0;transform:translateY(-60px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes secret-reveal { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 700,
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0,
        }}>💎 Your Gem</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", fontSize: '13px', margin: '6px 0 0' }}>
          tap it · discover things · check in
        </p>
      </div>

      {/* Gem canvas */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <div
          ref={mountRef}
          onClick={handleGemClick}
          style={{ width: '100%', height: '360px', cursor: 'pointer', borderRadius: '20px', overflow: 'hidden' }}
        />
        {/* Click hint */}
        {clickCount === 0 && (
          <div style={{
            position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center',
            color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '12px',
            animation: 'floatUp 3s ease-in-out infinite',
          }}>tap the gem ✨</div>
        )}
        {/* Gem message popup */}
        {showGemMsg && (
          <div style={{
            position: 'absolute', bottom: '24px', left: '16px', right: '16px',
            background: 'rgba(13,13,43,0.92)', border: '1px solid rgba(233,30,140,0.3)',
            borderRadius: '14px', padding: '14px 18px',
            fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
            fontSize: '14px', color: 'rgba(255,255,255,0.88)', textAlign: 'center',
            animation: 'fadeIn 0.3s ease',
            backdropFilter: 'blur(8px)',
          }}>{gemMessage}</div>
        )}
        {/* Level affirmation popup */}
        {showLevelAff && (
          <div style={{
            position: 'absolute', top: '24px', left: '16px', right: '16px',
            background: 'linear-gradient(135deg, rgba(233,30,140,0.15), rgba(179,136,255,0.15))',
            border: '1px solid rgba(179,136,255,0.4)',
            borderRadius: '14px', padding: '14px 18px',
            fontFamily: "'Dancing Script', cursive", fontSize: '18px',
            color: '#fff', textAlign: 'center',
            animation: 'fadeIn 0.3s ease',
          }}>{levelAffirmation}</div>
        )}
      </div>

      {/* Click counter */}
      {clickCount > 0 && (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', sans-serif", fontSize: '12px' }}>
            {clickCount < 7 ? `tapped ${clickCount} time${clickCount !== 1 ? 's' : ''} · ${7 - clickCount} until something special...` : '✨ you found the secret'}
          </span>
        </div>
      )}

      {/* Level controls */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px', padding: '20px', marginBottom: '20px', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontSize: '12px' }}>Your level</span>
          <button
            onClick={() => setConfigurable(c => !c)}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              color: 'rgba(255,255,255,0.3)', fontSize: '11px', padding: '3px 10px',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >{configurable ? 'lock' : 'change'}</button>
        </div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: '48px', fontWeight: 700,
          background: `linear-gradient(135deg, ${LEVEL_COLORS[level - 1]}, #b388ff)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          lineHeight: 1, marginBottom: '8px',
        }}>{level}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: configurable ? '16px' : 0 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: i < level ? (LEVEL_COLORS[level - 1] || '#e91e8c') : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>
        {configurable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => level > 1 && handleLevelChange(level - 1)} style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: '18px', cursor: level > 1 ? 'pointer' : 'not-allowed',
              opacity: level > 1 ? 1 : 0.3,
            }}>−</button>
            <input type="range" min={1} max={10} value={level}
              onChange={e => handleLevelChange(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#e91e8c', maxWidth: '160px' }}
            />
            <button onClick={() => level < 10 && handleLevelChange(level + 1)} style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: '18px', cursor: level < 10 ? 'pointer' : 'not-allowed',
              opacity: level < 10 ? 1 : 0.3,
            }}>+</button>
          </div>
        )}
      </div>

      {/* Today's Discovery */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(233,30,140,0.06), rgba(179,136,255,0.06))',
        border: '1px solid rgba(233,30,140,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '28px' }}>{discovery.emoji}</span>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Today's discovery</div>
            <div style={{ color: '#fff', fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 600 }}>{discovery.title}</div>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
          {discovery.body}
        </p>
      </div>

      {/* Today's Challenge */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(179,136,255,0.2)',
        borderRadius: '16px', padding: '20px', marginBottom: '16px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
          today's challenge from sid
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '20px', marginTop: '2px' }}>🎯</span>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontFamily: "'Inter', sans-serif", fontSize: '14px', lineHeight: 1.65, margin: 0 }}>
            {challenge}
          </p>
        </div>
      </div>

      {/* Mood check-in */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px', padding: '20px', marginBottom: '16px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontSize: '12px', marginBottom: '14px', textAlign: 'center' }}>
          How are you feeling today?
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: selectedMood ? '16px' : 0 }}>
          {MOODS.map(mood => (
            <button key={mood.label} onClick={() => setSelectedMood(mood.label === selectedMood?.label ? null : mood)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                background: selectedMood?.label === mood.label ? 'rgba(233,30,140,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedMood?.label === mood.label ? 'rgba(233,30,140,0.5)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.2s ease',
              }}>
              <span style={{ fontSize: '22px' }}>{mood.emoji}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", fontSize: '11px' }}>{mood.label}</span>
            </button>
          ))}
        </div>
        {selectedMood && (
          <div style={{
            background: 'rgba(233,30,140,0.06)', border: '1px solid rgba(233,30,140,0.2)',
            borderRadius: '12px', padding: '14px 16px', animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontSize: '11px', marginBottom: '6px' }}>
              Sid says —
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              {selectedMood.response}
            </p>
          </div>
        )}
      </div>

      {/* Secret message modal */}
      {showSecret && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'rgba(13,13,43,0.98)', border: '1px solid rgba(233,30,140,0.3)',
            borderRadius: '24px', padding: '36px 28px', maxWidth: '480px', width: '100%',
            animation: 'secret-reveal 0.4s ease',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔮</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Dancing Script', cursive", fontSize: '16px' }}>
                you found it
              </div>
            </div>
            <pre style={{
              fontFamily: "'Playfair Display', serif", fontSize: '14px', lineHeight: 1.9,
              color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              margin: '0 0 24px',
            }}>{SECRET_MESSAGE}</pre>
            <button onClick={() => { setShowSecret(false); setSecretRevealed(true); }} style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              border: 'none', color: '#fff', fontSize: '14px',
              fontFamily: "'Inter', sans-serif", fontWeight: 600, cursor: 'pointer',
            }}>I'll keep this ♥</button>
          </div>
        </div>
      )}
    </div>
  );
}
