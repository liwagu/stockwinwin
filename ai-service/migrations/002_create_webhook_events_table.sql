-- Migration: Create webhook_events table for idempotency tracking
-- Date: 2025-11-08
-- Purpose: Prevent duplicate webhook processing from Stripe
-- Reference: Production pattern - track event_id before processing

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id BIGSERIAL PRIMARY KEY,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'processed',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add check constraint for status values
ALTER TABLE public.webhook_events
ADD CONSTRAINT check_webhook_status_values
CHECK (status IN ('processing', 'processed', 'failed'));

-- Create indexes for performance
-- Primary lookup: Check if event_id already processed (fastest path)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id
ON public.webhook_events(stripe_event_id);

-- Cleanup query: Delete events older than 30 days
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
ON public.webhook_events(created_at);

-- Monitoring query: Event type statistics
CREATE INDEX IF NOT EXISTS idx_webhook_events_type_status
ON public.webhook_events(event_type, status, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.webhook_events IS 'Tracks processed Stripe webhook events to prevent duplicate processing';
COMMENT ON COLUMN public.webhook_events.stripe_event_id IS 'Unique Stripe event ID (evt_*)';
COMMENT ON COLUMN public.webhook_events.event_type IS 'Stripe event type (e.g., checkout.session.completed)';
COMMENT ON COLUMN public.webhook_events.processed_at IS 'When event processing started';
COMMENT ON COLUMN public.webhook_events.status IS 'Processing status: processing, processed, failed';
COMMENT ON COLUMN public.webhook_events.retry_count IS 'Number of times Stripe retried this event';
COMMENT ON COLUMN public.webhook_events.error_message IS 'Error details if status=failed';
COMMENT ON COLUMN public.webhook_events.created_at IS 'When record was created';
COMMENT ON COLUMN public.webhook_events.updated_at IS 'When record was last updated';

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_events_updated_at
BEFORE UPDATE ON public.webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.update_webhook_events_updated_at();

-- Verify migration
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'webhook_events'
    ) THEN
        RAISE EXCEPTION 'Migration failed: webhook_events table not created';
    END IF;

    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'webhook_events'
        AND column_name IN (
            'stripe_event_id',
            'event_type',
            'status',
            'processed_at',
            'created_at'
        )
    ) THEN
        RAISE EXCEPTION 'Migration failed: Required columns not created';
    END IF;

    RAISE NOTICE 'Migration 002_create_webhook_events_table.sql completed successfully';
END $$;
