# Webhook Testing Guide

This guide explains how to test Stripe webhooks locally using Stripe CLI.

## Prerequisites

1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Other platforms: https://stripe.com/docs/stripe-cli
   ```

2. **Authenticate**:
   ```bash
   stripe login
   ```

3. **Start the FastAPI server**:
   ```bash
   cd ai-service
   source venv/bin/activate  # or .venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Step 1: Forward Webhooks to Local Server

In a separate terminal, start the webhook listener:

```bash
stripe listen --forward-to http://localhost:8000/v1/webhooks/stripe
```

**IMPORTANT**: Copy the webhook signing secret shown (starts with `whsec_`).
Add it to your `.env.development`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart your FastAPI server to load the new secret.

## Step 2: Test Basic Events

### Sync Payment (Credit Card)
Tests immediate subscription activation:

```bash
stripe trigger checkout.session.completed
```

**Expected outcome**:
- Event received and processed
- User upgraded to "professional" tier immediately
- Status set to "active"

### Subscription Events

```bash
# New subscription
stripe trigger customer.subscription.created

# Subscription update (e.g., plan change)
stripe trigger customer.subscription.updated

# Subscription cancellation
stripe trigger customer.subscription.deleted
```

### Payment Events

```bash
# Successful payment (renewal)
stripe trigger invoice.payment_succeeded

# Failed payment
stripe trigger invoice.payment_failed
```

## Step 3: Test Async Payment Flow

### Async Payment Pending
Simulates ACH/SEPA payment submission (payment hasn't cleared yet):

```bash
stripe trigger checkout.session.completed \
  --override checkout_session:payment_status=unpaid
```

**Expected outcome**:
- Event received and processed
- User stays on "free" tier
- Status set to "pending_payment"
- Subscription ID saved but not activated

### Async Payment Success
Simulates payment clearing 2-7 days later:

```bash
stripe trigger checkout.session.async_payment_succeeded
```

**Expected outcome**:
- Event received and processed
- User upgraded to "professional" tier
- Status changed from "pending_payment" to "active"

### Async Payment Failure
Simulates payment failure (insufficient funds, etc.):

```bash
stripe trigger checkout.session.async_payment_failed
```

**Expected outcome**:
- Event received and processed
- User remains on "free" tier
- Status set to "payment_failed"
- No subscription activated

### Checkout Expiration
Simulates user abandoning checkout:

```bash
stripe trigger checkout.session.expired
```

**Expected outcome**:
- Event logged for analytics
- No database changes (user remains on current tier)

## Step 4: Test Idempotency

### Manual Duplicate Test

1. Capture a webhook payload:
   ```bash
   stripe listen --print-json > webhook_events.log &
   stripe trigger checkout.session.completed
   ```

2. Extract the event from `webhook_events.log`

3. Send the same event twice using the Stripe dashboard:
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Find your local endpoint
   - Click on an event
   - Click "Resend" button

**Expected outcome**:
- First request: Processes normally
- Second request: Returns "Duplicate event - already processed"
- Database has only ONE record for the event_id

### Concurrent Request Test

Use Apache Bench or similar to send the same event simultaneously:

```bash
# This requires setting up proper authentication
# See test_webhooks_concurrent.py for programmatic approach
```

## Step 5: Test Error Conditions

### Missing User ID Metadata

Create a custom test event with missing metadata:

```bash
# Use Stripe dashboard to edit event JSON
# Remove or set metadata.user_id to null
```

**Expected outcome**:
- Event received
- Logged error: "missing user_id metadata"
- Returns success (doesn't retry)

### Invalid Subscription ID

```bash
# Manually trigger with invalid subscription_id
# This tests Stripe API error handling
```

**Expected outcome**:
- Event received
- Stripe API error caught and logged
- Event marked as "failed" in database
- Returns 500 (triggers Stripe retry)

### Stripe API Timeout

Use network throttling or mock to simulate slow Stripe API:

```bash
# This requires mocking - see test_webhooks_timeouts.py
```

**Expected outcome**:
- Timeout after 3 seconds
- Error logged
- Event marked as "failed"
- Returns 500 (triggers Stripe retry)

## Monitoring Webhook Events

### Check Database

```sql
-- View recent webhook events
SELECT
    stripe_event_id,
    event_type,
    status,
    retry_count,
    processed_at,
    error_message
FROM webhook_events
ORDER BY created_at DESC
LIMIT 20;

-- Check for duplicates
SELECT stripe_event_id, COUNT(*)
FROM webhook_events
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;

-- Check failed events
SELECT * FROM webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Check Logs

```bash
# FastAPI logs (in terminal running uvicorn)
# Look for:
# - "Received webhook: <event_type>"
# - "Duplicate event..." (idempotency working)
# - "Sync payment completed..." or "Async payment pending..."
# - Any ERROR messages

# Filter for webhook logs only
tail -f logs/app.log | grep webhook
```

### Stripe Dashboard

Monitor webhook delivery in Stripe dashboard:
https://dashboard.stripe.com/test/webhooks

- Check "Recent deliveries" tab
- Look for 200 responses (success)
- 400 responses indicate signature verification failed
- 500 responses indicate processing errors (will retry)

## Common Issues

### "Missing Stripe-Signature header"
- Ensure you're forwarding from Stripe CLI
- Don't test with curl unless you sign properly

### "Invalid signature"
- Check STRIPE_WEBHOOK_SECRET matches stripe CLI output
- Restart FastAPI after updating .env

### "User not found"
- Ensure test user exists in app_users table
- Metadata.user_id must match a real user_id

### "Stripe API timeout"
- Check internet connection
- Verify Stripe API key is valid
- May indicate network issues

## Automated Test Suite

Run the full test suite:

```bash
cd ai-service
pytest tests/test_webhooks.py -v
```

Run specific test categories:

```bash
# Idempotency tests only
pytest tests/test_webhooks.py -k idempotency -v

# Async payment tests only
pytest tests/test_webhooks.py -k async_payment -v

# Error handling tests
pytest tests/test_webhooks.py -k error -v
```

## Performance Testing

Test webhook response time:

```bash
# Should respond < 200ms (Stripe requires < 5s)
time stripe trigger checkout.session.completed
```

## Next Steps

1. Test in staging environment with real Stripe test mode
2. Monitor webhook delivery rates and latency
3. Set up alerting for failed webhooks
4. Add retry monitoring dashboard
5. Test webhook backlog recovery after downtime
