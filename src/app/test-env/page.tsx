'use client';

import { useEffect, useState } from 'react';

export default function TestEnvPage() {
  const [serverData, setServerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Test environment variables (client-side)
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  const streamToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;
  const imagesHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const imagesToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN;

  // Get all env keys
  const allEnvKeys = typeof window !== 'undefined' 
    ? Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'))
    : [];

  // Fetch server-side data
  useEffect(() => {
    fetch('/api/test-env')
      .then(res => res.json())
      .then(data => {
        setServerData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch server data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Environment Variables Test</h1>
      
      {/* Server-Side Results */}
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <h2 className="font-bold mb-2">Server-Side (API Route)</h2>
        {loading ? (
          <div>Loading server data...</div>
        ) : serverData ? (
          <div className="space-y-1 text-sm">
            <div><strong>Account ID:</strong> {serverData.serverSide.accountId}</div>
            <div><strong>Stream Token:</strong> {serverData.serverSide.streamToken}</div>
            <div><strong>Images Hash:</strong> {serverData.serverSide.imagesHash}</div>
            <div><strong>Images Token:</strong> {serverData.serverSide.imagesToken}</div>
            <div className="mt-2">
              <strong>Keys found:</strong> {serverData.allCloudflareKeys.join(', ') || 'None'}
            </div>
          </div>
        ) : (
          <div>Failed to load server data</div>
        )}
      </div>

      {/* Client-Side Results */}
      <div className="p-4 bg-gray-50 rounded border border-gray-200">
        <h2 className="font-bold mb-2">Client-Side (Browser Bundle)</h2>
        <div className="space-y-1 text-sm">
          <div>
            <strong>Account ID:</strong>{' '}
            <span className={accountId ? 'text-green-600' : 'text-red-600'}>
              {accountId ? `✅ SET (${accountId.substring(0, 8)}...)` : '❌ MISSING'}
            </span>
          </div>
          <div>
            <strong>Stream Token:</strong>{' '}
            <span className={streamToken ? 'text-green-600' : 'text-red-600'}>
              {streamToken ? `✅ SET (${streamToken.substring(0, 8)}...)` : '❌ MISSING'}
            </span>
          </div>
          <div>
            <strong>Images Hash:</strong>{' '}
            <span className={imagesHash ? 'text-green-600' : 'text-red-600'}>
              {imagesHash ? `✅ SET (${imagesHash.substring(0, 8)}...)` : '❌ MISSING'}
            </span>
          </div>
          <div>
            <strong>Images Token:</strong>{' '}
            <span className={imagesToken ? 'text-green-600' : 'text-red-600'}>
              {imagesToken ? `✅ SET (${imagesToken.substring(0, 8)}...)` : '❌ MISSING'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <strong>All NEXT_PUBLIC_ keys found in client:</strong>
        <pre className="bg-gray-100 p-2 rounded mt-2 text-xs">
          {allEnvKeys.length > 0 ? allEnvKeys.join('\n') : 'None found'}
        </pre>
      </div>

      <div className="mt-4 p-4 bg-yellow-100 rounded border border-yellow-300">
        <strong>Diagnosis:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>If <strong>Server</strong> shows SET but <strong>Client</strong> shows MISSING: Next.js isn't embedding them in the bundle. Try: <code className="bg-gray-200 px-1 rounded">rm -rf .next && npm run dev</code></li>
          <li>If <strong>both</strong> show MISSING: .env.local file isn't being read. Check file location and format.</li>
          <li>If <strong>both</strong> show SET: Variables are working! ✅</li>
        </ul>
      </div>
    </div>
  );
}

