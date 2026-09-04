import type { Metadata } from 'next';
import './globals.css';
import './etalim-shell.css';
import './tinglovchilar.css';
import './tingmanba.css';
import './access-management.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mtv.etalimai.uz'),
  title: 'MTV E-TA’LIM AI — Тингловчилар ва манбалар',
  description:
    'Тингловчиларни рўйхатдан ўтказиш, ўқув манбалари ва иштирокчилар роллари учун ягона таълим муҳити.',
  openGraph: {
    title: 'MTV E-TA’LIM AI',
    description: 'Билимни бирга ривожлантирамиз.',
    type: 'website',
    url: 'https://mtv.etalimai.uz',
    siteName: 'MTV E-TA’LIM AI',
    locale: 'uz_UZ',
    images: [
      { url: '/og.png', width: 1200, height: 630, alt: 'MTV E-TA’LIM AI' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MTV E-TA’LIM AI',
    description: 'Билимни бирга ривожлантирамиз.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz-Latn">
      <body>{children}</body>
    </html>
  );
}
