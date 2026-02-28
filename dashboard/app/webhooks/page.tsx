'use client';

import { useState } from 'react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  event: string;
  filters: Record<string, string>;
  active: boolean;
  deliveredLast24h: number;
  failedLast24h: number;
}

const MOCK_WEBHOOKS: Webhook[] = [
  { id: '1', name: 'New Token Transfers', url: 'https://api.myapp.com/webhooks/transfers', event: 'token_transfer', filters: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, active: true, deliveredLast24h: 1_247, failedLast24h: 3 },
  { id: '2', name: 'Account Activity', url: 'https://api.myapp.com/webhooks/accounts', event: 'account_update', filters: { pubkey: '9WzDXwBbmkg8ZT...' }, active: true, deliveredLast24h: 843, failedLast24h: 0 },
  { id: '3', name: 'Jupiter Swaps', url: 'https://backend.myapp.io/swaps', event: 'swap', filters: {}, active: false, deliveredLast24h: 0, failedLast24h: 0 },
];

const EVENTS = ['token_transfer', 'account_update', 'transaction', 'swap', 'nft_mint', 'nft_transfer'];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);
  const [showCreate, setShowCreate] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', url: '', event: 'token_transfer', secret: '' });

  const toggle = (id: string) => {
    setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, active: !w.active } : w));
  };

  const deleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const testWebhook = async (id: string) => {
    setTestResult((prev) => ({ ...prev, [id]: 'sending...' }));
    await new Promise((r) => setTimeout(r, 800));
    setTestResult((prev) => ({ ...prev, [id]: '✓ 200 OK (134ms)' }));
    setTimeout(() => setTestResult((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
  };

  const createWebhook = () => {
    if (!form.name || !form.url) return;
    const wh: Webhook = {
      id: String(Date.now()),
      ...form,
      filters: {},
      active: true,
      deliveredLast24h: 0,
      failedLast24h: 0,
    };
    setWebhooks((prev) => [wh, ...prev]);
    setForm({ name: '', url: '', event: 'token_transfer', secret: '' });
    setShowCreate(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-zinc-400 text-sm mt-1">Push real-time on-chain events to your backend</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Create Webhook
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Webhook</h2>
            <div className="space-y-4">
              {[
                { label: 'Name', key: 'name', type: 'text', placeholder: 'e.g. My Transfer Hook' },
                { label: 'Endpoint URL', key: 'url', type: 'url', placeholder: 'https://...' },
                { label: 'Secret (optional)', key: 'secret', type: 'text', placeholder: 'HMAC signing secret' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm text-zinc-400 block mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Event Type</label>
                <select
                  value={form.event}
                  onChange={(e) => setForm((prev) => ({ ...prev, event: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                >
                  {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={createWebhook} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks list */}
      <div className="space-y-4">
        {webhooks.map((wh) => (
          <div key={wh.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{wh.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wh.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700/50 text-zinc-500'}`}>
                    {wh.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">{wh.event}</span>
                </div>
                <div className="font-mono text-xs text-zinc-400 truncate max-w-xs">{wh.url}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => testWebhook(wh.id)} className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                  {testResult[wh.id] ?? 'Test'}
                </button>
                <button onClick={() => toggle(wh.id)} className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${wh.active ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}>
                  {wh.active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => deleteWebhook(wh.id)} className="text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors">
                  Delete
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-zinc-500 text-xs">Last 24h delivered</span>
                <div className="text-emerald-400 font-medium">{wh.deliveredLast24h.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-zinc-500 text-xs">Last 24h failed</span>
                <div className={`font-medium ${wh.failedLast24h > 0 ? 'text-red-400' : 'text-zinc-400'}`}>{wh.failedLast24h}</div>
              </div>
              {Object.keys(wh.filters).length > 0 && (
                <div>
                  <span className="text-zinc-500 text-xs">Filters</span>
                  <div className="text-xs font-mono text-zinc-400 mt-0.5">
                    {Object.entries(wh.filters).map(([k, v]) => `${k}=${String(v).slice(0, 12)}...`).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
