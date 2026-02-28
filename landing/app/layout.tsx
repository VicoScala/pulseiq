import type { Metadata } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Whoop Mate — Social Feed for Whoop Members',
  description:
    "Finally see your friends' Strain, Recovery & Sleep scores in one feed. Built by Whoop members, for Whoop members.",
  keywords: ['Whoop', 'fitness', 'social', 'recovery', 'strain', 'sleep', 'HRV'],
  openGraph: {
    title: 'Whoop Mate — Social Feed for Whoop Members',
    description: "See your friends' Whoop scores in one feed.",
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${outfit.variable} ${dmSans.variable} font-body bg-bg text-text antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
