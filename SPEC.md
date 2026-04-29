# TrainField AI — Voice Practice Platform for Beer Distribution Teams

## What It Is
**TrainField AI** is a voice-powered AI roleplay platform built specifically for beer distribution sales teams. It lets field reps, managers, and front-line employees practice difficult conversations — with customers, managers, and accounts — before they happen for real.

**Positioning:** "The AI flight simulator for your sales team."
**Wedge:** Beer distribution first, then retail/customer-facing roles in other markets.

## Key Changes from RolePlay AI
- **Name:** TrainField AI (was "RolePlay AI") — signals field/sales training, not generic roleplay
- **Positioning:** Beer distribution focused with clear vertical wedge
- **Hero copy:** "AI flight simulator for your sales team" — sticky metaphor that conveys safety + realism
- **Homepage sections:** Hero → Proof strip → How it works (3 steps) → Scenarios → Why voice first → Live app
- **No breaking changes:** All existing personas, Groq API, speech recognition, TTS, and conversation flow preserved exactly

## Architecture (unchanged)
- **Frontend:** Next.js 14, TypeScript, Tailwind v4
- **LLM:** Groq REST API (llama-4-maverick, 128K context) — free, ~200ms first token
- **Voice Input:** Browser `SpeechRecognition` API — free, no key
- **Voice Output:** Web Speech API `speechSynthesis` — free, no key
- **State:** React useState + useRef (no DB for MVP)

## Personas
Two categories:
1. **General personas** (5): The Difficult Customer, Annual Review Manager, New Account Pitch, Hostile Prospect, Exit Interview
2. **NH Beer Distribution personas** (8): Grocery Buyer, Convenience Buyer, Liquor Store Owner, Bar Owner, Restaurant Buyer, District Manager, Route Rep, Craft Enthusiast Owner, Lost Account Recovery

## Design
- **Dark theme:** `#0d1117` background, `#161b22` cards, `#4ade80` accent (green — beer field color)
- **Font:** `DM Sans` — friendly, professional
- **Brand color:** Green (`#4ade80`) signals growth, field, trust
- **Sections added:** Hero, proof strip, how-it-works (3-step), scenarios grid, why-voice-first features

## Conversion Flow
1. Hero CTA → jumps to `#start` (persona selector)
2. Category filter → filter personas by channel
3. Persona card → select → "Start Roleplay" button → conversation view
4. Conversation view: chat thread + mic button + live status
5. Reset → back to persona selector

## Sections
| Section | Purpose |
|---------|---------|
| Hero | Outcome-focused copy, two CTAs |
| Proof strip | Stats (13+ scenarios, 100% voice, free, local) |
| How it works | 3-step visual — Pick / Talk / Get better |
| Scenarios | 6 use case cards — real distributor conversations |
| Why voice first | 6 feature blocks — why talking > typing |
| App | Full persona selector + live conversation UI |

## Tech Stack
- Next.js 14 App Router
- TypeScript
- Tailwind v4 (CSS variables)
- Groq REST API (no SDK)
- Browser Speech APIs only

## Pages
- `/` — Single page: marketing sections + embedded app (no routing needed for MVP)

## Future (v2)
- Named sessions with history
- Evaluation/scoring engine (the moat per external feedback)
- LMS/SCORM integration
- Multi-user team management
- Performance benchmarks and reporting