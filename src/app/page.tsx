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

const USE_CASES = [
  { emoji: '🏪', title: 'New Account Pitch', desc: 'Practice pitching your portfolio to a skeptical retailer' },
  { emoji: '😤', title: 'Difficult Customer Objections', desc: 'Handle price complaints and pushback with confidence' },
  { emoji: '📋', title: 'Annual Review Prep', desc: 'Run through tough management conversations before they happen' },
  { emoji: '🤝', title: 'Contract Renewal Talks', desc: 'Negotiate terms with distributors who want more' },
  { emoji: '🍺', title: 'Tap Handle Advocacy', desc: 'Make the case for slower-moving craft SKUs' },
  { emoji: '🚪', title: 'Exit Interview Prep', desc: 'Navigate sensitive conversations with departing employees' },
];

const STEPS = [
  { num: '01', title: 'Pick a scenario', desc: 'Choose from distributor-specific conversations — new accounts, objections, management reviews, competitive situations.' },
  { num: '02', title: 'Talk it out', desc: 'Use your mic. The AI customer or manager talks back in real time — interruptions, pushback, all of it.' },
  { num: '03', title: 'Get better', desc: 'Every conversation sharpens your instinct. No judgment, no embarrassment. Just practice.' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Scenarios' },
  { id: 'grocery', label: '🛒 Off-Premise: Grocery & Retail' },
  { id: 'cstore', label: '⛽ Off-Premise: C-Stores & Convenience' },
  { id: 'liquor', label: '🏪 Off-Premise: Liquor & Package Stores' },
  { id: 'onprem', label: '🍺 On-Premise: Bars & Restaurants' },
  { id: 'internal', label: '📊 Distributor: Internal & Management' },
  { id: 'craft', label: '🏠 Craft & Specialty' },
  { id: 'competitive', label: '🎯 Competitive & Win-Back' },
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

  const statusColor: Record<Status, string> = { idle: '#6b7280', listening: '#ef4444', thinking: '#f59e0b', speaking: '#4ade80' };
  const statusLabel: Record<Status, string> = { idle: 'Tap mic to speak', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking...' };

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
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* ── NAV ── */}
      <header className="border-b border-[#21262d] px-6 py-4 sticky top-0 z-50 bg-[#0d1117]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍺</span>
            <div>
              <h1 className="text-lg font-bold text-[#f0f6fc]">TrainField AI</h1>
              <p className="text-xs text-[#6e7681]">for Beer Distribution Teams</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-6 text-sm text-[#8b949e]">
              <a href="#how-it-works" className="hover:text-[#e6edf3] transition-colors">How it works</a>
              <a href="#scenarios" className="hover:text-[#e6edf3] transition-colors">Scenarios</a>
              <a href="#start" className="hover:text-[#e6edf3] transition-colors">Try free</a>
            </nav>
            <span className="text-xs px-3 py-1.5 rounded-full bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30">
              Free — no account needed
            </span>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="px-6 py-20 text-center border-b border-[#21262d]">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            Built for beer distributors — free to try
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#f0f6fc] leading-tight mb-6">
            The AI flight simulator<br />for your sales team.
          </h2>
          <p className="text-lg text-[#8b949e] mb-8 leading-relaxed">
            Practice every conversation before it happens in the field. From angry retailer objections to annual review prep — your team talks to AI personas that push back, challenge, and coach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#start" className="px-8 py-4 rounded-xl bg-[#4ade80] text-[#0d1117] font-bold text-lg hover:bg-[#22c55e] transition-colors shadow-lg shadow-[#4ade80]/20">
              Start practicing — it's free
            </a>
            <a href="#how-it-works" className="px-8 py-4 rounded-xl border border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3] transition-all">
              See how it works →
            </a>
          </div>
        </div>
      </section>

      {/* ── PROOF STRIP ── */}
      <section className="border-b border-[#21262d] px-6 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: '13+', label: 'Scenario types' },
            { val: '100%', label: 'Voice-powered' },
            { val: '$0', label: 'Free to start' },
            { val: 'Local', label: 'Your data stays on-device' },
          ].map(({ val, label }) => (
            <div key={label}>
              <div className="text-3xl font-extrabold text-[#4ade80]">{val}</div>
              <div className="text-sm text-[#6e7681] mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-b border-[#21262d] px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-[#4ade80] uppercase tracking-widest mb-3">How it works</p>
          <h3 className="text-3xl font-bold text-[#f0f6fc] mb-10">Three steps to better conversations</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6">
                <div className="text-5xl font-extrabold text-[#21262d] mb-4 leading-none select-none">{num}</div>
                <h4 className="text-lg font-bold text-[#f0f6fc] mb-2">{title}</h4>
                <p className="text-sm text-[#8b949e] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="border-b border-[#21262d] px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-[#4ade80] uppercase tracking-widest mb-3">Scenarios</p>
          <h3 className="text-3xl font-bold text-[#f0f6fc] mb-3">Real conversations. Practiced safely.</h3>
          <p className="text-[#8b949e] mb-10">Every scenario is built for how beer distributors actually sell — from chain negotiations to craft evangelism.</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {USE_CASES.map(({ emoji, title, desc }) => (
              <div key={title} className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 hover:border-[#4ade80]/40 transition-all">
                <span className="text-3xl mb-3 block">{emoji}</span>
                <h4 className="font-bold text-[#f0f6fc] mb-1">{title}</h4>
                <p className="text-sm text-[#8b949e]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="border-b border-[#21262d] px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-[#4ade80] uppercase tracking-widest mb-3">Why voice first</p>
          <h3 className="text-3xl font-bold text-[#f0f6fc] mb-10">Because the words you say matter more than the ones you type</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🎤', title: 'Voice-powered practice', desc: 'Talk out loud — just like in the field. No typing, no friction. Your team practices the way they actually work.' },
              { icon: '😤', title: 'AI pushes back', desc: 'Not a scripted chatbot. These personas interrupt, challenge, and object — like real customers and managers.' },
              { icon: '⚡', title: 'Instant feedback', desc: 'Every conversation gives your team immediate insight into where they shine and where they stumble.' },
              { icon: '🔒', title: 'No data leaves your team', desc: 'Voice input stays local in the browser. Only text goes to the AI — nothing stored, nothing shared.' },
              { icon: '🍺', title: 'Built for distribution', desc: 'Scenarios written by people who know the beer business — chain negotiations, craft pitches, route-level conversations.' },
              { icon: '💸', title: 'Free to start', desc: 'No budget approval needed. Get your team practicing in minutes, not months.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-[#161b22] border border-[#21262d] rounded-xl p-5">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <h4 className="font-bold text-[#f0f6fc] mb-1">{title}</h4>
                  <p className="text-sm text-[#8b949e] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP START ── */}
      <section id="start" className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-[#f0f6fc] mb-3">Ready to practice?</h3>
            <p className="text-[#8b949e]">Pick a scenario below. Press mic. Start talking.</p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  categoryFilter === cat.id
                    ? 'border-[#4ade80] bg-[#1a2a1a] text-[#4ade80]'
                    : 'border-[#30363d] text-[#8b949e] hover:border-[#484f58]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Persona grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPersonas.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPersona(p)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedPersona.id === p.id
                    ? 'border-[#4ade80] bg-[#1a2a1a]'
                    : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58]'
                }`}
                style={selectedPersona.id === p.id ? { borderColor: p.color + '88' } : {}}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="font-semibold text-[#f0f6fc] text-sm">{p.name}</span>
                </div>
                <p className="text-xs text-[#8b949e] leading-relaxed">{p.description}</p>
              </button>
            ))}
          </div>

          <button
            onClick={startConversation}
            className="mt-6 w-full py-4 rounded-xl bg-[#4ade80] text-[#0d1117] font-bold text-lg hover:bg-[#22c55e] transition-colors shadow-lg shadow-[#4ade80]/20"
          >
            Start Roleplay — {selectedPersona.emoji} {selectedPersona.name}
          </button>
        </div>
      </section>

      {/* ── LIVE CONVERSATION (hidden until started) ── */}
      {started && (
        <section className="px-6 pb-16">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedPersona.emoji}</span>
                  <div>
                    <div className="font-bold text-[#f0f6fc]">{selectedPersona.name}</div>
                    <div className="text-xs text-[#6e7681]">Voice mode active — speak out loud</div>
                  </div>
                </div>
                <button onClick={resetConversation} className="text-xs text-[#6e7681] hover:text-[#e6edf3] underline underline-offset-2">
                  ← New scenario
                </button>
              </div>

              <div className="bg-[#0d1117] rounded-xl p-4 mb-4 min-h-[240px] max-h-[50vh] overflow-y-auto space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-[#484f58] text-sm py-8">Connecting...</div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#1f6feb] text-white rounded-br-md'
                        : 'bg-[#1c2128] text-[#c9d1d9] rounded-bl-md'
                    }`}>
                      <div className="text-xs opacity-60 mb-1">{m.role === 'user' ? 'You' : selectedPersona.name}</div>
                      {m.content}
                    </div>
                  </div>
                ))}
                {interimTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-[#1f6feb33] text-[#8b949e] italic border border-[#1f6feb44]">
                      {interimTranscript}<span className="animate-pulse">|</span>
                    </div>
                  </div>
                )}
                {status === 'thinking' && (
                  <div className="flex justify-start">
                    <div className="bg-[#1c2128] rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[#6e7681]">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-bounce" style={{animationDelay:'0ms'}} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-bounce" style={{animationDelay:'150ms'}} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-bounce" style={{animationDelay:'300ms'}} />
                        </span>
                        Thinking...
                      </div>
                    </div>
                  </div>
                )}
                {groqError && (
                  <div className="text-center text-xs text-[#f85149] py-2">⚠️ {groqError}</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: statusColor[status] }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor[status] }} />
                  {statusLabel[status]}
                </div>
                <button
                  onClick={handleMicClick}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all ${
                    status === 'listening'
                      ? 'bg-[#ef4444] shadow-[0_0_0_8px_#ef444444]'
                      : status === 'speaking'
                      ? 'bg-[#4ade80] shadow-[0_0_0_8px_#4ade8044]'
                      : 'bg-[#30363d] hover:bg-[#3d444d]'
                  }`}
                >
                  {status === 'listening' ? '🔴' : status === 'speaking' ? '🔊' : '🎤'}
                  {status === 'listening' && (
                    <span className="absolute inset-0 rounded-full border-4 border-[#ef4444] animate-ping opacity-40" />
                  )}
                </button>
                <p className="text-xs text-[#484f58]">
                  {status === 'idle' ? 'Press mic, then speak' : 'Press again to stop'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#21262d] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#6e7681] text-sm">
            <span className="text-lg">🍺</span>
            <span>TrainField AI — Built for Beer Distribution Teams</span>
          </div>
          <div className="text-xs text-[#484f58]">
            Voice stays local. Only text goes to the AI. No account needed.
          </div>
        </div>
      </footer>
    </div>
  );
}