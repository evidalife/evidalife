// src/lib/research/biomarker-mapper.ts
// Maps Evida biomarker slugs to PubMed search terms and research keywords.
// Used for:
//  1. Auto-tagging studies with relevant biomarker slugs during ingestion
//  2. Generating personalised research suggestions from flagged biomarkers
//  3. Filtering the study search by biomarker relevance

export interface BiomarkerMapping {
  slug: string;
  label: string;
  he_domain: string;
  searchTerms: string[];      // Used for PubMed searches and keyword matching in abstracts
  researchQuestion: string;   // Used for generating RAG queries from flagged markers
}

export const BIOMARKER_MAP: BiomarkerMapping[] = [
  // ── Heart & Vessels ──────────────────────────────────────────────────────────
  {
    slug: 'ldl_c', label: 'LDL Cholesterol', he_domain: 'heart_vessels',
    searchTerms: ['LDL cholesterol', 'low-density lipoprotein', 'LDL-C', 'atherogenic lipoprotein'],
    researchQuestion: 'What dietary and lifestyle interventions most effectively reduce LDL cholesterol?',
  },
  {
    slug: 'hdl_c', label: 'HDL Cholesterol', he_domain: 'heart_vessels',
    searchTerms: ['HDL cholesterol', 'high-density lipoprotein', 'HDL-C', 'reverse cholesterol transport'],
    researchQuestion: 'What interventions increase HDL cholesterol and improve cardiovascular outcomes?',
  },
  {
    slug: 'triglycerides', label: 'Triglycerides', he_domain: 'heart_vessels',
    searchTerms: ['triglycerides', 'hypertriglyceridemia', 'serum triglycerides', 'plasma triglycerides'],
    researchQuestion: 'What dietary changes and lifestyle factors reduce elevated triglycerides?',
  },
  {
    slug: 'apob', label: 'ApoB', he_domain: 'heart_vessels',
    searchTerms: ['apolipoprotein B', 'ApoB', 'ApoB-100', 'atherogenic particle'],
    researchQuestion: 'How does diet affect ApoB levels and cardiovascular disease risk?',
  },
  {
    slug: 'lpa', label: 'Lp(a)', he_domain: 'heart_vessels',
    searchTerms: ['lipoprotein(a)', 'Lp(a)', 'lipoprotein a cardiovascular'],
    researchQuestion: 'What is the cardiovascular risk of elevated Lp(a) and what interventions help?',
  },
  {
    slug: 'homocysteine', label: 'Homocysteine', he_domain: 'heart_vessels',
    searchTerms: ['homocysteine', 'hyperhomocysteinemia', 'homocysteine cardiovascular', 'B vitamins homocysteine'],
    researchQuestion: 'What reduces elevated homocysteine and what are the cardiovascular implications?',
  },
  {
    slug: 'fibrinogen', label: 'Fibrinogen', he_domain: 'heart_vessels',
    searchTerms: ['fibrinogen', 'plasma fibrinogen', 'fibrinogen cardiovascular risk'],
    researchQuestion: 'What factors influence fibrinogen levels and cardiovascular risk?',
  },

  // ── Metabolism ───────────────────────────────────────────────────────────────
  {
    slug: 'fasting_glucose', label: 'Fasting Glucose', he_domain: 'metabolism',
    searchTerms: ['fasting glucose', 'fasting blood glucose', 'glycemia', 'blood sugar fasting'],
    researchQuestion: 'What dietary and lifestyle interventions most effectively lower fasting glucose?',
  },
  {
    slug: 'hba1c', label: 'HbA1c', he_domain: 'metabolism',
    searchTerms: ['hemoglobin A1c', 'glycated hemoglobin', 'HbA1c', 'glycohemoglobin'],
    researchQuestion: 'What interventions reduce HbA1c and improve long-term glycemic control?',
  },
  {
    slug: 'fasting_insulin', label: 'Fasting Insulin', he_domain: 'metabolism',
    searchTerms: ['fasting insulin', 'insulin resistance', 'hyperinsulinemia', 'insulin sensitivity'],
    researchQuestion: 'What dietary patterns most effectively reduce fasting insulin and insulin resistance?',
  },
  {
    slug: 'homa_ir', label: 'HOMA-IR', he_domain: 'metabolism',
    searchTerms: ['HOMA-IR', 'insulin resistance index', 'homeostatic model assessment', 'insulin sensitivity'],
    researchQuestion: 'Which interventions best improve insulin sensitivity as measured by HOMA-IR?',
  },
  {
    slug: 'uric_acid', label: 'Uric Acid', he_domain: 'metabolism',
    searchTerms: ['uric acid', 'hyperuricemia', 'serum urate', 'gout purine'],
    researchQuestion: 'What dietary changes lower serum uric acid and reduce gout risk?',
  },

  // ── Inflammation ─────────────────────────────────────────────────────────────
  {
    slug: 'crp', label: 'hsCRP', he_domain: 'inflammation',
    searchTerms: ['C-reactive protein', 'CRP', 'high-sensitivity CRP', 'hs-CRP', 'hsCRP inflammation'],
    researchQuestion: 'What dietary interventions most effectively reduce hsCRP and systemic inflammation?',
  },
  {
    slug: 'il6', label: 'IL-6', he_domain: 'inflammation',
    searchTerms: ['interleukin-6', 'IL-6', 'IL6 inflammation', 'cytokine inflammaging'],
    researchQuestion: 'What reduces elevated IL-6 and inflammaging?',
  },
  {
    slug: 'wbc', label: 'WBC Count', he_domain: 'inflammation',
    searchTerms: ['white blood cell count', 'leukocyte count', 'WBC mortality', 'leukocytosis'],
    researchQuestion: 'What does elevated WBC predict and how does lifestyle affect it?',
  },
  {
    slug: 'ferritin', label: 'Ferritin', he_domain: 'inflammation',
    searchTerms: ['ferritin', 'serum ferritin', 'iron stores', 'hyperferritinemia'],
    researchQuestion: 'What is the health significance of elevated or low ferritin?',
  },

  // ── Organ Function ────────────────────────────────────────────────────────────
  {
    slug: 'alt', label: 'ALT', he_domain: 'organ_function',
    searchTerms: ['alanine aminotransferase', 'ALT', 'liver enzyme', 'hepatocellular damage'],
    researchQuestion: 'What dietary and lifestyle changes normalize elevated ALT (liver enzyme)?',
  },
  {
    slug: 'ast', label: 'AST', he_domain: 'organ_function',
    searchTerms: ['aspartate aminotransferase', 'AST', 'liver function', 'De Ritis ratio'],
    researchQuestion: 'What does an elevated AST indicate and how is it addressed?',
  },
  {
    slug: 'ggt', label: 'GGT', he_domain: 'organ_function',
    searchTerms: ['gamma-glutamyltransferase', 'GGT', 'gamma GT', 'liver biomarker mortality'],
    researchQuestion: 'Why is elevated GGT linked to all-cause mortality and what lowers it?',
  },
  {
    slug: 'egfr', label: 'eGFR', he_domain: 'organ_function',
    searchTerms: ['estimated glomerular filtration rate', 'eGFR', 'kidney function', 'CKD-EPI', 'chronic kidney disease'],
    researchQuestion: 'What dietary factors protect kidney function and maintain eGFR?',
  },
  {
    slug: 'tsh', label: 'TSH', he_domain: 'organ_function',
    searchTerms: ['thyroid-stimulating hormone', 'TSH', 'thyroid function', 'hypothyroidism hyperthyroidism'],
    researchQuestion: 'What is the relationship between thyroid function, TSH levels, and longevity?',
  },

  // ── Nutrients ─────────────────────────────────────────────────────────────────
  {
    slug: 'vitamin_d', label: 'Vitamin D', he_domain: 'nutrients',
    searchTerms: ['vitamin D', '25-hydroxyvitamin D', 'cholecalciferol', 'vitamin D deficiency', '25(OH)D'],
    researchQuestion: 'What are the health consequences of vitamin D deficiency and optimal supplementation?',
  },
  {
    slug: 'vitamin_b12', label: 'Vitamin B12', he_domain: 'nutrients',
    searchTerms: ['vitamin B12', 'cobalamin', 'vitamin B12 deficiency', 'cyanocobalamin', 'methylcobalamin'],
    researchQuestion: 'What are the health risks of vitamin B12 deficiency and how is it corrected?',
  },
  {
    slug: 'folate', label: 'Folate', he_domain: 'nutrients',
    searchTerms: ['folate', 'folic acid', 'serum folate', 'folate deficiency', 'methylfolate'],
    researchQuestion: 'How does folate status affect cardiovascular health and DNA synthesis?',
  },
  {
    slug: 'omega_3_index', label: 'Omega-3 Index', he_domain: 'nutrients',
    searchTerms: ['omega-3 fatty acids', 'EPA DHA', 'omega-3 index', 'fish oil cardiovascular', 'eicosapentaenoic acid'],
    researchQuestion: 'What omega-3 intake is optimal for cardiovascular health and mortality reduction?',
  },
  {
    slug: 'magnesium', label: 'Magnesium', he_domain: 'nutrients',
    searchTerms: ['magnesium', 'serum magnesium', 'magnesium deficiency', 'hypomagnesemia'],
    researchQuestion: 'How widespread is magnesium deficiency and what are its health consequences?',
  },
  {
    slug: 'zinc', label: 'Zinc', he_domain: 'nutrients',
    searchTerms: ['zinc', 'serum zinc', 'zinc deficiency', 'zinc immune function'],
    researchQuestion: 'How does zinc deficiency affect immunity, metabolism, and longevity?',
  },
  {
    slug: 'iron', label: 'Serum Iron', he_domain: 'nutrients',
    searchTerms: ['serum iron', 'iron status', 'transferrin saturation', 'iron deficiency', 'iron overload'],
    researchQuestion: 'What are the risks of both iron deficiency and iron excess on health?',
  },

  // ── Hormones ──────────────────────────────────────────────────────────────────
  {
    slug: 'testosterone', label: 'Testosterone', he_domain: 'hormones',
    searchTerms: ['testosterone', 'total testosterone', 'hypogonadism', 'testosterone aging', 'androgen'],
    researchQuestion: 'How does testosterone decline with age and what lifestyle factors maintain optimal levels?',
  },
  {
    slug: 'dhea_s', label: 'DHEA-S', he_domain: 'hormones',
    searchTerms: ['DHEA', 'DHEA-S', 'dehydroepiandrosterone', 'adrenal aging', 'DHEAS longevity'],
    researchQuestion: 'What is the relationship between DHEA-S, aging, and longevity?',
  },
  {
    slug: 'cortisol', label: 'Cortisol', he_domain: 'hormones',
    searchTerms: ['cortisol', 'HPA axis', 'chronic stress cortisol', 'hypercortisolism', 'cortisol aging'],
    researchQuestion: 'How does chronic cortisol elevation affect health and what reduces it?',
  },
  {
    slug: 'igf1', label: 'IGF-1', he_domain: 'hormones',
    searchTerms: ['IGF-1', 'insulin-like growth factor', 'IGF-1 longevity', 'growth hormone aging'],
    researchQuestion: 'What is the optimal IGF-1 level for longevity and how does diet affect it?',
  },

  // ── Body Composition ──────────────────────────────────────────────────────────
  {
    slug: 'bmi', label: 'BMI', he_domain: 'body_composition',
    searchTerms: ['body mass index', 'BMI', 'obesity', 'overweight mortality', 'adiposity'],
    researchQuestion: 'What does BMI predict for health outcomes and what are its limitations?',
  },
  {
    slug: 'body_fat_pct', label: 'Body Fat %', he_domain: 'body_composition',
    searchTerms: ['body fat percentage', 'adiposity', 'body composition', 'visceral fat', 'body fat mortality'],
    researchQuestion: 'How does body fat percentage affect metabolic health and longevity?',
  },
  {
    slug: 'visceral_fat', label: 'Visceral Fat', he_domain: 'body_composition',
    searchTerms: ['visceral fat', 'visceral adiposity', 'abdominal obesity', 'intra-abdominal fat'],
    researchQuestion: 'Why is visceral fat particularly dangerous and what interventions reduce it?',
  },

  // ── Fitness ───────────────────────────────────────────────────────────────────
  {
    slug: 'vo2max', label: 'VO₂max', he_domain: 'fitness',
    searchTerms: ['VO2max', 'cardiorespiratory fitness', 'maximal oxygen uptake', 'aerobic capacity mortality'],
    researchQuestion: 'How does VO2max predict mortality and what training improves it most?',
  },
  {
    slug: 'grip_strength', label: 'Grip Strength', he_domain: 'fitness',
    searchTerms: ['grip strength', 'handgrip strength', 'muscle strength mortality', 'sarcopenia'],
    researchQuestion: 'How does grip strength predict longevity and what training preserves it?',
  },
  {
    slug: 'hrv', label: 'HRV', he_domain: 'fitness',
    searchTerms: ['heart rate variability', 'HRV', 'autonomic nervous system', 'vagal tone'],
    researchQuestion: 'What does HRV indicate about health and what interventions improve it?',
  },

  // ── Epigenetics ───────────────────────────────────────────────────────────────
  {
    slug: 'phenoage', label: 'PhenoAge', he_domain: 'epigenetics',
    searchTerms: ['PhenoAge', 'phenotypic age', 'biological age biomarkers', 'epigenetic aging clock'],
    researchQuestion: 'What interventions most effectively reduce biological age as measured by PhenoAge?',
  },
  {
    slug: 'grimage', label: 'GrimAge', he_domain: 'epigenetics',
    searchTerms: ['GrimAge', 'epigenetic clock', 'DNA methylation aging', 'biological age mortality'],
    researchQuestion: 'What lifestyle factors most influence epigenetic aging clocks like GrimAge?',
  },
  {
    slug: 'dunedinpace', label: 'DunedinPACE', he_domain: 'epigenetics',
    searchTerms: ['DunedinPACE', 'pace of aging', 'aging rate epigenetic', 'longitudinal aging study'],
    researchQuestion: 'What interventions slow the pace of biological aging as measured by DunedinPACE?',
  },
];

// Look up a mapping by slug
export function getMappingBySlug(slug: string): BiomarkerMapping | undefined {
  return BIOMARKER_MAP.find(m => m.slug === slug);
}

// Get all search terms for a slug (for keyword matching in abstracts/titles)
export function getSearchTermsForSlug(slug: string): string[] {
  return getMappingBySlug(slug)?.searchTerms ?? [];
}

// Get the research question for a flagged biomarker (for ResearchChat suggestions)
export function getResearchQuestion(slug: string): string | undefined {
  return getMappingBySlug(slug)?.researchQuestion;
}

// Given an abstract/title, return which biomarker slugs are relevant (keyword matching)
export function detectBiomarkerSlugs(text: string): string[] {
  const lc = text.toLowerCase();
  const matches = new Set<string>();
  for (const mapping of BIOMARKER_MAP) {
    for (const term of mapping.searchTerms) {
      if (lc.includes(term.toLowerCase())) {
        matches.add(mapping.slug);
        break;
      }
    }
  }
  return Array.from(matches);
}

// Get HE domain for a slug
export function getHeDomainForSlug(slug: string): string | undefined {
  return getMappingBySlug(slug)?.he_domain;
}

// Build a biomarker context string from flagged markers (for ResearchChat personalization)
export function buildBiomarkerContext(flaggedMarkers: Array<{
  slug: string;
  name: string;
  value: number;
  unit: string;
  status: string;
}>): string {
  if (flaggedMarkers.length === 0) return '';
  const lines = flaggedMarkers.map(m =>
    `${m.name}: ${m.value} ${m.unit} (${m.status})`
  );
  return `The user has the following out-of-optimal biomarker results:\n${lines.join('\n')}`;
}

// Generate research suggestion chips from flagged biomarkers
export function buildResearchSuggestions(flaggedSlugs: string[]): string[] {
  return flaggedSlugs
    .map(slug => getMappingBySlug(slug)?.researchQuestion)
    .filter((q): q is string => !!q)
    .slice(0, 4); // cap at 4 suggestions
}
