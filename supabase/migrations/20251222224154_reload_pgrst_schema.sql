-- Reload PostgREST schema cache so new columns are immediately visible via the REST API
SELECT pg_notify('pgrst', 'reload schema');

-- Sanity check: ensure reservations.metadata exists
-- (This will no-op if run in migration context; kept here as documentation)
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'reservations'
--   AND column_name = 'metadata';
