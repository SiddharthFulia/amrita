'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ───────────────────────────────────────────
   8 ORIGINAL SONGS  –  all lyrics written fresh
   ─────────────────────────────────────────── */
const SONGS = [
  {
    id: 1,
    title: 'Stars & Us',
    artist: 'Original',
    emoji: '🌟',
    duration: 48,
    lines: [
      { text: 'Lying on the rooftop, counting lights above', startTime: 0, endTime: 5 },
      { text: 'Every constellation spells out our love', startTime: 5, endTime: 10 },
      { text: 'The moon is blushing pink tonight', startTime: 10, endTime: 15 },
      { text: 'And the stars are holding on so tight', startTime: 15, endTime: 20 },
      { text: 'I found my universe in your eyes', startTime: 20, endTime: 25 },
      { text: 'No telescope needed, no disguise', startTime: 25, endTime: 30 },
      { text: 'Galaxies could never compare', startTime: 30, endTime: 35 },
      { text: 'To lying here beside you, under open air', startTime: 35, endTime: 40 },
      { text: 'So let the comets fall and the planets spin', startTime: 40, endTime: 44 },
      { text: 'The only star I need is the one I\'m in... with you', startTime: 44, endTime: 48 },
    ],
  },
  {
    id: 2,
    title: 'Coffee Morning',
    artist: 'Original',
    emoji: '☕',
    duration: 44,
    lines: [
      { text: 'Sun sneaks through the curtains, you\'re still half asleep', startTime: 0, endTime: 5 },
      { text: 'I tiptoe to the kitchen, promises to keep', startTime: 5, endTime: 10 },
      { text: 'Two cups of coffee, one with extra cream', startTime: 10, endTime: 15 },
      { text: 'Mornings with you feel like a dream', startTime: 15, endTime: 20 },
      { text: 'Messy hair and sleepy smiles', startTime: 20, endTime: 24 },
      { text: 'I\'d walk a thousand morning miles', startTime: 24, endTime: 28 },
      { text: 'Just to see you yawn and stretch', startTime: 28, endTime: 32 },
      { text: 'Every little moment I want to sketch', startTime: 32, endTime: 36 },
      { text: 'Burnt toast and laughter, that\'s our recipe', startTime: 36, endTime: 40 },
      { text: 'Coffee mornings, you and me', startTime: 40, endTime: 44 },
    ],
  },
  {
    id: 3,
    title: 'Dance With Me',
    artist: 'Original',
    emoji: '💃',
    duration: 40,
    lines: [
      { text: 'Turn the music up, let the bass line drop', startTime: 0, endTime: 4 },
      { text: 'Take my hand tonight, we are never gonna stop', startTime: 4, endTime: 8 },
      { text: 'Spin me round and round, feel the rhythm flow', startTime: 8, endTime: 12 },
      { text: 'Everywhere you lead me, I will go', startTime: 12, endTime: 16 },
      { text: 'Dance with me under neon lights', startTime: 16, endTime: 20 },
      { text: 'We own the floor on electric nights', startTime: 20, endTime: 24 },
      { text: 'No choreography, just you and me', startTime: 24, endTime: 28 },
      { text: 'Moving to a beat only we can see', startTime: 28, endTime: 32 },
      { text: 'So don\'t let go, hold me close and sway', startTime: 32, endTime: 36 },
      { text: 'We\'ll dance until the night becomes the day', startTime: 36, endTime: 40 },
    ],
  },
  {
    id: 4,
    title: 'Rainy Day Love',
    artist: 'Original',
    emoji: '🌧️',
    duration: 48,
    lines: [
      { text: 'Raindrops tapping on the windowpane', startTime: 0, endTime: 5 },
      { text: 'Grey skies outside but I can\'t complain', startTime: 5, endTime: 10 },
      { text: 'Wrapped in blankets, your head on my chest', startTime: 10, endTime: 16 },
      { text: 'Rainy days with you are the best', startTime: 16, endTime: 21 },
      { text: 'Thunder rumbles like a lullaby', startTime: 21, endTime: 26 },
      { text: 'Puddles on the street reflecting sky', startTime: 26, endTime: 31 },
      { text: 'We share one umbrella just for fun', startTime: 31, endTime: 36 },
      { text: 'Getting soaked and laughing in the run', startTime: 36, endTime: 40 },
      { text: 'Let it pour, let the whole world fade', startTime: 40, endTime: 44 },
      { text: 'I found my sunshine in the shade', startTime: 44, endTime: 48 },
    ],
  },
  {
    id: 5,
    title: 'Forever Yours',
    artist: 'Original',
    emoji: '💖',
    duration: 52,
    lines: [
      { text: 'Before I met you, days were black and white', startTime: 0, endTime: 5 },
      { text: 'You painted colors in my darkest night', startTime: 5, endTime: 10 },
      { text: 'I didn\'t know what my heart was for', startTime: 10, endTime: 15 },
      { text: 'Until you walked right through my door', startTime: 15, endTime: 20 },
      { text: 'I am forever yours, through the highs and lows', startTime: 20, endTime: 26 },
      { text: 'Through the summer sun and the winter snows', startTime: 26, endTime: 31 },
      { text: 'Every heartbeat writes your name', startTime: 31, endTime: 36 },
      { text: 'And nothing in this world will change my aim', startTime: 36, endTime: 41 },
      { text: 'So take this promise, hold it in your hand', startTime: 41, endTime: 46 },
      { text: 'I\'m forever yours, exactly as I am', startTime: 46, endTime: 52 },
    ],
  },
  {
    id: 6,
    title: 'Butterfly Kisses',
    artist: 'Original',
    emoji: '🦋',
    duration: 44,
    lines: [
      { text: 'Soft as petals falling from the trees', startTime: 0, endTime: 5 },
      { text: 'Light as feathers floating on the breeze', startTime: 5, endTime: 10 },
      { text: 'That\'s the way you touch my face', startTime: 10, endTime: 15 },
      { text: 'Every little moment, every tender grace', startTime: 15, endTime: 20 },
      { text: 'Butterfly kisses on my nose', startTime: 20, endTime: 24 },
      { text: 'A gentle love that only grows', startTime: 24, endTime: 28 },
      { text: 'You whisper words like morning dew', startTime: 28, endTime: 33 },
      { text: 'And every whisper says I love you', startTime: 33, endTime: 37 },
      { text: 'So flutter close and never fly away', startTime: 37, endTime: 41 },
      { text: 'My butterfly, please always stay', startTime: 41, endTime: 44 },
    ],
  },
  {
    id: 7,
    title: 'Midnight Drive',
    artist: 'Original',
    emoji: '🚗',
    duration: 48,
    lines: [
      { text: 'Windows down at midnight, city lights are gone', startTime: 0, endTime: 5 },
      { text: 'Empty highway stretching, radio is on', startTime: 5, endTime: 10 },
      { text: 'Your feet up on the dashboard, wind inside your hair', startTime: 10, endTime: 16 },
      { text: 'No destination needed, we\'re already there', startTime: 16, endTime: 21 },
      { text: 'Headlights cutting through the dark', startTime: 21, endTime: 26 },
      { text: 'Your laughter is my favorite spark', startTime: 26, endTime: 31 },
      { text: 'Gas station coffee, three a.m.', startTime: 31, endTime: 35 },
      { text: 'The world is ours and ours again', startTime: 35, endTime: 39 },
      { text: 'So let\'s keep driving, nowhere to be', startTime: 39, endTime: 44 },
      { text: 'The road is ours, just you and me', startTime: 44, endTime: 48 },
    ],
  },
  {
    id: 8,
    title: 'You & Me',
    artist: 'Original',
    emoji: '💕',
    duration: 44,
    lines: [
      { text: 'It doesn\'t take a grand parade', startTime: 0, endTime: 5 },
      { text: 'Or fireworks or serenades', startTime: 5, endTime: 9 },
      { text: 'Just your hand inside of mine', startTime: 9, endTime: 13 },
      { text: 'And suddenly the world feels fine', startTime: 13, endTime: 17 },
      { text: 'You and me on a quiet street', startTime: 17, endTime: 21 },
      { text: 'Sharing fries and tangled feet', startTime: 21, endTime: 25 },
      { text: 'Simple love, no need for more', startTime: 25, endTime: 29 },
      { text: 'You\'re the one that I adore', startTime: 29, endTime: 33 },
      { text: 'Through the ordinary, through the mundane', startTime: 33, endTime: 38 },
      { text: 'You and me, again and again', startTime: 38, endTime: 44 },
    ],
  },
];

/* ───────── floating music-note particles ───────── */
function MusicNotes() {
  const notes = ['♪', '♫', '♬', '♩', '🎵', '🎶'];
  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      note: notes[i % notes.length],
      left: Math.random() * 100,
      delay: Math.random() * 12,
      dur: 10 + Math.random() * 14,
      size: 12 + Math.random() * 16,
      opacity: 0.06 + Math.random() * 0.1,
    }))
  ).current;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: '-30px',
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animation: `floatNote ${p.dur}s ${p.delay}s linear infinite`,
            color: '#b388ff',
          }}
        >
          {p.note}
        </span>
      ))}
    </div>
  );
}

/* ───────── confetti burst ───────── */
function Confetti({ active }) {
  const pieces = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: ['#e91e8c', '#b388ff', '#ff6fd8', '#ffd700', '#00e5ff', '#76ff03'][i % 6],
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.5 + Math.random() * 2,
      rot: Math.random() * 360,
      size: 6 + Math.random() * 8,
    }))
  ).current;

  if (!active) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            backgroundColor: p.color,
            borderRadius: '2px',
            animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN  PAGE  COMPONENT
   ═══════════════════════════════════════════════ */
export default function KaraokePage() {
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLineIdx, setCurrentLineIdx] = useState(-1);
  const [micOn, setMicOn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [songDone, setSongDone] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [playingBack, setPlayingBack] = useState(false);
  const [micActiveTime, setMicActiveTime] = useState(0);
  const [score, setScore] = useState(null);
  const [singMode, setSingMode] = useState(false);
  const [matchedWords, setMatchedWords] = useState(new Set());
  const [currentWordIdx, setCurrentWordIdx] = useState(0);

  const timerRef = useRef(null);
  const startTsRef = useRef(null);
  const pausedAtRef = useRef(0);
  const mediaRecRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const lyricsContainerRef = useRef(null);
  const playbackRef = useRef(null);
  const micActiveRef = useRef(0);
  const recognitionRef = useRef(null);
  const allWordsRef = useRef([]);

  /* ---- stop everything ---- */
  const stopAll = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setIsPlaying(false);
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  /* ---- speech recognition for sing mode ---- */
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const spokenText = lastResult[0].transcript.toLowerCase().trim();
      const spokenWords = spokenText.split(/\s+/);

      const allWords = allWordsRef.current;
      let wordIndex = currentWordIdx;

      for (const spokenWord of spokenWords) {
        const cleanSpoken = spokenWord.replace(/[^a-z]/g, '');
        if (!cleanSpoken) continue;

        for (let searchIdx = wordIndex; searchIdx < Math.min(wordIndex + 5, allWords.length); searchIdx++) {
          const targetWord = allWords[searchIdx].word.toLowerCase().replace(/[^a-z]/g, '');
          if (cleanSpoken === targetWord || targetWord.startsWith(cleanSpoken) || cleanSpoken.startsWith(targetWord)) {
            setMatchedWords(prev => new Set([...prev, searchIdx]));
            if (searchIdx >= wordIndex) {
              wordIndex = searchIdx + 1;
              setCurrentWordIdx(wordIndex);
              const lineIdx = allWords[searchIdx].lineIdx;
              setCurrentLineIdx(lineIdx);
            }
            break;
          }
        }
      }
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      if (isPlaying && singMode) {
        try { recognition.start(); } catch {}
      }
    };

    try { recognition.start(); } catch {}
    recognitionRef.current = recognition;
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  };

  /* ---- pick a song ---- */
  const selectSong = (song) => {
    setSelectedSong(song);
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentLineIdx(-1);
    setSongDone(false);
    setRecordingBlob(null);
    setMicOn(false);
    setScore(null);
    setShowConfetti(false);
    setPlayingBack(false);
    setMatchedWords(new Set());
    setCurrentWordIdx(0);
    pausedAtRef.current = 0;
    micActiveRef.current = 0;
    setMicActiveTime(0);
    chunksRef.current = [];
    stopSpeechRecognition();

    const words = [];
    song.lines.forEach((line, lineIdx) => {
      line.text.split(/\s+/).forEach(word => {
        words.push({ word, lineIdx });
      });
    });
    allWordsRef.current = words;
  };

  /* ---- tick ---- */
  useEffect(() => {
    if (!isPlaying || !selectedSong) return;

    startTsRef.current = Date.now() - pausedAtRef.current * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTsRef.current) / 1000;
      setCurrentTime(elapsed);

      /* find current line — only in auto mode, sing mode uses speech recognition */
      if (!singMode) {
        const idx = selectedSong.lines.findIndex(
          (l) => elapsed >= l.startTime && elapsed < l.endTime
        );
        setCurrentLineIdx(idx);
      }

      /* track mic active time */
      if (micOn) {
        micActiveRef.current += 0.1;
        setMicActiveTime(micActiveRef.current);
      }

      if (elapsed >= selectedSong.duration) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsPlaying(false);
        setSongDone(true);

        /* score */
        const pct = Math.min((micActiveRef.current / selectedSong.duration) * 100, 100);
        let s = 'Keep Trying!';
        if (pct > 80) s = 'Superstar! ⭐⭐⭐';
        else if (pct > 60) s = 'Amazing! ⭐⭐';
        else if (pct > 30) s = 'Great Job! ⭐';
        setScore(s);
        setShowConfetti(true);

        /* stop recorder */
        if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
          mediaRecRef.current.stop();
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      }
    }, 100);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, selectedSong]);

  /* ---- play / pause ---- */
  const togglePlay = () => {
    if (songDone) return;
    if (isPlaying) {
      pausedAtRef.current = currentTime;
      clearInterval(timerRef.current);
      timerRef.current = null;
      setIsPlaying(false);
      stopSpeechRecognition();
      if (mediaRecRef.current && mediaRecRef.current.state === 'recording') {
        mediaRecRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      if (singMode) startSpeechRecognition();
      if (mediaRecRef.current && mediaRecRef.current.state === 'paused') {
        mediaRecRef.current.resume();
      }
    }
  };

  /* ---- restart ---- */
  const restart = () => {
    stopAll();
    stopSpeechRecognition();
    setCurrentTime(0);
    setCurrentLineIdx(-1);
    setSongDone(false);
    setRecordingBlob(null);
    setScore(null);
    setShowConfetti(false);
    setPlayingBack(false);
    setMatchedWords(new Set());
    setCurrentWordIdx(0);
    pausedAtRef.current = 0;
    micActiveRef.current = 0;
    setMicActiveTime(0);
    chunksRef.current = [];
    setMicOn(false);
  };

  /* ---- mic toggle ---- */
  const toggleMic = async () => {
    if (micOn) {
      setMicOn(false);
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        mediaRecRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setRecordingBlob(blob);
        }
      };
      mediaRecRef.current = recorder;
      recorder.start();
      setMicOn(true);
    } catch (err) {
      console.error('Mic access denied', err);
      alert('Microphone access is needed for recording. Please allow it and try again.');
    }
  };

  /* ---- playback ---- */
  const playRecording = () => {
    if (!recordingBlob) return;
    if (playbackRef.current) {
      playbackRef.current.pause();
      playbackRef.current = null;
    }
    const url = URL.createObjectURL(recordingBlob);
    const audio = new Audio(url);
    playbackRef.current = audio;
    setPlayingBack(true);
    audio.onended = () => setPlayingBack(false);
    audio.play();
  };

  /* ---- download ---- */
  const downloadRecording = () => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karaoke-${selectedSong.title.replace(/\s+/g, '-').toLowerCase()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---- back ---- */
  const backToSongs = () => {
    stopAll();
    setSelectedSong(null);
    setSongDone(false);
    setRecordingBlob(null);
    setScore(null);
    setShowConfetti(false);
    setPlayingBack(false);
    setMicOn(false);
    chunksRef.current = [];
  };

  /* ---- format time ---- */
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes floatNote {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.12; }
          90%  { opacity: 0.08; }
          100% { transform: translateY(-110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pulseRed {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #ff1744; }
          50%      { opacity: 0.4; box-shadow: 0 0 14px #ff1744; }
        }
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 12px rgba(233,30,140,0.7), 0 0 30px rgba(233,30,140,0.3); }
          50%      { text-shadow: 0 0 20px rgba(233,30,140,0.9), 0 0 50px rgba(233,30,140,0.5); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInCard {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spotlight {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.5; }
        }

        .karaoke-body { position: relative; min-height: 100vh; background: #07071a; overflow-x: hidden; }
        .karaoke-body * { box-sizing: border-box; margin: 0; padding: 0; }

        .song-card-k:hover {
          transform: translateY(-4px) scale(1.03) !important;
          box-shadow: 0 8px 32px rgba(233,30,140,0.35) !important;
          border-color: #e91e8c !important;
        }
        .ctrl-btn:hover {
          transform: scale(1.1) !important;
          filter: brightness(1.2);
        }
        .ctrl-btn:active { transform: scale(0.95) !important; }

        .lyric-line { transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      <div className="karaoke-body">
        <MusicNotes />
        <Confetti active={showConfetti} />

        {/* ─── NAV ─── */}
        <nav
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
            background: 'rgba(7,7,26,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(233,30,140,0.15)',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#b388ff',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Home
          </Link>
          <span
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '20px',
              color: '#e91e8c',
            }}
          >
            Karaoke Night 🎤
          </span>
          <div style={{ width: '60px' }} />
        </nav>

        {/* ─── CONTENT ─── */}
        <div style={{ paddingTop: '70px', position: 'relative', zIndex: 1 }}>
          {!selectedSong ? (
            /* ═══════ SONG SELECT SCREEN ═══════ */
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '40px 20px 80px',
                animation: 'fadeInUp 0.6s ease-out',
              }}
            >
              <h1
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  fontSize: 'clamp(32px, 6vw, 52px)',
                  color: '#e91e8c',
                  textAlign: 'center',
                  marginBottom: '8px',
                  textShadow: '0 0 30px rgba(233,30,140,0.4)',
                }}
              >
                Karaoke Night 🎤
              </h1>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  fontSize: 'clamp(14px, 2vw, 16px)',
                  marginBottom: '40px',
                }}
              >
                Pick a song, sing your heart out, and listen back!
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
                  gap: '20px',
                }}
              >
                {SONGS.map((song, i) => (
                  <div
                    key={song.id}
                    className="song-card-k"
                    onClick={() => selectSong(song)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(179,136,255,0.15)',
                      borderRadius: '18px',
                      padding: '28px 24px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      animation: `slideInCard 0.5s ${i * 0.07}s ease-out both`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* gradient glow */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-40%',
                        left: '-20%',
                        width: '140%',
                        height: '60%',
                        background:
                          'radial-gradient(ellipse, rgba(233,30,140,0.08), transparent 70%)',
                        pointerEvents: 'none',
                      }}
                    />
                    <span style={{ fontSize: '38px' }}>{song.emoji}</span>
                    <h3
                      style={{
                        fontFamily: "'Dancing Script', cursive",
                        fontSize: '22px',
                        color: '#fff',
                      }}
                    >
                      {song.title}
                    </h3>
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      {fmt(song.duration)} • {song.artist}
                    </span>
                    <button
                      style={{
                        marginTop: '6px',
                        background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                        border: 'none',
                        borderRadius: '30px',
                        padding: '8px 28px',
                        color: '#fff',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      ▶ Sing
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ═══════ KARAOKE SCREEN ═══════ */
            <div
              style={{
                maxWidth: '700px',
                margin: '0 auto',
                padding: '20px 20px 140px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: 'fadeInUp 0.5s ease-out',
              }}
            >
              {/* Song title */}
              <h2
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  fontSize: 'clamp(26px, 5vw, 40px)',
                  color: '#e91e8c',
                  textAlign: 'center',
                  marginBottom: '4px',
                  textShadow: '0 0 20px rgba(233,30,140,0.4)',
                }}
              >
                {selectedSong.emoji} {selectedSong.title}
              </h2>

              {/* mic recording indicator */}
              {micOn && isPlaying && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    color: '#ff1744',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#ff1744',
                      animation: 'pulseRed 1s ease-in-out infinite',
                    }}
                  />
                  Recording...
                </div>
              )}

              {/* ─── LYRICS AREA ─── */}
              <div
                ref={lyricsContainerRef}
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  minHeight: '340px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px 20px',
                  margin: '10px 0 20px',
                  borderRadius: '24px',
                  background:
                    'radial-gradient(ellipse at center, rgba(233,30,140,0.06) 0%, rgba(7,7,26,0.9) 70%)',
                  border: '1px solid rgba(179,136,255,0.1)',
                }}
              >
                {/* spotlight */}
                <div
                  style={{
                    position: 'absolute',
                    top: '30%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '300px',
                    height: '200px',
                    background:
                      'radial-gradient(ellipse, rgba(233,30,140,0.08), transparent 70%)',
                    pointerEvents: 'none',
                    animation: isPlaying ? 'spotlight 3s ease-in-out infinite' : 'none',
                  }}
                />

                {!isPlaying && currentTime === 0 && !songDone && (
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '16px',
                      textAlign: 'center',
                    }}
                  >
                    Press Play to start singing!
                    <br />
                    <span style={{ fontSize: '13px' }}>
                      Turn on your mic to record yourself
                    </span>
                  </p>
                )}

                {(isPlaying || currentTime > 0) &&
                  !songDone &&
                  selectedSong.lines.map((line, i) => {
                    const isCurrent = i === currentLineIdx;
                    const isPast = currentLineIdx >= 0 && i < currentLineIdx;
                    const isNext = currentLineIdx >= 0 && i === currentLineIdx + 1;
                    const isFarFuture = i > currentLineIdx + 3;
                    const isFarPast = currentLineIdx >= 0 && i < currentLineIdx - 2;

                    if (isFarPast || isFarFuture) return null;

                    return (
                      <div
                        key={i}
                        className="lyric-line"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          textAlign: 'center',
                          padding: '6px 0',
                          ...(isCurrent
                            ? {
                                fontSize: 'clamp(22px, 4vw, 28px)',
                                color: '#e91e8c',
                                fontWeight: 700,
                                transform: 'scale(1.05)',
                                animation: 'glowPulse 2s ease-in-out infinite',
                                textShadow:
                                  '0 0 16px rgba(233,30,140,0.7), 0 0 40px rgba(233,30,140,0.3)',
                              }
                            : isNext
                            ? {
                                fontSize: 'clamp(17px, 3vw, 22px)',
                                color: 'rgba(255,255,255,0.8)',
                                fontWeight: 500,
                              }
                            : isPast
                            ? {
                                fontSize: 'clamp(14px, 2.5vw, 18px)',
                                color: 'rgba(255,255,255,0.25)',
                                fontWeight: 400,
                                transform: 'translateY(-4px)',
                              }
                            : {
                                fontSize: 'clamp(15px, 2.5vw, 19px)',
                                color: 'rgba(255,255,255,0.45)',
                                fontWeight: 400,
                              }),
                        }}
                      >
                        {singMode ? (
                          line.text.split(/\s+/).map((word, wordIdx) => {
                            const globalIdx = allWordsRef.current.findIndex(
                              (w, idx) => w.lineIdx === i && w.word === word &&
                              allWordsRef.current.slice(0, idx).filter(ww => ww.lineIdx === i).length === wordIdx
                            );
                            const isMatched = matchedWords.has(globalIdx);
                            return (
                              <span key={wordIdx} style={{
                                color: isMatched ? '#4caf50' : undefined,
                                textShadow: isMatched ? '0 0 10px rgba(76,175,80,0.6)' : undefined,
                                fontWeight: isMatched ? 800 : undefined,
                                transition: 'all 0.3s',
                              }}>
                                {word}{' '}
                              </span>
                            );
                          })
                        ) : line.text}
                      </div>
                    );
                  })}

                {/* ─── SONG DONE ─── */}
                {songDone && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      animation: 'fadeInUp 0.6s ease-out',
                    }}
                  >
                    <span style={{ fontSize: '48px' }}>🎉</span>
                    <h3
                      style={{
                        fontFamily: "'Dancing Script', cursive",
                        fontSize: '32px',
                        color: '#e91e8c',
                      }}
                    >
                      Amazing Performance!
                    </h3>
                    {score && (
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '22px',
                          color: '#ffd700',
                          fontWeight: 600,
                        }}
                      >
                        {score}
                      </p>
                    )}
                    {micActiveTime > 0 && (
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        Mic was active for {Math.round(micActiveTime)}s out of{' '}
                        {selectedSong.duration}s
                      </p>
                    )}

                    {recordingBlob && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          marginTop: '8px',
                        }}
                      >
                        <button
                          onClick={playRecording}
                          className="ctrl-btn"
                          style={{
                            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                            border: 'none',
                            borderRadius: '30px',
                            padding: '12px 28px',
                            color: '#fff',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 600,
                            fontSize: '15px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                          }}
                        >
                          {playingBack ? '🔊 Playing...' : '🎧 Listen to yourself!'}
                        </button>
                        <button
                          onClick={downloadRecording}
                          className="ctrl-btn"
                          style={{
                            background: 'rgba(179,136,255,0.2)',
                            border: '1px solid rgba(179,136,255,0.4)',
                            borderRadius: '30px',
                            padding: '12px 28px',
                            color: '#b388ff',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 600,
                            fontSize: '15px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                          }}
                        >
                          💾 Download
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── PROGRESS BAR ─── */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: '6px',
                  }}
                >
                  <span>{fmt(currentTime)}</span>
                  <span>{fmt(selectedSong.duration)}</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min((currentTime / selectedSong.duration) * 100, 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                      borderRadius: '3px',
                      transition: 'width 0.1s linear',
                    }}
                  />
                </div>
              </div>

              {/* ─── CONTROLS ─── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(10px, 3vw, 20px)',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {/* Back */}
                <button
                  onClick={backToSongs}
                  className="ctrl-btn"
                  title="Back to songs"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '1px solid rgba(179,136,255,0.3)',
                    background: 'rgba(179,136,255,0.1)',
                    color: '#b388ff',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                  }}
                >
                  ←
                </button>

                {/* Restart */}
                <button
                  onClick={restart}
                  className="ctrl-btn"
                  title="Restart"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '1px solid rgba(179,136,255,0.3)',
                    background: 'rgba(179,136,255,0.1)',
                    color: '#b388ff',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                  }}
                >
                  ↻
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="ctrl-btn"
                  disabled={songDone}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: 'none',
                    background: songDone
                      ? 'rgba(255,255,255,0.1)'
                      : 'linear-gradient(135deg, #e91e8c, #b388ff)',
                    color: '#fff',
                    fontSize: '26px',
                    cursor: songDone ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                    boxShadow: songDone ? 'none' : '0 4px 24px rgba(233,30,140,0.4)',
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                {/* Mic */}
                <button
                  onClick={toggleMic}
                  className="ctrl-btn"
                  title={micOn ? 'Mic On' : 'Mic Off'}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: micOn
                      ? '2px solid #ff1744'
                      : '1px solid rgba(179,136,255,0.3)',
                    background: micOn
                      ? 'rgba(255,23,68,0.15)'
                      : 'rgba(179,136,255,0.1)',
                    color: micOn ? '#ff1744' : '#b388ff',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                    position: 'relative',
                  }}
                >
                  🎤
                  {micOn && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#ff1744',
                        animation: 'pulseRed 1s ease-in-out infinite',
                      }}
                    />
                  )}
                </button>
              </div>

              {/* mic status label */}
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  color: micOn ? '#ff1744' : 'rgba(255,255,255,0.3)',
                  marginTop: '10px',
                  textAlign: 'center',
                }}
              >
                {micOn ? 'Mic is ON — singing is being recorded' : 'Mic is OFF'}
              </p>

              {/* Sing Mode toggle */}
              <button
                onClick={() => {
                  const newMode = !singMode;
                  setSingMode(newMode);
                  if (newMode && isPlaying) {
                    startSpeechRecognition();
                  } else {
                    stopSpeechRecognition();
                  }
                  setMatchedWords(new Set());
                  setCurrentWordIdx(0);
                }}
                style={{
                  marginTop: '10px',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: singMode ? '1.5px solid #4caf50' : '1px solid rgba(255,255,255,0.15)',
                  background: singMode ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                  color: singMode ? '#4caf50' : 'rgba(255,255,255,0.5)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.2s',
                }}
              >
                {singMode ? '🎙️ Sing Mode ON — lyrics follow your voice' : '⏱️ Auto Scroll — switch to Sing Mode'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
