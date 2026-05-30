#!/bin/bash

# Test Webhooks Locally
# This script helps test webhook functionality without manually setting up stripe listen

set -e

echo "🧪 Webhook Local Testing Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if FastAPI server is running
if ! lsof -ti:8000 > /dev/null 2>&1; then
    echo -e "${RED}❌ FastAPI server is not running on port 8000${NC}"
    echo "Start it with: cd ai-service && uvicorn main:app --reload"
    exit 1
fi

echo -e "${GREEN}✅ FastAPI server is running${NC}"
echo ""

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}❌ Stripe CLI is not installed${NC}"
    echo "Install it with: brew install stripe/stripe-cli/stripe"
    exit 1
fi

echo -e "${GREEN}✅ Stripe CLI is installed${NC}"
echo ""

# Check if logged in to Stripe
if ! stripe config --list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Stripe${NC}"
    echo "Run: stripe login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Stripe${NC}"
echo ""

# Function to test a webhook
test_webhook() {
    local event_type=$1
    local description=$2
    local override=$3

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo "Event type: ${event_type}"

    if [ -n "$override" ]; then
        echo "Override: ${override}"
        stripe trigger $event_type --override "$override"
    else
        stripe trigger $event_type
    fi

    echo ""
    echo -e "${GREEN}✅ Event triggered successfully${NC}"
    echo ""
    sleep 1
}

# Main test menu
echo "Select test scenario:"
echo "1. Sync Payment Flow (Credit Card - immediate activation)"
echo "2. Subscription Lifecycle (created/updated/deleted)"
echo "3. Payment Events (succeeded/failed)"
echo "4. Async Payment Flow (ACH/SEPA - pending then success)"
echo "5. Async Payment Failure"
echo "6. Checkout Expiration"
echo "7. Run All Tests"
echo "8. Start Webhook Listener (for manual testing)"
echo ""
read -p "Enter choice [1-8]: " choice

case $choice in
    1)
        echo ""
        echo "🔵 Testing Sync Payment Flow"
        echo ""
        test_webhook "checkout.session.completed" "Sync payment (immediate activation)" ""
        ;;

    2)
        echo ""
        echo "🔵 Testing Subscription Lifecycle"
        echo ""
        test_webhook "customer.subscription.created" "Subscription created" ""
        test_webhook "customer.subscription.updated" "Subscription updated" ""
        test_webhook "customer.subscription.deleted" "Subscription deleted" ""
        ;;

    3)
        echo ""
        echo "🔵 Testing Payment Events"
        echo ""
        test_webhook "invoice.payment_succeeded" "Payment succeeded (renewal)" ""
        test_webhook "invoice.payment_failed" "Payment failed" ""
        ;;

    4)
        echo ""
        echo "🔵 Testing Async Payment Flow (ACH/SEPA)"
        echo ""
        echo "Step 1: User completes checkout (payment pending)"
        test_webhook "checkout.session.completed" "Async payment pending" "checkout_session:payment_status=unpaid"

        echo "Step 2: Payment clears 2-7 days later"
        test_webhook "checkout.session.async_payment_succeeded" "Async payment succeeded" ""
        ;;

    5)
        echo ""
        echo "🔵 Testing Async Payment Failure"
        echo ""
        test_webhook "checkout.session.async_payment_failed" "Async payment failed" ""
        ;;

    6)
        echo ""
        echo "🔵 Testing Checkout Expiration"
        echo ""
        test_webhook "checkout.session.expired" "Checkout expired (abandoned cart)" ""
        ;;

    7)
        echo ""
        echo "🔵 Running All Tests"
        echo ""
        test_webhook "checkout.session.completed" "1. Sync payment" ""
        test_webhook "customer.subscription.created" "2. Subscription created" ""
        test_webhook "customer.subscription.updated" "3. Subscription updated" ""
        test_webhook "customer.subscription.deleted" "4. Subscription deleted" ""
        test_webhook "invoice.payment_succeeded" "5. Payment succeeded" ""
        test_webhook "invoice.payment_failed" "6. Payment failed" ""
        test_webhook "checkout.session.completed" "7. Async payment pending" "checkout_session:payment_status=unpaid"
        test_webhook "checkout.session.async_payment_succeeded" "8. Async payment succeeded" ""
        test_webhook "checkout.session.async_payment_failed" "9. Async payment failed" ""
        test_webhook "checkout.session.expired" "10. Checkout expired" ""

        echo ""
        echo -e "${GREEN}✅ All tests completed!${NC}"
        echo ""
        echo "Check your FastAPI logs and database for results."
        ;;

    8)
        echo ""
        echo "🎧 Starting Webhook Listener"
        echo ""
        echo -e "${YELLOW}This will forward Stripe events to http://localhost:8000/v1/webhooks/stripe${NC}"
        echo ""
        echo "Copy the webhook signing secret (whsec_...) shown below"
        echo "Add it to ai-service/.env.development as STRIPE_WEBHOOK_SECRET"
        echo "Then restart your FastAPI server"
        echo ""
        echo "Press Ctrl+C to stop listening"
        echo ""
        stripe listen --forward-to http://localhost:8000/v1/webhooks/stripe
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Next Steps:"
echo ""
echo "1. Check FastAPI logs for webhook processing"
echo "2. Query database:"
echo "   SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;"
echo ""
echo "3. Check for errors:"
echo "   SELECT * FROM webhook_events WHERE status = 'failed';"
echo ""
echo "4. View in Stripe Dashboard:"
echo "   https://dashboard.stripe.com/test/webhooks"
echo ""
