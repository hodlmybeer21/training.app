# TrainField AI — Multi-Category Persona System

## Goal
Extend TrainField AI from a single-beer-distribution vertical to a multi-category platform where managers in different industries each see only the personas relevant to their teams.

## Architecture

**Categories are defined in code** (not DB for now — simpler, faster to iterate):
- `src/lib/categories.ts` — category list with metadata
- `src/lib/personas/*.ts` — one file per category

**Category filtering happens at runtime:**
- User's `profile.team_id` → `team.category_id` → load only personas for that category
- Categories not yet assigned = show category picker on first login

## Files to Create

### 1. `src/lib/categories.ts`
```typescript
export interface Category {
  id: string;          // 'beer-distribution', 'retail', 'hr-management', 'real-estate', 'insurance'
  name: string;        // 'Beer Distribution', 'Retail Sales', etc.
  description: string; // one-liner for the UI
  emoji: string;       // '🍺', '🛒', '📋', '🏠', '🛡️'
  color: string;       // brand color for this category
  sortOrder: number;
}

export const CATEGORIES: Category[] = [
  {
    id: 'beer-distribution',
    name: 'Beer Distribution',
    description: 'Sales rep practice for beer & beverage distribution teams',
    emoji: '🍺',
    color: '#D4860A',
    sortOrder: 1,
  },
  {
    id: 'retail',
    name: 'Retail Sales',
    description: 'Field sales reps at retail chains — Best Buy, Home Depot, etc.',
    emoji: '🛒',
    color: '#3b82f6',
    sortOrder: 2,
  },
  {
    id: 'hr-management',
    name: 'HR & Management',
    description: 'Manager conversations — raises, reviews, coaching, exit interviews',
    emoji: '📋',
    color: '#8b5cf6',
    sortOrder: 3,
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Agents, buyers, sellers, mortgage officers, and closing scenarios',
    emoji: '🏠',
    color: '#10b981',
    sortOrder: 4,
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Agents, policyholders, claims adjusters, and renewals',
    emoji: '🛡️',
    color: '#f59e0b',
    sortOrder: 5,
  },
];

export const DEFAULT_CATEGORY = 'beer-distribution';
export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}
```

### 2. `src/lib/personas/retail.ts`
Create 6 retail sales personas for a big-box or specialty retail environment:
- `retail-customer-hesitant` — customer unsure about purchase, needs reassurance
- `retail-returns-dispute` — customer wanting to return without receipt, manager gets involved
- `retail-product-question` — technical question about a product (appliances/electronics)
- `retail-competitor-price-match` — customer has competitor ad, wants price match
- `retail-browsing-no-buy` — high-value browser, needs consultative approach
- `retail-employee-conflict` — two employees disagree about a customer situation

Each persona: follow the exact same Persona interface as existing personas.ts.

### 3. `src/lib/personas/hr-management.ts`
Create 4 HR/management personas (some can be adapted from existing generic ones):
- `hr-annual-review` — adapted from existing annual-review persona (keep but tag as hr-management)
- `hr-exit-interview` — adapted from existing exit-interview (keep but tag)
- `hr-raise-conversation` — employee asks manager about a raise, manager deflects
- `hr-performance-coaching` — manager addresses a performance issue with a rep
- `hr-team-conflict` — two team members have a conflict, manager mediates

### 4. `src/lib/personas/real-estate.ts`
Create 6 real estate personas:
- `re-buyer-first-home` — nervous first-time homebuyer, emotional, needs reassurance
- `re-seller-price-expectation` — seller who thinks their house is worth 30% more than market
- `re-investor-deal` — real estate investor shopping for distressed properties, transactional
- `re-mortgage-pre-approval` — buyer confused about pre-approval process, lender explains
- `re-home-inspection` — inspection finds issues, buyer wants price reduction, seller pushes back
- `re-closing-delay` — closing pushed, buyer frustrated, agent manages expectations

### 5. `src/lib/personas/insurance.ts`
Create 5 insurance personas:
- `ins-auto-claim` — policyholder filing first claim, frustrated about process
- `ins-policy-renewal` — agent discusses renewal, premium went up, customer threatens to leave
- `ins-liability-claim` — business owner disputing a liability claim decision
- `ins-health-benefits-review` — HR manager reviewing health benefits options with broker
- `ins-disability-claim` — employee filing short-term disability, employer and insurer coordination

### 6. `src/lib/personas/index.ts`
```typescript
import { PERSONAS } from './personas';          // existing general personas
import { NH_PERSONAS } from './personas-nh';      // existing beer personas
import { RETAIL_PERSONAS } from './retail';
import { HR_PERSONAS } from './hr-management';
import { RE_PERSONAS } from './real-estate';
import { INS_PERSONAS } from './insurance';
import { Category } from './categories';

export { PERSONAS, NH_PERSONAS };

export const PERSONA_BY_CATEGORY: Record<string, any[]> = {
  'beer-distribution': NH_PERSONAS,
  'retail': RETAIL_PERSONAS,
  'hr-management': [...PERSONAS.filter(p => ['annual-review', 'exit-interview'].includes(p.id)), ...HR_PERSONAS],
  'real-estate': RE_PERSONAS,
  'insurance': INS_PERSONAS,
};

export function getPersonasForCategory(categoryId: string): any[] {
  return PERSONA_BY_CATEGORY[categoryId] || PERSONA_BY_CATEGORY['beer-distribution'];
}
```

## Pages to Update

### 7. `src/app/dashboard/practice/page.tsx`
- Add category selector at top (grid of category cards with emoji + name)
- If user has `profile.category_id` set → skip picker, load directly
- If no category → show picker, then remember choice in profile
- Filter persona grid by selected category
- Keep existing voice/practice flow fully intact

### 8. `src/app/page.tsx` (marketing page)
- Add a "Categories" section to the marketing page showing all 5 categories
- Each category card: emoji, name, description, persona count
- Links to `/dashboard` (login/signup)

## Principles
- Keep existing personas and flow completely intact — don't break beer distribution
- All new personas follow the same interface as existing ones
- Voice pitch/rate should be appropriate for each persona type (retail = faster, HR = measured, real estate = warm)
- Opening lines should be 2-3 sentences, realistic dialogue
- System prompts should be vivid enough that the AI stays in character without being theatrical
- Do NOT change the Supabase schema yet — category lives in profile.category_id field which already exists
- Do NOT wire up Stripe — that comes after Tyler has paying customers
