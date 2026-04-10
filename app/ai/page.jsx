'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { checkHealth, sendAI } from '@/utils/apis';
import { AI_MODELS, getModelInfo } from '@/constants/models';

export default function AIPage() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(200);
  const [lastResponseTime, setLastResponseTime] = useState(null);
  const [lastTokenCount, setLastTokenCount] = useState(null);
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

  async function verifyConnection() {
    try {
      const healthResponse = await checkHealth();
      setConnectionStatus(healthResponse.status ? 'online' : 'offline');
    } catch {
      setConnectionStatus('offline');
    }
  }

  async function handleSend() {
    const trimmedMessage = inputText.trim();
    if (!trimmedMessage || isSending) return;

    setMessages(previousMessages => [...previousMessages, {
      role: 'user',
      content: trimmedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setInputText('');
    setIsSending(true);

    try {
      const chatHistory = messages.map(message => ({
        role: message.role,
        content: message.content,
      }));

      const startTime = Date.now();
      const aiResponse = await sendAI(trimmedMessage, {
        history: chatHistory,
        model: selectedModel,
        system: systemPrompt || undefined,
        maxTokens,
        temperature,
      });
      setLastResponseTime(Date.now() - startTime);
      setLastTokenCount(aiResponse.data?.tokens || null);

      const replyText = aiResponse.data?.reply || 'No response';
      setMessages(previousMessages => [...previousMessages, {
        role: 'assistant',
        content: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (requestError) {
      setMessages(previousMessages => [...previousMessages, {
        role: 'assistant',
        content: `Error: ${requestError.message || 'AI unavailable'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      }]);
    } finally {
      setIsSending(false);
      inputElement.current?.focus();
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) handleSend();
  }

  function clearChat() {
    setMessages([]);
    setLastResponseTime(null);
    setLastTokenCount(null);
  }

  const statusColor = connectionStatus === 'online' ? '#4caf50' : connectionStatus === 'offline' ? '#ef5350' : '#ff9800';

  return (
    <div style={{
      minHeight: '100vh', background: '#07071a', color: '#fff',
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 16px 0',
    }}>
      <style>{`
        @keyframes aiDot { 0%,60%,100%{opacity:0.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-4px)} }
        @keyframes aiFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aiPulse { 0%,100%{box-shadow:0 0 0 0 rgba(76,175,80,0.4)} 50%{box-shadow:0 0 0 6px rgba(76,175,80,0)} }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '700px',
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '12px', flexWrap: 'wrap',
      }}>
        <Link href="/" style={{ color: '#b388ff', textDecoration: 'none', fontSize: '14px' }}>←</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Raw AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%', background: statusColor,
                animation: connectionStatus === 'online' ? 'aiPulse 2s ease infinite' : 'none',
              }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                {selectedModel}
                {lastResponseTime ? ` · ${(lastResponseTime / 1000).toFixed(1)}s` : ''}
                {lastTokenCount ? ` · ${lastTokenCount} tok` : ''}
              </span>
            </div>
          </div>
        </div>

        <select
          value={selectedModel}
          onChange={event => setSelectedModel(event.target.value)}
          style={{
            padding: '6px 12px', borderRadius: '12px', fontSize: '11px',
            background: '#1a1a2e', border: `1px solid ${getModelInfo(selectedModel).badgeColor}50`,
            color: '#fff', fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            outline: 'none', WebkitAppearance: 'none', appearance: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27%3E%3Cpath d=%27M2 4l4 4 4-4%27 fill=%27none%27 stroke=%27%234caf50%27 stroke-width=%271.5%27/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            paddingRight: '28px',
          }}
        >
          {AI_MODELS.map(modelOption => (
            <option key={modelOption.id} value={modelOption.id} style={{ background: '#1a1a2e', color: '#fff' }}>
              {modelOption.emoji} {modelOption.label} ({modelOption.badge})
            </option>
          ))}
        </select>

        <button onClick={() => setShowSettings(!showSettings)} style={{
          padding: '5px 12px', borderRadius: '12px', fontSize: '11px',
          background: showSettings ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${showSettings ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.12)'}`,
          color: showSettings ? '#4caf50' : 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontFamily: "'Inter', sans-serif",
        }}>⚙</button>

        <button onClick={clearChat} style={{
          padding: '5px 12px', borderRadius: '12px', fontSize: '11px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
        }}>Clear</button>
      </div>

      <div style={{
        width: '100%', maxWidth: '700px', marginBottom: '10px',
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 12px', borderRadius: '12px',
        background: `${getModelInfo(selectedModel).badgeColor}10`,
        border: `1px solid ${getModelInfo(selectedModel).badgeColor}20`,
        transition: 'all 0.3s',
      }}>
        <span style={{ fontSize: '14px' }}>{getModelInfo(selectedModel).emoji}</span>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
          background: `${getModelInfo(selectedModel).badgeColor}20`,
          color: getModelInfo(selectedModel).badgeColor,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{getModelInfo(selectedModel).badge}</span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{getModelInfo(selectedModel).desc}</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{getModelInfo(selectedModel).speed}</span>
      </div>

      {showSettings && (
        <div style={{
          width: '100%', maxWidth: '700px', marginBottom: '12px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '16px',
          animation: 'aiFadeIn 0.2s ease',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>
              System Prompt (optional)
            </label>
            <textarea
              value={systemPrompt}
              onChange={event => setSystemPrompt(event.target.value)}
              placeholder="e.g. You are a Python expert. Only respond with code."
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: '13px', fontFamily: "'Inter', sans-serif",
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                Temperature: {temperature}
              </label>
              <input type="range" min="0" max="1.5" step="0.1" value={temperature}
                onChange={event => setTemperature(parseFloat(event.target.value))}
                style={{ width: '140px', accentColor: '#4caf50' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                Max tokens: {maxTokens}
              </label>
              <input type="range" min="50" max="1000" step="50" value={maxTokens}
                onChange={event => setMaxTokens(parseInt(event.target.value))}
                style={{ width: '140px', accentColor: '#4caf50' }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={scrollContainer} style={{
        width: '100%', maxWidth: '700px', flex: 1,
        overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: '16px', maxHeight: showSettings ? 'calc(100vh - 300px)' : 'calc(100vh - 160px)',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(76,175,80,0.2) transparent',
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: 'rgba(255,255,255,0.2)', fontSize: '13px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>🤖</div>
            Pure AI. No persona. No character.<br />
            Optional system prompt. Configurable params.<br />
            Just you and the model.
          </div>
        )}

        {messages.map((chatMessage, messageIndex) => (
          <div key={messageIndex} style={{
            display: 'flex',
            justifyContent: chatMessage.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '10px',
            animation: 'aiFadeIn 0.3s ease',
          }}>
            {chatMessage.role === 'assistant' && (
              <div style={{
                width: '26px', height: '26px', borderRadius: '8px',
                background: chatMessage.isError ? 'rgba(239,83,80,0.2)' : 'rgba(76,175,80,0.15)',
                border: `1px solid ${chatMessage.isError ? 'rgba(239,83,80,0.3)' : 'rgba(76,175,80,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', flexShrink: 0, marginRight: '8px', marginTop: '2px',
              }}>{chatMessage.isError ? '⚠' : '🤖'}</div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px',
              borderRadius: chatMessage.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: chatMessage.role === 'user'
                ? 'rgba(76,175,80,0.2)'
                : chatMessage.isError
                  ? 'rgba(239,83,80,0.1)'
                  : 'rgba(255,255,255,0.05)',
              border: chatMessage.role === 'user'
                ? '1px solid rgba(76,175,80,0.3)'
                : chatMessage.isError
                  ? '1px solid rgba(239,83,80,0.2)'
                  : '1px solid rgba(255,255,255,0.08)',
            }}>
              <pre style={{
                fontSize: '13px', lineHeight: 1.6, margin: 0,
                color: chatMessage.isError ? '#ef5350' : 'rgba(255,255,255,0.85)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: "'Inter', sans-serif",
              }}>{chatMessage.content}</pre>
              <div style={{
                fontSize: '9px', marginTop: '4px',
                color: 'rgba(255,255,255,0.2)',
                textAlign: chatMessage.role === 'user' ? 'right' : 'left',
              }}>{chatMessage.time}</div>
            </div>
          </div>
        ))}

        {isSending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '8px',
              background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
            }}>🤖</div>
            <div style={{
              padding: '10px 16px', borderRadius: '14px 14px 14px 4px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', gap: '4px',
            }}>
              {[0, 1, 2].map(dotIndex => (
                <div key={dotIndex} style={{
                  width: '5px', height: '5px', borderRadius: '50%', background: '#4caf50',
                  animation: `aiDot 1.2s ease ${dotIndex * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{
        width: '100%', maxWidth: '700px', padding: '12px 0 20px',
        display: 'flex', gap: '10px', background: '#07071a',
        position: 'sticky', bottom: 0,
      }}>
        <input
          ref={inputElement}
          value={inputText}
          onChange={event => setInputText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          style={{
            flex: 1, padding: '14px 18px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif",
            outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={event => { event.target.style.borderColor = 'rgba(76,175,80,0.4)'; }}
          onBlur={event => { event.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: inputText.trim() && !isSending ? '#4caf50' : 'rgba(255,255,255,0.06)',
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
