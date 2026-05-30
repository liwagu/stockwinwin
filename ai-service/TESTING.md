# Testing Guide for StockWin API

## Quick Start

### 1. Run Configuration Test

```bash
cd /Users/guliwa/_code/stockwin/ai-service
python3 test_setup.py
```

**Expected:** All tests pass ✅

---

### 2. Start the Server

```bash
cd /Users/guliwa/_code/stockwin/ai-service
uvicorn main:app --reload --port 8000
```

**Expected output:**
```
StockWin Prediction Service - Starting Up
✅ Kronos model loaded: NeoQuasar/Kronos-base
✅ Scheduler started
🚀 StockWin Prediction Service - Ready
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

### 3. Test Public Endpoints (No Auth)

**Health Check:**
```bash
curl http://localhost:8000/v1/health
```

**Get Predictions:**
```bash
curl http://localhost:8000/v1/predictions
```

**Root Info:**
```bash
curl http://localhost:8000/
```

---

### 4. Interactive API Docs

Open in browser:
```
http://localhost:8000/docs
```

Swagger UI with all endpoints and test interface.

---

## Testing Protected Endpoints

Protected endpoints require a JWT token from Supabase authentication.

### Get a Test Token

**Option 1: Via Frontend (Recommended)**
1. Start frontend: `cd trading-ui && npm run dev`
2. Sign in with Google
3. Open browser DevTools → Application → Local Storage
4. Find `supabase.auth.token`
5. Copy the `access_token` value

**Option 2: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/fabmjwnuwibmmpetkydw/auth/users
2. Click on a test user
3. Copy the `access_token` from user details

---

### Test User Endpoints

**Get Current User Profile:**
```bash
export TOKEN="your_jwt_token_here"

curl -X GET http://localhost:8000/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

**Sync User Profile:**
```bash
curl -X POST http://localhost:8000/v1/users/sync \
  -H "Authorization: Bearer $TOKEN"
```

---

### Test Subscription Endpoints

**Create Checkout Session:**
```bash
curl -X POST http://localhost:8000/v1/subscriptions/checkout-session \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "session_id": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "message": "Redirect user to this URL to complete payment"
}
```

**Get Subscription Status:**
```bash
curl -X GET http://localhost:8000/v1/subscriptions/status \
  -H "Authorization: Bearer $TOKEN"
```

**Create Portal Session:**
```bash
curl -X POST http://localhost:8000/v1/subscriptions/portal-session \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing Stripe Webhooks

### Local Testing with Stripe CLI

**1. Install Stripe CLI:**
```bash
brew install stripe/stripe-cli/stripe
```

**2. Login to Stripe:**
```bash
stripe login
```

**3. Forward webhooks to local server:**
```bash
stripe listen --forward-to localhost:8000/v1/webhooks/stripe
```

**Output:**
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**4. Update .env with signing secret:**
```bash
STRIPE_WEBHOOK_SECRET=whsec_...  # Use the secret from stripe listen
```

**5. Trigger test events:**
```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test payment success
stripe trigger invoice.payment_succeeded
```

**6. Check logs:**
Server logs will show webhook processing:
```
INFO: Received webhook: checkout.session.completed
INFO: Checkout completed for user abc-123, subscription sub_xxx
```

---

## End-to-End Test Flow

### Complete Subscription Flow

1. **Sign in via frontend** (Google OAuth)
   - Creates user in `auth.users`
   - Redirects to dashboard

2. **Sync user profile**
   ```bash
   curl -X POST http://localhost:8000/v1/users/sync \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Check initial status (should be free tier)**
   ```bash
   curl -X GET http://localhost:8000/v1/subscriptions/status \
     -H "Authorization: Bearer $TOKEN"
   ```

4. **Create checkout session**
   ```bash
   curl -X POST http://localhost:8000/v1/subscriptions/checkout-session \
     -H "Authorization: Bearer $TOKEN"
   ```

5. **Complete payment** (use Stripe test card)
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

6. **Webhook fires automatically**
   - Updates user to `professional` tier
   - Sets status to `active`

7. **Verify subscription status**
   ```bash
   curl -X GET http://localhost:8000/v1/subscriptions/status \
     -H "Authorization: Bearer $TOKEN"
   ```

   **Expected:**
   ```json
   {
     "tier": "professional",
     "status": "active",
     "has_active_subscription": true
   }
   ```

8. **Test customer portal**
   ```bash
   curl -X POST http://localhost:8000/v1/subscriptions/portal-session \
     -H "Authorization: Bearer $TOKEN"
   ```

---

## Troubleshooting

### "401 Unauthorized"
- Check JWT token is valid and not expired
- Token format: `Bearer <token>` (space after Bearer)
- Get fresh token from frontend or Supabase dashboard

### "No module named 'stripe'"
```bash
python3 -m pip install stripe --user
```

### "Database connection failed"
- Check `SUPABASE_SERVICE_KEY` in `.env`
- Verify Supabase project is not paused
- Run `python3 test_setup.py` to diagnose

### Webhook signature verification fails
- Ensure `STRIPE_WEBHOOK_SECRET` matches current Stripe CLI session
- Get secret from `stripe listen` output
- Update `.env` and restart server

### "Price ID not found"
- Check `STRIPE_PRICE_ID` in `.env`
- Verify price exists in Stripe dashboard
- Price ID format: `price_xxxxxxxxxxxxx`

---

## Database Queries

Check subscription data directly in Supabase:

```sql
-- View all users
SELECT user_id, email, tier, status, created_at
FROM app_users;

-- View active subscriptions
SELECT user_id, email, tier, status, current_period_end
FROM app_users
WHERE status = 'active';

-- View user by email
SELECT * FROM app_users WHERE email = 'user@example.com';
```

---

## Next Steps

Once all tests pass:
1. ✅ Backend API working
2. ⏳ Set up frontend authentication
3. ⏳ Add checkout flow to pricing page
4. ⏳ Create dashboard for subscription management
5. ⏳ Deploy to Railway with production Stripe keys

See `NEXT_STEPS.md` for detailed implementation guide.
