-- Rollback Migration: Drop lead_submissions table

DROP POLICY IF EXISTS "Backend service full access to lead submissions" ON public.lead_submissions;
DROP TABLE IF EXISTS public.lead_submissions;
