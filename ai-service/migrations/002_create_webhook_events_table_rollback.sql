-- Rollback Migration: Drop webhook_events table
-- Date: 2025-11-08
-- Purpose: Rollback migration 002_create_webhook_events_table.sql

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_update_webhook_events_updated_at ON public.webhook_events;

-- Drop function
DROP FUNCTION IF EXISTS public.update_webhook_events_updated_at();

-- Drop indexes (will be automatically dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS public.idx_webhook_events_type_status;
DROP INDEX IF EXISTS public.idx_webhook_events_created_at;
DROP INDEX IF EXISTS public.idx_webhook_events_stripe_event_id;

-- Drop table
DROP TABLE IF EXISTS public.webhook_events;

-- Verify rollback
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'webhook_events'
    ) THEN
        RAISE EXCEPTION 'Rollback failed: webhook_events table still exists';
    END IF;

    RAISE NOTICE 'Rollback 002_create_webhook_events_table completed successfully';
END $$;
