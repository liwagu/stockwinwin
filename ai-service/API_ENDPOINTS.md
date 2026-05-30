# StockWin API Endpoints

## Authentication

All endpoints except public routes require JWT authentication via `Authorization: Bearer <token>` header.

**Public Routes** (no auth required):
- `GET /` - Root endpoint
- `GET /v1/health` - Health check
- `GET /v1/predictions` - All predictions
- `GET /v1/predictions/{symbol}` - Single prediction
- `GET /v1/assets` - Supported assets
- `POST /v1/webhooks/stripe` - Stripe webhooks (signature verified)
- `GET /docs` - API documentation

---

## User Management

### GET /v1/users/me

Get current authenticated user's profile and subscription status.

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "tier": "professional",
  "status": "active",
  "stripe_customer_id": "cus_xxx",
  "current_period_end": "2025-11-27T13:00:00Z",
  "cancel_at_period_end": false,
  "created_at": "2025-10-27T13:00:00Z",
  "updated_at": "2025-10-27T13:00:00Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated
- `404` - User profile not found
- `500` - Server error

---

### POST /v1/users/sync

Sync user profile from OAuth to database. Called automatically after sign-in.

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "message": "User profile created successfully",
  "user_id": "uuid",
  "created": true
}
```

---

## Subscription Management

### POST /v1/subscriptions/checkout-session

Create Stripe Checkout session for subscription purchase.

**Professional Plan: $15/month**

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "session_id": "cs_test_xxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxx",
  "message": "Redirect user to this URL to complete payment"
}
```

**Flow:**
1. Frontend calls this endpoint
2. Backend creates Stripe Checkout session
3. Frontend redirects user to `url`
4. User completes payment on Stripe
5. Stripe redirects to success/cancel URL
6. Stripe sends webhook to `/v1/webhooks/stripe`
7. Webhook updates user subscription status

**Status Codes:**
- `200` - Success, redirect to `url`
- `400` - User already has active subscription
- `401` - Not authenticated
- `500` - Stripe API error

---

### POST /v1/subscriptions/portal-session

Create Stripe Customer Portal session for subscription management.

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/p/session/xxx",
  "message": "Redirect user to this URL to manage subscription"
}
```

**Portal Features:**
- Update payment method
- View invoices
- Cancel subscription
- Reactivate canceled subscription
- Update billing information

**Status Codes:**
- `200` - Success, redirect to `url`
- `401` - Not authenticated
- `404` - No subscription found
- `500` - Stripe API error

---

### GET /v1/subscriptions/status

Get current subscription status for authenticated user.

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "tier": "professional",
  "status": "active",
  "current_period_start": "2025-10-27T13:00:00Z",
  "current_period_end": "2025-11-27T13:00:00Z",
  "cancel_at_period_end": false,
  "has_active_subscription": true
}
```

**Subscription Tiers:**
- `free` - Free tier (default)
- `professional` - $15/month subscription

**Subscription Status:**
- `inactive` - No active subscription
- `active` - Subscription active
- `canceled` - Subscription canceled (access until period end)
- `past_due` - Payment failed
- `unpaid` - Payment failed, grace period expired

---

## Webhooks

### POST /v1/webhooks/stripe

Handle Stripe webhook events. **Not called by frontend** - called by Stripe servers.

**Headers:**
```
Stripe-Signature: t=xxx,v1=xxx
```

**Events Handled:**
- `checkout.session.completed` - Payment successful
- `checkout.session.async_payment_succeeded` - Async payment succeeded
- `checkout.session.async_payment_failed` - Async payment failed
- `checkout.session.expired` - Checkout session expired
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

**Response:**
```json
{
  "received": true,
  "event_type": "checkout.session.completed",
  "message": "Event processed successfully"
}
```

**Status Codes:**
- `200` - Event processed
- `400` - Invalid signature
- `500` - Processing error

---

## Testing Endpoints

### Using curl

**Get user profile:**
```bash
curl -X GET http://localhost:8000/v1/users/me \
  -H "Authorization: Bearer <supabase_jwt_token>"
```

**Create checkout session:**
```bash
curl -X POST http://localhost:8000/v1/subscriptions/checkout-session \
  -H "Authorization: Bearer <supabase_jwt_token>"
```

**Get subscription status:**
```bash
curl -X GET http://localhost:8000/v1/subscriptions/status \
  -H "Authorization: Bearer <supabase_jwt_token>"
```

---

## Interactive Documentation

Visit `http://localhost:8000/docs` for interactive Swagger UI documentation where you can test all endpoints.

---

## Configuration

**Price:** $15/month (Professional plan)
- Configured through `STRIPE_PRICE_ID`
- Change the amount by creating a new recurring Stripe Price, then updating `STRIPE_PRICE_ID`
- Promo codes can be applied at checkout (configure in Stripe)

**Success/Cancel URLs:**
- Success: `{FRONTEND_URL}/dashboard?upgraded=success`
- Cancel: `{FRONTEND_URL}/dashboard?upgraded=canceled`

**Customer Portal Return URL:**
- `{FRONTEND_URL}/dashboard`
