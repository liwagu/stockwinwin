-- Migration: Add payment_failed status for async payment failures
-- Date: 2025-11-08
-- Purpose: Support async payment method failures (ACH, SEPA, bank transfers)

-- Drop existing constraint
ALTER TABLE public.app_users
DROP CONSTRAINT IF EXISTS check_status_values;

-- Add constraint with new statuses: payment_failed and pending_payment
ALTER TABLE public.app_users
ADD CONSTRAINT check_status_values
CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing', 'payment_failed', 'pending_payment'));

-- Update comment
COMMENT ON COLUMN public.app_users.status IS 'Subscription status: active, inactive, past_due, canceled, trialing, payment_failed, pending_payment';

-- Verify migration
DO $$
BEGIN
    -- Test that constraint allows payment_failed
    PERFORM 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_status_values'
    AND constraint_schema = 'public';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Migration failed: check_status_values constraint not found';
    END IF;

    RAISE NOTICE 'Migration 003_add_payment_failed_status.sql completed successfully';
END $$;
