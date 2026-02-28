'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const USAGE_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `Nov ${i + 1}`,
  requests: Math.floor(10_000 + Math.random() * 40_000),
  errors: Math.floor(Math.random() * 500),
}));

const RECENT_REQUESTS = [
  { time: '14:22:01', endpoint: 'POST /graphql', status: 200, latency: '12ms' },
  { time: '14:21:58', endpoint: 'GET /v1/transactions/:sig', status: 200, latency: '8ms' },
  { time: '14:21:55', endpoint: 'GET /v1/tokens/:mint/transfers', status: 200, latency: '23ms' },
  { time: '14:21:50', endpoint: 'POST /graphql', status: 429, latency: '2ms' },
  { time: '14:21:47', endpoint: 'GET /v1/accounts/:pubkey', status: 200, latency: '11ms' },
  { time: '14:21:44', endpoint: 'POST /graphql', status: 200, latency: '18ms' },
  { time: '14:21:40', endpoint: 'GET /v1/transactions', status: 401, latency: '1ms' },
];

const QUICK_STATS = [
  { label: 'Requests This Month', value: '1,247,832', change: '+12.4%', up: true },
  { label: 'Uptime (30d)', value: '99.98%', change: '0.00%', up: true },
  { label: 'Error Rate', value: '0.12%', change: '-0.04%', up: false },
  { label: 'Avg Latency', value: '14ms', change: '-2ms', up: false },
];

const statusColor = (status: number) => {
  if (status < 300) return 'text-emerald-400';
  if (status < 400) return 'text-yellow-400';
  return 'text-red-400';
};

export default function DashboardOverview() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-zinc-400 text-sm mt-1">Your API usage for the last 30 days</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {QUICK_STATS.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-zinc-400 text-sm mb-2">{s.label}</div>
            <div className="text-2xl font-bold mb-1">{s.value}</div>
            <div className={`text-sm ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.change} vs last month</div>
          </div>
        ))}
      </div>

      {/* Usage chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="font-semibold mb-4">API Requests (last 30 days)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={USAGE_DATA}>
            <defs>
              <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Area type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2} fill="url(#reqGrad)" name="Requests" />
            <Area type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={1.5} fill="url(#errGrad)" name="Errors" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent requests */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="font-semibold mb-4">Recent Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left pb-3 font-medium">Time</th>
                <th className="text-left pb-3 font-medium">Endpoint</th>
                <th className="text-left pb-3 font-medium">Status</th>
                <th className="text-left pb-3 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_REQUESTS.map((r, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 text-zinc-400 font-mono text-xs">{r.time}</td>
                  <td className="py-3 font-mono text-xs text-zinc-300">{r.endpoint}</td>
                  <td className={`py-3 font-mono text-xs font-medium ${statusColor(r.status)}`}>{r.status}</td>
                  <td className="py-3 text-zinc-400 text-xs">{r.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
