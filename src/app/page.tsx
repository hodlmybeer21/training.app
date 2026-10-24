'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PERSONAS, Persona } from '@/lib/personas';
import { NH_PERSONAS } from '@/lib/personas-nh';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
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
  { id: 'liquor', label: '🏪 Beer & Wine Shops' },
  { id: 'onprem', label: '🍺 Bars & Restaurants' },
  { id: 'internal', label: '📊 Internal & Management' },
  { id: 'craft', label: '🏠 Craft & Specialty' },
  { id: 'competitive', label: '🎯 Competitive & Win-Back' },
];

const TICKER_ITEMS = [
  'New Account Pitch', 'Hostile Prospect', 'Annual Review Prep',
  'Craft Brewery Taproom', 'Beer & Wine Shop Owner', 'Win-Back Campaign',
  'Contract Renewal', 'Route Sales Rep',
];

type Analysis = {
  overallScore: number;
  discovery: number;
  objectionHandling: number;
  valueArticulation: number;
  confidencePacing: number;
  closingTechnique: number;
  strengths?: string[];
  opportunities?: string[];
  coachingTips?: string[];
  recommendedDrill?: string;
};

const SKILLS: { key: keyof Analysis; label: string }[] = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'objectionHandling', label: 'Objection Handling' },
  { key: 'valueArticulation', label: 'Value Articulation' },
  { key: 'confidencePacing', label: 'Confidence & Pacing' },
  { key: 'closingTechnique', label: 'Closing Technique' },
];

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(ALL_PERSONAS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [started, setStarted] = useState(false);
  const [groqError, setGroqError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typed, setTyped] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [startedAt, setStartedAt] = useState(0);

  const conversationRef = useRef<Message[]>([]);
  const speakingRef = useRef(false);
  const recognitionRef = useRef<SR | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

  const userTurns = messages.filter(m => m.role === 'user').length;
  // The public API accepts up to 24 messages per demo call (opening line + 11 exchanges).
  const DEMO_MAX_TURNS = 11;
  const atTurnLimit = userTurns >= DEMO_MAX_TURNS;

  const sendToGroq = async (userText: string) => {
    if (conversationRef.current.filter(m => m.role === 'user').length >= DEMO_MAX_TURNS) return;
    setStatus('thinking');
    setGroqError('');
    const conversationMessages = [...conversationRef.current, { role: 'user' as const, content: userText }];
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    try {
      // Public demo: the server sets the persona prompt from personaId, so only the turns are sent.
      const response = await fetch('/api/groq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: selectedPersona.id, messages: conversationMessages.filter(m => m.role !== 'system') }) });
      if (!response.ok) { const err = await response.json().catch(() => null); throw new Error(err?.error || 'Something went wrong'); }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I didn't catch that.";
      conversationRef.current = [...conversationMessages, { role: 'assistant', content: reply }];
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(reply, selectedPersona, () => { speakingRef.current = false; setStatus('idle'); });
      speakingRef.current = true; setStatus('speaking');
      if (!window.speechSynthesis) setStatus('idle');
    } catch (e: unknown) {
      // Keep the user's line in the history so they can retry or end the call.
      conversationRef.current = conversationMessages;
      setGroqError(e instanceof Error ? e.message : 'Something went wrong'); setStatus('idle');
    }
  };

  const startConversation = useCallback(async () => {
    setStarted(true); setMessages([]); setGroqError(''); setAnalysis(null); setAnalyzeError(''); setTyped('');
    setStartedAt(Date.now());
    conversationRef.current = [{ role: 'assistant', content: selectedPersona.openingLine }];
    speak(selectedPersona.openingLine, selectedPersona, () => { speakingRef.current = false; setStatus('idle'); });
    speakingRef.current = true; setStatus(window.speechSynthesis ? 'speaking' : 'idle');
    setMessages([{ role: 'assistant', content: selectedPersona.openingLine }]);
    setTimeout(() => convRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [selectedPersona]);

  const startListening = () => {
    if (!voiceSupported || atTurnLimit) return;
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SRClass();
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
    window.speechSynthesis?.cancel(); speakingRef.current = false; recognitionRef.current?.abort(); setStatus('idle');
  };

  const handleMicClick = () => {
    if (status === 'speaking' || status === 'listening') stopSpeaking();
    else startListening();
  };

  const sendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const text = typed.trim();
    if (!text || status === 'thinking' || atTurnLimit) return;
    window.speechSynthesis?.cancel();
    setTyped('');
    sendToGroq(text);
  };

  const endAndScore = async () => {
    stopSpeaking();
    setAnalyzing(true); setAnalyzeError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: selectedPersona.id,
          transcript: conversationRef.current.filter(m => m.role !== 'system'),
          durationSeconds: Math.round((Date.now() - startedAt) / 1000),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.analysis) throw new Error(data?.error || 'Could not score this call. Try again.');
      setAnalysis(data.analysis);
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'Could not score this call. Try again.');
    }
    setAnalyzing(false);
    setTimeout(() => convRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const resetConversation = () => {
    stopSpeaking(); setStarted(false); setMessages([]); setAnalysis(null); setAnalyzeError(''); conversationRef.current = [];
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

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
      <SiteHeader />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-lines" />
        <div className="hero-left">
          <div className="eyebrow">
            <div className="eyebrow-dot" />
            For beer distribution sales reps
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(72px, 8vw, 108px)', lineHeight: 0.92, letterSpacing: '0.01em', color: 'var(--cream)', marginBottom: 12 }}>
            Train<span style={{ color: 'var(--amber)', display: 'block' }}>Before<br />You Pitch.</span>
          </h1>
          <p className="tagline" style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.6, color: 'rgba(245,237,216,0.7)', maxWidth: 440, margin: '22px 0 40px' }}>
            Rehearse the tough buyer conversation out loud with an AI buyer who pushes back, then get a scored debrief on what to fix before the real call.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="#demo" className="btn-primary">Try the free demo</a>
            <a href="/pricing" className="btn-ghost">See plans</a>
          </div>
          <div className="hero-stats">
            {[[String(ALL_PERSONAS.length), 'Buyer scenarios'], ['5', 'Skills scored'], ['$0', 'Demo, no signup']].map(([v, l]) => (
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
            { num: '01', icon: '📋', title: 'Pick a buyer', desc: 'Grocery chain buyers, c-store managers, bar owners, beer directors, win-back accounts and your own district manager.' },
            { num: '02', icon: '🎤', title: 'Talk it out', desc: 'Speak into your mic (or type). The AI buyer answers in character with real pushback on price, space and support.' },
            { num: '03', icon: '⚡', title: 'Get scored', desc: 'End the call for a 0–100 score across discovery, objections, value, pacing and closing, plus specific tips and a next drill.' },
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
        <h2 className="section-title">Real situations.<br /><em>Real pushback.</em></h2>
        <div className="personas-grid">
          {[
            { emoji: '🛒', name: 'Grocery Chain Buyer', desc: "Twelve feet of cold space and a hundred distributors pitching. Controls slotting and promo calendars.", tag: 'Off-Premise' },
            { emoji: '⛽', name: 'C-Store Account Manager', desc: 'Four cooler doors, a tight delivery window, and zero patience for slow movers.', tag: 'C-Store' },
            { emoji: '🎯', name: 'Win-Back: Lost Account', desc: 'Dropped your brand three months ago and has a competing offer on the table.', tag: 'Win-Back' },
            { emoji: '📊', name: 'District Sales Manager', desc: 'Ride-along debrief on volume, premium mix and fill-rate complaints.', tag: 'Internal' },
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
            Reps don&apos;t send emails in the field. They talk. TrainField trains the part that matters in a buyer meeting: what you say, how you handle the objection, and whether you ask for the order.
          </p>
          <ul className="why-features">
            {[
              { icon: '🎤', strong: 'Voice-first practice', text: 'Talk out loud, like you would with a real account. Typing works too.' },
              { icon: '🤖', strong: 'AI that pushes back', text: 'Not a script. Buyers object, stall and ask what you will do for them.' },
              { icon: '🔒', strong: 'Clear about your data', text: 'The demo saves nothing. Your browser turns speech into text (Chrome uses Google for this), and the text goes to our AI provider to reply and score. See Privacy.' },
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
              <div className="fb-title">Sample debrief</div>
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
                Strong on data. You quoted margin numbers confidently. Work on closing earlier; you circled price twice without asking for the order.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section id="demo" className="app-section">
        <span id="start" />
        <div className="section-label">Free demo · no account</div>
        <h2 className="section-title" style={{ fontSize: 'clamp(40px, 4vw, 64px)', marginBottom: 16 }}>
          Pick a buyer.<br />Talk. Get your score.
        </h2>
        <p style={{ fontSize: 15, fontWeight: 300, color: 'rgba(245,237,216,0.55)', marginBottom: 40, maxWidth: 560, lineHeight: 1.6 }}>
          Choose a scenario, make your pitch with your mic or keyboard, then end the call for a scored debrief. Demo calls aren&apos;t saved.
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
              style={selectedPersona.id === p.id ? { borderColor: 'var(--amber)', background: 'var(--dark2)', textAlign: 'left' } : { textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{p.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)' }}>{p.name}</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(245,237,216,0.45)', lineHeight: 1.5 }}>{p.description}</p>
            </button>
          ))}
        </div>

        <button
          onClick={startConversation}
          className="btn-primary"
          style={{ display: 'block', marginTop: 32, fontSize: 15, padding: '16px 40px' }}
        >
          Start roleplay: {selectedPersona.emoji} {selectedPersona.name}
        </button>
      </section>

      {/* ── LIVE CONVERSATION / DEBRIEF ── */}
      {started && (
        <div ref={convRef} className="conv-wrap" style={{ padding: '0 70px 100px', background: 'var(--dark2)', maxWidth: 'none', scrollMarginTop: 80 }}>
          {!analysis ? (
            <div className="conv-card" style={{ maxWidth: 520, margin: '0 auto' }}>
              <div className="conv-header">
                <div className="conv-title">{selectedPersona.emoji} {selectedPersona.name}</div>
                <button onClick={resetConversation} className="reset-btn" style={{ margin: 0 }}>← New scenario</button>
              </div>
              <div className="conv-body">
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
                {atTurnLimit && status !== 'thinking' && <div className="conv-error" style={{ color: 'var(--amber-light)' }}>That&apos;s the end of the demo call. End it below to get your score.</div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="conv-footer">
                {voiceSupported ? (
                  <>
                    <div className="conv-status">
                      <div className="conv-dot" style={{ background: statusColor[status] }} />
                      {status === 'idle' ? 'Tap the mic to speak' : status === 'listening' ? 'Listening...' : status === 'thinking' ? 'Thinking...' : 'Speaking...'}
                    </div>
                    <button
                      onClick={handleMicClick}
                      aria-label={status === 'listening' || status === 'speaking' ? 'Stop' : 'Start speaking'}
                      className={`mic-large ${status === 'listening' ? 'listening' : status === 'speaking' ? 'speaking' : 'idle'}`}
                    >
                      {status === 'listening' ? '🔴' : status === 'speaking' ? '🔊' : '🎤'}
                    </button>
                    <p className="mic-hint">{status === 'idle' ? 'Press the mic, then speak out loud' : 'Press again to stop'}</p>
                  </>
                ) : (
                  <p className="mic-hint" style={{ marginTop: 0 }}>Voice input needs Chrome or Edge. You can type your replies below.</p>
                )}
                <div className="conv-actions">
                  <form className="type-row" onSubmit={sendTyped}>
                    <input
                      value={typed}
                      onChange={e => setTyped(e.target.value)}
                      placeholder={voiceSupported ? 'Or type your reply…' : 'Type your reply…'}
                      maxLength={1000}
                      aria-label="Type your reply"
                    />
                    <button type="submit" className="btn-primary" disabled={!typed.trim() || status === 'thinking' || atTurnLimit}>Send</button>
                  </form>
                  <button className="btn-end" onClick={endAndScore} disabled={userTurns === 0 || analyzing || status === 'thinking'}>
                    {analyzing ? 'Scoring your call…' : userTurns === 0 ? 'Make your pitch to unlock your score' : 'End call & get my score'}
                  </button>
                  {analyzeError && <div className="conv-error">⚠ {analyzeError}</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="feedback-card debrief">
              <div className="feedback-header">
                <div className="fb-title">Your debrief · {selectedPersona.name}</div>
                <button onClick={resetConversation} className="reset-btn" style={{ margin: 0 }}>Try another →</button>
              </div>
              <div className="feedback-body">
                <div className="debrief-score"><b>{clamp(analysis.overallScore)}</b><span>/ 100 overall</span></div>
                <div style={{ marginTop: 18 }}>
                  {SKILLS.map(({ key, label }) => (
                    <div key={key} className="meter-row">
                      <div className="meter-label"><span>{label}</span><span>{clamp(analysis[key])}</span></div>
                      <div className="meter-track"><div className="meter-fill" style={{ width: `${clamp(analysis[key])}%` }} /></div>
                    </div>
                  ))}
                </div>
                {!!analysis.strengths?.length && (<><h4>What worked</h4><ul>{analysis.strengths.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
                {!!analysis.opportunities?.length && (<><h4>What to fix</h4><ul>{analysis.opportunities.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
                {!!analysis.coachingTips?.length && (<><h4>Coaching tips</h4><ul>{analysis.coachingTips.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
                {analysis.recommendedDrill && (<div className="fb-quote"><strong style={{ color: 'var(--amber)' }}>Next drill: </strong>{analysis.recommendedDrill}</div>)}
                <div className="debrief-cta">
                  <p>Demo scores aren&apos;t saved. With a plan, every call is scored and saved so you can track progress over time, and managers can see the whole team.</p>
                  <div className="row">
                    <a href="/pricing" className="btn-primary">See plans</a>
                    <button onClick={startConversation} className="btn-ghost">Run it again</button>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(245,237,216,0.3)', marginTop: 14 }}>Scores are AI-generated coaching feedback, not a performance review.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FINAL CTA ── */}
      <section className="cta-section">
        <h2 className="font-display" style={{ color: 'var(--dark)', fontSize: 'clamp(56px, 7vw, 96px)', marginBottom: 20 }}>
          Ready to<br />practice?
        </h2>
        <p>Run a free demo call right now, no account needed. When you want your calls saved and tracked, plans start at $19 a month.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <a href="#demo" className="btn-dark">Start the free demo</a>
          <a href="/pricing" className="btn-dark" style={{ background: 'transparent', color: 'var(--dark)', border: '1px solid rgba(26,18,8,0.4)' }}>See plans</a>
        </div>
        <div className="free-note">Free demo · No signup · Demo calls aren&apos;t saved</div>
      </section>

      <SiteFooter />
    </div>
  );
}
