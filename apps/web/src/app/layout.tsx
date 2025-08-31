import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { clsx } from 'clsx';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HealthCoachAI - AI-Powered Health & Wellness',
  description: 'Your personal AI health coach for nutrition, fitness, and wellness.',
  manifest: '/manifest.json',
  themeColor: '#14b8a6',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  openGraph: {
    title: 'HealthCoachAI',
    description: 'Your personal AI health coach for nutrition, fitness, and wellness.',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HealthCoachAI',
    description: 'Your personal AI health coach for nutrition, fitness, and wellness.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={clsx(inter.className, 'antialiased')}>
        <div id="root" className="min-h-screen bg-background-primary">
          {children}
        </div>
      </body>
    </html>
  );
}