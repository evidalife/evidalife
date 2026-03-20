-- ============================================================================
-- FK DELETE RULES — Change health data tables to CASCADE
-- See CLAUDE.md for full convention docs.
-- ============================================================================

ALTER TABLE biological_age_results DROP CONSTRAINT IF EXISTS biological_age_results_user_id_fkey;
ALTER TABLE biological_age_results ADD CONSTRAINT biological_age_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE coaching_bookings DROP CONSTRAINT IF EXISTS coaching_bookings_user_id_fkey;
ALTER TABLE coaching_bookings ADD CONSTRAINT coaching_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE dexa_results DROP CONSTRAINT IF EXISTS dexa_results_user_id_fkey;
ALTER TABLE dexa_results ADD CONSTRAINT dexa_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE genetic_results DROP CONSTRAINT IF EXISTS genetic_results_user_id_fkey;
ALTER TABLE genetic_results ADD CONSTRAINT genetic_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE health_engine_scores DROP CONSTRAINT IF EXISTS health_engine_scores_user_id_fkey;
ALTER TABLE health_engine_scores ADD CONSTRAINT health_engine_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE lab_results DROP CONSTRAINT IF EXISTS lab_results_user_id_fkey;
ALTER TABLE lab_results ADD CONSTRAINT lab_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE vitalcheck_results DROP CONSTRAINT IF EXISTS vitalcheck_results_user_id_fkey;
ALTER TABLE vitalcheck_results ADD CONSTRAINT vitalcheck_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE vo2max_results DROP CONSTRAINT IF EXISTS vo2max_results_user_id_fkey;
ALTER TABLE vo2max_results ADD CONSTRAINT vo2max_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
