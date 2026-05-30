-- Rollback Migration: Remove payment_failed status
-- Date: 2025-11-08
-- Purpose: Rollback migration 003_add_payment_failed_status.sql

-- Drop existing constraint
ALTER TABLE public.app_users
DROP CONSTRAINT IF EXISTS check_status_values;

-- Restore original constraint without payment_failed
ALTER TABLE public.app_users
ADD CONSTRAINT check_status_values
CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing'));

-- Restore original comment
COMMENT ON COLUMN public.app_users.status IS 'Subscription status: active, inactive, past_due, canceled, trialing';

-- Verify rollback
DO $$
BEGIN
    RAISE NOTICE 'Rollback 003_add_payment_failed_status completed successfully';
END $$;
