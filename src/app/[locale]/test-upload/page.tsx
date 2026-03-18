'use client';

import { useRef, useState } from 'react';

export default function TestUploadPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const log = (msg: string) => {
    console.log('[test-upload]', msg);
    setLogs((prev) => [...prev, `${new Date().toISOString().slice(11, 23)}  ${msg}`]);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { log('ERROR: No file selected'); return; }

    setBusy(true);
    setLogs([]);

    // Step 1
    log(`Step 1: File selected — name: "${file.name}", size: ${file.size} bytes, type: "${file.type}"`);

    // Step 2 — FileReader
    log('Step 2: FileReader started (readAsDataURL)');
    let base64: string;
    try {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const parts = result.split(',');
          log(`Step 3: FileReader complete — dataURL prefix: "${parts[0]}", base64 length: ${parts[1]?.length ?? 0}`);
          resolve(parts[1] ?? '');
        };
        reader.onerror = () => {
          log(`Step 3: FileReader ERROR — ${reader.error?.message ?? 'unknown'}`);
          reject(reader.error);
        };
        reader.readAsDataURL(file);
      });
    } catch (e) {
      log(`FATAL: FileReader threw — ${e}`);
      setBusy(false);
      return;
    }

    // Step 4 — build payload
    const payload = { base64, filename: file.name, bucket: 'product-images', contentType: file.type };
    const bodyStr = JSON.stringify(payload);
    log(`Step 4: Sending fetch — body size: ${bodyStr.length} chars, bucket: "${payload.bucket}", contentType: "${payload.contentType}"`);

    // Step 5 — fetch
    let res: Response;
    try {
      res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
    } catch (e) {
      log(`Step 5: fetch() threw (network error) — ${e}`);
      setBusy(false);
      return;
    }
    log(`Step 5: Response received — status: ${res.status} ${res.statusText}`);

    // Step 6 — parse body
    let json: unknown;
    try {
      json = await res.json();
    } catch (e) {
      log(`Step 6: Failed to parse response JSON — ${e}`);
      setBusy(false);
      return;
    }
    log(`Step 6: Response body — ${JSON.stringify(json)}`);

    if (res.ok && (json as { url?: string }).url) {
      log(`SUCCESS: Uploaded URL = ${(json as { url: string }).url}`);
    } else {
      log(`FAILED: ${(json as { error?: string }).error ?? 'no error field in response'}`);
    }

    setBusy(false);
  };

  return (
    <div style={{ fontFamily: 'monospace', maxWidth: 720, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Image Upload Debug</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ flex: 1 }} />
        <button
          onClick={handleUpload}
          disabled={busy}
          style={{
            padding: '8px 20px',
            background: busy ? '#999' : '#0e393d',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <button
          onClick={() => setLogs([])}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      <div
        style={{
          background: '#0d1117',
          color: '#e6edf3',
          borderRadius: 8,
          padding: '16px',
          minHeight: 200,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {logs.length === 0
          ? <span style={{ color: '#666' }}>Select a file and click Upload to begin…</span>
          : logs.map((l, i) => {
              const isError = l.includes('ERROR') || l.includes('FATAL') || l.includes('FAILED');
              const isSuccess = l.includes('SUCCESS');
              return (
                <div key={i} style={{ color: isError ? '#f85149' : isSuccess ? '#3fb950' : '#e6edf3' }}>
                  {l}
                </div>
              );
            })
        }
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
        Server-side logs appear in the terminal where <code>npm run dev</code> is running.
      </p>
    </div>
  );
}
