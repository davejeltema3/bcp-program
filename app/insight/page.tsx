'use client';

import { useState } from 'react';
import WaitlistForm from '@/components/WaitlistForm';

/**
 * Boundless Insight lead magnet landing page.
 * Email capture → Kit tag "Boundless Insight" → redirect to download/install.
 */
export default function InsightPage() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
        {!logoError && (
          <div className="mb-8 flex justify-center">
            <img
              src="/images/logo.png"
              alt="Boundless Creator"
              onError={() => setLogoError(true)}
              className="max-h-[60px] object-contain"
            />
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Boundless Insight
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            A free Chrome extension that gives you AI-powered analysis of any YouTube video&apos;s packaging — thumbnails, titles, and metadata — so you can learn what works and apply it to your own channel.
          </p>
        </div>

        {/* What It Does */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">What it does</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">🎯</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Packaging Analysis</h3>
                  <p className="text-slate-400 text-sm">AI-powered breakdown of any video&apos;s thumbnail, title, and metadata.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">📊</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Learn From Any Video</h3>
                  <p className="text-slate-400 text-sm">Study what top creators do right and apply it to your own packaging.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">🔍</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Actionable Feedback</h3>
                  <p className="text-slate-400 text-sm">Not just &quot;this is good&quot; — specific notes you can act on.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-lg">⚡</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">One Click</h3>
                  <p className="text-slate-400 text-sm">Works right on any YouTube video page. No setup required.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Email Capture */}
        <section className="mb-12">
          <WaitlistForm context="insight" />
        </section>

        {/* About */}
        <section className="mb-12">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8 text-center">
            <p className="text-slate-300 leading-relaxed">
              Built by{' '}
              <a href="https://www.youtube.com/@davejeltema3" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                Dave Jeltema
              </a>{' '}
              — YouTube creator and coach helping educational creators grow their channels.
            </p>
          </div>
        </section>

        <footer className="text-center text-slate-600 text-xs pb-8">
          <p>
            <a href="https://privacy.boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">
              Privacy Policy
            </a>
            {' · '}
            <a href="mailto:hello@boundlesscreator.com" className="text-slate-500 hover:text-slate-400 underline">
              Contact
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
