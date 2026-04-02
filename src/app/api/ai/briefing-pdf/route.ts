import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getName,
  DOMAIN_ORDER,
  DOMAIN_META,
  type Lang,
  type BriefingSlide,
  type DomainSummaryData,
  type LongevityScoreData,
  type BioAgeScoreData,
  type WelcomeData,
  type ClosingData,
  type MarkerDetail,
} from '@/lib/health-engine-v2-types';

export const maxDuration = 30;

// ── PDF generation via jsPDF (Node.js build) ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { jsPDF } = require('jspdf');

// ── Color palette ───────────────────────────────────────────────────────────
const TEAL = [14, 57, 61] as const;       // #0e393d
const GOLD = [206, 171, 132] as const;    // #ceab84
const GREEN = [12, 156, 108] as const;    // #0C9C6C
const RED = [224, 107, 91] as const;      // #E06B5B
const AMBER = [196, 169, 106] as const;   // #C4A96A
const GREY = [120, 120, 120] as const;

function scoreColorRGB(score: number): readonly [number, number, number] {
  if (score >= 88) return GREEN;
  if (score >= 70) return [91, 163, 122]; // #5ba37a
  if (score >= 50) return AMBER;
  return RED;
}

function statusLabel(score: number): string {
  if (score >= 90) return 'Optimal';
  if (score >= 75) return 'Good';
  if (score >= 55) return 'Borderline';
  return 'At Risk';
}

// ── Translations ────────────────────────────────────────────────────────────
const PDF_T: Record<string, Record<string, string>> = {
  en: {
    title: 'Health Briefing Report',
    subtitle: 'Personal Biomarker Analysis',
    generated: 'Generated',
    patient: 'Patient',
    testDate: 'Test Date',
    markers: 'Markers Analyzed',
    longevityScore: 'Longevity Score',
    prevScore: 'Previous',
    bioAge: 'Biological Age Assessment',
    chronAge: 'Chronological Age',
    phenoAge: 'PhenoAge',
    grimAge: 'GrimAge v2',
    dunedinPace: 'DunedinPACE',
    domainBreakdown: 'Domain Breakdown',
    marker: 'Marker',
    value: 'Value',
    refRange: 'Ref. Range',
    optRange: 'Optimal',
    score: 'Score',
    status: 'Status',
    improvements: 'Key Improvements',
    nextSteps: 'Recommended Next Steps',
    disclaimer: 'This report is for informational purposes only and does not constitute medical advice. Please consult your healthcare provider for clinical decisions.',
    poweredBy: 'Powered by Evida Life Health Engine',
    noData: 'N/A',
    years: 'years',
  },
  de: {
    title: 'Gesundheitsbriefing-Bericht',
    subtitle: 'Persönliche Biomarker-Analyse',
    generated: 'Erstellt',
    patient: 'Patient',
    testDate: 'Testdatum',
    markers: 'Analysierte Marker',
    longevityScore: 'Langlebigkeits-Score',
    prevScore: 'Vorheriger',
    bioAge: 'Biologische Alterseinschätzung',
    chronAge: 'Chronologisches Alter',
    phenoAge: 'PhenoAge',
    grimAge: 'GrimAge v2',
    dunedinPace: 'DunedinPACE',
    domainBreakdown: 'Domänen-Aufschlüsselung',
    marker: 'Marker',
    value: 'Wert',
    refRange: 'Ref.-Bereich',
    optRange: 'Optimal',
    score: 'Score',
    status: 'Status',
    improvements: 'Wichtige Verbesserungen',
    nextSteps: 'Empfohlene nächste Schritte',
    disclaimer: 'Dieser Bericht dient nur zur Information und stellt keine ärztliche Beratung dar. Bitte konsultieren Sie Ihren Arzt für klinische Entscheidungen.',
    poweredBy: 'Powered by Evida Life Health Engine',
    noData: 'k.A.',
    years: 'Jahre',
  },
};

function getT(lang: string) {
  return PDF_T[lang] || PDF_T.en;
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const lang = (body.lang || 'en') as Lang;
  const t = getT(lang);
  const adminDb = createAdminClient();

  // ── Fetch the cached briefing ─────────────────────────────────────────
  const { data: briefingRow } = await adminDb
    .from('ai_briefings')
    .select('slides, created_at')
    .eq('user_id', user.id)
    .eq('lang', lang)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!briefingRow?.slides) {
    return NextResponse.json({ error: 'No briefing found. Generate a briefing first.' }, { status: 404 });
  }

  const slides: BriefingSlide[] = briefingRow.slides;

  // ── Fetch user profile ────────────────────────────────────────────────
  const { data: profile } = await adminDb
    .from('profiles')
    .select('first_name, last_name, date_of_birth')
    .eq('id', user.id)
    .single();

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Patient';

  // ── Extract data from slides ──────────────────────────────────────────
  const welcomeSlide = slides.find(s => s.type === 'welcome');
  const longevitySlide = slides.find(s => s.type === 'longevity_score');
  const bioAgeSlide = slides.find(s => s.type === 'bio_age_score');
  const domainSlides = slides.filter(s => s.type === 'domain_summary');
  const closingSlide = slides.find(s => s.type === 'closing');

  const welcomeData = welcomeSlide?.data as WelcomeData | undefined;
  const longevityData = longevitySlide?.data as LongevityScoreData | undefined;
  const bioAgeData = bioAgeSlide?.data as BioAgeScoreData | undefined;
  const closingData = closingSlide?.data as ClosingData | undefined;

  // ── Generate PDF ──────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  function checkNewPage(needed: number) {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  }

  // ── Page 1: Cover / Summary ───────────────────────────────────────────

  // Header band
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 52, 'F');

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 52, pageWidth, 1.5, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(t.title, margin, 24);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255, 150);
  doc.text(t.subtitle, margin, 33);

  // Date
  doc.setFontSize(9);
  doc.setTextColor(206, 171, 132);
  const dateStr = new Date(briefingRow.created_at).toLocaleDateString(
    lang === 'de' ? 'de-CH' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );
  doc.text(`${t.generated}: ${dateStr}`, margin, 44);

  y = 62;

  // Patient info box
  doc.setFillColor(245, 245, 242);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');

  doc.setTextColor(...TEAL);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(t.patient, margin + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(fullName, margin + 5, y + 13);

  if (welcomeData?.testDate) {
    doc.setFont('helvetica', 'bold');
    doc.text(t.testDate, margin + 70, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(welcomeData.testDate, margin + 70, y + 13);
  }

  if (welcomeData?.markerCount) {
    doc.setFont('helvetica', 'bold');
    doc.text(t.markers, margin + 130, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(String(welcomeData.markerCount), margin + 130, y + 13);
  }

  y += 30;

  // ── Longevity Score ─────────────────────────────────────────────────
  if (longevityData) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEAL);
    doc.text(t.longevityScore, margin, y);
    y += 8;

    // Score display
    const scoreColor = scoreColorRGB(longevityData.score);
    doc.setFillColor(...scoreColor);
    doc.roundedRect(margin, y, 30, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(String(longevityData.score), margin + 15, y + 13, { align: 'center' });

    doc.setTextColor(...TEAL);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`/ 100   ${statusLabel(longevityData.score)}`, margin + 34, y + 12);

    if (longevityData.prevScore != null) {
      const delta = longevityData.score - longevityData.prevScore;
      const arrow = delta > 0 ? '+' : '';
      doc.setTextColor(...GREY);
      doc.setFontSize(9);
      doc.text(`${t.prevScore}: ${longevityData.prevScore}  (${arrow}${delta})`, margin + 80, y + 12);
    }

    y += 26;
  }

  // ── Biological Age ──────────────────────────────────────────────────
  if (bioAgeData) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEAL);
    doc.text(t.bioAge, margin, y);
    y += 8;

    const bioItems: [string, string | null][] = [
      [t.chronAge, `${bioAgeData.chronAge} ${t.years}`],
      [t.phenoAge, bioAgeData.phenoAge != null ? `${bioAgeData.phenoAge.toFixed(1)} ${t.years}` : null],
      [t.grimAge, bioAgeData.grimAge != null ? `${bioAgeData.grimAge.toFixed(1)} ${t.years}` : null],
      [t.dunedinPace, bioAgeData.dunedinPace != null ? `${bioAgeData.dunedinPace.toFixed(3)}` : null],
    ];

    doc.setFontSize(9);
    for (const [label, val] of bioItems) {
      if (!val) continue;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text(label + ':', margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(val, margin + 45, y);
      y += 5;
    }

    y += 6;
  }

  // ── Domain Breakdown ──────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEAL);
  doc.text(t.domainBreakdown, margin, y);
  y += 8;

  for (const slide of domainSlides) {
    const data = slide.data as DomainSummaryData;
    const meta = DOMAIN_META[data.domainKey];
    if (!meta) continue;

    // Check if we need a new page (domain header + at least 2 marker rows)
    checkNewPage(30);

    // Domain header with score
    const domainScoreColor = scoreColorRGB(data.score);
    doc.setFillColor(245, 245, 242);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEAL);
    const domainName = getName(meta.name, lang);
    doc.text(`${meta.icon} ${domainName}`, margin + 3, y + 6.5);

    // Score badge
    doc.setFillColor(...domainScoreColor);
    doc.roundedRect(margin + contentWidth - 22, y + 1.5, 18, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(String(data.score), margin + contentWidth - 13, y + 5.8, { align: 'center' });

    y += 12;

    // Marker table header
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREY);
    const cols = [margin + 2, margin + 62, margin + 92, margin + 122, margin + 148];
    doc.text(t.marker, cols[0], y);
    doc.text(t.value, cols[1], y);
    doc.text(t.refRange, cols[2], y);
    doc.text(t.score, cols[3], y);
    doc.text(t.status, cols[4], y);
    y += 1;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3;

    // Marker rows
    doc.setFontSize(8);
    for (const marker of data.markers) {
      checkNewPage(6);

      const mColor = scoreColorRGB(marker.score);
      const mName = typeof marker.name === 'string' ? marker.name : getName(marker.name as Record<string, string>, lang);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      // Truncate long names
      const displayName = mName.length > 28 ? mName.slice(0, 26) + '…' : mName;
      doc.text(displayName, cols[0], y);

      doc.text(`${marker.value} ${marker.unit}`, cols[1], y);

      // Reference range
      const refStr = formatRange(marker.refLow, marker.refHigh);
      doc.setTextColor(...GREY);
      doc.text(refStr, cols[2], y);

      // Score
      doc.setTextColor(...mColor);
      doc.setFont('helvetica', 'bold');
      doc.text(String(marker.score), cols[3], y);

      // Status
      doc.setTextColor(...mColor);
      doc.setFontSize(7);
      doc.text(statusLabel(marker.score), cols[4], y);
      doc.setFontSize(8);

      y += 5;
    }

    y += 4;
  }

  // ── Closing: Improvements & Next Steps ────────────────────────────────
  if (closingData) {
    checkNewPage(40);

    if (closingData.improvements?.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text(t.improvements, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      for (const item of closingData.improvements) {
        checkNewPage(8);
        const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 5);
        doc.text(lines, margin + 3, y);
        y += lines.length * 4.5;
      }
      y += 4;
    }

    if (closingData.nextSteps?.length > 0) {
      checkNewPage(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text(t.nextSteps, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      for (const item of closingData.nextSteps) {
        checkNewPage(8);
        const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 5);
        doc.text(lines, margin + 3, y);
        y += lines.length * 4.5;
      }
      y += 4;
    }
  }

  // ── Footer / Disclaimer ───────────────────────────────────────────────
  checkNewPage(25);
  y = Math.max(y, pageHeight - 35);

  doc.setDrawColor(...GOLD);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GREY);
  const disclaimerLines = doc.splitTextToSize(t.disclaimer, contentWidth);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 3.5 + 3;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GOLD);
  doc.text(t.poweredBy, margin, y);
  doc.text('evidalife.com', margin + contentWidth, y, { align: 'right' });

  // ── Return PDF ────────────────────────────────────────────────────────
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const fileName = `Health-Report-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatRange(low: number | null, high: number | null): string {
  if (low != null && high != null) return `${low}–${high}`;
  if (low != null) return `>${low}`;
  if (high != null) return `<${high}`;
  return '–';
}
