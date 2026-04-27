'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { textToSpeech } from '@/utils/apis';

const VOICES = [
  { value: 'en-US-Standard-A', label: 'English US - Standard A (Male)', lang: 'en-US' },
  { value: 'en-US-Standard-B', label: 'English US - Standard B (Male)', lang: 'en-US' },
  { value: 'en-US-Standard-C', label: 'English US - Standard C (Female)', lang: 'en-US' },
  { value: 'en-US-Standard-D', label: 'English US - Standard D (Male)', lang: 'en-US' },
  { value: 'en-US-Standard-E', label: 'English US - Standard E (Female)', lang: 'en-US' },
  { value: 'en-US-Standard-F', label: 'English US - Standard F (Female)', lang: 'en-US' },
  { value: 'en-US-Standard-G', label: 'English US - Standard G (Female)', lang: 'en-US' },
  { value: 'en-US-Standard-H', label: 'English US - Standard H (Female)', lang: 'en-US' },
  { value: 'en-US-Standard-I', label: 'English US - Standard I (Male)', lang: 'en-US' },
  { value: 'en-US-Standard-J', label: 'English US - Standard J (Male)', lang: 'en-US' },
  { value: 'en-GB-Standard-A', label: 'English UK - Standard A (Female)', lang: 'en-GB' },
  { value: 'en-GB-Standard-B', label: 'English UK - Standard B (Male)', lang: 'en-GB' },
  { value: 'en-GB-Standard-C', label: 'English UK - Standard C (Female)', lang: 'en-GB' },
  { value: 'en-GB-Standard-D', label: 'English UK - Standard D (Male)', lang: 'en-GB' },
  { value: 'en-IN-Standard-A', label: 'English India - Standard A (Female)', lang: 'en-IN' },
  { value: 'en-IN-Standard-B', label: 'English India - Standard B (Male)', lang: 'en-IN' },
  { value: 'en-IN-Standard-C', label: 'English India - Standard C (Male)', lang: 'en-IN' },
  { value: 'en-IN-Standard-D', label: 'English India - Standard D (Female)', lang: 'en-IN' },
  { value: 'hi-IN-Standard-A', label: 'Hindi India - Standard A (Female)', lang: 'hi-IN' },
  { value: 'hi-IN-Standard-B', label: 'Hindi India - Standard B (Male)', lang: 'hi-IN' },
  { value: 'hi-IN-Standard-C', label: 'Hindi India - Standard C (Male)', lang: 'hi-IN' },
  { value: 'hi-IN-Standard-D', label: 'Hindi India - Standard D (Female)', lang: 'hi-IN' },
];

const QUICK_TEXTS = [
  'I love you',
  "You're beautiful",
  'Miss you so much',
  'Good morning baby',
  'Sweet dreams',
];

export default function TTSPage() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('en-US-Standard-D');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioSrc, setAudioSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [charsUsed, setCharsUsed] = useState(0);
  const [dailyLimit] = useState(50000);
  const [history, setHistory] = useState([]);
  const [particles, setParticles] = useState([]);

  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 25; i++) {
      pts.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        dur: Math.random() * 20 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.25 + 0.05,
      });
    }
    setParticles(pts);
  }, []);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const selectedVoice = VOICES.find(v => v.value === voice);
  const lang = selectedVoice ? selectedVoice.lang : 'en-US';

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setAudioSrc(null);
    setIsPlaying(false);
    setProgress(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const res = await textToSpeech(text.trim(), voice, lang);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      const audioData = res.audio || res.audioContent || res.data;
      if (!audioData) {
        setError('No audio data received');
        setLoading(false);
        return;
      }

      const src = audioData.startsWith('data:') ? audioData : `data:audio/mp3;base64,${audioData}`;
      setAudioSrc(src);

      if (res.charsUsed !== undefined) setCharsUsed(res.charsUsed);
      if (res.usage?.charsUsed !== undefined) setCharsUsed(res.usage.charsUsed);

      const newEntry = { text: text.trim(), src, voice, timestamp: Date.now() };
      setHistory(prev => [newEntry, ...prev].slice(0, 5));

      const audio = new Audio(src);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        if (progressInterval.current) clearInterval(progressInterval.current);
      });

      audio.addEventListener('canplaythrough', () => {
        audio.play();
        setIsPlaying(true);
        progressInterval.current = setInterval(() => {
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
            setCurrentTime(audio.currentTime);
          }
        }, 100);
      }, { once: true });

    } catch (err) {
      setError(err.message || 'Failed to generate speech');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      progressInterval.current = setInterval(() => {
        if (audioRef.current && audioRef.current.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleDownload = () => {
    if (!audioSrc) return;
    const a = document.createElement('a');
    a.href = audioSrc;
    a.download = `tts-${Date.now()}.mp3`;
    a.click();
  };

  const playFromHistory = (entry) => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (progressInterval.current) clearInterval(progressInterval.current);
    }

    setAudioSrc(entry.src);
    setText(entry.text);
    setVoice(entry.voice);
    setProgress(0);
    setCurrentTime(0);

    const audio = new Audio(entry.src);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (progressInterval.current) clearInterval(progressInterval.current);
    });

    audio.play();
    setIsPlaying(true);
    progressInterval.current = setInterval(() => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    }, 100);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07071a',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Floating particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'fixed',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: i % 2 === 0 ? '#e91e8c' : '#b388ff',
          opacity: p.opacity,
          animation: `floatParticle ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      ))}

      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: '-30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(233,30,140,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px 16px 40px',
      }}>
        {/* Back link */}
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#b388ff',
          textDecoration: 'none',
          fontSize: '14px',
          marginBottom: '20px',
          opacity: 0.8,
          transition: 'opacity 0.2s',
        }}>
          ← Back Home
        </Link>

        {/* Header */}
        <h1 style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 'clamp(28px, 6vw, 42px)',
          textAlign: 'center',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🔊 Text to Speech
        </h1>
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          marginBottom: '28px',
        }}>
          Type something sweet and hear it spoken aloud
        </p>

        {/* Textarea */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '16px',
          backdropFilter: 'blur(12px)',
          marginBottom: '16px',
        }}>
          <textarea
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= 200) setText(e.target.value);
            }}
            placeholder="Type your message here..."
            rows={4}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '16px',
              fontFamily: "'Inter', sans-serif",
              resize: 'none',
              lineHeight: '1.6',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '8px',
          }}>
            <span style={{
              fontSize: '12px',
              color: text.length >= 180 ? '#e91e8c' : 'rgba(255,255,255,0.35)',
              transition: 'color 0.2s',
            }}>
              {text.length}/200
            </span>
          </div>
        </div>

        {/* Quick text buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {QUICK_TEXTS.map((qt) => (
            <button
              key={qt}
              onClick={() => setText(qt)}
              style={{
                background: text === qt
                  ? 'linear-gradient(135deg, rgba(233,30,140,0.3), rgba(179,136,255,0.3))'
                  : 'rgba(255,255,255,0.05)',
                border: text === qt
                  ? '1px solid rgba(233,30,140,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '8px 14px',
                color: text === qt ? '#e91e8c' : 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {qt}
            </button>
          ))}
        </div>

        {/* Voice selector */}
        <div style={{
          marginBottom: '16px',
        }}>
          <label style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '8px',
            display: 'block',
          }}>
            Voice
          </label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23b388ff' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6.5 6.5-6.5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              backgroundSize: '12px',
            }}
          >
            <optgroup label="English US" style={{ background: '#12122a', color: '#fff' }}>
              {VOICES.filter(v => v.lang === 'en-US').map(v => (
                <option key={v.value} value={v.value} style={{ background: '#12122a', color: '#fff' }}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="English UK" style={{ background: '#12122a', color: '#fff' }}>
              {VOICES.filter(v => v.lang === 'en-GB').map(v => (
                <option key={v.value} value={v.value} style={{ background: '#12122a', color: '#fff' }}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="English India" style={{ background: '#12122a', color: '#fff' }}>
              {VOICES.filter(v => v.lang === 'en-IN').map(v => (
                <option key={v.value} value={v.value} style={{ background: '#12122a', color: '#fff' }}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Hindi India" style={{ background: '#12122a', color: '#fff' }}>
              {VOICES.filter(v => v.lang === 'hi-IN').map(v => (
                <option key={v.value} value={v.value} style={{ background: '#12122a', color: '#fff' }}>
                  {v.label}
                </option>
              ))}
            </optgroup>
          </select>
          <div style={{
            marginTop: '6px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)',
          }}>
            Language: {lang}
          </div>
        </div>

        {/* Speak button */}
        <button
          onClick={handleGenerate}
          disabled={!text.trim() || loading}
          style={{
            width: '100%',
            padding: '16px',
            background: !text.trim() || loading
              ? 'rgba(255,255,255,0.08)'
              : 'linear-gradient(135deg, #e91e8c, #b388ff)',
            border: 'none',
            borderRadius: '14px',
            color: !text.trim() || loading ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '20px' }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} style={{
                    display: 'inline-block',
                    width: '4px',
                    background: '#fff',
                    borderRadius: '2px',
                    animation: `soundWave 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                  }} />
                ))}
              </span>
              Generating...
            </span>
          ) : (
            <>🔊 Speak</>
          )}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,50,50,0.1)',
            border: '1px solid rgba(255,50,50,0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#ff6b6b',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Audio Player */}
        {audioSrc && !loading && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(12px)',
            marginBottom: '20px',
            animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '14px',
            }}>
              {/* Play/Pause button */}
              <button
                onClick={togglePlayPause}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '20px',
                  color: '#fff',
                  transition: 'transform 0.2s',
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Progress bar */}
              <div style={{ flex: 1 }}>
                <div
                  onClick={handleProgressClick}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                    borderRadius: '3px',
                    transition: 'width 0.1s linear',
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={handleDownload}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  color: '#b388ff',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
                title="Download audio"
              >
                ⬇
              </button>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
          }}>
            Daily usage
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '100px',
              height: '4px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((charsUsed / dailyLimit) * 100, 100)}%`,
                background: charsUsed / dailyLimit > 0.8
                  ? '#ff6b6b'
                  : 'linear-gradient(90deg, #e91e8c, #b388ff)',
                borderRadius: '2px',
                transition: 'width 0.3s',
              }} />
            </div>
            <span style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.35)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {charsUsed.toLocaleString()} / {dailyLimit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '20px',
              color: '#b388ff',
              marginBottom: '12px',
            }}>
              Recent
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((entry, i) => (
                <button
                  key={entry.timestamp}
                  onClick={() => playFromHistory(entry)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#fff',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s',
                    width: '100%',
                  }}
                >
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(233,30,140,0.2), rgba(179,136,255,0.2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    ▶
                  </span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.8)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {entry.text}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.3)',
                      marginTop: '2px',
                    }}>
                      {VOICES.find(v => v.value === entry.voice)?.label || entry.voice}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}>
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes floatParticle {
          0% { transform: translateY(0px) translateX(0px); }
          100% { transform: translateY(-20px) translateX(10px); }
        }

        @keyframes soundWave {
          0% { height: 4px; }
          100% { height: 18px; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        select option {
          background: #12122a !important;
          color: #fff !important;
        }

        textarea::placeholder {
          color: rgba(255,255,255,0.25);
        }

        button:hover {
          opacity: 0.92;
        }

        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(179,136,255,0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
