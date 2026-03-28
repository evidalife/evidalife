-- Biomarker range overrides: per-sex and/or per-age-group reference/optimal ranges
-- Used when a biomarker's age_stratified = true or has_sex_specific_ranges = true

CREATE TABLE biomarker_range_overrides (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  biomarker_id        uuid        NOT NULL REFERENCES biomarkers(id) ON DELETE CASCADE,
  sex                 text        CHECK (sex IN ('M', 'F')),
  age_min             int,
  age_max             int,
  ref_range_low       numeric,
  ref_range_high      numeric,
  optimal_range_low   numeric,
  optimal_range_high  numeric,
  source_note         text,
  sort_order          int         DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(biomarker_id, sex, age_min, age_max)
);

CREATE INDEX idx_biomarker_range_overrides_lookup
  ON biomarker_range_overrides(biomarker_id, sex, age_min, age_max);
