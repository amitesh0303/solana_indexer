'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const SAMPLE_QUERY = `query GetTransactions {
  transactions(
    account: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    first: 5
  ) {
    edges {
      cursor
      node {
        signature
        slot
        blockTime
        success
        fee
        tokenTransfers {
          mint
          amount
          source
          destination
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

const SAMPLE_RESPONSE = {
  data: {
    transactions: {
      edges: [
        {
          cursor: '269847302',
          node: {
            signature: '5KtPn1PgSHi8BjEDu3nxkpnKhDsAT...',
            slot: 269847302,
            blockTime: '2024-11-01T14:22:01Z',
            success: true,
            fee: 5000,
            tokenTransfers: [
              {
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: '1000000',
                source: '9WzDXwBbm...',
                destination: 'HN7cABqLq...',
              },
            ],
          },
        },
      ],
      pageInfo: { hasNextPage: true, endCursor: '269847302' },
    },
  },
};

export default function QueryExplorer() {
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const runQuery = async () => {
    setLoading(true);
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
    setDuration(Date.now() - start);
    setResponse(JSON.stringify(SAMPLE_RESPONSE, null, 2));
    setLoading(false);
  };

  const copyAs = (format: string) => {
    let text = '';
    if (format === 'curl') {
      text = `curl -X POST https://api.solindexer.io/graphql \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '${JSON.stringify({ query })}'`;
    } else if (format === 'js') {
      text = `const res = await fetch('https://api.solindexer.io/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_API_KEY' },
  body: JSON.stringify({ query: \`${query}\` }),
});
const data = await res.json();`;
    } else {
      text = `import requests
res = requests.post(
    'https://api.solindexer.io/graphql',
    headers={'Content-Type': 'application/json', 'x-api-key': 'YOUR_API_KEY'},
    json={'query': """${query}"""}
)
data = res.json()`;
    }
    navigator.clipboard.writeText(text);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-full h-[calc(100vh-56px-48px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Query Explorer</h1>
          <p className="text-zinc-400 text-sm mt-1">Write and test GraphQL queries against the live API</p>
        </div>
        <div className="flex gap-2">
          {['curl', 'js', 'python'].map((f) => (
            <button
              key={f}
              onClick={() => copyAs(f)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied === f ? '✓ Copied' : `Copy as ${f}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Editor pane */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-400 font-mono">Query</span>
            <button
              onClick={runQuery}
              disabled={loading}
              className="text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                '▶ Run Query'
              )}
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language="graphql"
              theme="vs-dark"
              value={query}
              onChange={(v) => setQuery(v ?? '')}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
              }}
            />
          </div>
        </div>

        {/* Response pane */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-400 font-mono">Response</span>
            {duration !== null && (
              <span className="text-xs text-emerald-400 font-mono">{duration}ms</span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {response ? (
              <pre className="p-4 text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {response}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                Run a query to see the response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
