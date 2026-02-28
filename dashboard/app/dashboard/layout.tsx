import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/explorer', label: 'Query Explorer', icon: '🔍' },
  { href: '/keys', label: 'API Keys', icon: '🔑' },
  { href: '/webhooks', label: 'Webhooks', icon: '🔔' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Top navbar */}
      <header className="h-14 border-b border-zinc-800 flex items-center px-6 gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <span className="text-xl text-violet-400">⬡</span>
          <span className="font-bold text-sm">SolIndexer</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <a href="#" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Docs</a>
          <a href="#" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Status</a>
          <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-sm text-violet-400 font-bold">
            D
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
