import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SolIndexer — Index Solana Data in Seconds',
  description: 'High-performance Solana indexing platform with GraphQL API, WebSocket subscriptions, and real-time dashboards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
