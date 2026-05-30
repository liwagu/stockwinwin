-- Migration: Create lead_submissions table
-- Purpose: Persist marketing interest submissions and attribution data.

CREATE TABLE IF NOT EXISTS public.lead_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    source text,
    source_page text,
    selected_symbol text,
    preferred_assets text[] DEFAULT '{}',
    intent text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    referrer text,
    user_agent text,
    consent_marketing boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_email
ON public.lead_submissions(email);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_symbol
ON public.lead_submissions(selected_symbol);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_created_at
ON public.lead_submissions(created_at DESC);

ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend service full access to lead submissions"
ON public.lead_submissions
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.lead_submissions IS 'Marketing lead capture submissions with lightweight attribution data.';
COMMENT ON COLUMN public.lead_submissions.source IS 'Lead source such as landing, market_page, report, dashboard, or poster.';
COMMENT ON COLUMN public.lead_submissions.source_page IS 'Page path or URL where the submission occurred.';
COMMENT ON COLUMN public.lead_submissions.selected_symbol IS 'Primary asset symbol related to the submission.';
