import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Free demo with no account. Solo, Small Team and Team plans for saved, scored sales practice.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
