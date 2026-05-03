'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { PERSONAS, Persona } from '@/lib/personas';
import { NH_PERSONAS } from '@/lib/personas-nh';

const ALL_PERSONAS = [...PERSONAS, ...NH_PERSONAS];

type Message = { role: 'system' | 'user' | 'assistant'; content: string };
type Status = 'idle' | 'listening' | 'thinking' | 'speaking';
type SR = any;
declare global { interface Window { SpeechRecognition: new () => SR; webkitSpeechRecognition: new () => SR; } }

function getBestVoice(voices: SpeechSynthesisVoice[], persona: Persona): SpeechSynthesisVoice | null {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMacOS = /Macintosh/.test(ua) && !/Chrome/.test(ua);

  if (isIOS) {
    // iOS: prefer Siri/Karen (high-quality neural voices)
    return voices.find(v => /karen|siri|alice|tane/i.test(v.name) && v.lang.startsWith('en')) ||
           voices.find(v => v.lang === 'en-AU' && v.localService) ||
           voices.find(v => (v.lang === 'en-GB' || v.lang === 'en-AU') && v.localService) ||
           voices.find(v => v.lang.startsWith('en') && v.localService) ||
           null;
  }

  if (isAndroid) {
    // Android Chrome: prefer Google voices
    return voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
           voices.find(v => v.name.includes('en-US') && v.lang.startsWith('en')) ||
           null;
  }

  if (isMacOS) {
    // macOS Safari/Chrome: prefer Samantha/Alex
    return voices.find(v => /samantha|alex|Optima/i.test(v.name)) ||
           voices.find(v => v.lang.startsWith('en') && v.localService) ||
           null;
  }

  // Desktop Chrome / others: current filter as final fallback
  return voices.find(v =>
    (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
    && v.lang.startsWith('en')
  ) || null;
}

function speak(text: string, persona: Persona, onEnd: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = persona.voicePitch;
  utter.rate = persona.voiceRate;

  let voices = synth.getVoices();
  // iOS populates voices asynchronously — wait for them
  if (voices.length === 0) {
    const resolveVoices = () => {
      voices = synth.getVoices();
      const best = getBestVoice(voices, persona);
      if (best) utter.voice = best;
    };
    synth.onvoiceschanged = resolveVoices;
    // Kick off speech immediately — voices will update when available
    // but utterance plays regardless; we'll update voice when voices load
    const bestNow = getBestVoice(voices, persona);
    if (bestNow) utter.voice = bestNow;
  } else {
    const best = getBestVoice(voices, persona);
    if (best) utter.voice = best;
  }

  utter.onend = onEnd;
  utter.onerror = onEnd;
  synth.speak(utter);
}

const SCENARIO_BRIEF: Record<string, { prospectName: string; prospectTitle: string; dealObjective: string; objections: string[]; winConditions: string[] }> = {
  'difficult-customer': {
    prospectName: 'Marcus T.',
    prospectTitle: 'The Difficult Customer',
    dealObjective: 'Overcome skepticism and earn credibility — they\'ve been burned by three vendors who all promised the world. Provide specific proof, competitor data, and clear ROI.',
    objections: [
      '"I\'ve been burned by three vendors who all promised the world..."',
      'Needs specific proof, not promises — wants case studies',
      'Wants competitor comparison data before considering',
    ],
    winConditions: [
      'Provide concrete case studies from similar accounts',
      'Offer a trial period with risk reversal',
      'Get agreement on a follow-up call with actual data',
    ],
  },
  'annual-review': {
    prospectName: 'Jennifer K.',
    prospectTitle: 'Annual Review Manager',
    dealObjective: 'Navigate a mixed feedback review constructively — own the misses, present specifics, show a growth mindset, and leave with a credible 90-day development plan.',
    objections: [
      'Self-assessment is vague — they\'ll push back',
      'Past misses blamed on others — zero tolerance',
      'No concrete improvement plan presented',
    ],
    winConditions: [
      'Own mistakes without deflecting or making excuses',
      'Present specific, actionable improvement steps',
      'Agree on a 90-day check-in with clear milestones',
    ],
  },
  'new-account-pitch': {
    prospectName: 'David R.',
    prospectTitle: 'New Account Prospect',
    dealObjective: 'Break an 8-year incumbent relationship — they\'re cautious and transactional. Lead with data on switching costs, not charm. Respect the existing relationship.',
    objections: [
      'Switching costs feel too high for uncertain gain',
      'No compelling reason to leave a decade-long relationship',
      'Wants 90-day concrete value proof before anything',
    ],
    winConditions: [
      'Demonstrate break-even on switching costs with real math',
      'Show 90-day concrete value with named accounts',
      'Get agreement to a trial period with performance targets',
    ],
  },
  'hostile-prospect': {
    prospectName: 'Tyler B.',
    prospectTitle: 'Hostile Prospect',
    dealObjective: 'Stay composed under pressure — they enjoy watching reps squirm. Don\'t cave to ultimatums. Find the real underlying objection and redirect the conversation.',
    objections: [
      '"40% off and free delivery or forget it" ultimatums',
      'Won\'t cave to pressure tactics — will walk away',
      'Distracts with "three other distributors waiting"',
    ],
    winConditions: [
      'Stay calm under aggressive pressure',
      'Turn the conversation from price to real value',
      'Secure a follow-up without conceding on price',
    ],
  },
  'exit-interview': {
    prospectName: 'Sarah M.',
    prospectTitle: 'Exit Interview',
    dealObjective: 'Have an honest conversation about culture and leadership — they\'re curious, not angry. Don\'t hide behind corporate script. Deflecting or lying gets called out immediately.',
    objections: [
      'Culture concerns have surfaced since key people left',
      'Questions about management transparency',
      'Genuine curiosity about why people leave',
    ],
    winConditions: [
      'Give real answers, not corporate script',
      'Share specific examples rather than platitudes',
      'Show genuine care despite the exit situation',
    ],
  },
  'nh-grocery-buyer': {
    prospectName: 'Karen M.',
    prospectTitle: 'Regional Grocery Buyer',
    dealObjective: 'Secure 3 cold-box endcap positions for summer craft lineup at 4 NH Market Basket locations. They see 20 reps a week — come with velocity data, not stories.',
    objections: [
      'Slotting fee structure is unclear or too high',
      'Unproven velocity data — they want case counts',
      'Competing craft brands already featured on shelf',
    ],
    winConditions: [
      'Agree on 90-day trial with defined velocity targets',
      'Get signed deal memo or clear next step by end of call',
      'Confirm endcap or display support terms',
    ],
  },
  'nh-convenience-buyer': {
    prospectName: 'John M.',
    prospectTitle: 'C-Store Account Manager',
    dealObjective: 'Win cooler door space at a regional convenience chain — transactional, door-space obsessed. Fast turnover per door, consistent delivery windows, margin per square foot.',
    objections: [
      '4 cooler doors already committed — what\'s the pull?',
      'Consistent delivery windows are critical — can\'t miss',
      'Margin per square foot is the real metric they track',
    ],
    winConditions: [
      'Demonstrate fast case turnover per door with data',
      'Confirm delivery schedule they can count on',
      'Agree on promo support or staff training package',
    ],
  },
  'nh-liquor-store-owner': {
    prospectName: 'Mike T.',
    prospectTitle: 'NH Liquor Store Owner',
    dealObjective: 'Get shelf space at an independent package store — 18 years in the business, craft-savvy. They don\'t carry anything they can\'t stand behind. Know your brands cold.',
    objections: [
      '"I\'ve been doing this 18 years — give me three accounts actually moving it"',
      'Craft credibility is non-negotiable',
      'Will push back on slow-movers being dumped on them',
    ],
    winConditions: [
      'Name real accounts that are actually moving the product',
      'Offer distributor support for in-store tastings',
      'Commit to regular rep visits and no bad-account placement',
    ],
  },
  'nh-bar-owner': {
    prospectName: 'Tom R.',
    prospectTitle: 'NH Bar/Restaurant Owner',
    dealObjective: 'Win tap handle space and pour pricing advantage — they\'ve got 12 taps, 4 local craft, 3 macros. What\'s the pull? What are they doing for slow-Tuesday crowds?',
    objections: [
      'Tap handle exclusivity in their area — non-negotiable',
      'Vendor promo promises often don\'t deliver',
      'No tap fees they can\'t afford to absorb',
    ],
    winConditions: [
      'Offer tap handle exclusivity in their territory',
      'Present events, tap takeovers, and promo support',
      'Demonstrate the built-in fan base your brand brings',
    ],
  },
  'nh-restaurant-buyer': {
    prospectName: 'Alex K.',
    prospectTitle: 'Restaurant Beer Director',
    dealObjective: 'Position as premium craft addition for an upscale dining tap list — curated program, $9-14/pint. They want a story, workable margin, and a distributor who\'ll train staff.',
    objections: [
      '"I need something with a story and a margin that works"',
      'Professional buyers — won\'t dump commodity SKUs in',
      'Formal purchasing relationship required, no exceptions',
    ],
    winConditions: [
      'Demonstrate brand prestige that fits their guest profile',
      'Offer POS materials and formal staff education',
      'Confirm tap exclusivity in their territory',
    ],
  },
  'nh-district-manager': {
    prospectName: 'Chris L.',
    prospectTitle: 'District Sales Manager',
    dealObjective: 'Present a premium mix protection and fill rate recovery plan — they\'re KPI-driven. Supportive of reps who think, brutal with those who just report problems without solutions.',
    objections: [
      '"You\'re +4% on volume but lost 2 points of premium mix"',
      'Manchester account fill rate complaints need explanation',
      'Field reporting must be honest and specific',
    ],
    winConditions: [
      'Present a concrete premium mix protection plan',
      'Outline fill rate recovery steps with timeline',
      'Commit to honest field reporting at next debrief',
    ],
  },
  'nh-route-rep': {
    prospectName: 'Jake P.',
    prospectTitle: 'Route Sales Rep',
    dealObjective: 'Practice a routine check-in with a route rep — relationship management, order building, and addressing account issues on the fly. Low-pressure but requires structure.',
    objections: [
      'Ordering patterns and inventory gaps',
      'Competitor activity at their accounts',
      'Delivery or fill rate complaints to address',
    ],
    winConditions: [
      'Build the order with existing inventory gaps in mind',
      'Document competitor activity for follow-up',
      'Address any account issues and confirm next visit',
    ],
  },
  'nh-lost-account-recovery': {
    prospectName: 'Jason W.',
    prospectTitle: 'Win-Back: Lost Account',
    dealObjective: 'Recover a lost account that dropped your brand 3 months ago — a competing offer is on the table right now. Lead with what\'s changed, earn the conversation in 60 seconds.',
    objections: [
      '"I dropped your brand because it wasn\'t selling"',
      'Competing offer is actively being evaluated',
      'Needs a concrete reason to switch back, not promises',
    ],
    winConditions: [
      'Lead with what\'s materially different since they left',
      'Counter the active competing offer directly',
      'Secure an in-person meeting to present the full plan',
    ],
  },
  'nh-craft-enthusiast-owner': {
    prospectName: 'Brett K.',
    prospectTitle: 'Craft Brewery Taproom Owner',
    dealObjective: 'Earn distribution trust from an NH craft self-distributor — brand integrity, freshness, and territory protection are non-negotiable. No craft-washing with bad placements.',
    objections: [
      '"Are you going to put my 16oz hazy IPA in a place that cares about it?"',
      'Territory protection — no gas-station commoditization',
      'Freshness guarantees they can actually count on',
    ],
    winConditions: [
      'Commit to territory protection in writing',
      'Agree on freshness standards with delivery windows',
      'Promise no bad-account placement — ever',
    ],
  },
};


const NAV_ITEMS = [
  { emoji: '🏠', label: 'Dashboard', id: 'dashboard', href: '/dashboard' },
  { emoji: '🎤', label: 'Practice', id: 'practice', href: '/dashboard/practice' },
  { emoji: '👥', label: 'Personas', id: 'personas', href: '#' },
  { emoji: '⭐', label: 'Reviews', id: 'reviews', href: '#' },
  { emoji: '📈', label: 'Progress', id: 'progress', href: '#' },
  { emoji: '⚙️', label: 'Settings', id: 'settings', href: '#' },
];



import Sidebar from '@/components/Sidebar';
// OLD Sidebar removed — now using shared component

function OLD_SIDEBAR_PLACEHOLDER({ active }: { active: string }) {
  return (
    <aside style={{ width: 220, background: '#13151F', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px 0', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#D4860A', letterSpacing: '0.05em' }}>TrainField AI</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Sales Training OS</div>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => (
          <a
            key={item.id}
            href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, width: '100%',
              background: active === item.id ? 'rgba(212,134,10,0.15)' : 'transparent',
              color: active === item.id ? '#FAC765' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{item.emoji}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D4860A, #FAC765)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1A1208' }}>J</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Jordan</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Pro Member</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...style }}>
      {children}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#111827', background: '#fff', outline: 'none' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function PracticePage() {
  const [phase, setPhase] = useState<'setup' | 'call' | 'review'>('setup');
  const [selectedPersona, setSelectedPersona] = useState<Persona>(ALL_PERSONAS[0]);
  const [dealStage, setDealStage] = useState<'initial-pitch'|'proposal'|'negotiation'|'renewal'>('initial-pitch');
  const [difficulty, setDifficulty] = useState<'easy'|'challenging'|'intense'>('challenging');
  const [messages, setMessages] = useState<Message[]>([]);
  const [callSeconds, setCallSeconds] = useState(0);
  const [status, setStatus] = useState<'idle' | 'speaking' | 'listening' | 'thinking'>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_initial: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [activeNav, setActiveNav] = useState('practice');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customPersonas, setCustomPersonas] = useState<{ id: string; name: string; emoji: string; color: string; description: string; systemPrompt: string; openingLine: string; voicePitch: number; voiceRate: number; scoring_hints: string }[]>([]);
  const supabase = createClient();
  const allPersonasRef = useRef([...ALL_PERSONAS]);
  const conversationRef = useRef<Message[]>([]);
  const recognitionRef = useRef<SR | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const speakingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const groqErrorRef = useRef('');
  const goalsContextRef = useRef('');

  useEffect(() => {
    if (phase === 'call') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); setNameInput(d.profile?.display_name || ''); })
      .catch(() => {});
    // Load active sales goals for this team
    fetch('/api/goals')
      .then(r => r.json())
      .then(d => {
        if (d.goal_context) goalsContextRef.current = d.goal_context;
      })
      .catch(() => {});
    // Load custom personas for this team
    fetch('/api/personas')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.personas)) {
          setCustomPersonas(d.personas.filter((p: any) => p.active).map((p: any) => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            color: p.color,
            description: p.description || '',
            systemPrompt: p.system_prompt,
            openingLine: p.opening_line,
            voicePitch: p.voice_pitch,
            voiceRate: p.voice_rate,
            scoring_hints: p.scoring_hints || '',
          })));
        }
      })
      .catch(() => {});
  }, []);

  const brief = (SCENARIO_BRIEF as any)[selectedPersona.id] || SCENARIO_BRIEF.default;

  const getSystemPrompt = () => {
    const base = selectedPersona.systemPrompt;
    const stageContext: Record<string, string> = {
      'initial-pitch': `\n[DEAL STAGE: INITIAL PITCH] The prospect has not heard your full pitch yet. They are curious but guarded. They are evaluating whether you are worth their time. Do NOT concede on price. Focus on establishing credibility and qualifying their needs. Ask good discovery questions. Do not rush to present pricing.`,
      'proposal': `\n[DEAL STAGE: PROPOSAL] The prospect has seen your proposal/pricing. They are evaluating fit and value vs. cost. They will raise specific objections about pricing, terms, and competing options. They want to justify switching or signing. Help them build the business case — be specific about ROI and risk reversal.`,
      'negotiation': `\n[DEAL STAGE: NEGOTIATION] The prospect is actively negotiating. They want concessions — price, delivery, terms, exclusivity. They will push hard and may use pressure tactics. Do NOT cave to demands without getting something in return. Every concession should be conditional. Trade value, don't give things away for free.`,
      'renewal': `\n[DEAL STAGE: RENEWAL] This is a retention situation. The prospect may be comfortable but has likely already decided to leave or stay. Your job is to understand their current situation, acknowledge any past issues, and make a compelling case for staying. Acknowledge their current pain points. Don't assume loyalty.`,
    };
    const difficultyMod: Record<string, string> = {
      'easy': `\n[DIFFICULTY: EASY] The prospect is warm and receptive. They want this to work. Objections are mild and easily addressed. They will agree to next steps if you present a clear path forward. This is a cooperative conversation.`,
      'challenging': `\n[DIFFICULTY: CHALLENGING] The prospect is realistic and skeptical. They ask fair questions and push back on things that don't make sense. You must earn their trust through good answers, not charm. Respond with substance.`,
      'intense': `\n[DIFFICULTY: INTENSE] The prospect is aggressive, demanding, and uses pressure tactics. They will interrupt, issue ultimatums, and try to make you feel desperate. Do NOT show desperation. Stay composed. They may say "I have other options" or make extreme demands. Your job is to match their intensity with calm confidence and redirect to real value.`,
    };
    return base + (stageContext[dealStage] || '') + (difficultyMod[difficulty] || '');
  };

  const getBrief = () => {
    const base = (SCENARIO_BRIEF as any)[selectedPersona.id] || SCENARIO_BRIEF.default;
    const stageObjectives: Record<string, string> = {
      'initial-pitch': "Capture attention and establish credibility — qualify the prospect's needs before presenting anything. Focus on discovery.",
      'proposal': "Address the proposal evaluation — help them see clear value vs. cost. Handle pricing objections with ROI framing.",
      'negotiation': "Navigate concessions smartly — trade value for what matters, don't give things away free. Find the actual objection behind the pressure.",
      'renewal': "Understand why they might leave and make a compelling case to stay — acknowledge real issues and propose a path forward.",
    };
    return { ...base, dealObjective: stageObjectives[dealStage] || base.dealObjective };
  };

  const getOpeningLine = () => {
    const stageOpenings: Record<string, string> = {
      'initial-pitch': selectedPersona.openingLine,
      'proposal': `Thanks for sending that over. I've had a chance to look it over and I have some questions — some of the pricing is higher than what I expected. Can we walk through it?`,
      'negotiation': `Okay, I've got leadership involved and they have concerns. If we're going to move forward, we need to talk about what you can actually give us here. What's flex?`,
      'renewal': `I appreciate you reaching out about renewing, but I'd be lying if I said everything was great this year. We need to talk about what's changed.`,
    };
    return stageOpenings[dealStage] || selectedPersona.openingLine;
  };

  const brief = getBrief();

  const sendToGroq = async (userText: string) => {
    setStatus('thinking');
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
      groqErrorRef.current = e instanceof Error ? e.message : 'Something went wrong'; setStatus('idle');
    }
  };

  const startListening = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) { return; }
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

  const launchCall = () => {
    setPhase('call');
    setCallSeconds(0);
    setMessages([]);
    setStatus('idle');
    const goalContext = goalsContextRef.current || '';
    const opening = getOpeningLine();
    conversationRef.current = [{ role: 'system', content: getSystemPrompt() + (goalContext ? '\n\n' + goalContext : '') }];
    timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
    setStatus('speaking');
    speakingRef.current = true;
    speak(opening, selectedPersona, () => { speakingRef.current = false; setStatus('idle'); });
    setMessages([{ role: 'assistant', content: opening }]);
    conversationRef.current.push({ role: 'assistant', content: opening });
  };

  const endCall = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnalyzing(true);
    setPhase('review');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const transcript = conversationRef.current.filter(m => m.role !== 'system');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          scenarioName: `${selectedPersona.name} [${dealStage}] [${difficulty}]`,
          durationSeconds: callSeconds,
          scoringHints: (selectedPersona as any).scoring_hints || '',
        }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setReviewData(data.analysis);
      // Save to Supabase
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          scenario_name: `${selectedPersona.name} [${dealStage}] [${difficulty}]`,
          deal_stage: dealStage,
          difficulty_level: difficulty,
          transcript: conversationRef.current.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`),
          scores: data.analysis,
          coaching_tips: data.analysis.coachingTips,
          recommended_drill: data.analysis.recommendedDrill,
          duration_seconds: callSeconds,
        }),
      }).then(r => r.ok ? null : console.error('Session save failed', r.status))
      .catch(e => console.error('Session save error', e));
    } catch (e) {
      setReviewData(null);
    }
    setIsAnalyzing(false);
  };

  const statusColor: Record<Status, string> = { idle: 'rgba(255,255,255,0.3)', listening: '#ef4444', thinking: '#D4860A', speaking: '#9DC44B' };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar — desktop: always visible; mobile: slide-in overlay */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          width: 220,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
        className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}
      >
        <Sidebar active="practice" />
      </div>
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}

      <div style={{ flex: 1, overflow: 'auto', marginLeft: '220px' }} className="main-content">
        {/* Header with hamburger */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setMobileMenuOpen(true)} className="hamburger-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, display: 'none' }}>☰</button>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>🎤 Practice</div>
        </header>
        {/* ── SETUP PHASE ── */}
        {phase === 'setup' && (
          <div className="practice-grid-setup" style={{ padding: 32, display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, alignItems: 'start' }}>
            {/* Left: Setup */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Scenario Setup</div>
              <Select
                label="Persona"
                value={selectedPersona.id}
                onChange={v => {
                  const merged = [...ALL_PERSONAS, ...customPersonas];
                  setSelectedPersona(merged.find(p => p.id === v) || merged[0]);
                }}
                options={[...ALL_PERSONAS, ...customPersonas].map(p => ({ value: p.id, label: `${p.emoji} ${p.name}` }))}
              />
              <Select label="Deal Stage" value={dealStage} onChange={v => setDealStage(v as any)} options={[{ value: 'initial-pitch', label: 'Initial Pitch' }, { value: 'proposal', label: 'Proposal Stage' }, { value: 'negotiation', label: 'Negotiation' }, { value: 'renewal', label: 'Renewal' }]} />
              <Select label="Difficulty" value={difficulty} onChange={v => setDifficulty(v as any)} options={[{ value: 'easy', label: 'Easy' }, { value: 'challenging', label: 'Challenging' }, { value: 'intense', label: 'Intense' }]} />
              <button
                onClick={launchCall}
                style={{ width: '100%', marginTop: 8, padding: '14px', background: '#D4860A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}
              >
                🚀 Launch Simulation
              </button>
            </Card>

            {/* Right: Context brief */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Scenario Brief</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(212,134,10,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{selectedPersona.emoji}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{brief.prospectName}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{brief.prospectTitle}</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Deal Objective</div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{brief.dealObjective}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Likely Objections</div>
                {brief.objections.map(o => (
                  <div key={o} style={{ fontSize: 12, color: '#6b7280', padding: '6px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#D4860A' }}>◆</span>{o}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Win Conditions</div>
                {brief.winConditions.map(w => (
                  <div key={w} style={{ fontSize: 12, color: '#4ade80', padding: '6px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                    <span>✓</span>{w}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── LIVE CALL PHASE ── */}
        {phase === 'call' && (
          <div className="practice-grid-call" style={{ padding: 32, display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: 24, alignItems: 'start' }}>
            {/* Left: Compact brief */}
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Scenario Brief</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{selectedPersona.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{brief.prospectName}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{brief.prospectTitle}</div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Objective</div>
                <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>{brief.dealObjective}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Objections</div>
                {brief.objections.slice(0, 2).map(o => (
                  <div key={o} style={{ fontSize: 11, color: '#D4860A', marginBottom: 4 }}>◆ {o}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Win</div>
                {brief.winConditions.map(w => (
                  <div key={w} style={{ fontSize: 11, color: '#4ade80', marginBottom: 3 }}>✓ {w}</div>
                ))}
              </div>
            </Card>

            {/* Center: Phone + transcript */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {/* Phone mockup */}
              <div style={{ width: 260, background: '#0E0B05', borderRadius: 28, border: '1.5px solid rgba(212,134,10,0.35)', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ background: '#261C0B', padding: '14px 16px', borderBottom: '1px solid rgba(212,134,10,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, color: '#D4860A', letterSpacing: '0.05em' }}>TrainField</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live</span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', height: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 10, color: '#D4860A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Call with {brief.prospectName}</div>
                  {messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 10, display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 6 }}>
                      <div style={{ maxWidth: '80%', padding: '8px 10px', borderRadius: 12, fontSize: 12, lineHeight: 1.5, background: m.role === 'user' ? 'rgba(212,134,10,0.2)' : 'rgba(58,42,16,0.8)', color: 'rgba(245,237,216,0.85)', borderBottomLeftRadius: m.role === 'user' ? 12 : 4, borderBottomRightRadius: m.role === 'user' ? 4 : 12 }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(212,134,10,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>{formatTime(callSeconds)}</div>
                  <div style={{ flex: 1, height: 3, background: 'rgba(212,134,10,0.2)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: '70%', background: '#D4860A', borderRadius: 2 }} />
                  </div>
                </div>
              </div>

              {/* Status + mic */}
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: statusColor[status] }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[status] }} />
                  {status === 'idle' ? 'Tap mic to speak' : status === 'listening' ? 'Listening...' : status === 'thinking' ? 'Thinking...' : 'Speaking...'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button
                  onClick={handleMicClick}
                  style={{
                    width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: status === 'listening' ? '#ef4444' : status === 'speaking' ? '#9DC44B' : '#374151',
                    boxShadow: status === 'listening' ? '0 0 0 6px rgba(239,68,68,0.2)' : status === 'speaking' ? '0 0 0 6px rgba(157,196,75,0.2)' : 'none',
                  }}
                >
                  {status === 'listening' ? '🔴' : status === 'speaking' ? '🔊' : '🎤'}
                </button>
                <button
                  onClick={endCall}
                  style={{ padding: '12px 28px', borderRadius: 24, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: '#ef4444', color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                >
                  End Call & Analyze
                </button>
              </div>
            </div>

            {/* Right: Live context */}
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Live Signals</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Prospect mood</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['😐 Neutral', '🙂 Engaged', '😠 Skeptical'].map(s => (
                    <span key={s} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 12, background: s === '😠 Skeptical' ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', color: s === '😠 Skeptical' ? '#ef4444' : '#4ade80', border: `1px solid ${s === '😠 Skeptical' ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.3)'}` }}>{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 6 }}>Key moment markers</div>
                {['⏱ Call started', '🟡 Objection raised', '🟢 Buying signal'].map((item, i) => (
                  <div key={item} style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, display: 'flex', gap: 6 }}>
                    <span>{item.split(' ')[0]}</span><span>{item.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 6 }}>Talking points</div>
                <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, background: '#f9fafb', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #D4860A' }}>
                  Lead with velocity data. Ask what they'd need to see to move forward today. Don't mention price until they've asked.
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── REVIEW PHASE ── */}
        {phase === 'review' && (
          <div style={{ padding: 32 }}>
            <div className="practice-grid-review" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
              {/* Left: Score + transcript */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Score header */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{isAnalyzing ? 'Analyzing session...' : 'Overall Score'}</div>
                      {isAnalyzing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 1 }}>
                        {[0,1,2].map(i => <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4860A', animation: 'bob 1.2s ease-in-out infinite', animationDelay: i * 0.2 + 's' }} />)}
                      </div>
                      <span style={{ fontSize: 14, color: '#9ca3af' }}>Reviewing transcript...</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#D4860A' }}>{reviewData?.overallScore || '--'}<span style={{ fontSize: 18, color: '#9ca3af' }}>/100</span></div>
                  )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Scenario</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedPersona.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{formatTime(callSeconds)} duration</div>
                    </div>
                  </div>
                  {/* Skill breakdown */}
                  {([
                    { name: 'Objection Handling', value: reviewData?.objectionHandling, color: '#4ade80' },
                    { name: 'Value Articulation', value: reviewData?.valueArticulation, color: '#D4860A' },
                    { name: 'Confidence & Pacing', value: reviewData?.confidencePacing, color: '#9DC44B' },
                    { name: 'Closing Technique', value: reviewData?.closingTechnique, color: '#ef4444' },
                  ] as any).map(skill => (
                    <div key={skill.name} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{skill.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: skill.color }}>{skill.value}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${skill.value}%`, background: skill.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </Card>

                {/* Transcript */}
                <Card>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Transcript</div>
                  <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {messages.map((m, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.role === 'user' ? '#D4860A' : '#13151F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: m.role === 'user' ? '#fff' : '#D4860A', flexShrink: 0 }}>
                          {m.role === 'user' ? 'J' : selectedPersona.emoji}
                        </div>
                        <div style={{ maxWidth: '75%' }}>
                          <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3, textAlign: m.role === 'user' ? 'right' : 'left' }}>{m.role === 'user' ? 'Jordan (You)' : selectedPersona.name}</div>
                          <div style={{ padding: '10px 14px', borderRadius: 12, background: m.role === 'user' ? '#f9fafb' : '#f3f4f6', fontSize: 13, color: '#374151', lineHeight: 1.55, borderBottomLeftRadius: m.role === 'user' ? 12 : 4, borderBottomRightRadius: m.role === 'user' ? 4 : 12 }}>
                            {m.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right: AI Coach */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Card>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>AI Coach</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(reviewData?.coachingTips || []).map((tip: string, i: number) => (
                      <div key={i} style={{ padding: '14px', background: '#f9fafb', borderRadius: 10, borderLeft: '3px solid #D4860A' }}>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{tip}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Top Takeaways</div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 6 }}>✓ Strengths</div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, paddingLeft: 12 }}>{(reviewData?.strengths || []).join(' ')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#D4860A', marginBottom: 6 }}>→ Opportunities</div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, paddingLeft: 12 }}>{(reviewData?.opportunities || []).join(' ')}</div>
                  </div>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => setPhase('setup')} style={{ width: '100%', padding: '12px', background: '#fff', border: '1.5px solid #D4860A', borderRadius: 10, color: '#D4860A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Practice This Scenario Again
                  </button>
                  <a href="/dashboard" style={{ display: 'block', width: '100%', padding: '12px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                    ← Back to Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
      </div>
      <style>{`
        @media (min-width: 769px) {
          .hamburger-btn { display: block !important; }
          .main-content { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; flex: none !important; }
        }
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .main-content { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; flex: none !important; }
        }
      `}</style>
    </div>
  );
}
