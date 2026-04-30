useCallback(() => {
    setPhase('live');
    setMessages([]);
    setCallTimer(0);
    responseIdx.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    const opening: Message = { role: 'assistant', content: selectedPersona.openingLine };
    setMessages([opening]);
    setStatus('speaking');
    setTimeout(() => setStatus('idle'), 2200);
  }, [selectedPersona]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes bob { 0%, 100% { transform: translateY(0); opacity: 0.3; } 50% { transform: translateY(-4px); opacity: 1; } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212,134,10,0.3); border-radius: 3px; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
        <Sidebar active="practice" />

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Practice Mode</h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                {phase === 'setup' ? 'Configure your scenario and start simulating' : phase === 'live' ? \`Call in progress — \${formatTime(callTimer)}\` : 'Session complete — review your performance'}
              </p>
            </div>
            {phase === 'live' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>Connected</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{formatTime(callTimer)}</span>
              </div>
            )}
          </header>

          <div style={{ padding: 24, flex: 1 }}>
            {phase === 'setup' && (
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: 20, height: 'calc(100vh - 160px)', alignItems: 'start' }}>
                {/* LEFT: Setup Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Card>
                    <CardLabel>Scenario Setup</CardLabel>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>AI Prospect Persona</div>
                      <select
                        value={selectedPersona.id}
                        onChange={e => { const p = ALL_PERSONAS.find(x => x.id === e.target.value); if (p) setSelectedPersona(p); }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#111827', background: '#fff', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', outline: 'none' }}
                      >
                        {ALL_PERSONAS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                      </select>
                    </div>
                    <FieldSelect value={industry} onChange={setIndustry} options={INDUSTRIES} label="Industry" />
                    <FieldSelect value={dealStage} onChange={setDealStage} options={DEAL_STAGES} label="Deal Stage" />
                    <FieldSelect value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} label="Difficulty" />
                    <button
                      onClick={handleLaunch}
                      style={{ width: '100%', padding: '14px', background: '#D4860A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 8 }}
                    >
                      🎤 Launch Simulation
                    </button>
                  </Card>
                </div>

                {/* CENTER: Preview */}
                <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212,134,10,0.15), rgba(212,134,10,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20 }}>{selectedPersona.emoji}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{selectedPersona.name}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, textAlign: 'center', maxWidth: 300 }}>{selectedPersona.description}</div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Industry</div>
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{industry}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage</div>
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{dealStage}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#D4860A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Difficulty</div>
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{difficulty}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Press "Launch Simulation" to begin your call</div>
                </div>

                {/* RIGHT: Context */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ProspectContext persona={selectedPersona} />
                </div>
              </div>
            )}

            {phase === 'live' && (
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: 20, height: 'calc(100vh - 160px)', alignItems: 'start' }}>
                {/* LEFT: Setup summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Card>
                    <CardLabel>Active Scenario</CardLabel>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 24 }}>{selectedPersona.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedPersona.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{industry}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}><span style={{ color: '#374151', fontWeight: 500 }}>Deal Stage:</span> {dealStage}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}><span style={{ color: '#374151', fontWeight: 500 }}>Difficulty:</span> {difficulty}</div>
                  </Card>
                  <Card>
                    <CardLabel>Quick Stats</CardLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#D4860A' }}>{messages.filter(m => m.role === 'user').length}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Lines</div>
                      </div>
                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#4ade80' }}>{formatTime(callTimer)}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* CENTER: Live Call */}
                <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <CardLabel style={{ marginBottom: 0 }}>Live Call</CardLabel>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>Connected</span>
                    </div>
                  </div>
                  <LiveCallPanel
                    messages={messages}
                    status={status}
                    interimTranscript={interimTranscript}
                    callTimer={callTimer}
                    isMuted={isMuted}
                    isPaused={isPaused}
                    onMicClick={handleMicClick}
                    onEnd={handleEndCall}
                    onMute={() => setIsMuted(m => !m)}
                    onPause={() => setIsPaused(p => !p)}
                    persona={selectedPersona}
                  />
                </div>

                {/* RIGHT: Prospect context */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ProspectContext persona={selectedPersona} />
                </div>
              </div>
            )}

            {phase === 'analysis' && (
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: 28 }}>{selectedPersona.emoji}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{selectedPersona.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{industry} · {dealStage} · {formatTime(callTimer)} call</div>
                  </div>
                </div>
                <AnalysisView
                  persona={selectedPersona}
                  onReplay={handleReplay}
                  onPractice={() => setPhase('setup')}
                  onBack={() => setPhase('setup')}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
