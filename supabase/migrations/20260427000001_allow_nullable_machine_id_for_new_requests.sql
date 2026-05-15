-- Allow lab-test requests for new machines before machine registration.
-- Existing flows still set machine_id for known machines; admin can backfill machine_id after verification.
ALTER TABLE public.oil_maintenance_actions
  ALTER COLUMN machine_id DROP NOT NULL;
