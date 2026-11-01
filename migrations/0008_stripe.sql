-- Stripe webhooks, next to Polar and Dodo. Each site picks the providers it uses.
-- Stripe sends buyers back to the success URL with ?session_id=cs_..., stored in payments.checkout_id
-- (added for Polar), which links the payment to the visitor like Dodo's ?payment_id= does.
ALTER TABLE sites ADD COLUMN stripe_webhook_secret TEXT;
