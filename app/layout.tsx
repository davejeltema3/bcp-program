import type { Metadata } from 'next';
import { Inter, Urbanist } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-urbanist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Boundless Creator Program — Founders Edition',
  description:
    'Join the Boundless Creator Program. Personal channel reviews, weekly live sessions, and direct access to Dave Jeltema. $999 for 3 months.',
  icons: {
    // Light theme: light blue background with dark BC letters (Dave's default).
    // Dark theme: dark blue background with white BC letters.
    icon: [
      { url: '/icon-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon-light.png' }, // fallback for browsers that ignore the media query
    ],
    apple: '/icon-light.png',
  },
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
      <body className={`${inter.className} ${urbanist.variable}`}>
        {/* Kit (ConvertKit) visit tracking. Sets the _ck cookie so form
            submissions get attributed back to the visitor for accurate
            conversion rate in the Kit dashboard. Async, non-blocking. */}
        <Script src="https://f.convertkit.com/ckjs/ck.5.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
