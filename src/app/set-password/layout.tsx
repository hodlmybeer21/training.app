import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set your password',
  description: 'Finish setting up your TrainField AI account.',
  robots: { index: false, follow: false },
};

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
