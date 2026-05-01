/**
 * Structured guide for granting YouTube analytics access.
 * Used in the questionnaire when the analytics_access question appears.
 */
export default function AnalyticsAccessGuide() {
  return (
    <div className="space-y-4 mb-6">
      <p className="text-slate-300 text-sm leading-relaxed">
        Without your analytics, I&apos;m working with one hand tied behind my back.
        Public data shows what&apos;s happening on the surface. Your private analytics show me <em className="text-white">why</em>.
      </p>

      <p className="text-slate-400 text-sm leading-relaxed">
        The difference between &quot;your packaging needs work&quot; and &quot;your hook is fine but you
        lose 40% of viewers at 2:40&quot; is huge. One is a guess. The other is something you can act on.
      </p>

      {/* Steps */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
        <h4 className="text-white font-medium text-sm mb-3">How to grant access (2 minutes)</h4>
        <ol className="space-y-2">
          {[
            'Open YouTube Studio',
            'Click Settings (bottom left)',
            'Go to the Permissions tab',
            <>Click <span className="text-white font-medium">Invite</span> (top right)</>,
            <>Enter: <span className="text-blue-400 font-mono text-xs">hello@boundlesscreator.com</span></>,
            <>Select <span className="text-white font-medium">&quot;Viewer&quot;</span></>,
            'Click Done',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">
                {i + 1}
              </span>
              <span className="text-slate-300 text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Privacy note */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="text-slate-400 text-xs space-y-1">
            <p>Viewer-only access. I can&apos;t edit, post, or change anything.</p>
            <p>You can revoke anytime in YouTube Studio. Two clicks.</p>
            <p>I&apos;ll remove myself after completing your review.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
