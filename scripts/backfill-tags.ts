#!/usr/bin/env npx tsx
// scripts/backfill-tags.ts
// Backfill disease_tags, biomarker_slugs, and quality_tier for studies
// that were ingested before these fields were added to the pipeline.
//
// Usage:
//   npx tsx scripts/backfill-tags.ts
//   npx tsx scripts/backfill-tags.ts --dry-run

import { readFileSync } from 'fs';
import { resolve } from 'path';
try {
  const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch { /* rely on env vars already set */ }

import { detectDiseaseTags } from '../src/lib/research/disease-mapper';
import { detectBiomarkerSlugs } from '../src/lib/research/biomarker-mapper';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN = process.argv.includes('--dry-run');

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

function deriveQualityTier(source: string, meshTerms: string[]): number {
  if (source.startsWith('greger')) return 1;
  const joined = meshTerms.join(' ').toLowerCase();
  if (joined.includes('systematic review') || joined.includes('meta-analysis')) return 2;
  if (joined.includes('randomized controlled trial') || joined.includes('rct')) return 3;
  if (joined.includes('prospective') || joined.includes('cohort study') || joined.includes('longitudinal')) return 4;
  return 5;
}

interface StudyRow {
  id: string;
  pmid: string;
  title: string;
  abstract: string;
  mesh_terms: string[];
  source: string;
  disease_tags: string[] | null;
  biomarker_slugs: string[] | null;
  quality_tier: number | null;
}

async function fetchStudiesBatch(offset: number, limit: number): Promise<StudyRow[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/studies?select=id,pmid,title,abstract,mesh_terms,source,disease_tags,biomarker_slugs,quality_tier&order=id&offset=${offset}&limit=${limit}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateStudy(
  id: string,
  updates: { disease_tags: string[]; biomarker_slugs: string[]; quality_tier: number }
): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/studies?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Update failed for ${id}: ${res.status}`);
}

async function main() {
  console.log(`\n🏷️  Backfill Tags Script${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log('='.repeat(50));

  let offset = 0;
  const batchSize = 200;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const studies = await fetchStudiesBatch(offset, batchSize);
    if (studies.length === 0) break;

    console.log(`\nBatch at offset ${offset}: ${studies.length} studies`);

    for (const study of studies) {
      const searchText = [study.title, study.abstract, ...(study.mesh_terms ?? [])].join(' ');

      const newDiseaseTags = detectDiseaseTags(study.title, study.abstract, study.mesh_terms ?? []);
      const newBiomarkerSlugs = detectBiomarkerSlugs(searchText);
      const newQualityTier = deriveQualityTier(study.source, study.mesh_terms ?? []);

      // Check if update is needed
      const existingDT = study.disease_tags ?? [];
      const existingBS = study.biomarker_slugs ?? [];
      const existingQT = study.quality_tier;

      const dtChanged = JSON.stringify(existingDT.sort()) !== JSON.stringify(newDiseaseTags.sort());
      const bsChanged = JSON.stringify(existingBS.sort()) !== JSON.stringify(newBiomarkerSlugs.sort());
      const qtChanged = existingQT !== newQualityTier;

      if (!dtChanged && !bsChanged && !qtChanged) {
        totalSkipped++;
        totalProcessed++;
        continue;
      }

      if (!DRY_RUN) {
        await updateStudy(study.id, {
          disease_tags: newDiseaseTags,
          biomarker_slugs: newBiomarkerSlugs,
          quality_tier: newQualityTier,
        });
      }

      totalUpdated++;
      totalProcessed++;

      if (totalUpdated <= 5 || totalUpdated % 100 === 0) {
        console.log(
          `  ${DRY_RUN ? '[DRY]' : '✓'} ${study.pmid}: ` +
          `diseases=[${newDiseaseTags.join(',')}] ` +
          `biomarkers=[${newBiomarkerSlugs.slice(0, 3).join(',')}${newBiomarkerSlugs.length > 3 ? '...' : ''}] ` +
          `tier=${newQualityTier}`
        );
      }
    }

    offset += batchSize;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Updated: ${totalUpdated}`);
  console.log(`Skipped (already correct): ${totalSkipped}`);
  console.log(`Done!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
