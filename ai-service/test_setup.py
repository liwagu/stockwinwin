"""
Quick setup test for StockWin backend configuration.
Run this before starting the API server to verify everything is configured.
"""

import sys
import os

# Change to ai-service directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print('='*60)
print('🧪 STOCKWIN CONFIGURATION TEST')
print('='*60)

# Test 1: Config Loading
print('\n[1/5] Testing config module...')
try:
    from config import config
    print('  ✅ Config module imported successfully')
except Exception as e:
    print(f'  ❌ Failed: {e}')
    sys.exit(1)

# Test 2: Supabase Configuration
print('\n[2/5] Checking Supabase configuration...')
print(f'  URL: {config.SUPABASE_URL}')
if config.SUPABASE_SERVICE_KEY:
    key_preview = config.SUPABASE_SERVICE_KEY[:30] + '...' + config.SUPABASE_SERVICE_KEY[-10:]
    print(f'  Service Key: ✓ Present\n    {key_preview}')
else:
    print('  Service Key: ✗ MISSING')
    sys.exit(1)
print(f'  JWT Audience: {config.SUPABASE_JWT_AUD}')

# Test 3: Supabase Connection
print('\n[3/5] Testing Supabase database connection...')
try:
    from supabase import create_client

    client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
    print('  ✅ Supabase client initialized')

    # Try to query app_users table
    response = client.table('app_users').select('user_id').limit(5).execute()
    print(f'  ✅ Database connection working')
    print(f'  📊 app_users table: {len(response.data) if response.data else 0} rows')

except Exception as e:
    print(f'  ❌ Connection failed: {e}')
    print('\n  💡 Troubleshooting:')
    print('     - Check SUPABASE_URL is correct')
    print('     - Check SUPABASE_SERVICE_KEY is valid')
    print('     - Verify Supabase project is not paused')
    sys.exit(1)

# Test 4: Stripe Configuration
print('\n[4/5] Checking Stripe configuration...')
if config.STRIPE_SECRET_KEY:
    key_preview = config.STRIPE_SECRET_KEY[:20] + '...'
    print(f'  Secret Key: ✓ Present\n    {key_preview}')
else:
    print('  Secret Key: ✗ Missing (OK for testing)')

if config.STRIPE_WEBHOOK_SECRET:
    webhook_preview = config.STRIPE_WEBHOOK_SECRET[:15] + '...'
    print(f'  Webhook Secret: ✓ Present\n    {webhook_preview}')
else:
    print('  Webhook Secret: ✗ Missing (OK for testing)')

print(f'  Price ID: {config.STRIPE_PRICE_ID}')
print(f'  Portal Config ID: {config.STRIPE_PORTAL_CONFIGURATION_ID or "<missing>"}')

if config.is_stripe_configured():
    print('  ✅ Stripe fully configured')
else:
    print('  ⚠️  Stripe setup incomplete')
    print('     (Ensure price ID and portal configuration ID are set)')

# Test 5: Other Configuration
print('\n[5/5] Checking other configuration...')
print(f'  Frontend URL: {config.FRONTEND_URL}')
print(f'  Development Mode: {config.is_development()}')
print(f'  Log Level: {config.LOG_LEVEL}')

print('\n' + '='*60)
print('✅ ALL TESTS PASSED!')
print('='*60)

print('\n📋 Configuration Summary:')
print('  ✓ Supabase: Connected to database')
print('  ✓ Database: app_users table accessible')
print(f'  {"✓" if config.is_stripe_configured() else "○"} Stripe: {"Ready" if config.is_stripe_configured() else "Partially configured"}')
print('  ✓ Environment: All required values present')

print('\n🚀 Next Steps:')
if not config.is_stripe_configured():
    print('  1. Set up Stripe products and get price IDs')
    print('  2. Configure the Billing Portal and copy STRIPE_PORTAL_CONFIGURATION_ID into .env')
print('  3. Create API routers (users, subscriptions, webhooks)')
print('  4. Test endpoints with curl or Postman')
print('  5. Set up frontend authentication')

print('\n💡 To create API routers, say: "Create API routers"')
