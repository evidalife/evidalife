/**
 * Serializes the full briefing slide data into a compact text context
 * for the conversational AI to reason over during Q&A.
 *
 * The output is designed to be token-efficient while giving the model
 * enough detail to answer any question about the user's biomarkers.
 */

import type {
  BriefingSlide,
  WelcomeData,
  LongevityScoreData,
  BioAgeScoreData,
  DomainSummaryData,
  ClosingData,
  MarkerDetail,
} from '@/lib/health-engine-v2-types';

function fmtMarker(m: MarkerDetail): string {
  const parts = [`${m.name}: ${m.value} ${m.unit} (score ${m.score}/100, ${m.status})`];
  if (m.refLow != null || m.refHigh != null) {
    parts.push(`ref ${m.refLow ?? '—'}–${m.refHigh ?? '—'}`);
  }
  if (m.optLow != null || m.optHigh != null) {
    parts.push(`optimal ${m.optLow ?? '—'}–${m.optHigh ?? '—'}`);
  }
  if (m.delta != null) {
    parts.push(`delta ${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)}`);
  }
  if (m.prevValue != null) {
    parts.push(`prev ${m.prevValue} ${m.unit}`);
  }
  return parts.join(' | ');
}

export function buildBriefingContext(
  slides: BriefingSlide[],
  currentSlideIndex: number,
): string {
  const sections: string[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const isCurrent = i === currentSlideIndex;
    const prefix = isCurrent ? '>>> CURRENT SLIDE <<<' : '';
    const d = slide.data;

    switch (d.type) {
      case 'welcome': {
        const w = d as WelcomeData;
        sections.push(
          `[Slide ${i + 1}: Welcome] ${prefix}\n` +
          `User: ${w.firstName}, Test date: ${w.testDate}, ` +
          `${w.markerCount} biomarkers across ${w.reportCount} reports`
        );
        break;
      }

      case 'longevity_score': {
        const ls = d as LongevityScoreData;
        const delta = ls.prevScore != null ? ` (prev ${ls.prevScore}, ${ls.trend})` : '';
        sections.push(
          `[Slide ${i + 1}: Longevity Score] ${prefix}\n` +
          `Score: ${ls.score}/100${delta}\n` +
          `Domains: ${ls.domainCount}\n` +
          (ls.bestDomain ? `Strongest: ${ls.bestDomain.name} (${ls.bestDomain.score})` : '') +
          (ls.worstDomain ? ` | Focus area: ${ls.worstDomain.name} (${ls.worstDomain.score})` : '')
        );
        break;
      }

      case 'bio_age_score': {
        const ba = d as BioAgeScoreData;
        sections.push(
          `[Slide ${i + 1}: Biological Age] ${prefix}\n` +
          `Chronological age: ${ba.chronAge}\n` +
          `Age difference: ${ba.ageDiff > 0 ? '+' : ''}${ba.ageDiff.toFixed(1)} years\n` +
          (ba.phenoAge != null ? `PhenoAge: ${ba.phenoAge.toFixed(1)} yrs` : '') +
          (ba.grimAge != null ? ` | GrimAge: ${ba.grimAge.toFixed(1)} yrs` : '') +
          (ba.dunedinPace != null ? ` | DunedinPACE: ${ba.dunedinPace.toFixed(2)}` : '') +
          `\nEpigenetics domain score: ${ba.bioAgeScore}/100`
        );
        break;
      }

      case 'domain_summary': {
        const ds = d as DomainSummaryData;
        const delta = ds.prevScore != null ? ` (prev ${ds.prevScore}, Δ${ds.score - ds.prevScore > 0 ? '+' : ''}${ds.score - ds.prevScore})` : '';
        const markerLines = ds.markers
          .sort((a, b) => a.score - b.score) // worst first for easy scanning
          .map(m => '  • ' + fmtMarker(m))
          .join('\n');

        sections.push(
          `[Slide ${i + 1}: ${ds.domainName}] ${prefix}\n` +
          `${ds.domainIcon} Score: ${ds.score}/100${delta} | Weight: ${ds.weight}\n` +
          (ds.criticalMarkers.length > 0
            ? `⚠️ Critical (needs attention): ${ds.criticalMarkers.map(m => m.name).join(', ')}\n`
            : '') +
          (ds.exceptionalMarkers.length > 0
            ? `✨ Standout: ${ds.exceptionalMarkers.map(m => `${m.name} (${m.score})`).join(', ')}\n`
            : '') +
          `All markers:\n${markerLines}`
        );
        break;
      }

      case 'closing': {
        const c = d as ClosingData;
        sections.push(
          `[Slide ${i + 1}: Summary] ${prefix}\n` +
          `Overall score: ${c.score}/100\n` +
          `Total: ${c.totalMarkers} markers across ${c.totalDomains} domains\n` +
          (c.improvements.length > 0 ? `Improvements: ${c.improvements.join('; ')}` : '') +
          (c.nextSteps.length > 0 ? `\nNext steps: ${c.nextSteps.join('; ')}` : '')
        );
        break;
      }
    }
  }

  return sections.join('\n\n---\n\n');
}
