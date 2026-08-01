-- kv_store: generic per-user key/value store, mirrors the app's existing
-- storeGet(key)/storeSet(key, value) calls (profile, goals, foodlogs, etc.)
create table if not exists kv_store (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table kv_store enable row level security;

create policy "Users can read own kv rows"
  on kv_store for select
  using (auth.uid() = user_id);

create policy "Users can insert own kv rows"
  on kv_store for insert
  with check (auth.uid() = user_id);

create policy "Users can update own kv rows"
  on kv_store for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own kv rows"
  on kv_store for delete
  using (auth.uid() = user_id);


-- subscriptions: write-protected. Users can only read their own row;
-- only the Paystack webhook / checkout functions (using the service_role key,
-- which bypasses RLS) are allowed to write to it. This is what makes the paywall real.
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive', -- 'inactive' | 'active' | 'cancelled' | 'past_due'
  plan text,                                -- 'monthly' | 'annual'
  current_period_end timestamptz,
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "Users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- deliberately no insert/update/delete policy for regular users


-- terms_acceptance: append-only audit trail of who accepted which version, when
create table if not exists terms_acceptance (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now()
);

alter table terms_acceptance enable row level security;

create policy "Users can read own terms acceptance"
  on terms_acceptance for select
  using (auth.uid() = user_id);

create policy "Users can insert own terms acceptance"
  on terms_acceptance for insert
  with check (auth.uid() = user_id);
