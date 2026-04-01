// src/lib/research/disease-mapper.ts
// Maps diseases/conditions to search keywords for auto-tagging studies.
// Used for:
//  1. Auto-tagging studies with disease_tags during/after ingestion
//  2. Enabling disease-based filtering in the Research Chat
//  3. Powering queries like "What does research say about reversing diabetes with nutrition?"

export interface DiseaseMapping {
  tag: string;         // Stored in disease_tags[] column
  label: string;       // Human-readable display name
  category: string;    // Grouping for UI
  searchTerms: string[]; // Keywords to match in title, abstract, MeSH terms
}

export const DISEASE_MAP: DiseaseMapping[] = [
  // ── Cardiovascular ──────────────────────────────────────────────────────────
  {
    tag: 'cardiovascular', label: 'Cardiovascular Disease', category: 'cardiovascular',
    searchTerms: ['cardiovascular disease', 'heart disease', 'coronary artery disease', 'coronary heart disease', 'myocardial infarction', 'heart attack', 'cardiac', 'cardiovascular mortality'],
  },
  {
    tag: 'atherosclerosis', label: 'Atherosclerosis', category: 'cardiovascular',
    searchTerms: ['atherosclerosis', 'arterial plaque', 'atherogenesis', 'atherosclerotic', 'carotid intima-media'],
  },
  {
    tag: 'hypertension', label: 'Hypertension', category: 'cardiovascular',
    searchTerms: ['hypertension', 'high blood pressure', 'blood pressure reduction', 'antihypertensive', 'systolic blood pressure', 'diastolic blood pressure'],
  },
  {
    tag: 'stroke', label: 'Stroke', category: 'cardiovascular',
    searchTerms: ['stroke', 'cerebrovascular', 'ischemic stroke', 'hemorrhagic stroke', 'cerebral infarction'],
  },
  {
    tag: 'heart_failure', label: 'Heart Failure', category: 'cardiovascular',
    searchTerms: ['heart failure', 'congestive heart failure', 'cardiac failure', 'cardiomyopathy'],
  },
  {
    tag: 'arrhythmia', label: 'Arrhythmia / Atrial Fibrillation', category: 'cardiovascular',
    searchTerms: ['arrhythmia', 'atrial fibrillation', 'atrial flutter', 'cardiac rhythm'],
  },

  // ── Metabolic / Endocrine ───────────────────────────────────────────────────
  {
    tag: 'type2_diabetes', label: 'Type 2 Diabetes', category: 'metabolic',
    searchTerms: ['type 2 diabetes', 'diabetes mellitus type 2', 'T2DM', 'insulin resistance', 'hyperglycemia', 'glycemic control', 'diabetic'],
  },
  {
    tag: 'type1_diabetes', label: 'Type 1 Diabetes', category: 'metabolic',
    searchTerms: ['type 1 diabetes', 'diabetes mellitus type 1', 'T1DM', 'juvenile diabetes', 'autoimmune diabetes'],
  },
  {
    tag: 'metabolic_syndrome', label: 'Metabolic Syndrome', category: 'metabolic',
    searchTerms: ['metabolic syndrome', 'syndrome X', 'insulin resistance syndrome'],
  },
  {
    tag: 'obesity', label: 'Obesity', category: 'metabolic',
    searchTerms: ['obesity', 'obese', 'body mass index', 'BMI', 'weight loss', 'weight management', 'adiposity', 'overweight'],
  },
  {
    tag: 'nafld', label: 'Fatty Liver Disease (NAFLD)', category: 'metabolic',
    searchTerms: ['non-alcoholic fatty liver', 'NAFLD', 'NASH', 'hepatic steatosis', 'fatty liver disease'],
  },
  {
    tag: 'thyroid', label: 'Thyroid Disorders', category: 'metabolic',
    searchTerms: ['hypothyroidism', 'hyperthyroidism', 'thyroid disease', 'thyroid dysfunction', 'Hashimoto', 'Graves disease'],
  },

  // ── Cancer ──────────────────────────────────────────────────────────────────
  {
    tag: 'cancer_general', label: 'Cancer (General)', category: 'cancer',
    searchTerms: ['cancer', 'carcinoma', 'neoplasm', 'tumor', 'tumour', 'malignancy', 'oncology', 'cancer risk', 'cancer prevention'],
  },
  {
    tag: 'colorectal_cancer', label: 'Colorectal Cancer', category: 'cancer',
    searchTerms: ['colorectal cancer', 'colon cancer', 'rectal cancer', 'bowel cancer', 'colorectal neoplasm'],
  },
  {
    tag: 'breast_cancer', label: 'Breast Cancer', category: 'cancer',
    searchTerms: ['breast cancer', 'breast neoplasm', 'mammary carcinoma'],
  },
  {
    tag: 'prostate_cancer', label: 'Prostate Cancer', category: 'cancer',
    searchTerms: ['prostate cancer', 'prostatic neoplasm', 'prostate carcinoma'],
  },
  {
    tag: 'lung_cancer', label: 'Lung Cancer', category: 'cancer',
    searchTerms: ['lung cancer', 'lung neoplasm', 'pulmonary carcinoma', 'lung carcinoma'],
  },

  // ── Neurological ────────────────────────────────────────────────────────────
  {
    tag: 'alzheimers', label: "Alzheimer's Disease", category: 'neurological',
    searchTerms: ['Alzheimer', 'Alzheimer disease', 'amyloid beta', 'tau protein', 'cognitive decline', 'dementia'],
  },
  {
    tag: 'parkinsons', label: "Parkinson's Disease", category: 'neurological',
    searchTerms: ['Parkinson', 'Parkinson disease', 'dopaminergic', 'parkinsonian'],
  },
  {
    tag: 'depression', label: 'Depression', category: 'neurological',
    searchTerms: ['depression', 'major depressive disorder', 'depressive symptoms', 'antidepressant'],
  },
  {
    tag: 'anxiety', label: 'Anxiety', category: 'neurological',
    searchTerms: ['anxiety', 'anxiety disorder', 'generalized anxiety', 'anxiolytic'],
  },
  {
    tag: 'cognitive_decline', label: 'Cognitive Decline', category: 'neurological',
    searchTerms: ['cognitive decline', 'cognitive impairment', 'mild cognitive impairment', 'MCI', 'neuroprotection', 'brain aging'],
  },

  // ── Gastrointestinal ────────────────────────────────────────────────────────
  {
    tag: 'ibd', label: 'Inflammatory Bowel Disease', category: 'gastrointestinal',
    searchTerms: ['inflammatory bowel disease', 'IBD', 'Crohn', 'ulcerative colitis'],
  },
  {
    tag: 'ibs', label: 'Irritable Bowel Syndrome', category: 'gastrointestinal',
    searchTerms: ['irritable bowel syndrome', 'IBS', 'functional gastrointestinal'],
  },
  {
    tag: 'gut_microbiome', label: 'Gut Microbiome', category: 'gastrointestinal',
    searchTerms: ['gut microbiome', 'gut microbiota', 'intestinal microbiome', 'microbiome diversity', 'prebiotics', 'probiotics', 'dysbiosis'],
  },

  // ── Musculoskeletal ─────────────────────────────────────────────────────────
  {
    tag: 'osteoporosis', label: 'Osteoporosis', category: 'musculoskeletal',
    searchTerms: ['osteoporosis', 'bone mineral density', 'bone loss', 'osteopenia', 'fracture risk'],
  },
  {
    tag: 'arthritis', label: 'Arthritis', category: 'musculoskeletal',
    searchTerms: ['arthritis', 'rheumatoid arthritis', 'osteoarthritis', 'joint inflammation'],
  },

  // ── Kidney ──────────────────────────────────────────────────────────────────
  {
    tag: 'ckd', label: 'Chronic Kidney Disease', category: 'kidney',
    searchTerms: ['chronic kidney disease', 'CKD', 'renal insufficiency', 'kidney function', 'GFR decline', 'nephropathy'],
  },
  {
    tag: 'kidney_stones', label: 'Kidney Stones', category: 'kidney',
    searchTerms: ['kidney stones', 'nephrolithiasis', 'renal calculi', 'urolithiasis'],
  },

  // ── Respiratory ─────────────────────────────────────────────────────────────
  {
    tag: 'asthma', label: 'Asthma', category: 'respiratory',
    searchTerms: ['asthma', 'bronchial asthma', 'airway inflammation', 'asthmatic'],
  },
  {
    tag: 'copd', label: 'COPD', category: 'respiratory',
    searchTerms: ['chronic obstructive pulmonary', 'COPD', 'emphysema', 'chronic bronchitis'],
  },

  // ── Autoimmune ──────────────────────────────────────────────────────────────
  {
    tag: 'autoimmune', label: 'Autoimmune Diseases', category: 'autoimmune',
    searchTerms: ['autoimmune', 'autoimmunity', 'immune dysregulation', 'lupus', 'multiple sclerosis', 'celiac disease'],
  },

  // ── Longevity / Aging ───────────────────────────────────────────────────────
  {
    tag: 'aging', label: 'Aging & Longevity', category: 'longevity',
    searchTerms: ['aging', 'ageing', 'longevity', 'lifespan', 'healthspan', 'senescence', 'telomere', 'biological age', 'epigenetic clock'],
  },
  {
    tag: 'inflammation', label: 'Chronic Inflammation', category: 'longevity',
    searchTerms: ['chronic inflammation', 'inflammaging', 'systemic inflammation', 'inflammatory markers', 'anti-inflammatory', 'C-reactive protein'],
  },
  {
    tag: 'oxidative_stress', label: 'Oxidative Stress', category: 'longevity',
    searchTerms: ['oxidative stress', 'free radicals', 'antioxidant', 'reactive oxygen species', 'ROS', 'oxidative damage'],
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Detect disease tags from a study's title, abstract, and MeSH terms.
 * Returns an array of matching disease tag strings.
 */
export function detectDiseaseTags(
  title: string,
  abstract: string,
  meshTerms: string[]
): string[] {
  const searchText = [title, abstract, ...meshTerms].join(' ').toLowerCase();
  const tags: string[] = [];

  for (const disease of DISEASE_MAP) {
    for (const term of disease.searchTerms) {
      if (searchText.includes(term.toLowerCase())) {
        tags.push(disease.tag);
        break; // one match per disease is enough
      }
    }
  }

  return tags;
}

/**
 * Get the human-readable label for a disease tag.
 */
export function getDiseaseLabel(tag: string): string | undefined {
  return DISEASE_MAP.find(d => d.tag === tag)?.label;
}

/**
 * Get all unique disease categories for UI grouping.
 */
export function getDiseaseCategories(): string[] {
  return [...new Set(DISEASE_MAP.map(d => d.category))];
}

/**
 * Get all diseases in a specific category.
 */
export function getDiseasesByCategory(category: string): DiseaseMapping[] {
  return DISEASE_MAP.filter(d => d.category === category);
}
