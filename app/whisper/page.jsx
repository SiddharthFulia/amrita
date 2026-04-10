'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { checkHealth, sendWhisper, fetchStats } from '@/utils/apis';
import { AI_MODELS, getModelInfo } from '@/constants/models';

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes) {
  const gigabytes = bytes / (1024 * 1024 * 1024);
  return `${gigabytes.toFixed(1)} GB`;
}

function formatModelSize(bytes) {
  const gigabytes = bytes / (1024 * 1024 * 1024);
  if (gigabytes >= 1) return `${gigabytes.toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export default function WhisperPage() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [aiSource, setAiSource] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [aiMode, setAiMode] = useState('llama3.2:1b');
  const scrollContainer = useRef(null);
  const inputElement = useRef(null);

  useEffect(() => {
    verifyConnection();
    const healthInterval = setInterval(verifyConnection, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  useEffect(() => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollTop = scrollContainer.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const introTimer = setTimeout(() => {
      setMessages([{
        from: 'ai',
        text: "Hey! I'm your little AI companion 💕 Ask me anything — I'll try my best to help, chat, or just keep you company.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 600);
    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (!showStats) return;
    loadStats();
    const statsInterval = setInterval(loadStats, 10000);
    return () => clearInterval(statsInterval);
  }, [showStats]);

  async function verifyConnection() {
    try {
      const healthResponse = await checkHealth();
      setConnectionStatus(healthResponse.status ? 'online' : 'offline');
    } catch {
      setConnectionStatus('offline');
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const response = await fetchStats();
      setStatsData(response.data);
    } catch {
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleSend() {
    const trimmedMessage = inputText.trim();
    if (!trimmedMessage || isSending) return;

    const userMessage = {
      from: 'me',
      text: trimmedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(previousMessages => [...previousMessages, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      const chatHistory = messages.slice(-10).map(message => ({
        from: message.from === 'ai' ? 'them' : 'me',
        text: message.text,
      }));
      const chatResponse = await sendWhisper(trimmedMessage, chatHistory, aiMode, 'general');
      const replyText = chatResponse.data?.reply || chatResponse.reply || "Hmm, I'm not sure what to say...";
      setAiSource(chatResponse.data?.source || '');
      setMessages(previousMessages => [...previousMessages, {
        from: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages(previousMessages => [...previousMessages, {
        from: 'ai',
        text: "I can't reach my brain right now 😅 The server might be sleeping. Try again in a bit!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsSending(false);
      inputElement.current?.focus();
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) handleSend();
  }

  const statusColor = connectionStatus === 'online' ? '#4caf50' : connectionStatus === 'offline' ? '#ef5350' : '#ff9800';
  const statusLabel = connectionStatus === 'online' ? 'Online' : connectionStatus === 'offline' ? 'Offline' : 'Checking...';

  return (
    <div style={{
      minHeight: '100vh', background: '#07071a', color: '#fff',
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 16px 0',
    }}>
      <style>{`
        @keyframes whisperDot { 0%,60%,100%{opacity:0.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-4px)} }
        @keyframes whisperFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes whisperPulse { 0%,100%{box-shadow:0 0 0 0 rgba(76,175,80,0.4)} 50%{box-shadow:0 0 0 6px rgba(76,175,80,0)} }
        @keyframes statsPing { 0%{opacity:1} 50%{opacity:0.4} 100%{opacity:1} }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '600px',
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '16px',
      }}>
        <Link href="/" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '14px' }}>←</Link>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
            boxShadow: '0 0 20px rgba(233,30,140,0.3)',
          }}>✨</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Whisper</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: statusColor,
                animation: connectionStatus === 'online' ? 'whisperPulse 2s ease infinite' : 'none',
              }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                {statusLabel}
                {aiSource === 'ollama' && connectionStatus === 'online' && ' · AI'}
                {aiSource === 'fallback' && connectionStatus === 'online' && ' · Basic'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          style={{
            padding: '6px 14px', borderRadius: '20px',
            background: showStats ? 'rgba(179,136,255,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${showStats ? 'rgba(179,136,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
            color: showStats ? '#b388ff' : 'rgba(255,255,255,0.5)',
            fontSize: '11px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s',
          }}
        >{showStats ? 'Hide Stats' : '📊 Stats'}</button>
        <select
          value={aiMode}
          onChange={event => setAiMode(event.target.value)}
          style={{
            padding: '5px 28px 5px 10px', borderRadius: '14px', fontSize: '11px',
            background: '#1a1a2e', border: `1px solid ${getModelInfo(aiMode).badgeColor}50`,
            color: '#fff', fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            outline: 'none', WebkitAppearance: 'none', appearance: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27%3E%3Cpath d=%27M2 4l4 4 4-4%27 fill=%27none%27 stroke=%27%23e91e8c%27 stroke-width=%271.5%27/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
          }}
        >
          {AI_MODELS.map(modelOption => (
            <option key={modelOption.id} value={modelOption.id} style={{ background: '#1a1a2e', color: '#fff' }}>
              {modelOption.emoji} {modelOption.badge} ({modelOption.speed})
            </option>
          ))}
        </select>
        {connectionStatus === 'offline' && (
          <button onClick={verifyConnection} style={{
            padding: '6px 14px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)', fontSize: '11px',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}>Retry</button>
        )}
      </div>

      {showStats && (
        <div style={{
          width: '100%', maxWidth: '600px', marginBottom: '16px',
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
          padding: '20px', animation: 'whisperFadeIn 0.3s ease',
        }}>
          {!statsData ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '12px' }}>
              {statsLoading ? 'Loading stats...' : 'Could not load stats'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#b388ff' }}>Server Dashboard</span>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: statsData.ollama.status === 'online' ? '#4caf50' : '#ef5350',
                  animation: statsLoading ? 'statsPing 1s ease infinite' : 'none',
                }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                  refreshes every 10s
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <StatCard label="Uptime" value={formatUptime(statsData.server.uptime)} icon="⏱" color="#4caf50" />
                <StatCard label="CPU Load" value={`${statsData.server.loadAverage[0].toFixed(2)}`} icon="⚡" color="#ff9800" />
                <StatCard label="Memory" value={`${statsData.memory.usagePercent}%`} icon="💾" color={statsData.memory.usagePercent > 80 ? '#ef5350' : '#4fc3f7'} />
                <StatCard label="RAM Used" value={formatBytes(statsData.memory.used)} icon="📊" color="#b388ff" />
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
                padding: '14px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '16px' }}>🤖</span>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Ollama</span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '2px 8px', borderRadius: '10px',
                    background: statsData.ollama.status === 'online' ? 'rgba(76,175,80,0.15)' : 'rgba(239,83,80,0.15)',
                    color: statsData.ollama.status === 'online' ? '#4caf50' : '#ef5350',
                    border: `1px solid ${statsData.ollama.status === 'online' ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
                    textTransform: 'uppercase',
                  }}>{statsData.ollama.status}</span>
                  {statsData.ollama.responseTime !== null && (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                      {statsData.ollama.responseTime}ms ping
                    </span>
                  )}
                </div>

                {statsData.ollama.models.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {statsData.ollama.models.map(model => (
                      <div key={model.name} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                      }}>
                        <span style={{ fontSize: '12px' }}>🧠</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{model.name}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                          {formatModelSize(model.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>No models loaded</div>
                )}
              </div>

              <div style={{
                display: 'flex', gap: '12px', marginTop: '12px',
                fontSize: '10px', color: 'rgba(255,255,255,0.2)',
                flexWrap: 'wrap',
              }}>
                <span>{statsData.server.hostname}</span>
                <span>{statsData.server.platform}</span>
                <span>{statsData.server.nodeVersion}</span>
                <span>{statsData.server.cpuCores} cores</span>
                <span>{formatBytes(statsData.memory.total)} total</span>
              </div>
            </>
          )}
        </div>
      )}

      <div ref={scrollContainer} style={{
        width: '100%', maxWidth: '600px', flex: 1,
        overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: '16px', maxHeight: showStats ? 'calc(100vh - 420px)' : 'calc(100vh - 160px)',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(233,30,140,0.2) transparent',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.04)',
            padding: '4px 14px', borderRadius: '12px',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {messages.map((chatMessage, messageIndex) => (
          <div key={messageIndex} style={{
            display: 'flex',
            justifyContent: chatMessage.from === 'me' ? 'flex-end' : 'flex-start',
            marginBottom: '10px',
            animation: 'whisperFadeIn 0.3s ease',
          }}>
            {chatMessage.from === 'ai' && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', flexShrink: 0, marginRight: '8px', marginTop: '2px',
              }}>✨</div>
            )}
            <div style={{
              maxWidth: '75%', padding: '12px 16px',
              borderRadius: chatMessage.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: chatMessage.from === 'me'
                ? 'linear-gradient(135deg, #e91e8c, #b388ff)'
                : 'rgba(255,255,255,0.07)',
              backdropFilter: chatMessage.from === 'ai' ? 'blur(10px)' : 'none',
              border: chatMessage.from === 'ai' ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <div style={{
                fontSize: '14px', lineHeight: 1.5,
                color: chatMessage.from === 'me' ? '#fff' : 'rgba(255,255,255,0.85)',
                wordBreak: 'break-word',
              }}>{chatMessage.text}</div>
              <div style={{
                fontSize: '10px', marginTop: '4px',
                color: chatMessage.from === 'me' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                textAlign: chatMessage.from === 'me' ? 'right' : 'left',
              }}>{chatMessage.time}</div>
            </div>
          </div>
        ))}

        {isSending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #e91e8c, #b388ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
            }}>✨</div>
            <div style={{
              padding: '12px 18px', borderRadius: '18px 18px 18px 4px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', gap: '4px',
            }}>
              {[0, 1, 2].map(dotIndex => (
                <div key={dotIndex} style={{
                  width: '6px', height: '6px', borderRadius: '50%', background: '#b388ff',
                  animation: `whisperDot 1.2s ease ${dotIndex * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{
        width: '100%', maxWidth: '600px', padding: '12px 0 20px',
        display: 'flex', gap: '10px', background: '#07071a',
        position: 'sticky', bottom: 0,
      }}>
        <input
          ref={inputElement}
          value={inputText}
          onChange={event => setInputText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connectionStatus === 'online' ? 'Type a message...' : 'Server offline — type anyway...'}
          style={{
            flex: 1, padding: '14px 18px', borderRadius: '24px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif",
            outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={event => { event.target.style.borderColor = '#e91e8c50'; }}
          onBlur={event => { event.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: inputText.trim() && !isSending
              ? 'linear-gradient(135deg, #e91e8c, #b388ff)'
              : 'rgba(255,255,255,0.06)',
            border: 'none', color: '#fff', fontSize: '18px',
            cursor: inputText.trim() && !isSending ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
            opacity: inputText.trim() && !isSending ? 1 : 0.3,
          }}
        >↑</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
      padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
