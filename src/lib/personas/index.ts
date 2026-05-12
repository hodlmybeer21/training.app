// Persona exports and category mapping
// Use getPersonasForCategory(categoryId) to get personas for a specific vertical

import { PERSONAS } from '@/lib/personas';
import { NH_PERSONAS } from '@/lib/personas-nh';
import { RETAIL_PERSONAS } from './retail';
import { HR_PERSONAS } from './hr-management';
import { RE_PERSONAS } from './real-estate';
import { INS_PERSONAS } from './insurance';

export { PERSONAS, NH_PERSONAS };
export { RETAIL_PERSONAS, HR_PERSONAS, RE_PERSONAS, INS_PERSONAS };

// Category → Persona array mapping
// Note: beer-distribution uses NH_PERSONAS
// Note: hr-management combines generic personas (annual-review, exit-interview) with new HR_PERSONAS
export const PERSONA_BY_CATEGORY: Record<string, any[]> = {
  'beer-distribution': NH_PERSONAS,
  'retail': RETAIL_PERSONAS,
  'hr-management': [
    ...PERSONAS.filter(p => ['annual-review', 'exit-interview'].includes(p.id)),
    ...HR_PERSONAS,
  ],
  'real-estate': RE_PERSONAS,
  'insurance': INS_PERSONAS,
};

// Get all persona IDs for a category
export function getPersonaIdsForCategory(categoryId: string): string[] {
  const personas = PERSONA_BY_CATEGORY[categoryId] || PERSONA_BY_CATEGORY['beer-distribution'];
  return personas.map(p => p.id);
}

// Get personas for a category, with fallback to beer-distribution
export function getPersonasForCategory(categoryId: string): any[] {
  return PERSONA_BY_CATEGORY[categoryId] || PERSONA_BY_CATEGORY['beer-distribution'];
}

// Get count of personas per category
export function getPersonaCountForCategory(categoryId: string): number {
  return (PERSONA_BY_CATEGORY[categoryId] || []).length;
}