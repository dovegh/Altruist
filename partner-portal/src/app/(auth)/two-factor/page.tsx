import type { Metadata } from 'next';
import { TwoFactor } from './TwoFactor';

export const metadata: Metadata = { title: 'Two-factor' };

export default function TwoFactorPage() {
  return <TwoFactor />;
}
