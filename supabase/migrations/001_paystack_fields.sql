-- Swaps the leftover PayFast column for Paystack's equivalents.
alter table subscriptions drop column if exists payfast_token;
alter table subscriptions add column if not exists paystack_customer_code text;
alter table subscriptions add column if not exists paystack_subscription_code text;
alter table subscriptions add column if not exists paystack_email_token text;
