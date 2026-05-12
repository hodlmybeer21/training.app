'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { Persona } from '@/lib/personas';
import { CATEGORIES } from '@/lib/categories';
import { getPersonasForCategory, getAllPersonaIds, PERSONA_BY_CATEGORY } from '@/lib/personas/index';
import { getCategoryById } from '@/lib/categories';

// Build ALL_PERSONAS from every category so the selector always has a complete list
function buildAllPersonas() {
  const seen = new Set<string>();
  const result: Persona[] = [];
  for (const personas of Object.values(PERSONA_BY_CATEGORY)) {
    for (const p of personas) {
      if (!seen.has(p.id)) { seen.add(p.id); result.push(p); }
    }
  }
  return result;
}
const ALL_PERSONAS: Persona[] = buildAllPersonas();

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

  // ─── RETAIL PERSONAS ───────────────────────────────────────────────
  'retail-hesitant-customer': {
    prospectName: 'Linda P.',
    prospectTitle: 'The Hesitant Shopper',
    dealObjective: 'Build trust and rapport with a cautious buyer — they need to feel understood before committing. Ask good questions, listen actively, and address their specific concerns.',
    objections: [
      '"I\'ve bought things like this before and regretted it"',
      'Not ready to commit — needs more reassurance',
      'Asks about durability and whether it\'s worth the price',
    ],
    winConditions: [
      'Build genuine rapport before pushing the sale',
      'Address their specific fear with facts',
      'Secure a clear next step — buy today or return later',
    ],
  },
  'retail-returns-dispute': {
    prospectName: 'Don M.',
    prospectTitle: 'The Returns Battle',
    dealObjective: 'Handle a returns dispute professionally — policy is clear but the customer is emotional. De-escalate, show empathy, find a resolution that protects the store without creating a scene.',
    objections: [
      '"I spent $300 here — I know I did"',
      'Threatens to escalate to manager',
      'Uses emotional leverage: "I\'m a loyal customer"',
    ],
    winConditions: [
      'De-escalate without making promises you can\'t keep',
      'Offer a clear resolution path (store credit, manager approval)',
      'Preserve the customer relationship even if denying the return',
    ],
  },
  'retail-product-question': {
    prospectName: 'Tom R.',
    prospectTitle: 'The Technical Question',
    dealObjective: 'Answer detailed technical questions accurately — they\'ve done their research and will challenge vague answers. Demonstrate real product knowledge and help them make an informed decision.',
    objections: [
      'Asks about electrical circuit compatibility',
      'Questions the return policy on opened appliances',
      'Challenges answers that sound rehearsed',
    ],
    winConditions: [
      'Answer technical questions accurately — don\'t guess',
      'Help them understand what they actually need',
      'Get agreement on the right product for their situation',
    ],
  },
  'retail-competitor-price-match': {
    prospectName: 'Sandra L.',
    prospectTitle: 'The Price Match Hunter',
    dealObjective: 'Honor a competitor price match professionally — they have the ad and are ready to buy. Match the price, close the sale, and try to build additional value beyond just price.',
    objections: [
      'Has competitor ad pulled up — expects immediate match',
      'Won\'t pay full price, will leave if not matched',
      'Only interested in the price, not additional value',
    ],
    winConditions: [
      'Match the price quickly — don\'t拖延',
      'Close on the spot with the matched price',
      'Try to add value: warranty, accessories, delivery',
    ],
  },
  'retail-browsing-no-buy': {
    prospectName: 'Karen W.',
    prospectTitle: 'The High-Value Browser',
    dealObjective: 'Build relationship with a high-value browser — they can spend $500-$2000 but won\'t buy today. Be consultative, ask about their needs, and make them want to come back.',
    objections: [
      '"I\'m looking — I\'m not ready today"',
      'Avoids pushy salespeople',
      'Will comparison shop before committing',
    ],
    winConditions: [
      'Build genuine rapport without pressure',
      'Understand their specific situation and needs',
      'Get them to commit to coming back',
    ],
  },
  'retail-employee-conflict': {
    prospectName: 'Manager Rachel',
    prospectTitle: 'Employee Conflict Mediation',
    dealObjective: 'Mediate between two employees with different work styles whose conflict is affecting customers. Stay calm, don\'t assign blame, and find a working arrangement both can commit to.',
    objections: [
      'Two different stories about what happened',
      'Conflict has started affecting customer interactions',
      'Rest of the team is picking up on the tension',
    ],
    winConditions: [
      'Get both perspectives without interrupting',
      'Find specific behavioral changes both can commit to',
      'Establish a path forward that doesn\'t require choosing sides',
    ],
  },

  // ─── HR PERSONAS ──────────────────────────────────────────────────
  'hr-raise-conversation': {
    prospectName: 'Marcus T.',
    prospectTitle: 'The Raise Ask',
    dealObjective: 'Navigate a direct, prepared raise conversation — they have market data and a specific target. Don\'t deflect, don\'t over-promise, and give them a clear path forward or a honest dead-end.',
    objections: [
      '"I\'m 18% below market — I have the data"',
      'Won\'t accept deflection or vague promises',
      'Prepared to have a tough conversation',
    ],
    winConditions: [
      'Acknowledge the data without getting defensive',
      'Give a clear, specific path or an honest dead-end',
      'Preserve the relationship regardless of outcome',
    ],
  },
  'hr-performance-coaching': {
    prospectName: 'Director Diane',
    prospectTitle: 'Performance Improvement Plan',
    dealObjective: 'Deliver a formal PIP with empathy and clarity — the data is clear but the employee is a human being. Be direct, specific about what needs to change, and genuinely try to help them succeed.',
    objections: [
      'Employee may be defensive or deny the issues',
      'Long tenure makes the conversation harder',
      'Consequences must be stated clearly',
    ],
    winConditions: [
      'Be direct and factual — don\'t apologize for the conversation',
      'State specific, measurable improvement targets',
      'Show genuine care while being clear about consequences',
    ],
  },
  'hr-team-conflict': {
    prospectName: 'Manager Pat',
    prospectTitle: 'Team Conflict Mediation',
    dealObjective: 'Mediate between two employees with clashing work styles — one fast-paced and overstepping, one methodical and feeling disrespected. Focus on future behavior, not past blame.',
    objections: [
      'Both have different stories about incidents',
      'Conflict is affecting team morale and customers',
      'Neither wants to change their fundamental style',
    ],
    winConditions: [
      'Focus on working arrangements, not who was right',
      'Get each person to commit to one specific behavioral change',
      'Establish check-in cadence to track progress',
    ],
  },
  'hr-wrongful-termination': {
    prospectName: 'Attorney Roberts',
    prospectTitle: 'Wrongful Termination Claim',
    dealObjective: 'Respond to a wrongful termination claim with legal caution — you know the termination was justified but must not say anything that could be used against the company. Be warm, factual, and refer to counsel.',
    objections: [
      'Former employee has a lawyer\'s letter',
      'Legal sensitivity — can\'t admit fault',
      'Must redirect without being cold',
    ],
    winConditions: [
      'Respond professionally without admitting liability',
      'Redirect to legal counsel appropriately',
      'Document the conversation thoroughly',
    ],
  },
  'hr-hostile-workplace': {
    prospectName: 'HR Director Maria',
    prospectTitle: 'Hostile Work Environment Report',
    dealObjective: 'Receive a workplace harassment complaint with empathy and proper process — the employee is scared and has been documenting for months. Take it seriously, explain the process, and protect from retaliation.',
    objections: [
      'Employee is emotional and scared of retaliation',
      'Supervisor knew and didn\'t act',
      'Documentation may be incomplete',
    ],
    winConditions: [
      'Make the employee feel heard and protected',
      'Explain the process clearly without over-promising',
      'Document the complaint and next steps immediately',
    ],
  },

  // ─── REAL ESTATE PERSONAS ─────────────────────────────────────────
  're-buyer-first-home': {
    prospectName: 'Amy & Chris K.',
    prospectTitle: 'Nervous First-Time Buyer',
    dealObjective: 'Guide a first-time buyer through a complex, emotional process — they feel lost and anxious. Be their calm, confident expert. Answer questions, set expectations, and protect them from surprises.',
    objections: [
      '"Why does this take so long?" — confusion about process',
      'Inspection findings create uncertainty',
      'Appraisal concerns and whether they can back out',
    ],
    winConditions: [
      'Explain the process in plain English',
      'Set clear expectations at every step',
      'Make them feel informed and confident, not overwhelmed',
    ],
  },
  're-seller-price-expectation': {
    prospectName: 'Gary M.',
    prospectTitle: 'The Unrealistic Seller',
    dealObjective: 'Bring a delusional seller back to market reality with empathy — they\'ve watched HGTV and think their kitchen remodel is worth 30% more. Use data, not dismissiveness, to recalibrate their expectations.',
    objections: [
      'Cites their own improvements as justification for higher price',
      'Compares their home favorably to every comparable',
      'Won\'t accept that the market has softened',
    ],
    winConditions: [
      'Present comps with empathy, not condescension',
      'Connect specific improvements to actual market response',
      'Get them to agree on a price that will actually attract offers',
    ],
  },
  're-investor-deal': {
    prospectName: 'Jennifer V.',
    prospectTitle: 'The Real Estate Investor',
    dealObjective: 'Work with a transactional investor who knows the numbers cold — they\'ve done 40+ deals and won\'t pay retail. Be direct, know your numbers, and don\'t waste their time with fluff.',
    objections: [
      'Asks for seller motivation and financial details',
      'Wants maximum concessions on a fast close',
      'Will walk away if the deal doesn\'t pencil',
    ],
    winConditions: [
      'Know the numbers — don\'t guess or estimate',
      'Structure deals that work for both sides',
      'Build a relationship that leads to more deals',
    ],
  },
  're-mortgage-preapproval': {
    prospectName: 'Loan Officer Brian',
    prospectTitle: 'Confused Buyer in Pre-Approval',
    dealObjective: 'Explain the mortgage pre-approval process clearly to a confused buyer — they think pre-approved means approved. Set expectations, explain rate timing, and help them understand what they actually qualify for.',
    objections: [
      '"My agent said I was approved — what\'s the difference?"',
      'Rate quoted in February isn\'t available in April',
      'Confused about documentation requirements',
    ],
    winConditions: [
      'Explain pre-qual vs pre-approval vs full approval clearly',
      'Set realistic expectations about rate locks',
      'Help them understand what they need to provide and when',
    ],
  },
  're-home-inspection': {
    prospectName: 'Buyer Agent Lisa',
    prospectTitle: 'Home Inspection Conflict',
    dealObjective: 'Negotiate inspection findings professionally — some are legitimate leverage, others are normal wear and tear on a 25-year-old house. Help the buyer separate real issues from noise and present a fair request.',
    objections: [
      'Buyer wants $8K in credits for a 25-year-old house',
      'Seller may push back on "normal" findings',
      'Buyer is anxious about hidden problems',
    ],
    winConditions: [
      'Separate legitimate leverage from normal wear-and-tear',
      'Present a fair, data-driven negotiation position',
      'Keep the deal together while addressing real issues',
    ],
  },
  're-closing-delay': {
    prospectName: 'Agent Tom',
    prospectTitle: 'Closing Day Disaster',
    dealObjective: 'Manage a closing delay crisis with a buyer who has no flexibility — their lease ends Friday, movers are booked, employer expects them to start in two weeks. Fight for them while setting realistic expectations.',
    objections: [
      '"How does this happen? Who\'s responsible?"',
      'Logistics are now cascading — rental, movers, new job',
      'Stress level is high, patience is low',
    ],
    winConditions: [
      'Take ownership and fight for the buyer internally',
      'Give honest timeline assessment — no false promises',
      'Problem-solve the logistics: lease extension, mover reschedule',
    ],
  },

  // ─── INSURANCE PERSONAS ────────────────────────────────────────────
  'ins-auto-claim': {
    prospectName: 'Policyholder Julie',
    prospectTitle: 'First-Time Auto Claim',
    dealObjective: 'Guide a confused, anxious policyholder through their first claim — they don\'t know the process, worry about their premium, and don\'t know how to talk to the other driver\'s insurance. Calm, clear, and helpful.',
    objections: [
      '"Do I talk to their insurance or mine?"',
      'Worried premium will go up after 6 years of clean record',
      'Confused about what documentation is needed',
    ],
    winConditions: [
      'Explain the process in plain language',
      'Address the premium concern honestly',
      'Make them feel supported, not like a claim number',
    ],
  },
  'ins-policy-renewal': {
    prospectName: 'Account Manager Carol',
    prospectTitle: 'Renewal Rate Shock',
    dealObjective: 'Retain a client who just saw their renewal go up 40% and has two competitor quotes in hand — they want to stay but not at any price. Know your product, know the market, and make a compelling case.',
    objections: [
      '"I\'ve been with you 8 years — loyalty means nothing?"',
      'Already has two competing quotes',
      'Won\'t accept "market conditions" without pushback',
    ],
    winConditions: [
      'Acknowledge the increase is significant',
      'Present a clear value case for staying',
      'Make a meaningful offer if possible — or an honest dead-end',
    ],
  },
  'ins-liability-claim': {
    prospectName: 'Small Business Owner Marcus',
    prospectTitle: 'Business Liability Dispute',
    dealObjective: 'Work with a policyholder disputing a denied liability claim — they have photos they think prove their case. Navigate the appeals process, set expectations, and advocate for them within the system.',
    objections: [
      '"I have photos showing the damage happened during our work"',
      'Frustrated after 5 years of premium payments',
      'Wants to understand the formal appeals process',
    ],
    winConditions: [
      'Acknowledge their frustration and their evidence',
      'Explain the appeals process clearly',
      'Advocate for them while managing expectations',
    ],
  },
  'ins-health-benefits': {
    prospectName: 'HR Director Sandra',
    prospectTitle: 'Health Benefits Review',
    dealObjective: 'Help an HR director at a 75-person company understand plan options — PPO vs HDHP with HSA, costs vs coverage, impact on different employee demographics. Be consultative, not transactional.',
    objections: [
      'Confused about PPO vs HDHP with HSA',
      'Younger employees vs. older employees with families have different needs',
      'Worried about making a decision that harms employees',
    ],
    winConditions: [
      'Explain options in plain language with real examples',
      'Help them understand the employee impact by demographic',
      'Position yourself as a consultant, not just a salesperson',
    ],
  },
  'ins-disability-claim': {
    prospectName: 'Store Manager David',
    prospectTitle: 'Short-Term Disability Fight',
    dealObjective: 'Help an employee whose STD claim is stalled while managing the store and the HR process simultaneously — the employee has kids and no income. Push internally while giving the manager something useful to tell them.',
    objections: [
      'Employee\'s income has stopped after 2 weeks out',
      'Insurance company keeps requesting information already submitted',
      'Store manager is caught between employee and insurer',
    ],
    winConditions: [
      'Give the manager concrete actions to take',
      'Push HR/benefits internally on the employee\'s behalf',
      'Keep the employee informed and prevent escalation',
    ],
  },

  // Generic sales personas (difficult-customer, new-account-pitch, hostile-prospect)
  // are already defined at the top of this object — no duplicates needed.
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
  const [selectedCategory, setSelectedCategory] = useState<string>('beer-distribution');
  const [selectedPersona, setSelectedPersona] = useState<Persona>(() => {
    // Default to first beer-distribution persona on load
    const cats = getPersonasForCategory('beer-distribution');
    return cats[0] || ALL_PERSONAS[0];
  });
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
              {/* Category selector */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Category</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        const personas = getPersonasForCategory(cat.id);
                        if (personas.length > 0) setSelectedPersona(personas[0]);
                      }}
                      style={{
                        padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: selectedCategory === cat.id ? cat.color + '20' : '#f3f4f6',
                        color: selectedCategory === cat.id ? cat.color : '#6b7280',
                        borderLeft: selectedCategory === cat.id ? `3px solid ${cat.color}` : '3px solid transparent',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <span>{cat.emoji}</span> {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <Select
                label="Persona"
                value={selectedPersona.id}
                onChange={v => {
                  const personas = getPersonasForCategory(selectedCategory);
                  setSelectedPersona(personas.find(p => p.id === v) || personas[0] || ALL_PERSONAS[0]);
                }}
                options={getPersonasForCategory(selectedCategory).map(p => ({ value: p.id, label: `${p.emoji} ${p.name}` }))}
              />
              <Select label="Deal Stage" value={dealStage} onChange={v => setDealStage(v as any)} options={(getCategoryById(selectedCategory)?.dealStages || CATEGORIES[0].dealStages).map(s => ({ value: s.id, label: s.label }))} />
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
