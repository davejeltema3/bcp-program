import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Boundless Creator Program — Founders Edition',
  description:
    'Join the Boundless Creator Program. Personal channel reviews, weekly live sessions, and direct access to Dave Jeltema. $999 for 3 months.',
  openGraph: {
    title: 'Boundless Creator Program — Founders Edition',
    description:
      'Personal channel reviews, weekly live sessions, and direct access to Dave Jeltema. Founders rate: $999 for 3 months.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boundless Creator Program — Founders Edition',
    description:
      'Personal channel reviews, weekly live sessions, and direct access to Dave Jeltema. Founders rate: $999 for 3 months.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
