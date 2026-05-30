-- Rollback Migration: Remove subscription and tier columns from app_users table
-- Date: 2025-11-08
-- Purpose: Rollback to v0.0.1 schema if needed

-- Remove check constraints
ALTER TABLE IF EXISTS public.app_users
DROP CONSTRAINT IF EXISTS check_tier_values;

ALTER TABLE IF EXISTS public.app_users
DROP CONSTRAINT IF EXISTS check_status_values;

-- Remove indexes
DROP INDEX IF EXISTS idx_app_users_stripe_customer_id;
DROP INDEX IF EXISTS idx_app_users_stripe_subscription_id;
DROP INDEX IF EXISTS idx_app_users_tier;
DROP INDEX IF EXISTS idx_app_users_status;

-- Remove columns
ALTER TABLE IF EXISTS public.app_users
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS tier,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS subscription_period_start,
DROP COLUMN IF EXISTS subscription_period_end,
DROP COLUMN IF EXISTS cancel_at_period_end;

-- Verify rollback
DO $$
BEGIN
    -- Check if columns are removed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'app_users'
        AND column_name IN (
            'stripe_customer_id',
            'stripe_subscription_id',
            'tier',
            'status',
            'subscription_period_start',
            'subscription_period_end',
            'cancel_at_period_end'
        )
    ) THEN
        RAISE EXCEPTION 'Rollback failed: Columns still exist';
    END IF;

    RAISE NOTICE 'Rollback 001_add_subscription_columns completed successfully';
END $$;
