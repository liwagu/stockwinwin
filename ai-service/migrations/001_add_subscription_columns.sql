-- Migration: Add subscription and tier columns to app_users table
-- Date: 2025-11-08
-- Purpose: Support Stripe subscription system and user tier management

-- Add subscription-related columns to app_users table
ALTER TABLE IF EXISTS public.app_users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' NOT NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_users_stripe_customer_id ON public.app_users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_app_users_stripe_subscription_id ON public.app_users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_app_users_tier ON public.app_users(tier);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON public.app_users(status);

-- Add check constraint for tier values
ALTER TABLE public.app_users
DROP CONSTRAINT IF EXISTS check_tier_values;

ALTER TABLE public.app_users
ADD CONSTRAINT check_tier_values CHECK (tier IN ('free', 'professional'));

-- Add check constraint for status values
ALTER TABLE public.app_users
DROP CONSTRAINT IF EXISTS check_status_values;

ALTER TABLE public.app_users
ADD CONSTRAINT check_status_values CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing'));

-- Add comment to table
COMMENT ON COLUMN public.app_users.stripe_customer_id IS 'Stripe customer ID (cus_*)';
COMMENT ON COLUMN public.app_users.stripe_subscription_id IS 'Stripe subscription ID (sub_*)';
COMMENT ON COLUMN public.app_users.tier IS 'User subscription tier: free or professional';
COMMENT ON COLUMN public.app_users.status IS 'Subscription status: active, inactive, past_due, canceled, trialing';
COMMENT ON COLUMN public.app_users.subscription_period_start IS 'Current billing period start timestamp';
COMMENT ON COLUMN public.app_users.subscription_period_end IS 'Current billing period end timestamp';
COMMENT ON COLUMN public.app_users.cancel_at_period_end IS 'Whether subscription will cancel at period end';

-- Verify migration
DO $$
BEGIN
    -- Check if all columns exist
    IF NOT EXISTS (
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
        RAISE EXCEPTION 'Migration failed: Required columns not created';
    END IF;

    RAISE NOTICE 'Migration 001_add_subscription_columns.sql completed successfully';
END $$;
