'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PERSONAS, Persona } from '@/lib/personas';
import { NH_PERSONAS } from '@/lib/personas-nh';
const ALL_PERSONAS = [...PERSONAS, ...NH_PERSONAS];

type Message = { role: 'system' | 'user' | 'assistant'; content: string };
type Status = 'idle' | 'listening' | 'thinking' | 'speaking';
type SR = any;
declare global { interface Window { SpeechRecognition: new () => SR; webkitSpeechRecognition: new () => SR; } }

function speak(text: string, persona: Persona, onEnd: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = persona.voicePitch;
  utter.rate = persona.voiceRate;
  const voices = synth.getVoices();
  const preferred = voices.find(v => (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google') && v.name.includes('en-US')) && v.lang.startsWith('en'));
  if (preferred) utter.voice = preferred;
  utter.onend = onEnd;
  utter.onerror = onEnd;
  synth.speak(utter);
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'grocery', label: '🛒 Grocery & Retail' },
  { id: 'cstore', label: '⛽ C-Stores' },
  { id: 'liquor', label: '🏪 Liquor Stores' },
  { id: 'onprem', label: '🍺 Bars & Restaurants' },
  { id: 'internal', label: '📊 Internal & Management' },
  { id: 'craft', label: '🏠 Craft & Specialty' },
  { id: 'competitive', label: '🎯 Competitive & Win-Back' },
];

const TICKER_ITEMS = [
  'New Account Pitch', 'Hostile Prospect', 'Annual Review Prep',
  'Craft Brewery Taproom', 'NH Liquor Store Owner', 'Win-Back Campaign',
  'Contract Renewal', 'Route Sales Rep',
];

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(ALL_PERSONAS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [started, setStarted] = useState(false);
  const [groqError, setGroqError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const conversationRef = useRef<Message[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const speakingRef = useRef(false);
  const recognitionRef = useRef<SR | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendToGroq = async (userText: string) => {
    setStatus('thinking');
    setGroqError('');
    const conversationMessages = [...conversationRef.current, { role: 'user' as const, content: userText }];
    try {
      const response = await fetch('/api/groq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: conversationMessages }) });
      if (!response.ok) { const err = await response.text(); throw new Error(err); }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I'm sorry, I didn't catch that.";
      conversationRef.current = [...conversationMessages, { role: 'assistant', content: reply }];
      setMessages(prev => [...prev, { role: 'user', content: userText }, { role: 'assistant', content: reply }]);
      speak(reply, selectedPersona, () => { speakingRef.current = false; setStatus('idle'); });
      speakingRef.current = true; setStatus('speaking');
    } catch (e: unknown) {
      setGroqError(e instanceof Error ? e.message : 'Something went wrong'); setStatus('idle');
    }
  };

  const startConversation = useCallback(async () => {
    setStarted(true); setMessages([]); setGroqError('');
    conversationRef.current = [{ role: 'system', content: selectedPersona.systemPrompt }];
    speak(selectedPersona.openingLine, selectedPersona, () => { speakingRef.current = false; setStatus('idle'); });
    speakingRef.current = true; setStatus('speaking');
    setMessages([{ role: 'assistant', content: selectedPersona.openingLine }]);
    conversationRef.current.push({ role: 'assistant', content: selectedPersona.openingLine });
  }, [selectedPersona]);

  const startListening = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) { alert('Speech recognition not supported. Use Chrome or Edge.'); return; }
    if (synthRef.current) synthRef.current.cancel();
    speakingRef.current = false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    let finalTranscript = '';
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setInterimTranscript(interim);
    };
    recognition.onerror = () => { setStatus('idle'); setInterimTranscript(''); };
    recognition.onend = () => { setStatus('idle'); setInterimTranscript(''); if (finalTranscript.trim()) sendToGroq(finalTranscript.trim()); };
    setStatus('listening'); setInterimTranscript(''); recognition.start();
  };

  const stopSpeaking = () => {
    synthRef.current?.cancel(); speakingRef.current = false; recognitionRef.current?.abort(); setStatus('idle');
  };

  const handleMicClick = () => {
    if (status === 'speaking' || status === 'listening') stopSpeaking();
    else startListening();
  };

  const resetConversation = () => { stopSpeaking(); setStarted(false); setMessages([]); conversationRef.current = []; };

  const statusColor: Record<Status, string> = { idle: 'rgba(245,237,216,0.3)', listening: '#ef4444', thinking: '#D4860A', speaking: '#9DC44B' };

  const filteredPersonas = ALL_PERSONAS.filter(p => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'grocery') return ['nh-grocery-buyer'].includes(p.id);
    if (categoryFilter === 'cstore') return ['nh-convenience-buyer'].includes(p.id);
    if (categoryFilter === 'liquor') return ['nh-liquor-store-owner'].includes(p.id);
    if (categoryFilter === 'onprem') return ['nh-bar-owner', 'nh-restaurant-buyer'].includes(p.id);
    if (categoryFilter === 'internal') return ['nh-district-manager', 'nh-route-rep'].includes(p.id);
    if (categoryFilter === 'craft') return ['nh-craft-enthusiast-owner'].includes(p.id);
    if (categoryFilter === 'competitive') return ['nh-lost-account-recovery'].includes(p.id);
    return true;
  });

  return (
    <div>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-lines" />
        <div className="hero-left">
          <div className="eyebrow">
            <div className="eyebrow-dot" />
            For Beer Distribution Teams
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(72px, 8vw, 108px)', lineHeight: 0.92, letterSpacing: '0.01em', color: 'var(--cream)', marginBottom: 12 }}>
            Train<span style={{ color: 'var(--amber)', display: 'block' }}>Before<br />You Pitch.</span>
          </h1>
          <p className="tagline" style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.6, color: 'rgba(245,237,216,0.65)', maxWidth: 400, margin: '22px 0 40px' }}>
            The AI flight simulator for your sales team. Practice every conversation before it happens — from angry retailers to annual reviews.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="#start" className="btn-primary">Start for free</a>
            <a href="#how" className="btn-ghost">See how it works</a>
          </div>
          <div className="hero-stats">
            {[['13+', 'Scenario types'], ['100%', 'Voice-powered'], ['$0', 'Free to start']].map(([v, l]) => (
              <div key={l}>
                <div className="stat-num">{v}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <div className="hero-right">
          <div className="phone-wrap">
            <div className="phone-glow" />
            <div className="phone">
              <div className="phone-top">
                <div className="phone-logo">TrainField</div>
                <div className="live-badge"><div className="live-dot" />Live</div>
              </div>
              <div className="phone-body">
                <div className="scenario-tag">Scenario: Difficult Customer</div>
                <div className="chat-msg">
                  <div className="name-tag">AI Customer</div>
                  <div className="chat-bubble ai">Your prices are 12% above the competition. Why would I switch?</div>
                </div>
                <div className="chat-msg clearfix">
                  <div className="name-tag user-name">You</div>
                  <div className="chat-bubble user">The margin on our craft lineup beats their volume brands every time...</div>
                </div>
                <div className="chat-msg">
                  <div className="name-tag">AI Customer</div>
                  <div className="chat-bubble ai" style={{ background: 'var(--dark3)', display: 'flex', alignItems: 'center' }}>
                    <div className="typing"><span /><span /><span /></div>
                  </div>
                </div>
                <div className="mic-area">
                  <div className="mic-btn">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="4.5" y="1" width="5" height="7.5" rx="2.5" fill="#1A1208" />
                      <path d="M2 7.5a5 5 0 0010 0" stroke="#1A1208" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      <line x1="7" y1="12.5" x2="7" y2="13" stroke="#1A1208" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="mic-wave">
                    {[6,14,20,10,22,8,16,12,20,6].map((h, i) => <span key={i} style={{ height: h, animationDelay: `${i * 0.05}s` }} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker">
        <div className="ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">{item} <span className="ticker-sep">◆</span></span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="section">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to <em>better</em><br />conversations</h2>
        <div className="steps-grid">
          {[
            { num: '01', icon: '📋', title: 'Pick your scenario', desc: 'Choose from distributor-specific conversations — new accounts, chain buyers, management reviews, competitive situations.' },
            { num: '02', icon: '🎤', title: 'Talk it out', desc: 'Use your mic. The AI talks back in real time — with interruptions, pushback, and realistic objections.' },
            { num: '03', icon: '⚡', title: 'Get instant feedback', desc: 'Every session sharpens your instincts. No judgment. No embarrassment. Just practice that actually sticks.' },
          ].map(({ num, icon, title, desc }) => (
            <div key={num} className="step">
              <div className="step-num">{num}</div>
              <div className="step-icon">{icon}</div>
              <div className="step-title">{title}</div>
              <div className="step-desc">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PERSONAS ── */}
      <section className="personas-section">
        <div className="section-label">Who you&apos;ll practice with</div>
        <h2 className="section-title">Real personas.<br /><em>Real pushback.</em></h2>
        <div className="personas-grid">
          {[
            { emoji: '😤', name: 'The Difficult Customer', desc: 'Aggressive price pushback, complaints, and zero patience.', tag: 'Off-Premise' },
            { emoji: '🛒', name: 'Grocery Chain Buyer', desc: 'Controls shelf space at Market Basket, Shaw&apos;s, Hannaford.', tag: 'Retail' },
            { emoji: '🔥', name: 'Hostile Prospect', desc: 'Wants everything, gives nothing. Extreme resilience test.', tag: 'Win-Back' },
            { emoji: '📊', name: 'District Sales Manager', desc: 'Pushing volume, tracking Nielsen numbers, managing SG&A.', tag: 'Internal' },
          ].map(({ emoji, name, desc, tag }) => (
            <div key={name} className="persona-card">
              <div className="persona-emoji">{emoji}</div>
              <div className="persona-name">{name}</div>
              <div className="persona-desc">{desc}</div>
              <div className="persona-tag">{tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY VOICE ── */}
      <section className="why-section">
        <div className="why-left">
          <div className="section-label">Why it works</div>
          <h2 className="section-title">Words spoken <em>matter</em><br />more than typed</h2>
          <p style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.75, color: 'rgba(245,237,216,0.55)', maxWidth: 440, marginBottom: 36 }}>
            Your reps don&apos;t send emails in the field. They talk. TrainField trains the muscle that actually matters — your voice, your instincts, your timing.
          </p>
          <ul className="why-features">
            {[
              { icon: '🎤', strong: 'Voice-first practice', text: 'Talk out loud — just like you would with a real account.' },
              { icon: '🤖', strong: 'AI that pushes back', text: 'Not a script. These personas interrupt, challenge, and object.' },
              { icon: '🔒', strong: 'Your data stays local', text: 'Voice stays in-browser. Only text goes to the AI.' },
            ].map(({ icon, strong, text }) => (
              <li key={strong}>
                <div className="feature-icon">{icon}</div>
                <div>
                  <span className="feature-strong">{strong}</span>
                  {text}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="why-right">
          <div className="feedback-card">
            <div className="feedback-header">
              <div className="fb-title">Session Debrief</div>
              <div className="fb-score">84 / 100</div>
            </div>
            <div className="feedback-body">
              {[
                { label: 'Objection Handling', pct: 91 },
                { label: 'Value Articulation', pct: 78 },
                { label: 'Confidence & Pacing', pct: 85 },
                { label: 'Closing Technique', pct: 72 },
              ].map(({ label, pct }) => (
                <div key={label} className="meter-row">
                  <div className="meter-label"><span>{label}</span><span>{pct}%</span></div>
                  <div className="meter-track"><div className="meter-fill" style={{ width: `${pct}%` }} /></div>
                </div>
              ))}
              <div className="fb-quote">
                Strong on data — you quoted margin numbers confidently. Work on closing earlier; you circled price twice without asking for the order.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APP SECTION ── */}
      <section id="start" className="app-section">
        <div className="section-label">Try it now</div>
        <h2 className="section-title" style={{ fontSize: 'clamp(40px, 4vw, 64px)', marginBottom: 16 }}>
          Pick a scenario.<br />Press mic. Start talking.
        </h2>
        <p style={{ fontSize: 15, fontWeight: 300, color: 'rgba(245,237,216,0.5)', marginBottom: 40, maxWidth: 500 }}>
          No account needed. No budget approval. Get your team practicing in minutes.
        </p>

        {/* Category filter */}
        <div className="cat-filter">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`cat-btn ${categoryFilter === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Persona grid */}
        <div className="persona-grid">
          {filteredPersonas.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPersona(p)}
              className={`persona-card ${selectedPersona.id === p.id ? 'selected' : ''}`}
              style={selectedPersona.id === p.id ? { borderColor: 'var(--amber)', background: 'var(--dark2)' } : {}}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{p.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)' }}>{p.name}</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(245,237,216,0.4)', lineHeight: 1.5 }}>{p.description}</p>
            </button>
          ))}
        </div>

        <button
          onClick={startConversation}
          className="btn-primary"
          style={{ display: 'block', marginTop: 32, fontSize: 15, padding: '16px 40px' }}
        >
          Start Roleplay — {selectedPersona.emoji} {selectedPersona.name}
        </button>
      </section>

      {/* ── LIVE CONVERSATION ── */}
      {started && (
        <div className="conv-wrap" style={{ padding: '0 70px 100px', background: 'var(--dark2)' }}>
          <div className="conv-card" style={{ maxWidth: 480, margin: '0 auto' }}>
            <div className="conv-header">
              <div className="conv-title">{selectedPersona.emoji} {selectedPersona.name}</div>
              <button onClick={resetConversation} className="reset-btn">← New scenario</button>
            </div>
            <div className="conv-body">
              {messages.length === 0 && (
                <div className="conv-thinking"><span /><span /><span />Connecting...</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`conv-msg ${m.role === 'user' ? 'clearfix' : ''}`}>
                  <div className="conv-meta" style={m.role === 'user' ? { textAlign: 'right' } : {}}>{m.role === 'user' ? 'You' : selectedPersona.name}</div>
                  <div className={`conv-bubble ${m.role === 'user' ? 'conv-user' : 'conv-ai'}`}>{m.content}</div>
                </div>
              ))}
              {interimTranscript && (
                <div className="conv-msg clearfix" style={{ textAlign: 'right' }}>
                  <div className="conv-meta">You</div>
                  <div className="conv-bubble interim">{interimTranscript}|</div>
                </div>
              )}
              {status === 'thinking' && (
                <div className="conv-thinking"><span /><span /><span />Thinking...</div>
              )}
              {groqError && <div className="conv-error">⚠ {groqError}</div>}
              <div ref={messagesEndRef} />
            </div>
            <div className="conv-footer">
              <div className="conv-status">
                <div className="conv-dot" style={{ background: statusColor[status] }} />
                {status === 'idle' ? 'Tap mic to speak' : status === 'listening' ? 'Listening...' : status === 'thinking' ? 'Thinking...' : 'Speaking...'}
              </div>
              <button
                onClick={handleMicClick}
                className={`mic-large ${status === 'listening' ? 'listening' : status === 'speaking' ? 'speaking' : 'idle'}`}
              >
                {status === 'listening' ? '🔴' : status === 'speaking' ? '🔊' : '🎤'}
              </button>
              <p className="mic-hint">{status === 'idle' ? 'Press mic, then speak out loud' : 'Press again to stop'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── FINAL CTA ── */}
      <section className="cta-section">
        <h2 className="font-display" style={{ color: 'var(--dark)', fontSize: 'clamp(56px, 7vw, 96px)', marginBottom: 20 }}>
          Ready to<br />practice?
        </h2>
        <p>No account needed. No budget approval. Get your team practicing in minutes — not months.</p>
        <button className="btn-dark">Start for free — no signup</button>
        <div className="free-note">Voice stays local · No account needed · Free to start</div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-logo">TrainField AI</div>
        <div className="footer-note">Built for beer distribution teams · Voice stays local · No account needed</div>
      </footer>
    </div>
  );
}
