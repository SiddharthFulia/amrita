'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { analyzeImage } from '@/utils/apis';

const QUICK_PROMPTS = [
  "What's in this?",
  "Describe mood",
  "What colors?",
  "Any text?",
  "How many people?",
  "What emotion?",
];

const DEFAULT_PROMPT = 'Describe this image in detail';

export default function ImageAnalyzePage() {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState('');
  const [displayedResult, setDisplayedResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingRef = useRef(null);

  // Typing animation
  useEffect(() => {
    if (!result) {
      setDisplayedResult('');
      return;
    }
    setDisplayedResult('');
    let i = 0;
    clearInterval(typingRef.current);
    typingRef.current = setInterval(() => {
      i++;
      setDisplayedResult(result.slice(0, i));
      if (i >= result.length) clearInterval(typingRef.current);
    }, 12);
    return () => clearInterval(typingRef.current);
  }, [result]);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setError('');
    setResult('');
    const dataUrl = await fileToBase64(file);
    setImageSrc(dataUrl);
    // Strip prefix for API
    const base64 = dataUrl.split(',')[1];
    setImageBase64(base64);
    stopCamera();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setCameraError('Camera permission denied or not available. Please allow camera access in your browser settings.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImageSrc(dataUrl);
    setImageBase64(dataUrl.split(',')[1]);
    setResult('');
    setError('');
    stopCamera();
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await analyzeImage(imageBase64, prompt || DEFAULT_PROMPT);
      const data = res?.data || res;
      if (data?.reply) {
        setResult(data.reply);
      } else if (data?.result) {
        setResult(data.result);
      } else if (data?.text) {
        setResult(data.text);
      } else if (typeof data === 'string') {
        setResult(data);
      } else {
        setError('No analysis returned. Try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearImage = () => {
    setImageSrc(null);
    setImageBase64(null);
    setResult('');
    setError('');
    setPrompt(DEFAULT_PROMPT);
  };

  // Styles
  const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #07071a 0%, #0d0d2b 50%, #07071a 100%)',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    padding: '0 0 60px 0',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px 12px 20px',
    borderBottom: '1px solid rgba(233,30,140,0.15)',
  };

  const titleStyle = {
    fontFamily: "'Dancing Script', cursive",
    fontSize: '2rem',
    background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  };

  const backBtnStyle = {
    color: '#b388ff',
    textDecoration: 'none',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(179,136,255,0.08)',
    border: '1px solid rgba(179,136,255,0.2)',
    borderRadius: '20px',
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px 16px',
  };

  const sectionLabelStyle = {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: '#b388ff',
    marginBottom: '10px',
    fontWeight: 600,
  };

  const dropZoneStyle = {
    border: `2px dashed ${dragOver ? '#e91e8c' : 'rgba(179,136,255,0.3)'}`,
    borderRadius: '16px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: dragOver ? 'rgba(233,30,140,0.06)' : 'rgba(179,136,255,0.04)',
    transition: 'all 0.3s',
    marginBottom: '16px',
  };

  const btnBaseStyle = {
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontFamily: "'Inter', sans-serif",
  };

  const primaryBtnStyle = {
    ...btnBaseStyle,
    background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(233,30,140,0.3)',
    width: '100%',
  };

  const secondaryBtnStyle = {
    ...btnBaseStyle,
    background: 'rgba(179,136,255,0.12)',
    color: '#b388ff',
    border: '1px solid rgba(179,136,255,0.25)',
  };

  const cameraBtnStyle = {
    ...btnBaseStyle,
    background: 'rgba(233,30,140,0.12)',
    color: '#e91e8c',
    border: '1px solid rgba(233,30,140,0.25)',
    width: '100%',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(179,136,255,0.2)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '0.95rem',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s',
  };

  const glassCardStyle = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(179,136,255,0.15)',
    borderRadius: '16px',
    padding: '20px',
    marginTop: '20px',
  };

  const quickBtnStyle = (isActive) => ({
    ...btnBaseStyle,
    padding: '8px 14px',
    fontSize: '0.8rem',
    borderRadius: '20px',
    background: isActive ? 'rgba(233,30,140,0.2)' : 'rgba(179,136,255,0.08)',
    color: isActive ? '#e91e8c' : '#b388ff',
    border: `1px solid ${isActive ? 'rgba(233,30,140,0.4)' : 'rgba(179,136,255,0.15)'}`,
  });

  const previewStyle = {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '16px',
    display: 'block',
    margin: '0 auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Image Analysis</h1>
        <Link href="/" style={backBtnStyle}>
          <span style={{ fontSize: '1.1rem' }}>&#8592;</span> Home
        </Link>
      </div>

      <div style={containerStyle}>
        {/* Camera Permission Error */}
        {cameraError && (
          <div
            style={{
              background: 'rgba(233,30,140,0.1)',
              border: '1px solid rgba(233,30,140,0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '16px',
              color: '#e91e8c',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <strong>Camera Access Required</strong>
            <br />
            {cameraError}
            <br />
            <button
              onClick={() => setCameraError('')}
              style={{
                ...secondaryBtnStyle,
                marginTop: '10px',
                padding: '6px 16px',
                fontSize: '0.8rem',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Camera active */}
        {cameraActive && (
          <div style={{ marginBottom: '20px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxHeight: '400px',
                borderRadius: '16px',
                objectFit: 'cover',
                background: '#000',
                transform: 'scaleX(-1)',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={capturePhoto}
                style={{ ...primaryBtnStyle, flex: 1 }}
              >
                Capture Photo
              </button>
              <button
                onClick={stopCamera}
                style={{ ...secondaryBtnStyle, flex: 0.5 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Image source selection - show when no image and no camera */}
        {!imageSrc && !cameraActive && (
          <>
            <div style={sectionLabelStyle}>Choose Image Source</div>

            <button onClick={startCamera} style={cameraBtnStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Open Camera (Selfie)
            </button>

            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: '8px 0' }}>
              &mdash; or &mdash;
            </div>

            <div
              style={dropZoneStyle}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(179,136,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: '6px' }}>
                Drag & drop an image here
              </div>
              <div style={{ color: 'rgba(179,136,255,0.5)', fontSize: '0.8rem' }}>
                or click to choose a file
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </>
        )}

        {/* Image Preview */}
        {imageSrc && !cameraActive && (
          <>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <img src={imageSrc} alt="Preview" style={previewStyle} />
              <button
                onClick={clearImage}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#fff',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)',
                }}
                title="Remove image"
              >
                &#10005;
              </button>
            </div>

            {/* Prompt Input */}
            <div style={sectionLabelStyle}>Ask about this image</div>
            <input
              style={inputStyle}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={DEFAULT_PROMPT}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
            />

            {/* Quick Prompts */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '12px',
                marginBottom: '16px',
              }}
            >
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  style={quickBtnStyle(prompt === qp)}
                  onClick={() => setPrompt(qp)}
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                ...primaryBtnStyle,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      animation: 'pulse-brain 1s ease-in-out infinite',
                      fontSize: '1.2rem',
                    }}
                  >
                    {'\uD83E\uDDE0'}
                  </span>
                  Analyzing...
                </span>
              ) : (
                'Analyze Image'
              )}
            </button>
          </>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              color: '#e91e8c',
              background: 'rgba(233,30,140,0.08)',
              border: '1px solid rgba(233,30,140,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginTop: '16px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Result */}
        {(displayedResult || loading) && (
          <div style={glassCardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  fontSize: '1.3rem',
                  background: 'linear-gradient(90deg, #e91e8c, #b388ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Analysis Result
              </div>
              {result && !loading && (
                <button onClick={handleCopy} style={secondaryBtnStyle}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            {loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 0',
                  fontSize: '2.5rem',
                  animation: 'pulse-brain 1s ease-in-out infinite',
                }}
              >
                {'\uD83E\uDDE0'}
              </div>
            ) : (
              <div
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.7,
                  fontSize: '0.95rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {displayedResult}
                {displayedResult.length < result.length && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '1em',
                      background: '#e91e8c',
                      marginLeft: '2px',
                      animation: 'blink-cursor 0.8s step-end infinite',
                      verticalAlign: 'text-bottom',
                    }}
                  />
                )}
              </div>
            )}

            {/* Re-analyze */}
            {result && !loading && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(179,136,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  Re-analyze with a different question:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {QUICK_PROMPTS.filter((qp) => qp !== prompt).slice(0, 4).map((qp) => (
                    <button
                      key={qp}
                      style={quickBtnStyle(false)}
                      onClick={() => {
                        setPrompt(qp);
                        setTimeout(() => {
                          setLoading(true);
                          setError('');
                          setResult('');
                          analyzeImage(imageBase64, qp)
                            .then((res) => {
                              const data = res?.data || res;
                              if (data?.reply) setResult(data.reply);
                              else if (data?.result) setResult(data.result);
                              else if (data?.text) setResult(data.text);
                              else if (typeof data === 'string') setResult(data);
                              else setError('No analysis returned.');
                            })
                            .catch(() => setError('Analysis failed.'))
                            .finally(() => setLoading(false));
                        }, 50);
                      }}
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes pulse-brain {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }

        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        input:focus {
          border-color: rgba(233,30,140,0.5) !important;
        }

        button:hover {
          filter: brightness(1.15);
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(179,136,255,0.2); border-radius: 3px; }
      `}</style>
    </div>
  );
}