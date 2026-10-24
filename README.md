# TrainField AI

Voice roleplay practice for beer distribution sales reps. Pick a fictional buyer, talk through the pitch (voice or typed), and get a scored debrief.

Live: https://training.goodbotai.tech

## Stack
- Next.js (app router), React, Tailwind
- Supabase (auth, profiles, sessions, teams)
- Groq (`llama-3.1-8b-instant`) for buyer replies and scoring
- Browser Web Speech API for speech-to-text and text-to-speech
- Stripe Checkout + webhook for plans, AgentMail for welcome emails

## Environment variables
Set these in Vercel (never commit `.env*` files):

| Name | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access |
| `GROQ_API_KEY` | AI replies and scoring |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout and webhook |
| `AGENTMAIL_API_KEY` | Welcome emails |
| `ADMIN_EMAILS` | Comma-separated emails that get the admin console (in addition to `role = admin`) |

## Development
```bash
npm ci
npm run dev
```

The public demo (`/#demo`) is rate limited per IP and only accepts built-in personas. Signed-in routes use the Supabase cookie session.
