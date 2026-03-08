import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initSession, sendMessage, addUserMessage, clearSession } from '../../store/slices/agentSlice';
import { Send, Bot, User, Loader, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

const QUICK_PROMPTS = [
  'Log a meeting with Dr. Sharma about Product X efficacy',
  'Search for cardiologists in Mumbai territory',
  'Show interaction history for HCP #1',
  'Suggest follow-ups for HCP #2',
  'Edit interaction #3 — change sentiment to positive',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`chat-message ${isUser ? 'chat-user' : 'chat-ai'}`}>
      <div className="chat-avatar">
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="chat-bubble-wrapper">
        <div className={`chat-bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
          <p>{msg.content}</p>
          {msg.interaction_id && (
            <div className="bubble-badge">
              <CheckCircle2 size={11} />
              Interaction #{msg.interaction_id} logged
            </div>
          )}
        </div>
        <span className="chat-time">{time}</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-message chat-ai">
      <div className="chat-avatar"><Bot size={14} /></div>
      <div className="chat-bubble bubble-ai typing-bubble">
        <span /><span /><span />
      </div>
    </div>
  );
}

export default function ChatInterface({ hcpId }) {
  const dispatch = useDispatch();
  const { sessionId, messages, loading } = useSelector(s => s.agent);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    dispatch(initSession());
  }, [dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || loading) return;
    setInput('');
    dispatch(addUserMessage(text));
    dispatch(sendMessage({ session_id: sessionId, message: text, hcp_id: hcpId }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    dispatch(clearSession());
    dispatch(initSession());
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-ai-dot" />
          <span className="chat-header-title">AI Assistant</span>
          <span className="chat-header-sub">Log interaction via chat</span>
        </div>
        <button className="chat-reset-btn" onClick={handleReset} title="New conversation">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <Sparkles size={28} className="chat-empty-icon" />
            <p className="chat-empty-title">Describe your HCP interaction</p>
            <p className="chat-empty-sub">
              I can log interactions, search HCPs, retrieve history, suggest follow-ups, and edit existing records.
            </p>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} className="quick-prompt-btn" onClick={() => handleQuickPrompt(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Describe interaction... (e.g. 'Met Dr. Smith, discussed Product X efficacy, positive sentiment')"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className={`chat-send-btn ${(!input.trim() || loading) ? 'disabled' : ''}`}
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader size={15} className="spin" /> : <Send size={15} />}
          </button>
        </div>
        <div className="chat-input-hint">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}
