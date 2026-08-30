# ExactKB + PayPal

Open `index.html` with Live Server.

PayPal subscription:
- Product: ExactKB Pro
- Plan: ExactKB Pro Monthly
- Price: $4.99 USD / month
- PayPal Plan ID is configured in `script.js`

IMPORTANT:
The current browser-only version unlocks Pro locally after PayPal's onApprove callback. Before accepting real customers at scale, add a server/webhook that verifies the subscription status with PayPal and stores each subscriber's entitlement. Do not put a PayPal client secret in frontend files.
