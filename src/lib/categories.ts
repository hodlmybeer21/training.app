// TrainField AI — Category definitions
// Each category represents a vertical market with its own persona set

export interface Category {
  id: string;          // 'beer-distribution', 'retail', 'hr-management', 'real-estate', 'insurance'
  name: string;        // Display name for UI
  description: string; // One-liner for category picker
  emoji: string;       // Emoji icon for cards
  color: string;       // Brand color for this category
  sortOrder: number;    // Display order
}

export const CATEGORIES: Category[] = [
  {
    id: 'beer-distribution',
    name: 'Beer Distribution',
    description: 'Field sales reps practicing distributor conversations — grocery, convenience, on-premise accounts',
    emoji: '🍺',
    color: '#D4860A',
    sortOrder: 1,
  },
  {
    id: 'retail',
    name: 'Retail Sales',
    description: 'Field reps at major retail chains — handle customer objections, returns, and product questions',
    emoji: '🛒',
    color: '#3b82f6',
    sortOrder: 2,
  },
  {
    id: 'hr-management',
    name: 'HR & Management',
    description: 'Manager conversations — annual reviews, raises, performance coaching, and team conflict',
    emoji: '📋',
    color: '#8b5cf6',
    sortOrder: 3,
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Agents working with buyers, sellers, mortgage officers, and investors through deal stages',
    emoji: '🏠',
    color: '#10b981',
    sortOrder: 4,
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Agents and adjusters handling claims, renewals, and policyholder conversations',
    emoji: '🛡️',
    color: '#f59e0b',
    sortOrder: 5,
  },
];

export const DEFAULT_CATEGORY = 'beer-distribution';

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}