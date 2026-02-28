'use client';

import { useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
  rateLimit: number;
  tier: string;
  used: number;
  quota: number;
  revoked: boolean;
}

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production', prefix: 'si_prod_K9xm', created: '2024-09-15', lastUsed: '2 minutes ago', rateLimit: 1000, tier: 'Pro', used: 847_234, quota: 1_000_000, revoked: false },
  { id: '2', name: 'Staging', prefix: 'si_test_P3nw', created: '2024-10-01', lastUsed: '1 hour ago', rateLimit: 100, tier: 'Free', used: 12_450, quota: 1_000_000, revoked: false },
  { id: '3', name: 'Analytics Bot', prefix: 'si_prod_L7qr', created: '2024-11-10', lastUsed: '5 days ago', rateLimit: 500, tier: 'Pro', used: 23_000, quota: 1_000_000, revoked: true },
];

const TIER_COLORS: Record<string, string> = {
  Free: 'bg-zinc-700/50 text-zinc-300',
  Pro: 'bg-violet-500/20 text-violet-300',
  Business: 'bg-emerald-500/20 text-emerald-300',
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState('Free');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyKey = (id: string, prefix: string) => {
    navigator.clipboard.writeText(`${prefix}••••••••••••••••`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revokeKey = (id: string) => {
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revoked: true } : k));
  };

  const createKey = () => {
    if (!newName.trim()) return;
    const key: ApiKey = {
      id: String(Date.now()),
      name: newName,
      prefix: `si_${newTier === 'Free' ? 'test' : 'prod'}_${Math.random().toString(36).slice(2, 6)}`,
      created: new Date().toISOString().slice(0, 10),
      lastUsed: 'Never',
      rateLimit: newTier === 'Free' ? 100 : 1000,
      tier: newTier,
      used: 0,
      quota: 1_000_000,
      revoked: false,
    };
    setKeys((prev) => [key, ...prev]);
    setNewName('');
    setShowCreate(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your API keys and monitor usage</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Create New Key
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Key Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production Backend"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                >
                  {['Free', 'Pro', 'Business'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={createKey} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">Create Key</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="space-y-4">
        {keys.map((key) => (
          <div
            key={key.id}
            className={`bg-zinc-900 border rounded-xl p-5 ${key.revoked ? 'border-zinc-800 opacity-50' : 'border-zinc-800'}`}
          >
            <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{key.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[key.tier] ?? 'bg-zinc-700/50 text-zinc-300'}`}>{key.tier}</span>
                  {key.revoked && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Revoked</span>}
                </div>
                <div className="font-mono text-sm text-zinc-400">{key.prefix}••••••••••••••••</div>
              </div>
              <div className="flex gap-2">
                {!key.revoked && (
                  <>
                    <button onClick={() => copyKey(key.id, key.prefix)} className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                      {copiedId === key.id ? '✓ Copied' : 'Copy'}
                    </button>
                    <button onClick={() => revokeKey(key.id)} className="text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors">
                      Revoke
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
              {[
                ['Created', key.created],
                ['Last Used', key.lastUsed],
                ['Rate Limit', `${key.rateLimit} req/min`],
                ['Requests', key.used.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-zinc-500 text-xs mb-0.5">{label}</div>
                  <div className="text-zinc-300">{value}</div>
                </div>
              ))}
            </div>

            {/* Usage bar */}
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Monthly usage</span>
                <span>{((key.used / key.quota) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${Math.min((key.used / key.quota) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                {key.used.toLocaleString()} / {key.quota.toLocaleString()} requests
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
