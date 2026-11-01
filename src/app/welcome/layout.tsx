import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanks for subscribing',
  description: 'Your TrainField AI plan is being set up.',
  robots: { index: false, follow: false },
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
