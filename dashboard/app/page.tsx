import Link from 'next/link';

const STATS = [
  { label: 'Indexed Transactions', value: '12.4B+' },
  { label: 'API Requests / Day', value: '850M+' },
  { label: 'Active Developers', value: '4,200+' },
  { label: 'Uptime', value: '99.98%' },
];

const FEATURES = [
  { icon: '⚡', title: 'Sub-Second Latency', desc: 'Geyser gRPC integration streams data directly from validators. No polling, no delays.' },
  { icon: '🔗', title: 'GraphQL API', desc: 'Flexible queries with Relay-style pagination, subscriptions, and a built-in schema explorer.' },
  { icon: '🧩', title: 'Custom Parsers', desc: 'Plug in your own WASM parsers for any program. SPL, NFTs, Jupiter, Raydium out of the box.' },
  { icon: '🔔', title: 'Webhooks', desc: 'Push real-time events to your backend the moment they land on-chain. HMAC-signed payloads.' },
  { icon: '📜', title: 'Historical Data', desc: 'Full backfill from genesis. Query any slot range with millisecond-precision timestamps.' },
  { icon: '🌐', title: 'Multi-Protocol', desc: 'SPL tokens, NFTs, DeFi protocols (Jupiter, Raydium), and raw instructions all indexed.' },
];

const PRICING = [
  { tier: 'Free', price: '$0', period: '/mo', requests: '1M req/mo', features: ['1 API key', '7-day retention', 'GraphQL + REST', 'Community support'], cta: 'Get Started', highlight: false },
  { tier: 'Pro', price: '$49', period: '/mo', requests: '50M req/mo', features: ['5 API keys', '90-day retention', 'Webhooks (10)', 'Email support', 'WebSocket subscriptions'], cta: 'Start Pro', highlight: true },
  { tier: 'Business', price: '$299', period: '/mo', requests: '500M req/mo', features: ['Unlimited keys', '1-year retention', 'Unlimited webhooks', 'Priority support', 'Custom parsers', 'SLA 99.9%'], cta: 'Start Business', highlight: false },
  { tier: 'Enterprise', price: 'Custom', period: '', requests: 'Unlimited', features: ['Dedicated infra', 'Backfill service', 'Custom SLA', 'Dedicated support', 'On-prem option'], cta: 'Contact Us', highlight: false },
];

const SAMPLE_QUERY = `query RecentTransfers {
  tokenTransfers(
    account: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    first: 5
  ) {
    edges {
      node {
        signature
        blockTime
        amount
        source
        destination
      }
    }
  }
}`;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-violet-400">⬡</span>
            <span className="text-xl font-bold">SolIndexer</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-100 transition-colors">Pricing</a>
            <a href="#" className="hover:text-zinc-100 transition-colors">Docs</a>
            <a href="#" className="hover:text-zinc-100 transition-colors">Status</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Sign In</Link>
            <Link href="/dashboard" className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live on Solana Mainnet
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Index Solana Data{' '}
            <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">in Seconds,</span>{' '}
            Not Days
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Real-time Geyser integration, GraphQL API, and WebSocket subscriptions — zero infrastructure to manage.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-colors">Get Started Free</Link>
            <a href="#" className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-8 py-3 rounded-xl font-semibold text-lg transition-colors">View Docs</a>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="py-10 border-y border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-violet-400">{s.value}</div>
              <div className="text-sm text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Everything you need</h2>
          <p className="text-zinc-400 text-center mb-16">Production-ready Solana data infrastructure</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-zinc-900/60 backdrop-blur border border-zinc-800 p-6 rounded-2xl hover:border-violet-500/30 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-24 px-4 sm:px-6 bg-[#0f0f11]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-4">Query anything, instantly</h2>
            <p className="text-zinc-400 text-lg mb-6">One GraphQL endpoint to query transactions, token transfers, account states, and more. Relay-style pagination, subscriptions, and per-field caching included.</p>
            <ul className="space-y-3 text-zinc-300 text-sm">
              {['Transactions by account or program', 'Token transfer history with amounts', 'Real-time WebSocket subscriptions', 'Account state snapshots at any slot'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-700/50">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-zinc-500 font-mono">GraphQL</span>
            </div>
            <pre className="p-5 text-sm font-mono text-emerald-400 leading-relaxed overflow-auto"><code>{SAMPLE_QUERY}</code></pre>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Start indexing in 5 minutes</h2>
          <p className="text-zinc-400 mb-16">No infrastructure. No devops. Just data.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up with GitHub or Google. No credit card required for the free tier.' },
              { step: '2', title: 'Get API Key', desc: 'Generate an API key from the dashboard. Choose your rate limit and tier.' },
              { step: '3', title: 'Query Data', desc: 'Use our GraphQL explorer or hit the REST endpoints. Start building immediately.' },
            ].map((s) => (
              <div key={s.step}>
                <div className="w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xl font-bold flex items-center justify-center mx-auto mb-4">{s.step}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-zinc-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 bg-[#0f0f11]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-zinc-400 text-center mb-16">Scale as you grow. No hidden fees.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PRICING.map((p) => (
              <div key={p.tier} className={`bg-zinc-900/60 backdrop-blur border rounded-2xl p-6 flex flex-col ${p.highlight ? 'border-violet-500/50 ring-1 ring-violet-500/30' : 'border-zinc-800'}`}>
                {p.highlight && <div className="text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 self-start mb-4">Most Popular</div>}
                <div className="text-zinc-400 text-sm mb-1">{p.tier}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-zinc-500 text-sm mb-1">{p.period}</span>
                </div>
                <div className="text-emerald-400 text-sm font-medium mb-6">{p.requests}</div>
                <ul className="space-y-2 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-sm text-zinc-300 flex items-center gap-2"><span className="text-emerald-400">✓</span> {f}</li>
                  ))}
                </ul>
                <Link href="/dashboard" className={`text-center py-2.5 rounded-xl font-medium text-sm transition-colors ${p.highlight ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to start indexing?</h2>
          <p className="text-zinc-400 mb-8">Join thousands of developers building on Solana with SolIndexer.</p>
          <Link href="/dashboard" className="inline-block bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-colors">Create Free Account</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-violet-400">⬡</span>
            <span className="font-bold">SolIndexer</span>
            <span className="text-zinc-600 text-sm ml-4">© 2025 SolIndexer. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            {['Twitter', 'Discord', 'Docs', 'Privacy', 'Terms'].map((l) => (
              <a key={l} href="#" className="hover:text-zinc-300 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
