import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './tokens.css';
import './globals.css';

// The design system's two families: Outfit for headings and every numeral,
// Plus Jakarta Sans for body, labels and captions.
const display = Outfit({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700', '800'] });
const text = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-text', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: { default: 'Altruist Partner Portal', template: '%s · Altruist Partner Portal' },
  description: 'Review prescriptions and fulfil orders for Altruist patients.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
