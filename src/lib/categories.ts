// TrainField AI — Category definitions
// Each category represents a vertical market with its own persona set

export interface DealStage {
  id: string;       // 'initial-pitch' | 'proposal' | 'negotiation' | 'renewal'
  label: string;    // Short label shown in UI
  description: string; // One-liner shown on hover
}

export interface Category {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  sortOrder: number;
  dealStages: DealStage[];
}

const DEFAULT_DEAL_STAGES: DealStage[] = [
  { id: 'initial-pitch', label: 'Initial Pitch', description: 'Introduce yourself and establish credibility' },
  { id: 'proposal', label: 'Proposal Stage', description: 'Present pricing or a proposed solution' },
  { id: 'negotiation', label: 'Negotiation', description: 'Navigate objections and trade concessions' },
  { id: 'renewal', label: 'Renewal', description: 'Retain the relationship and close the renewal' },
];

const RETAIL_DEAL_STAGES: DealStage[] = [
  { id: 'initial-pitch', label: 'Greeting & Needs', description: 'Build rapport and understand the customer\'s needs' },
  { id: 'proposal', label: 'Product Demo', description: 'Present the right product for their situation' },
  { id: 'negotiation', label: 'Objections', description: 'Handle price, fit, and competing options' },
  { id: 'renewal', label: 'Close & Upsell', description: 'Close the sale and suggest complementary items' },
];

const HR_DEAL_STAGES: DealStage[] = [
  { id: 'initial-pitch', label: 'Opening & Context', description: 'Set the agenda and establish rapport' },
  { id: 'proposal', label: 'Feedback Delivery', description: 'Deliver the core message — review, request, or concern' },
  { id: 'negotiation', label: 'Discussion & Resolution', description: 'Work through disagreement and find a path forward' },
  { id: 'renewal', label: 'Close & Next Steps', description: 'Summarize agreements and commit to next actions' },
];

const RE_DEAL_STAGES: DealStage[] = [
  { id: 'initial-pitch', label: 'Discovery & Tour', description: 'Qualify the buyer and tour the property' },
  { id: 'proposal', label: 'Offer Strategy', description: 'Discuss pricing, terms, and competitive offers' },
  { id: 'negotiation', label: 'Negotiation', description: 'Handle counter-offers and repair terms' },
  { id: 'renewal', label: 'Closing & Handoff', description: 'Manage contingencies and get to the signing table' },
];

const INS_DEAL_STAGES: DealStage[] = [
  { id: 'initial-pitch', label: 'Needs Assessment', description: 'Understand the client\'s coverage and risk profile' },
  { id: 'proposal', label: 'Quote Review', description: 'Present plan options and coverage recommendations' },
  { id: 'negotiation', label: 'Underwriting', description: 'Address underwriting questions and coverage objections' },
  { id: 'renewal', label: 'Binding & Renew', description: 'Finalize terms and bind coverage or process renewal' },
];

export const CATEGORIES: Category[] = [
  {
    id: 'beer-distribution',
    name: 'Beer Distribution',
    description: 'Field sales reps practicing distributor conversations — grocery, convenience, on-premise accounts',
    emoji: '🍺',
    color: '#D4860A',
    sortOrder: 1,
    dealStages: DEFAULT_DEAL_STAGES,
  },
  {
    id: 'retail',
    name: 'Retail Sales',
    description: 'Field reps at major retail chains — handle customer objections, returns, and product questions',
    emoji: '🛒',
    color: '#3b82f6',
    sortOrder: 2,
    dealStages: RETAIL_DEAL_STAGES,
  },
  {
    id: 'hr-management',
    name: 'HR & Management',
    description: 'Manager conversations — annual reviews, raises, performance coaching, and team conflict',
    emoji: '📋',
    color: '#8b5cf6',
    sortOrder: 3,
    dealStages: HR_DEAL_STAGES,
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Agents working with buyers, sellers, mortgage officers, and investors through deal stages',
    emoji: '🏠',
    color: '#10b981',
    sortOrder: 4,
    dealStages: RE_DEAL_STAGES,
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Agents and adjusters handling claims, renewals, and policyholder conversations',
    emoji: '🛡️',
    color: '#f59e0b',
    sortOrder: 5,
    dealStages: INS_DEAL_STAGES,
  },
];

export const DEFAULT_CATEGORY = 'beer-distribution';

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}