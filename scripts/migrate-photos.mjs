#!/usr/bin/env node

/**
 * Migrate external Unsplash photos to self-hosted Supabase storage.
 *
 * 1. Creates a `website-photos` bucket (if it doesn't exist)
 * 2. Downloads each Unsplash image
 * 3. Compresses with sharp (WebP, 85% quality, max 1600px wide)
 * 4. Uploads to Supabase storage
 * 5. Outputs a mapping of old → new URLs for code replacement
 *
 * Usage: node scripts/migrate-photos.mjs
 * (run from the website/ directory with .env.local loaded)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'website-photos';

// ─── All photos to migrate ─────────────────────────────────────────────────

const PHOTOS = [
  // Homepage
  { key: 'hero',      url: 'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=1600&q=80', maxWidth: 1600 },
  { key: 'dashboard', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80', maxWidth: 1200 },
  { key: 'mission',   url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80', maxWidth: 1200 },
  { key: 'pillar1',   url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',  maxWidth: 800 },
  { key: 'pillar2',   url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',  maxWidth: 800 },
  { key: 'pillar3',   url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',  maxWidth: 800 },
  { key: 'pillar4',   url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',  maxWidth: 800 },
  { key: 'step1',     url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',  maxWidth: 800 },
  { key: 'step2',     url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',  maxWidth: 800 },  // same as pillar4
  { key: 'step3',     url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',  maxWidth: 800 },
  // Auth layout
  { key: 'auth-hero', url: 'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=1600&q=80', maxWidth: 1600 },  // same as hero
  // Shopping list
  { key: 'shopping-hero', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80', maxWidth: 1200 },
  // Daily dozen
  { key: 'daily-dozen-oats', url: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&q=80', maxWidth: 800 },
  // Bioage
  { key: 'bioage-dna', url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&q=80', maxWidth: 1200 },  // same as step1 but larger
  // Science
  { key: 'science-research', url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=2000&q=80', maxWidth: 1600 },
];

// Deduplicate by base Unsplash photo ID to avoid downloading the same image twice
function getPhotoId(url) {
  const match = url.match(/photo-([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

async function run() {
  console.log('🔧 Creating bucket if needed...');

  // Create bucket (ignore error if already exists)
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (bucketErr && !bucketErr.message.includes('already exists')) {
    console.error('Failed to create bucket:', bucketErr.message);
    process.exit(1);
  }
  console.log(`✅ Bucket "${BUCKET}" ready\n`);

  // Track downloaded photo IDs to avoid re-downloading duplicates
  const downloadedPhotos = new Map(); // photoId → { buffer, contentType }
  const urlMapping = {};

  for (const photo of PHOTOS) {
    const photoId = getPhotoId(photo.url);
    // storagePath set below after download

    console.log(`📷 [${photo.key}] Processing...`);

    try {
      // Download (or reuse if already downloaded)
      let imageBuffer;
      if (downloadedPhotos.has(photoId)) {
        console.log(`  ↪ Reusing cached download (same source photo)`);
        imageBuffer = downloadedPhotos.get(photoId);
      } else {
        console.log(`  ⬇ Downloading from Unsplash...`);
        const res = await fetch(photo.url, {
          headers: { 'User-Agent': 'EvidaLife/1.0 (Photo Migration)' },
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        imageBuffer = Buffer.from(await res.arrayBuffer());
        downloadedPhotos.set(photoId, imageBuffer);
        console.log(`  ✅ Downloaded (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
      }

      // Unsplash already serves optimized JPEGs at the requested width via ?w= param
      // So we upload the already-optimized JPEG directly (Next.js Image will serve WebP on-the-fly)
      const ext = 'jpg';
      const storageFinal = `${photo.key}.${ext}`;
      const contentType = 'image/jpeg';

      console.log(`  ⬆ Uploading to ${BUCKET}/${storageFinal} (${(imageBuffer.length / 1024).toFixed(0)} KB)...`);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(storageFinal, imageBuffer, {
          upsert: true,
          contentType,
        });
      if (error) throw new Error(`Upload: ${error.message}`);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      console.log(`  ✅ Uploaded → ${publicUrl}\n`);

      urlMapping[photo.key] = {
        oldUrl: photo.url,
        newUrl: publicUrl,
      };
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}\n`);
      urlMapping[photo.key] = {
        oldUrl: photo.url,
        newUrl: null,
        error: err.message,
      };
    }
  }

  // Write mapping file
  const mappingPath = 'scripts/photo-url-mapping.json';
  writeFileSync(mappingPath, JSON.stringify(urlMapping, null, 2));
  console.log(`\n📝 URL mapping saved to ${mappingPath}`);

  // Summary
  const succeeded = Object.values(urlMapping).filter(v => v.newUrl).length;
  const failed = Object.values(urlMapping).filter(v => !v.newUrl).length;
  console.log(`\n✅ Done: ${succeeded} migrated, ${failed} failed`);

  // Print replacement table
  console.log('\n─── Replacement Table ───');
  for (const [key, { oldUrl, newUrl }] of Object.entries(urlMapping)) {
    if (newUrl) {
      console.log(`${key}: ${newUrl}`);
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
