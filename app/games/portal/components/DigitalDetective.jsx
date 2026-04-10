'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PASSCODE,
  MESSAGES_INITIAL,
  NOTES,
  SECRET_REWARD,
  APPS,
} from '../utils/detectiveData';
import { sendAIMessage } from '../utils/api';

/* ───────────────────────── tiny helpers ───────────────────────── */

const now = () => {
  const d = new Date();
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

const PHOTO_GRID = [
  { emoji: '🌅', caption: 'That golden hour we shared' },
  { emoji: '🌸', caption: 'Spring blooms, like our love' },
  { emoji: '🐱', caption: 'Cute, just like you' },
  { emoji: '💕', caption: 'Us, always' },
  { emoji: '🌙', caption: 'Late night conversations' },
  { emoji: '✨', caption: 'Every moment with you sparkles' },
];

/* ───────────────────────── slide variants ─────────────────────── */

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

/* ═══════════════════════════════════════════════════════════════ */
/*                     STATUS BAR                                  */
/* ═══════════════════════════════════════════════════════════════ */

function StatusBar() {
  const [time, setTime] = useState(now());
  useEffect(() => {
    const id = setInterval(() => setTime(now()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 18px 4px',
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <span>{time}</span>
      <div
        style={{
          width: 80,
          height: 22,
          background: '#000',
          borderRadius: '0 0 16px 16px',
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
        }}
      />
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 10 }}>WiFi</span>
        <span style={{ fontSize: 10 }}>5G</span>
        <span
          style={{
            display: 'inline-block',
            width: 22,
            height: 10,
            border: '1px solid #fff',
            borderRadius: 3,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 1,
              top: 1,
              width: '70%',
              height: 'calc(100% - 2px)',
              background: '#4caf50',
              borderRadius: 2,
            }}
          />
        </span>
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     HOME SCREEN                                 */
/* ═══════════════════════════════════════════════════════════════ */

function HomeScreen({ onOpenApp }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #0d0d2b 0%, #1a0a2e 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        {APPS.map((app) => (
          <motion.button
            key={app.id}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onOpenApp(app.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20,
              padding: '18px 14px',
              cursor: 'pointer',
              position: 'relative',
              minWidth: 100,
            }}
          >
            <span style={{ fontSize: 36 }}>{app.emoji}</span>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
              {app.name}
            </span>
            {app.badge > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 12,
                  background: '#e91e8c',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {app.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     MESSAGES APP                                */
/* ═══════════════════════════════════════════════════════════════ */

function MessagesApp({ onBack }) {
  const [messages, setMessages] = useState(
    MESSAGES_INITIAL.map((m) => ({ ...m }))
  );
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    const newMsg = { from: 'me', text, time: now() };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setTyping(true);

    try {
      const reply = await sendAIMessage(text, messages);
      setMessages((prev) => [
        ...prev,
        { from: 'them', text: reply, time: now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: 'them', text: "Hmm, something went wrong... try again?", time: now() },
      ]);
    } finally {
      setTyping(false);
    }
  }, [input, messages]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10,5,20,0.95)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(20,10,40,0.8)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#e91e8c',
            fontSize: 20,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ‹
        </motion.button>
        <span style={{ fontSize: 22 }}>🕵️</span>
        <div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
            Mysterious Stranger
          </div>
          <div style={{ color: '#b388ff', fontSize: 11 }}>online</div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.map((m, i) => {
          const isMe = m.from === 'me';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
              }}
            >
              <div
                style={{
                  padding: '9px 14px',
                  borderRadius: isMe
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  background: isMe
                    ? 'linear-gradient(135deg, #e91e8c, #b388ff)'
                    : 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  fontSize: 13,
                  lineHeight: 1.45,
                  border: isMe
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {m.text}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.35)',
                  marginTop: 3,
                  textAlign: isMe ? 'right' : 'left',
                  paddingInline: 6,
                }}
              >
                {m.time}
              </div>
            </motion.div>
          );
        })}

        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              alignSelf: 'flex-start',
              padding: '10px 18px',
              borderRadius: '18px 18px 18px 4px',
              background: 'rgba(255,255,255,0.1)',
              color: '#b388ff',
              fontSize: 18,
              letterSpacing: 4,
            }}
          >
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              ...
            </motion.span>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(20,10,40,0.85)',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleSend}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ▲
        </motion.button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     NOTES APP                                   */
/* ═══════════════════════════════════════════════════════════════ */

function NotesApp({ onBack }) {
  const [selected, setSelected] = useState(null);

  const sorted = [...NOTES].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  if (selected) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10,5,20,0.95)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(20,10,40,0.8)',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setSelected(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#e91e8c',
              fontSize: 20,
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            ‹
          </motion.button>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {selected.pinned && '📌 '}{selected.title}
          </span>
        </div>
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 16,
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              fontFamily: "'Dancing Script', cursive",
            }}
          >
            {selected.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10,5,20,0.95)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(20,10,40,0.8)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#e91e8c',
            fontSize: 20,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ‹
        </motion.button>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
          📝 Notes
        </span>
      </div>
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}
      >
        {sorted.map((note) => (
          <motion.button
            key={note.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected(note)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '14px 16px',
              marginBottom: 8,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {note.pinned && '📌 '}{note.title}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {note.content.split('\n')[0]}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     SECRET / PASSCODE LOCK                      */
/* ═══════════════════════════════════════════════════════════════ */

/* Confetti particle */
function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 300,
    color: ['#e91e8c', '#b388ff', '#ff6fb7', '#fff', '#ffd700', '#ff4081'][
      Math.floor(Math.random() * 6)
    ],
    delay: Math.random() * 0.8,
    size: 4 + Math.random() * 6,
    drift: (Math.random() - 0.5) * 120,
  }));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 30,
      }}
    >
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: p.x, opacity: 1, rotate: 0 }}
          animate={{
            y: 600,
            x: p.x + p.drift,
            opacity: [1, 1, 0],
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: p.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

/* Floating hearts */
function FloatingHearts() {
  const hearts = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 260,
    delay: Math.random() * 2,
    size: 14 + Math.random() * 18,
    duration: 3 + Math.random() * 2,
  }));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ y: 580, x: h.x, opacity: 0, scale: 0.5 }}
          animate={{
            y: -40,
            opacity: [0, 0.9, 0.9, 0],
            scale: [0.5, 1, 1, 0.7],
            x: h.x + (Math.random() - 0.5) * 60,
          }}
          transition={{
            duration: h.duration,
            delay: h.delay,
            repeat: Infinity,
            repeatDelay: 1,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            fontSize: h.size,
          }}
        >
          ❤️
        </motion.div>
      ))}
    </div>
  );
}

function SecretApp({ onBack }) {
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [flash, setFlash] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const handleDigit = (d) => {
    if (unlocked) return;
    const next = digits + d;
    if (next.length <= 4) {
      setDigits(next);

      if (next.length === 4) {
        if (next === PASSCODE) {
          // Correct!
          setFlash(true);
          setTimeout(() => {
            setUnlocked(true);
            setFlash(false);
            setTimeout(() => setShowReward(true), 600);
          }, 800);
        } else {
          // Wrong
          setShake(true);
          setError(true);
          setTimeout(() => {
            setShake(false);
            setError(false);
            setDigits('');
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    if (!unlocked) setDigits((p) => p.slice(0, -1));
  };

  // Passcode screen
  if (!unlocked) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10,5,20,0.95)',
          position: 'relative',
        }}
      >
        {/* Flash overlay */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle, rgba(233,30,140,0.5), rgba(179,136,255,0.4), transparent)',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            background: 'none',
            border: 'none',
            color: '#e91e8c',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ‹
        </motion.button>

        <motion.div
          style={{ fontSize: 48, marginBottom: 12 }}
          animate={{ rotate: shake ? [0, -5, 5, -5, 5, 0] : 0 }}
          transition={{ duration: 0.5 }}
        >
          🔒
        </motion.div>

        <div style={{ color: '#fff', fontSize: 14, marginBottom: 20, fontWeight: 500 }}>
          Enter Passcode
        </div>

        {/* Dots */}
        <motion.div
          style={{ display: 'flex', gap: 16, marginBottom: 8 }}
          animate={{
            x: shake ? [0, -12, 12, -12, 12, -6, 6, 0] : 0,
          }}
          transition={{ duration: 0.5 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: digits.length > i ? [1, 1.3, 1] : 1,
                background:
                  digits.length > i
                    ? error
                      ? '#ff4444'
                      : '#e91e8c'
                    : 'rgba(255,255,255,0.15)',
              }}
              transition={{ duration: 0.2 }}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </motion.div>

        {/* Error text */}
        <div style={{ height: 24, marginBottom: 8 }}>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ color: '#ff4444', fontSize: 12 }}
              >
                Try again
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keypad */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            width: 220,
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((k, i) => {
            if (k === null) return <div key={i} />;
            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.88, background: 'rgba(233,30,140,0.3)' }}
                onClick={() =>
                  k === 'del' ? handleDelete() : handleDigit(String(k))
                }
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  fontSize: k === 'del' ? 16 : 22,
                  fontWeight: 300,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {k === 'del' ? '⌫' : k}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // Unlocked — reward!
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a1a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Confetti />
      <FloatingHearts />

      {/* Lock open animation */}
      <AnimatePresence>
        {!showReward && (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.4, 1.4, 0], rotate: [0, 0, 15, 15] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, times: [0, 0.3, 0.6, 1] }}
            style={{ fontSize: 64, zIndex: 20 }}
          >
            🔓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward card */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 18,
              delay: 0.2,
            }}
            style={{
              background:
                'linear-gradient(145deg, rgba(233,30,140,0.2), rgba(179,136,255,0.15))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(233,30,140,0.4)',
              borderRadius: 24,
              padding: '28px 22px',
              maxWidth: 270,
              textAlign: 'center',
              zIndex: 20,
              boxShadow: '0 0 60px rgba(233,30,140,0.25), 0 0 120px rgba(179,136,255,0.15)',
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: 40, marginBottom: 12 }}
            >
              💖
            </motion.div>
            <div
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 14,
                background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {SECRET_REWARD.title}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                fontFamily: "'Dancing Script', cursive",
              }}
            >
              {SECRET_REWARD.message}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              style={{
                marginTop: 20,
                padding: '8px 24px',
                borderRadius: 20,
                border: 'none',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Phone
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sparkle particles behind reward */}
      {showReward && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <motion.div
              key={i}
              initial={{
                x: 160,
                y: 280,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: 160 + (Math.random() - 0.5) * 300,
                y: 280 + (Math.random() - 0.5) * 400,
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 3,
              }}
              style={{
                position: 'absolute',
                fontSize: 12 + Math.random() * 10,
              }}
            >
              ✨
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     PHOTOS APP                                  */
/* ═══════════════════════════════════════════════════════════════ */

function PhotosApp({ onBack }) {
  const [selected, setSelected] = useState(null);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10,5,20,0.95)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(20,10,40,0.8)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#e91e8c',
            fontSize: 20,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ‹
        </motion.button>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
          🖼️ Photos
        </span>
      </div>

      <div style={{ flex: 1, padding: 12, position: 'relative' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {PHOTO_GRID.map((p, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelected(p)}
              style={{
                aspectRatio: '1',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                cursor: 'pointer',
              }}
            >
              {p.emoji}
            </motion.button>
          ))}
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                cursor: 'pointer',
                borderRadius: 8,
                zIndex: 10,
              }}
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.5 }}
                style={{ fontSize: 80 }}
              >
                {selected.emoji}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  fontFamily: "'Dancing Script', cursive",
                  textAlign: 'center',
                  padding: '0 24px',
                }}
              >
                {selected.caption}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     MAIN COMPONENT                              */
/* ═══════════════════════════════════════════════════════════════ */

export default function DigitalDetective({ onBack }) {
  const [currentApp, setCurrentApp] = useState(null); // null = home
  const [direction, setDirection] = useState(1);

  const openApp = (id) => {
    setDirection(1);
    setCurrentApp(id);
  };

  const goHome = () => {
    setDirection(-1);
    setCurrentApp(null);
  };

  const renderApp = () => {
    switch (currentApp) {
      case 'messages':
        return <MessagesApp onBack={goHome} />;
      case 'notes':
        return <NotesApp onBack={goHome} />;
      case 'lock':
        return <SecretApp onBack={goHome} />;
      case 'photos':
        return <PhotosApp onBack={goHome} />;
      default:
        return <HomeScreen onOpenApp={openApp} />;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Google font for handwriting */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&display=swap');`}</style>

      {/* Back to dashboard */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '8px 16px',
          color: '#b388ff',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          zIndex: 50,
        }}
      >
        ← Dashboard
      </motion.button>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          color: '#fff',
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 20,
          background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
        }}
      >
        🕵️ Digital Detective
      </motion.h2>

      {/* Phone frame */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        style={{
          width: 320,
          height: 568,
          borderRadius: 40,
          background: 'rgba(20,10,40,0.95)',
          border: '3px solid rgba(255,255,255,0.12)',
          boxShadow:
            '0 0 40px rgba(233,30,140,0.15), 0 20px 60px rgba(0,0,0,0.6), inset 0 0 20px rgba(179,136,255,0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Status bar */}
        <StatusBar />

        {/* App content area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentApp || 'home'}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {renderApp()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Home indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '6px 0 10px',
            background: 'transparent',
          }}
        >
          <motion.div
            whileHover={{ width: 140, opacity: 0.7 }}
            style={{
              width: 100,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.25)',
              cursor: currentApp ? 'pointer' : 'default',
            }}
            onClick={currentApp ? goHome : undefined}
          />
        </div>
      </motion.div>

      {/* Hint text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 12,
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        Explore the apps to find clues. Crack the passcode to unlock the secret.
      </motion.p>
    </div>
  );
}
